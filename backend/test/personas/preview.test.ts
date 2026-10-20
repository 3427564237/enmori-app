import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import { PreviewPersona } from "../../src/personas/application/preview-persona.js";
import { FirestorePersonaPreviewAuthority } from "../../src/personas/infrastructure/firestore-persona-preview-authority.js";
import { registerPersonaPreviewRoute, personaPreviewRequestSchema, personaPreviewResponseSchema, personaPreviewErrorSchema } from "../../src/personas/transport/preview-route.js";
import type { PersonaPreviewAuthority } from "../../src/personas/ports/persona-preview-authority.js";
import type { ConversationCaller } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { ConversationInput } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import type { GenerationTransport } from "../../src/ai-runtime/ports/generation-transport.js";
import { LocalChatTransport } from "../../src/ai-runtime/infrastructure/local-chat-transport.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";
import { PERSONA_TEST_FIELDS, PERSONA_TEST_TIME, personaTestRecords } from "../support/persona-repository-contract.js";

const principal = { firebaseUid: "preview-owner" }, accountId = "preview-account";
const draft = { ...PERSONA_TEST_FIELDS, relationship: "Companion", shortIntroduction: "A draft introduction",
  description: "A kind voice", personality: "Curious", communicationStyle: "Ask a question", interests: "Custom piano", extraInstructions: "In Chinese" };
const caller: ConversationCaller = { principal, tokenInstance: "synthetic-token-ref",
  verifyCurrentAuth: async () => ({ kind: "verified", principal }) };
const raw = () => new TextEncoder().encode(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Preview hello 2? https://example.org" }));
function setup(consent = "accepted") {
  const records = personaTestRecords(principal.firebaseUid, accountId, "other", "other-account");
  Object.assign(records[`accounts/${accountId}`]!, { optionalProcessingConsent: consent, purposeRevocationGeneration: 0 });
  const store = new InMemoryFirestoreGateway(records), reads: string[] = [];
  const authority = new FirestorePersonaPreviewAuthority({ runTransaction: work => store.runTransaction(async tx => work({
    get: async path => { reads.push(path); return tx.get(path); },
    list: async () => assert.fail("preview must not query collections"),
    create: () => assert.fail("preview cannot create"), set: () => assert.fail("preview cannot write"), delete: () => assert.fail("preview cannot delete"),
  })) });
  return { store, reads, authority };
}
const control = (messages: string[], signal = new AbortController().signal) => ({ signal, current: () => !signal.aborted,
  accept: (message: string) => { messages.push(message); return true; } });
const result = (code: string) => ({ kind: "failure", code });

test("preview uses only current draft/message; no save/activation/history/source reads and every response is transient", async () => {
  const f = setup(), messages: string[] = [];
  const before = f.store.entries(); let calls = 0;
  const generation: GenerationTransport<ConversationInput> = { generate: async input => {
    calls++; assert.deepEqual(input.history, []); assert.deepEqual(input.checkIns, []);
    assert.deepEqual(input.persona?.expression, draft); assert.equal(input.currentMessage, "Hello draft"); return raw();
  } };
  const preview = new PreviewPersona(f.authority, generation, () => 0, () => false);
  assert.deepEqual(await preview.execute(caller, draft, "Hello draft", control(messages)), { kind: "success", value: undefined });
  assert.equal(calls, 1); assert.deepEqual(messages, ["Preview hello 2? https://example.org"]);
  assert.deepEqual(f.store.entries(), before);
  assert.equal(f.reads.length, 4);
  assert.ok(f.reads.every(path => path.startsWith("auth_bindings/") || path === `accounts/${accountId}`));
});

test("preview denies consent/auth and malformed draft without calling model; revoked/reaccepted purpose never delivers", async () => {
  for (const consent of ["rejected", "accepted"]) {
    const f = setup(consent), messages: string[] = []; let calls = 0;
    const generation = { generate: async () => { calls++; return raw(); } };
    const preview = new PreviewPersona(f.authority, generation, () => 0, () => false);
    if (consent === "rejected") {
      assert.deepEqual(await preview.execute(caller, draft, "Hello", control(messages)), result("AI_CONTEXT_NOT_PERMITTED"));
    } else {
      assert.deepEqual(await preview.execute({ ...caller, verifyCurrentAuth: async () => ({ kind: "invalid" }) }, draft, "Hello", control(messages)), result("AUTH_REQUIRED"));
      assert.deepEqual(await preview.execute(caller, { ...draft, ownerId: "forged" }, "Hello", control(messages)), result("AI_INPUT_INVALID"));
      assert.deepEqual(await preview.execute(caller, { ...draft, description: "bad\ud800" }, "Hello", control(messages)), result("AI_INPUT_INVALID"));
      assert.deepEqual(await preview.execute(caller, draft, "x".repeat(2401), control(messages)), result("AI_INPUT_INVALID"));
    }
    assert.equal(calls, 0); assert.deepEqual(messages, []);
  }
  for (const change of ["withdraw", "reaccept", "switch-owner", "auth"]) {
    const f = setup(), messages: string[] = []; let authCalls = 0;
    const generation = { generate: async () => {
      if (change === "switch-owner") {
        const path = f.reads.find(path => path.startsWith("auth_bindings/"))!;
        await f.store.runTransaction(async tx => tx.set(path, { accountId: "other-account" }));
        await f.store.runTransaction(async tx => tx.set("accounts/other-account", { ...personaTestRecords("a", "a", "b", "b")["accounts/a"]!, optionalProcessingConsent: "accepted", purposeRevocationGeneration: 0 }));
      } else if (change !== "auth") await f.store.runTransaction(async tx => {
        tx.set(`accounts/${accountId}`, { ...(await tx.get(`accounts/${accountId}`))!,
          optionalProcessingConsent: change === "withdraw" ? "rejected" : "accepted", purposeRevocationGeneration: 1 });
      });
      return raw();
    } };
    const preview = new PreviewPersona(f.authority, generation, () => 0, () => false);
    const original = { ...caller, verifyCurrentAuth: async () => {
      authCalls++; return change === "auth" && authCalls > 1 ? { kind: "invalid" as const } : { kind: "verified" as const, principal };
    } };
    const expected = change === "withdraw" ? "AI_CONTEXT_NOT_PERMITTED" : change === "auth" ? "AUTH_REQUIRED" : "AI_AUTHORITY_CHANGED";
    assert.deepEqual(await preview.execute(original, draft, "Hello", control(messages)), result(expected));
    assert.deepEqual(messages, []);
  }
});

test("preview shares the local model lane, abandons delivery on disconnect, never resends unknown model work", async () => {
  const f = setup(); let complete!: (response: Response) => void, entered!: () => void, calls = 0;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const local = new LocalChatTransport("qwen3.5:9b", async (_url, init) => {
    calls++; const body = JSON.parse(init!.body as string);
    assert.equal(body.messages.length, 2); assert.equal(body.tools, undefined); entered();
    return new Promise<Response>(resolve => { complete = resolve; });
  });
  const preview = new PreviewPersona(f.authority, local, () => 0, () => local.state.pending), messages: string[] = [];
  const abort = new AbortController();
  const pending = preview.execute(caller, draft, "Hello", control(messages, abort.signal));
  await enteredPromise;
  assert.deepEqual(await preview.execute(caller, draft, "Another", control(messages)), result("AI_BUSY"));
  abort.abort(); assert.deepEqual(await pending, { kind: "terminated" });
  assert.equal(local.state.pending, true);
  assert.deepEqual(await preview.execute(caller, draft, "Another", control(messages)), result("AI_BUSY"));
  complete(Response.json({ done: true, model: "qwen3.5:9b", message: { content: new TextDecoder().decode(raw()) } }));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(local.state.pending, false); assert.deepEqual(messages, []); assert.equal(calls, 1);
});

test("preview generation timeout withdraws delivery while retaining the original local model lane", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = setup(); let complete!: (response: Response) => void, entered!: () => void, calls = 0;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const local = new LocalChatTransport("qwen3.5:9b", async () => {
    calls++; entered(); return new Promise<Response>(resolve => { complete = resolve; });
  });
  const preview = new PreviewPersona(f.authority, local, () => 0, () => local.state.pending), messages: string[] = [];
  const pending = preview.execute(caller, draft, "Hello", control(messages));
  await enteredPromise;
  t.mock.timers.tick(45_000);
  assert.deepEqual(await pending, result("AI_UNAVAILABLE"));
  assert.equal(local.state.pending, true);
  assert.deepEqual(await preview.execute(caller, draft, "Another", control(messages)), result("AI_BUSY"));
  complete(Response.json({ done: true, model: "qwen3.5:9b", message: { content: new TextDecoder().decode(raw()) } }));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(local.state.pending, false); assert.deepEqual(messages, []); assert.equal(calls, 1);
});

test("preview maps invalid/failed model and absent/corrupt permission to safe results with no output", async () => {
  const f = setup(), messages: string[] = [];
  for (const generate of [async () => new TextEncoder().encode('{"message":"wrong"}'), async () => { throw Error("synthetic-private-model-error"); }]) {
    const preview = new PreviewPersona(f.authority, { generate }, () => 0, () => false);
    const output = await preview.execute(caller, draft, "Hello", control(messages));
    assert.equal(output.kind, "failure"); assert.ok(!JSON.stringify(output).includes("synthetic-private"));
  }
  const noGeneration = { generate: async () => assert.fail("no generation without permission") };
  await f.store.runTransaction(async tx => tx.set(`accounts/${accountId}`, { ...(await tx.get(`accounts/${accountId}`))!, purposeRevocationGeneration: -1 }));
  const unavailable = new PreviewPersona(f.authority, noGeneration, () => 0, () => false);
  assert.deepEqual(await unavailable.execute(caller, draft, "Hello", control(messages)), result("AI_UNAVAILABLE"));
  const denied: PersonaPreviewAuthority = { read: async () => ({ kind: "failure", code: "ONBOARDING_REQUIRED" }) };
  assert.deepEqual(await new PreviewPersona(denied, noGeneration, () => 0, () => false).execute(caller, draft, "Hello", control(messages)), result("ONBOARDING_REQUIRED"));
  assert.deepEqual(messages, []);
});

test("preview HTTP authenticates first, enforces exact draft/byte boundary, serializes one reply and matches OpenAPI", async t => {
  const f = setup(); let generated = 0;
  const preview = new PreviewPersona(f.authority, { generate: async () => { generated++; return raw(); } }, () => 0, () => false);
  const app = Fastify({ logger: false }); app.decorateRequest("authPrincipal", null); t.after(() => app.close());
  await registerPersonaPreviewRoute(app, { verifyIdToken: async token => token === "synthetic" ? { kind: "verified", principal } : { kind: "invalid" } }, preview);
  const path = "/v1/me/persona-preview", headers = { authorization: "Bearer synthetic" }, payload = { draft, text: "Hello" };
  const unauth = await app.inject({ method: "POST", url: path, payload: { bad: true } });
  assert.equal(unauth.statusCode, 401); assert.equal(generated, 0);
  for (const invalid of [null, [], {}, { ...payload, ownerId: "forged" }, { ...payload, history: [] }, { ...payload, draft: { ...draft, personaId: "saved" } }, { ...payload, draft: { ...draft, interests: [] } }, { ...payload, text: 42 }]) {
    const response = await app.inject({ method: "POST", url: path, headers, payload: invalid as object });
    assert.equal(response.statusCode, 400, response.body); assert.equal(response.json().error.code, "REQUEST_INVALID");
  }
  for (const extra of [{ "idempotency-key": "forged" }, { "ai-operation-key": "forged" }]) {
    assert.equal((await app.inject({ method: "POST", url: path, headers: { ...headers, ...extra }, payload })).statusCode, 400);
  }
  assert.equal((await app.inject({ method: "POST", url: path + "?owner=forged", headers, payload })).statusCode, 400);
  const tooLarge = await app.inject({ method: "POST", url: path, headers, payload: { ...payload, draft: { ...draft, description: "x".repeat(17000) } } });
  assert.equal(tooLarge.statusCode, 413); assert.equal(tooLarge.json().error.code, "REQUEST_TOO_LARGE");
  const invalidText = await app.inject({ method: "POST", url: path, headers, payload: { ...payload, text: "x".repeat(2401) } });
  assert.equal(invalidText.statusCode, 422); assert.equal(generated, 0);
  const good = await app.inject({ method: "POST", url: path, headers, payload });
  assert.equal(good.statusCode, 200, good.body); assert.equal(good.headers["cache-control"], "no-store");
  assert.deepEqual(good.json(), { message: "Preview hello 2? https://example.org" }); assert.equal(generated, 1);
  const api = JSON.parse(await readFile("api/openapi.json", "utf8"));
  assert.deepEqual(api.components.schemas.PersonaPreviewRequest, personaPreviewRequestSchema);
  assert.deepEqual(api.components.schemas.PersonaPreviewResponse, personaPreviewResponseSchema);
  assert.deepEqual(api.components.schemas.PersonaPreviewError, personaPreviewErrorSchema);
  assert.ok(api.paths[path].post); assert.match(api.paths[path].post.requestBody.description, /16384 UTF-8 bytes/);
});
