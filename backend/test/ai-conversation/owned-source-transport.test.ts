import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import Fastify from "fastify";
import type { ConversationCaller, ConversationResult } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { OwnedMessageAnchor, OwnedSourceTarget } from "../../src/ai-conversation/ports/owned-sources.js";
import { registerOwnedSourceRoutes, type OwnedSourceOperations } from "../../src/ai-conversation/transport/register-owned-source-routes.js";
import { parseConversationCursor } from "../../src/ai-conversation/transport/register-routes.js";
import type { IdentityVerifier } from "../../src/shared/ports/identity-verifier.js";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const conversationId = id(1), messageId = id(2), cardRef = id(3), sourceConversation = id(4), sourceMessage = id(5);
const headers = { authorization: "Bearer synthetic-source-caller" };
const resolveUrl = "/v1/me/ai/source-references/resolve";
const anchorUrl = `/v1/me/conversations/${conversationId}/messages/${messageId}/anchor`;
const input = { conversationId, messageId, cardRef };
const anchor = (c = conversationId, m = messageId): OwnedMessageAnchor => ({ conversationId: c, messageId: m, sequence: 7, pageBefore: 8 });
function ok<T>(value: T): ConversationResult<T> { return { kind: "success", value }; }

/** HTTP-only supplier fakes. Actual source/owner/retention verification belongs
 * to Root's application wrapper and Context's Store, not these fixtures. */
async function fixture(options: { identity?: IdentityVerifier; accepting?: () => boolean;
  change?: Partial<OwnedSourceOperations>; abortBeforeHandler?: boolean } = {}) {
  const calls: { kind: string; caller: ConversationCaller; input: unknown; current: () => boolean }[] = [];
  const verified: string[] = [];
  let accepting = true;
  const identity: IdentityVerifier = options.identity ?? { verifyIdToken: async token => {
    verified.push(token); return { kind: "verified", principal: { firebaseUid: "synthetic-source-owner" } };
  } };
  const operations: OwnedSourceOperations = {
    resolve: async (caller, value, current) => {
      calls.push({ kind: "resolve", caller, input: value, current });
      await caller.verifyCurrentAuth();
      return ok({ kind: "conversation_message", anchor: anchor(sourceConversation, sourceMessage) });
    },
    anchor: async (caller, c, m, current) => { calls.push({ kind: "anchor", caller, input: [c, m], current }); return ok(anchor(c, m)); },
    ...options.change,
  };
  const app = Fastify({ logger: false });
  if (options.abortBeforeHandler) app.addHook("preHandler", async request => { request.raw.emit("aborted"); });
  await registerOwnedSourceRoutes(app, identity, operations, options.accepting ?? (() => accepting)); await app.ready();
  return { app, calls, verified, operations, stop: () => { accepting = false; } };
}

test("source resolver returns only its typed authorized anchor, with canonical existing before cursor", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  f.operations.resolve = async (caller, value, current) => {
    f.calls.push({ kind: "resolve", caller, input: value, current }); await caller.verifyCurrentAuth();
    return ok({ kind: "conversation_message", anchor: Object.assign(anchor(sourceConversation, sourceMessage),
      { ownerId: "private-owner", rawPath: "private-path", sourceText: "private-text" }) });
  };
  const response = await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: input });
  assert.equal(response.statusCode, 200); assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.json(), { kind: "conversation_message", anchor: {
    conversationId: sourceConversation, messageId: sourceMessage, sequence: 7,
    pageBefore: Buffer.from(JSON.stringify({ v: 1, before: 8 })).toString("base64url") } });
  assert.equal(parseConversationCursor(response.json().anchor.pageBefore), 8);
  assert(!response.body.includes("private")); assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0]!.input, input); assert.equal(f.calls[0]!.current(), false, "request ends after the response closes");
  assert.equal(f.calls[0]!.caller.principal.firebaseUid, "synthetic-source-owner");
  assert.equal(f.calls[0]!.caller.tokenInstance, createHash("sha256").update("synthetic-source-caller").digest("hex"));
  assert.deepEqual(f.verified, ["synthetic-source-caller", "synthetic-source-caller"]);
});

test("Check-in target permits legacy safe document IDs while excluding internal provenance", async t => {
  const f = await fixture({ change: { resolve: async () => ok(Object.assign({ kind: "check_in" as const, checkInId: "legacy-check-in-23" },
    { version: "private-version", ownerAccountId: "private-owner", text: "private-content" })) } }); t.after(() => f.app.close());
  const response = await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: input });
  assert.equal(response.statusCode, 200); assert.deepEqual(response.json(), { kind: "check_in", checkInId: "legacy-check-in-23" });
});

test("message locator returns exactly the requested canonical message and a round-tripping cursor", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  const response = await f.app.inject({ method: "GET", url: anchorUrl, headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.json()).sort(), ["conversationId", "messageId", "pageBefore", "sequence"]);
  assert.equal(response.json().conversationId, conversationId); assert.equal(response.json().messageId, messageId);
  assert.equal(response.json().sequence, 7); assert.equal(parseConversationCursor(response.json().pageBefore), 8);
  f.operations.anchor = async () => ok(anchor(sourceConversation, sourceMessage));
  assert.equal((await f.app.inject({ method: "GET", url: anchorUrl, headers })).statusCode, 503);
});

test("source input is exact UUID-scoped, with no caller authority, version, URL or query extensions", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const body of [{ ...input, ownerId: id(9) }, { ...input, version: "current" }, { ...input, url: "https://example.invalid" },
    { ...input, cardRef: "opaque-arbitrary-value" }, { ...input, messageId: "bad" }, { conversationId, messageId }, []]) {
    const response = await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: body });
    assert.equal(response.statusCode, 400); assert.equal(response.json().error.code, "REQUEST_INVALID");
  }
  for (const query of ["?before=1", "?key=a&key=b"]) {
    assert.equal((await f.app.inject({ method: "POST", url: resolveUrl + query, headers, payload: input })).statusCode, 400);
    assert.equal((await f.app.inject({ method: "GET", url: anchorUrl + query, headers })).statusCode, 400);
  }
  assert.equal((await f.app.inject({ method: "GET", url: anchorUrl.replace(messageId, "bad"), headers })).statusCode, 400);
  assert.equal(f.calls.length, 0);
});

test("navigation has no operation/revision/idempotency headers, GET body or automatic HEAD", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const header of ["idempotency-key", "ai-operation-key", "if-match", "if-none-match", "if-unmodified-since"]) {
    assert.equal((await f.app.inject({ method: "POST", url: resolveUrl, headers: { ...headers, [header]: "bad" }, payload: input })).statusCode, 400);
    assert.equal((await f.app.inject({ method: "GET", url: anchorUrl, headers: { ...headers, [header]: "bad" } })).statusCode, 400);
  }
  for (const request of [{ payload: { unexpected: true } }, { headers: { ...headers, "transfer-encoding": "chunked" } }])
    assert.equal((await f.app.inject({ method: "GET", url: anchorUrl, headers, ...request })).statusCode, 400);
  assert.equal((await f.app.inject({ method: "HEAD", url: anchorUrl, headers })).statusCode, 404);
  assert.equal(f.calls.length, 0);
});

test("authentication precedes malformed JSON, and verification errors expose only safe N01 envelopes", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  const absent = await f.app.inject({ method: "POST", url: resolveUrl, headers: { "content-type": "application/json" }, payload: "{" });
  assert.equal(absent.statusCode, 401); assert.equal(f.verified.length, 0); assert.equal(f.calls.length, 0);
  for (const [kind, status, code] of [["invalid", 401, "AUTH_REQUIRED"], ["forbidden", 403, "AUTH_FORBIDDEN"],
    ["dependency_unavailable", 503, "AI_UNAVAILABLE"], ["throw", 503, "AI_UNAVAILABLE"]] as const) {
    const other = await fixture({ identity: { verifyIdToken: async () => { if (kind === "throw") throw Error("private-token-error"); return { kind }; } } });
    try {
      const response = await other.app.inject({ method: "GET", url: anchorUrl, headers });
      assert.equal(response.statusCode, status); assert.equal(response.json().error.code, code);
      assert.equal(typeof response.json().requestId, "string"); assert.equal(response.json().error.requestId, undefined);
      assert(!response.body.includes("private")); assert.equal(other.calls.length, 0);
    } finally { await other.app.close(); }
  }
});

test("missing, changed and unknown source results keep distinct 404/409/503 outcomes without locator substitution", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const [code, status] of [["AI_SOURCE_UNAVAILABLE", 404], ["AI_AUTHORITY_CHANGED", 409], ["AI_UNAVAILABLE", 503]] as const) {
    f.operations.resolve = async () => ({ kind: "failure", code }); f.operations.anchor = async () => ({ kind: "failure", code });
    for (const method of ["POST", "GET"] as const) {
      const response = await f.app.inject({ method, url: method === "POST" ? resolveUrl : anchorUrl, headers,
        ...(method === "POST" ? { payload: input } : {}) });
      assert.equal(response.statusCode, status); assert.equal(response.json().error.code, code);
      assert.equal(response.json().anchor, undefined); assert.equal(response.json().pageBefore, undefined);
    }
  }
  f.operations.resolve = async () => { throw Error("private-provider-body"); };
  const failed = await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: input });
  assert.equal(failed.statusCode, 503); assert(!failed.body.includes("private"));
});

test("malformed media and JSON are 400, oversized payload is 413, and none invoke the reader", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const request of [{ headers: { ...headers, "content-type": "application/json" }, payload: "{" },
    { headers: { ...headers, "content-type": "application/xml" }, payload: "<source/>" }])
    assert.equal((await f.app.inject({ method: "POST", url: resolveUrl, ...request })).statusCode, 400);
  const large = await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: { ...input, extra: "x".repeat(8192) } });
  assert.equal(large.statusCode, 413); assert.equal(large.json().error.code, "REQUEST_TOO_LARGE"); assert.equal(f.calls.length, 0);
});

test("invalid inner IDs, unsafe target kinds and sequence overflow cannot produce a navigation sidecar", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const patch of [{ sequence: 0 }, { sequence: 1.5 }, { sequence: Number.MAX_SAFE_INTEGER, pageBefore: Number.MAX_SAFE_INTEGER + 1 },
    { sequence: Number.MAX_SAFE_INTEGER - 1, pageBefore: 8 }, { pageBefore: 7 }, { messageId: "bad" }]) {
    f.operations.anchor = async () => ok({ ...anchor(), ...patch });
    const response = await f.app.inject({ method: "GET", url: anchorUrl, headers }); assert.equal(response.statusCode, 503);
    assert.equal(response.json().pageBefore, undefined);
  }
  for (const checkInId of ["", ".", "..", "a/b", "__internal__", "\ud800", "界".repeat(501)]) {
    f.operations.resolve = async () => ok({ kind: "check_in", checkInId });
    assert.equal((await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: input })).statusCode, 503);
  }
  f.operations.resolve = async () => ok({ kind: "event", eventId: id(6) } as unknown as OwnedSourceTarget);
  assert.equal((await f.app.inject({ method: "POST", url: resolveUrl, headers, payload: input })).statusCode, 503);
  f.operations.anchor = async () => ok({ ...anchor(), sequence: Number.MAX_SAFE_INTEGER - 1, pageBefore: Number.MAX_SAFE_INTEGER });
  const largest = await f.app.inject({ method: "GET", url: anchorUrl, headers });
  assert.equal(largest.statusCode, 200); assert.equal(parseConversationCursor(largest.json().pageBefore), Number.MAX_SAFE_INTEGER);
});

test("aborted request and stopped admission never invoke a source reader", async () => {
  const stopped = await fixture({ accepting: () => false });
  try {
    assert.equal((await stopped.app.inject({ method: "POST", url: resolveUrl, headers, payload: input })).statusCode, 503);
    assert.equal(stopped.verified.length, 0); assert.equal(stopped.calls.length, 0);
  } finally { await stopped.app.close(); }
  const aborted = await fixture({ abortBeforeHandler: true });
  try {
    await assert.rejects(aborted.app.inject({ method: "GET", url: anchorUrl, headers }), /destroy|closed|reset/i);
    assert.equal(aborted.calls.length, 0);
  } finally { await aborted.app.close(); }
});

test("shutdown after identity await or after source await prevents late delivery", async () => {
  let accepting = true;
  const before = await fixture({ accepting: () => accepting, identity: { verifyIdToken: async () => {
    accepting = false; return { kind: "verified", principal: { firebaseUid: "synthetic-source-owner" } };
  } } });
  try { assert.equal((await before.app.inject({ method: "GET", url: anchorUrl, headers })).statusCode, 503); assert.equal(before.calls.length, 0); }
  finally { await before.app.close(); }
  const after = await fixture();
  try {
    after.operations.anchor = async (_caller, _c, _m, current) => { assert.equal(current(), true); await Promise.resolve(); after.stop(); return ok(anchor()); };
    await assert.rejects(after.app.inject({ method: "GET", url: anchorUrl, headers }), /destroy|closed|reset/i);
  } finally { await after.app.close(); }
});

test("terminal result and final projection invalidation close the sink instead of returning sensitive metadata", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  f.operations.resolve = async () => ({ kind: "terminated" });
  await assert.rejects(f.app.inject({ method: "POST", url: resolveUrl, headers, payload: input }), /destroy|closed|reset/i);
  f.operations.anchor = async () => ok({ ...anchor(), get sequence() { f.stop(); return 7; } });
  await assert.rejects(f.app.inject({ method: "GET", url: anchorUrl, headers }), /destroy|closed|reset/i);
});
