import assert from "node:assert/strict";
import test from "node:test";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import type { IdentityVerificationResult, IdentityVerifier } from "../../src/shared/ports/identity-verifier.js";
import type { ConversationResult } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { PersonaPreviewControl } from "../../src/personas/application/preview-persona.js";
import { registerPersonaPreviewRoute, type PersonaPreviewOperations } from "../../src/personas/transport/preview-route.js";
import { PERSONA_TEST_FIELDS } from "../support/persona-repository-contract.js";

const headers = { authorization: "Bearer synthetic-preview-token" };
const payload = { draft: PERSONA_TEST_FIELDS, text: "Hello" };
const verified = { kind: "verified", principal: { firebaseUid: "preview-lifetime-owner" } } as const;
const unavailable = { kind: "failure", code: "AI_UNAVAILABLE" } as const;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

async function fixture(identity: IdentityVerifier, execute?: PersonaPreviewOperations["execute"], bodyGate?: () => Promise<void>) {
  const app = Fastify({ logger: false }); app.decorateRequest("authPrincipal", null);
  let request!: FastifyRequest, reply!: FastifyReply, calls = 0;
  app.addHook("onRequest", async (value, response) => { request = value; reply = response; });
  if (bodyGate) app.addHook("preParsing", async (_request, _reply, stream) => { await bodyGate(); return stream; });
  await registerPersonaPreviewRoute(app, identity, { execute: async (...args) => {
    calls++; return execute ? execute(...args) : unavailable;
  } });
  await app.ready();
  return { app, calls: () => calls, request: () => request, reply: () => reply,
    inject: () => app.inject({ method: "POST", url: "/v1/me/persona-preview", headers, payload }) };
}

test("initial preview authentication expires in the original 60 seconds and late identity cannot dispatch", async t => {
  const identity = deferred<IdentityVerificationResult>(), entered = deferred<void>();
  const f = await fixture({ verifyIdToken: () => { entered.resolve(); return identity.promise; } });
  t.after(() => f.app.close());
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let settled = false;
  const pending = f.inject().then(response => { settled = true; return response; });
  await entered.promise;
  try {
    t.mock.timers.tick(59_999); await flush(); assert.equal(settled, false);
    t.mock.timers.tick(1); await flush();
    assert.equal(settled, true, "a stalled initial verifier must not hold the HTTP request beyond its original deadline");
    const response = await pending;
    assert.equal(response.statusCode, 503); assert.equal(response.json().error.code, "AI_UNAVAILABLE");
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(f.calls(), 0); assert.equal(f.request().authPrincipal, null);
  } finally {
    identity.resolve(verified); await pending; await flush();
  }
  assert.equal(f.request().authPrincipal, null, "late original verification cannot repopulate the request principal");
  assert.equal(f.calls(), 0, "a late authenticated result cannot enter preview Application");
});

test("time spent in initial authentication consumes the same route deadline passed to the handler", async t => {
  const identity = deferred<IdentityVerificationResult>(), entered = deferred<void>(), executing = deferred<void>();
  const release = deferred<ConversationResult<void>>();
  let control: PersonaPreviewControl | undefined;
  const f = await fixture({ verifyIdToken: () => { entered.resolve(); return identity.promise; } }, async (_caller, _draft, _text, supplied) => {
    control = supplied; executing.resolve();
    return Promise.race([release.promise, new Promise<ConversationResult<void>>(resolve => supplied.signal.addEventListener("abort", () => resolve(unavailable), { once: true }))]);
  });
  t.after(() => f.app.close());
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let settled = false;
  const pending = f.inject().then(response => { settled = true; return response; });
  await entered.promise;
  t.mock.timers.tick(40_000); identity.resolve(verified); await executing.promise;
  try {
    assert.equal(control!.signal.aborted, false); assert.equal(control!.current(), true);
    t.mock.timers.tick(19_999); await flush(); assert.equal(settled, false);
    t.mock.timers.tick(1); await flush();
    assert.equal(settled, true, "the handler must inherit only the 20 seconds left after initial authentication");
    assert.equal(control!.signal.aborted, true); assert.equal(control!.current(), false);
    assert.equal((await pending).statusCode, 503); assert.equal(f.calls(), 1);
  } finally { release.resolve(unavailable); await pending; }
});

test("disconnect during initial verification settles the route and fences late principal and handler work", async t => {
  const identity = deferred<IdentityVerificationResult>(), entered = deferred<void>();
  const f = await fixture({ verifyIdToken: () => { entered.resolve(); return identity.promise; } });
  t.after(() => f.app.close());
  const pending = f.inject().catch(() => undefined);
  await entered.promise;
  f.request().raw.emit("aborted");
  await flush();
  identity.resolve(verified); await pending; await flush();
  assert.equal(f.request().authPrincipal, null);
  assert.equal(f.calls(), 0, "a disconnected request cannot continue to Application after its verifier resolves");
});

test("the original route deadline also covers body work before the preview handler", async t => {
  const body = deferred<void>(), parsing = deferred<void>();
  const f = await fixture({ verifyIdToken: async () => verified }, undefined, () => { parsing.resolve(); return body.promise; });
  t.after(() => f.app.close());
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let settled = false;
  const pending = f.inject().then(response => { settled = true; return response; });
  await parsing.promise;
  try {
    t.mock.timers.tick(60_000); await flush();
    assert.equal(settled, true, "body preparation cannot hold an authenticated preview past the original request deadline");
    assert.equal((await pending).statusCode, 503); assert.equal(f.calls(), 0);
  } finally { body.resolve(); await pending; await flush(); }
  assert.equal(f.calls(), 0, "late body completion cannot invoke preview after lifetime expiry");
});

test("normal and rejected preview responses clean the owned route lifetime without extra dispatch", async t => {
  let control: PersonaPreviewControl | undefined;
  const f = await fixture({ verifyIdToken: async () => verified }, async (_caller, _draft, _text, supplied) => {
    control = supplied; assert.equal(supplied.accept("A transient preview"), true);
    return { kind: "success", value: undefined };
  });
  t.after(() => f.app.close());
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const response = await f.inject();
  await flush();
  assert.equal(response.statusCode, 200); assert.deepEqual(response.json(), { message: "A transient preview" });
  assert.equal(control!.signal.aborted, true, "response completion releases the route lifetime");
  t.mock.timers.tick(60_000); await flush(); assert.equal(f.calls(), 1);
  assert.equal(f.request().raw.listenerCount("aborted"), 0);
  const rejected = await f.app.inject({ method: "POST", url: "/v1/me/persona-preview", payload: { bad: true } });
  assert.equal(rejected.statusCode, 401); t.mock.timers.tick(60_000); await flush(); assert.equal(f.calls(), 1);
  assert.equal(f.request().raw.listenerCount("aborted"), 0);
});
