import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { FirestoreGateway, FirestoreTransactionGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirestoreConversationStore } from "../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import type { StoreResult, OperationTarget, OpenOperation, OriginalWriteAuthority, RuntimeEpoch } from "../src/ai-conversation/ports/real-conversation-store.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import type { ConversationOperations } from "../src/ai-conversation/ports/conversation-operations.js";

const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, "demo-enmori-rmvp01a-r10");
const firebase = initializeApp({ projectId: env.projectId }, `ai-store-${randomUUID()}`);
const firestore = getFirestore(firebase), auth = getAuth(firebase);
const gateway = new FirebaseAdminFirestoreGateway(firestore);
const owner = randomUUID(), uid = `ai-store-${randomUUID()}`, peer = `ai-store-peer-${randomUUID()}`;
const binding = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
const accountPath = `accounts/${owner}`;
const targets: OperationTarget[] = [];
let token = "", epoch: RuntimeEpoch, store: FirestoreConversationStore;
let freshChecks = 0;
const verifier = new FirebaseIdentityVerifier(auth);
const account = { username: "ai_store_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
  onboardingCompletedAt: "2026-10-14T00:00:00.000Z", purposeRevocationGeneration: 0 };
function confirmed<T>(r: StoreResult<T>): T { assert.equal(r.kind, "confirmed"); if (r.kind !== "confirmed") throw new Error("Expected confirmed result"); return r.value; }
function authority(): OriginalWriteAuthority {
  return { principal: { firebaseUid: uid }, dependencies: { ownerId: owner, purpose: "checkin_conversation",
    purposeRevocationGeneration: 0, usedPersonaId: undefined, sources: [] }, current: () => true,
    verifyCurrentAuth: async () => { freshChecks++; const r = await verifier.verifyIdToken(token);
      return r.kind === "verified" ? r : { kind: r.kind === "dependency_unavailable" ? "unavailable" : "denied" }; } };
}
function target(): OperationTarget {
  const t: OperationTarget = { ownerAccountId: owner, conversationId: randomUUID(), userMessageId: randomUUID(), operationId: randomUUID(), kind: "send", targetKind: "reserved_new" };
  targets.push(t); return t;
}
function retry(original: OperationTarget): OperationTarget {
  const t: OperationTarget = { ...original, operationId: randomUUID(), kind: "retry", targetKind: "existing" };
  targets.push(t); return t;
}
const parent = (t: OperationTarget): string => `accounts/${owner}/conversations/${t.conversationId}`;
const user = (t: OperationTarget): string => `${parent(t)}/messages/${t.userMessageId}`;
async function saved(t = target()): Promise<OpenOperation> {
  const op = confirmed(await store.initializeOperation(t, epoch, authority()));
  confirmed(await store.saveUser(op, () => "Synthetic user message", authority())); return op;
}
async function assistant(op: OpenOperation): Promise<string> {
  const id = randomUUID();
  confirmed(await store.saveAssistant(op, () => ({ messageId: id, text: "Synthetic accepted reply", presentation: { presentationMode: "default" } }), authority()));
  return id;
}
before(async () => {
  assert.equal((await firestore.doc("ai_runtime_fence/current").get()).exists, false);
  const password = `Synthetic_${randomUUID()}`;
  await auth.createUser({ uid, email: `${uid}@example.invalid`, password });
  const signed = await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `${uid}@example.invalid`, password, returnSecureToken: true }) });
  assert.equal(signed.status, 200); token = (await signed.json() as { idToken: string }).idToken;
  await firestore.doc(binding).create({ accountId: owner }); await firestore.doc(accountPath).create(account);
  store = new FirestoreConversationStore(gateway, process.env);
  epoch = confirmed(await store.startEpoch(randomUUID()));
});
after(async () => {
  try {
    for (const id of new Set(targets.map(t => t.conversationId))) {
      const path = `accounts/${owner}/conversations/${id}`;
      for (const child of ["messages", "message_sources", "effects"]) {
        for (const row of (await firestore.collection(`${path}/${child}`).get()).docs) await row.ref.delete();
        assert.equal((await firestore.collection(`${path}/${child}`).get()).empty, true);
      }
      await firestore.doc(path).delete(); assert.equal((await firestore.doc(path).get()).exists, false);
    }
    for (const t of targets) { await firestore.doc(`ai_operation_fences/${t.operationId}`).delete();
      assert.equal((await firestore.doc(`ai_operation_fences/${t.operationId}`).get()).exists, false); }
    for (const path of [binding, accountPath, "ai_runtime_fence/current"]) {
      await firestore.doc(path).delete(); assert.equal((await firestore.doc(path).get()).exists, false);
    }
    await auth.deleteUser(uid); await assert.rejects(auth.getUser(uid)); token = "";
  } finally { await firestore.terminate(); await deleteApp(firebase); }
});

test("actual Auth -> first user -> assistant -> definite ACK -> ordinary readback preserves immutable records", async () => {
  const beforeChecks = freshChecks, op = await saved();
  const original = await firestore.doc(user(op)).get();
  assert.equal((await store.readOutcome({ firebaseUid: uid }, op)).kind, "confirmed");
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, op)).state, "unresolved");
  const id = await assistant(op);
  assert.equal((await firestore.doc(user(op)).get()).data()!.pendingOperationId, op.operationId);
  confirmed(await store.settleAcknowledgedAssistant(op, authority()));
  const acknowledged = confirmed(await store.readAcknowledgedPair(op, authority()));
  assert.equal(acknowledged.assistant.messageId, id);
  confirmed(await store.closeOperation(op, epoch));
  const result = confirmed(await store.readOutcome({ firebaseUid: uid }, op));
  assert.equal(result.state, "assistant_saved");
  if (result.state !== "assistant_saved") return;
  assert.equal(result.user.sequence, 1); assert.equal(result.assistant.sequence, 2); assert.equal(result.assistant.messageId, id);
  assert.deepEqual(result.user.persistedAt, { seconds: original.createTime!.seconds, nanoseconds: original.createTime!.nanoseconds });
  assert.deepEqual((await firestore.doc(`${parent(op)}/message_sources/${id}`).get()).data(), { sources: [] });
  assert.equal((await firestore.doc(user(op)).get()).createTime!.isEqual(original.createTime!), true);
  assert.equal(freshChecks - beforeChecks, 4);
});
test("all-pending A -> B -> C: old A cannot clear B; accepted pair is visible through both effects", async () => {
  const a = await saved(); confirmed(await store.closeOperation(a, epoch));
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, a)).state, "user_saved");
  const b = confirmed(await store.initializeOperation(retry(a), epoch, authority()));
  confirmed(await store.claimRetry(b, () => "Synthetic user message", authority()));
  const before = await firestore.doc(user(a)).get();
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, a)).state, "unresolved");
  const c = confirmed(await store.initializeOperation(retry(a), epoch, authority()));
  assert.equal((await store.claimRetry(c, () => "Synthetic user message", authority())).kind, "conflict");
  const id = await assistant(b);
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, a)).state, "unresolved");
  confirmed(await store.closeOperation(b, epoch));
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, b)).state, "assistant_saved");
  const fromA = confirmed(await store.readOutcome({ firebaseUid: uid }, a));
  assert.equal(fromA.state, "assistant_saved"); if (fromA.state === "assistant_saved") assert.equal(fromA.assistant.messageId, id);
  assert.equal((await firestore.doc(user(a)).get()).createTime!.isEqual(before.createTime!), true);
  assert.equal((await store.claimRetry(c, () => "Synthetic user message", authority())).kind, "conflict");
});
test("cancel before initialization leaves closed placeholder and late initialization never opens it", async () => {
  const t = target(); confirmed(await store.closeOperation(t, epoch));
  assert.equal((await store.initializeOperation(t, epoch, authority())).kind, "conflict");
  assert.equal((await firestore.doc(parent(t)).get()).exists, false);
  assert.equal((await firestore.doc(`ai_operation_fences/${t.operationId}`).get()).data()!.state, "closed");
});
test("closed fence prevents a later assistant and does not turn saved user into no_effect", async () => {
  const op = await saved(); confirmed(await store.closeOperation(op, epoch));
  assert.equal((await store.saveAssistant(op, () => ({ messageId: randomUUID(), text: "late", presentation: { presentationMode: "default" } }), authority())).kind, "terminated");
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, op)).state, "user_saved");
});
test("foreign verified identity cannot read or write another owner's target", async () => {
  const op = await saved();
  assert.equal((await store.readOutcome({ firebaseUid: peer }, op)).kind, "denied");
  assert.equal((await store.saveAssistant(op, () => ({ messageId: randomUUID(), text: "wrong owner", presentation: { presentationMode: "default" } }),
    { ...authority(), principal: { firebaseUid: peer } })).kind, "denied");
});
test("fresh Auth await cannot dispatch content after original cancellation", async () => {
  const op = await saved(); let active = true;
  const a = { ...authority(), current: () => active, verifyCurrentAuth: async () => { active = false;
    return { kind: "verified" as const, principal: { firebaseUid: uid } }; } };
  assert.equal((await store.saveAssistant(op, () => ({ messageId: randomUUID(), text: "late", presentation: { presentationMode: "default" } }), a)).kind, "terminated");
  assert.equal((await firestore.collection(`${parent(op)}/messages`).get()).size, 1);
});
test("revocation generation regrant cannot reauthorize old captured authority", async () => {
  const op = await saved(); await firestore.doc(accountPath).update({ purposeRevocationGeneration: 1 });
  try { assert.equal((await store.saveAssistant(op, () => ({ messageId: randomUUID(), text: "stale", presentation: { presentationMode: "default" } }), authority())).kind, "denied"); }
  finally { await firestore.doc(accountPath).set(account); }
});
test("unproved nonempty Note authority refuses effect rather than fabricating empty sources", async () => {
  const t = target(), a = authority();
  const result = await store.initializeOperation(t, epoch, { ...a, dependencies: { ...a.dependencies,
    sources: [{ sourceType: "check_in", sourceId: randomUUID(), observedVersion: { seconds: 1, nanoseconds: 0 } }] } });
  assert.equal(result.kind, "unavailable"); assert.equal((await firestore.doc(`ai_operation_fences/${t.operationId}`).get()).exists, false);
});
test("SDK acknowledged commit with deliberately discarded ACK remains unresolved until barrier/readback", async () => {
  const t = target(); let discard = false;
  const lostAck: FirestoreGateway = { runTransaction: async <T>(work: (tx: FirestoreTransactionGateway) => Promise<T>, options?: { readonly maxAttempts: 1 }): Promise<T> => {
    assert.deepEqual(options, { maxAttempts: 1 }); const result = await gateway.runTransaction(work, options);
    if (discard) throw new Error("synthetic acknowledgment loss after actual commit"); return result;
  } };
  const uncertain = new FirestoreConversationStore(lostAck, process.env);
  const op = confirmed(await uncertain.initializeOperation(t, epoch, authority())); discard = true;
  assert.equal((await uncertain.saveUser(op, () => "Synthetic user message", authority())).kind, "unresolved");
  assert.equal((await firestore.doc(user(op)).get()).exists, true);
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, op)).state, "unresolved");
  confirmed(await store.closeOperation(op, epoch));
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, op)).state, "user_saved");
});
test("single-attempt concurrent retries grant at most one claim; settled explicit control still succeeds", async () => {
  const a = await saved(); confirmed(await store.closeOperation(a, epoch)); confirmed(await store.readOutcome({ firebaseUid: uid }, a));
  const b = confirmed(await store.initializeOperation(retry(a), epoch, authority()));
  const c = confirmed(await store.initializeOperation(retry(a), epoch, authority()));
  const sdkCodes:number[]=[];
  const observed:FirestoreGateway={runTransaction:async <T>(work:(tx:FirestoreTransactionGateway)=>Promise<T>,options?:{readonly maxAttempts:1}):Promise<T>=>{
    try{return await gateway.runTransaction(work,options);}catch(error){
      const code=(error as {code?:unknown}).code;
      if(typeof code==="number")sdkCodes.push(code);
      throw error;
    }
  }};
  const raceStore=new FirestoreConversationStore(observed,process.env);
  const results = await Promise.all([raceStore.claimRetry(b, () => "Synthetic user message", authority()), raceStore.claimRetry(c, () => "Synthetic user message", authority())]);
  const winners=results.filter(r=>r.kind==="confirmed").length;
  assert.ok(winners<=1);assert.ok(results.every(r=>["confirmed","conflict","unresolved"].includes(r.kind)));
  // maxAttempts:1 permits both real competing transactions to be ABORTED. Do
  // not demand automatic retry/liveness that the selected contract forbids.
  assert.equal(results.filter(r=>r.kind==="unresolved").length,sdkCodes.length);
  assert.ok(sdkCodes.every(code=>code===10));
  const pending=(await firestore.doc(user(a)).get()).data()!.pendingOperationId;
  if(winners===1)assert.equal(pending,[b,c][results.findIndex(r=>r.kind==="confirmed")]!.operationId);
  else assert.equal(pending,undefined);
  const effects=await firestore.collection(`${parent(a)}/effects`).get();
  assert.equal(effects.docs.filter(d=>d.id===b.operationId||d.id===c.operationId).length,winners);
  // Resolve original writers before a separately explicit retry. No automatic
  // retry or test-only relaxation of canonical U/closed-fence rules.
  confirmed(await store.closeOperation(b,epoch));confirmed(await store.closeOperation(c,epoch));
  if(pending!==undefined)confirmed(await store.readOutcome({firebaseUid:uid},pending===b.operationId?b:c));
  assert.equal(confirmed(await store.readOutcome({firebaseUid:uid},a)).state,"user_saved");
  const d=confirmed(await store.initializeOperation(retry(a),epoch,authority()));
  confirmed(await store.claimRetry(d,()=>"Synthetic user message",authority()));
  assert.equal((await firestore.doc(user(a)).get()).data()!.pendingOperationId,d.operationId);
  console.info("JIN_AI_CLAIM_RACE",JSON.stringify({confirmed:winners,sdkAborted:sdkCodes.length,explicitSettledControl:1}));
});
test("canonical assistant tombstone occupies original U and cannot be retried", async () => {
  const op = await saved(), id = await assistant(op);
  const ref = firestore.doc(`${parent(op)}/messages/${id}`), row = (await ref.get()).data()!;
  const { text: _content, ...metadata } = row;
  const batch = firestore.batch(); batch.set(ref, { ...metadata, availability: "unavailable" });
  batch.delete(firestore.doc(`${parent(op)}/message_sources/${id}`)); await batch.commit();
  confirmed(await store.closeOperation(op, epoch));
  const outcome = confirmed(await store.readOutcome({ firebaseUid: uid }, op));
  assert.equal(outcome.state, "assistant_saved"); if (outcome.state === "assistant_saved") {
    assert.equal(outcome.assistant.availability, "unavailable"); assert.equal(Object.hasOwn(outcome.assistant, "text"), false);
  }
  const r = confirmed(await store.initializeOperation(retry(op), epoch, authority()));
  assert.equal((await store.claimRetry(r, () => "Synthetic user message", authority())).kind, "conflict");
});
test("missing provenance and corrupt retention lineage fail closed without removing original content", async () => {
  const op = await saved(), id = await assistant(op); confirmed(await store.closeOperation(op, epoch));
  await firestore.doc(`${parent(op)}/message_sources/${id}`).delete();
  assert.equal((await store.readOutcome({ firebaseUid: uid }, op)).kind, "unavailable");
  assert.equal(typeof (await firestore.doc(`${parent(op)}/messages/${id}`).get()).data()!.text, "string");
  await firestore.doc(`${parent(op)}/messages/${id}`).update({ appendBefore: { seconds: 1, nanoseconds: 0 } });
  assert.equal((await store.readOutcome({ firebaseUid: uid }, op)).kind, "unavailable");
});
test("original expiry denies read and append; no request-clock extension or deleting resurrection", async () => {
  const op = await saved(); confirmed(await store.closeOperation(op, epoch));
  const future = new FirestoreConversationStore(gateway, process.env, () => Date.now() + 91 * 86400_000);
  assert.equal((await future.readOutcome({ firebaseUid: uid }, op)).kind, "conversation_unavailable");
  await firestore.doc(parent(op)).update({ state: "deleting", lifecycleVersion: 2 });
  assert.equal((await store.readOutcome({ firebaseUid: uid }, op)).kind, "conversation_unavailable");
  assert.equal((await store.initializeOperation(retry(op), epoch, authority())).kind, "conversation_unavailable");
});
test("runtime restart epoch closes old content authority without pretending model termination", async () => {
  const old = await saved(); epoch = confirmed(await store.startEpoch(randomUUID()));
  assert.equal((await store.saveAssistant(old, () => ({ messageId: randomUUID(), text: "old process", presentation: { presentationMode: "default" } }), authority())).kind, "terminated");
  assert.equal((await firestore.collection(`${parent(old)}/messages`).get()).size, 1);
});

test("retained orphan under absent parent cannot be recreated as reserved_new", async () => {
  const t = target(); await firestore.doc(`${parent(t)}/effects/${randomUUID()}`).create({ kind: "send", userMessageId: randomUUID() });
  assert.equal((await store.initializeOperation(t, epoch, authority())).kind, "unavailable");
  assert.equal((await firestore.doc(parent(t)).get()).exists, false);
});

test("actual Auth -> six-route isolated Fastify boundary -> real store with explicitly fake orchestration and reply", async () => {
  // A handwritten integration fixture, NOT ZHOU's pending production async runtime.
  // This case proves Transport/store joining; not capacity, model policy or all six real use cases.
  const t = target(), key = Buffer.alloc(32, 9).toString("base64url");
  let op: OpenOperation | undefined, binding: string | undefined, consumed = false;
  const unavailable = async () => ({ kind: "failure" as const, code: "AI_UNAVAILABLE" as const });
  const operations: ConversationOperations = {
    prepare: async caller => { binding = caller.tokenInstance; return { kind: "success", value: {
      operationId: t.operationId, operationKey: key, conversationId: t.conversationId, preparationExpiresAt: new Date(Date.now() + 15000).toISOString() } }; },
    execute: async (caller, input, delivery) => {
      if (consumed || caller.tokenInstance !== binding || input.operationKey !== key) return { kind: "failure", code: "AI_OPERATION_CONFLICT" };
      consumed = true;
      const a: OriginalWriteAuthority = { ...authority(), principal: caller.principal, current: () => delivery.current(),
        verifyCurrentAuth: async () => { const r = await caller.verifyCurrentAuth();
          return r.kind === "verified" ? r : { kind: r.kind === "dependency_unavailable" ? "unavailable" : "denied" }; } };
      op = confirmed(await store.initializeOperation(t, epoch, a));
      confirmed(await store.saveUser(op, () => input.text, a));
      confirmed(await store.saveAssistant(op, () => ({ messageId: randomUUID(), text: "Explicit synthetic fake reply", presentation: { presentationMode: "default" } }), a));
      confirmed(await store.settleAcknowledgedAssistant(op, a));
      const pair = confirmed(await store.readAcknowledgedPair(op, a));
      assert.equal(delivery.current(), true);
      return { kind: "success", value: { operationId: t.operationId, conversationId: t.conversationId, userMessage: pair.user, assistantMessage: pair.assistant } };
    },
    cancel: unavailable, listMessages: unavailable, deleteConversation: unavailable,
    readOutcome: async caller => { const outcome = confirmed(await store.readOutcome(caller.principal, t));
      if (outcome.state === "assistant_saved") return { kind: "success", value: { operationId: t.operationId, state: "assistant_saved", userMessage: outcome.user, assistantMessage: outcome.assistant } };
      return { kind: "success", value: { operationId: t.operationId, state: "unresolved" } }; },
  };
  const unused = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
  const app = await buildApp({ identityVerifier: verifier, completeOnboarding: unused, getOnboarding: unused,
    createCheckIn: unused, getCheckIn: unused, getInterestTags: unused, getOwnInterests: unused, replaceOwnInterests: unused,
    isolatedSlices: { environment: process.env, conversations: operations } });
  try {
    const headers = { authorization: `Bearer ${token}` };
    const prepared = await app.inject({ method: "POST", url: "/v1/me/ai/operations", headers, payload: { kind: "send", purpose: "checkin_conversation" } });
    assert.equal(prepared.statusCode, 201);
    const executed = await app.inject({ method: "POST", url: `/v1/me/ai/operations/${t.operationId}/execute`, headers: { ...headers, "ai-operation-key": key }, payload: { text: "Synthetic HTTP input" } });
    assert.equal(executed.statusCode, 200);
    const dto = executed.json() as { userMessage: { messageId: string; text: string }; assistantMessage: { text: string } };
    assert.equal(dto.userMessage.messageId, t.userMessageId); assert.equal(dto.assistantMessage.text, "Explicit synthetic fake reply");
    assert.equal((await firestore.doc(user(t)).get()).data()!.text, "Synthetic HTTP input");
    assert.equal((await firestore.collection(`${parent(t)}/messages`).get()).size, 2);
    const duplicate = await app.inject({ method: "POST", url: `/v1/me/ai/operations/${t.operationId}/execute`, headers: { ...headers, "ai-operation-key": key }, payload: { text: "Synthetic HTTP input" } });
    assert.equal(duplicate.statusCode, 409);
    confirmed(await store.closeOperation(op!, epoch));
    const read = await app.inject({ method: "GET", url: `/v1/me/conversations/${t.conversationId}/operations/${t.operationId}`, headers });
    assert.equal(read.statusCode, 200); assert.equal((read.json() as { state: string }).state, "assistant_saved");
  } finally { await app.close(); }
});
