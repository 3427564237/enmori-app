import { OwnAvatar } from "../account/application/own-avatar.js";
import { FirestoreOwnAvatarRepository } from "../account/infrastructure/firestore-own-avatar-repository.js";
import type {CheckInHistoryFirestoreGateway} from "../check-ins/ports/check-in-history-firestore-gateway.js";
import {OwnCheckInCalendar} from "../check-ins/application/check-in-calendar.js";
import {FirestoreCheckInCalendar} from "../check-ins/infrastructure/firestore-check-in-calendar.js";
import { EditCheckIn } from "../check-ins/application/edit-check-in.js";
import { FirestoreCheckInMutations } from "../check-ins/infrastructure/firestore-check-in-mutations.js";
import { CreateInterestTag } from '../interests/application/create-interest-tag.js';
import { GetInterestAdminCapability } from '../interests/application/get-interest-admin-capability.js';
import { FirebaseInterestAdmin } from '../interests/infrastructure/firebase-interest-admin.js';
import { FirestoreCatalogueWriter } from '../interests/infrastructure/firestore-catalogue-writer.js';
import { CreateCheckIn } from "../check-ins/application/create-check-in.js";
import { GetCheckIn } from "../check-ins/application/get-check-in.js";
import { FirestoreCheckInRepository } from "../check-ins/infrastructure/firestore-check-in-repository.js";
import { ListOwnCheckInsForDate } from "../check-ins/application/check-in-history.js";
import { FirestoreCheckInHistoryRepository } from "../check-ins/infrastructure/firestore-check-in-history-repository.js";
import { FirebaseAdminCheckInHistoryGateway } from "../check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { createHistoryCursorCodec } from "../check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { CompleteOnboarding } from "../onboarding/application/complete-onboarding.js";
import { friendPairKey } from "../friends/infrastructure/firestore-friend-repository.js";
import { FriendRequests } from "../friends/application/friend-requests.js";
import { FirestoreFriendRepository } from "../friends/infrastructure/firestore-friend-repository.js";
import { GetInterestTags } from "../interests/application/get-interest-tags.js";
import { GetOwnInterests } from "../interests/application/get-own-interests.js";
import { ReplaceOwnInterests } from "../interests/application/replace-own-interests.js";
import { FirestoreInterestRepository } from "../interests/infrastructure/firestore-interest-repository.js";
import { CryptoOpaqueIdGenerator } from "../shared/infrastructure/crypto-opaque-id-generator.js";
import { SystemClock } from "../shared/infrastructure/system-clock.js";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { OwnAccountPreferences } from "../account/application/own-account-preferences.js";
import { FirestoreAccountPreferencesRepository } from "../account/infrastructure/firestore-account-preferences-repository.js";
import { GetOnboarding } from "../onboarding/application/get-onboarding.js";
import { FirestoreOnboardingRepository } from "../onboarding/infrastructure/firestore-onboarding-repository.js";
import { OwnPersonas } from "../personas/application/own-personas.js";
import { FirestorePersonaRepository } from "../personas/infrastructure/firestore-persona-repository.js";
import { FirebaseIdentityVerifier } from "../shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway, type FirestoreGateway } from "../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../shared/infrastructure/firebase/firestore-records.js";
import { requireControlledEmulatorEnvironment } from "../shared/infrastructure/firebase/controlled-emulator-environment.js";
import { appFailure } from "../shared/application/app-failure.js";
import { err, ok } from "../shared/domain/result.js";
import type { ConversationInput, ConversationGates } from "../ai-conversation/ports/conversation-lifecycle.js";
import type { ConversationOperations, ConversationResult } from "../ai-conversation/ports/conversation-operations.js";
import { openConversationSemanticCandidate } from "../ai-conversation/application/open-conversation-semantic-policy.js";
import { boundedConversationSemanticCandidate } from "../ai-conversation/application/bounded-conversation-semantic-policy.js";
import type { GenerationTransport } from "../ai-runtime/ports/generation-transport.js";
import type { CompletePromptCompiler } from "../ai-runtime/infrastructure/controlled-ollama-transport.js";
import { buildApp } from "./build-app.js";
import { createIsolatedConversationComposition } from "./isolated-conversation-composition.js";
import { createControlledEventRecommendations } from "./controlled-event-recommendations.js";
import { FirebaseAdminEventReadGateway, type EventReadGateway } from "../event-recommendations/infrastructure/event-read-gateway.js";
import { createControlledEventBrowse } from "./controlled-event-browse.js";
import type { IsolatedEventBrowseInput } from "./isolated-event-browse.js";
import type { ControlledPhoneDiagnostics } from "./controlled-phone-diagnostics.js";

const unavailable = () => new Error("CONTROLLED_PHONE_SERVICE_UNAVAILABLE");
function requireProof(value: unknown): asserts value { if (!value) throw unavailable(); }
const runtimePath = "ai_runtime_fence/current";

/** Operator-only, process-lifetime service on an exclusively owned EMPTY demo
 * Emulator pair. Ordinary/controlled-demo bootstrap never imports this module.
 * There is no automatic journey, one-generation cap, fixture reset after a
 * request, cloud fallback, new HTTP operation or fabricated Note authority.
 * Default mode admits one fresh synthetic owner; explicit v2 admits exactly two
 * reserved email identities, with primary registration and a precreated secondary.
 * Default mode has no source
 * writer. Explicit demo mode admits only the existing create-only canonical UTC
 * Check-in writer; no edit/delete/import/restore exists during this process.
 * IDs cannot be reused while records remain. Final deletion happens only after
 * admission is closed and every original operation settles; this process never
 * restarts that owner. These are isolated owned-source facts, not cloud authority.
 */
export async function createControlledPhoneService(options: {
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly exclusiveEmulatorsVerified: true;
  readonly transport: GenerationTransport<ConversationInput>;
  readonly compiler: CompletePromptCompiler<ConversationInput>;
  readonly eventBrowse?: IsolatedEventBrowseInput;
  /** Explicit isolated demo composition; ordinary and existing phone modes stay unchanged. */
  readonly demoFeatures?: true;
  /** v2 reserves primary registration and precreates only the secondary. */
  readonly dualAccounts?: true;
  readonly conversationStrategy?: "open_conversation_v1";
  readonly diagnostics?: ControlledPhoneDiagnostics;
}) {
  const environment = requireControlledEmulatorEnvironment(options.environment);
  requireProof(environment.projectId === "demo-enmori-rmvp01a-r10" && options.exclusiveEmulatorsVerified === true);
  requireProof(JSON.stringify(requireControlledEmulatorEnvironment(process.env)) === JSON.stringify(environment));
  requireProof(options.demoFeatures === undefined || options.demoFeatures === true);
  requireProof(options.dualAccounts === undefined || (options.dualAccounts === true && options.demoFeatures === true));
  requireProof(options.conversationStrategy === undefined || (options.conversationStrategy === "open_conversation_v1" && options.dualAccounts === true));
  requireProof(typeof options.transport?.generate === "function" && typeof options.compiler?.compile === "function");
  const firebase = initializeApp({ projectId: environment.projectId }, `controlled-phone-${randomUUID()}`);
  const db = getFirestore(firebase), auth = getAuth(firebase);
  const owner = randomUUID(), uid = `controlled-phone-${randomUUID()}`;
  const account = `accounts/${owner}`, binding = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
  let email = `${uid}@example.invalid`, password = `Synthetic_${randomUUID()}`;
  let authOwned = false, accountOwned = false, bindingOwned = false;
  const secondaryOwner = randomUUID(), secondaryUid = `controlled-phone-${randomUUID()}`;
  let secondaryEmail = `${secondaryUid}@example.invalid`, secondaryPassword = `Synthetic_${randomUUID()}`;
  let primaryUid: string | undefined, secondaryAuthOwned = false;
  const ownerIds = options.dualAccounts ? [owner, secondaryOwner] : [owner];
  const admittedUids = new Map<string, string>();
  if (!options.dualAccounts) admittedUids.set(email, uid);
  else admittedUids.set(secondaryEmail, secondaryUid);
  let phase: "starting" | "running" | "stopping" | "held" | "closed" = "starting";
  let calls = 0, compilerPending = 0, modelPending = 0, modelAttempts = 0, maintenanceHealthy = true, retirementFailed = false;
  let joined: Awaited<ReturnType<typeof createIsolatedConversationComposition>> | undefined;
  let startupWritesAttempted = false, epochRetired = false;
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  let stopped: Promise<{ cleanupConfirmed: boolean; operatorHold: boolean }> | undefined;
  const targets = new Set<string>();
  const demoOwnedPaths = new Set<string>();
  const clock = new SystemClock();
  const isClosed = () => phase === "closed";
  async function tracked<T>(work: () => Promise<T>): Promise<T> {
    calls++;
    try { return await work(); } finally { calls--; }
  }
  const eventBrowse = createControlledEventBrowse({ ...(options.eventBrowse ? { source: options.eventBrowse.source } : {}),
    ...(options.dualAccounts ? { projectionCache: true } : {}),
    running: () => phase === "running", track: tracked });
  const rawGateway = new FirebaseAdminFirestoreGateway(db);
  const gateway: FirestoreGateway = { runTransaction: (work, transactionOptions) => {
    if (phase !== "running") return Promise.reject(unavailable());
    return tracked(() => rawGateway.runTransaction(work, transactionOptions));
  } };
  const beforeGeneration: ConversationGates["beforeGeneration"] = (getInput, budget) => {
    try {
      const input = getInput();
      if (phase !== "running" || !maintenanceHealthy || !input || budget.signal.aborted || budget.remainingMs() <= 0) return Promise.resolve(err("stale_authority" as const));
      compilerPending++;
      let compiling: ReturnType<typeof options.compiler.compile>;
      try { compiling = (options.diagnostics?.compiler("before_generation_compile", options.compiler) ?? options.compiler).compile(input, budget); } catch { compilerPending--; throw unavailable(); }
      return compiling.then(compiled => {
        if (phase !== "running" || budget.signal.aborted || budget.remainingMs() <= 0 || getInput() === undefined) return err("stale_authority" as const);
        return compiled.includesAllFraming === true && Number.isSafeInteger(compiled.tokens) && compiled.tokens >= 1 && compiled.tokens <= 4096
          ? ok(undefined) : err("dependency_unavailable" as const);
      }, () => err("dependency_unavailable" as const)).finally(() => { compilerPending--; });
    } catch { return Promise.resolve(err("dependency_unavailable" as const)); }
  };
  function observation() {
    const state = joined?.runtime.state;
    return { phase, accepting: phase === "running", maintenanceHealthy, retirementConfirmed: !retirementFailed,
      modelAttempts, modelPending, compilerPending, activeCalls: calls, nonTerminal: state?.nonTerminal ?? 0,
      quarantined: state?.quarantined ?? false, admission: state?.admission ?? "stopped",
      eventBrowse: eventBrowse.observation(),
      databaseLifetime: "owned-emulator-process" as const };
  }
  const quiet = () => calls === 0 && compilerPending === 0 && modelPending === 0 && !retirementFailed &&
    (!joined || (joined.runtime.state.nonTerminal === 0 && !joined.runtime.state.quarantined));

  async function stop() {
    if (phase === "closed") return { cleanupConfirmed: true, operatorHold: false };
    phase = "stopping"; // Synchronous gate before any awaited operation.
    eventBrowse.disable();
    await joined?.stopAdmissionAndMaintenance();
    // Do not terminate the process, replace the epoch, erase a write, or release
    // the model lane because the Application is terminal or a timeout elapsed.
    if (!quiet()) { phase = "held"; return { cleanupConfirmed: false, operatorHold: true }; }
    try {
      joined?.runtime.shutdown();
      if (app) {
        const closing = app.close(); app.server.closeAllConnections(); await closing;
      }
      requireProof(quiet());
      if (joined && !epochRetired) {
        for (const ownerId of ownerIds) {
          const conversationIds = new Set(targets);
          const parents = await db.collection(`accounts/${ownerId}/conversations`).get();
          for (const parent of parents.docs) conversationIds.add(parent.id);
          const discovered = await db.collection("ai_operation_fences").where("ownerAccountId", "==", ownerId).get();
          for (const fence of discovered.docs) {
            requireProof(typeof fence.data().conversationId === "string"); conversationIds.add(fence.data().conversationId);
          }
          for (const target of conversationIds) await joined.io.settled(ownerId, target);
        }
        requireProof(quiet());
        const fences = (await Promise.all(ownerIds.map(ownerId => db.collection("ai_operation_fences").where("ownerAccountId", "==", ownerId).get()))).flatMap(snapshot => snapshot.docs);
        for (const fence of fences) requireProof(fence.data().processEpoch === joined.epoch.processEpoch && fence.data().state === "closed");
        await db.runTransaction(async tx => {
          const current = await tx.get(db.doc(runtimePath));
          const sweep = await tx.get(db.doc("ai_cleanup_progress/source_sweep"));
          requireProof(current.data()?.processEpoch === joined!.epoch.processEpoch && current.data()?.generation === joined!.epoch.generation);
          requireProof(!sweep.exists);
        }, { maxAttempts: 1 });
        for (const ownerId of ownerIds) {
          const ownedAccount = db.doc(`accounts/${ownerId}`);
          await db.recursiveDelete(ownedAccount);
          requireProof(!(await ownedAccount.get()).exists && (await ownedAccount.listCollections()).length === 0);
        }
        accountOwned = false;
        for (const fence of fences) await fence.ref.delete();
        for (const ownerId of ownerIds) requireProof((await db.collection("ai_operation_fences").where("ownerAccountId", "==", ownerId).get()).empty);
        await db.runTransaction(async tx => {
          const current = await tx.get(db.doc(runtimePath));
          requireProof(current.data()?.processEpoch === joined!.epoch.processEpoch && current.data()?.generation === joined!.epoch.generation);
          tx.delete(current.ref);
        }, { maxAttempts: 1 });
        epochRetired = true;
      } else if (accountOwned) {
        await db.recursiveDelete(db.doc(account)); accountOwned = false;
      }
      if (options.demoFeatures) {
        // No writer can enter after phase=stopping; quiet() observes original SDK
        // settlement. Only this fresh owner and explicitly created fixture paths.
        const cleanupScopes = [...ownerIds, ...admittedUids.values()];
        for (const [collection, field, scopes] of [["check_ins", "ownerAccountId", ownerIds], ["idempotency", "scope", cleanupScopes], ["username_reservations", "accountId", ownerIds]] as const) {
          for (const scope of scopes) {
            const owned = await db.collection(collection).where(field, "==", scope).get();
            for (const record of owned.docs) await record.ref.delete();
            requireProof((await db.collection(collection).where(field, "==", scope).get()).empty);
          }
        }
        for (const path of demoOwnedPaths) {
          await db.recursiveDelete(db.doc(path));
          requireProof(!(await db.doc(path).get()).exists && (await db.doc(path).listCollections()).length === 0);
        }
      }
      if (bindingOwned) { await db.doc(binding).delete(); requireProof(!(await db.doc(binding).get()).exists); bindingOwned = false; }
      if (authOwned) {
        await auth.deleteUser(uid);
        requireProof(await auth.getUser(uid).then(() => false, error => {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found") return true;
          throw unavailable();
        })); authOwned = false;
      }
      if (options.dualAccounts) {
        for (const admittedUid of admittedUids.values()) {
          const ownedBinding = db.doc(`auth_bindings/${createAuthBindingDocumentId(admittedUid)!}`);
          await ownedBinding.delete(); requireProof(!(await ownedBinding.get()).exists);
        }
        // A primary may register and close before its first Backend request.
        // This exact reserved email was absent at exclusive startup; no broad Auth sweep.
        const registered = await (primaryUid ? auth.getUser(primaryUid) : auth.getUserByEmail(email)).catch(error => {
          if (error?.code === "auth/user-not-found") return undefined;
          throw unavailable();
        });
        if (registered) {
          requireProof(primaryUid === undefined || primaryUid === registered.uid);
          await db.doc(`auth_bindings/${createAuthBindingDocumentId(registered.uid)!}`).delete();
          await auth.deleteUser(registered.uid);
        }
        if (secondaryAuthOwned) { await auth.deleteUser(secondaryUid); secondaryAuthOwned = false; }
      }
      email = ""; password = ""; secondaryEmail = ""; secondaryPassword = "";
      await db.terminate(); await deleteApp(firebase);
      phase = "closed";
      return { cleanupConfirmed: true, operatorHold: false };
    } catch { phase = "held"; return { cleanupConfirmed: false, operatorHold: true }; }
  }
  function stopAndClean() {
    // Serialize concurrent stop attempts. A later retry may observe ORIGINAL
    // completion; it never allocates a replacement runtime or generation.
    stopped ??= stop().finally(() => { stopped = undefined; });
    return stopped;
  }

  try {
    // An existing account, orphan collection, runtime/fence or Auth user is not
    // an empty fixture. Startup never clears it or silently resumes a new epoch.
    requireProof((await db.listCollections()).length === 0 && (await auth.listUsers(1)).users.length === 0);
    startupWritesAttempted = true;
    if (!options.dualAccounts) {
      await auth.createUser({ uid, email, password }); authOwned = true;
      await db.doc(binding).create({ accountId: owner }); bindingOwned = true;
      await db.doc(account).create({ username: `p_${owner.replaceAll("-", "").slice(0, 16)}`,
        optionalProcessingConsent: "accepted", checkInVisibility: "private", onboardingCompletedAt: new Date().toISOString(), purposeRevocationGeneration: 0 }); accountOwned = true;
    } else {
      await auth.createUser({ uid: secondaryUid, email: secondaryEmail, password: secondaryPassword }); secondaryAuthOwned = true;
      const secondaryBinding = `auth_bindings/${createAuthBindingDocumentId(secondaryUid)!}`;
      const secondaryUsername = `s_${secondaryOwner.replaceAll("-", "").slice(0, 16)}`;
      const records = {
        [secondaryBinding]: { accountId: secondaryOwner },
        [`accounts/${secondaryOwner}`]: { username: secondaryUsername, optionalProcessingConsent: "accepted", checkInVisibility: "private", onboardingCompletedAt: new Date().toISOString(), purposeRevocationGeneration: 0,
          displayName: "Demo friend", profileVisibility: "public", profileRevision: 1 },
        [`username_reservations/${secondaryUsername}`]: { accountId: secondaryOwner },
        [`friend_pairs/${friendPairKey(owner, secondaryOwner)}`]: { accountIds: [owner, secondaryOwner].sort(), blockedByAccountIds: [], friendship: false, pending: null },
      };
      for (const [path, record] of Object.entries(records)) { demoOwnedPaths.add(path); await db.doc(path).create(record); }
    }
    for (const ownerId of ownerIds) await db.doc(`accounts/${ownerId}/persona_state/current`).create({ livePersonaIds: [], stateRevision: 0 });
    if (options.demoFeatures) {
      const records = {
        [`friend_access/${owner}`]: { eligibilityState: "eligible" },
        [`friend_lists/${owner}`]: { initialized: true },
        [`friend_inboxes/${owner}`]: { initialized: true },
        [`account_interests/${owner}`]: { interestTagIds: [], revision: 1 },
        ["interest_tags/interest_music"]: { displayName: options.dualAccounts ? "Music" : "Music fixture", lifecycleState: "active", revision: 1 },
      };
      if (options.dualAccounts) Object.assign(records, {
        [`friend_access/${secondaryOwner}`]: { eligibilityState: "eligible" },
        [`friend_lists/${secondaryOwner}`]: { initialized: true },
        [`friend_inboxes/${secondaryOwner}`]: { initialized: true },
        [`account_interests/${secondaryOwner}`]: { interestTagIds: [], revision: 1 },
      });
      for (const [path, record] of Object.entries(records)) {
        demoOwnedPaths.add(path); await db.doc(path).create(record);
      }
    }
    joined = await createIsolatedConversationComposition({ firestore: db, environment: options.environment,
      transport: { generate: (input, budget) => {
        requireProof(phase === "running" && (options.demoFeatures === true || input.checkIns.length === 0));
        modelAttempts++; modelPending++;
        try { return options.transport.generate(input, budget).finally(() => { modelPending--; }); }
        catch { modelPending--; throw unavailable(); }
      } },
      gates: { beforeGeneration, candidate: options.conversationStrategy === "open_conversation_v1" ? openConversationSemanticCandidate : boundedConversationSemanticCandidate },
      ...(options.conversationStrategy ? { conversationStrategy: options.conversationStrategy } : {}),
      notePrerequisites: { firestore: db, sourceReferences: options.demoFeatures ? [
        options.dualAccounts ? "controlled-phone-service.ts#exclusive-empty-start-two-bound-identities-create-only-writer-and-quiescent-owned-delete"
          : "controlled-phone-service.ts#exclusive-empty-start-single-create-only-writer-and-quiescent-final-delete",
        "check-ins/application/create-check-in.ts#authoritative-canonical-UTC",
        "check-ins/infrastructure/firestore-check-in-repository.ts#create-only-owner-note-time-no-edit-restore",
      ] : ["controlled-phone-service.ts#exclusive-fresh-owner-no-source-writers"],
        completeCanonicalUtcInventory: true, immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true },
      report: (_phase, result) => { if (!result.complete) maintenanceHealthy = false; },
      reportRetirement: confirmed => { if (!confirmed) retirementFailed = true; },
      // Keep the existing real startup/hourly maintenance schedule.
    });
    requireProof(maintenanceHealthy);
    async function run<T>(work: () => Promise<ConversationResult<T>>, admission = false): Promise<ConversationResult<T>> {
      if (phase !== "running" || (admission && !maintenanceHealthy)) return { kind: "failure", code: "AI_UNAVAILABLE" };
      return tracked(work);
    }
    const conversations: ConversationOperations = {
      prepare: (...args) => run(async () => {
        const result = await joined!.operations.prepare(...args);
        if (result.kind === "success") targets.add(result.value.conversationId);
        return result;
      }, true),
      execute: (...args) => run(() => joined!.operations.execute(...args), true),
      cancel: (...args) => run(() => joined!.operations.cancel(...args)),
      readOutcome: (...args) => run(() => joined!.operations.readOutcome(...args)),
      listMessages: (...args) => run(() => joined!.operations.listMessages(...args)),
      deleteConversation: (...args) => run(() => joined!.operations.deleteConversation(...args)),
    };
    const verifier = new FirebaseIdentityVerifier(auth);
    const checkIns = new FirestoreCheckInRepository(gateway);
    const interests = new FirestoreInterestRepository(gateway);
    const rawHistory = new FirebaseAdminCheckInHistoryGateway(db);
    const historyGateway: CheckInHistoryFirestoreGateway = {
      runTransaction: work => {
        if (phase !== "running") return Promise.reject(unavailable());
        return tracked(() => rawHistory.runTransaction(work));
      },
    };
    const history = new ListOwnCheckInsForDate(new FirestoreCheckInHistoryRepository(historyGateway), createHistoryCursorCodec(), clock);
    const rawEvents = new FirebaseAdminEventReadGateway(db);
    const eventGateway: EventReadGateway = {
      get: path => {
        if (phase !== "running") return Promise.reject(unavailable());
        return tracked(() => rawEvents.get(path));
      },
      listEvents: () => {
        if (phase !== "running") return Promise.reject(unavailable());
        return tracked(() => rawEvents.listEvents());
      },
    };
    const realEvents = options.dualAccounts ? createControlledEventRecommendations({ gateway: eventGateway, source: eventBrowse.source, clock }) : undefined;
    const unavailableOperation = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
    const completePrimary = new CompleteOnboarding(new FirestoreOnboardingRepository(gateway, options.environment), clock, { generate: () => ok(owner) });
    const completeOnboarding: Pick<CompleteOnboarding, "execute"> = options.dualAccounts ? {
      execute: input => input.principal.firebaseUid === primaryUid ? completePrimary.execute(input) : Promise.resolve(err(appFailure("AUTH_FORBIDDEN"))),
    } : unavailableOperation;
    app = await buildApp({
      ...(options.demoFeatures ? {checkInCalendar:new OwnCheckInCalendar(new FirestoreCheckInCalendar(historyGateway))}:{}),
      editCheckIn: new EditCheckIn(new FirestoreCheckInMutations(gateway)),
      createInterestTag: new CreateInterestTag(new FirebaseInterestAdmin(auth), new FirestoreCatalogueWriter(gateway)),
      getInterestAdminCapability: new GetInterestAdminCapability(new FirebaseInterestAdmin(auth)),
      ...(options.diagnostics ? { controlledPhoneDiagnostics: options.diagnostics } : {}),
      ...(realEvents ? { recommendEvents: realEvents.recommendEvents } : {}),
      identityVerifier: { verifyIdToken: async token => {
        if (isClosed()) return { kind: "dependency_unavailable" };
        const result = await tracked(() => verifier.verifyIdToken(token));
        if (isClosed()) return { kind: "dependency_unavailable" };
        if (result.kind !== "verified") return result;
        if (!options.dualAccounts) return result.principal.firebaseUid === uid ? result : { kind: "forbidden" };
        try {
          const identity = await tracked(() => auth.getUser(result.principal.firebaseUid));
          if (isClosed() || identity.disabled || (identity.email !== email && identity.email !== secondaryEmail)) return { kind: "forbidden" };
          const boundUid = admittedUids.get(identity.email);
          if (boundUid !== undefined && boundUid !== identity.uid) return { kind: "forbidden" };
          if (identity.email === email && boundUid === undefined) {
            primaryUid = identity.uid; admittedUids.set(email, identity.uid);
          }
          return result;
        } catch { return { kind: "dependency_unavailable" }; }
      } },
      accountPreferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway, options.environment), new OwnAvatar(new FirestoreOwnAvatarRepository(gateway))),
      completeOnboarding, getOnboarding: new GetOnboarding(new FirestoreOnboardingRepository(gateway)),
      createCheckIn: options.demoFeatures ? new CreateCheckIn(checkIns, clock, new CryptoOpaqueIdGenerator()) : unavailableOperation,
      getCheckIn: options.demoFeatures ? new GetCheckIn(checkIns) : unavailableOperation,
      getInterestTags: options.demoFeatures ? new GetInterestTags(interests) : unavailableOperation,
      getOwnInterests: options.demoFeatures ? new GetOwnInterests(interests) : unavailableOperation,
      replaceOwnInterests: options.demoFeatures ? new ReplaceOwnInterests(interests) : unavailableOperation,
      isolatedSlices: { environment: { ...options.environment }, conversations,
        ...(options.demoFeatures ? { friends: new FriendRequests(new FirestoreFriendRepository(gateway, clock), clock), checkInHistory: history } : {}),
        ...(realEvents ? { eventDetail: realEvents.eventDetail } : {}),
        eventBrowse: { source: eventBrowse.source, ...(options.eventBrowse?.now ? { now: options.eventBrowse.now } : {}) },
        personas: new OwnPersonas(new FirestorePersonaRepository(gateway, { now: () => ok(new Date()) })) },
    });
    phase = "running";
    return { app, observation, stopAndClean,
      eventBrowseControl: { enable: eventBrowse.enable, disable: eventBrowse.disable, observation: eventBrowse.observation },
      /** Private in-process handoff only. Never log, publish, or embed in APK. */
      privateHandoff: () => { requireProof(phase === "running"); return { projectId: environment.projectId, email, password,
        ...(options.dualAccounts ? { secondaryAccount: { email: secondaryEmail, password: secondaryPassword } } : {}) }; },
    };
  } catch {
    if (startupWritesAttempted) {
      // A rejected create/transaction can have lost its ACK. No model has been
      // dispatched, but boolean ownership flags cannot prove absence of those
      // effects. Close local handles only; preserve the original fixture/hold.
      await joined?.stopAdmissionAndMaintenance(); joined?.runtime.shutdown();
      await app?.close();
      await db.terminate(); await deleteApp(firebase);
      throw new Error("CONTROLLED_PHONE_SERVICE_STARTUP_HOLD");
    }
    const result = await stopAndClean();
    if (!result.cleanupConfirmed) throw new Error("CONTROLLED_PHONE_SERVICE_STARTUP_HOLD");
    throw unavailable();
  }
}
