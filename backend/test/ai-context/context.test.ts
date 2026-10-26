import test from "node:test";
import assert from "node:assert/strict";
import type { CheckInContextRecord, ContextAuthority, ContextCheckpoint, ContextRead, ContextRecord, ContextRequest,
  ContextScope, EventIntentContextRecord, HistoryPairContextRecord, LocationSnapshotContextRecord, PersonaContextRecord,
  PreparedContext, SourceObservation, SourceSelector } from "../../src/ai-context/context-contract.js";
import { contextInstant, projectContext, trustedSourceNavigation } from "../../src/ai-context/project-context.js";
import { revalidateContext } from "../../src/ai-context/revalidate-context.js";

const asOf = "2026-10-25T06:30:00.000Z", later = "2026-10-25T06:31:00.000Z", until = "2026-10-25T06:35:00.000Z";
const session = {}, scope: ContextScope = { ownerId: "synthetic-owner", session, conversationId: "synthetic-topic", purpose: "reply", target: "local" };
function authority(overrides: Partial<ContextAuthority> = {}): ContextAuthority {
  return { scope, consent: "accepted", version: "consent-7", observedAt: asOf, validUntil: until,
    allowedCategories: ["check_ins", "event_intents", "location", "persona", "conversation_history"], ...overrides };
}
function checkIn(id = "note-source", overrides: Partial<CheckInContextRecord> = {}): CheckInContextRecord {
  return { kind: "check_in", ownerId: scope.ownerId, observedAt: asOf, source: { kind: "check_in", id, version: "r1" },
    occurredAt: "2026-10-24T04:00:00.000Z", noteText: "昨天散步后有些疲惫。", moodLabel: "Low", activityLabel: "Walking", ...overrides };
}
function eventIntent(overrides: Partial<EventIntentContextRecord> = {}): EventIntentContextRecord {
  return { kind: "event_intent", ownerId: scope.ownerId, observedAt: asOf, source: { kind: "event", id: "event-source", version: "event-v1" },
    participation: { kind: "participation", id: "event-source", version: "r3" }, status: "going",
    statusUpdatedAt: "2026-10-24T05:00:00.000Z", validUntil: until,
    event: { availability: "scheduled", title: "Synthetic music event", startAt: "2026-10-26T10:00:00.000Z", locationLabel: "Synthetic hall" }, ...overrides };
}
function history(overrides: Partial<HistoryPairContextRecord> = {}): HistoryPairContextRecord {
  return { kind: "history_pair", ownerId: scope.ownerId, observedAt: asOf, source: { kind: "history_pair", id: "assistant-source", version: "pair-v1" },
    conversationId: scope.conversationId, userSequence: 1, assistantSequence: 2, occurredAt: "2026-10-25T06:00:00.000Z",
    userQuote: "我只是感兴趣。", assistantSuggestion: "You have booked and attended the event.", requiredSources: [], requiredCategories: [], ...overrides };
}
function persona(): PersonaContextRecord {
  return { kind: "persona", ownerId: scope.ownerId, observedAt: asOf, source: { kind: "persona", id: "persona-source", version: "p1" },
    presentation: { schemaVersion: "persona_presentation_v1", tone: "warm", responseLength: "balanced", formatStyle: "plain" } };
}
function location(): LocationSnapshotContextRecord {
  return { kind: "location_snapshot", ownerId: scope.ownerId, observedAt: asOf, source: { kind: "check_in", id: "location-source", version: "r1" },
    occurredAt: "2026-10-23T03:00:00.000Z", label: "Synthetic previous park" };
}
function selector(record: ContextRecord): SourceSelector { return { kind: record.kind, id: record.source.id }; }
function request(records: readonly ContextRecord[], overrides: Partial<ContextRequest> = {}): ContextRequest {
  return { scope, asOf, currentMessage: "更正一下：我没有预订，也没有参加。今天心情不错。", relevant: records.map(selector), attached: [], excluded: [], ...overrides };
}
function read(records: readonly ContextRecord[], auth = authority()): ContextRead { return { kind: "read", authority: auth, records }; }
function prepare(records: readonly ContextRecord[] = [checkIn()]): PreparedContext {
  const result = projectContext(request(records), read(records));
  assert.equal(result.kind, "prepared");
  if (result.kind !== "prepared") throw new Error("Synthetic preparation failed");
  return result.value;
}
function checkpoint(context: PreparedContext, overrides: Partial<Extract<ContextCheckpoint, { kind: "read" }>> = {}, now = later): Extract<ContextCheckpoint, { kind: "read" }> {
  return { kind: "read", authority: authority({ observedAt: now }), sources: context.dependencies.map(d => ({ ...d, state: "available" as const, observedAt: now })), ...overrides };
}
function replaceSource(context: PreparedContext, state: SourceObservation): ContextCheckpoint {
  const current = checkpoint(context);
  return { ...current, sources: current.sources.map(s => s.kind === state.kind && s.id === state.id ? state : s) };
}

test("explicit allowlist separates timestamped business facts, user quotes and AI suggestions", () => {
  const records = [checkIn(), eventIntent(), history(), persona(), location()];
  const result = prepare(records), model = result.model;
  assert.equal(model.currentMessage, request(records).currentMessage);
  assert.deepEqual(model.facts.checkIns, [{ occurredAt: "2026-10-24T04:00:00.000Z", moodLabel: "Low", activityLabel: "Walking" }]);
  assert.equal(model.facts.eventIntents[0]?.status, "going");
  assert.equal(model.facts.locationSnapshots[0]?.occurredAt, "2026-10-23T03:00:00.000Z");
  assert.equal(model.userQuotes[0]?.text, checkIn().noteText);
  assert.deepEqual(model.assistantSuggestions, [{ occurredAt: history().occurredAt, text: history().assistantSuggestion, historyTurn: 1 }]);
  const serialized = JSON.stringify(model);
  for (const secretMetadata of [scope.ownerId, scope.conversationId, "note-source", "event-source", "assistant-source", "persona-source", "location-source", "event-v1", "consent-7"])
    assert.equal(serialized.includes(secretMetadata), false, secretMetadata);
  assert.equal(Object.hasOwn(model.facts, "currentMood"), false);
  assert.equal(Object.hasOwn(model.facts, "currentLocation"), false);
  assert.equal(Object.hasOwn(model.facts, "attended"), false);
  assert.equal(Object.isFrozen(model.facts.checkIns), true);
});

test("English latest correction remains the current message; false assistant statement never becomes a fact", () => {
  const pair = history(), message = "Correction: I only expressed interest. I have not booked or attended.";
  const result = projectContext(request([pair], { currentMessage: message }), read([pair]));
  assert.equal(result.kind, "prepared");
  if (result.kind !== "prepared") return;
  assert.equal(result.value.model.currentMessage, message);
  assert.deepEqual(result.value.model.facts.eventIntents, []);
  assert.equal(result.value.model.assistantSuggestions[0]?.text, pair.assistantSuggestion);
});

test("only the five newest selected Check-ins in the inclusive preceding-seven-days window are projected", () => {
  const records = Array.from({ length: 7 }, (_, i) => checkIn(`note-${i}`, { occurredAt: `2026-10-${String(24 - i).padStart(2, "0")}T06:30:00.000Z` }));
  records.push(checkIn("outside", { occurredAt: "2026-10-18T06:29:59.999Z" }));
  const result = prepare(records.reverse());
  assert.equal(result.model.facts.checkIns.length, 5);
  assert.deepEqual(result.dependencies.map(s => s.id), ["note-0", "note-1", "note-2", "note-3", "note-4"]);
  assert.equal(result.omitted.find(s => s.selector.id === "outside")?.reason, "out_of_window");
  const boundary = checkIn("boundary", { occurredAt: "2026-10-18T06:30:00.000Z" });
  assert.equal(prepare([boundary]).model.facts.checkIns.length, 1);
});

test("same-time selection uses source ID as deterministic tie-break only outside the model", () => {
  const result = prepare([checkIn("b"), checkIn("a")]);
  assert.deepEqual(result.dependencies.map(s => s.id), ["a", "b"]);
});

test("an explicit exclusion overrides attachment and never remains a dependency", () => {
  const row = checkIn(), chosen = selector(row);
  const result = projectContext(request([row], { attached: [chosen], excluded: [chosen] }), read([row]));
  assert.equal(result.kind, "prepared");
  if (result.kind !== "prepared") return;
  assert.deepEqual(result.value.dependencies, []);
  assert.deepEqual(result.value.model.userQuotes, []);
  assert.deepEqual(result.value.omitted, [{ selector: chosen, reason: "excluded" }]);
});

test("attachment selects an already-authorized record without expanding reads or permissions", () => {
  const row = checkIn(), chosen = selector(row);
  assert.equal(projectContext(request([], { attached: [chosen] }), read([row])).kind, "prepared");
  assert.equal(projectContext(request([], { attached: [chosen] }), read([])).kind, "unavailable");
  assert.equal(projectContext(request([], { attached: [chosen] }), read([row], authority({ allowedCategories: [] }))).kind, "denied");
});

test("explicit attachment outside the approved window or resource limit requires a visible selection correction", () => {
  const old = checkIn("old", { occurredAt: "2026-10-01T00:00:00.000Z" });
  assert.equal(projectContext(request([old], { attached: [selector(old)] }), read([old])).kind, "invalid_selection");
  const records = Array.from({ length: 6 }, (_, i) => checkIn(String(i)));
  assert.equal(projectContext(request(records, { attached: [selector(records[5]!)] }), read(records)).kind, "invalid_selection");
});

test("a source ID cannot transfer owner, topic, session, purpose or local permission to cloud", async t => {
  const row = checkIn();
  const scopes: readonly ContextScope[] = [
    { ...scope, ownerId: "other-owner" }, { ...scope, conversationId: "other-topic" }, { ...scope, session: {} },
    { ...scope, purpose: "proactive" }, { ...scope, target: "cloud" },
  ];
  for (const [index, changed] of scopes.entries()) await t.test(String(index), () => {
    assert.equal(projectContext(request([row], { scope: changed }), read([row])).kind, "denied");
  });
  assert.equal(projectContext(request([checkIn("foreign", { ownerId: "other-owner" })]), read([checkIn("foreign", { ownerId: "other-owner" })])).kind, "denied");
});

test("a separately trusted cloud grant is required; no implicit local-to-cloud fallback", () => {
  const row = checkIn(), cloud = { ...scope, target: "cloud" as const };
  assert.equal(projectContext(request([row], { scope: cloud }), read([row])).kind, "denied");
  assert.equal(projectContext(request([row], { scope: cloud }), read([row], authority({ scope: cloud, version: "explicit-cloud-1" }))).kind, "prepared");
});

test("rejected consent and unavailable reader results never become empty success", () => {
  const req = request([]);
  assert.deepEqual(projectContext(req, { kind: "unavailable" }), { kind: "unavailable" });
  assert.deepEqual(projectContext(req, { kind: "denied" }), { kind: "denied" });
  assert.equal(projectContext(req, read([], authority({ consent: "rejected" }))).kind, "denied");
});

test("future, stale, duplicate or malformed source time fails the preparation", async t => {
  const records = [checkIn("future", { occurredAt: "2026-10-26T00:00:00.000Z" }), checkIn("stale", { observedAt: "2026-10-25T06:00:00.000Z" }),
    checkIn("ambiguous", { occurredAt: "2026-10-24T04:00:00" }), checkIn("invalid-date", { occurredAt: "2026-02-30T04:00:00.000Z" })];
  for (const row of records) await t.test(row.source.id, () => assert.equal(projectContext(request([row]), read([row])).kind, "unavailable"));
  assert.equal(projectContext(request([checkIn()]), read([checkIn(), checkIn()])).kind, "unavailable");
  assert.equal(contextInstant("2026-10-24T12:00:00+08:00"), undefined);
});

test("interested and going remain distinct intentions, with no inferred attendance", () => {
  for (const status of ["interested", "going"] as const) {
    const result = prepare([eventIntent({ status })]);
    assert.equal(result.model.facts.eventIntents[0]?.status, status);
    assert.equal(Object.hasOwn(result.model.facts.eventIntents[0]!, "attended"), false);
    assert.deepEqual(result.dependencies.map(d => d.kind), ["event", "participation"]);
  }
});

test("withdrawn intention, cancelled event, provider uncertainty and expired source do not supply old event facts", () => {
  const base = eventIntent();
  const cases: readonly [EventIntentContextRecord, string][] = [
    [eventIntent({ status: "none" }), "denied"], [eventIntent({ event: { ...base.event, availability: "cancelled" } }), "denied"],
    [eventIntent({ event: { ...base.event, availability: "unavailable" } }), "unavailable"], [eventIntent({ validUntil: asOf }), "unavailable"],
    [eventIntent({ event: { ...base.event, startAt: asOf } }), "unavailable"],
  ];
  for (const [row, expected] of cases) assert.equal(projectContext(request([row]), read([row])).kind, expected);
});

test("location requires its own grant and stays a dated snapshot, without coordinates", () => {
  const row = location();
  assert.equal(projectContext(request([row]), read([row], authority({ allowedCategories: ["check_ins"] }))).kind, "denied");
  const extra = { ...row, coordinates: { latitude: 1.234567, longitude: 103.765432 }, current: true };
  const result = prepare([extra]);
  assert.deepEqual(result.model.facts.locationSnapshots, [{ occurredAt: row.occurredAt, label: row.label }]);
  assert.equal(JSON.stringify(result.model).includes("1.234567"), false);
});

test("history is bounded to two complete pairs in this owner and conversation", () => {
  const pairs = Array.from({ length: 3 }, (_, i) => history({ source: { kind: "history_pair", id: `pair-${i}`, version: "immutable-1" },
    userSequence: 2 * i + 1, assistantSequence: 2 * i + 2, occurredAt: `2026-10-25T06:0${i}:00.000Z` }));
  const result = prepare(pairs);
  assert.equal(result.model.assistantSuggestions.length, 2);
  assert.deepEqual(result.dependencies.map(d => d.id), ["pair-2", "pair-1"]);
  const foreign = history({ conversationId: "other-conversation" });
  assert.equal(projectContext(request([foreign]), read([foreign])).kind, "denied");
  const partial = history({ assistantSequence: 1 });
  assert.equal(projectContext(request([partial]), read([partial])).kind, "unavailable");
});

test("history pairing and newest-two selection use sequence even with tied or reversed timestamps and mixed records", () => {
  const a = history({ source: { kind: "history_pair", id: "pair-a", version: "v1" }, userQuote: "old", assistantSuggestion: "old advice",
    userSequence: 1, assistantSequence: 2, occurredAt: asOf });
  const b = history({ source: { kind: "history_pair", id: "pair-b", version: "v1" }, userQuote: "middle", assistantSuggestion: "middle advice",
    userSequence: 3, assistantSequence: 4, occurredAt: asOf });
  const c = history({ source: { kind: "history_pair", id: "pair-c", version: "v1" }, userQuote: "latest correction", assistantSuggestion: "latest advice",
    userSequence: 5, assistantSequence: 6, occurredAt: "2026-10-25T06:00:00.000Z" });
  for (const rows of [[a, checkIn(), c, eventIntent(), b], [b, c, checkIn(), a, eventIntent()]]) {
    const model = prepare(rows).model;
    assert.deepEqual(model.userQuotes.filter(q => q.origin === "conversation").map(q => [q.historyTurn, q.text]), [[1, "middle"], [2, "latest correction"]]);
    assert.deepEqual(model.assistantSuggestions.map(q => [q.historyTurn, q.text]), [[1, "middle advice"], [2, "latest advice"]]);
  }
});

test("duplicate history sequence identity is an unavailable canonical pair, not another turn", () => {
  const a = history(), b = history({ source: { kind: "history_pair", id: "pair-b", version: "v1" } });
  assert.equal(projectContext(request([a, b]), read([a, b])).kind, "unavailable");
});

test("canonical event identity is required; raw browse locator or URL cannot produce navigation", () => {
  for (const id of ["tm_raw_browse_id", "https://example.invalid/event", "../event"]) {
    const row = eventIntent({ source: { kind: "event", id, version: "e1" }, participation: { kind: "participation", id, version: "r1" } });
    assert.equal(projectContext(request([row]), read([row])).kind, "unavailable");
  }
});

test("historical assistant sources remain required and cannot launder denied Check-in use through history", () => {
  const row = history({ requiredSources: [{ kind: "check_in", id: "inherited-note", version: "r2", observedAt: asOf }], requiredCategories: ["check_ins"] });
  assert.equal(projectContext(request([row]), read([row], authority({ allowedCategories: ["conversation_history"] }))).kind, "denied");
  const result = prepare([row]);
  assert.deepEqual(result.dependencies.map(d => d.kind), ["history_pair", "check_in"]);
  assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "check_in", id: "inherited-note", state: "deleted", observedAt: later }), later), { kind: "denied" });
});

test("historical location cannot re-enter via a Check-in source ID after location permission is withdrawn", () => {
  const row = history({ assistantSuggestion: "You were at Synthetic previous park.",
    requiredSources: [{ kind: "check_in", id: "old-location-note", version: "r1", observedAt: asOf }], requiredCategories: ["location"] });
  assert.equal(projectContext(request([row]), read([row], authority({ allowedCategories: ["conversation_history", "check_ins"] }))).kind, "denied");
  const result = prepare([row]);
  assert.ok(result.categories.includes("location"));
  assert.deepEqual(revalidateContext(result, checkpoint(result, { authority: authority({ observedAt: later,
    allowedCategories: ["conversation_history", "check_ins"] }) }), later), { kind: "denied" });
});

test("unknown historical data-use metadata is unavailable; a present source ID cannot replace it", () => {
  for (const requiredCategories of ["unknown", []] as const) {
    const row = history({ requiredSources: [{ kind: "check_in", id: "legacy-source", version: "r1", observedAt: asOf }], requiredCategories });
    assert.equal(projectContext(request([row]), read([row])).kind, "unavailable");
  }
});

test("an excluded source cannot re-enter through a selected historical assistant's dependencies", () => {
  const cases = [
    { excluded: { kind: "check_in", id: "excluded-note" } as const, source: { kind: "check_in", id: "excluded-note", version: "r1", observedAt: asOf } as const, category: "check_ins" as const },
    { excluded: { kind: "location_snapshot", id: "excluded-note" } as const, source: { kind: "check_in", id: "excluded-note", version: "r1", observedAt: asOf } as const, category: "location" as const },
    { excluded: { kind: "event_intent", id: "event-source" } as const, source: { kind: "event", id: "event-source", version: "e1", observedAt: asOf, validUntil: until } as const, category: "event_intents" as const },
  ];
  for (const { excluded, source, category } of cases) {
    const pair = history({ requiredSources: [source], requiredCategories: [category], assistantSuggestion: "Synthetic excluded-source text" });
    const result = projectContext(request([pair], { excluded: [excluded] }), read([pair]));
    assert.deepEqual(result, { kind: "invalid_selection" });
  }
});

test("exclusion remains temporary and wins over repeated attachment and inherited use at any source version", () => {
  const row = checkIn("excluded-note"), pair = history({ requiredSources: [{ ...row.source, version: "r2", observedAt: asOf }], requiredCategories: ["check_ins"] });
  const excluded = selector(row), both = [selector(row), selector(pair)];
  assert.deepEqual(projectContext(request([row, pair], { attached: both, excluded: [excluded, excluded] }), read([row, pair])), { kind: "invalid_selection" });
  // The projection never mutates the reader's records or permanently deletes
  // anything. A new request can explicitly choose that same source again.
  assert.equal(projectContext(request([row]), read([row])).kind, "prepared");
  const locationExcluded = { kind: "location_snapshot", id: row.source.id } as const;
  const result = projectContext(request([row], { excluded: [locationExcluded] }), read([row]));
  assert.equal(result.kind, "prepared");
  if (result.kind === "prepared") assert.deepEqual(result.value.dependencies, []);
});

test("projection is detached from later caller mutation; metadata/arbitrary extra fields are not forwarded", () => {
  const row = checkIn(), rows = [row], result = prepare(rows);
  Object.assign(row, { noteText: "mutated after projection", revision: "malicious", location: { latitude: 1, longitude: 2 } });
  rows.length = 0;
  assert.equal(result.model.userQuotes[0]?.text, "昨天散步后有些疲惫。");
  assert.equal(JSON.stringify(result.model).includes("malicious"), false);
});

test("trusted navigation accepts only the selected catalog's exact ID/version and scope", () => {
  const result = prepare(), ref = result.sources[0]!.ref;
  assert.deepEqual(trustedSourceNavigation(result, scope, ref), { kind: "check_in", checkInId: "note-source" });
  assert.equal(trustedSourceNavigation(result, scope, { ...ref, id: "model-invented" }), undefined);
  assert.equal(trustedSourceNavigation(result, scope, { ...ref, version: "r0" }), undefined);
  assert.equal(trustedSourceNavigation(result, { ...scope, conversationId: "other" }, ref), undefined);
});

test("fresh exact source revalidation is reusable at each checkpoint, never as a future effect permit", () => {
  const result = prepare([checkIn(), eventIntent(), history()]);
  assert.deepEqual(revalidateContext(result, checkpoint(result), later), { kind: "valid" });
  assert.deepEqual(revalidateContext(result, checkpoint(result, {}, asOf), asOf), { kind: "valid" });
});

test("edits, deletion, withdrawal and unknown outcomes fail safely before generation, after model and before delivery", async t => {
  const result = prepare([checkIn(), eventIntent()]);
  for (const phase of ["before_generation", "after_generation", "before_delivery"]) await t.test(phase, () => {
    const changed = replaceSource(result, { kind: "check_in", id: "note-source", state: "available", version: "r2", observedAt: later });
    assert.deepEqual(revalidateContext(result, changed, later), { kind: "rebuild" });
    for (const state of ["deleted", "denied", "unknown"] as const) {
      const observation = replaceSource(result, { kind: "check_in", id: "note-source", state, observedAt: later });
      assert.deepEqual(revalidateContext(result, observation, later), { kind: state === "unknown" ? "unavailable" : "denied" });
    }
    assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "participation", id: "event-source", state: "changed", version: "r4", observedAt: later }), later), { kind: "rebuild" });
    assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "event", id: "event-source", state: "denied", observedAt: later }), later), { kind: "denied" });
  });
});

test("scope or consent-generation changes invalidate the prepared result even after reacceptance", () => {
  const result = prepare();
  for (const auth of [authority({ observedAt: later, consent: "rejected" }), authority({ observedAt: later, version: "withdraw-and-reaccept-8" }),
    authority({ observedAt: later, scope: { ...scope, session: {} } }), authority({ observedAt: later, allowedCategories: [] }),
    authority({ observedAt: later, scope: { ...scope, target: "cloud" } })])
    assert.deepEqual(revalidateContext(result, checkpoint(result, { authority: auth }), later), { kind: "denied" });
});

test("missing, duplicated, stale, failed or unknown revalidation is unavailable, never cached/empty success", () => {
  const result = prepare(), current = checkpoint(result);
  assert.deepEqual(revalidateContext(result, { kind: "unavailable" }, later), { kind: "unavailable" });
  assert.deepEqual(revalidateContext(result, { kind: "denied" }, later), { kind: "denied" });
  assert.deepEqual(revalidateContext(result, { ...current, sources: [] }, later), { kind: "unavailable" });
  assert.deepEqual(revalidateContext(result, { ...current, sources: [...current.sources, ...current.sources] }, later), { kind: "unavailable" });
  assert.deepEqual(revalidateContext(result, { ...current, sources: [{ ...current.sources[0]!, observedAt: asOf }] }, later), { kind: "unavailable" });
  assert.deepEqual(revalidateContext(result, current, "2026-10-25T06:29:59.000Z"), { kind: "unavailable" });
});

test("fresh observation cannot extend an expired prepared event projection", () => {
  const result = prepare([eventIntent()]);
  const now = until, current = checkpoint(result, { authority: authority({ observedAt: now, validUntil: "2026-10-25T06:40:00.000Z" }) }, now);
  assert.deepEqual(revalidateContext(result, { ...current, sources: current.sources.map(s => ({ ...s, validUntil: "2026-10-25T06:40:00.000Z" })) }, now), { kind: "expired" });
});

test("a started event or Check-in leaving seven days cannot be delivered as fresh context", () => {
  const event = eventIntent({ event: { ...eventIntent().event, startAt: later } });
  const eventContext = prepare([event]);
  assert.deepEqual(revalidateContext(eventContext, checkpoint(eventContext), later), { kind: "expired" });
  const boundary = prepare([checkIn("boundary", { occurredAt: "2026-10-18T06:30:00.000Z" })]);
  assert.deepEqual(revalidateContext(boundary, checkpoint(boundary), later), { kind: "expired" });
});

test("Q19 Persona snapshot survives edits but permanent deletion denies the in-flight result", () => {
  const result = prepare([persona()]);
  assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "persona", id: "persona-source", version: "p2", state: "available", observedAt: later }), later), { kind: "valid" });
  assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "persona", id: "persona-source", version: "p2", state: "changed", observedAt: later }), later), { kind: "valid" });
  assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "persona", id: "persona-source", state: "deleted", observedAt: later }), later), { kind: "denied" });
  assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "persona", id: "persona-source", version: "", state: "available", observedAt: later }), later), { kind: "unavailable" });
  assert.deepEqual(revalidateContext(result, replaceSource(result, { kind: "persona", id: "persona-source", version: "", state: "changed", observedAt: later }), later), { kind: "unavailable" });
});
