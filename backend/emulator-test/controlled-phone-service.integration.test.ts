import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createControlledPhoneService } from "../src/bootstrap/controlled-phone-service.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { ConversationInput } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import type { GenerationTransport } from "../src/ai-runtime/ports/generation-transport.js";
import type { CompletePromptCompiler } from "../src/ai-runtime/infrastructure/controlled-ollama-transport.js";

const compiler: CompletePromptCompiler<ConversationInput> = { compile: async () => ({ rawPrompt: "explicit synthetic compiler double", tokens: 10,
  includesAllFraming: true, manifestDigest: "3".repeat(64), tokenizerDigest: "4".repeat(64) }) };
const reply = (input: ConversationInput) => new TextEncoder().encode(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: `你提到：${input.currentMessage}` }));
const transport: GenerationTransport<ConversationInput> = { generate: async input => reply(input) };
const options = { environment: process.env, exclusiveEmulatorsVerified: true as const, compiler, transport };
async function until(predicate: () => boolean) {
  const end = Date.now() + 15_000;
  while (!predicate()) { assert(Date.now() < end, "Controlled service checkpoint timed out"); await delay(5); }
}
async function signIn(email: string, password: string) {
  const environment = requireControlledEmulatorEnvironment(process.env);
  const response = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
    redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200);
  const result = await response.json() as { idToken: string }; assert.equal(typeof result.idToken, "string"); return result.idToken;
}
interface Wire { status: string; profile: { revision: number }; settings: { optionalProcessingConsent: string };
  persona: { personaId: string }; userMessage: unknown; assistantMessage: unknown; messages: readonly unknown[];
  error: { code: string }; operationId: string; operationKey: string; conversationId: string }
async function client(service: Awaited<ReturnType<typeof createControlledPhoneService>>) {
  const baseUri = await service.app.listen({ host: "127.0.0.1", port: 0 });
  const { email, password } = service.privateHandoff(); let token = await signIn(email, password);
  return { refresh: async () => { token = await signIn(email, password); },
    call: async (method: string, path: string, expected: number, payload?: object, headers: Record<string, string> = {}) => {
      const response = await fetch(`${baseUri}${path}`, { method, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(65_000),
        headers: { authorization: `Bearer ${token}`, ...headers, ...(payload ? { "content-type": "application/json" } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}) });
      assert.equal(response.status, expected); return (response.status === 204 ? {} : await response.json()) as Wire;
    } };
}
async function ticket(c: Awaited<ReturnType<typeof client>>, conversationId?: string) {
  return await c.call("POST", "/v1/me/ai/operations", 201, { kind: "send", purpose: "checkin_conversation", ...(conversationId ? { conversationId } : {}) }) as {
    operationId: string; operationKey: string; conversationId: string };
}
async function cleanup(service: Awaited<ReturnType<typeof createControlledPhoneService>>) {
  await until(() => service.observation().activeCalls === 0 && service.observation().modelPending === 0 && service.observation().compilerPending === 0);
  assert.deepEqual(await service.stopAndClean(), { cleanupConfirmed: true, operatorHold: false });
  assert.deepEqual(await service.stopAndClean(), { cleanupConfirmed: true, operatorHold: false });
  assert.throws(() => service.privateHandoff());
}

test("ongoing service keeps canonical pairs, Persona and Account across repeated requests and refreshed Auth; stops only explicitly (actual SDK, model/compiler doubles)", async () => {
  const service = await createControlledPhoneService(options);
  try {
    const c = await client(service);
    assert.equal((await c.call("GET", "/v1/me/onboarding", 200)).status, "completed");
    assert.equal((await c.call("GET", "/v1/me/profile", 200)).profile.revision, 0);
    const created = await c.call("POST", "/v1/me/personas", 201, { displayName: "Synthetic service", tone: "warm", responseLength: "balanced", formatStyle: "plain", expectedStateRevision: 0 }, { "idempotency-key": randomUUID() });
    await c.call("PUT", "/v1/me/persona-selection", 200, { personaId: created.persona.personaId, expectedRevision: 1, expectedStateRevision: 1 });
    const first = await ticket(c);
    const pair1 = await c.call("POST", `/v1/me/ai/operations/${first.operationId}/execute`, 200, { text: "今天读书了。" }, { "ai-operation-key": first.operationKey });
    await c.refresh();
    const second = await ticket(c, first.conversationId);
    const pair2 = await c.call("POST", `/v1/me/ai/operations/${second.operationId}/execute`, 200, { text: "今天散步了。" }, { "ai-operation-key": second.operationKey });
    const history = await c.call("GET", `/v1/me/conversations/${first.conversationId}/messages`, 200);
    assert.equal(history.messages.length, 4);
    assert.deepEqual(history.messages, [pair1.userMessage, pair1.assistantMessage, pair2.userMessage, pair2.assistantMessage]);
    assert.equal(service.observation().modelAttempts, 2); assert.equal(service.observation().phase, "running");
    await c.call("DELETE", `/v1/me/personas/${created.persona.personaId}`, 204, { expectedRevision: 1, expectedStateRevision: 2 });
    assert.deepEqual((await c.call("GET", `/v1/me/conversations/${first.conversationId}/messages`, 200)).messages, history.messages);
    await c.call("DELETE", `/v1/me/conversations/${first.conversationId}`, 204);
  } finally { await cleanup(service); }
});

test("Settings uses approved purpose generation; consent revocation blocks later AI while Account remains available", async () => {
  const service = await createControlledPhoneService(options);
  try {
    const c = await client(service);
    await c.call("PUT", "/v1/me/settings", 200, { checkInVisibility: "private", optionalProcessingConsent: "rejected", expectedRevision: 0 });
    const denied = await c.call("POST", "/v1/me/ai/operations", 403, { kind: "send", purpose: "checkin_conversation" });
    assert.equal(denied.error.code, "AI_CONTEXT_NOT_PERMITTED");
    assert.equal((await c.call("GET", "/v1/me/settings", 200)).settings.optionalProcessingConsent, "rejected");
    assert.equal(service.observation().modelAttempts, 0);
    await c.call("POST", "/v1/check-ins", 503, { note: "source writer must stay unavailable" }, { "idempotency-key": randomUUID() });
  } finally { await cleanup(service); }
});

test("explicit stop closes admission immediately but preserves in-flight original generation; only its real settlement permits cleanup", async () => {
  let release!: () => void, started = false;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const service = await createControlledPhoneService({ ...options, transport: { generate: async input => { started = true; await hold; return reply(input); } } });
  let pending: Promise<unknown> | undefined;
  try {
    const c = await client(service), op = await ticket(c);
    pending = c.call("POST", `/v1/me/ai/operations/${op.operationId}/execute`, 200, { text: "今天读书了。" }, { "ai-operation-key": op.operationKey });
    await until(() => started);
    assert.deepEqual(await service.stopAndClean(), { cleanupConfirmed: false, operatorHold: true });
    assert.equal(service.observation().modelPending, 1); assert.equal(service.observation().accepting, false);
    assert.throws(() => service.privateHandoff());
    await c.call("GET", "/v1/me/personas", 503);
    release(); await pending;
  } finally { release(); await pending?.catch(() => {}); await cleanup(service); }
});

test("stop cannot forget an outstanding complete-input compiler; no dispatch or replacement epoch after stop", async () => {
  let release!: () => void, compiling = false;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const service = await createControlledPhoneService({ ...options, compiler: { compile: async (...args) => { compiling = true; await hold; return compiler.compile(...args); } } });
  let pending: Promise<unknown> | undefined;
  try {
    const c = await client(service), op = await ticket(c);
    pending = c.call("POST", `/v1/me/ai/operations/${op.operationId}/execute`, 503, { text: "今天读书了。" }, { "ai-operation-key": op.operationKey });
    await until(() => compiling);
    assert.deepEqual(await service.stopAndClean(), { cleanupConfirmed: false, operatorHold: true });
    assert.equal(service.observation().compilerPending, 1);
    release(); await assert.rejects(pending, /fetch failed/);
    assert.equal(service.observation().modelAttempts, 0);
  } finally { release(); await pending?.catch(() => {}); await cleanup(service); }
});

test("startup refuses existing records/Auth and preserves them instead of resetting an earlier service", async () => {
  const env = requireControlledEmulatorEnvironment(process.env);
  const firebase = initializeApp({ projectId: env.projectId }, randomUUID()), db = getFirestore(firebase), auth = getAuth(firebase);
  try {
    await db.doc("operator_previous/hold").create({ unresolved: true });
    await assert.rejects(createControlledPhoneService(options));
    assert.deepEqual((await db.doc("operator_previous/hold").get()).data(), { unresolved: true });
    await db.doc("operator_previous/hold").delete();
    const user = await auth.createUser({ uid: randomUUID() });
    await assert.rejects(createControlledPhoneService(options));
    assert.equal((await auth.getUser(user.uid)).uid, user.uid); await auth.deleteUser(user.uid);
  } finally { await db.terminate(); await deleteApp(firebase); }
});

test("invalid isolation is rejected before any Firebase access; no ordinary/cloud registration", async () => {
  await assert.rejects(createControlledPhoneService({ ...options, environment: { ...process.env, ENMORI_ENVIRONMENT: "controlled-demo" } }));
  await assert.rejects(createControlledPhoneService({ ...options, environment: { ...process.env, FIRESTORE_EMULATOR_HOST: "example.invalid:8080" } }));
});

test("pre-invocation model dependency rejection keeps Profile/Persona available and cannot fabricate an assistant", async () => {
  const service = await createControlledPhoneService({ ...options, transport: { generate: async () => { throw new Error("explicit pre-invocation double"); } } });
  try {
    const c = await client(service), op = await ticket(c);
    await c.call("POST", `/v1/me/ai/operations/${op.operationId}/execute`, 503, { text: "今天读书了。" }, { "ai-operation-key": op.operationKey });
    assert.equal((await c.call("GET", "/v1/me/conversations/" + op.conversationId + "/messages", 200)).messages.length, 1);
    await c.call("GET", "/v1/me/profile", 200); await c.call("GET", "/v1/me/personas", 200);
    assert.equal(service.observation().phase, "running");
  } finally { await cleanup(service); }
});

test("a different actual Auth user cannot adopt the owned service Account; cleanup never deletes that unrelated identity", async () => {
  const service = await createControlledPhoneService(options);
  const env = requireControlledEmulatorEnvironment(process.env);
  const firebase = initializeApp({ projectId: env.projectId }, randomUUID()), auth = getAuth(firebase);
  const email = `foreign-${randomUUID()}@example.invalid`, password = `Synthetic_${randomUUID()}`;
  const foreign = await auth.createUser({ email, password });
  try {
    const token = await signIn(email, password);
    const response = await service.app.inject({ method: "GET", url: "/v1/me/personas", headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.statusCode, 403);
    await cleanup(service);
    assert.equal((await auth.getUser(foreign.uid)).uid, foreign.uid);
  } finally { await auth.deleteUser(foreign.uid); await deleteApp(firebase); await cleanup(service); }
});

test("unresolved maintenance checkpoint holds stop and is preserved until the separate owned test repair", async () => {
  const service = await createControlledPhoneService(options);
  const env = requireControlledEmulatorEnvironment(process.env);
  const firebase = initializeApp({ projectId: env.projectId }, randomUUID()), db = getFirestore(firebase);
  const checkpoint = db.doc("ai_cleanup_progress/source_sweep");
  try {
    await checkpoint.create({ explicitUnresolvedTestCheckpoint: true });
    assert.deepEqual(await service.stopAndClean(), { cleanupConfirmed: false, operatorHold: true });
    assert.deepEqual((await checkpoint.get()).data(), { explicitUnresolvedTestCheckpoint: true });
    assert.equal((await db.collection("accounts").get()).size, 1);
    assert.equal((await db.doc("ai_runtime_fence/current").get()).exists, true);
    // Test-only removal of the exact document just created; not a production
    // recovery path, forced reset, SLA proof, or new cleanup rule.
    await checkpoint.delete();
  } finally { await db.terminate(); await deleteApp(firebase); await cleanup(service); }
});

test("lost startup Auth acknowledgment preserves the actual created identity and reports hold, never clean startup failure", async () => {
  const env = requireControlledEmulatorEnvironment(process.env);
  const firebase = initializeApp({ projectId: env.projectId }, randomUUID()), auth = getAuth(firebase), db = getFirestore(firebase);
  let prototype = Object.getPrototypeOf(auth);
  while (!Object.hasOwn(prototype, "createUser")) prototype = Object.getPrototypeOf(prototype);
  const original = prototype.createUser as typeof auth.createUser;
  let createdUid: string | undefined;
  prototype.createUser = async function(this: typeof auth, ...args: Parameters<typeof auth.createUser>) {
    const created = await original.apply(this, args); createdUid = created.uid;
    throw new Error("explicit test discards acknowledged Auth result");
  };
  try {
    await assert.rejects(createControlledPhoneService(options), /CONTROLLED_PHONE_SERVICE_STARTUP_HOLD/);
    assert(createdUid);
    assert.equal((await auth.getUser(createdUid)).uid, createdUid);
    assert.equal((await db.listCollections()).length, 0);
  } finally {
    prototype.createUser = original;
    if (createdUid) await auth.deleteUser(createdUid);
    await db.terminate(); await deleteApp(firebase);
  }
});
