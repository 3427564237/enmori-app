import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAiRuntime } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import { ConversationApplication, type ConversationAdmission } from "../../src/ai-conversation/application/conversation-application.js";
import type { ConversationInput, WriteAcknowledgment } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import { deferred } from "../ai-runtime/support.js";
import { createFixture, flush } from "./fakes.js";

async function pump(): Promise<void> { await flush(); await flush(); }
function accepted(admission: ConversationAdmission) {
  assert.equal(admission.accepted, true);
  if (!admission.accepted) throw new Error("Expected synthetic admission");
  return admission.request;
}
function fixture() {
  const f = createFixture();
  const runtime = new BoundedAiRuntime<ConversationInput>(f.clock, f.transport);
  const app = new ConversationApplication(runtime, f.sources, f.store, f.gates, f.sink);
  const text = "Explicit synthetic retry input.";
  const command = app.createSend(f.caller, f.conversation, text);
  const retry = () => app.dispatch(app.createRetry(f.caller, f.conversation, command, text));
  return { ...f, runtime, app, command, retry };
}

test("LC08 cancel followed immediately by Retry cannot bypass pending user acknowledgment readback", async () => {
  const f = fixture(); f.store.userControl.after.hold();
  const request = accepted(f.app.dispatch(f.command)); await pump();
  assert.equal(f.store.userCommits, 1); assert.equal(f.transport.calls.length, 0);
  assert.equal(f.app.cancel(f.command, f.caller), true);
  // Deliberately no await/flush between cancellation and Retry: old ack has not resumed.
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(f.app.inspect(f.command)!.uncertain, true);
  assert.equal(f.store.readbacks, 0); assert.equal(f.transport.calls.length, 0);
  await pump(); assert.deepEqual(await request.outcome, { ok: false, failure: "cancelled" });
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
  assert.equal(f.store.readbacks, 1); assert.equal(f.app.inspect(f.command)!.uncertain, false);
  f.store.userControl.after.release();
  const next = accepted(f.retry()); await pump();
  assert.equal(f.transport.calls.length, 1); assert.equal(f.store.userCommits, 1);
  f.transport.calls[0]!.complete(); await pump(); assert.equal((await next.outcome).ok, true);
});

for (const stage of ["user", "assistant"] as const) for (const boundary of ["before", "after"] as const) {
  test(`LC08 deadline fences ${stage} while ${boundary}-effect acknowledgment is pending`, async () => {
    const f = fixture(); const control = stage === "user" ? f.store.userControl : f.store.assistantControl;
    control[boundary].hold(); const request = accepted(f.app.dispatch(f.command)); await pump();
    if (stage === "assistant") { f.transport.calls[0]!.complete(); await pump(); }
    assert.equal(control[boundary].pending, 1);
    f.clock.advance(60000);
    assert.equal(f.app.inspect(f.command)!.uncertain, true);
    assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
    assert.equal(f.store.readbacks, 0);
    await pump(); assert.deepEqual(await request.outcome, { ok: false, failure: "timed_out" });
    assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
    control[boundary].release(); await pump();
    const eligible = stage === "user" ? boundary === "after" : boundary === "before";
    const retried = f.retry(); assert.equal(retried.accepted, eligible);
    if (retried.accepted) {
      await pump(); f.transport.calls.at(-1)!.complete(); await pump(); assert.equal((await retried.request.outcome).ok, true);
    }
    assert.equal(f.store.userCommits, stage === "user" && boundary === "before" ? 0 : 1);
  });
}

for (const late of ["confirmed", "unknown", "rejected"] as const) {
  test(`LC08 terminal pending write remains blocked until readback despite late ${late} acknowledgment`, async () => {
    const f = fixture(); const pending = deferred<WriteAcknowledgment>();
    const original = f.store.user.bind(f.store);
    f.store.user = (...args) => { void original(...args); return pending.promise; };
    const request = accepted(f.app.dispatch(f.command)); await pump();
    assert.equal(f.store.userCommits, 1); f.app.cancel(f.command, f.caller);
    assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
    if (late === "rejected") pending.reject(new Error("Synthetic lost acknowledgment")); else pending.resolve(late);
    await pump(); assert.equal((await request.outcome).ok, false);
    assert.equal(f.app.inspect(f.command)!.uncertain, true);
    assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
    assert.equal(f.store.readbacks, 0); assert.equal(f.transport.calls.length, 0);
    f.store.user = original;
    assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
    const retry = accepted(f.retry()); await pump(); assert.equal(f.store.userCommits, 1);
    f.transport.calls[0]!.complete(); await pump(); assert.equal((await retry.outcome).ok, true);
  });
}

test("LC08 failed or unavailable readback does not resolve a terminal pending user write", async () => {
  const f = fixture(); f.store.userControl.after.hold();
  accepted(f.app.dispatch(f.command)); await pump(); f.app.cancel(f.command, f.caller);
  const original = f.store.readback.bind(f.store);
  f.store.readback = async () => undefined;
  assert.equal(await f.app.reconcile(f.command, f.caller), "unavailable");
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  f.store.readback = async () => { throw new Error("Synthetic unavailable readback"); };
  assert.equal(await f.app.reconcile(f.command, f.caller), "unavailable");
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(f.transport.calls.length, 0);
  f.store.readback = original;
  assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
  f.store.userControl.after.release();
  const retry = accepted(f.retry()); await pump(); f.transport.calls[0]!.complete(); await pump();
  assert.equal((await retry.outcome).ok, true); assert.equal(f.store.userCommits, 1);
});

test("LC08 rejected write acknowledgment after a real user effect remains uncertain without cancellation", async () => {
  const f = fixture(); const pending = deferred<WriteAcknowledgment>(); const original = f.store.user.bind(f.store);
  f.store.user = (...args) => { void original(...args); return pending.promise; };
  const request = accepted(f.app.dispatch(f.command)); await pump(); assert.equal(f.store.userCommits, 1);
  pending.reject(new Error("Synthetic acknowledgement failed")); await pump();
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(f.app.inspect(f.command)!.uncertain, true); assert.equal(f.transport.calls.length, 0);
  assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
  f.store.user = original; const retry = accepted(f.retry()); await pump();
  f.transport.calls[0]!.complete(); await pump(); assert.equal((await retry.outcome).ok, true);
});

test("LC07 confirmed user acknowledgment before generation failure permits Retry without unnecessary readback", async () => {
  const f = fixture(); const request = accepted(f.app.dispatch(f.command)); await pump();
  assert.equal(f.app.inspect(f.command)!.uncertain, false);
  f.transport.calls[0]!.fail(); await pump(); assert.equal((await request.outcome).ok, false);
  const retry = accepted(f.retry()); await pump(); assert.equal(f.store.readbacks, 0);
  assert.equal(f.store.userCommits, 1); f.transport.calls[1]!.complete(); await pump();
  assert.equal((await retry.outcome).ok, true);
});

test("LC08 an older capability cannot bypass an unresolved Retry of the same saved-user target", async () => {
  const f = fixture(); const originalRequest = accepted(f.app.dispatch(f.command)); await pump();
  f.transport.calls[0]!.fail(); await pump(); assert.equal((await originalRequest.outcome).ok, false);
  f.store.assistantControl.before.hold();
  const second = f.app.createRetry(f.caller, f.conversation, f.command, "Explicit synthetic retry input.");
  const secondRequest = accepted(f.app.dispatch(second)); await pump();
  f.transport.calls[1]!.complete(); await pump(); assert.equal(f.store.assistantControl.before.pending, 1);
  f.app.cancel(second, f.caller);
  // Reusing A instead of B must not evade B's unresolved write status.
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  await pump(); assert.equal((await secondRequest.outcome).ok, false);
  assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(f.transport.calls.length, 2); assert.equal(f.store.assistantCommits, 0);
  assert.equal(await f.app.reconcile(second, f.caller), "resolved");
  f.store.assistantControl.before.release();
  const third = accepted(f.retry()); await pump();
  f.transport.calls[2]!.complete(); await pump(); assert.equal((await third.outcome).ok, true);
  assert.equal(f.store.userCommits, 1); assert.equal(f.store.assistantCommits, 1);
});

for (const stage of ["user", "assistant"] as const) test(`LC08 synchronous ${stage} Port exception cannot imply a resolved non-commit`, async () => {
  const f = fixture();
  if (stage === "user") f.store.user = () => { throw new Error("Synthetic write exception"); };
  else f.store.assistant = () => { throw new Error("Synthetic write exception"); };
  const request = accepted(f.app.dispatch(f.command)); await pump();
  if (stage === "assistant") { f.transport.calls[0]!.complete(); await pump(); }
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(f.app.inspect(f.command)!.uncertain, true);
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(f.store.readbacks, 0); assert.equal(f.store.assistantCommits, 0);
  assert.equal(f.runtime.state.quarantined, false);
});

test("LC08 a pending readback keeps Retry blocked without blocking an intentionally new Send", async () => {
  const f = fixture(); f.store.userControl.after.hold();
  accepted(f.app.dispatch(f.command)); await pump(); f.app.cancel(f.command, f.caller);
  const barrier = deferred<void>(); const original = f.store.readback.bind(f.store);
  f.store.readback = async (...args) => { await barrier.promise; return original(...args); };
  const reconciliation = f.app.reconcile(f.command, f.caller);
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  await pump(); assert.equal(f.transport.calls.length, 0);
  f.store.userControl.after.release();
  const fresh = f.app.createSend(f.caller, f.conversation, "New intentional message.");
  const freshRequest = accepted(f.app.dispatch(fresh)); await pump();
  assert.equal(f.store.userCommits, 2); assert.equal(f.transport.calls.length, 1);
  f.transport.calls[0]!.complete(); await pump(); assert.equal((await freshRequest.outcome).ok, true);
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  barrier.resolve(); assert.equal(await reconciliation, "resolved");
  const retry = accepted(f.retry()); await pump(); f.transport.calls[1]!.complete(); await pump();
  assert.equal((await retry.outcome).ok, true); assert.equal(f.store.userCommits, 2);
});

for (const boundary of ["before", "after"] as const) test(`LC08 rejected assistant acknowledgment ${boundary} effect still requires authoritative readback`, async () => {
  const f = fixture(); const pending = deferred<WriteAcknowledgment>(); const original = f.store.assistant.bind(f.store);
  if (boundary === "before") f.store.assistantControl.before.hold();
  f.store.assistant = (...args) => { void original(...args); return pending.promise; };
  const request = accepted(f.app.dispatch(f.command)); await pump(); f.transport.calls[0]!.complete(); await pump();
  assert.equal(f.store.assistantCommits, boundary === "after" ? 1 : 0);
  pending.reject(new Error("Synthetic lost assistant acknowledgment")); await pump();
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(f.app.inspect(f.command)!.uncertain, true);
  assert.deepEqual(f.retry(), { accepted: false, failure: "stale_authority" });
  assert.equal(f.transport.calls.length, 1); assert.equal(f.sink.accepted, 0);
  assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
  f.store.assistant = original; f.store.assistantControl.before.release();
  const retry = f.retry(); assert.equal(retry.accepted, boundary === "before");
  if (retry.accepted) {
    await pump(); f.transport.calls[1]!.complete(); await pump(); assert.equal((await retry.request.outcome).ok, true);
  }
  assert.equal(f.store.userCommits, 1); assert.equal(f.store.assistantCommits, 1);
});

for (const stage of ["user", "assistant"] as const) for (const late of ["confirmed", "absent", "unknown", "rejected"] as const) {
  test(`LC08 resolved ${stage} readback and new Retry survive late ${late} acknowledgment`, async () => {
    const f = fixture(); const pending = deferred<WriteAcknowledgment>();
    const user = f.store.user.bind(f.store); const assistant = f.store.assistant.bind(f.store);
    if (stage === "user") f.store.user = (...args) => { void user(...args); return pending.promise; };
    else {
      f.store.assistantControl.before.hold();
      f.store.assistant = (...args) => { void assistant(...args); return pending.promise; };
    }
    const request = accepted(f.app.dispatch(f.command)); await pump();
    if (stage === "assistant") { f.transport.calls[0]!.complete(); await pump(); }
    f.app.cancel(f.command, f.caller);
    assert.equal(await f.app.reconcile(f.command, f.caller), "resolved");
    f.store.user = user; f.store.assistant = assistant; f.store.assistantControl.before.release();
    const retry = accepted(f.retry()); await pump();
    const calls = f.transport.calls.length;
    if (late === "rejected") pending.reject(new Error("Synthetic late acknowledgment failure")); else pending.resolve(late);
    await pump();
    assert.deepEqual(await request.outcome, { ok: false, failure: "cancelled" });
    assert.equal(f.app.inspect(f.command)!.uncertain, false);
    assert.equal(f.transport.calls.length, calls); assert.equal(f.store.userCommits, 1);
    assert.equal(f.transport.calls.at(-1)!.aborted, false);
    f.transport.calls.at(-1)!.complete(); await pump(); assert.equal((await retry.outcome).ok, true);
    assert.equal(f.store.readbacks, 1); assert.equal(f.store.assistantCommits, 1); assert.equal(f.sink.accepted, 1);
  });
}
