import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAiRuntime, type Cancellation, type RuntimeFailure, type RuntimeWork } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import type { RequestBudget } from "../../src/ai-runtime/ports/generation-transport.js";
import { accepted, deferred, FakeClock, FakeTransport, flush, raw, valid, work } from "./support.js";

function fixture() {
  const clock = new FakeClock();
  const transport = new FakeTransport();
  return { clock, transport, runtime: new BoundedAiRuntime(clock, transport) };
}

test("one active, two queued, FIFO; pre-acceptance overload takes no slots", async () => {
  const { clock, transport, runtime } = fixture();
  const first = accepted(runtime.submit("a", work("first")));
  const second = accepted(runtime.submit("b", work("second")));
  const third = accepted(runtime.submit("c", work("third")));
  assert.deepEqual(runtime.submit("d", work()), { accepted: false, failure: "overload" });
  assert.deepEqual(runtime.submit("a", work()), { accepted: false, failure: "overload" });
  await flush();
  assert.equal(transport.calls.length, 1);
  assert.deepEqual(runtime.state, { admission: "busy", quarantined: false, queued: 2, nonTerminal: 3 });
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls[1]!.input, "second");
  transport.calls[1]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls[2]!.input, "third");
  transport.calls[2]!.completion.resolve(valid()); await flush();
  for (const request of [first, second, third]) assert.equal((await request.outcome).ok, true);
  assert.equal(runtime.state.nonTerminal, 0);
  assert.equal(clock.pending, 0);
});

test("queue expires at exactly 5s, frees queue/user once and never generates", async () => {
  const { clock, transport, runtime } = fixture();
  accepted(runtime.submit("a", work()));
  const queued = accepted(runtime.submit("b", work())); await flush();
  clock.advance(4_999); assert.equal(runtime.state.queued, 1);
  clock.advance(1);
  assert.deepEqual(await queued.outcome, { ok: false, failure: "queue_expired" });
  queued.cancel("abandoned");
  assert.equal(runtime.state.queued, 0);
  const replacement = accepted(runtime.submit("b", work("replacement")));
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls.length, 2);
  assert.equal(transport.calls[1]!.input, "replacement");
  transport.calls[1]!.completion.resolve(valid()); await flush();
  assert.equal((await replacement.outcome).ok, true);
  assert.equal(clock.pending, 0);
});

test("dequeue checks elapsed time even when timer dispatch is delayed", async () => {
  const { clock, transport, runtime } = fixture();
  accepted(runtime.submit("a", work()));
  const b = accepted(runtime.submit("b", work()));
  const c = accepted(runtime.submit("c", work())); await flush();
  clock.time = 5_001;
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls.length, 1);
  assert.deepEqual(await b.outcome, { ok: false, failure: "queue_expired" });
  assert.deepEqual(await c.outcome, { ok: false, failure: "queue_expired" });
  assert.equal(runtime.state.nonTerminal, 0);
  assert.equal(clock.pending, 0);
});

for (const reason of ["abandoned", "cancelled"] as const) {
  test(`${reason}: queued cancellation frees exactly one slot and preserves FIFO`, async () => {
    const { clock, transport, runtime } = fixture();
    accepted(runtime.submit("a", work()));
    const b = accepted(runtime.submit("b", work()));
    const c = accepted(runtime.submit("c", work("third")));
    b.cancel(reason); b.cancel(reason);
    assert.deepEqual(await b.outcome, { ok: false, failure: reason });
    const replacement = accepted(runtime.submit("b", work("replacement"))); await flush();
    transport.calls[0]!.completion.resolve(valid()); await flush();
    assert.equal(transport.calls[1]!.input, "third");
    transport.calls[1]!.completion.resolve(valid()); await flush();
    assert.equal(transport.calls[2]!.input, "replacement");
    transport.calls[2]!.completion.resolve(valid()); await flush();
    assert.equal((await c.outcome).ok, true); assert.equal((await replacement.outcome).ok, true);
    assert.equal(clock.pending, 0);
  });

  test(`${reason}: active cancellation quarantines until actual settlement, discards late output`, async () => {
    const { clock, transport, runtime } = fixture();
    let checked = 0;
    const a = accepted(runtime.submit("a", { ...work(), checkCandidate: async () => { checked++; return { ok: true, value: undefined }; } }));
    const b = accepted(runtime.submit("b", work("next"))); await flush();
    a.cancel(reason); a.cancel(reason);
    assert.deepEqual(await a.outcome, { ok: false, failure: reason });
    assert.equal(transport.calls[0]!.budget.signal.aborted, true);
    assert.equal(runtime.state.quarantined, true);
    assert.equal(runtime.state.nonTerminal, 1);
    assert.deepEqual(runtime.submit("a", work()), { accepted: false, failure: "dependency_unavailable" });
    await flush(); assert.equal(transport.calls.length, 1);
    transport.calls[0]!.completion.resolve(valid("discard this")); await flush();
    assert.equal(checked, 0);
    assert.equal(runtime.state.quarantined, false);
    assert.equal(transport.calls.length, 2);
    transport.calls[1]!.completion.resolve(valid()); await flush();
    assert.equal((await b.outcome).ok, true);
    assert.equal(clock.pending, 0);
  });
}

test("generation expires at exactly 45s and remains quarantined after request terminal", async () => {
  const { clock, transport, runtime } = fixture();
  const a = accepted(runtime.submit("a", work())); await flush();
  clock.advance(44_999); assert.equal(runtime.state.quarantined, false);
  clock.advance(1);
  assert.deepEqual(await a.outcome, { ok: false, failure: "generation_timed_out" });
  clock.advance(60_000); assert.equal(runtime.state.quarantined, true);
  assert.equal(runtime.state.nonTerminal, 0);
  assert.equal(transport.calls.length, 1); // no automatic retry
  transport.calls[0]!.completion.reject(new Error("synthetic private vendor data")); await flush();
  assert.equal(runtime.state.quarantined, false);
  assert.equal(clock.pending, 0);
  accepted(runtime.submit("a", work())); await flush();
  runtime.shutdown(); transport.calls[1]!.completion.reject(); await flush();
});

test("preparation and generation share 60s: late start caps generation to remaining budget", async () => {
  const { clock, transport, runtime } = fixture();
  const preparation = deferred<string>();
  const a = accepted(runtime.submit("a", { ...work(), prepare: () => preparation.promise }));
  clock.advance(20_000); preparation.resolve("prepared"); await flush();
  assert.equal(a.acceptedAt, 0); assert.equal(a.deadline, 60_000);
  assert.equal(transport.calls[0]!.budget.deadline, 60_000);
  assert.equal(transport.calls[0]!.budget.remainingMs(), 40_000);
  clock.advance(40_000);
  assert.deepEqual(await a.outcome, { ok: false, failure: "timed_out" });
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(runtime.state.nonTerminal, 0); assert.equal(clock.pending, 0);
});

test("queue, preparation, generation and checkpoint never restart the accepted deadline", async () => {
  const { clock, transport, runtime } = fixture();
  accepted(runtime.submit("first", work())); await flush();
  clock.advance(1_000);
  const preparation = deferred<string>();
  const checkpoint = deferred<{ ok: true; value: undefined }>();
  let remaining: RequestBudget | undefined;
  const queued = accepted(runtime.submit("second", {
    ...work(), prepare: () => preparation.promise,
    checkCandidate: async (_candidate, budget) => { remaining = budget; return checkpoint.promise; },
  }));
  clock.advance(4_000); transport.calls[0]!.completion.resolve(valid()); await flush();
  clock.advance(16_000); preparation.resolve("after preparation"); await flush();
  assert.equal(transport.calls[1]!.budget.deadline, 61_000);
  clock.advance(9_000); transport.calls[1]!.completion.resolve(valid()); await flush();
  assert.equal(remaining!.deadline, 61_000); assert.equal(remaining!.remainingMs(), 31_000);
  clock.advance(31_000);
  assert.deepEqual(await queued.outcome, { ok: false, failure: "timed_out" });
  assert.equal(remaining!.signal.aborted, true);
  checkpoint.resolve({ ok: true, value: undefined }); await flush();
  assert.equal(clock.pending, 0);
});

test("user remains occupied during checkpoint while generation lane is free", async () => {
  const { clock, transport, runtime } = fixture();
  const checkpoint = deferred<{ ok: true; value: undefined }>();
  const a = accepted(runtime.submit("a", { ...work(), checkCandidate: () => checkpoint.promise })); await flush();
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.deepEqual(runtime.submit("a", work()), { accepted: false, failure: "overload" });
  const b = accepted(runtime.submit("b", work())); await flush();
  assert.equal(transport.calls.length, 2);
  checkpoint.resolve({ ok: true, value: undefined }); await flush();
  assert.equal((await a.outcome).ok, true);
  // An old handle cannot cancel a newer request for the same user.
  const nextA = accepted(runtime.submit("a", work()));
  a.cancel("cancelled");
  assert.equal(runtime.state.nonTerminal, 2);
  transport.calls[1]!.completion.resolve(valid()); await flush();
  transport.calls[2]!.completion.resolve(valid()); await flush();
  assert.equal((await b.outcome).ok, true); assert.equal((await nextA.outcome).ok, true);
  assert.equal(clock.pending, 0);
});

test("preparation timeout releases lane but late preparation cannot begin generation", async () => {
  const { clock, transport, runtime } = fixture();
  const preparation = deferred<string>();
  const a = accepted(runtime.submit("a", { ...work(), prepare: () => preparation.promise }));
  clock.advance(60_000);
  assert.deepEqual(await a.outcome, { ok: false, failure: "timed_out" });
  assert.equal(runtime.state.quarantined, false);
  const b = accepted(runtime.submit("b", work())); await flush();
  preparation.resolve("late"); await flush();
  assert.equal(transport.calls.length, 1);
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal((await b.outcome).ok, true); assert.equal(clock.pending, 0);
});

test("shutdown abandons transient work, never restarts and retains actual quarantine", async () => {
  const { clock, transport, runtime } = fixture();
  const requests = ["a", "b", "c"].map((user) => accepted(runtime.submit(user, work()))); await flush();
  runtime.shutdown(); runtime.shutdown();
  for (const request of requests) assert.deepEqual(await request.outcome, { ok: false, failure: "cancelled" });
  assert.deepEqual(runtime.state, { admission: "stopped", quarantined: true, queued: 0, nonTerminal: 0 });
  assert.equal(runtime.submit("d", work()).accepted, false);
  transport.calls[0]!.completion.resolve(valid()); await flush();
  assert.equal(transport.calls.length, 1); assert.equal(runtime.state.quarantined, false); assert.equal(clock.pending, 0);
  const restarted = new BoundedAiRuntime(clock, transport);
  assert.equal(restarted.state.queued, 0);
});

for (const stage of ["prepare", "generate", "checkpoint"] as const) {
  test(`${stage} exception returns safe failure, cleans timers/slots, permits fresh request`, async () => {
    const { clock, transport, runtime } = fixture();
    const fail = () => { throw new Error("synthetic private vendor payload"); };
    const item: RuntimeWork<string> = { ...work(), ...(stage === "prepare" ? { prepare: fail } : {}), ...(stage === "checkpoint" ? { checkCandidate: fail } : {}) };
    const a = accepted(runtime.submit("a", item)); await flush();
    if (stage === "generate") transport.calls[0]!.completion.reject(new Error("private"));
    if (stage === "checkpoint") transport.calls[0]!.completion.resolve(valid());
    await flush();
    assert.deepEqual(await a.outcome, { ok: false, failure: "dependency_unavailable" });
    assert.equal(runtime.state.nonTerminal, 0); assert.equal(clock.pending, 0);
    accepted(runtime.submit("a", work())); await flush();
    runtime.shutdown(); transport.calls.at(-1)!.completion.reject(); await flush();
  });
}

for (const failure of ["unsafe_output", "stale_authority"] as const) {
  test(`injected checkpoint ${failure} rejects whole candidate without fallback`, async () => {
    const { clock, transport, runtime } = fixture();
    const a = accepted(runtime.submit("a", { ...work(), checkCandidate: async () => ({ ok: false, failure }) })); await flush();
    transport.calls[0]!.completion.resolve(valid()); await flush();
    assert.deepEqual(await a.outcome, { ok: false, failure });
    assert.equal(transport.calls.length, 1); assert.equal(clock.pending, 0);
  });
}

test("invalid output is rejected before checkpoint and never retried", async () => {
  const { clock, transport, runtime } = fixture();
  let checked = false;
  const a = accepted(runtime.submit("a", { ...work(), checkCandidate: async () => { checked = true; return { ok: true, value: undefined }; } })); await flush();
  transport.calls[0]!.completion.resolve(raw('{"message":"secret"}')); await flush();
  assert.deepEqual(await a.outcome, { ok: false, failure: "invalid_output" });
  assert.equal(checked, false); assert.equal(transport.calls.length, 1); assert.equal(clock.pending, 0);
});

test("late timer dispatch cannot deliver generation after sub-budget or overall expiry", async () => {
  for (const [time, failure] of [[45_000, "generation_timed_out"], [60_000, "timed_out"]] as const) {
    const { clock, transport, runtime } = fixture();
    const a = accepted(runtime.submit("a", work())); await flush();
    clock.time = time; transport.calls[0]!.completion.resolve(valid()); await flush();
    assert.deepEqual(await a.outcome, { ok: false, failure }); assert.equal(clock.pending, 0);
  }
});

test("deadline takes precedence over cancellation/dependency/checkpoint callbacks at expiry", async () => {
  for (const action of ["cancel", "reject", "checkpoint"] as const) {
    const { clock, transport, runtime } = fixture();
    const checkpoint = deferred<{ ok: true; value: undefined }>();
    const a = accepted(runtime.submit("a", { ...work(), checkCandidate: () => checkpoint.promise })); await flush();
    if (action === "checkpoint") { transport.calls[0]!.completion.resolve(valid()); await flush(); }
    clock.time = 60_000;
    if (action === "cancel") { a.cancel("abandoned"); transport.calls[0]!.completion.resolve(valid()); }
    if (action === "reject") transport.calls[0]!.completion.reject();
    if (action === "checkpoint") checkpoint.resolve({ ok: true, value: undefined });
    await flush(); assert.deepEqual(await a.outcome, { ok: false, failure: "timed_out" });
    assert.equal(clock.pending, 0);
  }
});

test("wall-clock jumps do not alter monotonic deadline or generation budget", async () => {
  const { clock, transport, runtime } = fixture();
  const original = Date.now;
  try {
    Date.now = () => -9_000_000;
    const a = accepted(runtime.submit("a", work())); await flush();
    Date.now = () => 9_000_000_000_000;
    clock.advance(44_999); transport.calls[0]!.completion.resolve(valid()); await flush();
    assert.equal((await a.outcome).ok, true); assert.equal(a.deadline, 60_000); assert.equal(clock.pending, 0);
  } finally { Date.now = original; }
});

test("cancellation/timeout/transport race permutations settle once with no leaked capacity", async () => {
  for (const events of [["cancel", "time", "settle"], ["time", "cancel", "settle"], ["settle", "cancel", "time"], ["cancel", "settle", "time"]] as const) {
    const { clock, transport, runtime } = fixture();
    const a = accepted(runtime.submit("a", work())); await flush();
    let terminals = 0;
    void a.outcome.then(() => { terminals++; });
    for (const event of events) {
      if (event === "cancel") a.cancel("abandoned");
      if (event === "time") clock.advance(60_000);
      if (event === "settle") transport.calls[0]!.completion.resolve(valid());
      await flush();
    }
    assert.equal(terminals, 1); assert.equal(runtime.state.nonTerminal, 0);
    assert.equal(runtime.state.quarantined, false); assert.equal(clock.pending, 0);
    const result = await a.outcome;
    const expected: RuntimeFailure | undefined = events[0] === "cancel" ? "abandoned" : events[0] === "time" ? "generation_timed_out" : undefined;
    if (expected) assert.deepEqual(result, { ok: false, failure: expected });
    else assert.equal(result.ok, true);
  }
});

test("cancel during preparation/checkpoint does not quarantine a stopped generation", async () => {
  for (const stage of ["prepare", "checkpoint"] as const) {
    const { clock, transport, runtime } = fixture();
    const preparation = deferred<string>();
    const checkpoint = deferred<{ ok: true; value: undefined }>();
    const a = accepted(runtime.submit("a", { ...work(), ...(stage === "prepare" ? { prepare: () => preparation.promise } : {}), checkCandidate: () => checkpoint.promise })); await flush();
    if (stage === "checkpoint") { transport.calls[0]!.completion.resolve(valid()); await flush(); }
    a.cancel("abandoned" satisfies Cancellation);
    assert.deepEqual(await a.outcome, { ok: false, failure: "abandoned" });
    assert.equal(runtime.state.quarantined, false);
    preparation.resolve("late"); checkpoint.resolve({ ok: true, value: undefined }); await flush();
    assert.equal(clock.pending, 0); assert.equal(runtime.state.nonTerminal, 0);
  }
});
