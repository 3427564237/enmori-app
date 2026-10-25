import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type { IdentityVerifier } from "../../src/shared/ports/identity-verifier.js";
import { firstFlowIntentView, registerFirstFlowRoutes } from "../../src/proactive/transport/register-routes.js";
import { fixture, ids } from "./first-flow-fakes.js";

const headers = { authorization: "Bearer synthetic-caller" };
async function server() {
  const f = fixture(); let identityCalls = 0;
  const identity: IdentityVerifier = { verifyIdToken: async () => { identityCalls++; return { kind: "verified", principal: { firebaseUid: "owner" } }; } };
  const app = Fastify({ logger: false }); await registerFirstFlowRoutes(app, identity, f.app); await app.ready();
  return { ...f, http: app, identityCalls: () => identityCalls };
}
const settings = (f: ReturnType<typeof fixture>) => ({ expectedRevision: f.store.settingsValue.revision, ...f.settings });
const command = (f: ReturnType<typeof fixture>) => ({ conversationId: ids.topic, sourceMessageId: ids.source,
  category: "explicit_follow_up", dueAt: new Date(f.clock.now + 60000).toISOString(), timeZone: "Asia/Singapore", processing: "local", expectedSettingsRevision: f.store.settingsValue.revision });

test("settings direct public view omits grant/secret fields; no action is triggered by a read", async () => {
  const f = await server();
  try {
    Object.assign(f.store.settingsValue, { secret: "private", internalOwner: "owner" });
    const response = await f.http.inject({ method: "GET", url: "/v1/me/proactive-settings", headers });
    assert.equal(response.statusCode, 200); assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.json().revision, 0); assert.equal(response.json().mode, "off");
    assert.equal(response.json().timeZone, "");
    for (const key of ["grantGeneration", "secret", "internalOwner", "settings"]) assert.equal(Object.hasOwn(response.json(), key), false);
    assert.deepEqual(f.counts(), { model: 0, sends: 0 });
  } finally { await f.http.close(); }
});

test("settings replacement has exact cap/quiet shape and compares revision without leaking internal metadata", async () => {
  const f = await server();
  try {
    const valid = settings(f);
    const response = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings", headers, payload: valid });
    assert.equal(response.statusCode, 200); assert.equal(response.json().revision, 1); assert.equal(response.json().grantGeneration, undefined);
    const stale = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings", headers, payload: valid });
    assert.equal(stale.statusCode, 412); assert.equal(stale.json().error.code, "PROACTIVE_REVISION_PRECONDITION_FAILED");
    assert.equal(typeof stale.json().requestId, "string"); assert.equal(stale.json().error.requestId, undefined);
    for (const patch of [{ maximumInRolling24h: 2 }, { categories: ["going_event"] }, { mode: ["on"] },
      { quiet: { kind: "daily", startMinute: 1320, endMinute: 480 } }, { pausedUntil: "2026-10-26T00:00:00.000Z" }]) {
      const bad = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings", headers, payload: { ...settings(f), ...patch } });
      assert.equal(bad.statusCode, 422);
    }
  } finally { await f.http.close(); }
});

test("create/read/list use minimal intent views and a known key is queryable after an unknown ACK", async () => {
  const f = await server();
  try {
    await f.app.replaceSettings(f.actor, 0, f.settings);
    f.store.unknownCreate = true;
    const response = await f.http.inject({ method: "POST", url: "/v1/me/proactive-intents",
      headers: { ...headers, "idempotency-key": ids.intent }, payload: command(f) });
    assert.equal(response.statusCode, 503); assert.equal(response.json().error.code, "AI_OUTCOME_UNRESOLVED");
    const read = await f.http.inject({ method: "GET", url: `/v1/me/proactive-intents/${ids.intent}`, headers });
    assert.equal(read.statusCode, 200);
    assert.deepEqual(Object.keys(read.json()).sort(), ["category", "conversationId", "dueAt", "expiresAt", "intentId", "revision", "state"]);
    const list = await f.http.inject({ method: "GET", url: "/v1/me/proactive-intents", headers });
    assert.deepEqual(list.json(), { intents: [read.json()] });
    assert.equal(f.store.rows.size, 1); assert.deepEqual(f.counts(), { model: 0, sends: 0 });
  } finally { await f.http.close(); }
});

test("definite create returns 201 and cancel is explicit revision JSON with no claim of recall", async () => {
  const f = await server();
  try {
    await f.app.replaceSettings(f.actor, 0, f.settings);
    const response = await f.http.inject({ method: "POST", url: "/v1/me/proactive-intents",
      headers: { ...headers, "idempotency-key": ids.intent }, payload: command(f) });
    assert.equal(response.statusCode, 201);
    const cancel = await f.http.inject({ method: "DELETE", url: `/v1/me/proactive-intents/${ids.intent}`,
      headers, payload: { expectedRevision: response.json().revision } });
    assert.equal(cancel.statusCode, 200); assert.equal(cancel.json().state, "cancelled");
    assert.equal(f.counts().sends, 0);
    const row = f.store.rows.get(ids.intent)!;
    assert.deepEqual(firstFlowIntentView({ ...row, state: "cancelled", dispatchState: "accepted" }), {
      intentId: row.intentId, revision: row.revision, state: "cancelled", dueAt: row.dueAt, expiresAt: row.expiresAt,
      category: "explicit_follow_up", conversationId: ids.topic, recallPossible: false,
    });
    assert.equal(firstFlowIntentView({ ...row, state: "published", dispatchState: "accepted" }).state, "accepted");
  } finally { await f.http.close(); }
});

test("missing, malformed and repeated idempotency keys are 400 before creating an effect", async () => {
  const f = await server();
  try {
    for (const key of [undefined, "bad", `${ids.intent},${ids.intent}`, [ids.intent, ids.intent]]) {
      const response = await f.http.inject({ method: "POST", url: "/v1/me/proactive-intents",
        headers: { ...headers, ...(key === undefined ? {} : { "idempotency-key": key }) }, payload: command(f) });
      assert.equal(response.statusCode, 400); assert.equal(response.json().error.code, "IDEMPOTENCY_KEY_INVALID");
    }
    assert.equal(f.store.rows.size, 0);
  } finally { await f.http.close(); }
});

test("noncanonical timestamps, UTC normalization drift and unapproved fields cannot create intents", async () => {
  const f = await server();
  try {
    for (const dueAt of ["2026-10-25T05:00:00Z", "2026-10-25T05:00:00.0Z", "2026-10-25T05:00:00.000000Z", "2026-02-31T05:00:00.000Z"])
      assert.equal((await f.http.inject({ method: "POST", url: "/v1/me/proactive-intents", headers: { ...headers, "idempotency-key": ids.intent }, payload: { ...command(f), dueAt } })).statusCode, 422);
    for (const extra of [{ ownerAccountId: "other" }, { quotedRequest: "private content" }, { currentLocation: {} }])
      assert.equal((await f.http.inject({ method: "POST", url: "/v1/me/proactive-intents", headers: { ...headers, "idempotency-key": ids.intent }, payload: { ...command(f), ...extra } })).statusCode, 400);
    assert.equal(f.store.rows.size, 0);
  } finally { await f.http.close(); }
});

test("non-create keys, competing revision headers, GET bodies/query and HEAD aliases are rejected", async () => {
  const f = await server();
  try {
    for (const extra of [{ "idempotency-key": ids.intent }, { "ai-operation-key": "secret" }, { "if-match": "0" }]) {
      const r = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings", headers: { ...headers, ...extra }, payload: settings(f) });
      assert.equal(r.statusCode, 400);
    }
    assert.equal((await f.http.inject({ method: "GET", url: "/v1/me/proactive-settings?owner=other", headers })).statusCode, 400);
    assert.equal((await f.http.inject({ method: "GET", url: "/v1/me/proactive-settings", headers: { ...headers, "content-type": "application/json" }, payload: "{}" })).statusCode, 400);
    assert.equal((await f.http.inject({ method: "GET", url: "/v1/me/proactive-settings", headers: { ...headers, "transfer-encoding": "chunked" } })).statusCode, 400);
    for (const url of ["/v1/me/proactive-settings", "/v1/me/proactive-intents", `/v1/me/proactive-intents/${ids.intent}`,
      "/v1/me/proactive-registration", `/v1/me/conversations/${ids.topic}/read-state`])
      assert.equal((await f.http.inject({ method: "HEAD", url, headers })).statusCode, 404);
    assert.equal(f.store.settingsValue.revision, 0);
  } finally { await f.http.close(); }
});

test("malformed JSON, unsupported media and excessive bodies use existing N01 status/envelope", async () => {
  const f = await server();
  try {
    for (const contentType of ["application/json", "application/octet-stream"]) {
      const r = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings",
        headers: { ...headers, "content-type": contentType }, payload: "{" });
      assert.equal(r.statusCode, 400); assert.equal(r.json().error.code, "REQUEST_INVALID");
    }
    const huge = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-registration",
      headers, payload: { junk: "x".repeat(9000) } });
    assert.equal(huge.statusCode, 413); assert.equal(huge.json().error.code, "REQUEST_TOO_LARGE");
  } finally { await f.http.close(); }
});

test("authenticate precedes malformed body handling; current caller is reverified before effects", async () => {
  const f = await server();
  try {
    assert.equal((await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings", headers: { "content-type": "application/json" }, payload: "{" })).statusCode, 401);
    assert.equal(f.identityCalls(), 0);
    const response = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-settings", headers, payload: settings(f) });
    assert.equal(response.statusCode, 200); assert(f.identityCalls() >= 2);
  } finally { await f.http.close(); }
});

test("registration accepts only a well-formed token and all reads omit the raw routing value", async () => {
  const f = await server();
  try {
    const payload = { expectedRevision: 0, installationRef: ids.installation, registrationKind: "fcm_token", registrationValue: "synthetic-private-token", enabled: true };
    for (const patch of [{ registrationKind: "firebase_installation_id" }, { registrationValue: "\ud800" }, { registrationValue: "x".repeat(4097) }])
      assert.equal((await f.http.inject({ method: "PUT", url: "/v1/me/proactive-registration", headers, payload: { ...payload, ...patch } })).statusCode, 422);
    const saved = await f.http.inject({ method: "PUT", url: "/v1/me/proactive-registration", headers, payload });
    assert.equal(saved.statusCode, 200); assert.equal(saved.json().registrationValue, undefined);
    Object.assign(f.store.registrationValue, { registrationValue: "accidental-private", ownerUid: "owner" });
    const read = await f.http.inject({ method: "GET", url: "/v1/me/proactive-registration", headers });
    assert.equal(read.body.includes("private"), false); assert.equal(read.json().ownerUid, undefined);
    const removed = await f.http.inject({ method: "DELETE", url: "/v1/me/proactive-registration", headers,
      payload: { installationRef: ids.installation, expectedRevision: 1 } });
    assert.equal(removed.statusCode, 200); assert.equal(removed.json().availability, "unregistered");
  } finally { await f.http.close(); }
});

test("only an existing committed visible message can advance the read watermark", async () => {
  const f = await server();
  try {
    await f.queued(); await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
    const url = `/v1/me/conversations/${ids.topic}/read-state`;
    assert.deepEqual((await f.http.inject({ method: "GET", url, headers })).json(), { revision: 0, readThroughSequence: 0 });
    assert.equal((await f.http.inject({ method: "PUT", url, headers, payload: { expectedRevision: 0, readThroughSequence: 999 } })).statusCode, 404);
    const marked = await f.http.inject({ method: "PUT", url, headers, payload: { expectedRevision: 0, readThroughSequence: 2 } });
    assert.deepEqual(marked.json(), { revision: 1, readThroughSequence: 2 });
    assert.equal(f.store.anchor, Date.parse("2026-10-20T04:00:00.000Z"));
  } finally { await f.http.close(); }
});

test("private thrown errors normalize safely and an excessive active set is not truncated into success", async () => {
  const f = await server();
  try {
    f.store.settings = async () => { throw Error("private token content"); };
    const failed = await f.http.inject({ method: "GET", url: "/v1/me/proactive-settings", headers });
    assert.equal(failed.statusCode, 503); assert.equal(failed.body.includes("private"), false);
    await f.queued(); const row = f.store.rows.get(ids.intent)!;
    f.store.activeIntents = async () => ({ kind: "ok", value: [row, row, row, row] });
    const list = await f.http.inject({ method: "GET", url: "/v1/me/proactive-intents", headers });
    assert.equal(list.statusCode, 503); assert.equal(list.json().intents, undefined);
  } finally { await f.http.close(); }
});

test("an actor invalidated at the final emit boundary closes the sink instead of reporting a false failure", async () => {
  const f = await server();
  try {
    f.app.settings = async actor => {
      const value = { ...f.store.settingsValue };
      actor.current = () => false;
      return { kind: "ok", value };
    };
    await assert.rejects(f.http.inject({ method: "GET", url: "/v1/me/proactive-settings", headers }), /destroy|closed|reset/i);
  } finally { await f.http.close(); }
});
