import assert from "node:assert/strict";
import test from "node:test";
import { AsyncConversationOperationExecutor, type AsyncConversationExecutionProviders } from "../../src/ai-conversation/application/async-conversation-operation-executor.js";
import type { AsyncAcknowledgedConversationPair, ExecutedConversation, RequestOriginalConversationIdentity } from "../../src/ai-conversation/ports/application-conversation-operations.js";
import type { AsyncConversationAuthority } from "../../src/ai-conversation/ports/async-conversation.js";
import type { IdentityVerificationResult } from "../../src/shared/ports/identity-verifier.js";
import { valid } from "../ai-runtime/support.js";
import { deferred, fixture, id, operation, timestamp, until } from "./async-conversation-fakes.js";

type Pair = Extract<Awaited<ReturnType<AsyncAcknowledgedConversationPair["read"]>>, { kind: "success" }>;
function setup(options: { sink?: boolean; pair?: boolean } = {}) {
  const f = fixture(), controller = new AbortController(), accepted: ExecutedConversation[] = [];
  let canonicalAssistant = "", textCalls = 0, authCalls = 0, pairCalls = 0, originals: RequestOriginalConversationIdentity[] = [];
  let current = true, verification: IdentityVerificationResult = { kind: "verified", principal: f.who.principal };
  let pairHook: ((pair: Pair) => Promise<Awaited<ReturnType<AsyncAcknowledgedConversationPair["read"]>>>) | undefined;
  let sinkHook: ((body: ExecutedConversation) => boolean) | undefined, terminalHook: (() => void) | undefined, terminals = 0;
  f.store.assistantHook = async (context, user, getter) => {
    canonicalAssistant = getter()?.message ?? "";
    return f.store.commitAssistant(context, user, getter);
  };
  const authority = (original: RequestOriginalConversationIdentity): AsyncConversationAuthority => {
    originals.push(original);
    const fresh: AsyncConversationAuthority["freshAuth"] = async who => {
      const result = await original.verify(who);
      if (!original.current(who)) return "denied";
      if (result.kind === "verified") return f.auth.freshAuth(who);
      return result.kind === "dependency_unavailable" ? "unavailable" : "denied";
    };
    return { current: who => original.current(who) && f.auth.current(who), freshAuth: fresh,
      preaccept: async (who, op) => (await fresh(who)) === "authorized" ? f.auth.preaccept(who, op) : "denied" };
  };
  const pairProvider: AsyncAcknowledgedConversationPair = { async read(context) {
    pairCalls++;
    const row = f.store.rows.get(context.operation.userMessageId)!;
    const pair: Pair = { kind: "success", value: {
      user: { ...row.user, role: "user", availability: "available", text: row.text },
      assistant: { messageId: row.assistantMessageId!, sequence: row.user.sequence + 1, persistedAt: { ...timestamp, nanoseconds: 789 },
        role: "assistant", availability: "available", text: canonicalAssistant }, presentation: { presentationMode: "default" },
    } };
    return pairHook ? pairHook(pair) : pair;
  } };
  const providers: AsyncConversationExecutionProviders = { runtime: f.runtime,
    ports: original => ({ authority: authority(original), reads: f.reads, store: f.store,
      ...(options.pair === false ? {} : { acknowledgedPair: pairProvider }) }),
    gates: f.gates, clock: { monotonicNow: () => f.clock.now(), utcNow: () => ({ ...timestamp }) } };
  const executor = new AsyncConversationOperationExecutor(providers);
  const create = (op = operation(), text = "Synthetic current input", retryUser?: Parameters<typeof executor.create>[0]["retryUser"]) => executor.create({ identity: f.who,
    operation: op, text: () => { textCalls++; return text; }, verifyCurrentAuth: async () => { authCalls++; return verification; },
    ...(retryUser ? { retryUser } : {}) }, { signal: controller.signal, current: () => current,
      onTerminal: () => { terminals++; terminalHook?.(); },
      ...(options.sink === false ? {} : { acceptCompleteBody: (body: ExecutedConversation) => {
        if (sinkHook) return sinkHook(body); accepted.push(body); return true;
      } }) });
  const finish = async (handle: ReturnType<typeof create>, message = "A quiet moment.") => {
    const result = handle.dispatch(); await until(() => f.calls.length === 1); f.calls[0]!.completion.resolve(valid(message)); return result;
  };
  return { f, create, finish, providers, accepted, controller, originals,
    setCurrent: (value: boolean) => { current = value; }, setVerification: (value: IdentityVerificationResult) => { verification = value; },
    setPairHook: (value: typeof pairHook) => { pairHook = value; }, setSinkHook: (value: typeof sinkHook) => { sinkHook = value; },
    setTerminalHook: (value: typeof terminalHook) => { terminalHook = value; },
    counts: () => ({ textCalls, authCalls, pairCalls }), terminals: () => terminals };
}

test("executor construction has no dispatch; missing F02 or authoritative pair refuses before any effect", async () => {
  for (const options of [{ sink: false }, { pair: false }]) {
    const s = setup(options), handle = s.create();
    assert.deepEqual(s.counts(), { textCalls: 0, authCalls: 0, pairCalls: 0 });
    assert.deepEqual(await handle.dispatch(), { kind: "failure", code: "AI_UNAVAILABLE" });
    assert.equal(s.f.reads.opened.length, 0); assert.equal(s.f.store.calls.length, 0); assert.equal(s.f.calls.length, 0);
    assert.equal(s.counts().textCalls, 0); assert.equal(s.f.runtime.state.nonTerminal, 0);
  }
});
test("actual complete acceptance receives authoritative U/A metadata and terminal immediately revokes original capabilities", async () => {
  const s = setup(), handle = s.create();
  s.setSinkHook(body => { assert.equal(s.f.runtime.state.nonTerminal, 1); s.accepted.push(body); return true; });
  const result = await s.finish(handle);
  assert.equal(result.kind, "success"); if (result.kind !== "success") return;
  assert.deepEqual(result.value, s.accepted[0]); assert.equal(result.value.userMessage.text, "Synthetic current input");
  assert.equal(result.value.assistantMessage.text, "A quiet moment.");
  assert.equal(result.value.assistantMessage.persistedAt.nanoseconds, 789);
  assert.equal(Object.isFrozen(result.value.userMessage.persistedAt), true);
  assert.deepEqual(s.f.store.calls.slice(0, 4), ["open", "user", "assistant", "settle"]);
  assert.equal(s.f.runtime.state.nonTerminal, 0); assert.equal(s.counts().pairCalls, 1);
  assert.equal(s.originals[0]!.current(s.f.who), false);
  const calls = s.counts().authCalls; assert.deepEqual(await s.originals[0]!.verify(s.f.who), { kind: "invalid" });
  assert.equal(s.counts().authCalls, calls);
  assert.deepEqual(await handle.dispatch(), { kind: "failure", code: "AI_OPERATION_CONFLICT" });
  assert.equal((await handle.cancel()).kind, "closed"); assert.equal(s.f.calls.length, 1);
});
test("acknowledged pair is awaited before final fresh revalidation; body is accepted within the runtime completion event", async () => {
  const s = setup(), pending = deferred<Pair>(); let supplied: Pair | undefined, readsAtPair = 0;
  s.setPairHook(pair => { supplied = pair; readsAtPair = s.f.reads.calls.filter(x => x === "current").length; return pending.promise; });
  const result = s.finish(s.create()); await until(() => supplied !== undefined);
  assert.equal(s.accepted.length, 0); assert.equal(s.f.runtime.state.nonTerminal, 1);
  pending.resolve(supplied!); assert.equal((await result).kind, "success");
  assert.ok(s.f.reads.calls.filter(x => x === "current").length > readsAtPair);
});
test("canonical pair mismatch or unavailable projection never completes or returns stored content", async () => {
  for (const variant of ["nanosecond", "sequence", "user-id", "assistant-id", "text", "presentation", "tombstone", "failure"] as const) {
    const s = setup(); s.setPairHook(async pair => {
      if (variant === "failure") return { kind: "failure", code: "AI_UNAVAILABLE" };
      const user = { ...pair.value.user }, assistant = { ...pair.value.assistant };
      if (variant === "nanosecond") user.persistedAt = { ...user.persistedAt, nanoseconds: 1 };
      if (variant === "sequence") user.sequence++;
      if (variant === "user-id") user.messageId = id(999);
      if (variant === "assistant-id") assistant.messageId = id(998);
      if (variant === "text") assistant.text = "Substituted canonical content";
      if (variant === "tombstone") assistant.availability = "unavailable";
      return { kind: "success", value: { user, assistant, presentation: variant === "presentation"
        ? { presentationMode: "persona", presentationProjectionVersion: "persona_presentation_v1" } : pair.value.presentation } };
    });
    const result = await s.finish(s.create()); assert.notEqual(result.kind, "success", variant);
    assert.equal(s.accepted.length, 0, variant); assert.equal(s.f.store.rows.size, 1, variant);
    assert.equal(s.f.runtime.state.nonTerminal, 0, variant); assert.equal(s.originals[0]!.current(s.f.who), false, variant);
  }
});
test("cancel synchronously scrubs suppliers while pair read is pending; a late projection cannot deliver", async () => {
  const s = setup(), pending = deferred<Pair>(); let supplied: Pair | undefined;
  s.setPairHook(pair => { supplied = pair; return pending.promise; });
  const handle = s.create(), result = s.finish(handle); await until(() => supplied !== undefined);
  const cancelled = handle.cancel(); assert.equal(s.originals[0]!.current(s.f.who), false);
  const calls = s.counts().authCalls; assert.deepEqual(await s.originals[0]!.verify(s.f.who), { kind: "invalid" }); assert.equal(s.counts().authCalls, calls);
  assert.equal((await cancelled).kind, "closed"); pending.resolve(supplied!);
  assert.deepEqual(await result, { kind: "terminated" }); assert.equal(s.accepted.length, 0);
});
test("original 60s deadline scrubs pending-pair state synchronously and never emits a late failure body", async () => {
  const s = setup(), pending = deferred<Pair>(); let supplied: Pair | undefined;
  s.setPairHook(pair => { supplied = pair; return pending.promise; });
  const result = s.finish(s.create()); await until(() => supplied !== undefined);
  s.f.clock.advance(60_000); assert.equal(s.originals[0]!.current(s.f.who), false);
  assert.equal(s.f.runtime.state.nonTerminal, 0); pending.resolve(supplied!);
  assert.deepEqual(await result, { kind: "terminated" }); assert.equal(s.accepted.length, 0);
});
test("terminal observer runs synchronously once, safely reenters dispose, and precedes outcome continuation", async () => {
  for (const timeout of [false, true]) {
    const s = setup(); let outcomeResumed = false, observed = false;
    const handle = s.create();
    s.setTerminalHook(() => { observed = true; assert.equal(outcomeResumed, false);
      assert.equal(s.originals[0]!.current(s.f.who), false); handle.dispose(); });
    const result = handle.dispatch().then(value => { outcomeResumed = true; return value; });
    await until(() => s.f.calls.length === 1);
    if (timeout) { s.f.clock.advance(60_000); assert.equal(observed, true); }
    else s.f.calls[0]!.completion.resolve(valid());
    await result; assert.equal(observed, true); assert.equal(s.terminals(), 1);
    await handle.cancel(); handle.dispose(); assert.equal(s.terminals(), 1);
    if (timeout) { s.f.calls[0]!.completion.resolve(valid()); await until(() => !s.f.runtime.state.quarantined); }
  }
});
test("cancel does not settle the actual model; generation lane remains quarantined until late completion", async () => {
  const s = setup(), handle = s.create(), result = handle.dispatch(); await until(() => s.f.calls.length === 1);
  await handle.cancel(); assert.equal(s.f.runtime.state.quarantined, true);
  assert.equal(s.f.calls[0]!.budget.signal.aborted, true); assert.deepEqual(await result, { kind: "terminated" });
  s.f.calls[0]!.completion.resolve(valid()); await until(() => !s.f.runtime.state.quarantined);
  assert.equal(s.counts().pairCalls, 0); assert.equal(s.accepted.length, 0);
});
test("45s generation subbudget returns selected noncontent unavailability while preserving quarantine", async () => {
  const s = setup(), result = s.create().dispatch(); await until(() => s.f.calls.length === 1);
  s.f.clock.advance(45_000); assert.deepEqual(await result, { kind: "failure", code: "AI_UNAVAILABLE" });
  assert.equal(s.f.runtime.state.quarantined, true); assert.equal(s.originals[0]!.current(s.f.who), false);
  s.f.calls[0]!.completion.resolve(valid()); await until(() => !s.f.runtime.state.quarantined);
});
test("sink refusal or synchronous disconnect after acceptance cannot falsely complete the original runtime", async () => {
  for (const disconnected of [false, true]) {
    const s = setup(); s.setSinkHook(() => { if (disconnected) s.controller.abort(); return disconnected; });
    assert.notEqual((await s.finish(s.create())).kind, "success");
    assert.equal(s.f.runtime.state.nonTerminal, 0); assert.equal(s.originals[0]!.current(s.f.who), false);
  }
});
test("fresh verification of a different principal never admits or captures private context", async () => {
  const s = setup(); s.setVerification({ kind: "verified", principal: { firebaseUid: "replacement" } });
  assert.deepEqual(await s.create().dispatch(), { kind: "failure", code: "AI_AUTHORITY_CHANGED" });
  assert.equal(s.f.reads.opened.length, 0); assert.equal(s.f.store.calls.length, 0); assert.equal(s.f.calls.length, 0);
});
test("cancel during preaccept returns terminated and late authority cannot capture a view or invoke a model", async () => {
  const s = setup(), pending = deferred<"authorized">();
  s.f.auth.preacceptHook = () => pending.promise;
  const handle = s.create(), result = handle.dispatch(); await until(() => s.f.auth.calls.includes("preaccept"));
  const close = handle.cancel(); assert.equal(s.originals[0]!.current(s.f.who), false);
  pending.resolve("authorized"); assert.equal((await close).kind, "closed");
  assert.deepEqual(await result, { kind: "terminated" });
  assert.equal(s.f.reads.opened.length, 0); assert.equal(s.f.store.calls.length, 0); assert.equal(s.f.calls.length, 0);
});
test("invalid acceptance clock fails closed and revokes capabilities even before the reader can bind runtime abort", async () => {
  for (const throwing of [false, true]) {
    const s = setup(); let observed = false;
    s.providers.clock.utcNow = () => { observed = true; if (throwing) throw new Error("supplier failure");
      return { ...timestamp, nanoseconds: -1 }; };
    const result = s.create().dispatch(); await until(() => observed);
    assert.equal(s.originals[0]!.current(s.f.who), false);
    assert.notEqual((await result).kind, "success");
    assert.equal(s.f.reads.opened.length, 0); assert.equal(s.f.calls.length, 0); assert.equal(s.f.runtime.state.nonTerminal, 0);
  }
});
test("Retry projects the original authoritative U sequence and nanosecond anchor without recreating it", async () => {
  const s = setup(), op = operation(), original = { messageId: op.userMessageId, sequence: 7,
    persistedAt: { ...timestamp, nanoseconds: 123456789 } };
  s.f.store.rows.set(op.userMessageId, { user: original, text: "Same explicit input", assistantMessageId: undefined });
  const handle = s.create({ ...op, operationId: id(2), kind: "retry", targetKind: "existing" }, "Same explicit input", original);
  const result = await s.finish(handle); assert.equal(result.kind, "success"); if (result.kind !== "success") return;
  assert.deepEqual({ messageId: result.value.userMessage.messageId, sequence: result.value.userMessage.sequence,
    persistedAt: result.value.userMessage.persistedAt }, original);
  assert.equal(s.f.store.rows.size, 1); assert.equal(s.f.store.rows.get(op.userMessageId)!.user, original);
});
