import assert from "node:assert/strict";
import test from "node:test";
import { ControlledSourceProjection } from "../src/event-browse/infrastructure/controlled-source-projection.js";
import { TicketmasterBrowseSource } from "../src/event-browse/infrastructure/ticketmaster-browse-source.js";
import { createControlledEventRecommendations, sourceEventId } from "../src/bootstrap/controlled-event-recommendations.js";
import { createControlledEventBrowse } from "../src/bootstrap/controlled-event-browse.js";
import { EventBrowse } from "../src/event-browse/application/event-browse.js";
import { browseId } from "../src/event-browse/domain/browse-values.js";
import { ok } from "../src/shared/domain/result.js";
import { eventTestRecords, EVENT_TEST_UID, EVENT_AS_OF } from "./support/event-repository-contract.js";
import type { BrowseOccurrence, BrowseSource } from "../src/event-browse/ports/event-browse.js";

const signal = () => new AbortController().signal;
const item = (id = "occurrence_a", title = "Same concert"): BrowseOccurrence => ({
  browseId: browseId(id)!, title, startAt: "2026-11-10T00:00:00Z", externalSourceUrl: "https://ticketmaster.sg/event/a", musicSegment: true,
});
const after = (ms: number) => new Date(Date.parse(EVENT_AS_OF) + ms).toISOString();

test("one atomic source generation serves browse/recommend/detail; exact identity survives rename, equal titles remain distinct", async () => {
  let calls = 0, now = EVENT_AS_OF;
  const source: BrowseSource = { firstBatch: async () => { calls++; return [item(), item("occurrence_b")]; }, detail: async () => { throw Error("no separate detail read"); } };
  const cache = new ControlledSourceProjection(source);
  const records = eventTestRecords();
  const joined = createControlledEventRecommendations({ gateway: { get: async path => records[path], listEvents: async () => { throw Error("no fixture events"); } }, source: cache, clock: { now: () => ok(new Date(now)) } });
  const browse = new EventBrowse({ verify: async () => ok(undefined) }, cache, () => new Date(now));
  const listed = await browse.read({ firebaseUid: EVENT_TEST_UID }, undefined, signal());
  const ranked = await joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "all" });
  assert.ok(listed.ok && ranked.ok);
  if (!ranked.ok) return;
  assert.equal(ranked.value.items.length, 2);
  const eventId = sourceEventId(item().browseId);
  assert.equal(sourceEventId(item("occurrence_a", "Renamed").browseId), eventId);
  const detail = await joined.eventDetail.execute({ firebaseUid: EVENT_TEST_UID }, eventId);
  assert.ok(detail.ok); if (detail.ok) assert.equal(detail.value.title, ranked.value.items.find(x => x.eventId === eventId)!.title);
  assert.equal(calls, 1);
  assert.equal(Object.hasOwn(ranked.value.items[0]!, "endAt"), false);
  const publicDetail = await browse.read({ firebaseUid: EVENT_TEST_UID }, item().browseId, signal());
  assert.ok(publicDetail.ok); if (publicDetail.ok) assert.equal(Object.hasOwn(publicDetail.value, "musicSegment"), false);
  now = after(300_000); await joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "all" }); assert.equal(calls, 2);
});

test("expiration failure never serves stale success and next read retries same source; disabling clears cache", async () => {
  let calls = 0, fail = false;
  const control = createControlledEventBrowse({ projectionCache: true, running: () => true, track: work => work(), source: {
    firstBatch: async () => { calls++; if (fail) throw Error("source failed"); return [item()]; }, detail: async () => undefined,
  } });
  control.enable(); await control.source.firstBatch(EVENT_AS_OF, signal());
  await control.source.firstBatch(after(299_999), signal()); assert.equal(calls, 1);
  fail = true; await assert.rejects(control.source.firstBatch(after(300_000), signal()));
  await assert.rejects(control.source.detail(item().browseId, after(300_001), signal())); assert.equal(calls, 3);
  fail = false; await control.source.firstBatch(after(300_002), signal());
  control.disable(); await assert.rejects(control.source.firstBatch(after(300_003), signal()));
  control.enable(); await control.source.firstBatch(after(300_004), signal()); assert.equal(calls, 5);
});

test("concurrent refresh publishes complete replacement and invalidation rejects original completion", async () => {
  let complete!: (items: readonly BrowseOccurrence[]) => void, calls = 0;
  const cache = new ControlledSourceProjection({ firstBatch: () => { calls++; return new Promise(resolve => { complete = resolve; }); }, detail: async () => undefined });
  const a = cache.firstBatch(EVENT_AS_OF, signal()), b = cache.firstBatch(EVENT_AS_OF, signal());
  assert.equal(calls, 1); complete([item()]); assert.deepEqual(await a, await b);
  const stale = cache.firstBatch(after(300_000), signal()); cache.clear(); complete([item("stale")]); await assert.rejects(stale);
  const fresh = cache.firstBatch(after(300_001), signal()); complete([item("replacement")]);
  assert.deepEqual((await fresh).map(x => x.browseId), [item("replacement").browseId]);
});

test("exact Music segment only; label lookalikes and other segments stay browse-only; missing end recommended", async () => {
  const row = (id: string, segment: object) => ({ id, name: "Music label", url: "https://ticketmaster.sg/event/a", dates: { start: { dateTime: "2026-11-10T00:00:00Z" }, status: { code: "onsale" } }, classifications: [{ segment }], _embedded: { venues: [{ country: { countryCode: "SG" } }] } });
  const source = new ControlledSourceProjection(new TicketmasterBrowseSource({ enabled: () => true, key: () => "synthetic" }, async () => Response.json({ page: { number: 0, totalElements: 3 }, _embedded: { events: [row("a", { id: "KZFzniwnSyZfZ7v7nJ", name: "Music" }), row("b", { id: "other", name: "Music" }), row("c", { name: "Music" })] } })));
  const records = eventTestRecords(); let providerReads = 0;
  const joined = createControlledEventRecommendations({ gateway: { get: async path => records[path], listEvents: async () => [] }, source: { firstBatch: (...args) => { providerReads++; return source.firstBatch(...args); }, detail: (...args) => source.detail(...args) }, clock: { now: () => ok(new Date(EVENT_AS_OF)) } });
  const denied = await joined.recommendEvents.execute({ principal: { firebaseUid: "not-bound" }, view: "all" }); assert.equal(denied.ok, false); assert.equal(providerReads, 0);
  assert.equal((await source.firstBatch(EVENT_AS_OF, signal())).length, 3);
  const result = await joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "all" }); assert.ok(result.ok);
  if (result.ok) { assert.equal(result.value.items.length, 1); assert.equal(result.value.items[0]!.eventId, sourceEventId(browseId("a")!)); assert.equal(Object.hasOwn(result.value.items[0]!, "endAt"), false); }
});

test("source failure is service failure even with empty interests; interest read failure never becomes empty", async () => {
  const records = eventTestRecords(); records["account_interests/s2-account"] = { interestTagIds: [], revision: 1 };
  const joined = createControlledEventRecommendations({ gateway: { get: async path => records[path], listEvents: async () => [] }, source: { firstBatch: async () => { throw Error("source unavailable"); }, detail: async () => undefined }, clock: { now: () => ok(new Date(EVENT_AS_OF)) } });
  const result = await joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "all" }); assert.equal(result.ok, false); if (!result.ok) assert.equal(result.failure.code, "SERVICE_UNAVAILABLE");
});

test("retained Music binding preserves the existing ID; another Music label is never mapped", async () => {
  const records = eventTestRecords();
  records['accounts/s2-account']!.optionalProcessingConsent = 'accepted';
  records['interest_tags/existing_music'] = records['interest_tags/interest_music']!;
  records['account_interests/s2-account'] = { interestTagIds: ['existing_music'], revision: 2 };
  const joined = createControlledEventRecommendations({
    gateway: { get: async path => records[path], listEvents: async () => [] },
    source: { firstBatch: async () => [item()], detail: async () => undefined },
    clock: { now: () => ok(new Date(EVENT_AS_OF)) },
    musicInterestTagId: 'existing_music', requireRecommendationConsent: true,
  });
  const read = () => joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: 'all' });
  const matched = await read(); assert.ok(matched.ok && matched.value.items.length === 1);
  records['account_interests/s2-account'] = { interestTagIds: ['interest_music'], revision: 3 };
  const unmapped = await read(); assert.ok(unmapped.ok && unmapped.value.items.length === 0);
});

test("retained rejected consent never reads interests; revocation during source read drops personalization", async () => {
  const records = eventTestRecords(); let interestReads = 0, revoke = false;
  const joined = createControlledEventRecommendations({
    gateway: { get: async path => { if (path.startsWith('account_interests/')) interestReads++; return records[path]; }, listEvents: async () => [] },
    source: { firstBatch: async () => { if (revoke) records['accounts/s2-account']!.optionalProcessingConsent = 'rejected'; return [item()]; }, detail: async () => undefined },
    clock: { now: () => ok(new Date(EVENT_AS_OF)) }, requireRecommendationConsent: true,
  });
  const read = () => joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: 'all' });
  const rejected = await read(); assert.ok(rejected.ok && rejected.value.items.length === 0); assert.equal(interestReads, 0);
  records['accounts/s2-account']!.optionalProcessingConsent = 'accepted'; revoke = true;
  const revoked = await read(); assert.ok(revoked.ok && revoked.value.items.length === 0); assert.equal(interestReads, 1);
});
