import assert from "node:assert/strict";
import test from "node:test";
import { RecommendEvents } from "../../src/event-recommendations/application/recommend-events.js";
import type { EventRecommendationReadResult, EventRecommendationRepository,
  EventRecommendationSources } from "../../src/event-recommendations/ports/event-recommendation-repository.js";
import { ok, err } from "../../src/shared/domain/result.js";
import { dependencyUnavailable } from "../../src/shared/ports/dependency-failure.js";

const now = "2026-09-15T00:00:00.000Z";
const principal = { firebaseUid: "synthetic-requester" };
const clock = { now: () => ok(new Date(now)) };
function sources(): EventRecommendationSources {
  return {
    selectedInterestTagIds: ["tag_active", "tag_inactive", "tag_missing"],
    interestTags: [
      { interestTagId: "tag_active", displayName: "Active label", lifecycleState: "active" },
      { interestTagId: "tag_inactive", displayName: "Inactive label", lifecycleState: "inactive" },
    ],
    events: ["ev_c", "ev_b", "ev_a"].map((eventId) => ({
      scoring: { eventId, active: true, published: true,
        startInstant: BigInt(Date.parse("2026-09-16T00:00:00Z")) * 1_000_000n,
        interestTagIds: ["tag_inactive", "tag_active", "tag_missing"] },
      presentation: { title: eventId, startAt: "2026-09-16T00:00:00Z",
        endAt: "2026-09-16T01:00:00Z" },
    })),
  };
}
class FakeRepository implements EventRecommendationRepository {
  public result: EventRecommendationReadResult = { kind: "ready", sources: sources() };
  public queries: Parameters<EventRecommendationRepository["readForRequester"]>[0][] = [];
  public async readForRequester(query: Parameters<EventRecommendationRepository["readForRequester"]>[0]) {
    this.queries.push(query);
    return this.result;
  }
}

test("passes only verified identity and one captured server asOf to the read Port", async () => {
  const repository = new FakeRepository();
  let captures = 0;
  const result = await new RecommendEvents(repository, {
    now: () => { captures++; return clock.now(); },
  }).execute({ principal, view: "all" });
  assert.equal(captures, 1);
  assert.deepEqual(repository.queries, [{ firebaseUid: principal.firebaseUid, asOf: now }]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.asOf, now);
});

test("Home takes Top 2 only after full ordering; All preserves complete order", async () => {
  const useCase = new RecommendEvents(new FakeRepository(), clock);
  for (const view of ["home", "all"] as const) {
    const result = await useCase.execute({ principal, view });
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.value.items.map((event) => event.eventId),
      view === "home" ? ["ev_a", "ev_b"] : ["ev_a", "ev_b", "ev_c"]);
  }
});

test("Home handles zero, one and two eligible Events without padding", async () => {
  for (const count of [0, 1, 2]) {
    const repository = new FakeRepository();
    const data = sources();
    repository.result = { kind: "ready", sources: { ...data, events: data.events.slice(0, count) } };
    const result = await new RecommendEvents(repository, clock).execute({ principal, view: "home" });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.items.length, count);
  }
});

test("inactive and deleted/missing catalogue references never score or expose labels", async () => {
  const result = await new RecommendEvents(new FakeRepository(), clock).execute({ principal, view: "all" });
  assert.equal(result.ok, true);
  if (result.ok) for (const event of result.value.items) {
    assert.deepEqual(event.matchedInterests,
      [{ interestTagId: "tag_active", displayName: "Active label" }]);
    assert.deepEqual(Object.keys(event).sort(),
      ["eventId", "title", "startAt", "endAt", "matchedInterests"].sort());
  }
});

test("restoring the same existing Interest identity changes subsequent matching", async () => {
  const repository = new FakeRepository();
  const data = sources();
  repository.result = { kind: "ready", sources: { ...data, selectedInterestTagIds: ["tag_inactive"] } };
  const useCase = new RecommendEvents(repository, clock);
  const before = await useCase.execute({ principal, view: "all" });
  assert.equal(before.ok, true);
  if (before.ok) assert.deepEqual(before.value.items, []);
  repository.result = { kind: "ready", sources: {
    ...data, selectedInterestTagIds: ["tag_inactive"],
    interestTags: data.interestTags.map((tag) => ({ ...tag, lifecycleState: "active" })),
  } };
  const after = await useCase.execute({ principal, view: "all" });
  assert.equal(after.ok, true);
  if (after.ok) assert.equal(after.value.items.length, 3);
});

test("empty own selection is successful empty, not an unavailable dependency", async () => {
  const repository = new FakeRepository();
  repository.result = { kind: "ready", sources: { ...sources(), selectedInterestTagIds: [] } };
  const result = await new RecommendEvents(repository, clock).execute({ principal, view: "all" });
  assert.deepEqual(result, { ok: true, value: {
    asOf: now, formulaVersion: "event_recommendation_v1", items: [],
  } });
});

test("stable account and dependency denials cannot become empty success", async () => {
  for (const [kind, code] of [
    ["onboarding_required", "ONBOARDING_REQUIRED"], ["forbidden", "AUTH_FORBIDDEN"],
    ["dependency_unavailable", "SERVICE_UNAVAILABLE"],
  ] as const) {
    const repository = new FakeRepository();
    repository.result = { kind };
    const result = await new RecommendEvents(repository, clock).execute({ principal, view: "all" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.failure.code, code);
  }
});

test("failed or invalid Clock fails closed before the read Port", async () => {
  for (const failingClock of [
    { now: () => err(dependencyUnavailable) }, { now: () => ok(new Date(NaN)) },
  ]) {
    const repository = new FakeRepository();
    const result = await new RecommendEvents(repository, failingClock).execute({ principal, view: "all" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.failure.code, "SERVICE_UNAVAILABLE");
    assert.deepEqual(repository.queries, []);
  }
});

test("Home and All recapture time and reread sources; no snapshot or cached result", async () => {
  const repository = new FakeRepository();
  let captures = 0;
  const useCase = new RecommendEvents(repository, {
    now: () => ok(new Date(Date.parse(now) + captures++ * 86_400_000)),
  });
  const home = await useCase.execute({ principal, view: "home" });
  const all = await useCase.execute({ principal, view: "all" });
  assert.equal(home.ok && all.ok, true);
  if (home.ok && all.ok) {
    assert.equal(home.value.items.length, 2);
    assert.deepEqual(all.value.items, []);
    assert.notEqual(home.value.asOf, all.value.asOf);
  }
  assert.equal(repository.queries.length, 2);
});

test("presentation titles and safe label renames cannot reorder Events", async () => {
  const repository = new FakeRepository();
  const data = sources();
  repository.result = { kind: "ready", sources: {
    ...data, interestTags: data.interestTags.map((tag) => ({ ...tag, displayName: "Renamed label" })),
    events: data.events.map((entry, index) => ({ ...entry,
      presentation: { ...entry.presentation, title: ["AAA", "BBB", "ZZZ"][index]! } })),
  } };
  const result = await new RecommendEvents(repository, clock).execute({ principal, view: "all" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.items.map((event) => event.eventId), ["ev_a", "ev_b", "ev_c"]);
    assert.equal(result.value.items[0]!.title, "ZZZ");
    assert.equal(result.value.items[0]!.matchedInterests[0]!.displayName, "Renamed label");
  }
});

test("explicit presentation allowlist does not propagate undeclared source fields", async () => {
  const repository = new FakeRepository();
  const data = sources();
  repository.result = { kind: "ready", sources: {
    ...data, events: data.events.map((entry) => ({ ...entry,
      presentation: { ...entry.presentation, protectedReason: "synthetic-private-marker",
        ownerAccountId: "synthetic-unrelated-account" } })),
  } };
  const result = await new RecommendEvents(repository, clock).execute({ principal, view: "all" });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes("synthetic-private-marker"), false);
  assert.equal(JSON.stringify(result).includes("synthetic-unrelated-account"), false);
});
