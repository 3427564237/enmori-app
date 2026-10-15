import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Timestamp } from "firebase-admin/firestore";
import { createIsolatedConversationComposition } from "../../src/bootstrap/isolated-conversation-composition.js";
import { buildApp } from "../../src/bootstrap/build-app.js";
import { OwnPersonas } from "../../src/personas/application/own-personas.js";
import { FirestorePersonaRepository } from "../../src/personas/infrastructure/firestore-persona-repository.js";
import { FirebaseAdminFirestoreGateway } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { requireControlledEmulatorEnvironment } from "../../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { appFailure } from "../../src/shared/application/app-failure.js";
import { err, ok } from "../../src/shared/domain/result.js";
import type { ConversationGates, ConversationInput } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import type { GenerationTransport } from "../../src/ai-runtime/ports/generation-transport.js";
import type { CompletePromptCompiler } from "../../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
import { boundedConversationSemanticCandidate } from "../../src/ai-conversation/application/bounded-conversation-semantic-policy.js";

const unavailable = () => new Error("ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE");
function requireProof(value: unknown): asserts value { if (!value) throw unavailable(); }
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const routine = "今天读书了。";
const runtimePath = "ai_runtime_fence/current";
const personaFields = { displayName: "Synthetic routine", tone: "warm", responseLength: "balanced", formatStyle: "plain" } as const;
interface PersonaEnvelope { persona: { personaId: string; revision: number }; stateRevision: number }
interface Ticket { operationId: string; operationKey: string; conversationId: string }
interface WireMessage { messageId: string; sequence: number; role: string; availability: string; text?: string; persistedAt: string }
interface Pair { userMessage: WireMessage; assistantMessage?: WireMessage; state?: string }

export interface ZhouRoutineChatReport {
  readonly schemaVersion: 1;
  readonly scope: "owned-empty-note-auth-persona-http-firestore";
  readonly result: "accepted" | "rejected";
  readonly modelAttempts: 1;
  readonly completeInputGatePassed: true;
  readonly personaCrudAndSelectionPassed: true;
  readonly ordinaryOutcomeAndHistoryPassed: true;
  readonly canonicalUserMetadataConfirmed: true;
  readonly assistantAnchorConfirmed: boolean;
  readonly rejectedHasNoAssistantOrProvenance: boolean;
  readonly physicalConversationCleanupPassed: true;
}

/** Explicit operator-only Emulator fixture. No model, counter or permissive
 * gates are defaulted. Real-host execution supplies JIN's pinned transport and
 * matching COMPLETE compiler; ordinary CI supplies explicitly labelled HTTP /
 * counter doubles. The helper never installs, discovers or falls back to a host.
 * Returned credentials are an ephemeral, private in-process channel only. */
export async function createZhouRealModelStoreFixture(options: {
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly transport: GenerationTransport<ConversationInput>;
  readonly compiler: CompletePromptCompiler<ConversationInput>;
}) {
  const environment = requireControlledEmulatorEnvironment(options.environment);
  requireProof(environment.projectId === "demo-enmori-rmvp01a-r10");
  requireProof(typeof options.transport?.generate === "function" && typeof options.compiler?.compile === "function");
  // SDK endpoint/profile lookup uses process.env. A caller cannot validate one
  // environment while Firebase Admin silently uses a different ambient one.
  const ambient = requireControlledEmulatorEnvironment(process.env);
  requireProof(JSON.stringify(ambient) === JSON.stringify(environment));
  const firebase = initializeApp({ projectId: environment.projectId }, `zhou-real-chat-${randomUUID()}`);
  const db = getFirestore(firebase), auth = getAuth(firebase), uid = `zhou-chat-${randomUUID()}`, owner = randomUUID();
  const account = `accounts/${owner}`, binding = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
  let email = `${uid}@example.invalid`, password = `Synthetic_${randomUUID()}`, token = "";
  let authOwned = false, accountOwned = false, bindingOwned = false, closed = false, closing = false, cleanupConfirmed = false;
  let localHandlesOnly = false, localHandlesDisposed = false;
  let originalRequestAbort: AbortController | undefined;
  let joined: Awaited<ReturnType<typeof createIsolatedConversationComposition>> | undefined;
  let server: Awaited<ReturnType<typeof buildApp>> | undefined;
  let baseUri = "", modelAttempts = 0, modelPending = 0, completeInputGatePassed = false, packetUsed = false;
  const conversations = new Set<string>(), operations = new Set<string>();
  const retirementWaiters: { resolve: (value: boolean) => void }[] = [];
  let lastRetirement: Promise<boolean> | undefined;
  let retirementFailed = false;

  const beforeGeneration: ConversationGates["beforeGeneration"] = (getInput, budget) => {
    try {
      // Synchronous borrowing frame exits BEFORE tokenizer I/O. JIN's compiler
      // owns its existing abort-revocable raw holder; this gate keeps no input.
      const input = getInput();
      if (!input || budget.signal.aborted || budget.remainingMs() <= 0) return Promise.resolve(err("stale_authority"));
      return options.compiler.compile(input, budget).then(compiled => {
        if (budget.signal.aborted || budget.remainingMs() <= 0 || getInput() === undefined) return err("stale_authority");
        if (compiled.includesAllFraming !== true || !Number.isSafeInteger(compiled.tokens) || compiled.tokens < 1 || compiled.tokens > 4096) return err("dependency_unavailable");
        completeInputGatePassed = true;
        return ok(undefined);
      }, () => err("dependency_unavailable"));
    } catch { return Promise.resolve(err("dependency_unavailable")); }
  };

  async function bounded<T>(work: PromiseLike<T>, milliseconds = 15_000, checkpoint = "checkpoint"): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([work, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE:${checkpoint}`)), milliseconds); })]); }
    finally { if (timer) clearTimeout(timer); }
  }
  const request = async (method: string, path: string, payload?: object, headers: Record<string, string> = {}) => {
    requireProof(!closed && token && baseUri);
    const original = method === "POST" && /^\/v1\/me\/ai\/operations\/[0-9a-f-]+\/execute$/.test(path) ? new AbortController() : undefined;
    if (original) originalRequestAbort = original;
    try {
      const response = await fetch(new URL(path, baseUri), { method, redirect: "error", cache: "no-store",
        headers: { authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { "content-type": "application/json" }), ...headers },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        signal: original ? AbortSignal.any([original.signal, AbortSignal.timeout(65_000)]) : AbortSignal.timeout(65_000) });
      let body: unknown;
      if (response.status !== 204) { try { body = await response.json(); } catch { throw unavailable(); } }
      return { status: response.status, body };
    } finally { if (originalRequestAbort === original) originalRequestAbort = undefined; }
  };
  const checkedRequest = async <T>(method: string, path: string, status: number, payload?: object, headers?: Record<string, string>): Promise<T> => {
    const response = await request(method, path, payload, headers);
    requireProof(response.status === status); return response.body as T;
  };
  const wireTime = (timestamp: Timestamp) => `${new Date(timestamp.seconds * 1000).toISOString().slice(0, 19)}.${String(Math.floor(timestamp.nanoseconds / 1000)).padStart(6, "0")}Z`;
  const quiet = () => joined !== undefined && joined.runtime.state.nonTerminal === 0 && joined.runtime.state.quarantined === false && modelPending === 0 && !retirementFailed;
  async function closeOwnedServer(checkpoint: string) {
    if (!server) return;
    requireProof(!joined || joined.runtime.state.nonTerminal === 0);
    // Fastify's default idle-only closure can wait for an already abandoned,
    // hijacked original response socket. Once the Application is terminal and
    // its SDK work has been drained by the caller, close owned FRONTEND sockets
    // explicitly. This neither addresses Ollama nor settles its remote lane.
    const closedServer = server.close();
    server.server.closeAllConnections();
    await bounded(closedServer, 15_000, checkpoint);
  }

  async function cleanup(): Promise<void> {
    if (closed) {
      // Handle closure can follow a partial cleanup failure. It is never proof
      // that owned data/controls were removed; repeated calls must retain that
      // failure rather than turning a previous failed cleanup into a pass.
      if (localHandlesOnly || !cleanupConfirmed) throw new Error("ZHOU_CONTROLLED_CHAT_CLEANUP_UNCONFIRMED");
      return;
    }
    closing = true;
    await joined?.stopAdmissionAndMaintenance();
    // A failed attempt must NEVER reset an epoch or remove data still reachable
    // by pending/unconfirmed generation. The operator may retry cleanup only
    // after the ORIGINAL transport actually settles; no replacement epoch here.
    if (joined && !quiet()) throw new Error("ZHOU_CONTROLLED_CHAT_CLEANUP_UNCONFIRMED");
    const failures: unknown[] = [];
    const attempt = async (work: () => Promise<unknown>): Promise<boolean> => {
      try { await work(); return true; } catch { failures.push(unavailable()); return false; }
    };
    try {
      const fixtureResetProven = !joined || await attempt(async () => {
        // A rejected COMPLETE-input gate has never opened a durable fence, so
        // it correctly has no retirement callback to await.
        if (modelAttempts > 0 && lastRetirement) await bounded(lastRetirement).then(confirmed => requireProof(confirmed));
        const ownConversations = await db.collection(`${account}/conversations`).get();
        for (const row of ownConversations.docs) conversations.add(row.id);
        for (const id of conversations) await bounded(joined!.io.settled(owner, id));
        requireProof(quiet());
        // Transaction-bound ownership check: never delete somebody else's epoch.
        await db.runTransaction(async tx => {
          const current = await tx.get(db.doc(runtimePath));
          requireProof(current.data()?.processEpoch === joined!.epoch.processEpoch && current.data()?.generation === joined!.epoch.generation);
          tx.delete(current.ref);
        }, { maxAttempts: 1 });
      });
      // These independently owned resources are always closed after the quiet
      // guard, including when an epoch read/transaction/assertion failed.
      await attempt(() => closeOwnedServer("owned-server-close"));
      if (fixtureResetProven && accountOwned) await attempt(async () => {
        // This final fixture deletion follows confirmed model / SDK quiescence;
        // the packet's production whole-conversation delete is checked earlier.
        await db.recursiveDelete(db.doc(account)); requireProof(!(await db.doc(account).get()).exists);
      });
      if (fixtureResetProven && bindingOwned) await attempt(async () => { await db.doc(binding).delete(); requireProof(!(await db.doc(binding).get()).exists); });
      if (fixtureResetProven) await attempt(async () => {
        const fences = await db.collection("ai_operation_fences").where("ownerAccountId", "==", owner).get();
        for (const row of fences.docs) await attempt(async () => {
          requireProof(conversations.has(row.data().conversationId) && row.data().processEpoch === joined?.epoch.processEpoch && row.data().state === "closed");
          operations.add(row.id); await row.ref.delete();
        });
      });
      if (authOwned) await attempt(async () => {
        await auth.deleteUser(uid);
        const remains = await auth.getUser(uid).then(() => true, error => {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found") return false;
          throw unavailable();
        });
        requireProof(!remains);
      });
      closed = true;
    } finally {
      email = ""; password = ""; token = "";
      await attempt(async () => { await db.terminate(); });
      await attempt(async () => { await deleteApp(firebase); });
    }
    if (failures.length) throw unavailable();
    cleanupConfirmed = true;
  }

  /** Local terminal disposal is NOT remote stop, lane release or database
   * cleanup. It exists so an operator child can exit after its original
   * application is terminal while the remote invocation is still unconfirmed.
   * Account/binding/runtime/fence/content rows stay untouched for the operator.
   * Never invoke this while any original Application remains nonterminal. */
  async function closeTerminalLocalHandlesPreservingFixture() {
    const report = { schemaVersion: 1 as const, localHandlesClosed: true as const,
      fixturePreserved: true as const, cleanupPassed: false as const, operatorHold: true as const };
    if (closed) { requireProof(localHandlesOnly && localHandlesDisposed); return report; }
    requireProof(joined && joined.runtime.state.nonTerminal === 0);
    closing = true;
    await joined.stopAdmissionAndMaintenance();
    requireProof(joined.runtime.state.nonTerminal === 0);
    // The nonasync prepare observer records even reserved-new targets whose
    // initialization/content transaction has not produced a document yet.
    const parents = await db.collection(`${account}/conversations`).get();
    for (const parent of parents.docs) conversations.add(parent.id);
    const fences = await db.collection("ai_operation_fences").where("ownerAccountId", "==", owner).get();
    for (const fence of fences.docs) if (typeof fence.data().conversationId === "string") conversations.add(fence.data().conversationId);
    for (const id of conversations) await bounded(joined.io.settled(owner, id));
    requireProof(joined.runtime.state.nonTerminal === 0);
    // Once terminal SDK work is settled, close the listener so ordinary reads
    // cannot add new local I/O. Closing it is not a model cancellation request.
    await closeOwnedServer("terminal-server-close");
    for (const id of conversations) await bounded(joined.io.settled(owner, id));
    requireProof(joined.runtime.state.nonTerminal === 0);
    const failures: unknown[] = [];
    const attempt = async (work: () => Promise<unknown>) => { try { await work(); } catch { failures.push(unavailable()); } };
    localHandlesOnly = true; closed = true;
    try {
      if (authOwned) await attempt(async () => {
        await auth.deleteUser(uid);
        const remains = await auth.getUser(uid).then(() => true, error => {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found") return false;
          throw unavailable();
        });
        requireProof(!remains);
      });
    } finally {
      email = ""; password = ""; token = ""; originalRequestAbort = undefined;
      await attempt(async () => { await db.terminate(); });
      await attempt(async () => { await deleteApp(firebase); });
    }
    if (failures.length) throw unavailable();
    localHandlesDisposed = true;
    return report;
  }

  try {
    requireProof(!(await db.doc(runtimePath).get()).exists);
    await auth.createUser({ uid, email, password }); authOwned = true;
    const signed = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }), redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    requireProof(signed.status === 200);
    const signedBody: unknown = await signed.json(); requireProof(record(signedBody) && typeof signedBody.idToken === "string"); token = signedBody.idToken;
    await db.doc(binding).create({ accountId: owner }); bindingOwned = true;
    await db.doc(account).create({ username: `z_${owner.replaceAll("-", "").slice(0, 16)}`, optionalProcessingConsent: "accepted",
      checkInVisibility: "private", onboardingCompletedAt: new Date().toISOString(), purposeRevocationGeneration: 0 }); accountOwned = true;
    await db.doc(`${account}/persona_state/current`).create({ livePersonaIds: [], stateRevision: 0 });
    requireProof((await db.collection("check_ins").where("ownerAccountId", "==", owner).get()).empty);
    joined = await createIsolatedConversationComposition({ firestore: db, environment: options.environment,
      transport: { generate: (input, budget) => {
        requireProof(!closing && ++modelAttempts === 1 && input.checkIns.length === 0);
        modelPending++;
        // No async frame retains an extra projection: dispatch immediately into
        // the supplied JIN adapter, and keep only content-free settlement state.
        try { return options.transport.generate(input, budget).finally(() => { modelPending--; }); }
        catch { modelPending--; throw unavailable(); }
      } },
      gates: { beforeGeneration, candidate: boundedConversationSemanticCandidate },
      notePrerequisites: { firestore: db, sourceReferences: ["zhou-real-model-store-fixture.ts#fresh-owned-complete-empty-inventory"],
        completeCanonicalUtcInventory: true, immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true },
      report: (_phase, result) => requireProof(result.complete),
      reportRetirement: confirmed => { if (!confirmed) retirementFailed = true; retirementWaiters.shift()?.resolve(confirmed); },
      schedule: { every: (interval, _tick) => { requireProof(interval === 3_600_000); return () => {}; } },
    });
    const unavailableOperation = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
    const personas = new OwnPersonas(new FirestorePersonaRepository(new FirebaseAdminFirestoreGateway(db), { now: () => ok(new Date()) }));
    server = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth), completeOnboarding: unavailableOperation, getOnboarding: unavailableOperation,
      createCheckIn: unavailableOperation, getCheckIn: unavailableOperation, getInterestTags: unavailableOperation, getOwnInterests: unavailableOperation, replaceOwnInterests: unavailableOperation,
      isolatedSlices: { environment: { ...options.environment }, conversations: {
        ...joined.operations,
        prepare: (...args) => joined!.operations.prepare(...args).then(result => {
          if (result.kind === "success") { conversations.add(result.value.conversationId); operations.add(result.value.operationId); }
          return result;
        }),
      }, personas } });
    baseUri = `${await server.listen({ host: "127.0.0.1", port: 0 })}/`;

    async function verifyRoutineChat(expected: "accepted" | "rejected"): Promise<ZhouRoutineChatReport> {
      requireProof(!packetUsed && !closing); packetUsed = true;
      const created = await checkedRequest<PersonaEnvelope>("POST", "/v1/me/personas", 201, { ...personaFields, expectedStateRevision: 0 }, { "idempotency-key": randomUUID() });
      const edited = await checkedRequest<PersonaEnvelope>("PUT", `/v1/me/personas/${created.persona.personaId}`, 200,
        { ...personaFields, tone: "encouraging", expectedRevision: created.persona.revision, expectedStateRevision: created.stateRevision });
      const selected = await checkedRequest<{ personas: { stateRevision: number; activePersonaId: string } }>("PUT", "/v1/me/persona-selection", 200,
        { personaId: edited.persona.personaId, expectedRevision: edited.persona.revision, expectedStateRevision: edited.stateRevision });
      requireProof(selected.personas.activePersonaId === edited.persona.personaId);
      const listed = await checkedRequest<{ personas: { items: { personaId: string }[] } }>("GET", "/v1/me/personas", 200);
      requireProof(listed.personas.items.length === 1 && listed.personas.items[0]?.personaId === edited.persona.personaId);
      const ticket = await checkedRequest<Ticket>("POST", "/v1/me/ai/operations", 201, { kind: "send", purpose: "checkin_conversation" });
      conversations.add(ticket.conversationId); operations.add(ticket.operationId);
      lastRetirement = new Promise<boolean>(resolve => { retirementWaiters.push({ resolve }); });
      const executed = await request("POST", `/v1/me/ai/operations/${ticket.operationId}/execute`, { text: routine }, { "ai-operation-key": ticket.operationKey });
      requireProof(executed.status === (expected === "accepted" ? 200 : 502));
      if (expected === "rejected") requireProof(record(executed.body) && record(executed.body.error) && executed.body.error.code === "AI_REPLY_REJECTED");
      requireProof(await bounded(lastRetirement)); await bounded(joined!.io.settled(owner, ticket.conversationId));
      requireProof(quiet() && modelAttempts === 1 && completeInputGatePassed);
      const outcome = await checkedRequest<Pair>("GET", `/v1/me/conversations/${ticket.conversationId}/operations/${ticket.operationId}`, 200);
      const history = await checkedRequest<{ messages: WireMessage[] }>("GET", `/v1/me/conversations/${ticket.conversationId}/messages`, 200);
      requireProof(outcome.state === (expected === "accepted" ? "assistant_saved" : "user_saved"));
      requireProof(history.messages.length === (expected === "accepted" ? 2 : 1));
      requireProof(outcome.userMessage.text === routine && outcome.userMessage.role === "user" && outcome.userMessage.sequence === 1);
      requireProof(JSON.stringify(history.messages[0]) === JSON.stringify(outcome.userMessage));
      const conversationPath = `${account}/conversations/${ticket.conversationId}`;
      const user = await db.doc(`${conversationPath}/messages/${outcome.userMessage.messageId}`).get();
      requireProof(user.exists && user.createTime && user.data()?.text === routine && user.data()?.sequence === 1 && user.data()?.role === "user");
      requireProof(outcome.userMessage.persistedAt === wireTime(user.createTime));
      const parent = await db.doc(conversationPath).get();
      if (expected === "accepted") {
        const assistant = outcome.assistantMessage; requireProof(assistant && assistant.role === "assistant" && assistant.sequence === 2 && assistant.availability === "available");
        requireProof(assistant.text === `你提到：${routine}` || assistant.text === `You mentioned: ${routine}`);
        requireProof(JSON.stringify(history.messages[1]) === JSON.stringify(assistant));
        requireProof(record(executed.body) && JSON.stringify(executed.body.userMessage) === JSON.stringify(outcome.userMessage) && JSON.stringify(executed.body.assistantMessage) === JSON.stringify(assistant));
        const a = await db.doc(`${conversationPath}/messages/${assistant.messageId}`).get();
        requireProof(a.createTime && assistant.persistedAt === wireTime(a.createTime));
        requireProof(parent.data()?.latestMessageId === a.id && user.data()?.acceptedAssistantMessageId === a.id);
        requireProof(a.data()?.appendBefore?.seconds === user.createTime.seconds + 90 * 86_400 && a.data()?.appendBefore?.nanoseconds === user.createTime.nanoseconds);
        requireProof(a.data()?.presentationMode === "persona" && a.data()?.presentationProjectionVersion === "persona_presentation_v1");
        for (const forbidden of ["personaId", "displayName", "tone", "responseLength", "formatStyle", "persona"]) requireProof(!Object.hasOwn(a.data()!, forbidden));
        const provenance = await db.doc(`${conversationPath}/message_sources/${a.id}`).get();
        requireProof(provenance.exists && JSON.stringify(provenance.data()?.sources) === "[]");
      } else {
        requireProof(!Object.hasOwn(outcome, "assistantMessage") && !Object.hasOwn(user.data()!, "acceptedAssistantMessageId"));
        requireProof(parent.data()?.latestMessageId === user.id && parent.data()?.nextSequence === 2);
        requireProof((await db.collection(`${conversationPath}/messages`).get()).size === 1 && (await db.collection(`${conversationPath}/message_sources`).get()).empty);
      }
      await checkedRequest("DELETE", `/v1/me/personas/${edited.persona.personaId}`, 204,
        { expectedRevision: edited.persona.revision, expectedStateRevision: selected.personas.stateRevision });
      const afterPersonaDelete = await checkedRequest<{ messages: WireMessage[] }>("GET", `/v1/me/conversations/${ticket.conversationId}/messages`, 200);
      requireProof(JSON.stringify(afterPersonaDelete.messages) === JSON.stringify(history.messages));
      const unchangedUser = await db.doc(user.ref.path).get(); requireProof(unchangedUser.createTime?.isEqual(user.createTime));
      await checkedRequest("DELETE", `/v1/me/conversations/${ticket.conversationId}`, 204);
      requireProof(!(await db.doc(conversationPath).get()).exists);
      for (const collection of ["messages", "message_sources", "effects"]) requireProof((await db.collection(`${conversationPath}/${collection}`).get()).empty);
      requireProof((await db.collection("ai_operation_fences").where("ownerAccountId", "==", owner).get()).empty);
      return { schemaVersion: 1, scope: "owned-empty-note-auth-persona-http-firestore", result: expected, modelAttempts: 1,
        completeInputGatePassed: true, personaCrudAndSelectionPassed: true, ordinaryOutcomeAndHistoryPassed: true,
        canonicalUserMetadataConfirmed: true, assistantAnchorConfirmed: expected === "accepted", rejectedHasNoAssistantOrProvenance: expected === "rejected",
        physicalConversationCleanupPassed: true };
    }
    return { server, baseUri, cleanup, verifyRoutineChat, closeTerminalLocalHandlesPreservingFixture,
      /** Explicit controlled-client disconnect only; never an HTTP Cancel or a
       * claim that the Backend's remote model stopped. No automatic invocation. */
      abortOriginalFixtureRequest: () => {
        if (!originalRequestAbort || originalRequestAbort.signal.aborted) return false;
        originalRequestAbort.abort(); return true;
      },
      runPositiveChat: () => verifyRoutineChat("accepted"),
      privateChannel: () => { requireProof(!closing && !closed && token && email && password); return { idToken: token, email, password, accountId: owner, uid }; },
      /** Only content-free observation for controlled teardown tests. */
      state: () => ({ modelAttempts, modelPending, nonTerminal: joined!.runtime.state.nonTerminal, quarantined: joined!.runtime.state.quarantined }),
      ownedContentCounts: async () => {
        const parents = await db.collection(`${account}/conversations`).get();
        let messages = 0, sources = 0;
        for (const parent of parents.docs) {
          messages += (await parent.ref.collection("messages").get()).size;
          sources += (await parent.ref.collection("message_sources").get()).size;
        }
        return { conversations: parents.size, messages, sources };
      },
    };
  } catch {
    try { await cleanup(); } catch { throw new Error("ZHOU_CONTROLLED_CHAT_CLEANUP_UNCONFIRMED"); }
    throw unavailable();
  }
}
