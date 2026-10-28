import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAiRuntime, type RuntimeApplicationControl, type RuntimeApplicationWork,
  type RuntimeFailure } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import { CloudAdmissionOwner } from "../../src/ai-runtime/application/cloud-admission-owner.js";
import type { CloudAdmissionLimits, CloudGenerationObservation, CloudGenerationTransport,
  CloudRecoveryAuthority } from "../../src/ai-runtime/ports/cloud-generation-transport.js";
import type { RequestBudget } from "../../src/ai-runtime/ports/generation-transport.js";
import type { OutputCandidate } from "../../src/ai-runtime/domain/parse-output.js";
import type { Result } from "../../src/shared/domain/result.js";
import { accepted, deferred, FakeClock, flush, valid, work } from "./support.js";

const limits: CloudAdmissionLimits = { windowMs: 1_000, maxRequests: 4, maxTokens: 40, tokensPerRequest: 10 };
type Record = { readonly tokens: number; readonly conservativeExpiresAt: number };

/** In-memory simulation of a durable provider-wide ledger. It is NOT production
 * persistence, a real authority, network access or proof of recovery on a host. */
class FakeRecovery implements CloudRecoveryAuthority {
  readonly records: Record[] = [];
  private lease: object | undefined;
  enabled = true;
  recoveryKind: "confirmed" | "unknown" | "unavailable" = "confirmed";
  reserveHook: (() => Promise<"confirmed" | "rejected" | "unknown">) | undefined;
  recoveries = 0;
  reservations = 0;
  constructor(readonly clock: FakeClock, readonly verified: CloudAdmissionLimits = limits) {}
  async recover(config: Readonly<CloudAdmissionLimits>) {
    this.recoveries++;
    if (this.recoveryKind !== "confirmed") return { kind: this.recoveryKind } as const;
    if (config.windowMs < this.verified.windowMs || config.maxRequests > this.verified.maxRequests ||
        config.maxTokens > this.verified.maxTokens || config.tokensPerRequest < this.verified.tokensPerRequest) {
      return { kind: "unavailable" } as const;
    }
    const lease = {};
    this.lease = lease;
    return { kind: "confirmed", lease, previousRemote: "unknown",
      reservations: this.records.filter(r => r.conservativeExpiresAt > this.clock.now())
        .map(r => ({ tokens: r.tokens, remainingMs: r.conservativeExpiresAt - this.clock.now() })) } as const;
  }
  current(lease: object) { return this.enabled && lease === this.lease; }
  async reserve(lease: object, input: Record, live: () => boolean) {
    if (!this.current(lease) || !live()) return "rejected" as const;
    const active = this.records.filter(r => r.conservativeExpiresAt > this.clock.now());
    if (active.length >= this.verified.maxRequests ||
        active.reduce((sum, r) => sum + r.tokens, 0) + input.tokens > this.verified.maxTokens) return "rejected" as const;
    this.reservations++;
    this.records.push({ ...input });
    return this.reserveHook ? this.reserveHook() : "confirmed" as const;
  }
}

class FakeCloud implements CloudGenerationTransport<string> {
  readonly calls: { readonly input: string; readonly budget: RequestBudget;
    readonly completion: ReturnType<typeof deferred<CloudGenerationObservation>> }[] = [];
  dispatch(input: string, budget: RequestBudget): Promise<CloudGenerationObservation> {
    const completion = deferred<CloudGenerationObservation>();
    this.calls.push({ input, budget, completion });
    return completion.promise;
  }
}
const completed = (message = "Synthetic response."): CloudGenerationObservation =>
  ({ kind: "response", physical: "stopped", raw: valid(message) });

function fixture(config: CloudAdmissionLimits = limits, shared?: FakeRecovery) {
  const clock = shared?.clock ?? new FakeClock(), authority = shared ?? new FakeRecovery(clock, config), transport = new FakeCloud();
  const owner = new CloudAdmissionOwner(clock, transport, authority, config);
  const runtime = new BoundedAiRuntime(clock, { kind: "cloud", owner });
  return { clock, authority, transport, owner, runtime };
}

test("cloud starts closed, accepts only verified recovery, and cannot reset its owner", async () => {
  const f = fixture(); let prepared = 0;
  assert.deepEqual(f.runtime.submit("owner", { ...work(), prepare: async () => { prepared++; return "x"; } }),
    { accepted: false, failure: "dependency_unavailable" });
  assert.equal(prepared, 0); assert.equal(f.transport.calls.length, 0);
  assert.equal(await f.owner.recover(), true);
  assert.equal(await f.owner.recover(), false);
  assert.equal(f.authority.recoveries, 1);
  assert.throws(() => new BoundedAiRuntime(f.clock, { kind: "cloud", owner: f.owner }), /CLOUD_OWNER_ALREADY_BOUND/);
  const mismatchClock = new FakeClock(), mismatchOwner = new CloudAdmissionOwner(f.clock, new FakeCloud(), f.authority, limits);
  assert.throws(() => new BoundedAiRuntime(mismatchClock, { kind: "cloud", owner: mismatchOwner }), /CLOUD_CLOCK_MISMATCH/);
  const failed = fixture(); failed.authority.recoveryKind = "unknown";
  assert.equal(await failed.owner.recover(), false);
  assert.equal(failed.owner.state.recovery, "blocked");
  assert.deepEqual(failed.runtime.submit("owner", work()), { accepted: false, failure: "dependency_unavailable" });
});

test("opaque cloud attempt cannot be altered or dispatched twice, including after unknown", async () => {
  const f = fixture(); await f.owner.recover();
  const budget = { signal: new AbortController().signal, deadline: 60_000, remainingMs: () => 60_000 - f.clock.now() };
  const attempt = await f.owner.reserve(budget, () => true); assert.ok(attempt);
  assert.equal(Object.isFrozen(attempt), true);
  assert.throws(() => Object.assign(attempt, { state: "reserved" }), TypeError);
  f.owner.stopped(attempt); // A never-dispatched attempt cannot be called physically stopped.
  const first = f.owner.dispatch(attempt, "one", budget); assert.ok(first);
  assert.equal(f.owner.dispatch(attempt, "replay", budget), undefined);
  f.owner.unknown(attempt);
  assert.equal(f.owner.dispatch(attempt, "replay-after-unknown", budget), undefined);
  assert.equal(f.owner.dispatch({}, "forged", budget), undefined);
  assert.equal(f.transport.calls.length, 1); assert.equal(f.owner.state.remoteUnknown, 1);
  f.owner.stopped(attempt);
  assert.equal(f.owner.dispatch(attempt, "replay-after-stop", budget), undefined);
  assert.equal(f.owner.state.reservedRequests, 1); // physical stop never refunds quota.
});

test("a cloud permit remains bound to the original signal and overall deadline", async () => {
  const f = fixture(); await f.owner.recover();
  const original = new AbortController();
  const budget = { signal: original.signal, deadline: 60_000, remainingMs: () => 60_000 - f.clock.now() };
  const attempt = await f.owner.reserve(budget, () => true); assert.ok(attempt);
  const subBudget = { signal: original.signal, deadline: 45_000, remainingMs: () => 45_000 - f.clock.now() };
  f.clock.advance(5_000);
  assert.equal(f.owner.dispatch(attempt, "new signal", { ...subBudget, signal: new AbortController().signal }), undefined);
  assert.equal(f.owner.dispatch(attempt, "extended deadline", { ...subBudget, deadline: 60_001 }), undefined);
  assert.equal(f.owner.dispatch(attempt, "expired subdeadline", { ...subBudget, deadline: 5_000, remainingMs: () => 1 }), undefined);
  assert.equal(f.transport.calls.length, 0);
  const permitted = f.owner.dispatch(attempt, "legitimate generation subdeadline", subBudget);
  assert.ok(permitted); assert.equal(f.transport.calls.length, 1);
});

test("expired cloud permit cannot be renewed after its quota record is pruned", async () => {
  const f = fixture(); await f.owner.recover();
  const original = new AbortController();
  const attempt = await f.owner.reserve({ signal: original.signal, deadline: 60_000, remainingMs: () => 60_000 }, () => true);
  assert.ok(attempt);
  f.clock.advance(60_000);
  assert.equal(f.owner.state.reservedRequests, 1); // Quota still held, but original delivery deadline has ended.
  assert.equal(f.owner.dispatch(attempt, "exact deadline", { signal: original.signal, deadline: 60_000, remainingMs: () => 1 }), undefined);
  f.clock.advance(1_000); // Original deadline plus window has passed.
  assert.equal(f.owner.state.reservedRequests, 0);
  const renewed = { signal: new AbortController().signal, deadline: 121_000, remainingMs: () => 60_000 };
  assert.equal(f.owner.dispatch(attempt, "renewed signal and deadline", renewed), undefined);
  assert.equal(f.owner.dispatch(attempt, "same signal, renewed deadline", { ...renewed, signal: original.signal }), undefined);
  assert.equal(f.owner.dispatch(attempt, "expired deadline with positive remaining", { ...renewed, signal: original.signal, deadline: 60_000 }), undefined);
  assert.equal(f.transport.calls.length, 0);
  assert.equal(f.owner.state.remotePending, 0); assert.equal(f.owner.state.remoteUnknown, 0);
});

test("cancelled or mutated original budget cannot replace the authority-confirmed permit", async () => {
  const f = fixture(), delayed = deferred<"confirmed" | "rejected" | "unknown">();
  await f.owner.recover(); f.authority.reserveHook = () => delayed.promise;
  const original = new AbortController(), replacement = new AbortController();
  const budget = { signal: original.signal, deadline: 60_000, remainingMs: () => 60_000 };
  const pending = f.owner.reserve(budget, () => true); await flush();
  budget.signal = replacement.signal; budget.deadline = 120_000;
  delayed.resolve("confirmed"); const attempt = await pending; assert.ok(attempt);
  assert.equal(f.owner.dispatch(attempt, "mutated budget", budget), undefined);
  original.abort();
  assert.equal(f.owner.dispatch(attempt, "cancelled original", { signal: original.signal, deadline: 45_000, remainingMs: () => 45_000 }), undefined);
  assert.equal(f.owner.dispatch(attempt, "replacement signal", { signal: replacement.signal, deadline: 45_000, remainingMs: () => 45_000 }), undefined);
  assert.equal(f.transport.calls.length, 0); assert.equal(f.owner.state.reservedRequests, 1);
});

test("missing, malformed or stale recovery cannot authorize preparation", async () => {
  for (const variant of ["unavailable", "missing-snapshot", "invalid-reservation", "stale-lease"] as const) {
    const f = fixture();
    if (variant === "unavailable") f.authority.recoveryKind = "unavailable";
    if (variant === "missing-snapshot") f.authority.recover = async () => undefined as never;
    if (variant === "invalid-reservation") f.authority.recover = async () => ({ kind: "confirmed" as const,
      lease: {}, previousRemote: "unknown" as const, reservations: [{ tokens: 0, remainingMs: 1 }] });
    if (variant === "stale-lease") f.authority.enabled = false;
    assert.equal(await f.owner.recover(), false);
    let prepares = 0;
    assert.deepEqual(f.runtime.submit("owner", { ...work(), prepare: async () => { prepares++; return "x"; } }),
      { accepted: false, failure: "dependency_unavailable" });
    assert.equal(prepares, 0); assert.equal(f.transport.calls.length, 0);
  }
});

test("late quota authority after cancellation never prepares or dispatches A or changes B", async () => {
  for (const stop of ["cancel", "deadline"] as const) {
    const f = fixture(), delayed = deferred<"confirmed" | "rejected" | "unknown">();
    await f.owner.recover(); f.authority.reserveHook = () => delayed.promise;
    let preparedA = 0;
    const a = accepted(f.runtime.submit("same-user", { ...work("A"), prepare: async () => { preparedA++; return "A"; } }));
    await flush(); assert.equal(f.authority.reservations, 1); assert.equal(preparedA, 0);
    if (stop === "cancel") a.cancel("cancelled"); else f.clock.advance(60_000);
    assert.deepEqual(await a.outcome, { ok: false, failure: stop === "cancel" ? "cancelled" : "timed_out" });
    assert.equal(f.transport.calls.length, 0);
    assert.deepEqual(f.runtime.submit("same-user", work("B")), { accepted: false, failure: "dependency_unavailable" });
    f.authority.reserveHook = undefined; delayed.resolve("confirmed"); await flush();
    assert.equal(preparedA, 0); assert.equal(f.transport.calls.length, 0);
    assert.equal(f.owner.state.reservedRequests, 1); // A's possibly durable claim is not refunded.
    const b = accepted(f.runtime.submit("same-user", work("B"))); await flush();
    assert.equal(f.transport.calls.length, 1); assert.equal(f.transport.calls[0]!.input, "B");
    a.cancel("abandoned"); assert.equal(f.runtime.state.nonTerminal, 1);
    f.transport.calls[0]!.completion.resolve(completed("B reply")); await flush();
    assert.equal((await b.outcome).ok, true); assert.equal(preparedA, 0);
  }
});

test("unknown remote A is not settlement; its late result cannot affect independent B", async () => {
  const f = fixture(); await f.owner.recover(); let oldChecks = 0;
  const a = accepted(f.runtime.submit("same-user", { ...work("A"), checkCandidate: async () => {
    oldChecks++; return { ok: true, value: undefined };
  } })); await flush();
  assert.equal(f.transport.calls.length, 1);
  assert.deepEqual(f.runtime.submit("same-user", work("not-independent-yet")), { accepted: false, failure: "overload" });
  f.clock.advance(45_000);
  assert.deepEqual(await a.outcome, { ok: false, failure: "generation_timed_out" });
  assert.equal(f.owner.state.remoteUnknown, 1); assert.equal(f.runtime.state.quarantined, false);
  const b = accepted(f.runtime.submit("same-user", work("B"))); await flush();
  assert.equal(f.transport.calls.length, 2);
  f.transport.calls[0]!.completion.resolve(completed("late A")); await flush();
  assert.equal(oldChecks, 0); assert.equal(f.owner.state.remoteUnknown, 0);
  assert.equal(f.runtime.state.nonTerminal, 1); assert.equal(f.transport.calls[1]!.input, "B");
  a.cancel("cancelled");
  f.transport.calls[1]!.completion.resolve(completed("B")); await flush();
  assert.equal((await b.outcome).ok, true); assert.equal(f.owner.state.reservedRequests, 2);
});

test("quota expiry changes accounting only and never becomes a permanent unknown cap", async () => {
  const config = { windowMs: 1_000, maxRequests: 1, maxTokens: 10, tokensPerRequest: 10 };
  const f = fixture(config); await f.owner.recover();
  for (let index = 0; index < 3; index++) {
    const request = accepted(f.runtime.submit("owner", work(`new-${index}`))); await flush();
    f.transport.calls[index]!.completion.resolve({ kind: "unknown", physical: "unknown" }); await flush();
    assert.equal((await request.outcome).ok, false);
    assert.equal(f.owner.state.remoteUnknown, index + 1);
    assert.deepEqual(f.runtime.submit("owner", work()), { accepted: false, failure: "overload" });
    f.clock.advance(61_000);
    assert.equal(f.owner.state.reservedRequests, 0);
    assert.equal(f.owner.state.remoteUnknown, index + 1);
  }
  assert.equal(f.transport.calls.length, 3);
});

test("quota caps are fixed, recover across restart and cannot be reconfigured to erase usage", async () => {
  const config = { windowMs: 1_000, maxRequests: 2, maxTokens: 15, tokensPerRequest: 10 };
  const f = fixture(config); await f.owner.recover();
  const a = accepted(f.runtime.submit("owner", work("A"))); await flush();
  f.transport.calls[0]!.completion.resolve({ kind: "unknown", physical: "unknown" }); await flush(); await a.outcome;
  assert.equal(f.owner.state.reservedTokens, 10);
  assert.deepEqual(f.runtime.submit("owner", work("no budget")), { accepted: false, failure: "overload" });
  assert.equal(await f.owner.recover(), false); assert.equal(f.owner.state.reservedTokens, 10);
  f.runtime.shutdown();
  const restarted = fixture(config, f.authority);
  assert.deepEqual(restarted.runtime.submit("owner", work()), { accepted: false, failure: "dependency_unavailable" });
  assert.equal(await restarted.owner.recover(), true);
  assert.equal(f.owner.state.ready, false); // New verified epoch revoked the old lease.
  assert.equal(f.owner.state.recovery, "blocked");
  assert.equal(restarted.owner.state.reservedTokens, 10);
  assert.equal(restarted.owner.state.previousRemote, "unknown");
  assert.deepEqual(restarted.runtime.submit("owner", work()), { accepted: false, failure: "overload" });
  assert.equal(restarted.transport.calls.length, 0);
  const raised = fixture({ ...config, maxTokens: 100 }, f.authority);
  assert.equal(await raised.owner.recover(), false);
  assert.deepEqual(raised.runtime.submit("owner", work()), { accepted: false, failure: "dependency_unavailable" });
});

test("cloudState rechecks a superseded recovery lease without equating quota expiry and remote stop", async () => {
  const f = fixture(); await f.owner.recover();
  const a = accepted(f.runtime.submit("owner", work())); await flush();
  f.transport.calls[0]!.completion.resolve({ kind: "unknown", physical: "unknown" }); await flush(); await a.outcome;
  assert.equal(f.owner.state.ready, true); assert.equal(f.owner.state.remoteUnknown, 1);
  const replacement = fixture(limits, f.authority);
  assert.equal(await replacement.owner.recover(), true);
  assert.equal(f.owner.state.ready, false); assert.equal(f.owner.state.recovery, "blocked");
  assert.equal(f.owner.state.remoteUnknown, 1);
  assert.equal(replacement.owner.state.reservedRequests, 1);
  assert.equal(replacement.owner.state.previousRemote, "unknown");
  f.clock.advance(61_000);
  assert.equal(replacement.owner.state.reservedRequests, 0);
  assert.equal(replacement.owner.state.previousRemote, "unknown");
});

test("request count independently limits admission even when token capacity remains", async () => {
  const config = { windowMs: 1_000, maxRequests: 1, maxTokens: 100, tokensPerRequest: 10 };
  const f = fixture(config); await f.owner.recover();
  const a = accepted(f.runtime.submit("owner", work())); await flush();
  f.transport.calls[0]!.completion.resolve({ kind: "unknown", physical: "unknown" }); await flush(); await a.outcome;
  assert.equal(f.owner.state.reservedRequests, 1); assert.equal(f.owner.state.reservedTokens, 10);
  assert.deepEqual(f.runtime.submit("new-user", work()), { accepted: false, failure: "overload" });
  assert.equal(f.transport.calls.length, 1);
});

test("unknown authority reservation blocks before application preparation or cloud dispatch", async () => {
  const f = fixture(); await f.owner.recover(); f.authority.reserveHook = async () => "unknown";
  let prepare = 0;
  const a = accepted(f.runtime.submit("owner", { ...work(), prepare: async () => { prepare++; return "A"; } }));
  await flush(); assert.equal((await a.outcome).ok, false);
  assert.equal(prepare, 0); assert.equal(f.transport.calls.length, 0);
  assert.equal(f.owner.state.recovery, "blocked"); assert.equal(f.owner.state.reservedRequests, 1);
  assert.deepEqual(f.runtime.submit("owner", work()), { accepted: false, failure: "dependency_unavailable" });
});

test("late unknown authority write stays blocked and cannot be treated as a refund", async () => {
  const f = fixture(), delayed = deferred<"confirmed" | "rejected" | "unknown">();
  await f.owner.recover(); f.authority.reserveHook = () => delayed.promise;
  let preparations = 0;
  const a = accepted(f.runtime.submit("owner", { ...work(), prepare: async () => { preparations++; return "old"; } }));
  await flush(); a.cancel("cancelled"); await a.outcome;
  delayed.resolve("unknown"); await flush();
  assert.equal(preparations, 0); assert.equal(f.transport.calls.length, 0);
  assert.equal(f.owner.state.recovery, "blocked"); assert.equal(f.owner.state.reservedRequests, 1);
  assert.deepEqual(f.runtime.submit("owner", work("new")), { accepted: false, failure: "dependency_unavailable" });
});

test("cloud rejects malformed results and provider 429 as unknown without replay", async () => {
  for (const variant of ["429", "rejected-promise", "malformed", "throwing-getter"] as const) {
    const f = fixture(); await f.owner.recover();
    const request = accepted(f.runtime.submit("owner", work())); await flush();
    if (variant === "429") f.transport.calls[0]!.completion.resolve({ kind: "unknown", physical: "unknown" });
    if (variant === "rejected-promise") f.transport.calls[0]!.completion.reject(Error("private error"));
    if (variant === "malformed") f.transport.calls[0]!.completion.resolve({ kind: "response", physical: "unknown" } as never);
    if (variant === "throwing-getter") f.transport.calls[0]!.completion.resolve(Object.defineProperty({}, "kind", { get() { throw Error("private error"); } }) as never);
    await flush(); assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
    assert.equal(f.transport.calls.length, 1); assert.equal(f.owner.state.remoteUnknown, 1);
    assert.equal(f.owner.state.reservedRequests, 1);
    const next = accepted(f.runtime.submit("owner", work("independent"))); await flush();
    assert.equal(f.transport.calls.length, 2);
    f.transport.calls[1]!.completion.resolve(completed()); await flush(); assert.equal((await next.outcome).ok, true);
  }
});

test("a proven stopped remote failure is distinct from unknown and does not refund quota", async () => {
  const f = fixture(); await f.owner.recover();
  const request = accepted(f.runtime.submit("owner", work())); await flush();
  f.transport.calls[0]!.completion.resolve({ kind: "failure", physical: "stopped" }); await flush();
  assert.deepEqual(await request.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(f.owner.state.remotePending, 0); assert.equal(f.owner.state.remoteUnknown, 0);
  assert.equal(f.owner.state.reservedRequests, 1); assert.equal(f.owner.state.reservedTokens, 10);
  const next = accepted(f.runtime.submit("owner", work("independent"))); await flush();
  assert.equal(f.transport.calls.length, 2);
  f.transport.calls[1]!.completion.resolve(completed()); await flush(); assert.equal((await next.outcome).ok, true);
});

test("cloud application cancels its old sink and 5-second queued work without affecting new consumers", async () => {
  const f = fixture(); await f.owner.recover(); let oldEffects = 0, disposed = 0;
  let control!: RuntimeApplicationControl;
  const application = f.runtime.submitApplication("same-owner", c => {
    control = c;
    const item: RuntimeApplicationWork<string> = { purpose: "ai_assistant_message_v1",
      prepare: async () => {}, dispatchInput: () => ({ ok: true, value: "chat" }),
      acceptCandidate: (_candidate: OutputCandidate) => { oldEffects++; },
      checkCandidate: async () => {}, commitAndDeliver: async () => {}, dispose: () => { disposed++; } };
    return item;
  });
  assert.equal(application.accepted, true); if (!application.accepted) return;
  await flush(); assert.equal(f.transport.calls.length, 1);
  assert.deepEqual(f.runtime.submit("same-owner", work("persona preview")), { accepted: false, failure: "overload" });
  assert.deepEqual(f.runtime.submit("same-owner", work("first flow")), { accepted: false, failure: "overload" });
  const preview = accepted(f.runtime.submit("other-owner", work("preview")));
  f.clock.advance(5_000); assert.deepEqual(await preview.outcome, { ok: false, failure: "queue_expired" });
  application.request.cancel("cancelled");
  assert.deepEqual(await application.request.outcome, { ok: false, failure: "cancelled" });
  const firstFlow = accepted(f.runtime.submit("same-owner", work("follow-up"))); await flush();
  assert.equal(f.transport.calls[1]!.input, "follow-up");
  const late: Result<void, RuntimeFailure> = control.effect(() => { oldEffects++; return { ok: true, value: undefined }; });
  assert.equal(late.ok, false); assert.equal(oldEffects, 0); assert.equal(disposed, 1);
  f.transport.calls[0]!.completion.resolve(completed("late chat")); await flush();
  assert.equal(f.runtime.state.nonTerminal, 1); assert.equal(oldEffects, 0);
  f.transport.calls[1]!.completion.resolve(completed("follow-up")); await flush();
  assert.equal((await firstFlow.outcome).ok, true);
});
