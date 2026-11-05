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
import { FirestoreConversationCleanup } from "../src/ai-conversation/infrastructure/firestore-conversation-cleanup.js";
import type { ConversationQuiescence } from "../src/ai-conversation/ports/conversation-cleanup.js";
import { AsyncFirestoreConversationStore } from "../src/ai-conversation/infrastructure/async-firestore-conversation-store.js";
import { FirebaseAdminAsyncConversationAuthority } from "../src/ai-conversation/infrastructure/firebase-admin-async-conversation-authority.js";
import { FirebaseAdminRealContextReader } from "../src/ai-conversation/infrastructure/firebase-admin-real-context-reader.js";
import { AsyncConversationApplication } from "../src/ai-conversation/application/async-conversation-application.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../src/ai-conversation/application/async-conversation-generation-transport.js";
import { BoundedAiRuntime } from "../src/ai-runtime/application/bounded-ai-runtime.js";
import { MonotonicRuntimeClock } from "../src/ai-runtime/infrastructure/monotonic-runtime-clock.js";
import type { AsyncConversationIdentity, AsyncDeliveryMessage, AsyncEffectContext } from "../src/ai-conversation/ports/async-conversation.js";
import type { StoredUserIdentity, StoreResult, OperationTarget, OpenOperation, OriginalWriteAuthority, RuntimeEpoch } from "../src/ai-conversation/ports/real-conversation-store.js";
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
// This fixture has no HTTP ticket registry or detached work. Every preceding
// store call was awaited. Close all known original operations before cleanup.
// Production composition must supply its actual admission/I/O coordinator.
const settledFixture:ConversationQuiescence={withTargetClosed:async <T>(o:string,c:string,work:()=>Promise<T>)=>{
  assert.equal(o,owner);
  for(const target of targets.filter(t=>t.conversationId===c))confirmed(await store.closeOperation(target,epoch));
  return {kind:"settled",value:await work()};
}};
async function identityOf(op: OperationTarget): Promise<StoredUserIdentity> {
  const row=await firestore.doc(user(op)).get(); assert.equal(row.exists,true);
  return {messageId:op.userMessageId,sequence:row.data()!.sequence as number,
    persistedAt:{seconds:row.createTime!.seconds,nanoseconds:row.createTime!.nanoseconds}};
}
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
    for (const path of [binding, `${accountPath}/persona_state/current`, accountPath, "ai_runtime_fence/current", "ai_cleanup_progress/source_sweep"]) {
      await firestore.doc(path).delete(); assert.equal((await firestore.doc(path).get()).exists, false);
    }
    await auth.deleteUser(uid); await assert.rejects(auth.getUser(uid)); token = "";
  } finally { await firestore.terminate(); await deleteApp(firebase); }
});

test("actual Firestore permits one startup from a single expected runtime fence", async () => {
  const doc = firestore.doc("ai_runtime_fence/current");
  const snapshot = (await doc.get()).data();
  assert.equal(snapshot?.processEpoch, epoch.processEpoch);
  assert.equal(snapshot?.generation, epoch.generation);
  assert.equal(typeof snapshot?.cleanupGeneration, "number");
  const expectedFence = { ...epoch, cleanupGeneration: snapshot!.cleanupGeneration as number };
  const claim = { expectedFence, expiresAtMs: Date.now() + 30_000 };
  const starts = await Promise.all([
    store.startEpoch(randomUUID(), claim),
    new FirestoreConversationStore(gateway, process.env).startEpoch(randomUUID(), claim),
  ]);
  const winners = starts.filter(result => result.kind === "confirmed");
  assert.equal(winners.length, 1);
  const winner = winners[0]!;
  assert.equal(winner.value.generation, expectedFence.generation + 1);
  assert.deepEqual((await doc.get()).data(), { ...winner.value, cleanupGeneration: expectedFence.cleanupGeneration });
  assert.deepEqual(await store.startEpoch(randomUUID(), claim), { kind: "conflict" });
  epoch = winner.value;
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
  confirmed(await store.claimRetry(b, () => "Synthetic user message", await identityOf(b), authority()));
  const before = await firestore.doc(user(a)).get();
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, a)).state, "unresolved");
  const c = confirmed(await store.initializeOperation(retry(a), epoch, authority()));
  assert.equal((await store.claimRetry(c, () => "Synthetic user message", await identityOf(c), authority())).kind, "conflict");
  const id = await assistant(b);
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, a)).state, "unresolved");
  confirmed(await store.closeOperation(b, epoch));
  assert.equal(confirmed(await store.readOutcome({ firebaseUid: uid }, b)).state, "assistant_saved");
  const fromA = confirmed(await store.readOutcome({ firebaseUid: uid }, a));
  assert.equal(fromA.state, "assistant_saved"); if (fromA.state === "assistant_saved") assert.equal(fromA.assistant.messageId, id);
  assert.equal((await firestore.doc(user(a)).get()).createTime!.isEqual(before.createTime!), true);
  assert.equal((await store.claimRetry(c, () => "Synthetic user message", await identityOf(c), authority())).kind, "conflict");
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
  const results = await Promise.all([raceStore.claimRetry(b, () => "Synthetic user message", await identityOf(b), authority()), raceStore.claimRetry(c, () => "Synthetic user message", await identityOf(c), authority())]);
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
  confirmed(await store.claimRetry(d,()=>"Synthetic user message",await identityOf(d),authority()));
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
  assert.equal((await store.claimRetry(r, () => "Synthetic user message", await identityOf(r), authority())).kind, "conflict");
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

test("whole delete removes multi-page children, all fences and progress before parent and advances ABA generation",async()=>{
  const op=await saved();await assistant(op);
  for(let n=0;n<27;n++)await firestore.doc(`${parent(op)}/effects/${randomUUID()}`).create({kind:"send",userMessageId:op.userMessageId});
  const before=(await firestore.doc("ai_runtime_fence/current").get()).data()!.cleanupGeneration;
  await firestore.doc("ai_cleanup_progress/source_sweep").set({schemaVersion:1,revision:1,phase:"messages",lastDocumentName:user(op),startedAt:{seconds:1,nanoseconds:0},resumeUntil:{seconds:86401,nanoseconds:0},hadFailure:false});
  const cleanup=new FirestoreConversationCleanup(gateway,process.env,settledFixture);
  assert.deepEqual(await cleanup.deleteOwned({firebaseUid:uid},owner,op.conversationId,epoch),{kind:"deleted"});
  for(const c of ["messages","message_sources","effects"])assert.equal((await firestore.collection(`${parent(op)}/${c}`).get()).empty,true);
  assert.equal((await firestore.doc(parent(op)).get()).exists,false);
  assert.equal((await firestore.doc(`ai_operation_fences/${op.operationId}`).get()).exists,false);
  assert.equal((await firestore.doc("ai_cleanup_progress/source_sweep").get()).exists,false);
  assert.equal((await firestore.doc("ai_runtime_fence/current").get()).data()!.cleanupGeneration,before+1);
  assert.equal((await store.saveUser(op,()=>"must not recreate",authority())).kind,"unavailable");
});

test("unsettled deletion remains unresolved/inaccessible, preserves children, and resumes after actual fixture settlement",async()=>{
  const op=await saved();await assistant(op);let calls=0;
  const cleanup=new FirestoreConversationCleanup(gateway,process.env,{withTargetClosed:async()=>{calls++;return {kind:"unresolved"};}});
  assert.deepEqual(await cleanup.deleteOwned({firebaseUid:peer},owner,op.conversationId,epoch),{kind:"denied"});assert.equal(calls,0);
  assert.deepEqual(await cleanup.deleteOwned({firebaseUid:uid},owner,op.conversationId,epoch),{kind:"unresolved"});assert.equal(calls,1);
  assert.equal((await firestore.doc(parent(op)).get()).data()!.state,"deleting");
  assert.equal((await firestore.doc(user(op)).get()).exists,true);
  assert.equal((await store.readOutcome({firebaseUid:uid},op)).kind,"conversation_unavailable");
  assert.deepEqual(await new FirestoreConversationCleanup(gateway,process.env,settledFixture).deleteOwned({firebaseUid:uid},owner,op.conversationId,epoch),{kind:"deleted"});
});

test("expiry rechecks the complete current anchor and refuses stale-cutoff deletion before original deadline",async()=>{
  const op=await saved(), first=(await firestore.doc(user(op)).get()).createTime!;
  const id=await assistant(op), last=(await firestore.doc(`${parent(op)}/messages/${id}`).get()).createTime!;
  assert.ok(last.toMillis()>first.toMillis()+1);
  const oldCutoff=Math.ceil(first.toMillis())+90*86400000+1;
  let quiesced=0;
  const q:ConversationQuiescence={withTargetClosed:async <T>(o:string,c:string,work:()=>Promise<T>)=>{quiesced++;return settledFixture.withTargetClosed(o,c,work);}};
  assert.deepEqual(await new FirestoreConversationCleanup(gateway,process.env,q,()=>oldCutoff).expireKnown(owner,op.conversationId,epoch),{kind:"live"});
  assert.equal(quiesced,0);assert.equal((await firestore.doc(parent(op)).get()).data()!.state,"live");
  const expired=Math.ceil(last.toMillis())+90*86400000+1;
  assert.deepEqual(await new FirestoreConversationCleanup(gateway,process.env,q,()=>expired).expireKnown(owner,op.conversationId,epoch),{kind:"deleted"});
  assert.equal(quiesced,1);assert.equal((await firestore.doc(parent(op)).get()).exists,false);
});

test("Retry rejects changed immutable original-user metadata in the actual claim transaction",async()=>{
  const a=await saved();confirmed(await store.closeOperation(a,epoch));confirmed(await store.readOutcome({firebaseUid:uid},a));
  const b=confirmed(await store.initializeOperation(retry(a),epoch,authority())), actual=await identityOf(a);
  assert.equal((await store.claimRetry(b,()=>"Synthetic user message",{...actual,persistedAt:{...actual.persistedAt,seconds:actual.persistedAt.seconds+1}},authority())).kind,"conflict");
  assert.equal((await firestore.doc(user(a)).get()).data()!.pendingOperationId,undefined);
  assert.equal((await firestore.doc(`${parent(a)}/effects/${b.operationId}`).get()).exists,false);
  confirmed(await store.closeOperation(b,epoch));
  const c=confirmed(await store.initializeOperation(retry(a),epoch,authority()));
  confirmed(await store.claimRetry(c,()=>"Synthetic user message",actual,authority()));
});

test("actual Auth and fixed/current SDK reader join ZHOU async Application to real store with explicitly fake Qwen and gates",async()=>{
  const targetOp=target(), session={}, tokenInstance={}, originalRequest={};let active=true, modelCalls=0;
  const identity:AsyncConversationIdentity={principal:{firebaseUid:uid},ownerId:owner,session,tokenInstance,originalRequest};
  await firestore.doc(`${accountPath}/persona_state/current`).set({stateRevision:0,livePersonaIds:[]});
  const same=(i:AsyncConversationIdentity)=>active&&i.ownerId===owner&&i.principal.firebaseUid===uid&&i.session===session&&i.tokenInstance===tokenInstance&&i.originalRequest===originalRequest;
  const authz=new FirebaseAdminAsyncConversationAuthority(firestore,{current:same,verify:async()=>verifier.verifyIdToken(token)},process.env);
  const clock=new MonotonicRuntimeClock();
  const reads=new FirebaseAdminRealContextReader(firestore,{controlledEnvironment:process.env,monotonicNow:()=>clock.now(),
    originalAuthority:{verify:async c=>{
      if(!active||c.ownerId!==owner||c.session!==session||c.originalRequest!==originalRequest)return {kind:"terminated"};
      const v=await verifier.verifyIdToken(token);return v.kind==="verified"?{kind:"read",value:v.principal}:{kind:"denied"};
    }},
    // Complete OWNED fixture inventory: zero Notes for this random owner; this
    // test creates none and never restores/reuses IDs. No operational DU grant.
    notePrerequisites:{firestore,sourceReferences:["backend/emulator-test/real-conversation-store.integration.test.ts#actual-empty-source-async-join"],
      completeCanonicalUtcInventory:true,immutableOwnerNoteAndTime:true,permanentDeletion:true,noRestoreOrIdReuse:true}});
  const bridge=new AsyncFirestoreConversationStore(store,epoch,authz);
  const model=new AuthorizedAsyncConversationGenerationTransport({generate:async input=>{
    modelCalls++;assert.deepEqual(input.checkIns,[]);assert.equal(input.currentMessage,"Explicit synthetic async join");
    return Buffer.from(JSON.stringify({schemaVersion:"ai_assistant_message_v1",message:"Explicit fake Qwen reply"}));
  }});
  const runtime=new BoundedAiRuntime(clock,model), deliveries:AsyncDeliveryMessage[]=[];
  let lastContext:AsyncEffectContext|undefined;
  const application=new AsyncConversationApplication(runtime,authz,reads,bridge,
    // Synthetic gate fakes are NOT actual tokenizer/semantic/model evidence.
    {beforeGeneration:async()=>({ok:true,value:undefined}),candidate:async()=>({ok:true,value:undefined})},
    {deliver:async(context,revalidate,event)=>{
      lastContext=context;const pair=await bridge.read(context);assert.equal(pair.kind,"success");
      if(pair.kind!=="success")return "refused";
      assert.deepEqual(pair.value.presentation,{presentationMode:"default"});
      assert.equal(pair.value.user.text,"Explicit synthetic async join");assert.equal(pair.value.assistant.text,"Explicit fake Qwen reply");
      if(!await revalidate())return "refused";event(value=>{
        assert.equal(value.assistantMessageId,pair.value.assistant.messageId);assert.equal(value.user.sequence,pair.value.user.sequence);
        assert.deepEqual(value.user.persistedAt,pair.value.user.persistedAt);deliveries.push(value);
      });return "accepted";}},
    {monotonicNow:()=>clock.now(),utcNow:()=>{const ms=Date.now(),seconds=Math.floor(ms/1000);return {seconds,nanoseconds:(ms-seconds*1000)*1000000};}});
  const command=application.create({identity,operation:targetOp,text:"Explicit synthetic async join"});
  const admission=await application.dispatch(command);assert.equal(admission.accepted,true);if(!admission.accepted)return;
  assert.deepEqual(await admission.request.outcome,{ok:true,value:undefined});
  assert.equal(modelCalls,1);assert.equal(deliveries.length,1);assert.equal(application.inspect(command)!.processing,false);
  assert.deepEqual(await bridge.read(lastContext!),{kind:"failure",code:"AI_AUTHORITY_CHANGED"});
  // Await the Application's actual original closure; no fixture guess that an
  // outcome promise alone means its asynchronous control barrier settled.
  assert.equal((await application.cancel(command,identity)).kind,"closed");active=false;
  const row=(await firestore.doc(user(targetOp)).get()).data()!;
  assert.equal(row.text,"Explicit synthetic async join");assert.equal(row.pendingOperationId,undefined);
  assert.equal(row.acceptedAssistantMessageId,deliveries[0]!.assistantMessageId);
  const reply=(await firestore.doc(`${parent(targetOp)}/messages/${row.acceptedAssistantMessageId as string}`).get()).data()!;
  assert.equal(reply.text,"Explicit fake Qwen reply");assert.equal(reply.sequence,2);
  assert.equal(confirmed(await store.readOutcome({firebaseUid:uid},targetOp)).state,"assistant_saved");
  assert.equal(runtime.state.nonTerminal,0);assert.equal(runtime.state.quarantined,false);
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
      const value={operationId:t.operationId,conversationId:t.conversationId,userMessage:pair.user,assistantMessage:pair.assistant};
      assert.equal(delivery.acceptCompleteBody!(value),true);
      assert.equal(delivery.acceptCompleteBody!(value),false);
      return { kind: "success", value };
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

test("actual sourced writes bind current source in the content transaction, preserve exact provenance and suppress deleted-source history",async()=>{
  const id=randomUUID(),path=`check_ins/${id}`;
  const proof={gateway,sourceReferences:["this fresh owned immutable Note fixture; permanent test deletion without restore"],
    completeCanonicalUtcInventory:true as const,immutableOwnerNoteAndTime:true as const,permanentDeletion:true as const,noRestoreOrIdReuse:true as const};
  const sourcedStore=new FirestoreConversationStore(gateway,process.env,Date.now,proof);
  await firestore.doc(path).create({ownerAccountId:owner,note:"Synthetic Note",createdAt:new Date().toISOString()});
  const note=await firestore.doc(path).get();
  const a:OriginalWriteAuthority={...authority(),dependencies:{...authority().dependencies,sources:[{sourceType:"check_in",sourceId:id,
    observedVersion:{seconds:note.updateTime!.seconds,nanoseconds:note.updateTime!.nanoseconds}}]}};
  try{
    const deniedTarget=target();assert.equal((await store.initializeOperation(deniedTarget,epoch,a)).kind,"unavailable");
    const op=confirmed(await sourcedStore.initializeOperation(target(),epoch,a));
    confirmed(await sourcedStore.saveUser(op,()=>"Synthetic sourced user",a));
    const replyId=randomUUID();confirmed(await sourcedStore.saveAssistant(op,()=>({messageId:replyId,text:"Synthetic sourced reply",presentation:{presentationMode:"default"}}),a));
    confirmed(await sourcedStore.settleAcknowledgedAssistant(op,a));
    assert.deepEqual((await firestore.doc(`${parent(op)}/message_sources/${replyId}`).get()).data(),{
      sources:[{sourceType:"check_in",sourceId:id}],purposeRevocationGeneration:0});
    const listed=confirmed(await sourcedStore.listOwnedMessages(a.principal,owner,op.conversationId,undefined,()=>true));
    assert.equal(listed.messages[1]!.availability,"available");
    const second=confirmed(await sourcedStore.initializeOperation(target(),epoch,a));
    confirmed(await sourcedStore.saveUser(second,()=>"Synthetic pending user",a));
    await firestore.doc(path).delete();
    let borrowed=false;assert.equal((await sourcedStore.saveAssistant(second,()=>{borrowed=true;return {messageId:randomUUID(),text:"must not be borrowed",presentation:{presentationMode:"default"}};},a)).kind,"denied");
    assert.equal(borrowed,false);assert.equal((await firestore.collection(`${parent(second)}/message_sources`).get()).empty,true);
    const hidden=confirmed(await sourcedStore.listOwnedMessages(a.principal,owner,op.conversationId,undefined,()=>true));
    assert.equal(hidden.messages[1]!.availability,"unavailable");assert.equal(Object.hasOwn(hidden.messages[1]!,"text"),false);
    assert.equal((await firestore.doc(`${parent(op)}/message_sources/${replyId}`).get()).exists,true);
  }finally{await firestore.doc(path).delete();assert.equal((await firestore.doc(path).get()).exists,false);}
});

test("open history: real canonical latest two pairs, no tombstone backfill and atomic stale-pair write refusal", async () => {
  const first = await saved(); await assistant(first); confirmed(await store.settleAcknowledgedAssistant(first,authority()));
  const pairs: OpenOperation[] = [first];
  for (let n=0;n<2;n++) {
    const next: OperationTarget = {...first,targetKind:"existing",userMessageId:randomUUID(),operationId:randomUUID()};
    targets.push(next);
    const op=confirmed(await store.initializeOperation(next,epoch,authority()));
    confirmed(await store.saveUser(op,()=>`Synthetic complete history ${n}`,authority()));
    await assistant(op);confirmed(await store.settleAcknowledgedAssistant(op,authority()));pairs.push(op);
  }
  const next: OperationTarget={...first,targetKind:"existing",userMessageId:randomUUID(),operationId:randomUUID()};targets.push(next);
  const captured=confirmed(await store.readHistory(next,authority()));
  assert.deepEqual(captured.pairs.map(p=>p.identity.userMessageId),pairs.slice(1).map(p=>p.userMessageId));
  const last=captured.pairs[1]!, previous=captured.pairs[0]!;
  const tombstone=async(id:string)=>{
    const ref=firestore.doc(`${parent(first)}/messages/${id}`),row=(await ref.get()).data()!;
    const {text:_private,...metadata}=row;
    await ref.set({...metadata,availability:"unavailable"});await firestore.doc(`${parent(first)}/message_sources/${id}`).delete();
  };
  await tombstone(last.identity.assistantMessageId);
  const filtered=confirmed(await store.readHistory(next,authority()));
  assert.deepEqual(filtered.pairs.map(p=>p.identity.userMessageId),[previous.identity.userMessageId]);
  assert.equal(filtered.pairs.some(p=>p.identity.userMessageId===first.userMessageId),false,"older pair was not backfilled");
  const guarded:OriginalWriteAuthority={...authority(),dependencies:{...authority().dependencies,history:filtered.pairs.map(p=>p.identity)}};
  const op=confirmed(await store.initializeOperation(next,epoch,guarded));
  confirmed(await store.saveUser(op,()=>"New message with prior context",guarded));
  await tombstone(previous.identity.assistantMessageId);
  let borrowed=false;
  assert.equal((await store.saveAssistant(op,()=>{borrowed=true;return {messageId:randomUUID(),text:"Must never save",presentation:{presentationMode:"default"}};},guarded)).kind,"denied");
  assert.equal(borrowed,false,"source/pair gate precedes content borrowing in the same write transaction");
  assert.equal((await store.readHistory(next,guarded,filtered.pairs.map(p=>p.identity))).kind,"denied");
  assert.equal((await store.readHistory({...next,ownerAccountId:randomUUID()},authority())).kind,"denied");
});

test("open history: a historical Note authorization loss cannot be treated as empty or save a descendant", async () => {
  const noteId=`history-note-${randomUUID()}`,notePath=`check_ins/${noteId}`;
  await firestore.doc(notePath).create({ownerAccountId:owner,note:"Synthetic historical Note",createdAt:new Date().toISOString(),checkInVisibility:"private"});
  try {
    const note=(await firestore.doc(notePath).get());
    const sourced=new FirestoreConversationStore(gateway,process.env,Date.now,{gateway,sourceReferences:["owned immutable history fixture"],
      completeCanonicalUtcInventory:true,immutableOwnerNoteAndTime:true,permanentDeletion:true,noRestoreOrIdReuse:true});
    const a:OriginalWriteAuthority={...authority(),dependencies:{...authority().dependencies,sources:[{sourceType:"check_in",sourceId:noteId,
      observedVersion:{seconds:note.updateTime!.seconds,nanoseconds:note.updateTime!.nanoseconds}}]}};
    const first=target(),op=confirmed(await sourced.initializeOperation(first,epoch,a));
    confirmed(await sourced.saveUser(op,()=>"Historical user",a));
    const assistantId=randomUUID();confirmed(await sourced.saveAssistant(op,()=>({messageId:assistantId,text:"Historical reply",presentation:{presentationMode:"default"}}),a));
    confirmed(await sourced.settleAcknowledgedAssistant(op,a));
    const next:OperationTarget={...first,targetKind:"existing",userMessageId:randomUUID(),operationId:randomUUID()};targets.push(next);
    const capture=confirmed(await sourced.readHistory(next,authority()));
    assert.equal(capture.pairs.length,1);assert.equal(capture.sources[0]!.sourceId,noteId);
    const descendant:OriginalWriteAuthority={...authority(),dependencies:{...authority().dependencies,sources:capture.sources,history:capture.pairs.map(p=>p.identity)}};
    const open=confirmed(await sourced.initializeOperation(next,epoch,descendant));
    confirmed(await sourced.saveUser(open,()=>"Refer to the earlier Note",descendant));
    await firestore.doc(notePath).delete();
    assert.equal((await sourced.readHistory(next,descendant,capture.pairs.map(p=>p.identity))).kind,"denied");
    assert.equal((await sourced.saveAssistant(open,()=>({messageId:randomUUID(),text:"Unauthorized descendant",presentation:{presentationMode:"default"}}),descendant)).kind,"denied");
    const fresh=confirmed(await sourced.readHistory(next,authority()));assert.deepEqual(fresh.pairs,[]);
  } finally {await firestore.doc(notePath).delete();assert.equal((await firestore.doc(notePath).get()).exists,false);}
});

test("open history orders completed exchanges by assistant time even when an older U is retried later",async()=>{
  const first=await saved();confirmed(await store.closeOperation(first,epoch));
  confirmed(await store.readOutcome({firebaseUid:uid},first));
  const second:OperationTarget={...first,targetKind:"existing",userMessageId:randomUUID(),operationId:randomUUID()};targets.push(second);
  const b=confirmed(await store.initializeOperation(second,epoch,authority()));
  confirmed(await store.saveUser(b,()=>"Second user",authority()));await assistant(b);confirmed(await store.settleAcknowledgedAssistant(b,authority()));
  const a=confirmed(await store.initializeOperation(retry(first),epoch,authority()));
  confirmed(await store.claimRetry(a,()=>"Synthetic user message",await identityOf(first),authority()));await assistant(a);confirmed(await store.settleAcknowledgedAssistant(a,authority()));
  const third:OperationTarget={...second,userMessageId:randomUUID(),operationId:randomUUID()};targets.push(third);
  const c=confirmed(await store.initializeOperation(third,epoch,authority()));
  confirmed(await store.saveUser(c,()=>"Third user",authority()));await assistant(c);confirmed(await store.settleAcknowledgedAssistant(c,authority()));
  const next:OperationTarget={...third,userMessageId:randomUUID(),operationId:randomUUID()};targets.push(next);
  const history=confirmed(await store.readHistory(next,authority()));
  assert.deepEqual(history.pairs.map(p=>p.identity.userMessageId),[first.userMessageId,third.userMessageId]);
  assert(history.pairs[0]!.identity.assistantSequence<history.pairs[1]!.identity.assistantSequence);
});
