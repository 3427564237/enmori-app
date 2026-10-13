import assert from "node:assert/strict";
import test from "node:test";
import { PreparedRealContextReader } from "../../src/ai-conversation/application/real-context-reader.js";
import type { FullPrecisionInstant } from "../../src/ai-conversation/domain/real-effect-expiry.js";
import type {
  AcceptedContextRead, ContextDependencies, ContextReadResult, CurrentContextAuthority,
  FixedStartReadView, FixedViewValue, ReadAuthority, ReadNote, ReadNotePage,
  ReadPersonaSet, RealContextReadPort,
} from "../../src/ai-conversation/ports/real-context-reader.js";

const iso = "2026-10-13T00:00:00.000Z";
const milliseconds = Date.parse(iso);
const asOf = { seconds: milliseconds / 1000, nanoseconds: 0 };
const pid = "a".repeat(64);
const otherPid = "b".repeat(64);
const present = { schemaVersion: "persona_presentation_v1", tone: "warm", responseLength: "concise", formatStyle: "plain" } as const;
const read = <T>(value: T): ContextReadResult<T> => ({ kind: "read", value });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function note(sourceId: string, offset = 0): ReadNote {
  return { eligibility: "eligible", ownerId: "synthetic-owner", sourceId,
    occurredAt: new Date(milliseconds + offset).toISOString(), noteText: `Synthetic ${sourceId}`,
    observedVersion: { seconds: asOf.seconds - 10, nanoseconds: 123_456_000 } };
}
const page = (rows: readonly ReadNote[], more = false): ReadNotePage => ({ rows,
  next: more && rows.length > 0 ? { sourceId: rows.at(-1)!.sourceId, occurredAt: rows.at(-1)!.occurredAt } : undefined });

/** Handwritten Port fake only. No claim about actual DB snapshots or producers. */
class FakeReadPort implements RealContextReadPort, FixedStartReadView {
  identity = Object.freeze({});
  asOf: FullPrecisionInstant = { ...asOf };
  authority: ReadAuthority = { ownerId: "synthetic-owner", completed: true,
    purpose: "checkin_conversation", consent: "accepted", purposeRevocationGeneration: 4, settingsRevision: 1 };
  personas: ReadPersonaSet = { stateRevision: 1, livePersonaIds: [pid], activePersonaId: pid,
    items: [{ personaId: pid, revision: 1, projection: { ...present } }] };
  pages: ReadNotePage[] = [page([note("note-a")])];
  calls: string[] = [];
  queries: Parameters<FixedStartReadView["readNotePage"]>[0][] = [];
  opened: AcceptedContextRead[] = [];
  currentDependencies: ContextDependencies[] = [];
  openHook: (() => Promise<ContextReadResult<FixedStartReadView>>) | undefined;
  authorityHook: (() => Promise<ContextReadResult<FixedViewValue<ReadAuthority>>>) | undefined;
  personaHook: (() => Promise<ContextReadResult<FixedViewValue<ReadPersonaSet>>>) | undefined;
  pageHook: ((index: number) => Promise<ContextReadResult<FixedViewValue<ReadNotePage>>>) | undefined;
  currentHook: ((dependencies: ContextDependencies) => Promise<ContextReadResult<CurrentContextAuthority>>) | undefined;
  closeFails = false;
  wrap<T>(value: T): ContextReadResult<FixedViewValue<T>> {
    return read({ view: this.identity, asOf: { ...this.asOf }, value });
  }
  async openStart(context: AcceptedContextRead) {
    this.calls.push("open"); this.opened.push(context);
    return this.openHook ? this.openHook() : read(this);
  }
  async readAuthority() { this.calls.push("authority"); return this.authorityHook ? this.authorityHook() : this.wrap(this.authority); }
  async readPersonas() { this.calls.push("personas"); return this.personaHook ? this.personaHook() : this.wrap(this.personas); }
  async readNotePage(query: Parameters<FixedStartReadView["readNotePage"]>[0]) {
    this.calls.push("page"); const index = this.queries.length; this.queries.push(query);
    if (this.pageHook) return this.pageHook(index);
    return this.pages[index] ? this.wrap(this.pages[index]) : { kind: "unavailable" } as const;
  }
  close() { this.calls.push("close"); if (this.closeFails) throw new Error("synthetic close unavailable"); }
  async readCurrent(_context: AcceptedContextRead, dependencies: ContextDependencies) {
    this.calls.push("current"); this.currentDependencies.push(dependencies);
    if (this.currentHook) return this.currentHook(dependencies);
    return read({ authority: this.authority, usedPersona: dependencies.usedPersonaId ? "exists" : "not-used",
      sources: dependencies.sources.map(s => ({ sourceId: s.sourceId, state: "valid" as const })) } as const);
  }
}
function fixture(change: Partial<AcceptedContextRead> = {}) {
  const port = new FakeReadPort();
  const abort = new AbortController();
  const clock = { now: 1000, guard: true };
  const context: AcceptedContextRead = { principal: { firebaseUid: "synthetic-uid" }, ownerId: "synthetic-owner",
    session: {}, originalRequest: {}, acceptedAt: 1000, deadline: 61_000, asOf: { ...asOf }, signal: abort.signal, ...change };
  const reader = new PreparedRealContextReader(context, port, () => clock.now, () => clock.guard);
  return { reader, port, clock, context, abort };
}
async function until(f: () => boolean) {
  for (let i = 0; i < 30; i++) { if (f()) return; await Promise.resolve(); }
  assert.fail("synthetic checkpoint was not reached");
}

test("fixed start reads authority before content; model and dependencies are separate Note-only copies", async () => {
  const { reader, port } = fixture();
  assert.equal(await reader.prepare(), "ready");
  assert.deepEqual(port.calls, ["open", "authority", "personas", "page", "close"]);
  assert.deepEqual(reader.modelContext(), { persona: present, checkIns: [{ occurredAt: iso, noteText: "Synthetic note-a" }] });
  assert.deepEqual(Object.keys(reader.modelContext()!), ["persona", "checkIns"]);
  assert.equal(reader.dependencies()!.purposeRevocationGeneration, 4);
  assert.equal(reader.dependencies()!.usedPersonaId, pid);
  assert.equal(reader.dependencies()!.sources[0]!.sourceId, "note-a");
  assert.equal("noteText" in reader.dependencies()!.sources[0]!, false);
});

test("purpose denied, incomplete or rebound owner prevents every content read", async () => {
  for (const change of [{ consent: "rejected" as const }, { completed: false }, { ownerId: "other-owner" }]) {
    const { reader, port } = fixture(); port.authority = { ...port.authority, ...change };
    assert.equal(await reader.prepare(), "denied");
    assert.deepEqual(port.calls, ["open", "authority", "close"]);
    assert.equal(reader.modelContext(), undefined);
  }
});

test("missing generation and malformed authority are unavailable, not empty or default", async () => {
  for (const change of [{ purposeRevocationGeneration: undefined }, { settingsRevision: -1 }, { purpose: "other-purpose" }]) {
    const { reader, port } = fixture(); port.authority = { ...port.authority, ...change } as ReadAuthority;
    assert.equal(await reader.prepare(), "unavailable");
    assert.equal(port.calls.includes("personas"), false);
  }
});

test("acceptance context is copied once and its original budget never restarts during delayed reads", async () => {
  const f = fixture(); const pending = deferred<ContextReadResult<FixedViewValue<ReadPersonaSet>>>();
  f.port.personaHook = () => pending.promise;
  const result = f.reader.prepare(); await until(() => f.port.calls.includes("personas"));
  (f.context.asOf as { seconds: number }).seconds++;
  (f.context.principal as { firebaseUid: string }).firebaseUid = "changed";
  (f.context as { deadline: number }).deadline = 200_000;
  f.clock.now = 60_999;
  pending.resolve(f.port.wrap(f.port.personas));
  assert.equal(await result, "ready");
  assert.equal(f.port.opened[0]!.deadline, 61_000);
  assert.equal(f.port.opened[0]!.principal.firebaseUid, "synthetic-uid");
  assert.deepEqual(f.port.queries[0]!.toInclusive, asOf);
  f.clock.now = 61_000;
  assert.equal(f.reader.modelContext(), undefined);
  assert.equal(f.reader.status, "terminated");
});

test("invalid admission deadline, unsafe timestamps and already aborted requests open no view", async () => {
  for (const change of [{ deadline: 61_001 }, { asOf: { seconds: asOf.seconds, nanoseconds: 1e9 } },
    { asOf: { seconds: Number.MIN_SAFE_INTEGER, nanoseconds: 0 } }]) {
    const f = fixture(change); assert.equal(await f.reader.prepare(), "unavailable"); assert.deepEqual(f.port.calls, []);
  }
  const controller = new AbortController(); controller.abort();
  const f = fixture({ signal: controller.signal });
  assert.equal(await f.reader.prepare(), "terminated"); assert.deepEqual(f.port.calls, []);
});

test("each metadata/page must be bound to the acceptance view and exact asOf; no latest fallback", async () => {
  for (const phase of ["open", "persona", "page"] as const) {
    const f = fixture();
    if (phase === "open") f.port.asOf = { ...asOf, nanoseconds: 1 };
    else if (phase === "persona") f.port.personaHook = async () => read({ view: f.port.identity, asOf: { ...asOf, nanoseconds: 1 }, value: f.port.personas });
    else f.port.pageHook = async () => read({ view: {}, asOf, value: f.port.pages[0]! });
    assert.equal(await f.reader.prepare(), "unavailable");
    assert.equal(f.port.opened.length, 1); assert.equal(f.reader.modelContext(), undefined);
  }
});

test("authorization filtering precedes the five-item limit, including equal-time page boundaries", async () => {
  const f = fixture();
  f.port.pages = [page(Array.from({ length: 5 }, (_, i) => ({ eligibility: "excluded" as const, sourceId: `a${i}`, occurredAt: iso })), true),
    page([note("b0"), note("b1"), note("b2")], true), page([note("c0"), note("c1"), note("c2")])];
  assert.equal(await f.reader.prepare(), "ready");
  assert.deepEqual(f.reader.dependencies()!.sources.map(s => s.sourceId), ["b0", "b1", "b2", "c0", "c1"]);
  assert.equal(f.port.queries.length, 3);
  assert.deepEqual(f.port.queries[1]!.after, { occurredAt: iso, sourceId: "a4" });
  for (const q of f.port.queries) { assert.deepEqual(q.toInclusive, asOf); assert.equal(q.limit, 25); }
});

test("seven-day endpoints are inclusive; future and earlier rows are excluded before selection", async () => {
  const f = fixture(); const span = 7 * 86_400_000;
  f.port.pages = [page([note("future", 1), note("upper"), note("lower", -span), note("old", -span - 1)])];
  assert.equal(await f.reader.prepare(), "ready");
  assert.deepEqual(f.reader.dependencies()!.sources.map(s => s.sourceId), ["upper", "lower"]);
});

test("sub-millisecond acceptance does not floor the seven-day lower bound", async () => {
  const f = fixture({ asOf: { ...asOf, nanoseconds: 1 } }); f.port.asOf = { ...asOf, nanoseconds: 1 };
  const span = 7 * 86_400_000;
  f.port.pages = [page([note("upper"), note("inside", -span + 1), note("below-exact-lower", -span)])];
  assert.equal(await f.reader.prepare(), "ready");
  assert.deepEqual(f.reader.dependencies()!.sources.map(s => s.sourceId), ["upper", "inside"]);
  assert.deepEqual(f.port.queries[0]!.fromInclusive, { seconds: asOf.seconds - 604800, nanoseconds: 1 });
});

test("unstable tie order, duplicate identities and invalid cursors cannot silently select a context", async () => {
  const invalidPages = [
    [page([note("b"), note("a")])],
    [page([note("a")], true), page([note("a", -1)])],
    [{ rows: [note("a")], next: { occurredAt: iso, sourceId: "b" } }],
    [{ rows: [], next: { occurredAt: iso, sourceId: "a" } }],
    [page(Array.from({ length: 26 }, (_, i) => note(`a${String(i).padStart(2, "0")}`)))],
    [page([note("a")], true), page([note("a")])],
    [page([{ eligibility: "excluded" as const, sourceId: "a", occurredAt: iso }], true), page([note("a", -1)])],
    [page([note("a"), note("b"), note("c"), note("d"), note("e"), note("z", -1), note("z", -2)])],
  ];
  for (const pages of invalidPages) {
    const f = fixture(); f.port.pages = pages;
    assert.equal(await f.reader.prepare(), "unavailable"); assert.equal(f.reader.modelContext(), undefined);
  }
});

test("failed required later page drops partial content and cannot be reported as empty or five-item success", async () => {
  const f = fixture(); f.port.pages = [page([note("a")], true)];
  assert.equal(await f.reader.prepare(), "unavailable");
  assert.equal(f.reader.dependencies(), undefined); assert.equal(f.reader.modelContext(), undefined);
  assert.equal(f.port.queries.length, 2);
});

test("noncanonical time, corrupt Note, wrong owner and unknown page are failures, not exclusions", async () => {
  for (const change of [{ occurredAt: "2026-10-13T00:00:00Z" }, { occurredAt: "2026-10-13T00:00:00.000000001Z" },
    { noteText: " trimmed " }, { noteText: "\ud800" }, { noteText: "" }, { ownerId: "other" },
    { observedVersion: undefined }, { eligibility: "unknown" }]) {
    const f = fixture(); f.port.pages = [page([{ ...note("a"), ...change } as ReadNote])];
    assert.equal(await f.reader.prepare(), "unavailable"); assert.equal(f.reader.modelContext(), undefined);
  }
  const f = fixture(); f.port.pageHook = async () => read({ view: f.port.identity, asOf, value: undefined as unknown as ReadNotePage });
  assert.equal(await f.reader.prepare(), "unavailable");
});

test("source version later than the fixed view contradicts that view instead of authorizing a Note", async () => {
  for (const version of [{ seconds: asOf.seconds, nanoseconds: 1 }, { seconds: asOf.seconds + 1, nanoseconds: 0 }]) {
    const f = fixture(); f.port.pages = [page([{ ...note("a"), observedVersion: version } as ReadNote])];
    assert.equal(await f.reader.prepare(), "unavailable"); assert.equal(f.reader.modelContext(), undefined);
  }
  const exact = fixture(); exact.port.pages = [page([{ ...note("a"), observedVersion: asOf } as ReadNote])];
  assert.equal(await exact.reader.prepare(), "ready");
});

test("trusted Firebase UID is not incorrectly constrained to a document path or AI UUID", async () => {
  const f = fixture({ principal: { firebaseUid: "synthetic/uid" } });
  assert.equal(await f.reader.prepare(), "ready");
  assert.equal(f.port.opened[0]!.principal.firebaseUid, "synthetic/uid");
});

test("only a complete legal Persona set without Active grants default; missing membership never does", async () => {
  const empty = fixture(); empty.port.personas = { stateRevision: 0, livePersonaIds: [], items: [] }; empty.port.pages = [page([])];
  assert.equal(await empty.reader.prepare(), "ready");
  assert.deepEqual(empty.reader.modelContext(), { persona: undefined, checkIns: [] });
  for (const change of [{ activePersonaId: otherPid }, { items: [] }, { livePersonaIds: [pid, pid] },
    { stateRevision: undefined }, { items: [{ personaId: pid, revision: 0, projection: present }] }]) {
    const f = fixture(); f.port.personas = { ...f.port.personas, ...change } as ReadPersonaSet;
    assert.equal(await f.reader.prepare(), "unavailable"); assert.equal(f.port.queries.length, 0);
  }
});

test("snapshot copies cannot be changed by later producer object mutation or extra source fields", async () => {
  const f = fixture();
  f.port.pages = [page([{ ...note("a"), moodLabel: "do not project", text: "not a Note field" } as unknown as ReadNote])];
  assert.equal(await f.reader.prepare(), "ready");
  (f.port.personas.items[0]!.projection as { tone: string }).tone = "neutral";
  (f.port.pages[0]!.rows[0] as { noteText: string }).noteText = "changed";
  (f.port.pages[0]!.rows[0] as { observedVersion: { seconds: number } }).observedVersion.seconds++;
  assert.equal(f.reader.modelContext()!.persona!.tone, "warm");
  assert.equal(f.reader.modelContext()!.checkIns[0]!.noteText, "Synthetic a");
  assert.deepEqual(Object.keys(f.reader.modelContext()!.checkIns[0]!), ["occurredAt", "noteText"]);
  assert.equal(f.reader.dependencies()!.sources[0]!.observedVersion.seconds, asOf.seconds - 10);
  assert.throws(() => { (f.reader.modelContext()!.checkIns as unknown[]).push({}); });
});

test("abort before pending view opens settles non-content completion and closes late handle without content reads", async () => {
  const f = fixture(); const pending = deferred<ContextReadResult<FixedStartReadView>>();
  f.port.openHook = () => pending.promise;
  const result = f.reader.prepare(); f.abort.abort();
  assert.equal(await result, "terminated");
  pending.resolve(read(f.port)); await until(() => f.port.calls.includes("close"));
  assert.deepEqual(f.port.calls, ["open", "close"]); assert.equal(f.reader.modelContext(), undefined);
});

test("terminal during Persona or Note await clears holder and late results cannot revive it", async () => {
  for (const stage of ["personas", "page"] as const) {
    const f = fixture(); const latePersona = deferred<ContextReadResult<FixedViewValue<ReadPersonaSet>>>();
    const latePage = deferred<ContextReadResult<FixedViewValue<ReadNotePage>>>();
    if (stage === "personas") f.port.personaHook = () => latePersona.promise;
    else f.port.pageHook = () => latePage.promise;
    const result = f.reader.prepare(); await until(() => f.port.calls.includes(stage));
    f.reader.dispose(); assert.equal(await result, "terminated");
    assert.equal(f.port.calls.filter(c => c === "close").length, 1);
    latePersona.resolve(f.port.wrap(f.port.personas)); latePage.resolve(f.port.wrap(f.port.pages[0]!));
    await until(() => f.port.calls.includes("close"));
    await Promise.resolve(); await Promise.resolve();
    assert.equal(f.port.calls.filter(c => c === "close").length, 1);
    assert.equal(f.reader.modelContext(), undefined); assert.equal(f.reader.dependencies(), undefined);
    assert.equal(await f.reader.prepare(), "terminated");
  }
});

test("deadline or original-guard loss while I/O is pending remains terminal after recovery", async () => {
  for (const kind of ["deadline", "guard"] as const) {
    const f = fixture(); const pending = deferred<ContextReadResult<FixedViewValue<ReadNotePage>>>();
    f.port.pageHook = () => pending.promise;
    const result = f.reader.prepare(); await until(() => f.port.calls.includes("page"));
    if (kind === "deadline") f.clock.now = 61_000; else f.clock.guard = false;
    assert.equal(f.reader.status, "terminated");
    f.clock.now = 1000; f.clock.guard = true;
    pending.resolve(f.port.wrap(f.port.pages[0]!));
    assert.equal(await result, "terminated"); assert.equal(await f.reader.prepare(), "terminated");
  }
});

test("withdrawal then regrant is detected by current generation and does not reopen the old request", async () => {
  const f = fixture(); assert.equal(await f.reader.prepare(), "ready");
  f.port.authority = { ...f.port.authority, consent: "accepted", purposeRevocationGeneration: 5 };
  assert.equal(await f.reader.revalidate(), "denied"); assert.equal(f.reader.modelContext(), undefined);
  f.port.authority = { ...f.port.authority, purposeRevocationGeneration: 4 };
  assert.equal(await f.reader.revalidate(), "denied"); assert.equal(f.port.currentDependencies.length, 1);
});

test("rollback/missing generation is unavailable, not evidence of source deletion", async () => {
  for (const generation of [3, undefined, -1]) {
    const f = fixture(); await f.reader.prepare();
    f.port.authority = { ...f.port.authority, purposeRevocationGeneration: generation } as ReadAuthority;
    assert.equal(await f.reader.revalidate(), "unavailable"); assert.equal(f.reader.modelContext(), undefined);
  }
});

test("rejected consent cannot turn a generation rollback into confirmed withdrawal evidence", async () => {
  const f = fixture(); assert.equal(await f.reader.prepare(), "ready");
  f.port.authority = { ...f.port.authority, consent: "rejected", purposeRevocationGeneration: 3 };
  assert.equal(await f.reader.revalidate(), "unavailable");
  assert.equal(f.reader.modelContext(), undefined);
  f.port.authority = { ...f.port.authority, consent: "accepted", purposeRevocationGeneration: 4 };
  assert.equal(await f.reader.revalidate(), "unavailable");
  assert.equal(f.port.currentDependencies.length, 1);
});

test("Persona edit/switch and settings or visibility-only changes retain the original projection", async () => {
  const f = fixture(); await f.reader.prepare();
  f.port.authority = { ...f.port.authority, settingsRevision: 99 };
  f.port.personas = { stateRevision: 8, activePersonaId: otherPid, livePersonaIds: [otherPid],
    items: [{ personaId: otherPid, revision: 2, projection: { ...present, tone: "neutral" } }] };
  // The current Port proves the used source's immutable identity/content despite
  // allowed metadata/updateTime changes; comparing generic revisions would fail.
  assert.equal(await f.reader.revalidate(), "ready");
  assert.equal(f.reader.modelContext()!.persona!.tone, "warm");
  assert.equal(f.reader.dependencies()!.usedPersonaId, pid);
  assert.equal(f.port.calls.filter(x => x === "personas").length, 1);
});

test("used Persona deletion invalidates; later activation after captured default does not", async () => {
  const f = fixture(); await f.reader.prepare();
  f.port.currentHook = async deps => read({ authority: f.port.authority, usedPersona: "deleted",
    sources: deps.sources.map(s => ({ sourceId: s.sourceId, state: "valid" })) });
  assert.equal(await f.reader.revalidate(), "denied");
  const initialDefault = fixture(); initialDefault.port.personas = { stateRevision: 0, livePersonaIds: [], items: [] };
  await initialDefault.reader.prepare(); initialDefault.port.personas = f.port.personas;
  assert.equal(await initialDefault.reader.revalidate(), "ready");
  assert.equal(initialDefault.reader.modelContext()!.persona, undefined);
});

test("current source deletion, missing or duplicate evidence never passes as current validity", async () => {
  for (const sources of [[{ sourceId: "note-a", state: "deleted" as const }], [],
    [{ sourceId: "unrelated", state: "valid" as const }],
    [{ sourceId: "note-a", state: "valid" as const }, { sourceId: "note-a", state: "valid" as const }]]) {
    const f = fixture(); await f.reader.prepare();
    f.port.currentHook = async () => read({ authority: f.port.authority, usedPersona: "exists", sources });
    assert.equal(await f.reader.revalidate(), sources[0]?.state === "deleted" ? "denied" : "unavailable");
    assert.equal(f.reader.modelContext(), undefined);
  }
});

test("late current success cannot clear a newer loss of authority on the same reader", async () => {
  const f = fixture(); await f.reader.prepare(); const pending = deferred<ContextReadResult<CurrentContextAuthority>>();
  f.port.currentHook = () => pending.promise; const earlier = f.reader.revalidate();
  f.port.currentHook = async () => ({ kind: "denied" });
  assert.equal(await f.reader.revalidate(), "denied");
  pending.resolve(read({ authority: f.port.authority, usedPersona: "exists", sources: [{ sourceId: "note-a", state: "valid" }] }));
  assert.equal(await earlier, "denied"); assert.equal(f.reader.modelContext(), undefined);
});

test("prepare is one-shot with non-content completion; no repeat read after success or failure", async () => {
  const f = fixture(); const first = f.reader.prepare(); assert.equal(f.reader.prepare(), first);
  assert.equal(await first, "ready"); assert.equal(await f.reader.prepare(), "ready");
  assert.equal(f.port.opened.length, 1);
  f.reader.dispose(); assert.equal(await f.reader.prepare(), "terminated");
  const failed = fixture(); failed.port.openHook = async () => { throw new Error("synthetic dependency"); };
  assert.equal(await failed.reader.prepare(), "unavailable"); assert.equal(await failed.reader.prepare(), "unavailable");
  assert.equal(failed.port.opened.length, 1);
});

test("failed view release cannot report a successful prepared context", async () => {
  const f = fixture(); f.port.closeFails = true;
  assert.equal(await f.reader.prepare(), "unavailable"); assert.equal(f.reader.modelContext(), undefined);
  assert.equal(f.port.calls.filter(c => c === "close").length, 1);
});

test("authority pending at terminal is never validated as content permission and view closes once immediately", async () => {
  const f = fixture(); const pending = deferred<ContextReadResult<FixedViewValue<ReadAuthority>>>();
  f.port.authorityHook = () => pending.promise;
  const result = f.reader.prepare(); await until(() => f.port.calls.includes("authority"));
  f.abort.abort(); assert.equal(await result, "terminated");
  assert.deepEqual(f.port.calls, ["open", "authority", "close"]);
  pending.resolve(f.port.wrap(f.port.authority));
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(f.port.calls, ["open", "authority", "close"]);
  assert.equal(f.reader.modelContext(), undefined);
});

test("broken signal and throwing/non-boolean original guard fail closed without opening a view", async () => {
  const broken = fixture({ signal: {} as AbortSignal });
  assert.equal(await broken.reader.prepare(), "unavailable"); assert.deepEqual(broken.port.calls, []);
  for (const guard of [() => { throw new Error("synthetic guard unavailable"); }, () => 1 as unknown as boolean]) {
    const f = fixture();
    const reader = new PreparedRealContextReader(f.context, f.port, () => 1000, guard);
    assert.equal(await reader.prepare(), "terminated"); assert.deepEqual(f.port.calls, []);
  }
});
