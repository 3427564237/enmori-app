import assert from "node:assert/strict";
import test from "node:test";
import { captureContext } from "../../src/ai-conversation/application/capture-context.js";
import type { CheckInProjection, StartView } from "../../src/ai-conversation/ports/conversation-lifecycle.js";

const asOf = "2026-10-12T00:00:00.000Z";
const occurredAt = "2026-10-11T08:00:00+08:00";
const normalizedOccurredAt = "2026-10-11T00:00:00.000Z";
const optionalFields = ["noteText", "moodLabel", "activityLabel", "weatherConditionLabel"] as const;
const values = {
  noteText: "Synthetic authorized note.", moodLabel: "Calm",
  activityLabel: "Walking", weatherConditionLabel: "Cloudy",
};

/** Deliberately permits malformed synthetic Port data to exercise the boundary. */
function view(projection: Record<string, unknown>): StartView {
  return {
    persona: undefined,
    checkIns: [{ source: { sourceType: "check_in", sourceId: "synthetic-source" }, projection }],
  } as unknown as StartView;
}

// Q17's four optional fields are independent: all 16 presence combinations apply.
for (let mask = 0; mask < 16; mask++) {
  const present = optionalFields.filter((_, index) => (mask & (1 << index)) !== 0);
  test(`Q17 optional Check-in fields: ${present.join(", ") || "occurredAt only"}`, () => {
    const projection: Record<string, unknown> = {
      occurredAt,
      ownerId: "synthetic-private-owner", sourceId: "synthetic-private-id",
      firestorePath: "synthetic/private/path", approximateLocation: { latitude: 0, longitude: 0 },
      activity: { privateMetadata: "synthetic" }, weather: { provider: "synthetic" },
      conversationHistory: ["Synthetic stored history must not enter the input."],
    };
    const expected: Record<string, unknown> = { occurredAt: normalizedOccurredAt };
    for (const field of present) {
      projection[field] = values[field];
      expected[field] = values[field];
    }

    const captured = captureContext(view(projection), asOf, "Synthetic current message.");
    assert.deepEqual(captured.input, {
      currentMessage: "Synthetic current message.", checkIns: [expected], persona: undefined,
    });
    const checkIn = captured.input.checkIns[0]!;
    assert.deepEqual(Object.keys(checkIn).sort(), Object.keys(expected).sort());
    for (const field of optionalFields) assert.equal(Object.hasOwn(checkIn, field), present.includes(field));
    assert.deepEqual(captured.provenance, [{ sourceType: "check_in", sourceId: "synthetic-source" }]);
    assert.equal(Object.isFrozen(captured.input), true);
    assert.equal(Object.isFrozen(captured.input.checkIns), true);
    assert.equal(Object.isFrozen(checkIn), true);
    projection.occurredAt = asOf;
    for (const field of optionalFields) projection[field] = "Changed after capture.";
    assert.deepEqual(checkIn, expected);
  });
}

for (const field of optionalFields) {
  test(`Q17 present ${field} rejects invalid values instead of treating them as absent`, () => {
    for (const value of [undefined, null, 1, false, {}, [], "\ud800"]) {
      assert.throws(() => captureContext(view({ occurredAt, ...values, [field]: value }), asOf, "Synthetic"),
        { message: "unavailable" });
    }
  });
}

test("Q17 optional fields preserve an explicitly supplied empty string without inventing a label", () => {
  const empty = Object.fromEntries(optionalFields.map((field) => [field, ""]));
  const captured = captureContext(view({ occurredAt, ...empty }), asOf, "Synthetic");
  assert.deepEqual(captured.input.checkIns, [{ occurredAt: normalizedOccurredAt, ...empty }]);
});

test("Q17 occurredAt stays required and must identify an explicit valid instant", () => {
  const minimal: CheckInProjection = { occurredAt };
  const minimalView: StartView = {
    persona: undefined,
    checkIns: [{ source: { sourceType: "check_in", sourceId: "synthetic-source" }, projection: minimal }],
  };
  assert.deepEqual(captureContext(minimalView, asOf, "Synthetic").input.checkIns,
    [{ occurredAt: normalizedOccurredAt }]);
  for (const value of [undefined, null, 1, "2026-10-11T00:00:00", "2026-02-30T00:00:00Z"]) {
    assert.throws(() => captureContext(view({ occurredAt: value, ...values }), asOf, "Synthetic"),
      { message: "unavailable" });
  }
});
