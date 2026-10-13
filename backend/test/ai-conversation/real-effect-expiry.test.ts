import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRealEffectExpiry,
  type FullPrecisionInstant,
} from "../../src/ai-conversation/domain/real-effect-expiry.js";

// These 1 ns cases test domain mathematics, not Firestore storage precision.
const at = (seconds: number, nanoseconds = 0): FullPrecisionInstant => ({ seconds, nanoseconds });
const first = (creation: unknown, now: unknown) => evaluateRealEffectExpiry({
  creation, now, lineage: { kind: "first-message" },
});
const existing = (creation: unknown, previousValidCutoff: unknown, now: unknown) => evaluateRealEffectExpiry({
  creation, now, lineage: { kind: "existing-message", previousValidCutoff },
});
const unknownResult = { state: "unavailable", canAdvanceAnchor: false, cleanupDue: false };

test("F01-C explicit first message retains full precision for 90 days and its original 24-hour cleanup", () => {
  const result = first(at(10, 123_456_789), at(10, 123_456_789));
  assert.deepEqual(result, {
    state: "live",
    canAdvanceAnchor: true,
    expiresAt: at(7_776_010, 123_456_789),
    cleanupAt: at(7_862_410, 123_456_789),
    cleanupDue: false,
  });
});

test("F01-C 90-day expiry is immediate at equality, with no millisecond truncation or cleanup grace", () => {
  const creation = at(10, 123_456_789);
  assert.equal(first(creation, at(7_776_010, 123_456_788)).state, "live");
  for (const now of [at(7_776_010, 123_456_789), at(7_776_010, 123_456_790)]) {
    assert.deepEqual(first(creation, now), {
      state: "expired", canAdvanceAnchor: false,
      expiresAt: at(7_776_010, 123_456_789),
      cleanupAt: at(7_862_410, 123_456_789), cleanupDue: false,
    });
  }
});

test("F01-C one nanosecond before a prior cutoff can be a valid new anchor", () => {
  assert.deepEqual(existing(at(100, 999_999_999), at(101), at(101)), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: at(7_776_100, 999_999_999),
    cleanupAt: at(7_862_500, 999_999_999), cleanupDue: false,
  });
});

test("F01-C equal/after-cutoff copies never revive a Conversation or reset its original cleanup", () => {
  const oldCutoff = at(100, 999_999_999);
  for (const creation of [oldCutoff, at(101), at(172_901, 12)]) {
    assert.deepEqual(existing(creation, oldCutoff, at(200_000)), {
      state: "expired", canAdvanceAnchor: false,
      expiresAt: oldCutoff, cleanupAt: at(86_500, 999_999_999), cleanupDue: true,
    });
  }
});

test("F01-C nanoseconds on either side of a same-second cutoff have different eligibility", () => {
  const cutoff = at(100, 222_222_222);
  assert.equal(existing(at(100, 222_222_221), cutoff, cutoff).state, "live");
  for (const creation of [cutoff, at(100, 222_222_223)]) {
    const result = existing(creation, cutoff, cutoff);
    assert.equal(result.state, "expired");
    assert.equal(result.canAdvanceAnchor, false);
    assert.deepEqual(result.expiresAt, cutoff);
  }
});

test("Q14 cleanup is due at the original expiry plus exactly 24 hours, including second rollover", () => {
  const cutoff = at(100);
  assert.deepEqual(existing(cutoff, cutoff, at(86_499, 999_999_999)), {
    state: "expired", canAdvanceAnchor: false,
    expiresAt: cutoff, cleanupAt: at(86_500), cleanupDue: false,
  });
  for (const now of [at(86_500), at(86_500, 1), at(500_000)]) {
    assert.deepEqual(existing(cutoff, cutoff, now), {
      state: "expired", canAdvanceAnchor: false,
      expiresAt: cutoff, cleanupAt: at(86_500), cleanupDue: true,
    });
  }
});

test("Q14 cleanup retains sub-millisecond precision and never restarts after a delayed invocation", () => {
  const creation = at(10, 123_456_789);
  assert.equal(first(creation, at(7_862_410, 123_456_788)).cleanupDue, false);
  for (const now of [at(7_862_410, 123_456_789), at(7_862_410, 123_456_790), at(10_000_000)]) {
    assert.deepEqual(first(creation, now), {
      state: "expired", canAdvanceAnchor: false,
      expiresAt: at(7_776_010, 123_456_789),
      cleanupAt: at(7_862_410, 123_456_789), cleanupDue: true,
    });
  }
});

test("F01-C an older message cannot move an already validated retention cutoff backward", () => {
  const priorCutoff = at(7_776_100, 5);
  assert.deepEqual(existing(at(10, 1), priorCutoff, at(7_776_099)), {
    state: "live", canAdvanceAnchor: false,
    expiresAt: priorCutoff, cleanupAt: at(7_862_500, 5), cleanupDue: false,
  });
  assert.equal(existing(at(10, 1), priorCutoff, priorCutoff).state, "expired");
});

test("F01-C missing existing lineage metadata is unavailable and cannot masquerade as a first message", () => {
  for (const prior of [undefined, null, {}, { seconds: 5 }]) {
    assert.deepEqual(existing(at(1), prior, at(10_000_000)), unknownResult);
  }
  assert.equal(first(at(1), at(2)).state, "live");
});

const invalidInstants: readonly unknown[] = [
  undefined, null, [], "2026-10-13T00:00:00Z", {},
  { seconds: 1 }, { nanoseconds: 0 },
  at(0.5), at(Number.NaN), at(Number.POSITIVE_INFINITY),
  at(Number.MAX_SAFE_INTEGER + 1), at(Number.MIN_SAFE_INTEGER - 1),
  { seconds: "1", nanoseconds: 0 },
  at(1, -1), at(1, 1_000_000_000), at(1, 0.5), at(1, Number.NaN),
];

for (const field of ["creation", "now", "previousValidCutoff"] as const) {
  test(`F01-C invalid ${field} fails closed without authorizing permanent deletion`, () => {
    for (const value of invalidInstants) {
      const result = existing(
        field === "creation" ? value : at(1),
        field === "previousValidCutoff" ? value : at(100),
        field === "now" ? value : at(10_000_000),
      );
      assert.deepEqual(result, unknownResult);
      assert.equal("expiresAt" in result, false);
      assert.equal("cleanupAt" in result, false);
    }
  });
}

test("full-precision comparison works across negative seconds and beyond Date's supported range", () => {
  assert.equal(existing(at(-1, 999_999_999), at(0), at(0)).state, "live");
  const large = 8_000_000_000_000_000;
  assert.deepEqual(first(at(large, 999_999_999), at(large + 7_776_000, 999_999_998)), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: at(8_000_000_007_776_000, 999_999_999),
    cleanupAt: at(8_000_000_007_862_400, 999_999_999), cleanupDue: false,
  });
});

test("unrepresentable retention/cleanup arithmetic is unavailable, not wrapped or silently rounded", () => {
  assert.deepEqual(first(at(Number.MAX_SAFE_INTEGER), at(0)), unknownResult);
  assert.deepEqual(first(at(Number.MAX_SAFE_INTEGER - 7_776_000), at(0)), unknownResult);
  assert.deepEqual(existing(at(Number.MAX_SAFE_INTEGER), at(Number.MAX_SAFE_INTEGER), at(0)), unknownResult);
  const lastRepresentableCreation = Number.MAX_SAFE_INTEGER - 7_862_400;
  assert.deepEqual(first(at(lastRepresentableCreation, 999_999_999), at(lastRepresentableCreation)), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: at(Number.MAX_SAFE_INTEGER - 86_400, 999_999_999),
    cleanupAt: at(Number.MAX_SAFE_INTEGER, 999_999_999), cleanupDue: false,
  });
});
