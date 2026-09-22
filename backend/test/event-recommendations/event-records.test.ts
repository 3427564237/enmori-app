import assert from "node:assert/strict";
import test from "node:test";
import { parseEventInstant, parseMatchingInterest, parseRecommendationEvent, parseSelectedInterests } from
  "../../src/event-recommendations/infrastructure/event-records.js";
import { eventTestRecords } from "../support/event-repository-contract.js";

test("UTC parser preserves nanoseconds and pre-epoch fractions", () => {
  assert.equal(parseEventInstant("2026-09-15T00:00:00.000000001Z")! - parseEventInstant("2026-09-15T00:00:00Z")!, 1n);
  assert.equal(parseEventInstant("1969-12-31T23:59:59.999999999Z"), -1n);
  assert.equal(parseEventInstant("2024-02-29T00:00:00.123456789Z")! % 1_000_000_000n, 123456789n);
});
test("UTC parser rejects invalid calendar, offsets and excessive fractions", () => {
  for (const invalid of ["2026-02-29T00:00:00Z", "2026-09-15T24:00:00Z", "2026-09-15T00:00:60Z",
    "2026-09-15T00:00:00+00:00", "2026-09-15T00:00:00.1234567890Z", "not-time", null]) {
    assert.equal(parseEventInstant(invalid), undefined);
  }
});
test("Event source is explicit allowlist with path-carried identity and valid duration", () => {
  const record = eventTestRecords()["events/ev_a"]!;
  assert.equal(parseRecommendationEvent("opaque-path-id", record)!.scoring.eventId, "opaque-path-id");
  for (const change of [{ eventId: "unapproved" }, { popularity: 99 }, { startAt: "invalid" },
    { endAt: record.startAt }, { title: "" }, { title: "\ud800" }, { active: "true" },
    { interestTagIds: ["unsafe/id"] }]) {
    assert.equal(parseRecommendationEvent("ev_a", { ...record, ...change }), undefined);
  }
});
test("only current valid Q12 labels/lifecycle and valid own selection map", () => {
  const valid = { displayName: "Community", lifecycleState: "active", revision: 1 };
  assert.notEqual(parseMatchingInterest("interest_community", valid), undefined);
  for (const displayName of ["", " bad ", "a\u202eb", "a\nb", "e\u0301", "x".repeat(51)]) {
    assert.equal(parseMatchingInterest("interest_community", { ...valid, displayName }), undefined);
  }
  for (const data of [{ interestTagIds: ["a", "a"], revision: 1 }, { interestTagIds: [], revision: 0 },
    { interestTagIds: [], revision: 1, ownerAccountId: "unapproved" },
    { interestTagIds: Array.from({ length: 11 }, (_, index) => `id${index}`), revision: 1 }]) {
    assert.equal(parseSelectedInterests(data), undefined);
  }
  assert.deepEqual(parseSelectedInterests({ interestTagIds: [], revision: 1 }), []);
});
