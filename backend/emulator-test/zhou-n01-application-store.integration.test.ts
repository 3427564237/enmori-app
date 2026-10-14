import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ApplicationConversationOperations } from "../src/ai-conversation/application/application-conversation-operations.js";
import { AsyncConversationOperationExecutor } from "../src/ai-conversation/application/async-conversation-operation-executor.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../src/ai-conversation/application/async-conversation-generation-transport.js";
import { AsyncFirestoreConversationStore } from "../src/ai-conversation/infrastructure/async-firestore-conversation-store.js";
import { FirebaseAdminAsyncConversationAuthority } from "../src/ai-conversation/infrastructure/firebase-admin-async-conversation-authority.js";
import { FirebaseAdminConversationOperationAuthority } from "../src/ai-conversation/infrastructure/firebase-admin-conversation-operation-authority.js";
import { FirebaseAdminRealContextReader } from "../src/ai-conversation/infrastructure/firebase-admin-real-context-reader.js";
import { FirestoreConversationStore } from "../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import type { AsyncEffectContext } from "../src/ai-conversation/ports/async-conversation.js";
import type { AsyncAcknowledgedConversationPair,
  ConversationOperationReaders, ExecutedConversation, RequestOriginalConversationIdentity } from "../src/ai-conversation/ports/application-conversation-operations.js";
import type { ConversationCaller, ConversationReadback, ConversationResult,
  PreparedConversationOperation } from "../src/ai-conversation/ports/conversation-operations.js";
import type { OpenOperation, OriginalWriteAuthority, RealConversationStore,
  RuntimeEpoch, StoreResult } from "../src/ai-conversation/ports/real-conversation-store.js";
import { BoundedAiRuntime } from "../src/ai-runtime/application/bounded-ai-runtime.js";
import { MonotonicRuntimeClock } from "../src/ai-runtime/infrastructure/monotonic-runtime-clock.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";

// Controlled, OWNED synthetic inventory only. This suite does not establish DU's
// operational Note guarantees, actual Qwen/tokenizer behavior, a production pair
// provider, the six HTTP routes, device display, cleanup SLA or Release readiness.
const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, "demo-enmori-rmvp01a-r10");
const firebase = initializeApp({ projectId: env.projectId }, `zhou-n01-${randomUUID()}`);
const firestore = getFirestore(firebase), auth = getAuth(firebase);
const verifier = new FirebaseIdentityVerifier(auth);
const owner = randomUUID(), uid = `zhou-n01-${randomUUID()}`;
const bindingPath = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
const accountPath = `accounts/${owner}`;
const clock = new MonotonicRuntimeClock();
const opened = new Map<string, OpenOperation>();
const closing = new Map<string, Promise<StoreResult<void>>>();
const prepared: PreparedConversationOperation[] = [];
const fixtureDocuments: string[] = [];
let store: FirestoreConversationStore, epoch: RuntimeEpoch, token = "", modelCalls = 0, runtimeOwned = false, authOwned = false;
const check = (value: boolean, message: string): void => assert.equal(value, true, message);
function confirmed<T>(result: StoreResult<T>): T {
  assert.equal(result.kind, "confirmed");
  if (result.kind !== "confirmed") throw new Error("Controlled store result was not confirmed");
  return result.value;
}
function successful<T>(result: ConversationResult<T>): T {
  assert.equal(result.kind, "success");
  if (result.kind !== "success") throw new Error("Controlled application result was not successful");
  return result.value;
}
function caller(rawToken: string): ConversationCaller {
  return { principal: { firebaseUid: uid }, tokenInstance: createHash("sha256").update(rawToken).digest("base64url"),
    verifyCurrentAuth: () => verifier.verifyIdToken(rawToken) };
}
const originalCaller = (): ConversationCaller => caller(token);
const parentPath = (conversationId: string): string => `${accountPath}/conversations/${conversationId}`;
const operationClock = { now: () => clock.now(), at: (at: number, wake: () => void) => clock.at(at, wake),
  utcMilliseconds: () => Date.now() };
const effectClock = { monotonicNow: () => clock.now(), utcNow: () => {
  const ms = Date.now(), seconds = Math.floor(ms / 1000);
  return { seconds, nanoseconds: (ms - seconds * 1000) * 1_000_000 };
} };

// This TEST-ONLY proxy records the actual public initializeOperation return.
// It never reads the bridge's private WeakMap or guesses a fence revision/epoch.
// It also exposes the actual closure promise so outcome is checked after the
// Application's own durable barrier, rather than a fixture-invented close.
function observedStore(): RealConversationStore {
  return new Proxy(store, { get(target, property, receiver) {
    if (property === "initializeOperation") return async (...args: Parameters<RealConversationStore["initializeOperation"]>) => {
      const result = await target.initializeOperation(...args);
      if (result.kind === "confirmed") opened.set(result.value.operationId, result.value);
      return result;
    };
    if (property === "closeOperation") return (...args: Parameters<RealConversationStore["closeOperation"]>) => {
      const result = target.closeOperation(...args); closing.set(args[0].operationId, result); return result;
    };
    const value: unknown = Reflect.get(target, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  } });
}
function live(context: AsyncEffectContext, original: RequestOriginalConversationIdentity): boolean {
  return original.current(context.identity) && context.originalCurrent() && !context.budget.signal.aborted &&
    clock.now() < context.budget.deadline;
}
function writeAuthority(context: AsyncEffectContext, original: RequestOriginalConversationIdentity): OriginalWriteAuthority | undefined {
  const dependencies = context.dependencies();
  if (!dependencies || !live(context, original)) return undefined;
  return { principal: context.identity.principal, dependencies, current: () => live(context, original),
    verifyCurrentAuth: async () => {
      const observed = await original.verify(context.identity);
      if (!live(context, original)) return { kind: "denied" };
      return observed.kind === "verified" ? observed :
        { kind: observed.kind === "dependency_unavailable" ? "unavailable" : "denied" };
    } };
}
function testOnlyPairProvider(original: RequestOriginalConversationIdentity): AsyncAcknowledgedConversationPair {
  return { read: async context => {
    const operation = opened.get(context.operation.operationId), authority = writeAuthority(context, original);
    if (!operation || !authority) return { kind: "failure", code: "AI_UNAVAILABLE" };
    const first = await store.readAcknowledgedPair(operation, authority);
    if (first.kind !== "confirmed" || !live(context, original)) return { kind: "failure", code: "AI_UNAVAILABLE" };
    // Presentation is read from the real accepted assistant record. Fresh Auth,
    // original/deadline checks before/after this SDK read, then another actual
    // canonical pair/source/expiry/all-pending check prevent a guessed projection.
    const verified = await authority.verifyCurrentAuth();
    if (verified.kind !== "verified" || !live(context, original)) return { kind: "failure", code: "AI_UNAVAILABLE" };
    const snapshot = await firestore.doc(`${parentPath(operation.conversationId)}/messages/${first.value.assistant.messageId}`).get();
    if (!live(context, original) || !snapshot.exists) return { kind: "failure", code: "AI_UNAVAILABLE" };
    const record = snapshot.data();
    if (!record || record.presentationMode !== "default" || record.presentationProjectionVersion !== undefined ||
        record.replyToUserMessageId !== operation.userMessageId || record.text !== first.value.assistant.text ||
        snapshot.createTime?.seconds !== first.value.assistant.persistedAt.seconds ||
        snapshot.createTime?.nanoseconds !== first.value.assistant.persistedAt.nanoseconds)
      return { kind: "failure", code: "AI_UNAVAILABLE" };
    const current = await store.readAcknowledgedPair(operation, authority);
    if (current.kind !== "confirmed" || !live(context, original) ||
        current.value.assistant.messageId !== first.value.assistant.messageId ||
        current.value.user.persistedAt.seconds !== first.value.user.persistedAt.seconds ||
        current.value.user.persistedAt.nanoseconds !== first.value.user.persistedAt.nanoseconds)
      return { kind: "failure", code: "AI_UNAVAILABLE" };
    return { kind: "success", value: { ...current.value, presentation: { presentationMode: record.presentationMode } } };
  } };
}

const ordinaryReaders: ConversationOperationReaders = { readOutcome: async (context, conversationId, operationId, descriptor) => {
  // Content-free original public descriptors in this owned fixture permit a
  // normal fresh owner read after the consumer has scrubbed its completed ticket.
  const target = descriptor && { ...descriptor, ownerAccountId: context.ownerId } || opened.get(operationId);
  if (!target || target.conversationId !== conversationId || target.ownerAccountId !== context.ownerId || !context.current())
    return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
  const observed = await store.readOutcome(context.principal, target);
  if (!context.current() || observed.kind !== "confirmed") return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
  const value: ConversationReadback = observed.value.state === "unresolved" ? { operationId, state: "unresolved" } :
    observed.value.state === "user_saved" ? { operationId, state: "user_saved", userMessage: observed.value.user } :
      { operationId, state: "assistant_saved", userMessage: observed.value.user, assistantMessage: observed.value.assistant };
  return { kind: "success", value };
} };
function composition(includePair = true): { operations: ApplicationConversationOperations; runtime: BoundedAiRuntime<Parameters<AuthorizedAsyncConversationGenerationTransport["generate"]>[0]> } {
  const model = new AuthorizedAsyncConversationGenerationTransport({ generate: async input => {
    modelCalls++; check(input.checkIns.length === 0, "Owned empty-source projection must stay empty");
    return Buffer.from(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Controlled synthetic Qwen reply" }));
  } });
  const runtime = new BoundedAiRuntime(clock, model);
  const executor = new AsyncConversationOperationExecutor({ runtime, clock: effectClock,
    // Synthetic policy gates are explicitly NOT actual tokenizer/model evidence.
    gates: { beforeGeneration: async () => ({ ok: true, value: undefined }), candidate: async () => ({ ok: true, value: undefined }) },
    ports: (original: RequestOriginalConversationIdentity) => {
      const authority = new FirebaseAdminAsyncConversationAuthority(firestore, original, process.env);
      const reads = new FirebaseAdminRealContextReader(firestore, { controlledEnvironment: process.env,
        monotonicNow: () => clock.now(), originalAuthority: { verify: original.verifyRead },
        notePrerequisites: { firestore, sourceReferences: ["backend/emulator-test/zhou-n01-application-store.integration.test.ts#owned-empty-inventory"],
          completeCanonicalUtcInventory: true, immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true } });
      return { authority, reads, store: new AsyncFirestoreConversationStore(observedStore(), epoch, authority),
        ...(includePair ? { acknowledgedPair: testOnlyPairProvider(original) } : {}) };
    } });
  return { operations: new ApplicationConversationOperations(new FirebaseAdminConversationOperationAuthority(firestore, process.env, () => clock.now()),
    { uuid: randomUUID, operationKey: () => randomBytes(32).toString("base64url") }, operationClock, executor, ordinaryReaders), runtime };
}
async function prepare(operations: ApplicationConversationOperations): Promise<PreparedConversationOperation> {
  const value = successful(await operations.prepare(originalCaller(), { kind: "send", purpose: "checkin_conversation" }));
  prepared.push(value); return value;
}
async function noEffects(value: PreparedConversationOperation): Promise<void> {
  check(!(await firestore.doc(parentPath(value.conversationId)).get()).exists, "Unavailable/cancelled preparation must not create parent");
  for (const child of ["messages", "message_sources", "effects"])
    check((await firestore.collection(`${parentPath(value.conversationId)}/${child}`).get()).empty, "Unavailable/cancelled preparation must not create child effects");
  check(!(await firestore.doc(`ai_operation_fences/${value.operationId}`).get()).exists, "Unavailable/cancelled preparation must not create fence");
}
before(async () => {
  check(!(await firestore.doc("ai_runtime_fence/current").get()).exists, "Exclusive controlled fixture needs absent runtime fence");
  const password = `Synthetic_${randomUUID()}`, email = `${uid}@example.invalid`;
  await auth.createUser({ uid, email, password }); authOwned = true;
  const signed = await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(signed.status, 200); token = (await signed.json() as { idToken: string }).idToken;
  check(token.length > 0, "Actual Auth emulator must return a token");
  await firestore.doc(bindingPath).create({ accountId: owner }); fixtureDocuments.push(bindingPath);
  await firestore.doc(accountPath).create({ username: "zhou_n01_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
    onboardingCompletedAt: "2026-10-14T00:00:00.000Z", purposeRevocationGeneration: 0 }); fixtureDocuments.push(accountPath);
  await firestore.doc(`${accountPath}/persona_state/current`).create({ stateRevision: 0, livePersonaIds: [] }); fixtureDocuments.push(`${accountPath}/persona_state/current`);
  store = new FirestoreConversationStore(new FirebaseAdminFirestoreGateway(firestore), process.env);
  epoch = confirmed(await store.startEpoch(randomUUID())); runtimeOwned = true;
});
after(async () => {
  try {
    await Promise.all(closing.values());
    for (const id of new Set(prepared.map(value => value.conversationId))) {
      const path = parentPath(id);
      for (const child of ["messages", "message_sources", "effects"]) {
        for (const row of (await firestore.collection(`${path}/${child}`).get()).docs) await row.ref.delete();
        check((await firestore.collection(`${path}/${child}`).get()).empty, "Owned child collection must be removed");
      }
      await firestore.doc(path).delete(); check(!(await firestore.doc(path).get()).exists, "Owned parent must be removed");
    }
    for (const value of prepared) {
      const path = `ai_operation_fences/${value.operationId}`; await firestore.doc(path).delete();
      check(!(await firestore.doc(path).get()).exists, "Owned operation fence must be removed");
    }
    for (const path of fixtureDocuments.reverse()) {
      await firestore.doc(path).delete(); check(!(await firestore.doc(path).get()).exists, "Owned fixture metadata must be removed");
    }
    if (runtimeOwned) {
      const runtime = await firestore.doc("ai_runtime_fence/current").get();
      check(runtime.data()?.processEpoch === epoch.processEpoch && runtime.data()?.generation === epoch.generation,
        "Teardown must remove only this owned runtime epoch");
      await runtime.ref.delete(); check(!(await runtime.ref.get()).exists, "Owned runtime epoch must be removed");
    }
  } finally {
    try {
      if (authOwned) { await auth.deleteUser(uid); await assert.rejects(auth.getUser(uid)); }
    } finally {
      token = ""; opened.clear(); closing.clear(); prepared.length = 0; fixtureDocuments.length = 0;
      try { await firestore.terminate(); } finally { await deleteApp(firebase); }
    }
  }
});

test("actual N01 consumer and executor Send accept one complete pair, consume once and allow fresh owner read", async () => {
  const { operations, runtime } = composition(), value = await prepare(operations), controller = new AbortController();
  let sinkCalls = 0, accepted: ExecutedConversation | undefined;
  const delivery = { signal: controller.signal, current: () => !controller.signal.aborted,
    acceptCompleteBody: (body: ExecutedConversation): boolean => { sinkCalls++; accepted = body; return true; } };
  const input = { operationId: value.operationId, operationKey: value.operationKey, text: "Controlled synthetic N01 input" };
  const pair = successful(await operations.execute(originalCaller(), input, delivery));
  assert.equal(sinkCalls, 1); assert.equal(modelCalls, 1);
  check(accepted === pair, "Returned complete pair must be the synchronously accepted sink body");
  const barrier = closing.get(value.operationId); check(barrier !== undefined, "Actual original close must be invoked");
  confirmed(await barrier!);
  const operation = opened.get(value.operationId); check(operation !== undefined, "Actual open descriptor must be captured publicly");
  const user = await firestore.doc(`${parentPath(value.conversationId)}/messages/${pair.userMessage.messageId}`).get();
  const assistant = await firestore.doc(`${parentPath(value.conversationId)}/messages/${pair.assistantMessage.messageId}`).get();
  check(user.createTime!.seconds === pair.userMessage.persistedAt.seconds && user.createTime!.nanoseconds === pair.userMessage.persistedAt.nanoseconds,
    "User metadata must preserve actual full-precision SDK create time");
  check(assistant.createTime!.seconds === pair.assistantMessage.persistedAt.seconds && assistant.createTime!.nanoseconds === pair.assistantMessage.persistedAt.nanoseconds,
    "Assistant metadata must preserve actual full-precision SDK create time");
  check(user.data()!.pendingOperationId === undefined && user.data()!.acceptedAssistantMessageId === pair.assistantMessage.messageId,
    "Actual claim must settle onto the canonical accepted assistant");
  const duplicate = await operations.execute(originalCaller(), input, delivery);
  check(duplicate.kind === "failure" && ["AI_OPERATION_CONFLICT", "AI_OPERATION_UNAVAILABLE"].includes(duplicate.code), "Consumed operation must refuse replay");
  assert.equal(sinkCalls, 1); assert.equal(modelCalls, 1);
  check((await firestore.collection(`${parentPath(value.conversationId)}/messages`).get()).size === 2, "Duplicate execute must create no additional message");
  // Actual Auth custom-token sign-in establishes a new verified token instance;
  // normal owner reads do not require the old control token/key.
  const customToken = await auth.createCustomToken(uid);
  const signed = await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=controlled-emulator-key`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
  assert.equal(signed.status, 200);
  const freshToken = (await signed.json() as { idToken: string }).idToken;
  check(caller(freshToken).tokenInstance !== originalCaller().tokenInstance, "Fresh owner read must use another actual token instance");
  const readback = successful(await operations.readOutcome(caller(freshToken), value.conversationId, value.operationId));
  assert.equal(readback.state, "assistant_saved");
  if (readback.state !== "assistant_saved") return;
  check(readback.userMessage.messageId === pair.userMessage.messageId && readback.assistantMessage.messageId === pair.assistantMessage.messageId,
    "Fresh owner read must return the actual canonical pair");
  check((await firestore.doc(user.ref.path).get()).createTime!.isEqual(user.createTime!), "Ordinary read must preserve immutable user metadata");
  assert.equal(runtime.state.nonTerminal, 0); assert.equal(runtime.state.quarantined, false); accepted = undefined;
});

test("missing actual complete-body or canonical-pair capabilities cause zero effects and zero model calls", async () => {
  const beforeCalls = modelCalls, normal = composition(), missingPair = composition(false);
  const value = await prepare(normal.operations), controller = new AbortController();
  const refused = await normal.operations.execute(originalCaller(), { operationId: value.operationId, operationKey: value.operationKey, text: "Synthetic unavailable input" },
    { signal: controller.signal, current: () => true });
  check(refused.kind === "failure" && refused.code === "AI_UNAVAILABLE", "Absent F02 capability must fail unavailable");
  await noEffects(value);
  successful(await normal.operations.cancel(originalCaller(), { operationId: value.operationId, operationKey: value.operationKey }));
  const noPair = await prepare(missingPair.operations);
  const refusedPair = await missingPair.operations.execute(originalCaller(), { operationId: noPair.operationId, operationKey: noPair.operationKey, text: "Synthetic unavailable input" },
    { signal: controller.signal, current: () => true, acceptCompleteBody: () => { throw new Error("Unavailable pair must never reach sink"); } });
  check(refusedPair.kind === "failure" && refusedPair.code === "AI_UNAVAILABLE", "Absent canonical-pair capability must fail unavailable");
  await noEffects(noPair); assert.equal(modelCalls, beforeCalls);
  assert.equal(normal.runtime.state.nonTerminal, 0); assert.equal(missingPair.runtime.state.nonTerminal, 0);
});

test("prepared trusted Cancel terminates without context capture, durable effects or generation", async () => {
  const beforeCalls = modelCalls, { operations, runtime } = composition(), value = await prepare(operations);
  const result = successful(await operations.cancel(originalCaller(), { operationId: value.operationId, operationKey: value.operationKey }));
  assert.equal(result.state, "terminal"); await noEffects(value); assert.equal(modelCalls, beforeCalls);
  const controller = new AbortController();
  const execute = await operations.execute(originalCaller(), { operationId: value.operationId, operationKey: value.operationKey, text: "Synthetic cancelled input" },
    { signal: controller.signal, current: () => true, acceptCompleteBody: () => { throw new Error("Cancelled preparation must never reach sink"); } });
  check(execute.kind === "failure" && execute.code === "AI_OPERATION_UNAVAILABLE", "Cancelled preparation must refuse execution");
  assert.equal(runtime.state.nonTerminal, 0);
});
