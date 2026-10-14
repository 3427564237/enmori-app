import assert from "node:assert/strict";
import test from "node:test";
import type { AsyncAuthorityObservation, AsyncClaimSettlement, AsyncCloseObservation, AsyncUserWriteObservation } from "../../src/ai-conversation/ports/async-conversation.js";
import type { ContextReadResult, CurrentContextAuthority } from "../../src/ai-conversation/ports/real-context-reader.js";
import { valid } from "../ai-runtime/support.js";
import { deferred, fixture, id, identity, operation, timestamp, until } from "./async-conversation-fakes.js";

test("real async orchestration succeeds only after user, assistant, matching claim settlement and actual guarded sink", async () => {
  const f = fixture(), command = f.create();
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true);
  if (!admission.accepted) return;
  await until(() => f.calls.length === 1);
  assert.deepEqual(f.calls[0]!.input, { currentMessage: "Synthetic current input", checkIns: [], persona: undefined });
  assert.equal(f.runtime.state.nonTerminal, 1);
  assert.equal(f.store.pending.get(operation().userMessageId), operation().operationId);
  f.calls[0]!.completion.resolve(valid());
  assert.deepEqual(await admission.request.outcome, { ok: true, value: undefined });
  assert.equal(f.delivered.length, 1);
  assert.deepEqual(f.store.calls.slice(0, 4), ["open", "user", "assistant", "settle"]);
  assert.equal(f.store.pending.size, 0);
  assert.equal(f.app.inspect(command)!.processing, false);
  assert.equal(f.app.inspect(command)!.disposeCount, 1);
  assert.equal(f.runtime.state.nonTerminal, 0);
  assert.equal(f.clock.pending, 0);
  const context = f.store.contexts[0]!;
  assert.equal(context.dependencies(), undefined);
  assert.equal(context.originalCurrent(), false);
});

test("denied/unavailable preaccept and invalid text never admit slots or read private context", async () => {
  for (const permit of ["denied", "unavailable"] as const) {
    const f = fixture(); f.auth.permit = permit;
    const result = await f.app.dispatch(f.create()); assert.equal(result.accepted, false);
    assert.equal(f.reads.opened.length, 0); assert.equal(f.runtime.state.nonTerminal, 0); assert.equal(f.store.calls.length, 0);
  }
  for (const text of [" ", "\ud800", "x".repeat(2401)]) {
    const f = fixture(); assert.deepEqual(await f.app.dispatch(f.create(operation(), text)), { accepted: false, failure: "invalid_input" });
    assert.equal(f.auth.calls.length, 0); assert.equal(f.reads.opened.length, 0);
  }
});

test("cancel while preaccept awaits irreversibly seals dispatch; late permit creates no read/fence/model", async () => {
  const f = fixture(), command = f.create(), pending = deferred<AsyncAuthorityObservation>();
  f.auth.preacceptHook = () => pending.promise;
  const first = f.app.dispatch(command), second = f.app.dispatch(command); assert.equal(first, second);
  assert.equal((await f.app.cancel(command, f.who)).kind, "closed");
  pending.resolve("authorized");
  assert.deepEqual(await first, { accepted: false, failure: "stale_authority" });
  assert.equal(f.app.inspect(command)!.disposeCount, 1);
  assert.equal(f.reads.opened.length, 0); assert.equal(f.store.calls.length, 0); assert.equal(f.calls.length, 0);
});

test("queued request opens exact start view at acceptance; clocks and snapshot never move to dequeue", async () => {
  const f = fixture(), first = f.create(operation(1));
  const a = await f.app.dispatch(first); assert.equal(a.accepted, true); await until(() => f.calls.length === 1);
  const who = identity("second-owner");
  const queued = f.app.create({ identity: who, operation: operation(2), text: "Queued synthetic input" });
  f.clock.advance(100); f.setUtc(timestamp.seconds + 100);
  const b = await f.app.dispatch(queued); assert.equal(b.accepted, true); if (!b.accepted) return;
  assert.equal(b.request.acceptedAt, 100); assert.equal(b.request.deadline, 60_100);
  assert.equal(f.reads.opened.length, 2);
  assert.equal(f.reads.opened[1]!.asOf.seconds, timestamp.seconds + 100);
  f.clock.advance(100); f.setUtc(timestamp.seconds + 200);
  f.calls[0]!.completion.resolve(valid()); await until(() => f.calls.length === 2);
  assert.equal(f.reads.opened[1]!.asOf.seconds, timestamp.seconds + 100);
  assert.equal(f.calls[1]!.input.currentMessage, "Queued synthetic input");
  f.calls[1]!.completion.resolve(valid()); assert.equal((await b.request.outcome).ok, true);
});

test("5s queued expiry, 45s generation and 60s total use original scheduler budgets", async () => {
  const f = fixture(); const a = await f.app.dispatch(f.create()); await until(() => f.calls.length === 1);
  assert.equal(a.accepted, true); if (!a.accepted) return;
  const who = identity("second-owner"); const queued = f.app.create({ identity: who, operation: operation(2), text: "Queued" });
  const b = await f.app.dispatch(queued); assert.equal(b.accepted, true); if (!b.accepted) return;
  f.clock.advance(5000); assert.deepEqual(await b.request.outcome, { ok: false, failure: "queue_expired" });
  assert.equal(f.app.inspect(queued)!.processing, false);
  f.clock.advance(40_000); assert.deepEqual(await a.request.outcome, { ok: false, failure: "generation_timed_out" });
  assert.equal(f.runtime.state.quarantined, true); f.calls[0]!.completion.resolve(valid());
  await until(() => !f.runtime.state.quarantined); assert.equal(f.delivered.length, 0);

  const g = fixture(), pending = deferred<AsyncAuthorityObservation>();
  const admission = await g.app.dispatch(g.create()); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  g.auth.freshHook = () => pending.promise;
  g.clock.advance(60_000); assert.deepEqual(await admission.request.outcome, { ok: false, failure: "timed_out" });
  pending.resolve("authorized"); assert.equal(g.calls.length, 0);
});

test("cancel during fresh Auth disposes getters before supplier returns and starts no user transaction", async () => {
  const f = fixture(), command = f.create(), pending = deferred<AsyncAuthorityObservation>();
  f.auth.freshHook = () => pending.promise;
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.auth.calls.includes("fresh"));
  const cancelled = f.app.cancel(command, f.who);
  assert.equal(f.app.inspect(command)!.processing, false); assert.equal(f.app.inspect(command)!.terminal, true);
  pending.resolve("authorized"); await cancelled;
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "cancelled" });
  assert.equal(f.store.calls.includes("user"), false); assert.equal(f.calls.length, 0);
});

test("transaction supplier rechecks database authority; readCurrent observation never permits stale content commit", async () => {
  const f = fixture();
  f.store.userHook = async (context, getter, retry) => { f.store.transactionAuthority = false; return f.store.commitUser(context, getter, retry); };
  const admission = await f.app.dispatch(f.create()); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "stale_authority" });
  assert.equal(f.store.rows.size, 0); assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
});

test("ACK-lost committed user remains unknown; only matching closed all-pending readback resolves", async () => {
  const f = fixture(), command = f.create();
  f.store.userHook = async (context, getter, retry) => { assert.equal(f.store.commitUser(context, getter, retry).kind, "committed"); return { kind: "unknown" }; };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  assert.equal((await admission.request.outcome).ok, false);
  assert.equal(f.store.rows.size, 1); assert.equal(f.calls.length, 0); assert.equal(f.app.inspect(command)!.uncertain, true);
  assert.equal(await f.app.checkResult(command, f.who), "resolved");
  assert.equal(f.app.inspect(command)!.userCommitted, true); assert.equal(f.app.inspect(command)!.uncertain, false);
  assert.equal(await f.app.checkResult(command, f.who), "resolved");
});

test("user content ACK after local cancel cannot change effects or deliver; issued SDK-only bytes stay separate", async () => {
  const f = fixture(), command = f.create(), pending = deferred<AsyncUserWriteObservation>();
  let retainedGetter: (() => string | undefined) | undefined;
  f.store.userHook = (context, getter, retry) => { retainedGetter = getter;
    const committed = f.store.commitUser(context, getter, retry); assert.equal(committed.kind, "committed");
    void pending.promise; return pending.promise;
  };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => retainedGetter !== undefined); const close = f.app.cancel(command, f.who);
  assert.equal(retainedGetter!(), undefined); assert.equal(f.store.contexts[0]!.dependencies(), undefined);
  pending.resolve({ kind: "committed", operationId: operation().operationId, conversationId: operation().conversationId,
    user: f.store.rows.get(operation().userMessageId)!.user });
  await close; assert.equal((await admission.request.outcome).ok, false);
  assert.equal(f.app.inspect(command)!.userCommitted, false); assert.equal(f.app.inspect(command)!.uncertain, true);
  assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
});

test("assistant ACK-loss keeps canonical pair/pending and no original response; new read resolves saved assistant", async () => {
  const f = fixture(), command = f.create();
  f.store.assistantHook = async (context, user, getter) => { assert.equal(f.store.commitAssistant(context, user, getter).kind, "committed"); return { kind: "unknown" }; };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid());
  assert.equal((await admission.request.outcome).ok, false); assert.equal(f.store.calls.includes("settle"), false);
  assert.equal(f.delivered.length, 0); assert.equal(f.store.pending.size, 1);
  assert.equal(await f.app.checkResult(command, f.who), "resolved"); assert.equal(f.app.inspect(command)!.assistantCommitted, true);
});

test("each explicit Check result may reobserve unresolved close, without an automatic loop", async () => {
  const f = fixture(), command = f.create(); let closes = 0;
  f.store.userHook = async () => ({ kind: "unknown" });
  f.store.closeHook = async op => { closes++; if (closes === 1) return { kind: "unresolved" };
    f.store.fences.set(op.operationId, "closed"); return { kind: "closed", operationId: op.operationId, conversationId: op.conversationId }; };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await admission.request.outcome; await until(() => closes === 1);
  await Promise.resolve(); await Promise.resolve(); assert.equal(closes, 1);
  assert.equal(await f.app.checkResult(command, f.who), "resolved"); assert.equal(closes, 2);
  assert.equal(await f.app.checkResult(command, f.who), "resolved"); assert.equal(closes, 2);
});

test("temporary unresolved check permits later explicit check but concurrent actions never launch two reads", async () => {
  const f = fixture(), command = f.create(), pending = deferred<AsyncAuthorityObservation>();
  f.store.userHook = async () => ({ kind: "unknown" });
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await admission.request.outcome;
  f.auth.freshHook = () => pending.promise;
  const first = f.app.checkResult(command, f.who);
  assert.equal(await f.app.checkResult(command, f.who), "unresolved");
  pending.resolve("unavailable"); assert.equal(await first, "unresolved");
  assert.equal(f.store.calls.includes("reconcile"), false);
  f.auth.freshHook = undefined;
  assert.equal(await f.app.checkResult(command, f.who), "resolved");
  assert.equal(f.store.calls.filter(call => call === "reconcile").length, 1);
});

test("wrong operation close acknowledgment and same-UID replacement session cannot control original attempt", async () => {
  const f = fixture(), command = f.create();
  f.store.userHook = async () => ({ kind: "unknown" });
  f.store.closeHook = async () => ({ kind: "closed", operationId: id(999), conversationId: operation().conversationId });
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await admission.request.outcome;
  assert.equal((await f.app.cancel(command, { ...f.who, session: {} })).kind, "unresolved");
  assert.equal(await f.app.checkResult(command, { ...f.who, session: {} }), "unresolved");
  assert.equal(await f.app.checkResult(command, f.who), "unresolved");
  assert.equal(f.app.inspect(command)!.barrier, "unresolved"); assert.equal(f.store.calls.includes("reconcile"), false);
});

test("Retry claims exact original U text/metadata and never recreates it or changes timestamp/sequence", async () => {
  const f = fixture(), op = operation(), original = { messageId: op.userMessageId, sequence: 7, persistedAt: { ...timestamp, nanoseconds: 123000 } };
  f.store.rows.set(op.userMessageId, { user: original, text: "Same explicit input", assistantMessageId: undefined });
  const retry = { ...op, operationId: id(2), kind: "retry" as const, targetKind: "existing" as const };
  const command = f.create(retry, "Same explicit input", original), admission = await f.app.dispatch(command);
  assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid()); assert.equal((await admission.request.outcome).ok, true);
  assert.equal(f.store.rows.size, 1); assert.deepEqual(f.delivered[0]!.user, original);
  assert.equal(f.store.rows.get(op.userMessageId)!.user, original);
});

test("Retry substituted original U metadata and any other pending/accepted pair fail before model call", async () => {
  for (const variant of ["time", "pending", "accepted", "text"] as const) {
    const f = fixture(), op = operation(), original = { messageId: op.userMessageId, sequence: 7, persistedAt: { ...timestamp } };
    f.store.rows.set(op.userMessageId, { user: original, text: "Same", assistantMessageId: variant === "accepted" ? id(301) : undefined });
    if (variant === "pending") f.store.pending.set(op.userMessageId, id(999));
    if (variant === "time") f.store.userHook = async context => ({ kind: "committed", ...f.store.bound(context),
      user: { ...original, persistedAt: { ...timestamp, nanoseconds: 1 } } });
    const command = f.create({ ...op, operationId: id(2), kind: "retry", targetKind: "existing" }, variant === "text" ? "Changed" : "Same", original);
    const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) continue;
    assert.equal((await admission.request.outcome).ok, false); assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
  }
});

test("cancel during matching claim settlement retains unknown and late A settlement cannot clear B claim", async () => {
  const f = fixture(), command = f.create(), pending = deferred<AsyncClaimSettlement>();
  let settlement: (() => AsyncClaimSettlement) | undefined;
  f.store.settlementHook = (context, user, aid) => { settlement = () => f.store.settle(context, user, aid); return pending.promise; };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid()); await until(() => settlement !== undefined);
  await f.app.cancel(command, f.who);
  f.store.pending.set(operation().userMessageId, id(999));
  const result = settlement!(); assert.equal(result.kind, "rejected"); pending.resolve(result);
  assert.equal((await admission.request.outcome).ok, false); assert.equal(f.store.pending.get(operation().userMessageId), id(999));
  assert.equal(f.delivered.length, 0); assert.equal(await f.app.checkResult(command, f.who), "unresolved");
});

test("actual model dispatch waits for fresh current authorization; cancel during it causes zero model calls", async () => {
  const f = fixture(), command = f.create(), pending = deferred<ContextReadResult<CurrentContextAuthority>>();
  let currentCalls = 0;
  f.reads.currentHook = async dependencies => {
    currentCalls++;
    if (currentCalls === 4) return pending.promise;
    return { kind: "read", value: { authority: f.reads.authority, usedPersona: "not-used", sources: dependencies.sources.map(s => ({ sourceId: s.sourceId, state: "valid" })) } };
  };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => currentCalls === 4); assert.equal(f.calls.length, 0); assert.equal(f.runtime.state.quarantined, false);
  void f.app.cancel(command, f.who); assert.equal(f.runtime.state.quarantined, true);
  pending.resolve({ kind: "read", value: { authority: f.reads.authority, usedPersona: "not-used", sources: [] } });
  await until(() => !f.runtime.state.quarantined); assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
});

test("underlying model does not settle on Cancel; original late output is dropped and lane remains quarantined", async () => {
  const f = fixture(), command = f.create(), admission = await f.app.dispatch(command);
  assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); void f.app.cancel(command, f.who);
  assert.equal(f.runtime.state.quarantined, true); assert.equal(f.calls[0]!.budget.signal.aborted, true);
  f.calls[0]!.completion.resolve(valid()); await until(() => !f.runtime.state.quarantined);
  assert.equal(f.delivered.length, 0); assert.equal(f.store.calls.includes("assistant"), false);
});

test("unsafe candidate rejection persists no assistant and produces no synthetic conversation fallback", async () => {
  const f = fixture(); f.gates.candidate = async () => ({ ok: false, failure: "unsafe_output" });
  const admission = await f.app.dispatch(f.create()); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid());
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "unsafe_output" });
  assert.equal(f.store.calls.includes("assistant"), false); assert.equal(f.delivered.length, 0);
});

test("cancel after persistence but before delayed actual sink prevents late original delivery", async () => {
  const f = fixture(), command = f.create(); let event: Parameters<typeof f.delivery.deliver>[2] | undefined;
  const pending = deferred<"accepted" | "refused">();
  f.delivery.deliver = async (_context, revalidate, candidateEvent) => { assert.equal(await revalidate(), true); event = candidateEvent; return pending.promise; };
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid()); await until(() => event !== undefined);
  assert.equal(f.runtime.state.nonTerminal, 1); assert.equal(f.app.inspect(command)!.assistantCommitted, true);
  void f.app.cancel(command, f.who); event!(message => f.delivered.push(message)); pending.resolve("accepted");
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "cancelled" }); assert.equal(f.delivered.length, 0);
});

test("delivery supplier cannot skip its fresh authority callback or replay sink acceptance", async () => {
  const f = fixture();
  f.delivery.deliver = async (_context, _revalidate, event) => { event(message => f.delivered.push(message)); return "accepted"; };
  const admission = await f.app.dispatch(f.create()); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid());
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "stale_authority" }); assert.equal(f.delivered.length, 0);
});

test("same-UID new session invalidates old operation across delayed supplier reply", async () => {
  const f = fixture(), command = f.create(), pending = deferred<AsyncUserWriteObservation>();
  let currentSession = f.who.session;
  f.auth.current = caller => caller.session === currentSession;
  f.store.userHook = () => pending.promise;
  const admission = await f.app.dispatch(command); assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.store.calls.includes("user")); currentSession = {};
  pending.resolve({ kind: "committed", operationId: operation().operationId, conversationId: operation().conversationId,
    user: { messageId: operation().userMessageId, sequence: 1, persistedAt: timestamp } });
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "stale_authority" });
  assert.equal(f.app.inspect(command)!.processing, false); assert.equal(f.app.inspect(command)!.userCommitted, false);
  assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
});

test("known source revocation notification cancels generation immediately without substituting default", async () => {
  const f = fixture(), command = f.create(), admission = await f.app.dispatch(command);
  assert.equal(admission.accepted, true); if (!admission.accepted) return;
  await until(() => f.calls.length === 1); f.app.invalidate(command);
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "stale_authority" });
  assert.equal(f.calls[0]!.budget.signal.aborted, true); assert.equal(f.runtime.state.quarantined, true);
  f.calls[0]!.completion.resolve(valid()); await until(() => !f.runtime.state.quarantined);
  assert.equal(f.store.calls.includes("assistant"), false); assert.equal(f.delivered.length, 0);
});
