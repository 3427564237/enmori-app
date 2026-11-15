import assert from "node:assert/strict";
import test from "node:test";
import { EVENT_FORMULA_VERSION, rankEvents, type EventScoringInput } from
  "../../src/event-recommendations/domain/rank-events.js";

const asOf = 1_000n;
function event(eventId: string, changes: Partial<EventScoringInput> = {}): EventScoringInput {
  return { eventId, active: true, published: true, startInstant: 2_000n,
    interestTagIds: ["tag_a"], ...changes };
}
function rank(events: readonly EventScoringInput[], selected = ["tag_a", "tag_b"]) {
  return rankEvents({ asOf, activeSelectedInterestTagIds: selected, events });
}

test("Q03 orders score descending before start and identity ascending", () => {
  const result = rank([
    event("ev_z"), event("ev_a"),
    event("ev_early", { startInstant: 1_500n }),
    event("ev_match2", { startInstant: 2_500n, interestTagIds: ["tag_b", "tag_a"] }),
  ]);
  assert.deepEqual(result.map((entry) => entry.eventId),
    ["ev_match2", "ev_early", "ev_a", "ev_z"]);
});

test("distinct identity intersections are the only score and breakdown", () => {
  const [result] = rank([event("ev_a", {
    interestTagIds: ["tag_b", "tag_a", "tag_a", "unselected"],
  })], ["tag_a", "tag_a", "tag_b"]);
  assert.deepEqual(result, {
    eventId: "ev_a", startInstant: 2_000n, matchedInterestTagIds: ["tag_a", "tag_b"],
    score: 2, factor: { factorCode: "interest_match_count", matchedCount: 2,
      points: 2, formulaVersion: EVENT_FORMULA_VERSION },
  });
});

test("exact asOf, ongoing and past Events are ineligible", () => {
  assert.deepEqual(rank([
    event("exact", { startInstant: asOf }),
    event("ongoing", { startInstant: 900n }),
    event("past", { startInstant: 100n }),
  ]), []);
});

test("one nanosecond after asOf remains future without millisecond truncation", () => {
  assert.equal(rank([event("future", { startInstant: asOf + 1n })]).length, 1);
});

test("inactive, unpublished and zero-match Events cannot become fallback", () => {
  assert.deepEqual(rank([
    event("inactive", { active: false }), event("draft", { published: false }),
    event("no_match", { interestTagIds: ["other"] }),
    event("no_tags", { interestTagIds: [] }),
  ]), []);
});

test("empty selected interests is successful empty input", () => {
  assert.deepEqual(rank([event("ev_a")], []), []);
});

test("empty source identity does not enter ranking", () => {
  assert.deepEqual(rank([event("")]), []);
});

test("duplicate Event identity contributes once, independent of Tag reference order", () => {
  const result = rank([
    event("ev_a", { interestTagIds: ["tag_b", "tag_a", "tag_a"] }),
    event("ev_a", { interestTagIds: ["tag_a", "tag_b"] }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.score, 2);
});

test("conflicting projections of one identity fail closed in either input order", () => {
  const inputs = [event("ev_a"), event("ev_a", { active: false }), event("ev_ok")];
  assert.deepEqual(rank(inputs).map((entry) => entry.eventId), ["ev_ok"]);
  assert.deepEqual(rank([...inputs].reverse()), rank(inputs));
});

test("reproducibility does not depend on candidate or selected-reference order", () => {
  const inputs = [event("z"), event("a"),
    event("first", { interestTagIds: ["tag_b", "tag_a"] })];
  assert.deepEqual(rank(inputs), rank([...inputs].reverse(), ["tag_b", "tag_a"]));
  assert.deepEqual(rank(inputs), rank(inputs));
});

test("canonical identity ties are case-sensitive and locale-independent", () => {
  assert.deepEqual(rank([event("ev_a"), event("ev_Z"), event("ev_A")])
    .map((entry) => entry.eventId), ["ev_A", "ev_Z", "ev_a"]);
});

test("pure evaluation does not mutate caller-owned arrays or records", () => {
  const candidate = Object.freeze(event("ev_a", {
    interestTagIds: Object.freeze(["tag_b", "tag_a"]),
  }));
  const events = Object.freeze([candidate]);
  const selected = Object.freeze(["tag_b", "tag_a"]);
  rankEvents({ asOf, events, activeSelectedInterestTagIds: selected });
  assert.deepEqual(candidate.interestTagIds, ["tag_b", "tag_a"]);
  assert.deepEqual(selected, ["tag_b", "tag_a"]);
});

for (const formulaVersion of ['event_recommendation_v2', 'event_recommendation_v3'] as const) {
  test(`${formulaVersion}: one interest match precedes the maximum social/location/age score without a match`, () => {
    const inputs = [
      event('music', { interestTagIds: ['music'], visibleFriendCount: 1000,
        sameRegion: true, sameArea: true, targetAgeMatch: true, startInstant: 1_500n }),
      event('gaming', { interestTagIds: ['gaming'], startInstant: 3_000n }),
    ];
    const run = (events: readonly EventScoringInput[]) => rankEvents({
      formulaVersion, asOf, activeSelectedInterestTagIds: ['gaming'], events,
    });
    const ranked = run(inputs);
    assert.deepEqual(ranked.map(x => x.eventId), ['gaming', 'music']);
    assert.equal(ranked[0]!.score, 4);
    assert.ok(ranked[1]!.score > ranked[0]!.score);
    assert.deepEqual(ranked[1]!.matchedInterestTagIds, []);
    assert.ok(!ranked[1]!.reasons!.some(x => x.code === 'shared_interests'));
    assert.deepEqual(run([...inputs].reverse()), ranked);
  });

  test(`${formulaVersion}: both groups retain score, time and identity order; no selected interests retains other signals`, () => {
    const inputs = [
      event('match_z'), event('match_a'), event('match_early', { startInstant: 1_500n }),
      event('match_social', { visibleFriendCount: 1 }),
      event('other_social', { interestTagIds: ['other'], visibleFriendCount: 5 }),
      event('other_z', { interestTagIds: [], sameRegion: true }),
      event('other_a', { interestTagIds: [], sameRegion: true }),
      event('other_early', { interestTagIds: [], sameRegion: true, startInstant: 1_500n }),
      event('no_signal', { interestTagIds: [] }),
      event('past_match', { startInstant: asOf }),
      event('inactive_match', { active: false }),
    ];
    const run = (selected: string[]) => rankEvents({
      formulaVersion, asOf, activeSelectedInterestTagIds: selected, events: inputs,
    });
    assert.deepEqual(run(['tag_a']).map(x => x.eventId), [
      'match_social', 'match_early', 'match_a', 'match_z',
      'other_social', 'other_early', 'other_a', 'other_z',
    ]);
    assert.deepEqual(run([]).map(x => x.eventId), [
      'other_social', 'match_social', 'other_early', 'other_a', 'other_z',
    ]);
  });
}

test('v3 area and age still differentiate candidates within either interest group', () => {
  const ranked = rankEvents({ formulaVersion: 'event_recommendation_v3', asOf,
    activeSelectedInterestTagIds: ['tag_a'], events: [
      event('match_plain'), event('match_age', { targetAgeMatch: true }),
      event('match_area', { sameArea: true }),
      event('other_age', { interestTagIds: [], targetAgeMatch: true }),
      event('other_area', { interestTagIds: [], sameArea: true }),
    ] });
  assert.deepEqual(ranked.map(x => x.eventId), [
    'match_area', 'match_age', 'match_plain', 'other_area', 'other_age',
  ]);
});
