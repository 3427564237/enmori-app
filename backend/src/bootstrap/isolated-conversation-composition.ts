import { requireRemoteGroupEnvironment } from '../shared/infrastructure/firebase/feature-environment.js';
import { withRetainedMessageTimes } from "../ai-conversation/infrastructure/retained-message-times.js";
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
import { requireFeatureContextFirestore } from "../ai-conversation/infrastructure/isolated-context-firestore.js";
import { FirebaseAdminFirestoreGateway, type FirestoreGateway } from "../shared/infrastructure/firebase/firestore-gateway.js";
import { requireControlledEmulatorEnvironment } from "../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { ConversationInput, ConversationGates } from "../ai-conversation/ports/conversation-lifecycle.js";
import type { ConversationOperations } from "../ai-conversation/ports/conversation-operations.js";
import type { MaintenanceResult } from "../ai-conversation/ports/conversation-maintenance.js";
import { startConversationMaintenance, type MaintenanceSchedule } from "./conversation-maintenance-runner.js";
import { FirestoreSelectedReplyReader } from "../ai-conversation/infrastructure/firestore-selected-reply-reader.js";
import { createOwnedSourceOperations } from "./owned-source-composition.js";

/** Explicit isolated composition; ordinary buildApp/main never invokes it.
 * Caller validates and owns the actual Emulator Firestore instance. No fake
 * model, policy, Note prerequisite or identity is supplied as a default. */
interface ConversationCompositionOptions {
  readonly firestore: Firestore;
  readonly environment: Readonly<Record<string,string|undefined>>;
  readonly transport: GenerationTransport<ConversationInput>;
  readonly gates: ConversationGates;
  readonly conversationStrategy?: "open_conversation_v1";
  readonly notePrerequisites?: SourceBoundNotePrerequisites;
  readonly simpleChat?: true;
  readonly selectedReplies?: true;
  readonly report: (phase: "expiry" | "source", result: MaintenanceResult) => void;
  readonly reportRetirement: (confirmed: boolean) => void;
  readonly schedule?: MaintenanceSchedule;
  /** Trusted host clock/test seam only; never taken from a request or DTO. */
  readonly utcMilliseconds?: () => number;
}

export async function createIsolatedConversationComposition(options: ConversationCompositionOptions) {
  requireControlledEmulatorEnvironment(options.environment);
  return createConversationComposition(options);
}
export async function createRemoteConversationComposition(options: ConversationCompositionOptions) {
  requireRemoteGroupEnvironment(options.environment);
  return createConversationComposition(options);
}
async function createConversationComposition(options: ConversationCompositionOptions) {
  requireFeatureContextFirestore(options.firestore,options.environment);
  if (options.notePrerequisites && options.notePrerequisites.firestore !== options.firestore) throw new Error("Mismatched Note authority");
  const clock = new MonotonicRuntimeClock(), io = new ConversationIoTracker(), utcMilliseconds=options.utcMilliseconds??Date.now;
  const rawGateway = new FirebaseAdminFirestoreGateway(options.firestore);
  const gateway = options.simpleChat ? withRetainedMessageTimes(rawGateway) : rawGateway;
  const notePrerequisites = options.notePrerequisites ? { ...options.notePrerequisites, gateway } : undefined;
  const store = new FirestoreConversationStore(gateway,options.environment,utcMilliseconds,notePrerequisites);
  const start = await store.startEpoch(randomUUID());
  if (start.kind !== "confirmed") throw new Error("Isolated runtime epoch unavailable");
  const epoch = start.value;
  const restart = await retirePreviousConversationEpoch(gateway,store,epoch,options.environment);
  if (!restart.complete) throw new Error("Previous runtime controls unresolved");
  const runtime = new BoundedAiRuntime(clock,new AuthorizedAsyncConversationGenerationTransport(options.transport), options.simpleChat === true);
  let consumer!: ApplicationConversationOperations;
  const quiescence = new ConversationIoQuiescence({ acquireTargetLease: (...args) => consumer.acquireTargetLease(...args) },io);
  const cleanup = new FirestoreConversationCleanup(gateway,options.environment,quiescence,utcMilliseconds);
  const readers = new FirestoreConversationOperationReaders(store,cleanup,epoch);
  const authority = new FirebaseAdminConversationOperationAuthority(options.firestore,options.environment,()=>clock.now());
  const prepareReader = options.selectedReplies ? new FirestoreSelectedReplyReader(gateway, options.environment, undefined, utcMilliseconds) : undefined;
  const operationReaders = prepareReader ? Object.assign(readers, {
    prepareSelection: (context: Parameters<FirestoreSelectedReplyReader["prepare"]>[0], input: Parameters<FirestoreSelectedReplyReader["prepare"]>[1]) => prepareReader.prepare(context, input),
  }) : readers;
  consumer = new ApplicationConversationOperations(
    authority,
    {uuid:randomUUID,operationKey:()=>randomBytes(32).toString("base64url")},
    {now:()=>clock.now(),at:(at,wake)=>clock.at(at,wake),utcMilliseconds},
    {create:(input,delivery)=>new AsyncConversationOperationExecutor({runtime,gates:options.gates,
      ...(options.conversationStrategy ? {strategy:options.conversationStrategy} : {}),
      clock:{monotonicNow:()=>clock.now(),utcNow:()=>{const ms=utcMilliseconds(),seconds=Math.floor(ms/1000);return {seconds,nanoseconds:(ms-seconds*1000)*1000000};}},
      ports:original=>{
        const db=trackConversationFirestore(options.firestore,io,input.identity.ownerId,input.operation.conversationId,input.operation.operationId);
        const authority=new FirebaseAdminAsyncConversationAuthority(db,original,options.environment);
        const reads=new FirebaseAdminRealContextReader(db,{controlledEnvironment:options.environment,
          originalAuthority:{verify:original.verifyRead},monotonicNow:()=>clock.now(),
          ...(options.simpleChat ? {includeCheckIns:false as const,includePersonaExpression:true as const} : {}),
          ...(options.notePrerequisites ? {notePrerequisites:{...options.notePrerequisites,firestore:db}} : {})});
        const bridge=new TrackedAsyncConversationStore(new AsyncFirestoreConversationStore(store,epoch,authority),io,store,epoch,options.reportRetirement);
        const ownerId=input.identity.ownerId,conversationId=input.operation.conversationId,operationId=input.operation.operationId;
        const selectedGateway:FirestoreGateway={runTransaction:(work,transactionOptions)=>
          io.run(ownerId,conversationId,operationId,()=>gateway.runTransaction(work,transactionOptions))};
        return {authority,reads,store:bridge,acknowledgedPair:bridge,
          ...(options.selectedReplies ? { selectedReads: new FirestoreSelectedReplyReader(selectedGateway, options.environment, original, utcMilliseconds) } : {})};
      }}).create(input,delivery)},operationReaders);
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
    listConversations:(caller,after)=>consumer.listConversations(caller,after),
  };
  const ownedSources = options.selectedReplies ? createOwnedSourceOperations(authority, store, () => accepting) : undefined;
  return {operations,runtime,epoch,io,maintenance,quiescence,restart,store,gateway,ownedSources,
    /** Call before closing the owned HTTP listener; existing terminal closure is
     * still permitted. This stops periodic work, not an assertion of model stop. */
    stopAdmissionAndMaintenance:async()=>{accepting=false;await runner.stop();},
  };
}
