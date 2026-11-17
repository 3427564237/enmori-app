import assert from "node:assert/strict";
import test from "node:test";
import { createControlledEventBrowse } from "../../src/bootstrap/controlled-event-browse.js";
import { createControlledEventRecommendations } from "../../src/bootstrap/controlled-event-recommendations.js";
import { EventBrowse } from "../../src/event-browse/application/event-browse.js";
import { browseId } from "../../src/event-browse/domain/browse-values.js";
import { sourceEventId } from "../../src/event-browse/domain/source-event-id.js";
import { CombinedEventSource } from "../../src/event-browse/infrastructure/combined-event-source.js";
import { OnePaBrowseSource } from "../../src/event-browse/infrastructure/onepa-browse-source.js";
import { ok } from "../../src/shared/domain/result.js";
import { EVENT_TEST_UID, eventTestRecords } from "../support/event-repository-contract.js";

const fullId = "9912345678", otherId = "12345678";
const url = "https://www.onepa.gov.sg/events/synthetic-" + fullId;
const sitemap = "https://www.onepa.gov.sg/sitemap/sitemap-event.xml";
const asOf = "2026-11-17T00:00:00.000Z";
const requestedBrowseId = browseId("PA-Event-" + fullId, "pa")!;
const requestedEventId = sourceEventId(requestedBrowseId);
const signal = () => new AbortController().signal;
type Origin = "catalogue" | "sitemap";
type Method = "event" | "detail";

function product(id = fullId, linkedEventId = id) {
  return {
    ID: "PA-Event-" + id, Active: true, Name: "Synthetic public event " + id,
    xp: {
      Private: 0, Published: true, InvitationOnly: 0, UsePassword: 0,
      ProductType: "Event", Timezone: "8.0", Event: { Id: Number(linkedEventId) },
      StartDate: "2030-12-01T10:00:00+00:00", EndDate: "2030-12-01T11:00:00+00:00",
      XmcDescription: "Synthetic detail belonging to " + id,
    },
  };
}
function html(value = product()) {
  return '<script id="__NEXT_DATA__">' + JSON.stringify({
    props: { pageProps: {
      page: { layout: { sitecore: { route: { fields: { currentProduct: { value } } } } } },
      componentProps: {},
    } },
  }) + "</script>";
}

function fixture(origin: Origin, readDetail: () => Promise<string>) {
  const calls = { catalogue: 0, sitemap: 0, detail: 0 };
  const started = Promise.withResolvers<void>();
  const source = new OnePaBrowseSource(
    () => true,
    async (actual) => {
      if (actual === url) { calls.detail++; started.resolve(); return readDetail(); }
      assert.equal(origin, "sitemap", "known catalogue identity must not fan out to sitemap");
      calls.sitemap++;
      if (actual === "https://www.onepa.gov.sg/sitemap.xml") return `<loc>${sitemap}</loc>`;
      assert.equal(actual, sitemap);
      return `<loc>${url}</loc>`;
    },
    async () => {
      calls.catalogue++;
      return { items: origin === "catalogue" ? [{ product: product(), url }] : [], complete: true };
    },
  );
  return { source, calls, started: started.promise };
}
function read(source: OnePaBrowseSource, method: Method) {
  return method === "event"
    ? source.event(requestedEventId, asOf, signal())
    : source.detail(requestedBrowseId, asOf, signal());
}
function assertCalls(calls: { catalogue: number; sitemap: number; detail: number }, origin: Origin, details = 1) {
  assert.deepEqual(calls, { catalogue: 1, sitemap: origin === "catalogue" ? 0 : 2, detail: details });
}

for (const origin of ["catalogue", "sitemap"] as const) {
  for (const method of ["event", "detail"] as const) {
    test(`onePA ${origin} ${method} rejects another returned occurrence on a cold read`, async () => {
      const f = fixture(origin, async () => html(product(otherId)));
      assert.equal(await read(f.source, method), undefined);
      assertCalls(f.calls, origin);
    });

    test(`onePA ${origin} ${method} rechecks a cached returned occurrence against the request`, async () => {
      const f = fixture(origin, async () => html(product(otherId)));
      await read(f.source, method); // Prime the existing URL cache even when admission rejects the row.
      assert.equal(await read(f.source, method), undefined);
      assertCalls(f.calls, origin);
    });

    test(`onePA ${origin} ${method} rejects a coalesced wrong occurrence for every waiter`, async () => {
      const held = Promise.withResolvers<string>();
      const f = fixture(origin, () => held.promise);
      const first = read(f.source, method);
      await f.started;
      const second = read(f.source, method);
      await Promise.resolve();
      held.resolve(html(product(otherId)));
      assert.deepEqual(await Promise.all([first, second]), [undefined, undefined]);
      assertCalls(f.calls, origin);
    });

    test(`onePA ${origin} ${method} retains matching detail and its successful cache reuse`, async () => {
      const f = fixture(origin, async () => html());
      const first = await read(f.source, method), second = await read(f.source, method);
      assert.equal(first?.browseId, requestedBrowseId);
      assert.equal(first?.content?.sourceId, "PA-Event-" + fullId);
      assert.equal(first, second);
      assertCalls(f.calls, origin);
    });

    test(`onePA ${origin} ${method} does not add a new product/event/URL numeric equality rule`, async () => {
      // Existing mapping accepts this linked suffix; the returned Product ID is
      // the requested one. A provider-field equivalence is not an approved rule.
      const f = fixture(origin, async () => html(product(fullId, otherId)));
      assert.equal((await read(f.source, method))?.browseId, requestedBrowseId);
      assertCalls(f.calls, origin);
    });

    test(`onePA ${origin} ${method} preserves publication rejection as undefined`, async () => {
      const hidden = product(); hidden.xp.Published = false;
      const f = fixture(origin, async () => html(hidden));
      assert.equal(await read(f.source, method), undefined);
      assertCalls(f.calls, origin);
    });

    test(`onePA ${origin} ${method} does not turn acquisition failure into a row or automatic retry`, async () => {
      let fail = true;
      const f = fixture(origin, async () => {
        if (fail) throw Error("Synthetic source unavailable");
        return html();
      });
      await assert.rejects(read(f.source, method), /Synthetic source unavailable/);
      assertCalls(f.calls, origin);
      fail = false;
      assert.equal((await read(f.source, method))?.browseId, requestedBrowseId);
      assertCalls(f.calls, origin, 2);
    });
  }
}

function applicationFixture(returnedId: string) {
  const f = fixture("catalogue", async () => html(product(returnedId)));
  // Match the retained runtime's source composition. A raw single source lacks
  // status(), which selects the projection's legacy summary-only behavior.
  const source = new CombinedEventSource({ firstBatch: async () => [], detail: async () => undefined }, f.source);
  const gate = createControlledEventBrowse({
    source, projectionCache: true, running: () => true, track: (work) => work(),
  });
  gate.enable();
  const records = eventTestRecords();
  const stable = createControlledEventRecommendations({
    source: gate.source,
    gateway: { get: async (path) => records[path], listEvents: async () => [] },
    clock: { now: () => ok(new Date()) },
  }).eventDetail;
  const browse = new EventBrowse({ verify: async () => ok(undefined) }, gate.source, () => new Date(), true);
  return { gate, stable, browse };
}

for (const method of ["event", "detail"] as const) {
  test(`onePA ${method} application cannot expose another occurrence as the requested detail`, async () => {
    const f = applicationFixture(otherId);
    try {
      const result = method === "event"
        ? await f.stable.execute({ firebaseUid: EVENT_TEST_UID }, requestedEventId)
        : await f.browse.read({ firebaseUid: EVENT_TEST_UID }, requestedBrowseId, signal());
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.failure.code, "EVENT_UNAVAILABLE");
    } finally { f.gate.disable(); }
  });

  test(`onePA ${method} application preserves the requested identity on a matching detail`, async () => {
    const f = applicationFixture(fullId);
    try {
      if (method === "event") {
        const result = await f.stable.execute({ firebaseUid: EVENT_TEST_UID }, requestedEventId);
        assert.equal(result.ok, true);
        if (result.ok) assert.equal(result.value.eventId, requestedEventId);
      } else {
        const result = await f.browse.read({ firebaseUid: EVENT_TEST_UID }, requestedBrowseId, signal());
        assert.equal(result.ok, true);
        if (result.ok) {
          assert.ok("browseId" in result.value);
          assert.equal(result.value.browseId, requestedBrowseId);
        }
      }
    } finally { f.gate.disable(); }
  });
}
