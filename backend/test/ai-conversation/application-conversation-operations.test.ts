import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationConversationOperations } from "../../src/ai-conversation/application/application-conversation-operations.js";
import type { ConversationCaller, ConversationReadback, ConversationResult, PreparedConversationOperation } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { ConversationExecutionDelivery, ConversationOperationClock, ConversationOperationExecutor,
  ConversationOperationReaders, ExecutedConversation } from "../../src/ai-conversation/ports/application-conversation-operations.js";
import type { AsyncCloseObservation } from "../../src/ai-conversation/ports/async-conversation.js";
import type { StoredConversationMessage } from "../../src/ai-conversation/ports/real-conversation-store.js";
import type { IdentityVerificationResult } from "../../src/shared/ports/identity-verifier.js";
import type { SelectedReplySnapshot } from "../../src/ai-conversation/ports/selected-reply.js";

const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1), existing = id(2), originalUser = id(3);
const good = <T>(value: T): ConversationResult<T> => ({ kind: "success", value });
const bad = <T = never>(code: "AI_UNAVAILABLE" | "AI_OPERATION_CONFLICT" | "AI_OUTCOME_UNRESOLVED"): ConversationResult<T> => ({ kind: "failure", code });
function value<T>(result: ConversationResult<T>): T { assert.equal(result.kind, "success"); if (result.kind !== "success") throw new Error("Expected success"); return result.value; }
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
async function until(predicate: () => boolean): Promise<void> { for (let i = 0; i < 100 && !predicate(); i++) await Promise.resolve(); assert.ok(predicate()); }
class Clock implements ConversationOperationClock {
  instant = 0; tasks = new Set<{ at: number; wake: () => void }>();
  now(): number { return this.instant; }
  utcMilliseconds(): number { return Date.UTC(2026, 9, 14, 10) + this.instant; }
  at(at: number, wake: () => void): () => void { const task = { at, wake }; this.tasks.add(task); return () => { this.tasks.delete(task); }; }
  advance(ms: number): void { this.instant += ms; for (const task of [...this.tasks]) if (task.at <= this.instant && this.tasks.delete(task)) task.wake(); }
}
type ExecutorInput = Parameters<ConversationOperationExecutor["create"]>[0];
function fixture(includeReaders = true) {
  const clock = new Clock(), accepted: ExecutedConversation[] = [], inputs: ExecutorInput[] = [], modes: boolean[] = [];
  let next = 100, creates = 0, dispatches = 0, cancels = 0, disposals = 0, purpose = true;
  let authHook: (() => Promise<IdentityVerificationResult>) | undefined;
  let executeHook: ((input: ExecutorInput, delivery: ConversationExecutionDelivery) => Promise<ConversationResult<ExecutedConversation>>) | undefined;
  let closeHook: ((input: ExecutorInput) => Promise<AsyncCloseObservation>) | undefined;
  const call = (digest = "a".repeat(64), uid = "synthetic-uid"): ConversationCaller => ({ principal: { firebaseUid: uid }, tokenInstance: digest,
    verifyCurrentAuth: () => authHook ? authHook() : Promise.resolve({ kind: "verified", principal: { firebaseUid: uid } }) });
  const original = call();
  const savedUser: StoredConversationMessage = { messageId: originalUser, sequence: 11, role: "user", availability: "available",
    persistedAt: { seconds: 1_791_972_000, nanoseconds: 123_456_789 }, text: "Synthetic exact input" };
  let readback: ConversationReadback = { operationId: id(100), state: "unresolved" };
  const readers: ConversationOperationReaders = includeReaders ? {
    verifyTarget: async () => good(undefined), retryUser: async () => good(savedUser),
    readOutcome: async (_c, _conversation, op) => good({ ...readback, operationId: op }),
    listMessages: async () => good({ messages: [savedUser] }), deleteConversation: async () => good(undefined),
  } : {};
  const makePair = (input: ExecutorInput): ExecutedConversation => ({ operationId: input.operation.operationId, conversationId: input.operation.conversationId,
    userMessage: input.retryUser ? { ...savedUser, ...input.retryUser, text: input.text()! } :
      { ...savedUser, messageId: input.operation.userMessageId, sequence: 1, text: input.text()! },
    assistantMessage: { messageId: id(400), sequence: input.retryUser ? input.retryUser.sequence + 1 : 2, role: "assistant", availability: "available",
      persistedAt: { seconds: savedUser.persistedAt.seconds + 1, nanoseconds: 987_654_321 }, text: "Synthetic accepted reply" } });
  const executor: ConversationOperationExecutor = { create: (input, delivery) => {
    creates++; inputs.push(input); let disposed = false;
    return { dispatch: async () => {
      dispatches++;
      if (executeHook) return executeHook(input, delivery);
      const pair = makePair(input); return delivery.acceptCompleteBody?.(pair) === true ? good(pair) : bad("AI_OUTCOME_UNRESOLVED");
    }, cancel: async () => { cancels++; return closeHook ? closeHook(input) : { kind: "closed", operationId: input.operation.operationId, conversationId: input.operation.conversationId }; },
    dispose: () => { if (!disposed) { disposed = true; disposals++; } } };
  } };
  const app = new ApplicationConversationOperations({ resolve: async (_caller, required) => {
    modes.push(required); return required && !purpose ? { kind: "failure", code: "AI_CONTEXT_NOT_PERMITTED" } : good({ ownerId: _caller.principal.firebaseUid === "second-owner" ? id(9) : owner });
  } }, { uuid: () => id(next++), operationKey: () => "A".repeat(43) }, clock, executor, readers);
  const delivery = (controller = new AbortController()): ConversationExecutionDelivery => ({ signal: controller.signal, current: () => !controller.signal.aborted,
    acceptCompleteBody: pair => { accepted.push(pair); return true; } });
  const prepare = async (): Promise<PreparedConversationOperation> => value(await app.prepare(original, { kind: "send", purpose: "checkin_conversation" }));
  const execute = (ticket: PreparedConversationOperation, d = delivery(), caller = original, text = savedUser.text!) =>
    app.execute(caller, { operationId: ticket.operationId, operationKey: ticket.operationKey, text }, d);
  return { app, clock, readers, original, call, savedUser, accepted, inputs, modes, prepare, execute, delivery, makePair,
    counts: () => ({ creates, dispatches, cancels, disposals }), setPurpose: (v: boolean) => { purpose = v; },
    setAuth: (hook: (() => Promise<IdentityVerificationResult>) | undefined) => { authHook = hook; },
    setExecute: (hook: typeof executeHook) => { executeHook = hook; }, setClose: (hook: typeof closeHook) => { closeHook = hook; },
    setReadback: (v: ConversationReadback) => { readback = v; } };
}

test("N01 prepare reserves no runtime/content effect, one owner ticket, exact 15s monotonic expiry", async () => {
  const f = fixture(), ticket = await f.prepare();
  assert.equal(ticket.preparationExpiresAt, "2026-10-14T10:00:15.000Z"); assert.deepEqual(f.counts(), { creates: 0, dispatches: 0, cancels: 0, disposals: 0 });
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation" }), bad("AI_OPERATION_CONFLICT"));
  f.clock.advance(15_000); assert.deepEqual(await f.execute(ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
  assert.notEqual((await f.prepare()).operationId, ticket.operationId);
});
test("concurrent prepare locks the owner during the existing-target read without replacing it", async () => {
  const f = fixture(), pending = deferred<ConversationResult<void>>(); f.readers.verifyTarget = () => pending.promise;
  const first = f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing });
  await until(() => f.clock.tasks.size > 0 && f.modes.length === 1);
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation" }), bad("AI_OPERATION_CONFLICT"));
  pending.resolve(good(undefined)); assert.equal((await first).kind, "success"); assert.equal(f.counts().creates, 0);
});
test("timed-out read preparation releases only its own reservation and discards the late target", async () => {
  const f = fixture(), pending = deferred<ConversationResult<void>>(); f.readers.verifyTarget = () => pending.promise;
  const first = f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing });
  await until(() => f.modes.length === 1); await Promise.resolve(); f.clock.advance(15_000);
  assert.deepEqual(await first, bad("AI_UNAVAILABLE")); const next = await f.prepare();
  pending.resolve(good(undefined)); await Promise.resolve();
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation" }), bad("AI_OPERATION_CONFLICT"));
  assert.equal((await f.execute(next)).kind, "success");
});
test("invalid Unicode/body is rejected before consumption; valid original ticket remains usable", async () => {
  const f = fixture(), ticket = await f.prepare();
  for (const text of [" ", "\ud800", "x".repeat(2401)]) assert.deepEqual(await f.execute(ticket, f.delivery(), f.original, text), { kind: "failure", code: "AI_INPUT_INVALID" });
  assert.equal(f.counts().creates, 0); assert.equal((await f.execute(ticket)).kind, "success"); assert.equal(f.counts().dispatches, 1);
});
test("original digest/key are exact; same UID new token and a different owner never acquire controls", async () => {
  const f = fixture(), ticket = await f.prepare();
  for (const caller of [f.call("b".repeat(64)), f.call("a".repeat(64), "foreign-uid")]) {
    assert.deepEqual(await f.execute(ticket, f.delivery(), caller), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
    assert.deepEqual(await f.app.cancel(caller, ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
  }
  assert.deepEqual(await f.app.cancel(f.original, { ...ticket, operationKey: "E".repeat(43) }), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
  assert.equal((await f.execute(ticket)).kind, "success");
});
test("missing F02 sink refuses before consuming; original ticket executes once when actual capability arrives", async () => {
  const f = fixture(), ticket = await f.prepare(), controller = new AbortController();
  assert.deepEqual(await f.execute(ticket, { signal: controller.signal, current: () => true }), bad("AI_UNAVAILABLE"));
  assert.equal(f.counts().creates, 0); assert.equal((await f.execute(ticket)).kind, "success");
  assert.equal(f.accepted.length, 1); assert.equal(f.inputs[0]!.text(), undefined); assert.equal((await f.inputs[0]!.verifyCurrentAuth()).kind, "dependency_unavailable");
});
test("duplicate/concurrent execute cannot dispatch twice or replay a returned response", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<ConversationResult<ExecutedConversation>>();
  f.setExecute(() => pending.promise); const first = f.execute(ticket); await until(() => f.counts().dispatches === 1);
  assert.deepEqual(await f.execute(ticket), bad("AI_OPERATION_CONFLICT"));
  pending.resolve(bad("AI_OUTCOME_UNRESOLVED")); assert.deepEqual(await first, bad("AI_OUTCOME_UNRESOLVED"));
  assert.deepEqual(await f.execute(ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" }); assert.equal(f.counts().creates, 1); assert.equal(f.accepted.length, 0);
});
test("terminal confirmed and unknown closure both release digest/key after the original cancel phase settles", async () => {
  for (const unknown of [false, true]) {
    const f = fixture(), ticket = await f.prepare(), closing = deferred<AsyncCloseObservation>();
    f.setExecute(async () => bad("AI_OUTCOME_UNRESOLVED")); f.setClose(() => closing.promise);
    assert.deepEqual(await f.execute(ticket), bad("AI_OUTCOME_UNRESOLVED"));
    const originalCancel = f.app.cancel(f.original, ticket);
    closing.resolve(unknown ? { kind: "unresolved" } : { kind: "closed", operationId: ticket.operationId, conversationId: ticket.conversationId });
    const result = await originalCancel;
    assert.deepEqual(result, unknown ? bad("AI_OUTCOME_UNRESOLVED") : good({ operationId: ticket.operationId, state: "terminal" }));
    assert.deepEqual(await f.app.cancel(f.original, ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
    assert.deepEqual(await f.execute(ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
    f.setReadback({ operationId: ticket.operationId, state: "unresolved" });
    assert.equal(value(await f.app.readOutcome(f.call("b".repeat(64)), ticket.conversationId, ticket.operationId)).state, "unresolved");
    assert.equal(f.inputs[0]!.text(), undefined); assert.equal((await f.inputs[0]!.verifyCurrentAuth()).kind, "dependency_unavailable");
  }
});
test("prepared cancellation irreversibly closes dispatch without starting an executor", async () => {
  const f = fixture(), ticket = await f.prepare();
  assert.equal(value(await f.app.cancel(f.original, ticket)).state, "terminal");
  assert.deepEqual(await f.execute(ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" }); assert.equal(f.counts().creates, 0);
});
test("Cancel during fresh preaccept seals consumer dispatch before late auth returns", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<IdentityVerificationResult>();
  f.setAuth(() => pending.promise); const execution = f.execute(ticket); await Promise.resolve();
  const cancellation = f.app.cancel(f.original, ticket);
  pending.resolve({ kind: "verified", principal: f.original.principal });
  assert.deepEqual(await execution, { kind: "terminated" }); assert.equal((await cancellation).kind, "success"); assert.equal(f.counts().creates, 0);
});
test("active Cancel disposes text/verifier synchronously, shares pending barrier and rejects late ACK", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<ConversationResult<ExecutedConversation>>(), closed = deferred<AsyncCloseObservation>();
  f.setExecute(() => pending.promise); f.setClose(() => closed.promise);
  const execution = f.execute(ticket); await until(() => f.inputs.length === 1);
  const input = f.inputs[0]!, late = f.makePair(input), cancellation = f.app.cancel(f.original, ticket);
  assert.equal(input.text(), undefined); assert.equal((await input.verifyCurrentAuth()).kind, "dependency_unavailable");
  pending.resolve(good(late)); closed.resolve({ kind: "closed", operationId: ticket.operationId, conversationId: ticket.conversationId });
  assert.deepEqual(await execution, { kind: "terminated" }); assert.equal((await cancellation).kind, "success");
  assert.equal(f.counts().cancels, 1); assert.equal(f.counts().disposals, 1); assert.equal(f.accepted.length, 0);
});
test("already-aborted and mid-dispatch disconnected responses cannot reach the complete-body sink", async () => {
  const f = fixture(), ticket = await f.prepare(), controller = new AbortController(); controller.abort();
  assert.deepEqual(await f.execute(ticket, f.delivery(controller)), { kind: "terminated" }); assert.equal(f.counts().creates, 0);
  const active = new AbortController(), pending = deferred<ConversationResult<ExecutedConversation>>();
  f.setExecute(async (input, delivery) => { const result = await pending.promise; assert.equal(delivery.acceptCompleteBody?.(f.makePair(input)), false); return result; });
  const execution = f.execute(ticket, f.delivery(active)); await until(() => f.inputs.length === 1); const late = f.makePair(f.inputs[0]!);
  active.abort(); assert.equal(f.inputs[0]!.text(), undefined); pending.resolve(good(late));
  assert.deepEqual(await execution, { kind: "terminated" }); assert.equal(f.accepted.length, 0);
});
test("an executor success without actual sink acceptance remains unresolved, never fabricated delivery", async () => {
  const f = fixture(), ticket = await f.prepare(); f.setExecute(async input => good(f.makePair(input)));
  assert.deepEqual(await f.execute(ticket), bad("AI_OUTCOME_UNRESOLVED")); assert.equal(f.accepted.length, 0);
});
test("actual runtime terminal synchronously scrubs outer input/Auth before suspended dispatch resumes", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<ConversationResult<ExecutedConversation>>();
  let notified = false; let accepted: ExecutedConversation | undefined;
  f.setExecute((input, delivery) => {
    accepted = f.makePair(input); assert.equal(delivery.acceptCompleteBody?.(accepted), true);
    delivery.onTerminal?.(); notified = true;
    assert.equal(input.text(), undefined); assert.equal(delivery.acceptCompleteBody?.(accepted), false);
    return pending.promise;
  });
  const running = f.execute(ticket); await until(() => notified);
  assert.equal(f.inputs[0]!.text(), undefined); assert.equal((await f.inputs[0]!.verifyCurrentAuth()).kind, "dependency_unavailable");
  assert.equal(f.counts().disposals, 1); assert.equal(f.counts().cancels, 0);
  pending.resolve(good(accepted!)); assert.equal((await running).kind, "success"); assert.equal(f.accepted.length, 1);
});
test("runtime terminal observer preserves a selected live sub-budget failure without permitting a late sink", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<ConversationResult<ExecutedConversation>>();
  let notified = false;
  f.setExecute((input, delivery) => {
    const candidate = f.makePair(input); delivery.onTerminal?.(); notified = true;
    assert.equal(delivery.acceptCompleteBody?.(candidate), false); return pending.promise;
  });
  const running = f.execute(ticket); await until(() => notified);
  assert.equal(f.inputs[0]!.text(), undefined); assert.equal((await f.inputs[0]!.verifyCurrentAuth()).kind, "dependency_unavailable");
  pending.resolve(bad("AI_UNAVAILABLE")); assert.deepEqual(await running, bad("AI_UNAVAILABLE")); assert.equal(f.accepted.length, 0);
});
test("sink accepts once, rejects wrong canonical U/text/pair and mismatched returned metadata", async () => {
  const f = fixture(), ticket = await f.prepare();
  f.setExecute(async (input, delivery) => {
    const correct = f.makePair(input);
    assert.equal(delivery.acceptCompleteBody?.({ ...correct, userMessage: { ...correct.userMessage, text: "wrong" } }), false);
    assert.equal(delivery.acceptCompleteBody?.({ ...correct, userMessage: { ...correct.userMessage, messageId: id(999) } }), false);
    assert.equal(delivery.acceptCompleteBody?.(correct), true); assert.equal(delivery.acceptCompleteBody?.(correct), false);
    return good({ ...correct, userMessage: { ...correct.userMessage, persistedAt: { ...correct.userMessage.persistedAt, nanoseconds: 1 } } });
  });
  assert.deepEqual(await f.execute(ticket), bad("AI_OUTCOME_UNRESOLVED")); assert.equal(f.accepted.length, 1);
});
test("Retry obtains authoritative unchanged U text/id/sequence/full precision before executor creation", async () => {
  const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "retry", purpose: "checkin_conversation", conversationId: existing, userMessageId: originalUser }));
  assert.equal((await f.execute(ticket)).kind, "success");
  assert.deepEqual(f.inputs[0]!.retryUser, { messageId: originalUser, sequence: 11, persistedAt: f.savedUser.persistedAt });
  assert.equal(f.accepted[0]!.userMessage.messageId, originalUser); assert.equal(f.accepted[0]!.userMessage.sequence, 11);
});
test("Retry rejects authoritative mismatch, accepted/tombstone or another pending claim without dispatch", async () => {
  for (const change of ["text", "id", "tombstone", "pending"] as const) {
    const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "retry", purpose: "checkin_conversation", conversationId: existing, userMessageId: originalUser }));
    f.readers.retryUser = async () => change === "pending" ? bad("AI_OPERATION_CONFLICT") : good({ ...f.savedUser,
      ...(change === "text" ? { text: "different" } : change === "id" ? { messageId: id(999) } : { role: "assistant", availability: "unavailable", text: undefined }) } as StoredConversationMessage);
    assert.deepEqual(await f.execute(ticket), bad("AI_OPERATION_CONFLICT")); assert.equal(f.counts().creates, 0);
  }
});
test("Retry canonical U metadata changed at sink cannot be accepted even if executor returns success", async () => {
  const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "retry", purpose: "checkin_conversation", conversationId: existing, userMessageId: originalUser }));
  f.setExecute(async (input, delivery) => { const changed = { ...f.makePair(input), userMessage: { ...f.makePair(input).userMessage, sequence: 10 } };
    assert.equal(delivery.acceptCompleteBody?.(changed), false); return good(changed); });
  assert.deepEqual(await f.execute(ticket), bad("AI_OUTCOME_UNRESOLVED")); assert.equal(f.accepted.length, 0);
});
test("ordinary outcome/history reads use a freshly verified new owner token without old key/session adoption", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<ConversationResult<ExecutedConversation>>(); f.setExecute(() => pending.promise);
  const execution = f.execute(ticket); await until(() => f.inputs.length === 1);
  const fresh = f.call("b".repeat(64)); assert.equal(value(await f.app.readOutcome(fresh, ticket.conversationId, ticket.operationId)).state, "active");
  assert.deepEqual(await f.app.listMessages(fresh, existing, undefined), good({ messages: [f.savedUser] }));
  assert.deepEqual(await f.app.cancel(fresh, ticket), { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
  pending.resolve(bad("AI_OUTCOME_UNRESOLVED")); await execution;
  f.setReadback({ operationId: ticket.operationId, state: "unresolved" });
  assert.equal(value(await f.app.readOutcome(fresh, ticket.conversationId, ticket.operationId)).state, "unresolved"); assert.equal(f.accepted.length, 0);
});
test("older A readback cannot release same-U running B even before B's durable claim is submitted", async () => {
  const f = fixture(), b = value(await f.app.prepare(f.original, { kind: "retry", purpose: "checkin_conversation", conversationId: existing, userMessageId: originalUser })),
    pending = deferred<ConversationResult<ExecutedConversation>>();
  f.setExecute(() => pending.promise); const running = f.execute(b); await until(() => f.inputs.length === 1);
  f.setReadback({ operationId: id(900), state: "user_saved", userMessage: f.savedUser });
  assert.deepEqual(await f.app.readOutcome(f.call("b".repeat(64)), existing, id(900)), good({ operationId: id(900), state: "unresolved" }));
  assert.equal(f.counts().dispatches, 1); pending.resolve(bad("AI_OUTCOME_UNRESOLVED")); await running;
});
test("readback preserves tombstone occupancy and rejects no_effect inferred from ordinary absence", async () => {
  const f = fixture(), fresh = f.call("b".repeat(64));
  f.setReadback({ operationId: id(500), state: "no_effect" });
  assert.deepEqual(await f.app.readOutcome(fresh, existing, id(500)), good({ operationId: id(500), state: "unresolved" }));
  const tombstone: StoredConversationMessage = { messageId: id(501), sequence: 12, role: "assistant", availability: "unavailable", persistedAt: f.savedUser.persistedAt };
  f.setReadback({ operationId: id(500), state: "assistant_saved", userMessage: f.savedUser, assistantMessage: tombstone });
  assert.deepEqual(value(await f.app.readOutcome(fresh, existing, id(500))), { operationId: id(500), state: "assistant_saved", userMessage: f.savedUser, assistantMessage: tombstone });
});
test("missing ordinary/current-target/delete suppliers fail unavailable and do not pretend persistence", async () => {
  const f = fixture(false); assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }), bad("AI_UNAVAILABLE"));
  assert.deepEqual(await f.app.listMessages(f.original, existing, undefined), bad("AI_UNAVAILABLE"));
  assert.deepEqual(await f.app.readOutcome(f.original, existing, id(500)), bad("AI_UNAVAILABLE"));
  assert.deepEqual(await f.app.deleteConversation(f.original, existing), bad("AI_UNAVAILABLE")); assert.equal(f.counts().creates, 0);
});
test("purpose rejection holds generation only; current owner management reads/delete remain independent", async () => {
  const f = fixture(); f.setPurpose(false);
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation" }), { kind: "failure", code: "AI_CONTEXT_NOT_PERMITTED" });
  assert.equal((await f.app.listMessages(f.original, existing, undefined)).kind, "success"); assert.equal((await f.app.deleteConversation(f.original, existing)).kind, "success");
  assert.deepEqual(f.modes, [true, false, false]); assert.equal(f.counts().creates, 0);
});
test("ordinary 15s expiry aborts only its read and discards late saved body", async () => {
  const f = fixture(), pending = deferred<ConversationResult<{ readonly messages: readonly StoredConversationMessage[] }>>(); let sourceSignal: AbortSignal | undefined;
  f.readers.listMessages = context => { sourceSignal = context.signal; return pending.promise; };
  const reading = f.app.listMessages(f.original, existing, undefined); await until(() => sourceSignal !== undefined); f.clock.advance(15_000);
  assert.deepEqual(await reading, bad("AI_UNAVAILABLE")); assert.equal(sourceSignal!.aborted, true); pending.resolve(good({ messages: [f.savedUser] }));
  await Promise.resolve(); assert.equal(f.accepted.length, 0);
});
test("Delete closes only matching original controls first; unknown deletion never confirms success", async () => {
  const f = fixture(), ticket = await f.prepare(), pending = deferred<ConversationResult<ExecutedConversation>>(); f.setExecute(() => pending.promise);
  const executing = f.execute(ticket); await until(() => f.inputs.length === 1);
  f.readers.deleteConversation = async () => { assert.equal(f.inputs[0]!.text(), undefined); return bad("AI_OUTCOME_UNRESOLVED"); };
  assert.deepEqual(await f.app.deleteConversation(f.call("b".repeat(64)), ticket.conversationId), bad("AI_OUTCOME_UNRESOLVED"));
  pending.resolve(bad("AI_OUTCOME_UNRESOLVED")); assert.deepEqual(await executing, { kind: "terminated" });
  assert.equal(f.accepted.length, 0); assert.equal(f.counts().cancels, 1);
});
test("fresh Auth failures use selected stable errors and create neither ticket nor executor", async () => {
  for (const [kind, code] of [["invalid", "AUTH_REQUIRED"], ["forbidden", "AUTH_FORBIDDEN"], ["dependency_unavailable", "AI_UNAVAILABLE"]] as const) {
    const f = fixture(); f.setAuth(async () => ({ kind }));
    assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation" }), { kind: "failure", code }); assert.equal(f.counts().creates, 0);
  }
});

test("closed target lease invalidates an awaiting prepare even if its old target read returns after release", async () => {
  const f = fixture(), pending = deferred<ConversationResult<void>>(); let reading = false;
  f.readers.verifyTarget = async (_context, conversation) => { if (conversation !== existing) return good(undefined); reading = true; return pending.promise; };
  const preparing = f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }); await until(() => reading);
  const acquisition = await f.app.acquireTargetLease(owner, existing, "closed"); assert.equal(acquisition.kind, "acquired");
  if (acquisition.kind !== "acquired") return;
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }), bad("AI_OPERATION_CONFLICT"));
  // Revoking the pending target frees its one-owner reservation, so an unrelated
  // target can still prepare while this target remains held.
  assert.equal((await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: id(8) })).kind, "success");
  acquisition.lease.release(); pending.resolve(good(undefined));
  assert.deepEqual(await preparing, bad("AI_OPERATION_CONFLICT")); assert.equal(f.counts().creates, 0);
});
test("idle target lease blocks publication after an awaited target read and does not revoke other targets", async () => {
  const f = fixture(), pending = deferred<ConversationResult<void>>(); let reading = false;
  f.readers.verifyTarget = async () => { reading = true; return pending.promise; };
  const preparing = f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }); await until(() => reading);
  const acquired = await f.app.acquireTargetLease(owner, existing, "idle"); assert.equal(acquired.kind, "acquired"); if (acquired.kind !== "acquired") return;
  pending.resolve(good(undefined)); assert.deepEqual(await preparing, bad("AI_OPERATION_CONFLICT"));
  assert.equal(f.counts().cancels, 0); acquired.lease.release();
  assert.equal((await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing })).kind, "success");
});
test("idle lease blocks a prepared execute without consuming it; closed lease irreversibly cancels it", async () => {
  for (const mode of ["idle", "closed"] as const) {
    const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }));
    const acquired = await f.app.acquireTargetLease(owner, existing, mode); assert.equal(acquired.kind, "acquired"); if (acquired.kind !== "acquired") continue;
    assert.deepEqual(await f.execute(ticket), mode === "idle" ? bad("AI_OPERATION_CONFLICT") : { kind: "failure", code: "AI_OPERATION_UNAVAILABLE" });
    assert.equal(f.counts().creates, 0); assert.equal(f.counts().cancels, 0); acquired.lease.release();
    assert.equal((await f.execute(ticket)).kind, mode === "idle" ? "success" : "failure");
  }
});
test("closed lease synchronously disposes active target then waits matching close AND dispatch bookkeeping", async () => {
  const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing })),
    result = deferred<ConversationResult<ExecutedConversation>>(), closed = deferred<AsyncCloseObservation>();
  let late: ExecutedConversation | undefined; let dispatchDelivery: ConversationExecutionDelivery | undefined;
  f.setExecute((input, delivery) => { late = f.makePair(input); dispatchDelivery = delivery; return result.promise; }); f.setClose(() => closed.promise);
  const execution = f.execute(ticket); await until(() => f.inputs.length === 1);
  let acquired = false; const acquiring = f.app.acquireTargetLease(owner, existing, "closed").then(v => { acquired = true; return v; });
  assert.equal(f.inputs[0]!.text(), undefined); assert.equal(f.counts().disposals, 1); assert.equal(f.counts().cancels, 1);
  assert.equal(dispatchDelivery!.acceptCompleteBody!(late!), false);
  closed.resolve({ kind: "closed", operationId: ticket.operationId, conversationId: existing }); await Promise.resolve(); assert.equal(acquired, false);
  result.resolve(good(late!)); assert.deepEqual(await execution, { kind: "terminated" });
  const lease = await acquiring; assert.equal(lease.kind, "acquired"); if (lease.kind === "acquired") lease.lease.release();
  assert.equal(f.accepted.length, 0); assert.equal(f.counts().cancels, 1);
});
test("idle lease drains a live command without cancellation and keeps new admissions closed through work", async () => {
  const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing })),
    ready = deferred<void>();
  f.setExecute(async (input, delivery) => { await ready.promise; const body = f.makePair(input); assert.equal(delivery.acceptCompleteBody?.(body), true); return good(body); });
  const execution = f.execute(ticket); await until(() => f.inputs.length === 1);
  let acquired = false; const acquiring = f.app.acquireTargetLease(owner, existing, "idle").then(v => { acquired = true; return v; });
  assert.equal(f.inputs[0]!.text(), f.savedUser.text); assert.equal(f.counts().disposals, 0); assert.equal(f.counts().cancels, 0);
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }), bad("AI_OPERATION_CONFLICT"));
  assert.equal(acquired, false); ready.resolve(); assert.equal((await execution).kind, "success");
  const held = await acquiring; assert.equal(held.kind, "acquired"); if (held.kind !== "acquired") return;
  assert.equal(held.lease.current(), true); assert.equal(f.accepted.length, 1);
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }), bad("AI_OPERATION_CONFLICT"));
  held.lease.release(); assert.equal(held.lease.current(), false);
  assert.equal((await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing })).kind, "success");
});
test("target lease is owner-scoped and a second owner can prepare and execute the same opaque conversation ID", async () => {
  const f = fixture(), held = await f.app.acquireTargetLease(owner, existing, "closed"); assert.equal(held.kind, "acquired"); if (held.kind !== "acquired") return;
  const other = f.call("b".repeat(64), "second-owner"), ticket = value(await f.app.prepare(other, { kind: "send", purpose: "checkin_conversation", conversationId: existing }));
  assert.equal((await f.execute(ticket, f.delivery(), other)).kind, "success"); assert.equal(f.inputs[0]!.identity.ownerId, id(9));
  assert.equal(held.lease.current(), true); held.lease.release();
});
test("unresolved close yields no usable lease, keeps admission held, and recovers only on an explicit acquisition", async () => {
  const f = fixture(), ticket = value(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing })),
    result = deferred<ConversationResult<ExecutedConversation>>();
  f.setExecute(() => result.promise); f.setClose(async () => ({ kind: "unresolved" }));
  const execution = f.execute(ticket); await until(() => f.inputs.length === 1); const acquisition = f.app.acquireTargetLease(owner, existing, "closed");
  result.resolve(bad("AI_OUTCOME_UNRESOLVED")); await execution; assert.deepEqual(await acquisition, { kind: "unresolved" });
  assert.equal(f.counts().cancels, 1);
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }), bad("AI_OPERATION_CONFLICT"));
  assert.equal(f.counts().cancels, 1); f.setClose(async input => ({ kind: "closed", operationId: input.operation.operationId, conversationId: existing }));
  const recovered = await f.app.acquireTargetLease(owner, existing, "closed"); assert.equal(recovered.kind, "acquired"); if (recovered.kind !== "acquired") return;
  assert.equal(f.counts().cancels, 2); recovered.lease.release();
  assert.equal((await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing })).kind, "success");
});
test("concurrent/invalid acquisition has no lease and idempotent old release cannot clear a newer target hold", async () => {
  const f = fixture(), first = f.app.acquireTargetLease(owner, existing, "idle");
  assert.deepEqual(await f.app.acquireTargetLease(owner, existing, "closed"), { kind: "unresolved" });
  const original = await first; assert.equal(original.kind, "acquired"); if (original.kind !== "acquired") return;
  assert.deepEqual(await f.app.acquireTargetLease("bad-owner", existing, "closed"), { kind: "unresolved" });
  original.lease.release(); const fresh = await f.app.acquireTargetLease(owner, existing, "closed"); assert.equal(fresh.kind, "acquired"); if (fresh.kind !== "acquired") return;
  original.lease.release(); assert.equal(fresh.lease.current(), true);
  assert.deepEqual(await f.app.prepare(f.original, { kind: "send", purpose: "checkin_conversation", conversationId: existing }), bad("AI_OPERATION_CONFLICT"));
  fresh.lease.release(); fresh.lease.release(); assert.equal(fresh.lease.current(), false);
});

test("F1a prepared choices are operation-bound and omission/foreign/incomplete keys preserve the prepared ticket",async()=>{
  const f=fixture();f.readers.prepareSelection=async()=>good({purposeRevocationGeneration:3,historyPairs:[],sources:[{kind:"check_in",checkInId:"private-source-id",version:"metadata-v1",sourceOccurredAt:"2026-10-14T09:00:00.000Z",observedAt:"2026-10-14T10:00:00.000Z"}]});
  const ticket=value(await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",contextSelection:{processing:"local",sources:[{kind:"check_in",checkInId:"private-source-id"}]}}));
  const c=ticket.contextSelection!;assert.equal(c.sourceCards.length,1);assert(!JSON.stringify(c).includes("private-source-id"));
  const body={operationId:ticket.operationId,operationKey:ticket.operationKey,text:"keep this draft"};
  for(const choice of [undefined,{selectionRevision:c.selectionRevision,includedKeys:["wrong"],excludedKeys:[]},{selectionRevision:c.selectionRevision,includedKeys:[],excludedKeys:[]}]){
    assert.deepEqual(await f.app.execute(f.original,{...body,...(choice?{contextSelection:choice}:{})},f.delivery()),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});assert.equal(f.counts().creates,0);
  }
  const key=c.sourceCards[0]!.selectionKey;
  assert.equal((await f.app.execute(f.original,{...body,contextSelection:{selectionRevision:c.selectionRevision,includedKeys:[key],excludedKeys:[key]}},f.delivery())).kind,"success");
  assert.deepEqual(f.inputs[0]?.selectedReply?.includedKeys,[key]);assert.deepEqual(f.inputs[0]?.selectedReply?.excludedKeys,[key]);
});
test("F1a selection cannot be inserted into an old unselected prepare, or adopted from another operation",async()=>{
  const f=fixture(),ticket=await f.prepare();
  assert.deepEqual(await f.app.execute(f.original,{operationId:ticket.operationId,operationKey:ticket.operationKey,text:"draft",contextSelection:{selectionRevision:id(800),includedKeys:[],excludedKeys:[]}},f.delivery()),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
  assert.equal(f.counts().creates,0);assert.equal((await f.execute(ticket)).kind,"success");
});
test("reply association is allowed only for an existing topic and does not consume a rejected new-topic ticket",async()=>{
  const f=fixture(),ticket=await f.prepare();
  assert.deepEqual(await f.app.execute(f.original,{operationId:ticket.operationId,operationKey:ticket.operationKey,text:"draft",replyToMessageId:id(800)},f.delivery()),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});assert.equal(f.counts().creates,0);assert.equal((await f.execute(ticket)).kind,"success");
});

test("history exclusions use only fresh prepared keys and preserve draft plus source choice through explicit Send",async()=>{
  const f=fixture();f.readers.prepareSelection=async()=>good({purposeRevocationGeneration:3,sources:[],historyPairs:[{userMessageId:id(800),assistantMessageId:id(801),userSequence:1,assistantSequence:2}]});
  const ticket=value(await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",conversationId:existing,contextSelection:{processing:"local",sources:[]}})),s=ticket.contextSelection!,key=s.historyPairs[0]!.historyKey;
  const body={operationId:ticket.operationId,operationKey:ticket.operationKey,text:"draft stays exactly"},selection={selectionRevision:s.selectionRevision,includedKeys:[],excludedKeys:[]};
  for(const keys of [[id(999)],[key,key]])assert.deepEqual(await f.app.execute(f.original,{...body,contextSelection:{...selection,excludedHistoryKeys:keys}},f.delivery()),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
  assert.equal(f.counts().creates,0);assert.equal((await f.app.execute(f.original,{...body,contextSelection:{...selection,excludedHistoryKeys:[key]}},f.delivery())).kind,"success");assert.deepEqual(f.inputs[0]?.selectedReply?.excludedHistoryKeys,[key]);assert.equal(f.accepted[0]?.userMessage.text,"draft stays exactly");
});

test("reprepare issues new history keys; old exclusions cannot transfer even with the same owner/topic",async()=>{
  const f=fixture();f.readers.prepareSelection=async()=>good({purposeRevocationGeneration:3,sources:[],historyPairs:[{userMessageId:id(820),assistantMessageId:id(821),userSequence:1,assistantSequence:2}]});
  const prepare=async()=>value(await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",conversationId:existing,contextSelection:{processing:"local",sources:[]}}));
  const old=await prepare(),oldKey=old.contextSelection!.historyPairs[0]!.historyKey;value(await f.app.cancel(f.original,{operationId:old.operationId,operationKey:old.operationKey}));
  const fresh=await prepare(),s=fresh.contextSelection!,newKey=s.historyPairs[0]!.historyKey;assert.notEqual(s.selectionRevision,old.contextSelection!.selectionRevision);assert.notEqual(newKey,oldKey);
  const body={operationId:fresh.operationId,operationKey:fresh.operationKey,text:"unchanged draft"},choice={selectionRevision:s.selectionRevision,includedKeys:[],excludedKeys:[]};
  assert.deepEqual(await f.app.execute(f.original,{...body,contextSelection:{...choice,excludedHistoryKeys:[oldKey]}},f.delivery()),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
  assert.equal((await f.app.execute(f.original,{...body,contextSelection:{...choice,excludedHistoryKeys:[newKey]}},f.delivery())).kind,"success");assert.equal(f.accepted[0]?.userMessage.text,"unchanged draft");
});

test("automatic today prepares owned ID metadata and passes the same bounded day grant on one Send",async()=>{
  const f=fixture(),today={date:"2026-10-14",timeZone:"Asia/Singapore",limit:5 as const,hasMore:false};
  f.readers.prepareSelection=async(_context,input)=>{
    assert.deepEqual(input,{processing:"local",today:{timeZone:"Asia/Singapore"}});
    return good({purposeRevocationGeneration:3,today,historyPairs:[],sources:[{kind:"check_in",checkInId:"owned-today-id",version:"metadata-v1",sourceOccurredAt:"2026-10-14T09:00:00.000Z",observedAt:"2026-10-14T10:00:00.000Z"}]});
  };
  const ticket=value(await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",contextSelection:{processing:"local",today:{timeZone:"Asia/Singapore"}}}));
  const selected=ticket.contextSelection!;assert.deepEqual(selected.today,today);assert.equal(selected.sourceCards[0]?.checkInId,"owned-today-id");
  const key=selected.sourceCards[0]!.selectionKey;
  const result=await f.app.execute(f.original,{operationId:ticket.operationId,operationKey:ticket.operationKey,text:"exact draft",contextSelection:{selectionRevision:selected.selectionRevision,includedKeys:[key],excludedKeys:[key]}},f.delivery());
  assert.equal(result.kind,"success");assert.deepEqual(f.inputs[0]?.selectedReply?.today,today);assert.deepEqual(f.inputs[0]?.selectedReply?.excludedKeys,[key]);assert.equal(f.counts().creates,1);
});

test("automatic empty day admits ordinary chat while metadata errors cannot become an empty grant",async()=>{
  for(const malformed of [false,true]){
    const f=fixture();f.readers.prepareSelection=async()=>good({purposeRevocationGeneration:0,sources:[],historyPairs:[],today:{date:"2026-10-14",timeZone:"Asia/Singapore",limit:5,hasMore:malformed}});
    const result=await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",contextSelection:{processing:"local",today:{timeZone:"Asia/Singapore"}}});
    if(malformed){assert.deepEqual(result,{kind:"failure",code:"AI_UNAVAILABLE"});assert.equal(f.counts().creates,0);continue;}
    const ticket=value(result),selection=ticket.contextSelection!;
    assert.equal((await f.app.execute(f.original,{operationId:ticket.operationId,operationKey:ticket.operationKey,text:"normal chat",contextSelection:{selectionRevision:selection.selectionRevision,includedKeys:[],excludedKeys:[]}},f.delivery())).kind,"success");
  }
});

test("automatic day rollover before execute preserves text and rejects before executor effects",async()=>{
  const f=fixture();f.clock.instant=6*3600000-1000;
  f.readers.prepareSelection=async()=>good({purposeRevocationGeneration:0,sources:[],historyPairs:[],today:{date:"2026-10-14",timeZone:"Asia/Singapore",limit:5,hasMore:false}});
  const ticket=value(await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",contextSelection:{processing:"local",today:{timeZone:"Asia/Singapore"}}})),selection=ticket.contextSelection!;
  f.clock.advance(1000);
  assert.deepEqual(await f.app.execute(f.original,{operationId:ticket.operationId,operationKey:ticket.operationKey,text:"draft still here",contextSelection:{selectionRevision:selection.selectionRevision,includedKeys:[],excludedKeys:[]}},f.delivery()),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
  assert.equal(f.counts().creates,0);assert.equal(f.accepted.length,0);
});

test("a manual source prepare cannot receive automatic metadata or a fabricated automatic day",async()=>{
  const samples:SelectedReplySnapshot[]=[{purposeRevocationGeneration:0,sources:[],historyPairs:[],today:{date:"2026-10-14",timeZone:"Asia/Singapore",limit:5,hasMore:false}},
    {purposeRevocationGeneration:0,sources:[],historyPairs:[]}];
  for(const [i,snapshot]of samples.entries()){
    const f=fixture();f.readers.prepareSelection=async()=>good(snapshot);
    const result=await f.app.prepare(f.original,{kind:"send",purpose:"checkin_conversation",contextSelection:i===0?{processing:"local",sources:[]}:{processing:"local",today:{timeZone:"Asia/Singapore"}}});
    assert.deepEqual(result,{kind:"failure",code:"AI_UNAVAILABLE"});
  }
});
