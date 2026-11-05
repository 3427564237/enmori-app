import assert from "node:assert/strict";
import test from "node:test";
import type { AsyncConversationStore } from "../../src/ai-conversation/ports/async-conversation.js";
import type { ContextReadResult, ConversationHistory, CurrentContextAuthority } from "../../src/ai-conversation/ports/real-context-reader.js";
import { deferred, fixture, until } from "./async-conversation-fakes.js";
import { valid } from "../ai-runtime/support.js";

const history = (): ContextReadResult<ConversationHistory> => ({ kind: "read", value: { pairs: [], sources: [] } });
function prepared() {
  const f = fixture("open_conversation_v1");
  (f.store as AsyncConversationStore).readHistory = async () => history();
  const current = (): ContextReadResult<CurrentContextAuthority> => ({ kind: "read", value: {
    authority: { ...f.reads.authority }, usedPersona: "not-used", sources: [],
  } });
  return { ...f, current };
}
async function drain() { for (let i = 0; i < 250; i++) await Promise.resolve(); }

test("each checkpoint overlaps independent context/history latency without removing any checkpoint", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = prepared(); let contextChecks = 0, historyChecks = 0, elapsed = 0;
  const latency = () => new Promise<void>(resolve => setTimeout(resolve, 100));
  f.reads.currentHook = async () => { contextChecks++; await latency(); return f.current(); };
  (f.store as AsyncConversationStore).readHistory = async (_context, expected) => {
    if (expected !== undefined) { historyChecks++; await latency(); }
    return history();
  };
  const admission = await f.app.dispatch(f.create()); assert.equal(admission.accepted, true);
  if (!admission.accepted) return;
  let done = false; void admission.request.outcome.then(() => { done = true; });
  await drain();
  for (let i = 0; i < 40 && !done; i++) {
    t.mock.timers.tick(100); elapsed += 100; await drain();
    if (f.calls[0]) { f.calls[0].completion.resolve(valid()); await drain(); }
  }
  assert.equal(done, true); assert.deepEqual(await admission.request.outcome, { ok: true, value: undefined });
  assert.equal(contextChecks, historyChecks); assert.ok(contextChecks >= 8);
  assert.equal(f.auth.calls.filter(call => call === "fresh").length, contextChecks);
  t.diagnostic(`Controlled 100ms per read: ${contextChecks} checkpoints, ${elapsed}ms total waiting; serial equivalent ${contextChecks * 200}ms.`);
  assert.equal(elapsed, contextChecks * 100);
  assert.equal(f.delivered.length, 1);
});

test("a checkpoint starts no effect until both independent reads settle", async () => {
  const f = prepared(), context = deferred<ContextReadResult<CurrentContextAuthority>>(), past = deferred<ContextReadResult<ConversationHistory>>();
  let historyStarted = false;
  f.reads.currentHook = () => context.promise;
  (f.store as AsyncConversationStore).readHistory = async (_context, expected) => {
    if (expected === undefined) return history(); historyStarted = true; return past.promise;
  };
  const admission = await f.app.dispatch(f.create()); if (!admission.accepted) throw Error("admission");
  await until(() => f.reads.currentDependencies.length === 1); await drain();
  assert.equal(historyStarted, true); assert.equal(f.store.calls.includes("open"), false);
  context.resolve(f.current()); await drain();
  assert.equal(f.store.calls.includes("open"), false); assert.equal(f.calls.length, 0);
  past.resolve(history()); await until(() => f.calls.length === 1);
  f.calls[0]!.completion.resolve(valid()); assert.equal((await admission.request.outcome).ok, true);
});

test("cancel while context/history are pending prevents writes and ignores late reads", async () => {
  const f = prepared(), context = deferred<ContextReadResult<CurrentContextAuthority>>(), past = deferred<ContextReadResult<ConversationHistory>>();
  f.reads.currentHook = () => context.promise;
  (f.store as AsyncConversationStore).readHistory = async (_context, expected) => expected === undefined ? history() : past.promise;
  const command = f.create(), admission = await f.app.dispatch(command); if (!admission.accepted) throw Error("admission");
  await until(() => f.reads.currentDependencies.length === 1);
  await f.app.cancel(command, f.who); context.resolve(f.current()); past.resolve(history()); await drain();
  assert.equal((await admission.request.outcome).ok, false);
  assert.equal(f.store.rows.size, 0); assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
});

test("context denial retains precedence over a rejected parallel history read", async () => {
  const f = prepared();
  f.reads.currentHook = async () => ({ kind: "denied" });
  (f.store as AsyncConversationStore).readHistory = async (_context, expected) => {
    if (expected === undefined) return history(); throw Error("private history error");
  };
  const admission = await f.app.dispatch(f.create()); if (!admission.accepted) throw Error("admission");
  assert.deepEqual(await admission.request.outcome, { ok: false, failure: "stale_authority" });
  assert.equal(f.store.rows.size, 0); assert.equal(f.calls.length, 0);
});

test("context denial terminates promptly while a parallel history supplier is still pending", async () => {
  const f = prepared(), context = deferred<ContextReadResult<CurrentContextAuthority>>(), past = deferred<ContextReadResult<ConversationHistory>>();
  let historyStarted = false;
  f.reads.currentHook = () => context.promise;
  (f.store as AsyncConversationStore).readHistory = async (_context, expected) => {
    if (expected === undefined) return history(); historyStarted = true; return past.promise;
  };
  const admission = await f.app.dispatch(f.create()); if (!admission.accepted) throw Error("admission");
  await until(() => historyStarted); context.resolve({ kind: "denied" });
  let result: Awaited<typeof admission.request.outcome> | undefined;
  void admission.request.outcome.then(value => { result = value; }); await drain();
  assert.deepEqual(result, { ok: false, failure: "stale_authority" });
  past.reject(Error("private late supplier error")); await drain();
  assert.equal(f.store.rows.size, 0); assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
});

test("changed history or rejected context still blocks generation and writes", async () => {
  for (const failure of ["history", "context"] as const) {
    const f = prepared();
    if (failure === "context") f.reads.currentHook = async () => { throw Error("private context error"); };
    (f.store as AsyncConversationStore).readHistory = async (_context, expected) =>
      expected !== undefined && failure === "history" ? { kind: "read", value: { pairs: [], sources: [], messageSources: [] } } : history();
    const admission = await f.app.dispatch(f.create()); if (!admission.accepted) throw Error("admission");
    assert.equal((await admission.request.outcome).ok, false);
    assert.equal(f.store.rows.size, 0); assert.equal(f.calls.length, 0); assert.equal(f.delivered.length, 0);
  }
});
