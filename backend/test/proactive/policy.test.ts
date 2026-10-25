import assert from "node:assert/strict";
import test from "node:test";
import { evaluateProactive } from "../../src/proactive/policy.js";
import type { ContactLedger, ContactRecord, CurrentAuthority, PolicyDecision, ProactiveCandidate,
  ProposedLimits, SourceRef } from "../../src/proactive/policy.js";
import { advanceOccurrence } from "../../src/proactive/lifecycle.js";

const HOUR = 3600000;
const DAY = 24 * HOUR;
class FakeClock {
  constructor(public nowMs = Date.parse("2026-10-25T04:00:00Z")) {}
  set(iso: string): void { this.nowMs = Date.parse(iso); }
  advance(ms: number): void { this.nowMs += ms; }
}

/** Demonstration values only. Production defaults remain a PM choice. */
const limits: ProposedLimits = { rollingWindowMs: DAY, maximumInWindow: 1,
  cooldownMs: 8 * HOUR, maximumSnapshotAgeMs: 5000 };

function fixture(clock = new FakeClock()) {
  const ref: SourceRef = { kind: "message", id: "synthetic-message", revision: "1" };
  const candidate: ProactiveCandidate = { occurrenceId: "synthetic-occurrence", ownerKey: "owner-a",
    sessionKey: "scope-a", topicId: "topic-a", category: "explicit_follow_up", processing: "local",
    dueAtMs: clock.nowMs, expiresAtMs: clock.nowMs + 2 * DAY, sources: [ref] };
  const authority: CurrentAuthority = { status: "current", occurrenceId: candidate.occurrenceId,
    ownerKey: candidate.ownerKey, sessionKey: candidate.sessionKey, topicId: candidate.topicId,
    authorityVersion: "grant-topic-intent-1", observedAtMs: clock.nowMs, accountAllowed: true,
    topicAllowed: true, intentActive: true, allowedProcessing: ["local"],
    settings: { mode: { kind: "on" }, categories: ["explicit_follow_up"], timeZone: "Asia/Singapore",
      quiet: { kind: "daily", startMinute: 22 * 60, endMinute: 8 * 60 } },
    sources: [{ ...ref, state: "available", observedAtMs: clock.nowMs, allowedProcessing: ["local"] }],
    trigger: { category: "explicit_follow_up", confirmed: true } };
  const ledger: ContactLedger = { status: "current", ownerKey: candidate.ownerKey, records: [] };
  const generation = (a = authority, c = candidate, records: readonly ContactRecord[] = [], l = limits) =>
    evaluateProactive({ phase: "generation", nowMs: clock.nowMs, candidate: c, authority: a,
      ledger: { ...ledger, records }, limits: l });
  const delivery = (a = authority, c = candidate, records: readonly ContactRecord[] = [{ occurrenceId: c.occurrenceId, state: "prepared" }]) =>
    evaluateProactive({ phase: "delivery", nowMs: clock.nowMs, candidate: c, authority: a,
      generated: { occurrenceId: candidate.occurrenceId, authorityVersion: authority.authorityVersion, candidate },
      ledger: { ...ledger, records }, limits });
  return { clock, candidate, authority, ledger, generation, delivery };
}

function expectReason(decision: PolicyDecision, kind: "suppress" | "hold", reason: string): void {
  assert.equal(decision.kind, kind);
  assert.equal(decision.reason, reason);
}

test("confirmed explicit follow-up is eligible at due time with an existing message source", () => {
  const f = fixture();
  assert.deepEqual(f.generation(), { kind: "allow", proof: {
    occurrenceId: f.candidate.occurrenceId, authorityVersion: f.authority.authorityVersion, candidate: f.candidate } });
  expectReason(f.generation({ ...f.authority, trigger: { category: "explicit_follow_up", confirmed: false } }), "suppress", "trigger_invalid");
});

test("due is inclusive; expiry is exclusive; expired backlog is not replayed", () => {
  const f = fixture();
  expectReason(f.generation(f.authority, { ...f.candidate, dueAtMs: f.clock.nowMs + HOUR }), "hold", "not_due");
  f.clock.advance(2 * DAY);
  expectReason(f.generation(), "suppress", "expired");
});

test("off, category off, consent withdrawn, deleted topic and cancellation stop both phases", () => {
  const f = fixture();
  const cases: readonly [CurrentAuthority, string][] = [
    [{ ...f.authority, settings: { ...f.authority.settings, mode: { kind: "off" } } }, "off"],
    [{ ...f.authority, settings: { ...f.authority.settings, categories: [] } }, "category_off"],
    [{ ...f.authority, accountAllowed: false }, "not_authorized"],
    [{ ...f.authority, topicAllowed: false }, "not_authorized"],
    [{ ...f.authority, intentActive: false }, "cancelled"],
    [{ ...f.authority, allowedProcessing: [] }, "processing_not_allowed"],
  ];
  for (const [a, reason] of cases) for (const run of [f.generation, f.delivery]) expectReason(run(a), "suppress", reason);
});

test("pause is distinct from off, ends at the selected instant, and still rechecks quiet hours", () => {
  const f = fixture();
  const a: CurrentAuthority = { ...f.authority, settings: { ...f.authority.settings,
    mode: { kind: "paused", untilMs: f.clock.nowMs + HOUR } } };
  expectReason(f.generation(a), "hold", "paused");
  f.clock.advance(HOUR);
  const fresh = { ...a, observedAtMs: f.clock.nowMs, sources: a.sources.map(s => ({ ...s, observedAtMs: f.clock.nowMs })) };
  assert.equal(f.generation(fresh).kind, "allow");
  expectReason(f.generation({ ...fresh, settings: { ...a.settings, mode: { kind: "paused" } } }), "hold", "paused");
});

test("owner, session, topic, occurrence and exact source-set bindings cannot be replaced", () => {
  const f = fixture();
  for (const patch of [{ ownerKey: "owner-b" }, { sessionKey: "scope-b" }, { topicId: "topic-b" }, { occurrenceId: "another" }])
    expectReason(f.delivery({ ...f.authority, ...patch }), "suppress", "binding_mismatch");
  const source = f.authority.sources[0]!;
  expectReason(f.generation({ ...f.authority, sources: [source, source] }), "suppress", "binding_mismatch");
  expectReason(f.generation({ ...f.authority, sources: [source, { ...source, id: "unrequested" }] }), "suppress", "binding_mismatch");
});

test("unknown or missing reads defer rather than claiming an empty successful source set", () => {
  const f = fixture();
  expectReason(evaluateProactive({ phase: "generation", nowMs: f.clock.nowMs, candidate: f.candidate,
    authority: { status: "unknown" }, ledger: f.ledger, limits }), "hold", "authority_unknown");
  expectReason(f.delivery({ ...f.authority, sources: [] }), "hold", "authority_unknown");
  expectReason(f.delivery({ ...f.authority, sources: f.authority.sources.map(s => ({ ...s, state: "unknown" })) }), "hold", "authority_unknown");
});

test("deleted or denied sources stop; edited sources discard old generation in either phase", () => {
  const f = fixture();
  for (const run of [f.generation, f.delivery]) {
    for (const state of ["deleted", "denied"] as const)
      expectReason(run({ ...f.authority, sources: f.authority.sources.map(s => ({ ...s, state })) }), "suppress", "source_unavailable");
    expectReason(run({ ...f.authority, sources: f.authority.sources.map(s => ({ ...s, revision: "2" })) }), "suppress", "source_changed");
  }
});

test("source data allowed locally is never automatically eligible for cloud generation or fallback", () => {
  const f = fixture();
  const cloud = { ...f.candidate, processing: "cloud" as const };
  expectReason(f.generation(f.authority, cloud), "suppress", "processing_not_allowed");
  expectReason(f.generation({ ...f.authority, allowedProcessing: ["local", "cloud"] }, cloud), "suppress", "processing_not_allowed");
});

test("a changed purpose/session/topic grant cannot deliver a previously generated result", () => {
  const f = fixture();
  expectReason(f.delivery({ ...f.authority, authorityVersion: "new-grant" }), "suppress", "generation_stale");
  expectReason(evaluateProactive({ phase: "delivery", nowMs: f.clock.nowMs, candidate: f.candidate,
    authority: f.authority, ledger: { ...f.ledger, records: [{ occurrenceId: f.candidate.occurrenceId, state: "prepared" }] }, limits }), "suppress", "generation_stale");
});

test("generation proof binds the original source revisions and target even after a candidate rebuild", () => {
  const f = fixture();
  const before = f.generation();
  assert.equal(before.kind, "allow");
  const candidate: ProactiveCandidate = { ...f.candidate, sources: f.candidate.sources.map(s => ({ ...s, revision: "2" })) };
  const authority: CurrentAuthority = { ...f.authority, sources: f.authority.sources.map(s => ({ ...s, revision: "2" })) };
  expectReason(evaluateProactive({ phase: "delivery", nowMs: f.clock.nowMs, candidate, authority,
    generated: before.proof, ledger: { ...f.ledger, records: [{ occurrenceId: candidate.occurrenceId, state: "prepared" }] }, limits }), "suppress", "generation_stale");
});

test("generation snapshots expire and a future read timestamp never grants permission", () => {
  const f = fixture();
  f.clock.advance(5001);
  expectReason(f.delivery(), "hold", "authority_stale");
  expectReason(f.generation({ ...f.authority, observedAtMs: f.clock.nowMs + 1 }), "hold", "authority_stale");
});

test("a fresh envelope cannot launder a stale source observation in either phase", () => {
  const f = fixture();
  const authority: CurrentAuthority = { ...f.authority,
    sources: f.authority.sources.map(source => ({ ...source, observedAtMs: f.clock.nowMs - DAY })) };
  for (const run of [f.generation, f.delivery]) expectReason(run(authority), "hold", "authority_stale");
});

test("only current Going plus an available future event can trigger an event contact", () => {
  const f = fixture();
  const sources: readonly SourceRef[] = [{ kind: "event", id: "event-a", revision: "projection-1" },
    { kind: "participation", id: "intent-a", revision: "3" }];
  const candidate: ProactiveCandidate = { ...f.candidate, category: "going_event", sources };
  const authority: CurrentAuthority = { ...f.authority, settings: { ...f.authority.settings, categories: ["going_event"] },
    sources: sources.map(s => ({ ...s, state: "available", observedAtMs: f.clock.nowMs, validUntilMs: f.clock.nowMs + HOUR, allowedProcessing: ["local"] })),
    trigger: { category: "going_event", participation: "going", eventState: "active", startsAtMs: f.clock.nowMs + HOUR } };
  assert.equal(f.generation(authority, candidate).kind, "allow");
  for (const participation of ["none", "interested"] as const)
    expectReason(f.delivery({ ...authority, trigger: { ...authority.trigger as Extract<CurrentAuthority["trigger"], { category: "going_event" }>, participation } }, candidate), "suppress", "trigger_invalid");
  for (const eventState of ["cancelled", "unavailable"] as const)
    expectReason(f.generation({ ...authority, trigger: { category: "going_event", participation: "going", eventState, startsAtMs: f.clock.nowMs + HOUR } }, candidate), "suppress", "trigger_invalid");
  expectReason(f.generation({ ...authority, trigger: { category: "going_event", participation: "going", eventState: "active", startsAtMs: f.clock.nowMs } }, candidate), "suppress", "trigger_invalid");
  expectReason(f.generation({ ...authority, sources: authority.sources.map(s => {
    const { validUntilMs: _, ...rest } = s; return rest;
  }) }, candidate), "hold", "authority_stale");
});

test("check-in follow-up requires its own opt-in and keeps its historical time distinct", () => {
  const f = fixture();
  const ref: SourceRef = { kind: "check_in", id: "check-in-a", revision: "4" };
  const candidate: ProactiveCandidate = { ...f.candidate, category: "check_in_follow_up", sources: [ref] };
  const authority: CurrentAuthority = { ...f.authority, settings: { ...f.authority.settings, categories: ["check_in_follow_up"] },
    sources: [{ ...ref, state: "available", observedAtMs: f.clock.nowMs, allowedProcessing: ["local"] }],
    trigger: { category: "check_in_follow_up", optedIn: true, recordedAtMs: f.clock.nowMs - DAY } };
  assert.equal(f.generation(authority, candidate).kind, "allow");
  expectReason(f.generation({ ...authority, trigger: { category: "check_in_follow_up", optedIn: false, recordedAtMs: f.clock.nowMs - DAY } }, candidate), "suppress", "trigger_invalid");
  expectReason(f.generation({ ...authority, trigger: { category: "check_in_follow_up", optedIn: true, recordedAtMs: f.clock.nowMs + 1 } }, candidate), "suppress", "trigger_invalid");
});

test("cross-midnight quiet time uses the selected zone, with start inclusive and end exclusive", () => {
  const clock = new FakeClock(Date.parse("2026-10-25T14:00:00Z")); // Singapore 22:00
  const f = fixture(clock);
  const quiet = f.generation();
  expectReason(quiet, "hold", "quiet");
  if (quiet.kind === "hold") assert.equal(quiet.recheckAtMs, Date.parse("2026-10-26T00:00:00Z"));
  clock.set("2026-10-26T00:00:00Z");
  assert.equal(f.generation({ ...f.authority, observedAtMs: clock.nowMs,
    sources: f.authority.sources.map(s => ({ ...s, observedAtMs: clock.nowMs })) }).kind, "allow");
});

test("travel re-evaluates the new time zone without resetting rolling frequency", () => {
  const f = fixture(); // 04:00 UTC, 12:00 Singapore
  assert.equal(f.generation().kind, "allow");
  const travelled: CurrentAuthority = { ...f.authority, settings: { ...f.authority.settings, timeZone: "America/New_York" } };
  expectReason(f.delivery(travelled), "hold", "quiet"); // midnight New York
  const alreadyContacted = [{ occurrenceId: "other", state: "accepted" as const, attemptedAtMs: f.clock.nowMs - 10 * HOUR }];
  expectReason(f.generation(f.authority, f.candidate, alreadyContacted), "hold", "frequency");
});

test("spring DST skipped quiet-end time releases at the first real non-quiet minute", () => {
  const f = fixture(new FakeClock(Date.parse("2026-03-08T06:59:30Z")));
  const a: CurrentAuthority = { ...f.authority, settings: { ...f.authority.settings,
    timeZone: "America/New_York", quiet: { kind: "daily", startMinute: 22 * 60, endMinute: 150 } } };
  const result = f.generation(a);
  expectReason(result, "hold", "quiet");
  if (result.kind === "hold") assert.equal(result.recheckAtMs, Date.parse("2026-03-08T07:00:00Z"));
});

test("autumn DST repeated quiet-end hour resolves from the actual current instant", () => {
  const f = fixture(new FakeClock(Date.parse("2026-11-01T06:15:00Z"))); // second 01:15
  const a: CurrentAuthority = { ...f.authority, settings: { ...f.authority.settings,
    timeZone: "America/New_York", quiet: { kind: "daily", startMinute: 22 * 60, endMinute: 90 } } };
  const result = f.generation(a);
  expectReason(result, "hold", "quiet");
  if (result.kind === "hold") assert.equal(result.recheckAtMs, Date.parse("2026-11-01T06:30:00Z"));
});

test("a same-day quiet interval is valid; missing/ambiguous zones and invalid intervals fail closed", () => {
  const f = fixture(); // 12:00 Singapore
  expectReason(f.generation({ ...f.authority, settings: { ...f.authority.settings, quiet: { kind: "daily", startMinute: 11 * 60, endMinute: 13 * 60 } } }), "hold", "quiet");
  for (const timeZone of ["", "EST", "+08:00", "Missing/Zone"])
    expectReason(f.generation({ ...f.authority, settings: { ...f.authority.settings, timeZone } }), "hold", "invalid_time_zone");
  expectReason(f.generation({ ...f.authority, settings: { ...f.authority.settings, quiet: { kind: "daily", startMinute: 0, endMinute: 0 } } }), "hold", "invalid_time_zone");
});

test("a quiet interval that outlives the trigger validity drops that occurrence", () => {
  const f = fixture(new FakeClock(Date.parse("2026-10-25T15:00:00Z")));
  expectReason(f.generation(f.authority, { ...f.candidate, expiresAtMs: f.clock.nowMs + HOUR }), "suppress", "expired");
});

test("rolling cap and cooldown have exact boundaries, and attempts count despite lost ACK", () => {
  const f = fixture();
  const record = (age: number): ContactRecord => ({ occurrenceId: "previous", state: "accepted", attemptedAtMs: f.clock.nowMs - age });
  expectReason(f.generation(f.authority, f.candidate, [record(HOUR)]), "hold", "cooldown");
  expectReason(f.generation(f.authority, f.candidate, [record(8 * HOUR)]), "hold", "frequency");
  assert.equal(f.generation(f.authority, f.candidate, [record(DAY)]).kind, "allow");
  expectReason(f.generation(f.authority, f.candidate, [{ ...record(HOUR), state: "cancelled" }]), "hold", "cooldown");
});

test("the next frequency slot uses the relevant oldest attempt when the cap is two", () => {
  const f = fixture();
  const attempts: ContactRecord[] = [12, 10].map((age, i) => ({ occurrenceId: `previous-${i}`, state: "accepted", attemptedAtMs: f.clock.nowMs - age * HOUR }));
  const result = f.generation(f.authority, f.candidate, attempts, { ...limits, maximumInWindow: 2 });
  expectReason(result, "hold", "frequency");
  if (result.kind === "hold") assert.equal(result.recheckAtMs, f.clock.nowMs + 12 * HOUR);
});

test("no incomplete, cross-owner, duplicate or future ledger can authorize dispatch", () => {
  const f = fixture();
  for (const ledger of [{ status: "unknown" as const }, { status: "current" as const, ownerKey: "other", records: [] }]) {
    const result = evaluateProactive({ phase: "generation", nowMs: f.clock.nowMs, candidate: f.candidate,
      authority: f.authority, ledger, limits });
    expectReason(result, ledger.status === "unknown" ? "hold" : "suppress", ledger.status === "unknown" ? "ledger_unknown" : "binding_mismatch");
  }
  const r: ContactRecord = { occurrenceId: "other", state: "accepted", attemptedAtMs: f.clock.nowMs + 1 };
  expectReason(f.generation(f.authority, f.candidate, [r]), "hold", "ledger_unknown");
  expectReason(f.generation(f.authority, f.candidate, [{ ...r, attemptedAtMs: f.clock.nowMs }, { ...r, attemptedAtMs: f.clock.nowMs }]), "hold", "ledger_unknown");
});

test("same-occurrence and competing-trigger suppression require owner-atomic reservation", () => {
  const f = fixture();
  const first = advanceOccurrence({ occurrenceId: f.candidate.occurrenceId, state: "queued" }, "reserve", f.clock.nowMs);
  assert.equal(first.record.state, "reserved");
  expectReason(f.generation(f.authority, f.candidate, [first.record]), "suppress", "duplicate");
  expectReason(f.generation(f.authority, f.candidate, [{ occurrenceId: "other", state: "reserved" }]), "hold", "in_flight");
  // Two preflights against an empty snapshot can both allow: this is exactly why
  // the future adapter must compare-and-reserve atomically, not trust preflight.
  assert.equal(f.generation().kind, "allow");
  assert.equal(f.generation().kind, "allow");
});

test("unknown delivery and accepted records cannot be retried after rehydrating a snapshot", () => {
  const f = fixture();
  let record: ContactRecord = { occurrenceId: f.candidate.occurrenceId, state: "queued" };
  for (const action of ["reserve", "prepare", "begin_dispatch"] as const)
    record = advanceOccurrence(record, action, f.clock.nowMs).record;
  const restored = JSON.parse(JSON.stringify(record)) as ContactRecord;
  const recovered = advanceOccurrence(restored, "recover", f.clock.nowMs).record;
  assert.equal(recovered.state, "unknown");
  for (const run of [f.generation, f.delivery]) expectReason(run(f.authority, f.candidate, [recovered]), "hold", "outcome_unknown");
  const reconciled = advanceOccurrence(recovered, "reconcile_accepted", f.clock.nowMs).record;
  expectReason(f.delivery(f.authority, f.candidate, [reconciled]), "suppress", "duplicate");
  assert.equal(advanceOccurrence(recovered, "begin_dispatch", f.clock.nowMs).kind, "unchanged");
});

test("cancel before dispatch is terminal; cancel after dispatch cannot claim platform recall", () => {
  const f = fixture();
  const prepared: ContactRecord = { occurrenceId: f.candidate.occurrenceId, state: "prepared" };
  const cancelled = advanceOccurrence(prepared, "cancel", f.clock.nowMs).record;
  assert.equal(cancelled.state, "cancelled");
  expectReason(f.delivery(f.authority, f.candidate, [cancelled]), "suppress", "duplicate");
  const dispatching = advanceOccurrence(prepared, "begin_dispatch", f.clock.nowMs).record;
  assert.equal(advanceOccurrence(dispatching, "cancel", f.clock.nowMs).record.state, "unknown");
});

test("offline prepared content still needs current authority and validity before dispatch", () => {
  const f = fixture();
  f.clock.advance(HOUR);
  expectReason(f.delivery(), "hold", "authority_stale");
  expectReason(f.delivery({ ...f.authority, observedAtMs: f.clock.nowMs, sources: f.authority.sources.map(s => ({ ...s, state: "deleted" })) }), "suppress", "source_unavailable");
  f.clock.advance(2 * DAY);
  expectReason(f.delivery({ ...f.authority, observedAtMs: f.clock.nowMs }), "suppress", "expired");
});

test("generation failure or interrupted generation does not silently generate or send again", () => {
  const f = fixture();
  const reserved: ContactRecord = { occurrenceId: f.candidate.occurrenceId, state: "reserved" };
  for (const action of ["generation_failed", "recover"] as const) {
    const failed = advanceOccurrence(reserved, action, f.clock.nowMs).record;
    expectReason(f.generation(f.authority, f.candidate, [failed]), "suppress", "duplicate");
  }
  assert.equal(advanceOccurrence({ ...reserved, state: "prepared" }, "recover", f.clock.nowMs).record.state, "failed");
  expectReason(f.delivery(f.authority, f.candidate, []), "suppress", "not_prepared");
});

test("empty sources, reversed windows and invalid limits never become permission", () => {
  const f = fixture();
  expectReason(f.generation(f.authority, { ...f.candidate, sources: [] }), "suppress", "invalid_input");
  expectReason(f.generation(f.authority, { ...f.candidate, expiresAtMs: f.candidate.dueAtMs }), "suppress", "invalid_input");
  for (const maximumInWindow of [0, -1, Number.NaN])
    expectReason(f.generation(f.authority, f.candidate, [], { ...limits, maximumInWindow }), "suppress", "invalid_input");
});
