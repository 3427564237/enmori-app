import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { BoundedAiRuntime, type RuntimeWork } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import { ControlledOllamaTransport, type ControlledOllamaBinding } from "../../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
import { ControlledConversationPrompt, type MatchingPromptCounter } from "../../src/ai-runtime/infrastructure/controlled-conversation-prompt.js";
import type { ConversationInput } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import { accepted, deferred, FakeClock } from "./support.js";

// Actual runtime/compiler/HTTP adapter; ONLY HTTP, tokenizer and clock are fakes.
// Candidate acceptance is never supplied: no semantic/product/model proof.
const input: ConversationInput = { currentMessage: "Synthetic boundary", checkIns: [], persona: undefined };
const binding: ControlledOllamaBinding = { endpoint: "http://127.0.0.1:11434", reference: "synthetic:9b",
  manifestDigest: "a".repeat(64), tokenizerDigest: "b".repeat(64), ollamaVersion: "0.0.0-test", mode: "formal-9b", current: () => true };
const model = { name: binding.reference, digest: binding.manifestDigest, details: { family: "qwen35", parameter_size: "9B" }, context_length: 8192 };
const tick = async () => { for (let i = 0; i < 4; i++) await setImmediate(); };
function fixture(options: { abortRejects?: boolean; count?: MatchingPromptCounter["count"] } = {}) {
  const clock = new FakeClock(), post = deferred<Response>();
  let postCount = 0, signal: AbortSignal | null | undefined, candidates = 0;
  const counter: MatchingPromptCounter = { manifestDigest: binding.manifestDigest, tokenizerDigest: binding.tokenizerDigest,
    current: () => true, count: options.count ?? (async () => 193) };
  const http: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/version") return Response.json({ version: binding.ollamaVersion });
    if (path !== "/api/generate") return Response.json({ models: [model] });
    postCount++; signal = init?.signal;
    if (options.abortRejects) signal?.addEventListener("abort", () => post.reject(new Error("synthetic disconnect")), { once: true });
    return post.promise;
  };
  const adapter = new ControlledOllamaTransport(binding, new ControlledConversationPrompt(counter), http);
  const runtime = new BoundedAiRuntime(clock, adapter);
  const work: RuntimeWork<ConversationInput> = { purpose: "ai_assistant_message_v1", prepare: async () => input,
    checkCandidate: async () => { candidates++; return { ok: false, failure: "unsafe_output" }; } };
  const done = () => post.resolve(Response.json({ model: binding.reference, done: true,
    response: JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Synthetic only." }), prompt_eval_count: 193, eval_count: 8 }));
  return { clock, runtime, adapter, work, done, postCount: () => postCount, candidates: () => candidates, signal: () => signal };
}

test("joined runtime limits one active/two queued and original five-second queue while adapter is in flight", async () => {
  const f = fixture(), a = accepted(f.runtime.submit("a", f.work)); await tick();
  assert.equal(f.postCount(), 1);
  assert.deepEqual(f.runtime.submit("a", f.work), { accepted: false, failure: "overload" });
  const b = accepted(f.runtime.submit("b", f.work)), c = accepted(f.runtime.submit("c", f.work));
  assert.deepEqual(f.runtime.submit("d", f.work), { accepted: false, failure: "overload" });
  f.clock.advance(4999); assert.equal(f.runtime.state.queued, 2);
  f.clock.advance(1);
  assert.deepEqual(await b.outcome, { ok: false, failure: "queue_expired" });
  assert.deepEqual(await c.outcome, { ok: false, failure: "queue_expired" });
  assert.equal(f.postCount(), 1); a.cancel("cancelled"); f.done(); await tick();
});

test("actual adapter socket-abort uncertainty quarantines runtime without late candidate or a second generation", async () => {
  const f = fixture({ abortRejects: true }), a = accepted(f.runtime.submit("a", f.work)); await tick();
  a.cancel("abandoned"); assert.deepEqual(await a.outcome, { ok: false, failure: "abandoned" }); await tick();
  assert.equal(f.signal()?.aborted, true); assert.equal(f.adapter.state, "termination_unconfirmed");
  assert.deepEqual(f.runtime.state, { admission: "open", quarantined: true, queued: 0, nonTerminal: 0 });
  assert.deepEqual(f.runtime.submit("b", f.work), { accepted: false, failure: "dependency_unavailable" });
  assert.equal(f.postCount(), 1); assert.equal(f.candidates(), 0); f.runtime.shutdown();
});

test("late actual done after terminal releases only the host lane and never validates original content", async () => {
  const f = fixture(), a = accepted(f.runtime.submit("a", f.work)); await tick();
  a.cancel("cancelled"); assert.deepEqual(await a.outcome, { ok: false, failure: "cancelled" });
  assert.equal(f.runtime.state.quarantined, true); f.done(); await tick();
  assert.equal(f.adapter.state, "stopped"); assert.equal(f.runtime.state.quarantined, false);
  assert.equal(f.candidates(), 0); assert.equal(f.runtime.state.nonTerminal, 0);
});

test("original 45-second generation sub-budget is terminal while unconfirmed adapter invocation remains quarantined", async () => {
  const f = fixture({ abortRejects: true }), a = accepted(f.runtime.submit("a", f.work)); await tick();
  f.clock.advance(44999); assert.equal(f.runtime.state.nonTerminal, 1);
  f.clock.advance(1); assert.deepEqual(await a.outcome, { ok: false, failure: "generation_timed_out" }); await tick();
  assert.equal(f.adapter.state, "termination_unconfirmed"); assert.equal(f.runtime.state.quarantined, true);
  assert.equal(f.candidates(), 0); f.runtime.shutdown();
});

test("20 seconds of preparation leaves only original 40 seconds for generation, never 65 total", async () => {
  const f = fixture({ abortRejects: true }), prepared = deferred<ConversationInput>();
  const a = accepted(f.runtime.submit("a", { ...f.work, prepare: () => prepared.promise }));
  f.clock.advance(20000); prepared.resolve(input); await tick(); assert.equal(f.postCount(), 1);
  assert.equal(a.deadline - a.acceptedAt, 60000); f.clock.advance(39999); assert.equal(f.runtime.state.nonTerminal, 1);
  f.clock.advance(1); assert.deepEqual(await a.outcome, { ok: false, failure: "timed_out" }); await tick();
  assert.equal(f.runtime.state.quarantined, true); f.runtime.shutdown();
});

test("full-input 4097 is rejected by real compiler before any generate POST", async () => {
  const f = fixture({ count: async () => 4097 }), a = accepted(f.runtime.submit("a", f.work));
  assert.deepEqual(await a.outcome, { ok: false, failure: "dependency_unavailable" });
  assert.equal(f.postCount(), 0); assert.equal(f.runtime.state.quarantined, false); assert.equal(f.candidates(), 0);
});

test("late counter completion after abandonment cannot issue a POST or produce a candidate", async () => {
  const count = deferred<number>(); let entered = false;
  const f = fixture({ count: () => { entered = true; return count.promise; } }), a = accepted(f.runtime.submit("a", f.work));
  await tick(); assert.equal(entered, true); a.cancel("abandoned");
  assert.deepEqual(await a.outcome, { ok: false, failure: "abandoned" });
  count.resolve(193); await tick(); assert.equal(f.postCount(), 0); assert.equal(f.candidates(), 0);
  assert.equal(f.runtime.state.quarantined, false);
});

test("structurally valid real-adapter response cannot pass a missing semantic policy", async () => {
  const f = fixture(), a = accepted(f.runtime.submit("a", f.work)); await tick(); f.done();
  assert.deepEqual(await a.outcome, { ok: false, failure: "unsafe_output" });
  assert.equal(f.candidates(), 1); assert.equal(f.adapter.state, "stopped"); assert.equal(f.runtime.state.quarantined, false);
});

test("60-second deadline during candidate assessment cannot be restarted by a late allowed decision", async () => {
  const f = fixture(), decision = deferred<{ readonly ok: true; readonly value: undefined }>(); let entered = false;
  const a = accepted(f.runtime.submit("a", { ...f.work, checkCandidate: () => { entered = true; return decision.promise; } }));
  await tick(); f.done(); await tick(); assert.equal(entered, true);
  f.clock.advance(60000); assert.deepEqual(await a.outcome, { ok: false, failure: "timed_out" });
  decision.resolve({ ok: true, value: undefined }); await tick(); assert.equal(f.runtime.state.nonTerminal, 0);
});
