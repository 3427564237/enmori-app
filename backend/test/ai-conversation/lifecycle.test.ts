import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAiRuntime } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import { ConversationApplication, type ConversationAdmission, type ConversationCommand, type ConversationObservation } from "../../src/ai-conversation/application/conversation-application.js";
import { captureContext } from "../../src/ai-conversation/application/capture-context.js";
import type { ConversationInput, StartView, WriteAcknowledgment } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import { err } from "../../src/shared/domain/result.js";
import { createFixture, DAY, RETENTION_MS, flush, valid, raw } from "./fakes.js";

function accepted(value: ConversationAdmission): ConversationObservation {
  assert.equal(value.accepted, true);
  if (!value.accepted) throw new Error("Expected synthetic admission");
  return value.request;
}
async function pump(): Promise<void> { await flush(); await flush(); }
function fixture() {
  const f = createFixture();
  const runtime = new BoundedAiRuntime<ConversationInput>(f.clock, f.transport);
  const app = new ConversationApplication(runtime, f.sources, f.store, f.gates, f.sink);
  function send(input = "Synthetic current message.") {
    const command = app.createSend(f.caller, f.conversation, input);
    return { command, request: accepted(app.dispatch(command)) };
  }
  function another(owner: string) {
    const caller = f.sources.caller(owner);
    const conversation = f.store.createConversation(caller);
    const command = app.createSend(caller, conversation, "Separate synthetic request.");
    return { caller, conversation, command, request: accepted(app.dispatch(command)) };
  }
  return { ...f, runtime, app, send, another };
}
type Fixture = ReturnType<typeof fixture>;
function clean(f: Fixture, command: ConversationCommand): void {
  assert.equal(f.app.inspect(command)?.processing, false);
  assert.equal(f.app.inspect(command)?.disposeCount, 1);
  assert.equal(f.gates.beforeControl.pendingReferences, 0);
  assert.equal(f.gates.candidateControl.pendingReferences, 0);
  assert.equal(f.store.userControl.pendingReferences, 0);
  assert.equal(f.store.assistantControl.pendingReferences, 0);
  assert.equal(f.sink.control.pendingReferences, 0);
}

test("LC05/15 successful lifecycle persists and delivers once with minimal metadata and actual UTC anchors", async () => {
  const f = fixture();
  const p = f.sources.addPersona(f.caller, { tone: "warm" }); f.sources.activate(f.caller, p);
  f.sources.addCheckIn(f.caller, "used");
  const { command, request } = f.send(); await pump();
  assert.equal(f.store.userCommits, 1);
  assert.equal(f.store.anchor(f.conversation), "2026-10-12T00:00:00.000Z");
  assert.deepEqual(Object.keys(f.transport.calls[0]!.input!).sort(), ["checkIns", "currentMessage", "persona"]);
  f.clock.advance(100); f.transport.calls[0]!.complete(valid("  A quiet moment.  ")); await pump();
  assert.deepEqual(await request.outcome, { ok: true, value: undefined });
  assert.deepEqual(f.sink.received, ["A quiet moment."]);
  assert.equal(f.store.assistantCommits, 1);
  const assistant = f.store.messages(f.conversation)[1]!;
  assert.equal(assistant.kind, "assistant");
  if (assistant.kind === "assistant") {
    assert.deepEqual(assistant.presentation, { presentationMode: "persona", presentationProjectionVersion: "persona_presentation_v1" });
    assert.deepEqual(assistant.provenance, [{ sourceType: "check_in", sourceId: "used" }]);
  }
  assert.equal(f.store.anchor(f.conversation), "2026-10-12T00:00:00.100Z");
  assert.equal(f.clock.pending, 0); assert.equal(f.sources.watcherCount, 0);
  assert.equal(f.transport.calls[0]!.input, undefined); assert.equal(f.transport.calls[0]!.promise, undefined);
  clean(f, command);
});

for (const mode of ["authority", "dependency", "invalid-input"] as const) test(`LC01 rejects ${mode} before admission and capture`, () => {
  const f = fixture();
  if (mode === "authority") f.sources.revoke(f.caller);
  if (mode === "dependency") f.sources.dependencyAvailable = false;
  const command = f.app.createSend(f.caller, f.conversation, mode === "invalid-input" ? "\ud800" : "Synthetic");
  assert.deepEqual(f.app.dispatch(command), { accepted: false, failure: mode === "authority" ? "stale_authority" : mode === "dependency" ? "dependency_unavailable" : "invalid_input" });
  assert.equal(f.runtime.state.nonTerminal, 0); assert.equal(f.store.userCommits, 0); assert.equal(f.transport.calls.length, 0);
  clean(f, command);
});

test("LC01/02 missing required start snapshot fails closed without a user write or quarantine", async () => {
  const f = fixture(); f.sources.captureFails = true;
  const { command, request } = f.send();
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(f.store.userCommits, 0); assert.equal(f.runtime.state.quarantined, false);
  assert.equal(f.sources.watcherCount, 0); clean(f, command);
});

test("LC01/02 shared capacity rejects overflow and preserves queued admission Persona/Check-In snapshot", async () => {
  const f = fixture(); f.another("occupier"); await pump();
  const p = f.sources.addPersona(f.caller, { tone: "warm" }); f.sources.activate(f.caller, p);
  f.sources.addCheckIn(f.caller, "used", { noteText: "Original captured note." });
  const queued = f.send(); f.another("third");
  const extra = f.sources.caller("fourth"); const conv = f.store.createConversation(extra);
  const rejected = f.app.createSend(extra, conv, "Not captured.");
  assert.deepEqual(f.app.dispatch(rejected), { accepted: false, failure: "overload" });
  assert.equal(f.store.userCommits, 1);
  f.sources.editPersona(p, { tone: "encouraging" });
  f.sources.activate(f.caller, f.sources.addPersona(f.caller));
  f.sources.addCheckIn(f.caller, "used", { noteText: "Edited note." });
  f.clock.advance(1000); f.transport.calls[0]!.complete(); await pump();
  assert.equal(queued.request.acceptedAt, 0); assert.equal(queued.request.deadline, 60000);
  assert.equal(f.transport.calls[1]!.input!.persona!.tone, "warm");
  assert.equal(f.transport.calls[1]!.input!.checkIns[0]!.noteText, "Original captured note.");
  f.runtime.shutdown(); await pump(); clean(f, queued.command);
});

test("LC02 no Active at admission remains default after a later activation", async () => {
  const f = fixture(); f.another("occupier"); await pump(); const queued = f.send();
  f.sources.activate(f.caller, f.sources.addPersona(f.caller));
  f.transport.calls[0]!.complete(); await pump();
  assert.equal(f.transport.calls[1]!.input!.persona, undefined);
  f.transport.calls[1]!.complete(); await pump();
  assert.equal((await queued.request.outcome).ok, true);
  const message = f.store.messages(f.conversation)[1]!;
  assert.equal(message.kind, "assistant");
  if (message.kind === "assistant") assert.deepEqual(message.presentation, { presentationMode: "default" });
});

test("LC02/15 projection whitelists fields, freezes copies, filters UTC boundaries, sorts ties and takes at most five", () => {
  const asOf = "2026-10-12T00:00:00.000Z";
  const f = fixture();
  const p = f.sources.addPersona(f.caller, { tone: "warm" }); f.sources.activate(f.caller, p);
  for (const id of ["z", "e", "d", "c", "b", "a"]) f.sources.addCheckIn(f.caller, id);
  f.sources.addCheckIn(f.caller, "future", { occurredAt: "2026-10-12T00:00:00.001Z" });
  f.sources.addCheckIn(f.caller, "old", { occurredAt: "2026-10-04T23:59:59.999Z" });
  const other = f.sources.caller("foreign"); f.sources.addCheckIn(other, "foreign");
  f.sources.addCheckIn(f.caller, "revoked"); f.sources.invalidateSource("revoked");
  const view = f.sources.capture(f.caller, f.conversation, asOf);
  Object.assign(view.persona!.projection, { name: "Not allowed", id: "Not allowed" });
  Object.assign(view.checkIns[0]!.projection, { owner: "Not allowed", location: "Not allowed", temperature: 99 });
  const context = captureContext(view, asOf, "Only explicit current message.");
  assert.deepEqual(context.provenance.map((s) => s.sourceId), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(Object.keys(context.input.persona!).sort(), ["formatStyle", "responseLength", "schemaVersion", "tone"]);
  assert.deepEqual(Object.keys(context.input.checkIns[0]!).sort(), ["activityLabel", "moodLabel", "noteText", "occurredAt", "weatherConditionLabel"]);
  assert.equal(Object.isFrozen(context.input), true); assert.equal(Object.isFrozen(context.input.checkIns[0]), true);
  Object.assign(view.persona!.projection, { tone: "neutral" });
  assert.equal(context.input.persona!.tone, "warm");
  const boundaryView: StartView = { persona: undefined, checkIns: [{ source: { sourceType: "check_in", sourceId: "boundary" },
    projection: { occurredAt: "2026-10-05T00:00:00.000Z", noteText: "", moodLabel: "calm", activityLabel: "walking", weatherConditionLabel: "clear" } }] };
  assert.equal(captureContext(boundaryView, asOf, "Synthetic").input.checkIns.length, 1);
  assert.throws(() => captureContext(boundaryView, "not-utc", "Synthetic"));
});

for (const phase of ["queued", "generating"] as const) for (const invalidation of ["persona", "source", "purpose", "conversation", "expiry"] as const) {
  test(`LC03 ${invalidation} invalidates captured authority while ${phase}`, async () => {
    const f = fixture(); const p = f.sources.addPersona(f.caller); f.sources.activate(f.caller, p); f.sources.addCheckIn(f.caller, "used");
    if (phase === "queued") { f.another("occupier"); await pump(); }
    const { command, request } = f.send(); await pump();
    if (invalidation === "persona") f.sources.deletePersona(p);
    if (invalidation === "source") f.sources.deleteSource("used");
    if (invalidation === "purpose") f.sources.revoke(f.caller);
    if (invalidation === "conversation") f.store.deleteConversation(f.conversation);
    if (invalidation === "expiry") f.sources.advanceUtc(RETENTION_MS);
    assert.deepEqual(await request.outcome, { ok: false, failure: "stale_authority" });
    await pump(); assert.equal(f.store.assistantCommits, 0); assert.equal(f.sink.accepted, 0); clean(f, command);
    if (phase === "generating") {
      assert.equal(f.runtime.state.quarantined, true); f.transport.calls[0]!.complete(); await pump();
      assert.equal(f.runtime.state.quarantined, false);
    }
    f.runtime.shutdown();
  });
}

test("LC03 unrelated deletion and edits do not invalidate a selected snapshot", async () => {
  const f = fixture(); f.sources.addCheckIn(f.caller, "used");
  const other = f.sources.addPersona(f.caller);
  const { request } = f.send(); await pump();
  f.sources.deletePersona(other); f.sources.deleteSource("unused");
  f.sources.addCheckIn(f.caller, "used", { noteText: "Edited source." });
  f.transport.calls[0]!.complete(); await pump(); assert.equal((await request.outcome).ok, true);
});

test("LC04 queue expires at exactly five seconds without writing", async () => {
  const f = fixture(); f.another("occupier"); await pump(); const queued = f.send();
  f.clock.advance(4999); assert.equal(f.app.inspect(queued.command)!.terminal, false);
  f.clock.advance(1); assert.deepEqual(await queued.request.outcome, { ok: false, failure: "queue_expired" });
  assert.equal(f.store.messages(f.conversation).length, 0); assert.equal(f.transport.calls.length, 1);
  f.runtime.shutdown(); await pump(); clean(f, queued.command);
});
test("LC04 generation subdeadline is min(dispatch+45s, original60s) and UTC movement never resets budget", async () => {
  const f = fixture(); f.gates.beforeControl.before.hold(); const { request } = f.send();
  f.clock.advance(20000); f.sources.advanceUtc(DAY); f.gates.beforeControl.before.release(); await pump();
  assert.equal(f.transport.calls[0]!.budget.deadline, 60000); assert.equal(request.deadline, 60000);
  f.clock.advance(39999); assert.equal(f.transport.calls[0]!.aborted, false);
  f.clock.advance(1); assert.deepEqual(await request.outcome, { ok: false, failure: "timed_out" });
  assert.equal(f.store.assistantCommits, 0); f.transport.calls[0]!.complete(); await pump();
});
test("LC04 generation stops logically at exact45s and quarantines until actual settlement", async () => {
  const f = fixture(); const { request } = f.send(); await pump();
  f.clock.advance(45000); assert.deepEqual(await request.outcome, { ok: false, failure: "generation_timed_out" });
  assert.equal(f.runtime.state.quarantined, true); f.transport.calls[0]!.fail(); await pump();
  assert.equal(f.runtime.state.quarantined, false);
});

for (const failure of ["unsafe_output", "stale_authority", "dependency_unavailable"] as const) test(`LC05/14 fake pre-generation ${failure} commits nothing`, async () => {
  const f = fixture(); f.gates.beforeResult = err(failure); const { request } = f.send(); await pump();
  assert.deepEqual(await request.outcome, { ok: false, failure });
  assert.equal(f.store.userCommits, 0); assert.equal(f.transport.calls.length, 0); assert.equal(f.runtime.state.quarantined, false);
});
for (const event of ["cancel", "deadline", "revoke"] as const) test(`LC05 ${event} between confirmed user effect and model dispatch retains one user and invokes no model`, async () => {
  const f = fixture(); f.store.userControl.after.hold(); const original = f.store.anchor(f.conversation);
  f.clock.advance(100); const { command, request } = f.send(); await pump(); assert.equal(f.store.userCommits, 1);
  if (event === "cancel") f.app.cancel(command, f.caller);
  if (event === "deadline") f.clock.advance(60000);
  if (event === "revoke") f.sources.revoke(f.caller);
  f.store.userControl.after.release(); await pump(); assert.equal((await request.outcome).ok, false);
  assert.equal(f.transport.calls.length, 0); assert.equal(f.runtime.state.quarantined, false);
  assert.equal(f.store.messages(f.conversation).length, 1); assert.notEqual(f.store.anchor(f.conversation), original); clean(f, command);
});

test("LC06 duplicate capability observes one outcome while a later explicit Send with identical text is new", async () => {
  const f = fixture(); const first = f.send("Same explicit text.");
  assert.equal(f.app.dispatch(first.command), f.app.dispatch(first.command)); await pump();
  f.transport.calls[0]!.complete(); await pump(); const outcome = await first.request.outcome;
  assert.deepEqual(outcome, { ok: true, value: undefined });
  assert.equal(accepted(f.app.dispatch(first.command)).outcome, first.request.outcome);
  assert.equal(f.sink.accepted, 1); const second = f.send("Same explicit text."); await pump();
  assert.equal(f.store.userCommits, 2); assert.equal(f.transport.calls.length, 2);
  f.transport.calls[1]!.complete(); await pump(); assert.equal((await second.request.outcome).ok, true);
});

async function failedUser(f: Fixture) {
  const sent = f.send("Explicit retry text."); await pump(); f.transport.calls[0]!.fail(); await pump();
  assert.equal((await sent.request.outcome).ok, false); return sent;
}
test("LC07 fresh Retry recaptures, has fresh deadline and reuses one exact saved user without restamping/history", async () => {
  const f = fixture(); const old = await failedUser(f); const anchor = f.store.anchor(f.conversation);
  f.clock.advance(2000); f.sources.activate(f.caller, f.sources.addPersona(f.caller, { tone: "encouraging" }));
  const command = f.app.createRetry(f.caller, f.conversation, old.command, "Explicit retry text.");
  const request = accepted(f.app.dispatch(command)); await pump();
  assert.equal(request.acceptedAt, 2000); assert.equal(request.deadline, 62000);
  assert.equal(f.store.userCommits, 1); assert.equal(f.store.anchor(f.conversation), anchor);
  assert.equal(f.transport.calls[1]!.input!.persona!.tone, "encouraging");
  assert.equal(f.transport.calls[1]!.input!.currentMessage, "Explicit retry text.");
  f.transport.calls[1]!.complete(); await pump(); assert.equal((await request.outcome).ok, true);
  assert.equal(f.store.messages(f.conversation).length, 2);
});
for (const mode of ["changed-input", "foreign-owner", "deleted", "expired", "already-answered", "nonterminal"] as const) test(`LC07 Retry refuses ${mode}`, async () => {
  const f = fixture();
  const old = mode === "nonterminal" ? f.send("Explicit retry text.") : await failedUser(f);
  let caller = f.caller; let conversation = f.conversation;
  if (mode === "foreign-owner") { caller = f.sources.caller("other"); conversation = f.store.createConversation(caller); }
  if (mode === "deleted") f.store.deleteConversation(f.conversation);
  if (mode === "expired") f.sources.advanceUtc(RETENTION_MS);
  if (mode === "already-answered") {
    const retry = f.app.createRetry(caller, conversation, old.command, "Explicit retry text.");
    accepted(f.app.dispatch(retry)); await pump(); f.transport.calls[1]!.complete(); await pump();
  }
  const command = f.app.createRetry(caller, conversation, old.command, mode === "changed-input" ? "Changed text." : "Explicit retry text.");
  assert.deepEqual(f.app.dispatch(command), { accepted: false, failure: "stale_authority" });
  f.runtime.shutdown(); await pump();
});

for (const committed of [false, true]) test(`LC08 unknown user acknowledgment (committed=${committed}) requires fenced authoritative readback`, async () => {
  const f = fixture(); f.store.userControl.acknowledgment = "unknown";
  if (!committed) { f.store.userControl.before.hold(); f.store.userControl.unknownBeforeEffect = true; }
  const { command, request } = f.send("Explicit retry text."); await pump();
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(f.app.inspect(command)!.uncertain, true);
  const premature = f.app.createRetry(f.caller, f.conversation, command, "Explicit retry text.");
  assert.equal(f.app.dispatch(premature).accepted, false);
  assert.equal(await f.app.reconcile(command, f.caller), "resolved");
  f.store.userControl.before.release(); await pump(); assert.equal(f.store.userCommits, committed ? 1 : 0);
  assert.equal(f.transport.calls.length, 0); clean(f, command);
  f.store.userControl.acknowledgment = "confirmed"; f.store.userControl.unknownBeforeEffect = false;
  const retry = f.app.createRetry(f.caller, f.conversation, command, "Explicit retry text.");
  assert.equal(f.app.dispatch(retry).accepted, committed); await pump();
  if (committed) { assert.equal(f.store.userCommits, 1); f.transport.calls[0]!.complete(); await pump(); }
});
test("LC08 unknown assistant acknowledgment cannot deliver or regenerate an accepted assistant after reconciliation", async () => {
  const f = fixture(); f.store.assistantControl.acknowledgment = "unknown";
  const { command, request } = f.send(); await pump(); f.transport.calls[0]!.complete(); await pump();
  assert.equal((await request.outcome).ok, false); assert.equal(f.store.assistantCommits, 1); assert.equal(f.sink.accepted, 0);
  assert.equal(await f.app.reconcile(command, f.caller), "resolved");
  const retry = f.app.createRetry(f.caller, f.conversation, command, "Synthetic current message.");
  assert.equal(f.app.dispatch(retry).accepted, false); assert.equal(f.transport.calls.length, 1); clean(f, command);
});

test("LC09 foreign operation/session and late A cancellation cannot terminate B", async () => {
  const f = fixture(); const first = f.send(); await pump();
  assert.equal("cancel" in first.request, false);
  assert.deepEqual(Object.keys(first.request).sort(), ["acceptedAt", "deadline", "outcome"]);
  assert.equal(Object.isFrozen(first.request), true);
  assert.equal(f.app.cancel(first.command, { owner: f.caller.owner, session: {} }), false);
  assert.equal(f.app.cancel(first.command, { owner: "other", session: f.caller.session }), false);
  assert.equal(f.app.cancel({}, f.caller), false);
  f.transport.calls[0]!.complete(); await pump(); await first.request.outcome;
  const second = f.send(); await pump(); f.app.cancel(first.command, f.caller);
  assert.equal(f.app.inspect(second.command)!.terminal, false); f.app.cancel(second.command, f.caller); await pump();
  assert.deepEqual(await second.request.outcome, { ok: false, failure: "cancelled" }); f.transport.calls[1]!.fail(); await pump();
});
for (const stage of ["candidate", "assistant", "sink"] as const) test(`LC10 pending ${stage} retains same-user ownership but frees generation lane for another user`, async () => {
  const f = fixture();
  const control = stage === "candidate" ? f.gates.candidateControl : stage === "assistant" ? f.store.assistantControl : f.sink.control;
  control.before.hold(); const first = f.send(); await pump(); f.transport.calls[0]!.complete(); await pump();
  assert.equal(control.before.pending, 1); assert.equal(f.app.inspect(first.command)!.terminal, false);
  assert.deepEqual(f.app.dispatch(f.app.createSend(f.caller, f.conversation, "Second same user.")), { accepted: false, failure: "overload" });
  f.another("other"); await pump(); assert.equal(f.transport.calls.length, 2);
  control.before.release(); await pump(); assert.equal((await first.request.outcome).ok, true);
  f.runtime.shutdown(); f.transport.calls[1]!.fail(); await pump();
});

for (const stage of ["before", "after"] as const) for (const end of ["cancel", "timeout"] as const) test(`LC11 ${end} ${stage} actual assistant effect is fenced with correct saved-message retention`, async () => {
  const f = fixture(); f.store.assistantControl[stage].hold();
  const { command, request } = f.send(); await pump(); f.transport.calls[0]!.complete(); await pump();
  if (end === "cancel") f.app.cancel(command, f.caller); else f.clock.advance(60000);
  f.store.assistantControl[stage].release(); await pump();
  assert.deepEqual(await request.outcome, { ok: false, failure: end === "cancel" ? "cancelled" : "timed_out" });
  assert.equal(f.store.assistantCommits, stage === "before" ? 0 : 1);
  assert.equal(f.store.messages(f.conversation).length, stage === "before" ? 1 : 2); assert.equal(f.sink.accepted, 0); clean(f, command);
});

for (const mode of ["persona", "source", "conversation", "purpose", "expiry", "sink-refused"] as const) test(`LC12 ${mode} after assistant commit blocks delivery and observes Q14/Q19 retention`, async () => {
  const f = fixture(); const p = f.sources.addPersona(f.caller); f.sources.activate(f.caller, p); f.sources.addCheckIn(f.caller, "used");
  f.sink.control.before.hold(); const { command, request } = f.send(); await pump(); f.transport.calls[0]!.complete(); await pump();
  assert.equal(f.store.assistantCommits, 1);
  if (mode === "persona") f.sources.deletePersona(p);
  if (mode === "source") f.sources.invalidateSource("used");
  if (mode === "conversation") f.store.deleteConversation(f.conversation);
  if (mode === "purpose") f.sources.revoke(f.caller);
  if (mode === "expiry") f.sources.advanceUtc(RETENTION_MS);
  if (mode === "sink-refused") f.sink.refuse = true;
  f.sink.control.before.release(); await pump(); assert.equal((await request.outcome).ok, false); assert.equal(f.sink.accepted, 0);
  const rows = f.store.messages(f.conversation);
  if (mode === "conversation" || mode === "expiry") assert.equal(rows.length, 0);
  else {
    assert.equal(rows.length, 2); const message = rows[1]!; assert.equal(message.kind, "assistant");
    if (message.kind === "assistant") {
      assert.equal(message.content, mode === "source" ? undefined : "A quiet moment.");
      if (mode === "source") { assert.equal(message.unavailable, true); assert.deepEqual(message.provenance, []); assert.equal(message.presentation, undefined); }
    }
  }
  clean(f, command);
});
test("LC12 sink acceptance succeeds once even if cancellation/deadline arrives before its acknowledgment", async () => {
  const f = fixture(); f.sink.control.after.hold(); const { command, request } = f.send(); await pump();
  f.transport.calls[0]!.complete(); await pump(); assert.deepEqual(await request.outcome, { ok: true, value: undefined });
  f.app.cancel(command, f.caller); f.clock.advance(60000); f.sink.control.after.release(); await pump();
  assert.equal(f.sink.accepted, 1); assert.equal(f.store.assistantCommits, 1); clean(f, command);
});

test("LC13 cancellation during generation clears content immediately but keeps lane quarantined until settlement", async () => {
  const f = fixture(); const { command, request } = f.send(); await pump(); f.app.cancel(command, f.caller); await pump();
  assert.equal((await request.outcome).ok, false); assert.equal(f.transport.calls[0]!.input, undefined);
  assert.deepEqual(f.runtime.state, { admission: "open", quarantined: true, queued: 0, nonTerminal: 0 });
  assert.deepEqual(f.app.dispatch(f.app.createSend(f.caller, f.conversation, "New request.")), { accepted: false, failure: "dependency_unavailable" });
  clean(f, command); f.transport.calls[0]!.complete(); await pump(); assert.equal(f.store.assistantCommits, 0);
  assert.equal(f.runtime.state.quarantined, false);
});
test("LC13 reserved lane before generation releases immediately after cancel; late old preparation has no effects", async () => {
  const f = fixture(); f.gates.beforeControl.before.hold(); const first = f.send(); const next = f.another("next");
  f.app.cancel(first.command, f.caller); f.gates.beforeControl.before.release(); await pump();
  assert.equal((await first.request.outcome).ok, false); assert.equal(f.runtime.state.quarantined, false);
  assert.equal(f.transport.calls.length, 1); assert.equal(f.store.messages(f.conversation).length, 0);
  f.transport.calls[0]!.complete(); await pump(); assert.equal((await next.request.outcome).ok, true); clean(f, first.command);
});

for (const response of [raw('{"schemaVersion":"ai_assistant_message_v1","message":"One","message":"Two"}'), raw("not-json"), valid("https://invalid.example")]) {
  test("LC14 actual raw parser rejects invalid candidate with no assistant, delivery, fallback or automatic retry", async () => {
    const f = fixture(); const { request } = f.send(); await pump(); f.transport.calls[0]!.complete(response); await pump();
    assert.deepEqual(await request.outcome, { ok: false, failure: "invalid_output" });
    assert.equal(f.store.userCommits, 1); assert.equal(f.store.assistantCommits, 0); assert.equal(f.sink.accepted, 0); assert.equal(f.transport.calls.length, 1);
  });
}
for (const failure of ["unsafe_output", "stale_authority"] as const) test(`LC14 fake semantic/authority failure ${failure} cannot persist candidate`, async () => {
  const f = fixture(); f.gates.candidateResult = err(failure); const { request } = f.send(); await pump();
  f.transport.calls[0]!.complete(); await pump(); assert.deepEqual(await request.outcome, { ok: false, failure });
  assert.equal(f.store.assistantCommits, 0); assert.equal(f.transport.calls.length, 1);
});
test("LC15 shutdown clears snapshots and outstanding callbacks, aborts but does not resume queued or active work", async () => {
  const f = fixture(); const first = f.send(); await pump(); const queued = f.another("queued");
  f.runtime.shutdown(); await pump(); assert.equal((await first.request.outcome).ok, false); assert.equal((await queued.request.outcome).ok, false);
  clean(f, first.command); clean(f, queued.command); assert.equal(f.sources.watcherCount, 0); assert.equal(f.clock.pending, 0);
  assert.equal(f.runtime.state.admission, "stopped"); f.transport.calls[0]!.complete(); await pump();
  assert.equal(f.transport.calls.length, 1); assert.equal(f.store.assistantCommits, 0); assert.equal(f.sink.accepted, 0);
});

for (const stage of ["user", "assistant"] as const) test(`LC08 resolved ${stage} readback is monotonic against a later unknown acknowledgment`, async () => {
  const f = fixture();
  let settle!: (ack: WriteAcknowledgment) => void;
  const late = new Promise<WriteAcknowledgment>((resolve) => { settle = resolve; });
  const user = f.store.user.bind(f.store); const assistant = f.store.assistant.bind(f.store);
  if (stage === "user") f.store.user = (...args) => { void user(...args); return late; };
  else f.store.assistant = (...args) => { void assistant(...args); return late; };
  const { command, request } = f.send(); await pump();
  if (stage === "assistant") { f.transport.calls[0]!.complete(); await pump(); }
  assert.equal(f.store.userCommits, 1); assert.equal(f.store.assistantCommits, stage === "assistant" ? 1 : 0);
  f.app.cancel(command, f.caller); assert.equal((await request.outcome).ok, false);
  assert.equal(await f.app.reconcile(command, f.caller), "resolved");
  settle("unknown"); await pump(); assert.equal(f.app.inspect(command)!.uncertain, false);
  f.store.user = user; f.store.assistant = assistant;
  const retry = f.app.createRetry(f.caller, f.conversation, command, "Synthetic current message.");
  assert.equal(f.app.dispatch(retry).accepted, stage === "user"); await pump();
  if (stage === "user") { assert.equal(f.store.userCommits, 1); f.transport.calls[0]!.complete(); await pump(); }
});

for (const malformed of ["nested-field", "wrong-source", "missing-id", "local-time", "invalid-date", "null-persona", "missing-persona-ref"] as const) {
  test(`LC02/15 malformed synthetic start view ${malformed} fails closed before any write or generation`, async () => {
    const f = fixture(); f.sources.addCheckIn(f.caller, "used");
    f.sources.activate(f.caller, f.sources.addPersona(f.caller));
    const captured = f.sources.capture.bind(f.sources);
    f.sources.capture = (...args) => {
      const view = captured(...args);
      if (malformed === "nested-field") Object.assign(view.checkIns[0]!.projection, { noteText: { privateOwnerId: "Must not enter model" } });
      if (malformed === "wrong-source") Object.assign(view.checkIns[0]!.source, { sourceType: "event" });
      if (malformed === "missing-id") Object.assign(view.checkIns[0]!.source, { sourceId: "" });
      if (malformed === "local-time") Object.assign(view.checkIns[0]!.projection, { occurredAt: "2026-10-12T00:00:00" });
      if (malformed === "invalid-date") Object.assign(view.checkIns[0]!.projection, { occurredAt: "2026-02-30T00:00:00Z" });
      if (malformed === "null-persona") Object.assign(view, { persona: null });
      if (malformed === "missing-persona-ref") Object.assign(view.persona!, { ref: undefined });
      return view;
    };
    const { command, request } = f.send(); await pump();
    assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
    assert.equal(f.store.userCommits, 0); assert.equal(f.transport.calls.length, 0); clean(f, command);
  });
}
test("LC02 explicit offset instants normalize to UTC without a machine-local timezone interpretation", () => {
  const f = fixture(); f.sources.addCheckIn(f.caller, "used", { occurredAt: "2026-10-12T08:00:00+08:00" });
  const asOf = "2026-10-12T08:00:00+08:00";
  const context = captureContext(f.sources.capture(f.caller, f.conversation, asOf), asOf, "Synthetic.");
  assert.equal(context.asOf, "2026-10-12T00:00:00.000Z");
  assert.equal(context.input.checkIns[0]!.occurredAt, "2026-10-12T00:00:00.000Z");
});
for (const stage of ["user", "assistant", "sink"] as const) test(`LC05/11/12 actual ${stage} event rechecks authority even without an invalidation notification`, async () => {
  const f = fixture();
  const control = stage === "user" ? f.store.userControl : stage === "assistant" ? f.store.assistantControl : f.sink.control;
  control.before.hold(); const { command, request } = f.send(); await pump();
  if (stage !== "user") { f.transport.calls[0]!.complete(); await pump(); }
  assert.equal(control.before.pending, 1);
  f.sources.current = () => false; // Deliberately no watcher notification: the effect itself must guard.
  control.before.release(); await pump();
  assert.deepEqual(await request.outcome, { ok: false, failure: "stale_authority" });
  assert.equal(f.store.userCommits, stage === "user" ? 0 : 1);
  assert.equal(f.store.assistantCommits, stage === "sink" ? 1 : 0);
  assert.equal(f.sink.accepted, 0); clean(f, command);
});
for (const identityOrToken of ["synthetic identity denial", "synthetic token-budget denial"] as const) test(`LC14 ${identityOrToken} is a fake decision and starts no model`, async () => {
  const f = fixture(); f.gates.beforeResult = err("stale_authority"); const { request } = f.send(); await pump();
  assert.equal((await request.outcome).ok, false); assert.equal(f.store.userCommits, 0); assert.equal(f.transport.calls.length, 0);
});
test("LC14 ambiguous synthetic semantic policy explicitly denies, without claiming real semantic proof", async () => {
  const f = fixture(); f.gates.candidateResult = err("unsafe_output"); const { request } = f.send(); await pump();
  f.transport.calls[0]!.complete(); await pump(); assert.deepEqual(await request.outcome, { ok: false, failure: "unsafe_output" });
  assert.equal(f.store.assistantCommits, 0); assert.equal(f.sink.accepted, 0);
});
