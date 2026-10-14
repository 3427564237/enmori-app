import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
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
import { FirestoreConversationCleanup } from "../src/ai-conversation/infrastructure/firestore-conversation-cleanup.js";
import type {
  ConversationOperationReaders, ExecutedConversation, RequestOriginalConversationIdentity } from "../src/ai-conversation/ports/application-conversation-operations.js";
import type { ConversationQuiescence } from "../src/ai-conversation/ports/conversation-cleanup.js";
import type { ConversationCaller, ConversationOperations, ConversationReadback, ConversationResult,
  PreparedConversationOperation } from "../src/ai-conversation/ports/conversation-operations.js";
import type { OpenOperation, RealConversationStore,
  RuntimeEpoch, StoreResult } from "../src/ai-conversation/ports/real-conversation-store.js";
import { BoundedAiRuntime } from "../src/ai-runtime/application/bounded-ai-runtime.js";
import { MonotonicRuntimeClock } from "../src/ai-runtime/infrastructure/monotonic-runtime-clock.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err } from "../src/shared/domain/result.js";

// Controlled, OWNED synthetic inventory only. This suite does not establish DU's
// operational Note guarantees, actual Qwen/tokenizer behavior, full production
// history/delete providers, device display, cleanup SLA or Release readiness.
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
const issuedStoreIo = new Set<Promise<unknown>>();
const prepared: Pick<PreparedConversationOperation, "operationId" | "conversationId">[] = [];
const fixtureDocuments: string[] = [];
let store: FirestoreConversationStore, epoch: RuntimeEpoch, token = "", modelCalls = 0, activeModels = 0, runtimeOwned = false, authOwned = false;
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
  const track = <T>(promise: Promise<T>): Promise<T> => {
    issuedStoreIo.add(promise); void promise.then(() => issuedStoreIo.delete(promise), () => issuedStoreIo.delete(promise));
    return promise;
  };
  return new Proxy(store, { get(target, property, receiver) {
    if (property === "initializeOperation") return async (...args: Parameters<RealConversationStore["initializeOperation"]>) => {
      const result = await track(target.initializeOperation(...args));
      if (result.kind === "confirmed") opened.set(result.value.operationId, result.value);
      return result;
    };
    if (property === "closeOperation") return (...args: Parameters<RealConversationStore["closeOperation"]>) => {
      const result = track(target.closeOperation(...args)); closing.set(args[0].operationId, result); return result;
    };
    const value: unknown = Reflect.get(target, property, receiver);
    return typeof value === "function" ? (...args: unknown[]) => track(value.apply(target, args) as Promise<unknown>) : value;
  } });
}
const ordinaryReaders: ConversationOperationReaders = { readOutcome: async (context, conversationId, operationId, descriptor) => {
  // Content-free original public descriptors in this owned fixture permit a
  // normal fresh owner read after the consumer has scrubbed its completed ticket.
  const target = descriptor && { ...descriptor, ownerAccountId: context.ownerId } || opened.get(operationId);
  if (!target || target.conversationId !== conversationId || target.ownerAccountId !== context.ownerId || !context.current())
    return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
  const barrier = closing.get(operationId); if (barrier) await barrier;
  if (!context.current()) return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
  const observed = await observedStore().readOutcome(context.principal, target);
  if (!context.current() || observed.kind !== "confirmed") return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
  const value: ConversationReadback = observed.value.state === "unresolved" ? { operationId, state: "unresolved" } :
    observed.value.state === "user_saved" ? { operationId, state: "user_saved", userMessage: observed.value.user } :
      { operationId, state: "assistant_saved", userMessage: observed.value.user, assistantMessage: observed.value.assistant };
  return { kind: "success", value };
} };
function composition(includePair = true, additionalReaders: ConversationOperationReaders = {}): { operations: ApplicationConversationOperations; runtime: BoundedAiRuntime<Parameters<AuthorizedAsyncConversationGenerationTransport["generate"]>[0]> } {
  const model = new AuthorizedAsyncConversationGenerationTransport({ generate: async input => {
    modelCalls++; activeModels++;
    try {
      check(input.checkIns.length === 0, "Owned empty-source projection must stay empty");
      return Buffer.from(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Controlled synthetic Qwen reply" }));
    } finally { activeModels--; }
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
      const bridge = new AsyncFirestoreConversationStore(observedStore(), epoch, authority);
      return { authority, reads, store: bridge, ...(includePair ? { acknowledgedPair: bridge } : {}) };
    } });
  return { operations: new ApplicationConversationOperations(new FirebaseAdminConversationOperationAuthority(firestore, process.env, () => clock.now()),
    { uuid: randomUUID, operationKey: () => randomBytes(32).toString("base64url") }, operationClock, executor, { ...ordinaryReaders, ...additionalReaders }), runtime };
}
async function prepare(operations: ApplicationConversationOperations): Promise<PreparedConversationOperation> {
  const value = successful(await operations.prepare(originalCaller(), { kind: "send", purpose: "checkin_conversation" }));
  prepared.push({ operationId: value.operationId, conversationId: value.conversationId }); return value;
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

async function dartProbe(baseUri: string): Promise<{ readonly code: number | null; readonly output: unknown; readonly stderrEmpty: boolean }> {
  // Existing cached locked SDK only; token bytes are confined to the child pipe.
  // Never put them in argv/environment/files and never forward raw child output.
  // JIN integration-only portability: operator PATH supplies its already pinned
  // SDK. Verify BEFORE sending a token; no install, download or alternate version.
  const executable=process.platform==="win32"?"dart.exe":"dart";
  const version=spawnSync(executable,["--version"],{encoding:"utf8",windowsHide:true,timeout:10000,maxBuffer:4096});
  check(version.status===0&&!version.error&&/^Dart SDK version: 3\.13\.2(?:\s|$)/.test(`${version.stdout}${version.stderr}`.trim()),
    "Existing pinned Dart3.13.2 must be supplied on the controlled runtime PATH");
  const child = spawn(executable,
    ["run", "tool/ai_wire_controlled_probe.dart", "--isolated-loopback", `--base-uri=${baseUri}`, "--fixture-source=actual-N01-Auth-store-probe"],
    { cwd: process.cwd(), env: process.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "", stderrBytes = 0;
  child.stdout.setEncoding("utf8"); child.stdout.on("data", (value: string) => {
    stdout += value; if (stdout.length > 32_768) child.kill();
  });
  child.stderr.on("data", (value: Buffer) => { stderrBytes += value.length; });
  const timer = setTimeout(() => child.kill(), 120_000);
  try {
    const result = new Promise<number | null>((resolve, reject) => {
      child.once("error", () => reject(new Error("Controlled cached Dart child could not start")));
      child.once("close", code => resolve(code));
      child.stdin.once("error", () => { /* Child completion reports a sanitized failure. */ });
    });
    child.stdin.end(`${token}\n`);
    const code = await result;
    let output: unknown;
    try { output = JSON.parse(stdout.trim()); }
    catch { throw new Error("Controlled Dart probe emitted invalid non-content JSON"); }
    return { code, output, stderrEmpty: stderrBytes === 0 };
  } finally { clearTimeout(timer); child.stdin.destroy(); }
}
async function listenerClosed(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const done = (closed: boolean): void => { socket.destroy(); resolve(closed); };
    socket.once("connect", () => done(false)); socket.once("error", () => done(true)); socket.setTimeout(1000, () => done(false));
  });
}

test("actual Dart HTTP client traverses N01 Auth, consumer, executor, SDK storage, canonical history and complete deletion", async () => {
  const beforeCalls = modelCalls, observedRequests: string[] = [];
  let consumer: ApplicationConversationOperations;
  let runtime: ReturnType<typeof composition>["runtime"];
  let storedMetadataChecked = false, cleanupChecked = false;
  // Explicit TEST-ONLY ordinary suppliers for the one known owned canonical
  // pair. This is not a production history paginator or arbitrary-target lookup.
  const readers: ConversationOperationReaders = {
    listMessages: async (context, conversationId, beforeSequence) => {
      if (beforeSequence !== undefined || context.ownerId !== owner || !context.current()) return { kind: "failure", code: "AI_UNAVAILABLE" };
      const target = [...opened.values()].find(value => value.conversationId === conversationId && value.ownerAccountId === context.ownerId);
      if (!target) return { kind: "failure", code: "CONVERSATION_UNAVAILABLE" };
      const barrier = closing.get(target.operationId); if (!barrier) return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
      confirmed(await barrier);
      const result = await observedStore().readOutcome(context.principal, target);
      if (!context.current() || result.kind !== "confirmed" || result.value.state !== "assistant_saved") return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
      return { kind: "success", value: { messages: [result.value.user, result.value.assistant] } };
    },
    deleteConversation: async (context, conversationId) => {
      if (context.ownerId !== owner || !context.current()) return { kind: "failure", code: "AI_UNAVAILABLE" };
      const target = [...opened.values()].find(value => value.conversationId === conversationId && value.ownerAccountId === context.ownerId);
      if (!target) return { kind: "failure", code: "CONVERSATION_UNAVAILABLE" };
      const barrier = closing.get(target.operationId); if (!barrier) return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
      confirmed(await barrier);
      const result = await observedStore().readOutcome(context.principal, target);
      if (!context.current() || result.kind !== "confirmed" || result.value.state !== "assistant_saved") return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
      // Check actual authoritative U/A metadata BEFORE physical deletion. The
      // CLI checks matching wire projections; the store keeps full nanoseconds.
      const user = await firestore.doc(`${parentPath(conversationId)}/messages/${result.value.user.messageId}`).get();
      const assistant = await firestore.doc(`${parentPath(conversationId)}/messages/${result.value.assistant.messageId}`).get();
      storedMetadataChecked = context.current() && user.exists && assistant.exists &&
        user.createTime!.seconds === result.value.user.persistedAt.seconds && user.createTime!.nanoseconds === result.value.user.persistedAt.nanoseconds &&
        assistant.createTime!.seconds === result.value.assistant.persistedAt.seconds && assistant.createTime!.nanoseconds === result.value.assistant.persistedAt.nanoseconds &&
        user.data()!.pendingOperationId === undefined && user.data()!.acceptedAssistantMessageId === result.value.assistant.messageId;
      check(storedMetadataChecked, "HTTP journey must preserve settled full-precision canonical metadata");
      // Actual upper admission lease + ALL issued RealStore promises. This is a
      // narrow owned-fixture coordinator, not proof of JIN's general production
      // I/O coordinator, restart handling or all targets' cleanup guarantees.
      const quiescence: ConversationQuiescence = { withTargetClosed: async <T>(requestedOwner: string, requestedConversation: string, work: () => Promise<T>) => {
        if (requestedOwner !== owner || requestedConversation !== conversationId) return { kind: "unresolved" };
        const acquired = await consumer.acquireTargetLease(requestedOwner, requestedConversation, "closed");
        if (acquired.kind !== "acquired") return { kind: "unresolved" };
        try {
          await Promise.all([...issuedStoreIo]);
          if (!acquired.lease.current() || issuedStoreIo.size !== 0 || activeModels !== 0 || runtime.state.nonTerminal !== 0 ||
              runtime.state.admission !== "open" || runtime.state.quarantined) return { kind: "unresolved" };
          const originalClose = closing.get(target.operationId);
          if (!originalClose || (await originalClose).kind !== "confirmed" || !acquired.lease.current()) return { kind: "unresolved" };
          return { kind: "settled", value: await work() };
        } finally { acquired.lease.release(); }
      } };
      const cleanup = new FirestoreConversationCleanup(new FirebaseAdminFirestoreGateway(firestore), process.env, quiescence);
      const deleted = await cleanup.deleteOwned(context.principal, owner, conversationId, epoch);
      if (deleted.kind !== "deleted" || !context.current()) return { kind: "failure", code: "AI_OUTCOME_UNRESOLVED" };
      check(!(await firestore.doc(parentPath(conversationId)).get()).exists, "HTTP deletion must remove owned parent before returning success");
      for (const child of ["messages", "message_sources", "effects"])
        check((await firestore.collection(`${parentPath(conversationId)}/${child}`).get()).empty, "HTTP deletion must remove every owned child collection");
      check(!(await firestore.doc(`ai_operation_fences/${target.operationId}`).get()).exists, "HTTP deletion must remove the settled owned operation fence");
      cleanupChecked = true; return { kind: "success", value: undefined };
    },
  };
  ({ operations: consumer, runtime } = composition(true, readers));
  // Preserve actual transport and consumer paths; this wrapper observes only
  // fixed operation labels and records content-free own teardown identifiers.
  const operations: ConversationOperations = {
    prepare: async (request, input) => {
      observedRequests.push("prepare"); const result = await consumer.prepare(request, input);
      if (result.kind === "success") prepared.push({ operationId: result.value.operationId, conversationId: result.value.conversationId });
      return result;
    },
    execute: (request, input, delivery) => { observedRequests.push("execute"); return consumer.execute(request, input, delivery); },
    cancel: (request, input) => { observedRequests.push("cancel"); return consumer.cancel(request, input); },
    readOutcome: (request, conversationId, operationId) => { observedRequests.push("readOutcome"); return consumer.readOutcome(request, conversationId, operationId); },
    listMessages: (request, conversationId, beforeSequence) => { observedRequests.push("readMessages"); return consumer.listMessages(request, conversationId, beforeSequence); },
    deleteConversation: (request, conversationId) => { observedRequests.push("deleteConversation"); return consumer.deleteConversation(request, conversationId); },
  };
  const unused = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
  const app = await buildApp({ identityVerifier: verifier, completeOnboarding: unused, getOnboarding: unused,
    createCheckIn: unused, getCheckIn: unused, getInterestTags: unused, getOwnInterests: unused, replaceOwnInterests: unused,
    isolatedSlices: { environment: process.env, conversations: operations } });
  let port = 0;
  try {
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const base = new URL(address); check(base.hostname === "127.0.0.1", "Controlled HTTP listener must use numeric loopback"); port = Number(base.port);
    const result = await dartProbe(address);
    assert.equal(result.code, 0); check(result.stderrEmpty, "Controlled Dart probe must emit no stderr");
    const output = result.output as Record<string, unknown>;
    check(!!output && typeof output === "object" && !Array.isArray(output) && Object.keys(output).length === 5,
      "Dart probe must emit only its fixed non-content observation schema");
    check(output.fixtureSource === "actual-N01-Auth-store-probe" && output.result === "pass" && output.operatorFixtureCleanupRequired === false,
      "Dart probe must confirm successful explicit own fixture cleanup");
    const expected = ["prepare", "execute", "readOutcome", "readMessages", "deleteConversation"];
    check(Array.isArray(output.steps) && output.steps.length === expected.length &&
      output.steps.every((step, index) => step === `${expected[index]}:pass`), "Dart probe must pass the complete five-operation journey");
    check(observedRequests.length === expected.length && observedRequests.every((step, index) => step === expected[index]),
      "Actual HTTP server must traverse each selected journey operation exactly once");
    check(storedMetadataChecked && cleanupChecked, "Backend must independently verify actual SDK metadata and complete own deletion");
    assert.equal(modelCalls - beforeCalls, 1); assert.equal(activeModels, 0); assert.equal(issuedStoreIo.size, 0); assert.equal(runtime.state.nonTerminal, 0);
  } finally { await app.close(); }
  check(port > 0 && await listenerClosed(port), "Owned actual HTTP listener must close after journey");
});
