import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { createControlledEventBrowse } from "../../src/bootstrap/controlled-event-browse.js";
import { createControlledEventRecommendations } from "../../src/bootstrap/controlled-event-recommendations.js";
import { createIsolatedEventParticipation } from "../../src/bootstrap/event-participation.js";
import { EventBrowse } from "../../src/event-browse/application/event-browse.js";
import { browseId } from "../../src/event-browse/domain/browse-values.js";
import { sourceEventId } from "../../src/event-browse/domain/source-event-id.js";
import { CombinedEventSource } from "../../src/event-browse/infrastructure/combined-event-source.js";
import { OnePaBrowseSource } from "../../src/event-browse/infrastructure/onepa-browse-source.js";
import type { BrowseSource } from "../../src/event-browse/ports/event-browse.js";
import type { AppFailure } from "../../src/shared/application/app-failure.js";
import { ok, type Result } from "../../src/shared/domain/result.js";
import { EVENT_TEST_UID, eventTestRecords } from "../support/event-repository-contract.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";

const profile = "/tmp/enmori-onepa-pending-time-test";
// Validation input only: no SDK, filesystem profile or emulator is opened.
const environment = {
  ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  HOME: profile, USERPROFILE: profile, APPDATA: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-onepa-pending-time",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
};
const signal = () => new AbortController().signal;
const principal = { firebaseUid: EVENT_TEST_UID };

function fixture() {
  const startMs = Math.ceil(Date.now() / 1000) * 1000 + 60000;
  const start = new Date(startMs).toISOString();
  const early = new Date(startMs - 1000).toISOString();
  const wall = (ms: number) => new Date(ms + 8 * 3600000).toISOString().slice(0, 19) + "+00:00";
  const rawId = "9912345678", url = "https://www.onepa.gov.sg/events/synthetic-" + rawId;
  const product = {
    ID: "PA-Event-" + rawId, Name: "Synthetic time-boundary activity", Active: true,
    xp: {
      Private: 0, Published: true, InvitationOnly: 0, UsePassword: 0,
      ProductType: "Event", Timezone: "8.0", Event: { Id: Number(rawId) },
      StartDate: wall(startMs), EndDate: wall(startMs + 3600000),
      XmcDescription: "Synthetic exact detail.",
    },
  };
  const html = (isPrivate = false) => '<script id="__NEXT_DATA__">' + JSON.stringify({
    props: { pageProps: {
      page: { layout: { sitecore: { route: { fields: { currentProduct: {
        value: { ...product, xp: { ...product.xp, Private: isPrivate ? 1 : 0 } },
      } } } } } }, componentProps: {},
    } },
  }) + "</script>";
  const held = Promise.withResolvers<string>();
  const started = Promise.withResolvers<void>();
  let providerReads = 0;
  const source = new OnePaBrowseSource(() => true, async actual => {
    assert.equal(actual, url);
    providerReads++;
    started.resolve();
    return held.promise;
  }, async () => ({ items: [{ product, url }], complete: true }));
  const empty: BrowseSource = {
    firstBatch: async () => [], batch: async () => ({ items: [] }),
    detail: async () => undefined, event: async () => undefined,
  };
  // Retain runtime's CombinedEventSource/status path and projection gate.
  const gate = createControlledEventBrowse({
    source: new CombinedEventSource(empty, source), projectionCache: true,
    running: () => true, track: work => work(),
  });
  gate.enable();
  let now = early;
  const clock = { now: () => ok(new Date(now)) };
  const records = eventTestRecords();
  const gateway = new InMemoryFirestoreGateway(records);
  const before = gateway.entries();
  const stable = createControlledEventRecommendations({
    source: gate.source, clock,
    gateway: { get: async path => records[path], listEvents: async () => [] },
  }).eventDetail;
  const participation = createIsolatedEventParticipation({
    environment, firestore: gateway, clock, source: gate.source,
    cursorKey: new Uint8Array(32).fill(7),
  });
  const browse = new EventBrowse({ verify: async () => ok(undefined) }, gate.source, () => new Date(now), true);
  const locator = browseId(product.ID, "pa")!, id = sourceEventId(locator);
  return {
    start, early, source, gate, stable, browse, participation, gateway, before, id, locator,
    started: started.promise, reads: () => providerReads,
    setLate: (offsetMs = 0) => { now = new Date(startMs + offsetMs).toISOString(); },
    release: (isPrivate = false) => held.resolve(html(isPrivate)),
    reject: () => held.reject(new Error("Synthetic source unavailable")),
  };
}
type Fixture = ReturnType<typeof fixture>;
function read(f: Fixture, method: "stable" | "browse") {
  return method === "stable"
    ? f.stable.execute(principal, f.id)
    : f.browse.read(principal, f.locator, signal());
}
function save(f: Fixture) {
  return f.participation.operations.save(EVENT_TEST_UID, f.id, {
    status: "going", ignored: false, expectedRevision: 0,
  });
}
function unavailable(result: Result<unknown, AppFailure>) {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "EVENT_UNAVAILABLE");
}
async function joinPending() {
  // All injected ports resolve in microtasks except the held page. A full turn
  // admits the second caller before releasing it, without a timed sleep.
  await setImmediate();
}

for (const offset of [0, 1]) {
  const boundary = offset === 0 ? "at start" : "after start";
  for (const method of ["stable", "browse"] as const) {
    test(`onePA pending ${method}: a caller ${boundary} cannot inherit an earlier future row`, async () => {
      const f = fixture();
      try {
        const first = read(f, method);
        await f.started;
        f.setLate(offset);
        const joined = read(f, method);
        await joinPending();
        f.release();
        const [earlier, later] = await Promise.all([first, joined]);
        assert.equal(earlier.ok, true, "first request retains its original asOf after the clock advances");
        unavailable(later);
        assert.equal(f.reads(), 1);
        assert.deepEqual(f.gateway.entries(), f.before);
      } finally { f.gate.disable(); }
    });
  }

  test(`onePA pending participation: new Going ${boundary} is rejected without mutation`, async () => {
    const f = fixture();
    try {
      const first = f.stable.execute(principal, f.id);
      await f.started;
      f.setLate(offset);
      const joined = save(f);
      await joinPending();
      f.release();
      const [earlier, later] = await Promise.all([first, joined]);
      assert.equal(earlier.ok, true);
      unavailable(later);
      assert.equal(f.reads(), 1);
      assert.deepEqual(f.gateway.entries(), f.before, "no new participation or existing account mutation");
    } finally { f.gate.disable(); }
  });

  test(`onePA cold participation ${boundary} remains unavailable`, async () => {
    const f = fixture();
    try {
      f.setLate(offset);
      const pending = save(f);
      await f.started;
      f.release();
      unavailable(await pending);
      assert.equal(f.reads(), 1);
      assert.deepEqual(f.gateway.entries(), f.before);
    } finally { f.gate.disable(); }
  });

  test(`onePA completed cache ${boundary} rejects detail and new selection without another read`, async () => {
    const f = fixture();
    try {
      const first = f.stable.execute(principal, f.id);
      await f.started;
      f.release();
      assert.equal((await first).ok, true);
      f.setLate(offset);
      unavailable(await read(f, "stable"));
      unavailable(await read(f, "browse"));
      unavailable(await save(f));
      assert.equal(f.reads(), 1);
      assert.deepEqual(f.gateway.entries(), f.before);
    } finally { f.gate.disable(); }
  });
}

test("onePA pending callers before start both succeed through one acquisition", async () => {
  const f = fixture();
  try {
    const first = f.stable.execute(principal, f.id);
    await f.started;
    const joined = f.stable.execute(principal, f.id);
    await joinPending();
    f.release();
    const results = await Promise.all([first, joined]);
    assert.deepEqual(results.map(result => result.ok), [true, true]);
    assert.equal(f.reads(), 1);
    assert.deepEqual(f.gateway.entries(), f.before);
  } finally { f.gate.disable(); }
});

for (const outcome of ["private", "failed"] as const) {
  test(`onePA pending ${outcome} source remains unavailable for both times without extra acquisition`, async () => {
    const f = fixture();
    try {
      const first = f.source.event(f.id, f.early, signal());
      await f.started;
      const joined = f.source.detail(f.locator, f.start, signal());
      const results = Promise.allSettled([first, joined]);
      await joinPending();
      if (outcome === "failed") f.reject(); else f.release(true);
      const settled = await results;
      for (const result of settled) {
        assert.equal(result.status, outcome === "failed" ? "rejected" : "fulfilled");
        if (result.status === "fulfilled") assert.equal(result.value, undefined);
      }
      assert.equal(f.reads(), 1);
      assert.deepEqual(f.gateway.entries(), f.before);
    } finally { f.gate.disable(); }
  });
}
