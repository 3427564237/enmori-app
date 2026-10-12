import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAiRuntime, type RuntimeApplicationAdmission, type RuntimeApplicationControl,
  type RuntimeApplicationRequest, type RuntimeApplicationWork, type RuntimeFailure } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import type { OutputCandidate } from "../../src/ai-runtime/domain/parse-output.js";
import type { Result } from "../../src/shared/domain/result.js";
import { accepted, deferred, FakeClock, FakeTransport, flush, raw, valid, work } from "./support.js";

const ok = (): Result<void, RuntimeFailure> => ({ ok: true, value: undefined });

function applicationAccepted(admission: RuntimeApplicationAdmission): RuntimeApplicationRequest {
  assert.equal(admission.accepted, true);
  if (!admission.accepted) throw new Error("Expected accepted synthetic Application");
  return admission.request;
}

class FakeApplicationWork implements RuntimeApplicationWork<string> {
  readonly purpose = "ai_assistant_message_v1";
  input: string | undefined;
  candidate: OutputCandidate | undefined;
  authority = true;
  disposed = 0;
  preparations = 0;
  dispatches = 0;
  candidates = 0;
  checks = 0;
  deliveries = 0;
  sinks = 0;
  readonly preparation = deferred<void>();
  readonly checking = deferred<void>();
  readonly delivery = deferred<void>();

  constructor(readonly control: RuntimeApplicationControl, input = "synthetic start view") {
    this.input = input;
  }
  prepare(): Promise<void> { this.preparations++; return this.preparation.promise; }
  dispatchInput(): Result<string, RuntimeFailure> {
    this.dispatches++;
    return this.authority && this.input !== undefined
      ? { ok: true, value: this.input } : { ok: false, failure: "stale_authority" };
  }
  acceptCandidate(candidate: OutputCandidate): void { this.candidates++; this.candidate = candidate; }
  checkCandidate(): Promise<void> { this.checks++; return this.checking.promise; }
  commitAndDeliver(): Promise<void> { this.deliveries++; return this.delivery.promise; }
  acceptSink(): Result<void, RuntimeFailure> {
    return this.control.complete(() => {
      if (!this.authority) return { ok: false, failure: "stale_authority" };
      assert.notEqual(this.candidate, undefined);
      this.sinks++;
      return ok();
    });
  }
  dispose(): void { this.disposed++; this.input = undefined; this.candidate = undefined; }
}

function fixture() {
  const clock = new FakeClock();
  const transport = new FakeTransport();
  const runtime = new BoundedAiRuntime(clock, transport);
  function submit(user = "owner", input?: string) {
    let item!: FakeApplicationWork;
    const request = applicationAccepted(runtime.submitApplication(user, (control) => {
      item = new FakeApplicationWork(control, input);
      return item;
    }));
    return { request, item };
  }
  return { clock, transport, runtime, submit };
}

test("Application and component paths share one FIFO capacity owner and rejection never captures", async () => {
  const { clock, transport, runtime, submit } = fixture();
  const first = accepted(runtime.submit("component", work("first")));
  const second = submit("application", "second");
  const third = accepted(runtime.submit("component-2", work("third")));
  let rejectedCaptures = 0;
  const capture = (control: RuntimeApplicationControl) => { rejectedCaptures++; return new FakeApplicationWork(control); };
  assert.deepEqual(runtime.submitApplication("fourth", capture), { accepted: false, failure: "overload" });
  assert.deepEqual(runtime.submitApplication("component", capture), { accepted: false, failure: "overload" });
  assert.deepEqual(runtime.submit("application", work()), { accepted: false, failure: "overload" });
  assert.equal(rejectedCaptures, 0);
  assert.equal(second.item.preparations, 0);
  assert.deepEqual(runtime.state, { admission: "busy", quarantined: false, queued: 2, nonTerminal: 3 });
  second.item.preparation.resolve();
  await flush();
  assert.equal(transport.calls.length, 1);
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal((await first.outcome).ok, true);
  assert.equal(transport.calls[1]!.input, "second");
  transport.calls[1]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls[2]!.input, "third");
  assert.equal(runtime.state.nonTerminal, 2);
  second.item.checking.resolve(); await flush();
  assert.deepEqual(second.item.acceptSink(), ok());
  transport.calls[2]!.completion.resolve(valid()); await flush();
  assert.equal((await third.outcome).ok, true);
  assert.deepEqual(await second.request.outcome, ok());
  assert.equal(clock.pending, 0);
});

test("synchronous admission reserves capacity and freezes the queued start view before any preparation", async () => {
  const { transport, runtime } = fixture();
  accepted(runtime.submit("first", work()));
  let current = "persona at acceptance";
  let captures = 0;
  let item!: FakeApplicationWork;
  const request = applicationAccepted(runtime.submitApplication("queued", (control) => {
    captures++;
    assert.equal(runtime.state.nonTerminal, 2);
    assert.equal(runtime.state.queued, 1);
    assert.deepEqual(runtime.submit("queued", work()), { accepted: false, failure: "overload" });
    item = new FakeApplicationWork(control, current);
    return item;
  }));
  current = "later edited/active persona";
  assert.equal(captures, 1);
  assert.equal(item.preparations, 0);
  item.preparation.resolve();
  await flush(); transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls[1]!.input, "persona at acceptance");
  request.cancel("cancelled"); transport.calls[1]!.completion.resolve(valid()); await flush();
  assert.equal(item.disposed, 1);
  assert.equal(item.input, undefined);
});

test("capture failure is an accepted safe terminal, disposes a returned holder once and reserves no zombie lane", async () => {
  for (const failure of ["throw", "fail"] as const) {
    const { clock, transport, runtime, submit } = fixture();
    let item: FakeApplicationWork | undefined;
    const request = applicationAccepted(runtime.submitApplication("owner", (control) => {
      if (failure === "throw") throw new Error("synthetic private capture error");
      item = new FakeApplicationWork(control);
      control.fail("stale_authority");
      return item;
    }));
    assert.equal(request.acceptedAt, 0); assert.equal(request.deadline, 60_000);
    assert.deepEqual(await request.outcome, { ok: false, failure: failure === "throw" ? "dependency_unavailable" : "stale_authority" });
    assert.equal(runtime.state.nonTerminal, 0); assert.equal(runtime.state.quarantined, false);
    assert.equal(clock.pending, 0); assert.equal(transport.calls.length, 0);
    if (item) { assert.equal(item.disposed, 1); assert.equal(item.input, undefined); }
    const replacement = submit();
    replacement.request.cancel("cancelled");
    request.cancel("abandoned");
    assert.equal(replacement.item.disposed, 1);
  }
});

test("candidate-ready holds user and original deadline through validation, commit and sink", async () => {
  const { clock, transport, runtime, submit } = fixture();
  const { request, item } = submit();
  item.preparation.resolve(); await flush();
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(item.checks, 1); assert.equal(item.deliveries, 0);
  assert.equal(runtime.state.quarantined, false);
  assert.deepEqual(runtime.submit("owner", work()), { accepted: false, failure: "overload" });
  const other = accepted(runtime.submit("other", work())); await flush();
  assert.equal(transport.calls.length, 2);
  item.checking.resolve(); await flush();
  assert.equal(item.deliveries, 1);
  assert.deepEqual(runtime.submit("owner", work()), { accepted: false, failure: "overload" });
  assert.equal(item.control.deadline, request.deadline);
  clock.advance(1_000);
  assert.equal(item.control.remainingMs(), 59_000);
  assert.deepEqual(item.acceptSink(), ok());
  // Terminal/disposal/user release are synchronous with sink acceptance, even
  // while the fake delivery acknowledgment remains unresolved.
  assert.equal(item.control.live(), false); assert.equal(item.disposed, 1);
  assert.equal(item.candidate, undefined); assert.equal(item.input, undefined);
  assert.equal(runtime.state.nonTerminal, 1);
  assert.deepEqual(await request.outcome, ok());
  const replacement = submit();
  request.cancel("abandoned"); item.control.fail("dependency_unavailable");
  assert.equal(replacement.item.control.live(), true);
  assert.deepEqual(item.acceptSink(), { ok: false, failure: "cancelled" });
  assert.equal(item.sinks, 1);
  replacement.request.cancel("cancelled");
  item.delivery.resolve(); transport.calls[1]!.completion.resolve(valid()); await flush();
  assert.equal((await other.outcome).ok, true); assert.equal(clock.pending, 0);
});

test("success cannot bypass parsed-candidate checks or the actual sink phase", async () => {
  const { runtime, transport } = fixture();
  let effects = 0;
  const request = applicationAccepted(runtime.submitApplication("owner", (control) => {
    const item = new FakeApplicationWork(control);
    assert.deepEqual(control.complete(() => { effects++; return ok(); }), { ok: false, failure: "dependency_unavailable" });
    return item;
  }));
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(effects, 0); assert.equal(transport.calls.length, 0);
});

test("queued Application expires at 5 seconds without prepare/write/generation and clears its captured input", async () => {
  const { clock, transport, runtime, submit } = fixture();
  accepted(runtime.submit("active", work())); await flush();
  const { request, item } = submit();
  item.preparation.resolve();
  clock.advance(5_000);
  assert.deepEqual(await request.outcome, { ok: false, failure: "queue_expired" });
  assert.equal(item.preparations, 0); assert.equal(item.dispatches, 0);
  assert.equal(item.disposed, 1); assert.equal(item.input, undefined);
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls.length, 1); assert.equal(clock.pending, 0);
});

for (const failure of ["cancelled", "dependency_unavailable", "timed_out"] as const) {
  test(`pre-generation ${failure} releases the unused lane; late preparation cannot dispatch or resurrect data`, async () => {
    const { clock, transport, runtime, submit } = fixture();
    const first = submit();
    if (failure === "cancelled") first.request.cancel("cancelled");
    if (failure === "dependency_unavailable") first.item.control.fail("dependency_unavailable");
    if (failure === "timed_out") clock.advance(60_000);
    assert.deepEqual(await first.request.outcome, { ok: false, failure });
    assert.equal(first.item.disposed, 1); assert.equal(first.item.input, undefined);
    assert.equal(runtime.state.quarantined, false); assert.equal(transport.calls.length, 0);
    const second = accepted(runtime.submit("owner", work("new request"))); await flush();
    first.item.preparation.resolve(); await flush();
    assert.equal(first.item.dispatches, 0); assert.equal(transport.calls.length, 1);
    assert.equal(transport.calls[0]!.input, "new request");
    first.request.cancel("abandoned");
    transport.calls[0]!.completion.resolve(valid()); await flush();
    assert.equal((await second.outcome).ok, true); assert.equal(clock.pending, 0);
  });
}

test("dispatch rechecks current authority and original deadline after asynchronous preparation/commit acknowledgment", async () => {
  for (const reason of ["stale", "deadline", "cancel-in-dispatch"] as const) {
    const { clock, transport, runtime, submit } = fixture();
    const { request, item } = submit();
    let committed = 0;
    assert.deepEqual(item.control.effect(() => { committed++; return ok(); }), ok());
    if (reason === "stale") item.authority = false;
    if (reason === "deadline") clock.time = 60_000; // timer dispatch deliberately delayed
    if (reason === "cancel-in-dispatch") item.dispatchInput = () => {
      item.control.fail("cancelled"); return { ok: true, value: "must not dispatch" };
    };
    item.preparation.resolve(); await flush();
    assert.deepEqual(await request.outcome, { ok: false, failure: reason === "stale" ? "stale_authority" : reason === "deadline" ? "timed_out" : "cancelled" });
    assert.equal(committed, 1); assert.equal(transport.calls.length, 0);
    assert.equal(runtime.state.quarantined, false); assert.equal(clock.pending, 0);
  }
});

test("Application retains 45-second generation cap and terminal quarantine until actual transport settlement", async () => {
  const { clock, transport, runtime, submit } = fixture();
  const { request, item } = submit();
  item.preparation.resolve(); await flush();
  clock.advance(45_000);
  assert.deepEqual(await request.outcome, { ok: false, failure: "generation_timed_out" });
  assert.equal(item.disposed, 1); assert.equal(item.input, undefined);
  assert.equal(transport.calls[0]!.budget.signal.aborted, true);
  assert.equal(runtime.state.quarantined, true);
  let captures = 0;
  assert.deepEqual(runtime.submitApplication("other", (control) => { captures++; return new FakeApplicationWork(control); }),
    { accepted: false, failure: "dependency_unavailable" });
  assert.equal(captures, 0);
  clock.advance(60_000); assert.equal(runtime.state.quarantined, true);
  transport.calls[0]!.completion.resolve(valid("late discarded output")); await flush();
  assert.equal(item.candidates, 0); assert.equal(item.checks, 0); assert.equal(item.sinks, 0);
  assert.equal(runtime.state.quarantined, false); assert.equal(clock.pending, 0);
});

test("delayed preparation caps generation to the original remaining deadline and never creates another 60 seconds", async () => {
  const { clock, transport, runtime, submit } = fixture();
  const { request, item } = submit();
  clock.advance(20_000); item.preparation.resolve(); await flush();
  assert.equal(transport.calls[0]!.budget.deadline, 60_000);
  assert.equal(transport.calls[0]!.budget.remainingMs(), 40_000);
  clock.advance(40_000);
  assert.deepEqual(await request.outcome, { ok: false, failure: "timed_out" });
  assert.equal(runtime.state.quarantined, true);
  transport.calls[0]!.completion.reject(new Error("synthetic private error")); await flush();
  assert.equal(runtime.state.quarantined, false); assert.equal(clock.pending, 0);
});

for (const winner of ["cancel", "deadline", "authority"] as const) {
  test(`${winner} at the actual assistant/sink effect fences the effect even after earlier successful checks`, async () => {
    const { clock, transport, submit } = fixture();
    const { request, item } = submit();
    item.preparation.resolve(); await flush();
    transport.calls[0]!.completion.resolve(valid()); await flush();
    item.checking.resolve(); await flush();
    let commits = 0;
    if (winner === "cancel") request.cancel("abandoned");
    if (winner === "deadline") clock.time = 60_000;
    if (winner === "authority") item.authority = false;
    const effect = item.control.effect(() => {
      if (!item.authority) return { ok: false, failure: "stale_authority" };
      commits++; return ok();
    });
    const failure = winner === "cancel" ? "abandoned" : winner === "deadline" ? "timed_out" : "stale_authority";
    assert.deepEqual(effect, { ok: false, failure });
    assert.deepEqual(item.acceptSink(), { ok: false, failure });
    assert.deepEqual(await request.outcome, { ok: false, failure });
    assert.equal(commits, 0); assert.equal(item.sinks, 0); assert.equal(item.candidate, undefined);
    item.delivery.resolve(); await flush();
    assert.equal(item.disposed, 1); assert.equal(clock.pending, 0);
  });
}

test("accepted earlier commit remains observable when cancellation wins before sink, with no false success or late delivery", async () => {
  const { transport, submit } = fixture();
  const { request, item } = submit();
  item.preparation.resolve(); await flush();
  transport.calls[0]!.completion.resolve(valid()); await flush();
  item.checking.resolve(); await flush();
  let committed = 0;
  assert.deepEqual(item.control.effect(() => { committed++; return ok(); }), ok());
  request.cancel("abandoned");
  assert.deepEqual(item.acceptSink(), { ok: false, failure: "abandoned" });
  assert.equal(committed, 1); assert.equal(item.sinks, 0);
  assert.deepEqual(await request.outcome, { ok: false, failure: "abandoned" });
  item.delivery.resolve(); await flush();
  assert.equal(item.sinks, 0); assert.equal(item.disposed, 1);
});

test("late checks and delivery callbacks cannot revive disposed content or complete a terminal lifecycle", async () => {
  for (const stage of ["checking", "delivery"] as const) {
    const { clock, transport, submit } = fixture();
    const { request, item } = submit();
    item.preparation.resolve(); await flush();
    transport.calls[0]!.completion.resolve(valid()); await flush();
    if (stage === "delivery") { item.checking.resolve(); await flush(); }
    request.cancel("cancelled");
    assert.equal(item.input, undefined); assert.equal(item.candidate, undefined);
    assert.equal(item.disposed, 1);
    item.checking.resolve(); item.delivery.resolve(); await flush();
    assert.equal(item.deliveries, stage === "delivery" ? 1 : 0);
    assert.equal(item.sinks, 0); assert.equal(item.disposed, 1);
    assert.deepEqual(await request.outcome, { ok: false, failure: "cancelled" });
    assert.equal(clock.pending, 0);
  }
});

test("invalid and duplicate-key raw output never reaches the Application candidate holder", async () => {
  for (const output of ['{"message":"private invalid text"}', '{"schemaVersion":"ai_assistant_message_v1","message":"one","message":"two"}']) {
    const { clock, transport, submit } = fixture();
    const { request, item } = submit();
    item.preparation.resolve(); await flush();
    transport.calls[0]!.completion.resolve(raw(output)); await flush();
    assert.deepEqual(await request.outcome, { ok: false, failure: "invalid_output" });
    assert.equal(item.candidates, 0); assert.equal(item.checks, 0); assert.equal(item.deliveries, 0);
    assert.equal(item.disposed, 1); assert.equal(clock.pending, 0);
  }
});

test("Application stage exceptions and a sink that never accepts fail closed without retaining raw errors", async () => {
  for (const stage of ["prepare", "dispatchInput", "acceptCandidate", "checkCandidate", "commitAndDeliver", "missing-sink"] as const) {
    const { clock, transport, runtime } = fixture();
    let item!: FakeApplicationWork;
    const request = applicationAccepted(runtime.submitApplication("owner", (control) => {
      item = new FakeApplicationWork(control);
      if (stage === "missing-sink") item.commitAndDeliver = async () => {};
      else item[stage] = () => { throw new Error("synthetic private collaborator payload"); };
      return item;
    }));
    item.preparation.resolve(); await flush();
    if (transport.calls.length > 0) { transport.calls[0]!.completion.resolve(valid()); await flush(); }
    item.checking.resolve(); await flush();
    assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
    assert.equal(item.sinks, 0); assert.equal(item.input, undefined); assert.equal(item.candidate, undefined);
    assert.equal(item.disposed, 1); assert.equal(clock.pending, 0);
  }
});

test("sink refusal/throw and thrown disposal cannot reopen success, retain slots or expose errors", async () => {
  for (const failure of ["refusal", "throw"] as const) {
    const { clock, transport, runtime, submit } = fixture();
    const { request, item } = submit();
    item.preparation.resolve(); await flush();
    transport.calls[0]!.completion.resolve(valid()); await flush();
    item.checking.resolve(); await flush();
    item.dispose = () => {
      item.input = undefined; item.candidate = undefined; item.disposed++;
      throw new Error("synthetic cleanup details");
    };
    const result = item.control.complete(() => {
      if (failure === "throw") throw new Error("synthetic sink details");
      return { ok: false, failure: "abandoned" };
    });
    assert.deepEqual(result, { ok: false, failure: failure === "throw" ? "dependency_unavailable" : "abandoned" });
    assert.deepEqual(await request.outcome, result);
    assert.equal(runtime.state.nonTerminal, 0); assert.equal(item.disposed, 1); assert.equal(clock.pending, 0);
  }
});

test("shutdown disposes mixed Application/component queues once and never restarts after actual transport stop", async () => {
  const { clock, transport, runtime, submit } = fixture();
  const first = submit(); first.item.preparation.resolve(); await flush();
  const second = submit("queued");
  const third = accepted(runtime.submit("component", work()));
  runtime.shutdown(); runtime.shutdown();
  assert.deepEqual(await first.request.outcome, { ok: false, failure: "cancelled" });
  assert.deepEqual(await second.request.outcome, { ok: false, failure: "cancelled" });
  assert.deepEqual(await third.outcome, { ok: false, failure: "cancelled" });
  assert.equal(first.item.disposed, 1); assert.equal(second.item.disposed, 1);
  assert.equal(second.item.preparations, 0);
  assert.deepEqual(runtime.state, { admission: "stopped", quarantined: true, queued: 0, nonTerminal: 0 });
  second.item.preparation.resolve(); transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls.length, 1); assert.equal(first.item.candidates, 0);
  assert.equal(runtime.state.quarantined, false); assert.equal(clock.pending, 0);
});
