import assert from "node:assert/strict";
import test from "node:test";
import type { FullPrecisionInstant } from "../../src/ai-conversation/domain/real-effect-expiry.js";
import {
  resolveRealRetention,
  type RealRetentionInventory,
  type RealRetentionMessageMetadata,
  type RealRetentionParentMetadata,
  type RealRetentionResolverInput,
} from "../../src/ai-conversation/domain/real-retention-resolver.js";

// Mathematical/projection fixtures only: no SDK, database, wall clock or content.
const OWNER = "synthetic-owner";
const CONVERSATION = "synthetic-conversation";
const RETENTION = 7_776_000;
const CLEANUP = 86_400;
const at = (seconds: number, nanoseconds = 0): FullPrecisionInstant => ({ seconds, nanoseconds });
const later = (time: FullPrecisionInstant, seconds: number): FullPrecisionInstant =>
  at(time.seconds + seconds, time.nanoseconds);
const firstTime = at(100, 123_456_789);
const firstCutoff = later(firstTime, RETENTION);
const unknownResult = { state: "unavailable", canAdvanceAnchor: false, cleanupDue: false };

function message(sequence: number, createTime: unknown, appendBefore?: unknown): RealRetentionMessageMetadata {
  return {
    ownerAccountId: OWNER, conversationId: CONVERSATION,
    messageId: `synthetic-message-${sequence}`, role: "user", sequence, createTime,
    ...(appendBefore === undefined ? {} : { appendBefore }),
  };
}

function inventory(
  messages: readonly RealRetentionMessageMetadata[],
  changes: Partial<RealRetentionParentMetadata> = {},
): RealRetentionInventory {
  return {
    parent: {
      ownerAccountId: OWNER, conversationId: CONVERSATION,
      state: "live", lifecycleVersion: 1,
      nextSequence: messages.length + 1,
      latestMessageId: `synthetic-message-${messages.length}`,
      ...changes,
    },
    messages,
  };
}

function resolve(
  snapshot: unknown,
  now: unknown = firstTime,
  precision: "nanosecond" | "millisecond" = "nanosecond",
) {
  return resolveRealRetention({
    ownerAccountId: OWNER, conversationId: CONVERSATION,
    inventory: snapshot, now: { instant: now, precision },
  });
}

const first = () => message(1, firstTime);
const initial = () => inventory([first()]);

test("N02 first reserved-new writer projection derives 90 days without any persisted anchor field", () => {
  assert.deepEqual(resolve(initial()), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: firstCutoff, cleanupAt: later(firstCutoff, CLEANUP), cleanupDue: false,
  });
});

test("N02 a complete unordered inventory validates contiguous lineage and uses latest valid append", () => {
  const secondTime = at(200, 999_999_999);
  const secondCutoff = later(secondTime, RETENTION);
  const thirdTime = at(300, 2);
  const rows = [
    message(3, thirdTime, secondCutoff),
    first(),
    message(2, secondTime, firstCutoff),
  ];
  rows.forEach(Object.freeze);
  const snapshot = Object.freeze({
    ...inventory(rows), messages: Object.freeze(rows),
  });
  assert.deepEqual(resolve(snapshot, thirdTime), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: later(thirdTime, RETENTION),
    cleanupAt: later(thirdTime, RETENTION + CLEANUP), cleanupDue: false,
  });
  assert.deepEqual(rows.map((row) => row.sequence), [3, 1, 2]);
  assert.deepEqual(Object.keys(snapshot.parent).sort(), [
    "conversationId", "latestMessageId", "lifecycleVersion", "nextSequence", "ownerAccountId", "state",
  ]);
});

test("N02 exact expiry has no 1 ns access grace", () => {
  assert.equal(resolve(initial(), at(firstCutoff.seconds, firstCutoff.nanoseconds - 1)).state, "live");
  for (const now of [firstCutoff, at(firstCutoff.seconds, firstCutoff.nanoseconds + 1)]) {
    assert.deepEqual(resolve(initial(), now), {
      state: "expired", canAdvanceAnchor: false,
      expiresAt: firstCutoff, cleanupAt: later(firstCutoff, CLEANUP), cleanupDue: false,
    });
  }
});

test("N02 an append 1 ns before the prior cutoff may advance the full-precision anchor", () => {
  const creation = at(firstCutoff.seconds, firstCutoff.nanoseconds - 1);
  const snapshot = inventory([first(), message(2, creation, firstCutoff)]);
  assert.deepEqual(resolve(snapshot, firstCutoff), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: later(creation, RETENTION),
    cleanupAt: later(creation, RETENTION + CLEANUP), cleanupDue: false,
  });
});

test("N02 the first late user or assistant copy freezes the whole Conversation at the old cutoff", () => {
  for (const role of ["user", "assistant"] as const) {
    for (const creation of [firstCutoff, at(firstCutoff.seconds, firstCutoff.nanoseconds + 1)]) {
      const snapshot = inventory([first(), { ...message(2, creation, firstCutoff), role }]);
      assert.deepEqual(resolve(snapshot, creation), {
        state: "expired", canAdvanceAnchor: false,
        expiresAt: firstCutoff, cleanupAt: later(firstCutoff, CLEANUP), cleanupDue: false,
      });
    }
  }
});

test("N02 a valid advance followed by a late append preserves that last legitimate cutoff", () => {
  const valid = at(200, 23);
  const cutoff = later(valid, RETENTION);
  const snapshot = inventory([
    first(), message(2, valid, firstCutoff), message(3, cutoff, cutoff),
  ]);
  assert.deepEqual(resolve(snapshot, later(cutoff, CLEANUP)), {
    state: "expired", canAdvanceAnchor: false,
    expiresAt: cutoff, cleanupAt: later(cutoff, CLEANUP), cleanupDue: true,
  });
});

test("N02 later physical copies cannot revive or restart the original cleanup clock", () => {
  const lastCopy = later(firstCutoff, 2 * CLEANUP);
  const snapshot = inventory([
    first(), message(2, firstCutoff, firstCutoff),
    message(3, lastCopy, firstCutoff),
  ]);
  for (const now of [lastCopy, later(lastCopy, RETENTION)]) {
    assert.deepEqual(resolve(snapshot, now), {
      state: "expired", canAdvanceAnchor: false,
      expiresAt: firstCutoff, cleanupAt: later(firstCutoff, CLEANUP), cleanupDue: true,
    });
  }
});

test("N02 a late chain that self-progresses appendBefore is corrupt, never live or deletion authority", () => {
  const selfProgressed = later(firstCutoff, RETENTION);
  const snapshot = inventory([
    first(), message(2, firstCutoff, firstCutoff),
    message(3, later(firstCutoff, 1), selfProgressed),
  ]);
  assert.deepEqual(resolve(snapshot, later(selfProgressed, RETENTION)), unknownResult);
});

test("N02 every appendBefore must match the prior valid lineage, not another supplied cutoff", () => {
  for (const cutoff of [
    at(firstCutoff.seconds, firstCutoff.nanoseconds - 1),
    at(firstCutoff.seconds, firstCutoff.nanoseconds + 1),
    later(firstCutoff, RETENTION),
  ]) {
    assert.deepEqual(resolve(inventory([first(), message(2, at(200), cutoff)]), at(300)), unknownResult);
  }
});

test("N02 old pages and accepted/effect targets cannot replace the complete parent/latest inventory", () => {
  const snapshot = inventory([first(), message(2, firstCutoff, firstCutoff)]);
  assert.equal(resolve(snapshot, firstCutoff).state, "expired");
  // A consumer of the old user, accepted pointer or effect still resolves ALL metadata.
  assert.deepEqual(resolve({ ...snapshot, messages: [first()] }, firstCutoff), unknownResult);
  assert.deepEqual(resolve({ ...snapshot, messages: [snapshot.messages[1]] }, firstCutoff), unknownResult);
  assert.deepEqual(resolve({ ...snapshot, messages: [] }, firstCutoff), unknownResult);
});

test("N02 missing/deleted/latest-old pointers and inconsistent nextSequence fail closed", () => {
  const snapshot = inventory([first(), message(2, at(200), firstCutoff)]);
  for (const parentChange of [
    { latestMessageId: "deleted-message" }, { latestMessageId: "synthetic-message-1" },
    { latestMessageId: "" }, { latestMessageId: undefined },
    { nextSequence: 1 }, { nextSequence: 2 }, { nextSequence: 4 },
    { nextSequence: Number.MAX_SAFE_INTEGER + 1 }, { nextSequence: 3.5 },
    { lifecycleVersion: 0 }, { lifecycleVersion: Number.NaN }, { state: "restored" },
  ]) {
    assert.deepEqual(resolve({ ...snapshot, parent: { ...snapshot.parent, ...parentChange } }, at(300)), unknownResult);
  }
  for (const parent of [undefined, null, {}]) {
    assert.deepEqual(resolve({ ...snapshot, parent }, at(300)), unknownResult);
  }
});

test("N02 canonical expected owner and Conversation must match parent and every message", () => {
  const snapshot = initial();
  for (const key of ["ownerAccountId", "conversationId"] as const) {
    assert.deepEqual(resolve({ ...snapshot, parent: { ...snapshot.parent, [key]: "other" } }), unknownResult);
    assert.deepEqual(resolve({ ...snapshot, messages: [{ ...first(), [key]: "other" }] }), unknownResult);
    assert.deepEqual(resolveRealRetention({
      ownerAccountId: OWNER, conversationId: CONVERSATION, [key]: "",
      inventory: snapshot, now: { precision: "nanosecond", instant: firstTime },
    }), unknownResult);
  }
});

test("N02 sequence gaps, duplicates, duplicate IDs and out-of-order creation cannot infer lineage", () => {
  for (const rows of [
    [message(2, firstTime)],
    [first(), message(3, at(200), firstCutoff)],
    [first(), { ...message(2, at(200), firstCutoff), sequence: 1 }],
    [first(), { ...message(2, at(200), firstCutoff), messageId: first().messageId }],
    [first(), message(2, at(99), firstCutoff)],
    [{ ...first(), sequence: 1.5 }],
    [{ ...first(), sequence: Number.MAX_SAFE_INTEGER + 1 }],
    [{ ...first(), messageId: "" }],
    [{ ...first(), role: "unknown" }],
  ]) {
    assert.deepEqual(resolve(inventory(rows as RealRetentionMessageMetadata[]), at(300)), unknownResult);
  }
});

test("N02 equal authoritative creation instants are valid and do not fabricate extra retention", () => {
  assert.deepEqual(resolve(inventory([first(), message(2, firstTime, firstCutoff)])), resolve(initial()));
});

test("N02 only original first user sequence 1 omits appendBefore; explicit undefined is not omission", () => {
  for (const rows of [
    [{ ...first(), role: "assistant" }],
    [{ ...first(), appendBefore: firstCutoff }],
    [{ ...first(), appendBefore: undefined }],
    [first(), message(2, at(200))],
    [first(), { ...message(2, at(200)), appendBefore: undefined }],
  ]) {
    assert.deepEqual(resolve(inventory(rows as RealRetentionMessageMetadata[]), at(300)), unknownResult);
  }
});

const invalidTimes: readonly unknown[] = [
  undefined, null, [], {}, new Date(0), "2026-10-13T00:00:00.000Z",
  { seconds: 100 }, { nanoseconds: 0 },
  at(Number.MAX_SAFE_INTEGER + 1), at(Number.MIN_SAFE_INTEGER - 1),
  at(Number.NaN), at(Number.POSITIVE_INFINITY), at(100.5),
  at(100, -1), at(100, 1_000_000_000), at(100, 1.5), at(100, Number.NaN),
  { seconds: "100", nanoseconds: 0 },
  { ...firstTime, extra: true },
  { ...firstTime, [Symbol("extra")]: true },
  Object.assign(Object.create({ seconds: 100 }) as object, { nanoseconds: 0 }),
  { get seconds() { return 100; }, nanoseconds: 0 },
];

for (const field of ["createTime", "appendBefore", "now"] as const) {
  test(`N02 invalid/extra-key ${field} cannot be repaired or rounded`, () => {
    for (const value of invalidTimes) {
      const second = { ...message(2, at(200), firstCutoff), [field]: value };
      const snapshot = field === "now" ? initial() : inventory([first(), second]);
      // Call directly so explicit undefined does not activate the fixture's default now.
      assert.deepEqual(resolveRealRetention({
        ownerAccountId: OWNER, conversationId: CONVERSATION, inventory: snapshot,
        now: { precision: "nanosecond", instant: field === "now" ? value : at(300) },
      }), unknownResult);
    }
  });
}

test("N02 updateTime, client ISO and ACK never repair missing authoritative createTime", () => {
  const damaged = {
    ...first(), createTime: undefined, updateTime: firstTime,
    persistedAt: firstTime, clientIso: "2026-10-13T00:00:00.000Z", ackTime: firstTime,
  };
  assert.deepEqual(resolve(inventory([damaged]), firstTime), unknownResult);
});

test("N02 future creation or a clock below known physical creation cannot grant access or cleanup", () => {
  assert.deepEqual(resolve(initial(), at(100, 123_456_788)), unknownResult);
  const snapshot = inventory([first(), message(2, at(200, 1), firstCutoff)]);
  assert.deepEqual(resolve(snapshot, at(200)), unknownResult);
  assert.deepEqual(resolve(snapshot, at(200), "millisecond"), unknownResult);
  const late = inventory([first(), message(2, firstCutoff, firstCutoff)]);
  assert.deepEqual(resolve(late, firstTime), unknownResult);
});

test("N02 millisecond now refuses the ambiguous expiry bucket without assuming its upper bound", () => {
  assert.equal(resolve(initial(), at(firstCutoff.seconds, 122_000_000), "millisecond").state, "live");
  assert.deepEqual(resolve(initial(), at(firstCutoff.seconds, 123_000_000), "millisecond"), unknownResult);
  const after = resolve(initial(), at(firstCutoff.seconds, 124_000_000), "millisecond");
  assert.equal(after.state, "expired");
  assert.equal(after.canAdvanceAnchor, false);
  assert.deepEqual(resolve(initial(), firstCutoff, "millisecond"), unknownResult);
});

test("N02 an exact millisecond expiry is expired at the proven lower bound, with no extra millisecond", () => {
  const time = at(100, 123_000_000);
  const snapshot = inventory([message(1, time)]);
  assert.equal(resolve(snapshot, at(100 + RETENTION, 122_000_000), "millisecond").state, "live");
  assert.equal(resolve(snapshot, later(time, RETENTION), "millisecond").state, "expired");
});

test("N02 negative-second millisecond buckets use canonical seconds+nanos, not truncation toward zero", () => {
  const creation = at(-RETENTION - 1, 999_999_999);
  const snapshot = inventory([message(1, creation)]);
  assert.equal(resolve(snapshot, at(-1, 998_000_000), "millisecond").state, "live");
  assert.deepEqual(resolve(snapshot, at(-1, 999_000_000), "millisecond"), unknownResult);
  assert.equal(resolve(snapshot, at(0), "millisecond").state, "expired");
  assert.equal(resolve(snapshot, at(-1, 999_999_998)).state, "live");
  assert.equal(resolve(snapshot, at(-1, 999_999_999)).state, "expired");
});

test("N02 cleanup stays at original cutoff + 24h across 1 ns and coarse-clock boundaries", () => {
  const snapshot = inventory([first(), message(2, firstCutoff, firstCutoff)]);
  const cleanupAt = later(firstCutoff, CLEANUP);
  assert.equal(resolve(snapshot, at(cleanupAt.seconds, cleanupAt.nanoseconds - 1)).cleanupDue, false);
  assert.equal(resolve(snapshot, cleanupAt).cleanupDue, true);
  const ambiguousCleanup = resolve(snapshot, at(cleanupAt.seconds, 123_000_000), "millisecond");
  assert.deepEqual(ambiguousCleanup, {
    state: "expired", canAdvanceAnchor: false,
    expiresAt: firstCutoff, cleanupAt, cleanupDue: false,
  });
  assert.equal(resolve(snapshot, at(cleanupAt.seconds, 124_000_000), "millisecond").cleanupDue, true);
});

test("N02 deleting never becomes live; partial cleanup or a deleted parent cannot revive the remainder", () => {
  for (const now of [firstTime, firstCutoff, later(firstCutoff, CLEANUP)]) {
    const result = resolve(inventory([first()], { state: "deleting" }), now);
    assert.equal(result.state, "deleting");
    assert.equal(result.canAdvanceAnchor, false);
  }
  const deleting = inventory([first(), message(2, firstCutoff, firstCutoff)], { state: "deleting" });
  assert.equal(resolve(deleting, firstCutoff).state, "deleting");
  assert.deepEqual(resolve({ ...deleting, messages: [first()] }, firstCutoff), unknownResult);
  assert.deepEqual(resolve({ ...deleting, parent: null }, firstCutoff), unknownResult);
});

test("N02 assistant tombstones retain creation/appendBefore and never create a second clock", () => {
  const creation = at(200, 8);
  const liveMessage = { ...message(2, creation, firstCutoff), role: "assistant" as const };
  const tombstoneProjection = { ...liveMessage }; // No availability/content is needed for retention.
  assert.deepEqual(
    resolve(inventory([first(), liveMessage]), creation),
    resolve(inventory([first(), tombstoneProjection]), creation),
  );
  const broken = { ...tombstoneProjection, appendBefore: undefined };
  assert.deepEqual(resolve(inventory([first(), broken]), creation), unknownResult);
});

test("N02 safe-integer seconds retain sub-ms precision without Date or float-millisecond arithmetic", () => {
  const creation = at(8_000_000_000_000_000, 999_999_999);
  const cutoff = later(creation, RETENTION);
  const snapshot = inventory([message(1, creation)]);
  assert.equal(resolve(snapshot, at(cutoff.seconds, 999_999_998)).state, "live");
  assert.deepEqual(resolve(snapshot, cutoff), {
    state: "expired", canAdvanceAnchor: false,
    expiresAt: cutoff, cleanupAt: later(cutoff, CLEANUP), cleanupDue: false,
  });
});

test("N02 unrepresentable expiry or cleanup arithmetic fails closed without a wrapped deadline", () => {
  for (const seconds of [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - RETENTION]) {
    const creation = at(seconds, 7);
    assert.deepEqual(resolve(inventory([message(1, creation)]), creation), unknownResult);
  }
  const creation = at(Number.MAX_SAFE_INTEGER - RETENTION - CLEANUP, 999_999_999);
  assert.deepEqual(resolve(inventory([message(1, creation)]), creation), {
    state: "live", canAdvanceAnchor: true,
    expiresAt: later(creation, RETENTION), cleanupAt: at(Number.MAX_SAFE_INTEGER, 999_999_999), cleanupDue: false,
  });
  const earliest = at(Number.MIN_SAFE_INTEGER, 1);
  assert.equal(resolve(inventory([message(1, earliest)]), earliest).state, "live");
});

test("N02 unknown precision and malformed inventories are unavailable, not empty Conversations", () => {
  for (const value of [undefined, null, {}, [], { parent: {}, messages: [] }, initial().parent]) {
    assert.deepEqual(resolve(value), unknownResult);
  }
  assert.deepEqual(resolveRealRetention({
    ownerAccountId: OWNER, conversationId: CONVERSATION, inventory: initial(),
    now: { precision: "approximate", instant: firstTime },
  } as unknown as RealRetentionResolverInput), unknownResult);
  assert.deepEqual(resolveRealRetention(null as unknown as RealRetentionResolverInput), unknownResult);
});
