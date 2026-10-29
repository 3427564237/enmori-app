import { createIsolatedEventParticipation } from "../src/bootstrap/event-participation.js";
import { sourceEventId } from "../src/bootstrap/controlled-event-recommendations.js";
import { ok } from "../src/shared/domain/result.js";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildApp } from "../src/bootstrap/build-app.js";
import { createIsolatedEventBrowse } from "../src/bootstrap/isolated-event-browse.js";
import { browseId } from "../src/event-browse/domain/browse-values.js";
import type { BrowseDetail } from "../src/event-browse/ports/event-browse.js";
import { browseBatchSchema, browseDetailSchema } from "../src/event-browse/transport/schemas.js";
import { GetOnboarding } from "../src/onboarding/application/get-onboarding.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err } from "../src/shared/domain/result.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";

const profile = "/tmp/event-browse-unit-fixture";
const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  HOME: profile, USERPROFILE: profile, APPDATA: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };
const asOf = "2026-10-15T02:00:00.000Z";
const account = { username: "member_a", optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: asOf };
const item: BrowseDetail = { browseId: browseId("fixture-1")!, title: "Synthetic activity", startAt: "2026-10-16T02:00:00.000000001Z",
  externalSourceUrl: "https://ticketmaster.sg/activity/fixture-1", locationLabel: "Synthetic venue" };
const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
function fixture() {
  const gateway = new InMemoryFirestoreGateway({
    [`auth_bindings/${createAuthBindingDocumentId("owner")!}`]: { accountId: "account-a" },
    "accounts/account-a": account,
  });
  let calls = 0, mode: "items" | "empty" | "failure" | "missing" = "items";
  const read = async () => { calls++; if (mode === "failure") throw new Error("private-upstream-url-and-key"); };
  const source = {
    async firstBatch(now: string, signal: AbortSignal) { await read(); assert.equal(now, asOf); assert.equal(signal.aborted, false); return mode === "empty" ? [] : [item]; },
    async detail(id: string, now: string, signal: AbortSignal) { await read(); assert.equal(id, item.browseId); assert.equal(now, asOf); assert.equal(signal.aborted, false); return mode === "missing" ? undefined : item; },
  };
  const dependencies = { identityVerifier: { verifyIdToken: async (token: string) => token === "invalid" ? { kind: "invalid" as const }
    : token === "disabled" ? { kind: "forbidden" as const } : { kind: "verified" as const, principal: { firebaseUid: token } } },
    getOnboarding: new GetOnboarding(new FirestoreOnboardingRepository(gateway)), completeOnboarding: unavailable,
    createCheckIn: unavailable, getCheckIn: unavailable, getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable };
  return { gateway, source, dependencies, calls: () => calls, mode: (value: typeof mode) => { mode = value; },
    app: () => buildApp({ ...dependencies, isolatedSlices: { environment, eventBrowse: { source, now: () => new Date(asOf) } } }) };
}
const headers = { authorization: "Bearer owner" };
const paths = ["/v1/event-browse", `/v1/event-browse/${item.browseId}`];

test("Event browse remains absent from ordinary and controlled-demo roots; no source is consulted", async () => {
  const f = fixture();
  // Controlled-demo uses the same ordinary root without isolatedSlices.
  const app = await buildApp(f.dependencies);
  try { for (const url of paths) assert.equal((await app.inject({ url, headers })).statusCode, 404); assert.equal(f.calls(), 0); }
  finally { await app.close(); }
});

test("Event composition rejects invalid requested isolation before identity, source or listening", async () => {
  const f = fixture();
  for (const change of [{ ENMORI_ENVIRONMENT: "controlled-demo" }, { GCLOUD_PROJECT: "real-project" },
    { FIRESTORE_EMULATOR_HOST: "example.invalid:8080" }, { GOOGLE_APPLICATION_CREDENTIALS: "never-read" }, { HOME: "other-profile" }]) {
    await assert.rejects(buildApp({ ...f.dependencies, isolatedSlices: { environment: { ...environment, ...change }, eventBrowse: { source: f.source } } }));
  }
  assert.equal(f.calls(), 0);
});

test("both protected reads reject missing/invalid/disabled identity with no source call and no-store", async () => {
  const f = fixture(), app = await f.app();
  try { for (const url of paths) for (const token of [undefined, "invalid", "disabled"]) {
    const r = await app.inject({ url, ...(token === undefined ? {} : { headers: { authorization: `Bearer ${token}` } }) });
    assert.equal(r.statusCode, token === "disabled" ? 403 : 401); assert.equal(r.headers["cache-control"], "no-store");
  } assert.equal(f.calls(), 0); } finally { await app.close(); }
});

test("trusted UID selects its own completed Account; request spoofing and incomplete owner cannot reach source", async () => {
  const f = fixture(), app = await f.app();
  try { for (const url of paths) {
    const r = await app.inject({ url, headers: { authorization: "Bearer newcomer", "x-owner-id": "owner" } });
    assert.equal(r.statusCode, 409); assert.equal(r.json().error.code, "ONBOARDING_REQUIRED");
  } assert.equal(f.calls(), 0); } finally { await app.close(); }
});

test("completed owner with optional processing rejected gets minimized fresh results and makes no database writes", async () => {
  const f = fixture(), app = await f.app(), before = f.gateway.entries();
  try {
    for (let i = 0; i < 2; i++) {
      const r = await app.inject({ url: paths[0]!, headers }); assert.equal(r.statusCode, 200);
      assert.deepEqual(r.json(), { asOf, scope: "ticketmaster_sg_first_batch_v1", items: [{ browseId: item.browseId, title: item.title, startAt: item.startAt,locationLabel:item.locationLabel }] });
      assert.equal(r.headers["cache-control"], "no-store");
    }
    const detail = await app.inject({ url: paths[1]!, headers }); assert.equal(detail.statusCode, 200); assert.deepEqual(detail.json(), item);
    assert.equal(detail.headers["cache-control"], "no-store"); assert.equal(f.calls(), 3); assert.deepEqual(f.gateway.entries(), before);
  } finally { await app.close(); }
});

test("Account authority is reread; corrupt or deleted owner never becomes a successful empty batch", async () => {
  const f = fixture(), app = await f.app();
  try {
    assert.equal((await app.inject({ url: paths[0]!, headers })).statusCode, 200);
    await f.gateway.runTransaction(async tx => tx.set("accounts/account-a", { ...account, username: "INVALID" }));
    const corrupt = await app.inject({ url: paths[0]!, headers }); assert.equal(corrupt.statusCode, 503); assert.equal(f.calls(), 1);
    await f.gateway.runTransaction(async tx => { assert.ok(tx.delete); tx.delete("accounts/account-a"); });
    assert.equal((await app.inject({ url: paths[1]!, headers })).statusCode, 503); assert.equal(f.calls(), 1);
  } finally { await app.close(); }
});

test("unknown query/body/cursor inputs fail without consulting source; authentication precedes validation", async () => {
  const f = fixture(), app = await f.app();
  try {
    for (const url of [paths[0]! + "?page=1", paths[1]! + "?owner=owner", paths[0]! + "?cursor=x&cursor=y"]) {
      assert.equal((await app.inject({ url, headers })).statusCode, 400);
      assert.equal((await app.inject({ url })).statusCode, 401);
    }
    assert.equal((await app.inject({ method: "GET", url: paths[0]!, headers, payload: { owner: "owner" } })).statusCode, 400);
    assert.equal(f.calls(), 0);
  } finally { await app.close(); }
});

test("noncanonical browse IDs and missing detail are protected unavailable; no replacement lookup", async () => {
  const f = fixture(), app = await f.app();
  try {
    for (const id of ["tm_A", "tm_Zm9v=", "tm__w", "other_foo"]) {
      const r = await app.inject({ url: `/v1/event-browse/${id}`, headers }); assert.equal(r.statusCode, 404); assert.equal(r.json().error.code, "EVENT_UNAVAILABLE");
    }
    assert.equal(f.calls(), 0); f.mode("missing");
    assert.equal((await app.inject({ url: paths[1]!, headers })).statusCode, 404); assert.equal(f.calls(), 1);
  } finally { await app.close(); }
});

test("source-defined valid empty succeeds; thrown source failure is sanitized 503, never empty success", async () => {
  const f = fixture(), app = await f.app();
  try {
    f.mode("empty"); const empty = await app.inject({ url: paths[0]!, headers }); assert.equal(empty.statusCode, 200); assert.deepEqual(empty.json().items, []);
    f.mode("failure"); for (const url of paths) {
      const r = await app.inject({ url, headers }); assert.equal(r.statusCode, 503); assert.equal(r.json().error.code, "SERVICE_UNAVAILABLE");
      assert.equal(r.headers["cache-control"], "no-store"); assert.equal(r.body.includes("private-upstream"), false);
    }
  } finally { await app.close(); }
});

test("Event browse cancellation drops late source result and performs no later source read", async () => {
  const f = fixture(), abort = new AbortController(); let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; }); let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const browse = createIsolatedEventBrowse(f.dependencies.getOnboarding, { source: {
    async firstBatch() { entered(); await waiting; return [item]; }, detail: f.source.detail,
  } });
  const result = browse.read({ firebaseUid: "owner" }, undefined, abort.signal);
  await started; abort.abort(); release(); assert.deepEqual(await result, err(appFailure("SERVICE_UNAVAILABLE")));
  assert.deepEqual(await browse.read({ firebaseUid: "owner" }, undefined, abort.signal), err(appFailure("SERVICE_UNAVAILABLE")));
});

test("normative Event success schemas, error status union and cache headers match the selected two reads", async () => {
  const api = JSON.parse(await readFile("api/openapi.json", "utf8"));
  for (const [path, schema, errors] of [["/v1/event-browse", browseBatchSchema, [400, 401, 403, 409, 503]],
    ["/v1/event-browse/{browseId}", browseDetailSchema, [400, 401, 403, 404, 409, 503]]] as const) {
    const op = api.paths[path].get;
    assert.deepEqual(op.security, [{ bearerAuth: [] }]); assert.equal(op.requestBody, undefined);
    assert.deepEqual(op.responses[200].content["application/json"].schema, schema);
    assert.deepEqual(Object.keys(op.responses).map(Number), [200, ...errors]);
    for (const response of Object.values(op.responses) as { headers: Record<string, { schema: unknown }> }[]) {
      assert.deepEqual(response.headers["Cache-Control"]!.schema, { type: "string", const: "no-store" });
    }
  }
});

test("shared router accepts the approved 174-character occurrence locator without truncation", async () => {
  const f = fixture(), id = browseId("x".repeat(128))!; assert.equal(id.length, 174);
  let received: string | undefined;
  const app = await buildApp({ ...f.dependencies, isolatedSlices: { environment, eventBrowse: {
    source: { ...f.source, async detail(value) { received = value; return { ...item, browseId: value }; } },
  } } });
  try {
    const r = await app.inject({ url: `/v1/event-browse/${id}`, headers });
    assert.equal(r.statusCode, 200); assert.equal(received, id); assert.equal(r.json().browseId, id);
    assert.equal(r.headers["cache-control"], "no-store");
  } finally { await app.close(); }
});

test("framework-rejected Event locators preserve identity/account ordering, safe errors and unrelated routes", async () => {
  const f = fixture(), app = await f.app(), ordinary = await buildApp(f.dependencies);
  try {
    for (const raw of ["%ZZ", "%FF", "tm_" + "x".repeat(172)]) {
      for (const [token, status, code] of [[undefined, 401, "AUTH_REQUIRED"], ["disabled", 403, "AUTH_FORBIDDEN"],
        ["newcomer", 409, "ONBOARDING_REQUIRED"], ["owner", 404, "EVENT_UNAVAILABLE"]] as const) {
        const r = await app.inject({ url: `/v1/event-browse/${raw}`, ...(token === undefined ? {} : { headers: { authorization: `Bearer ${token}` } }) });
        assert.equal(r.statusCode, status); assert.equal(r.json().error.code, code); assert.equal(r.headers["cache-control"], "no-store");
        assert.equal(r.body.includes(raw), false);
      }
    }
    assert.equal(f.calls(), 0);
    for (const url of ["/other/%ZZ", "/v1/me/personas/%ZZ"]) {
      const [a, b] = await Promise.all([app.inject({ url }), ordinary.inject({ url })]);
      assert.equal(a.statusCode, b.statusCode); assert.deepEqual(a.json(), b.json());
    }
  } finally { await app.close(); await ordinary.close(); }
});


test("isolated root selects one paged browse registration and persists participation through HTTP", async () => {
  const f = fixture();
  const source = { ...f.source, async batch(_asOf: string, page: number) {
    return { items: page === 0 ? [item] : [], ...(page === 0 ? { nextPage: 1 } : {}) };
  } };
  const feature = createIsolatedEventParticipation({ environment, firestore: f.gateway,
    clock: { now: () => ok(new Date(asOf)) }, source, cursorKey: new Uint8Array(32).fill(7) });
  const app = await buildApp({ ...f.dependencies, isolatedSlices: { environment,
    eventBrowse: { source }, eventParticipation: feature } });
  const id = sourceEventId(item.browseId), path = `/v1/events/${id}/participation`;
  try {
    assert.equal((await app.inject({ url: path })).statusCode, 401);
    const first = await app.inject({ url: paths[0]!, headers });
    assert.equal(first.statusCode, 200); assert.ok(first.json().nextCursor);
    const next = await app.inject({ url: `${paths[0]}?cursor=${first.json().nextCursor}`, headers });
    assert.equal(next.statusCode, 200); assert.deepEqual(next.json().items, []);
    assert.equal(next.json().nextCursor, undefined);
    const saved = await app.inject({ method: 'PUT', url: path, headers,
      payload: { status: 'going', ignored: false, expectedRevision: 0 } });
    assert.equal(saved.statusCode, 200); assert.equal(saved.json().participation.revision, 1);
    assert.equal((await app.inject({ url: path, headers })).json().participation.status, 'going');
    const own = await app.inject({ url: '/v1/me/event-participations', headers });
    assert.equal(own.statusCode, 200); assert.equal(own.json().items[0].eventId, id);
    assert.equal((await app.inject({ method: 'PUT', url: path, headers,
      payload: { status: 'interested', ignored: false, expectedRevision: 0 } })).statusCode, 412);
    f.mode('failure');
    const cancel = await app.inject({ method: 'PUT', url: path, headers,
      payload: { status: 'none', ignored: false, expectedRevision: 1 } });
    assert.equal(cancel.statusCode, 200);
    const ordinary = await buildApp(f.dependencies);
    try { assert.equal((await ordinary.inject({ url: path, headers })).statusCode, 404); }
    finally { await ordinary.close(); }
  } finally { await app.close(); }
});
