import { randomBytes, randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { BoundedAiRuntime } from "../ai-runtime/application/bounded-ai-runtime.js";
import { MonotonicRuntimeClock } from "../ai-runtime/infrastructure/monotonic-runtime-clock.js";
import type { GenerationTransport } from "../ai-runtime/ports/generation-transport.js";
import { ApplicationConversationOperations } from "../ai-conversation/application/application-conversation-operations.js";
import { AsyncConversationOperationExecutor } from "../ai-conversation/application/async-conversation-operation-executor.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../ai-conversation/application/async-conversation-generation-transport.js";
import { FirebaseAdminConversationOperationAuthority } from "../ai-conversation/infrastructure/firebase-admin-conversation-operation-authority.js";
import { FirebaseAdminAsyncConversationAuthority } from "../ai-conversation/infrastructure/firebase-admin-async-conversation-authority.js";
import { FirebaseAdminRealContextReader, type SourceBoundNotePrerequisites } from "../ai-conversation/infrastructure/firebase-admin-real-context-reader.js";
import { AsyncFirestoreConversationStore } from "../ai-conversation/infrastructure/async-firestore-conversation-store.js";
import { TrackedAsyncConversationStore } from "../ai-conversation/infrastructure/tracked-async-conversation-store.js";
import { trackConversationFirestore } from "../ai-conversation/infrastructure/tracked-conversation-firestore.js";
import { ConversationIoTracker, ConversationIoQuiescence } from "../ai-conversation/infrastructure/conversation-io-coordinator.js";
import { FirestoreConversationStore } from "../ai-conversation/infrastructure/firestore-conversation-store.js";
import { FirestoreConversationOperationReaders } from "../ai-conversation/infrastructure/firestore-conversation-operation-readers.js";
import { FirestoreConversationCleanup } from "../ai-conversation/infrastructure/firestore-conversation-cleanup.js";
import { FirestoreConversationMaintenance } from "../ai-conversation/infrastructure/firestore-conversation-maintenance.js";
import { retirePreviousConversationEpoch } from "../ai-conversation/infrastructure/firestore-conversation-restart.js";
import { requireIsolatedContextFirestore } from "../ai-conversation/infrastructure/isolated-context-firestore.js";
import { FirebaseAdminFirestoreGateway } from "../shared/infrastructure/firebase/firestore-gateway.js";
import { requireControlledEmulatorEnvironment } from "../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { ConversationInput, ConversationGates } from "../ai-conversation/ports/conversation-lifecycle.js";
import type { ConversationOperations } from "../ai-conversation/ports/conversation-operations.js";
import type { MaintenanceResult } from "../ai-conversation/ports/conversation-maintenance.js";
import { startConversationMaintenance, type MaintenanceSchedule } from "./conversation-maintenance-runner.js";

/** Explicit isolated composition; ordinary buildApp/main never invokes it.
 * Caller validates and owns the actual Emulator Firestore instance. No fake
 * model, policy, Note prerequisite or identity is supplied as a default. */
export async function createIsolatedConversationComposition(options: {
  readonly firestore: Firestore;
  readonly environment: Readonly<Record<string,string|undefined>>;
  readonly transport: GenerationTransport<ConversationInput>;
  readonly gates: ConversationGates;
  readonly notePrerequisites?: SourceBoundNotePrerequisites;
  readonly report: (phase: "expiry" | "source", result: MaintenanceResult) => void;
  readonly reportRetirement: (confirmed: boolean) => void;
  readonly schedule?: MaintenanceSchedule;
  /** Trusted host clock/test seam only; never taken from a request or DTO. */
  readonly utcMilliseconds?: () => number;
}) {
  requireControlledEmulatorEnvironment(options.environment);
  requireIsolatedContextFirestore(options.firestore,options.environment);
  if (options.notePrerequisites && options.notePrerequisites.firestore !== options.firestore) throw new Error("Mismatched Note authority");
  const clock = new MonotonicRuntimeClock(), io = new ConversationIoTracker(), utcMilliseconds=options.utcMilliseconds??Date.now;
  const gateway = new FirebaseAdminFirestoreGateway(options.firestore);
  const notePrerequisites = options.notePrerequisites ? { ...options.notePrerequisites, gateway } : undefined;
  const store = new FirestoreConversationStore(gateway,options.environment,utcMilliseconds,notePrerequisites);
  const start = await store.startEpoch(randomUUID());
  if (start.kind !== "confirmed") throw new Error("Isolated runtime epoch unavailable");
  const epoch = start.value;
  const restart = await retirePreviousConversationEpoch(gateway,store,epoch,options.environment);
  if (!restart.complete) throw new Error("Previous runtime controls unresolved");
  const runtime = new BoundedAiRuntime(clock,new AuthorizedAsyncConversationGenerationTransport(options.transport));
  let consumer!: ApplicationConversationOperations;
  const quiescence = new ConversationIoQuiescence({ acquireTargetLease: (...args) => consumer.acquireTargetLease(...args) },io);
  const cleanup = new FirestoreConversationCleanup(gateway,options.environment,quiescence,utcMilliseconds);
  const readers = new FirestoreConversationOperationReaders(store,cleanup,epoch);
  consumer = new ApplicationConversationOperations(
    new FirebaseAdminConversationOperationAuthority(options.firestore,options.environment,()=>clock.now()),
    {uuid:randomUUID,operationKey:()=>randomBytes(32).toString("base64url")},
    {now:()=>clock.now(),at:(at,wake)=>clock.at(at,wake),utcMilliseconds},
    {create:(input,delivery)=>new AsyncConversationOperationExecutor({runtime,gates:options.gates,
      clock:{monotonicNow:()=>clock.now(),utcNow:()=>{const ms=utcMilliseconds(),seconds=Math.floor(ms/1000);return {seconds,nanoseconds:(ms-seconds*1000)*1000000};}},
      ports:original=>{
        const db=trackConversationFirestore(options.firestore,io,input.identity.ownerId,input.operation.conversationId,input.operation.operationId);
        const authority=new FirebaseAdminAsyncConversationAuthority(db,original,options.environment);
        const reads=new FirebaseAdminRealContextReader(db,{controlledEnvironment:options.environment,
          originalAuthority:{verify:original.verifyRead},monotonicNow:()=>clock.now(),
          ...(options.notePrerequisites ? {notePrerequisites:{...options.notePrerequisites,firestore:db}} : {})});
        const bridge=new TrackedAsyncConversationStore(new AsyncFirestoreConversationStore(store,epoch,authority),io,store,epoch,options.reportRetirement);
        return {authority,reads,store:bridge,acknowledgedPair:bridge};
      }}).create(input,delivery)},readers);
  const maintenance=new FirestoreConversationMaintenance(gateway,options.environment,cleanup,quiescence,utcMilliseconds,notePrerequisites);
  // Construct consumer BEFORE startup sweeps, expose operations only AFTER them.
  const runner=startConversationMaintenance(maintenance,epoch,options.report,options.schedule);
  await runner.settled();
  let accepting=true;
  const refused=()=>Promise.resolve({kind:"failure" as const,code:"AI_UNAVAILABLE" as const});
  const operations:ConversationOperations={
    prepare:(...args)=>accepting?consumer.prepare(...args):refused(),
    execute:(...args)=>accepting?consumer.execute(...args):refused(),
    cancel:(...args)=>consumer.cancel(...args),readOutcome:(...args)=>consumer.readOutcome(...args),
    listMessages:(...args)=>consumer.listMessages(...args),deleteConversation:(...args)=>consumer.deleteConversation(...args),
  };
  return {operations,runtime,epoch,io,maintenance,quiescence,restart,
    /** Call before closing the owned HTTP listener; existing terminal closure is
     * still permitted. This stops periodic work, not an assertion of model stop. */
    stopAdmissionAndMaintenance:async()=>{accepting=false;await runner.stop();},
  };
}
