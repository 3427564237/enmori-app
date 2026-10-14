import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";
import type { OriginalWriteAuthority, OperationTarget } from "../../src/ai-conversation/ports/real-conversation-store.js";
const profile = "synthetic-empty-profile";
const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  APPDATA: profile, HOME: profile, USERPROFILE: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
const target: OperationTarget = { ownerAccountId: randomUUID(), conversationId: randomUUID(), userMessageId: randomUUID(),
  operationId: randomUUID(), kind: "send", targetKind: "reserved_new" };
const authority: OriginalWriteAuthority = { principal: { firebaseUid: "synthetic" },
  dependencies: { ownerId: target.ownerAccountId, purpose: "checkin_conversation", purposeRevocationGeneration: 0, usedPersonaId: undefined, sources: [] },
  current: () => true, verifyCurrentAuth: async () => ({ kind: "verified", principal: { firebaseUid: "synthetic" } }) };
test("real store rejects ordinary/cloud/credential-bearing environment before any gateway use", () => {
  let called = false;
  const gateway = { runTransaction: async <T>(): Promise<T> => { called = true; throw new Error("not called"); } };
  for (const changed of [{ ENMORI_ENVIRONMENT: "controlled-demo" }, { GCLOUD_PROJECT: "real-project" },
    { FIRESTORE_EMULATOR_HOST: "firestore.googleapis.com:443" }, { GOOGLE_APPLICATION_CREDENTIALS: "not-read" }]) {
    assert.throws(() => new FirestoreConversationStore(gateway, { ...environment, ...changed }));
  }
  assert.equal(called, false);
});
test("real transaction uses one SDK attempt and strips unknown raw dependency details", async () => {
  const store = new FirestoreConversationStore({ runTransaction: async (_work, options) => {
    assert.deepEqual(options, { maxAttempts: 1 }); throw new Error("private path/token/body must not escape");
  } }, environment);
  assert.deepEqual(await store.startEpoch(randomUUID()), { kind: "unresolved" });
});
test("runtime epoch missing initializes exactly selected fields; overflow never mutates", async () => {
  const gateway = new InMemoryFirestoreGateway(), store = new FirestoreConversationStore(gateway, environment);
  const id = randomUUID(); assert.deepEqual(await store.startEpoch(id), { kind: "confirmed", value: { processEpoch: id, generation: 1 } });
  assert.deepEqual(gateway.read("ai_runtime_fence/current"), { processEpoch: id, generation: 1, cleanupGeneration: 0 });
  const seed = { processEpoch: id, generation: Number.MAX_SAFE_INTEGER, cleanupGeneration: 8 };
  const exhausted = new InMemoryFirestoreGateway({ "ai_runtime_fence/current": seed });
  assert.deepEqual(await new FirestoreConversationStore(exhausted, environment).startEpoch(randomUUID()), { kind: "unavailable" });
  assert.deepEqual(exhausted.read("ai_runtime_fence/current"), seed);
});
test("termination and Auth failure cannot dispatch SDK transactions", async () => {
  let calls = 0;
  const store = new FirestoreConversationStore({ runTransaction: async <T>(): Promise<T> => { calls++; throw new Error("not called"); } }, environment);
  const epoch = { processEpoch: randomUUID(), generation: 1 };
  assert.deepEqual(await store.initializeOperation(target, epoch, { ...authority, current: () => false }), { kind: "terminated" });
  assert.deepEqual(await store.initializeOperation(target, epoch, { ...authority, verifyCurrentAuth: async () => ({ kind: "denied" }) }), { kind: "denied" });
  assert.deepEqual(await store.initializeOperation(target, epoch, { ...authority, verifyCurrentAuth: async () => { throw new Error("private"); } }), { kind: "unavailable" });
  assert.equal(calls, 0);
});
test("close before initialize records only content-free closed fence and preserves revision on repeat", async () => {
  const gateway = new InMemoryFirestoreGateway(), store = new FirestoreConversationStore(gateway, environment);
  const epoch = await store.startEpoch(randomUUID()); assert.equal(epoch.kind, "confirmed"); if (epoch.kind !== "confirmed") return;
  assert.equal((await store.closeOperation(target, epoch.value)).kind, "confirmed");
  const first = gateway.read(`ai_operation_fences/${target.operationId}`);
  assert.equal(first?.state, "closed"); assert.equal(first?.revision, 1);
  assert.equal((await store.closeOperation(target, epoch.value)).kind, "confirmed");
  assert.deepEqual(gateway.read(`ai_operation_fences/${target.operationId}`), first);
  assert.equal(gateway.entries().length, 2);
});

test("terminal during fresh Auth never borrows user/reply text or dispatches a transaction", async () => {
  let borrowed = 0, transactions = 0, live = true;
  const store = new FirestoreConversationStore({runTransaction: async <T>(): Promise<T> => {transactions++; throw new Error("not reached");}}, environment);
  const a: OriginalWriteAuthority = {...authority, current:()=>live, verifyCurrentAuth:async()=>{
    await Promise.resolve(); live=false; return {kind:"verified",principal:authority.principal};
  }};
  const op={...target,epoch:{processEpoch:randomUUID(),generation:1},revision:1};
  const text=()=>{borrowed++;return "synthetic";};
  assert.equal((await store.saveUser(op,text,a)).kind,"terminated");
  live=true;
  assert.equal((await store.claimRetry({...op,kind:"retry",targetKind:"existing"},text,a)).kind,"terminated");
  live=true;
  assert.equal((await store.saveAssistant(op,()=>{borrowed++;return {messageId:randomUUID(),text:"synthetic",presentation:{presentationMode:"default"}};},a)).kind,"terminated");
  assert.equal(borrowed,0); assert.equal(transactions,0);
});
