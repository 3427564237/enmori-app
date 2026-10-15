import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import type { ConversationGates } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import type { ControlledOllamaBinding } from "../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
import { boundedConversationSemanticCandidate } from "../src/ai-conversation/application/bounded-conversation-semantic-policy.js";
import { deferred, FakeClock } from "./ai-runtime/support.js";
import { boundedConversationSemanticCorpus } from "./support/bounded-conversation-semantic-corpus.js";
import { startControlledChatPacket, type ControlledChatPacketOptions } from "./zhou-controlled-chat-packet.js";

const binding: ControlledOllamaBinding = { endpoint: "http://127.0.0.1:11434", reference: "synthetic-qwen:9b",
  manifestDigest: "1".repeat(64), tokenizerDigest: "2".repeat(64), ollamaVersion: "0.0.0-test", mode: "formal-9b", current: () => true };
// Test-only semantic decisions. No real semantic, tokenizer or host claim.
const allowed: ConversationGates = { beforeGeneration: async () => ({ ok: true, value: undefined }),
  candidate: async () => ({ ok: true, value: undefined }) };
const assistant = JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "你提到：今天读书了。" });
const done = (response = assistant, tokens = 12) => Response.json({ model: binding.reference, done: true, response,
  prompt_eval_count: tokens, eval_count: 16 });
const loaded = { name: binding.reference, model: binding.reference, digest: binding.manifestDigest,
  details: { family: "qwen35", parameter_size: "9B" }, context_length: 8192 };
async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 100; i++) { if (check()) return; await setImmediate(); }
  throw new Error("SYNTHETIC_PACKET_CHECKPOINT_UNAVAILABLE");
}
function fixture(change: { tokens?: number; reply?: (init: RequestInit | undefined) => Promise<Response>;
  gates?: ConversationGates; missingGates?: boolean; requests?: ControlledChatPacketOptions["requests"];
  checkpoint?: ControlledChatPacketOptions["checkpoint"] } = {}) {
  const clock = new FakeClock();
  let generates = 0, fullRaw: string | undefined, dispatchedBody: string | undefined;
  const http: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/generate") {
      generates++; dispatchedBody = init?.body as string;
      return change.reply ? change.reply(init) : done(assistant, change.tokens ?? 12);
    }
    return Response.json(path === "/api/version" ? { version: binding.ollamaVersion } : { models: [loaded] });
  };
  const packet = startControlledChatPacket({ binding, clock, http,
    counter: { manifestDigest: binding.manifestDigest, tokenizerDigest: binding.tokenizerDigest,
      current: () => true, count: async raw => { fullRaw = raw; return change.tokens ?? 12; } },
    ...(change.missingGates ? {} : { gates: change.gates ?? allowed }),
    ...(change.requests ? { requests: change.requests } : {}),
    ...(change.checkpoint ? { checkpoint: change.checkpoint } : {}),
  });
  return { packet, clock, generates: () => generates, fullRaw: () => fullRaw, body: () => dispatchedBody };
}

test("controlled chat packet joins the actual compiler/adapter/wrapper/executor and reports no content or host identity", async () => {
  const f = fixture(), report = await f.packet.outcome;
  assert.equal(report.results[0]!.result, "success"); assert.equal(f.generates(), 1);
  assert.equal(report.results[0]!.usersCommitted, 1); assert.equal(report.results[0]!.assistantsCommitted, 1);
  assert.equal(report.results[0]!.bodiesAccepted, 1); assert.equal(report.results[0]!.syntheticRetentionAnchor, "assistant");
  assert.equal(report.results[0]!.inputAvailableBeforeGeneration, true); assert.equal(report.results[0]!.candidateAvailableBeforeCheck, true);
  assert.equal(report.results[0]!.borrowedGettersRevoked, true); assert.equal(report.results[0]!.originalCapabilityRevoked, true);
  assert.equal(report.localContentHoldersCleared, true); assert.equal(report.modelState, "stopped");
  const payload = JSON.parse(f.body()!) as { prompt: string; raw: boolean; stream: boolean; options: unknown };
  assert.equal(payload.prompt, f.fullRaw()); assert.equal(payload.raw, true); assert.equal(payload.stream, false);
  assert.deepEqual(payload.options, { num_ctx: 8192, num_predict: 512 });
  assert.match(payload.prompt, /<\|im_start\|>system/); assert.match(payload.prompt, /"checkIns":\[\]/);
  const serialized = JSON.stringify(report);
  for (const forbidden of [binding.reference, binding.manifestDigest, binding.tokenizerDigest,
    binding.endpoint, "今天读书", "synthetic-qwen", "operationId", "currentMessage", "schemaVersion"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(report.scope, "synthetic-auth-empty-note-memory-store-complete-body-sink");
});

test("missing candidate policy fails before persistence or model and does not silently select an accepting gate", async () => {
  const f = fixture({ missingGates: true }), report = await f.packet.outcome;
  assert.equal(report.semanticGate, "missing"); assert.equal(f.generates(), 0);
  assert.equal(report.results[0]!.result, "failure"); assert.equal(report.results[0]!.failure, "AI_UNAVAILABLE");
  assert.equal(report.results[0]!.usersCommitted, 0); assert.equal(report.results[0]!.assistantsCommitted, 0);
  assert.equal(report.results[0]!.syntheticRetentionAnchor, "none");
});

test("unsafe or ambiguous independent candidate decisions create no A and preserve only the accepted U anchor", async () => {
  for (const decision of ["unsafe", "ambiguous"] as const) {
    const f = fixture({ gates: { beforeGeneration: allowed.beforeGeneration,
      candidate: async () => ({ ok: false, failure: "unsafe_output" }) } });
    const report = await f.packet.outcome, result = report.results[0]!;
    assert.equal(result.failure, "AI_REPLY_REJECTED", decision); assert.equal(result.usersCommitted, 1);
    assert.equal(result.assistantsCommitted, 0); assert.equal(result.bodiesAccepted, 0);
    assert.equal(result.syntheticRetentionAnchor, "user"); assert.equal(result.borrowedGettersRevoked, true);
  }
});

test("4096 complete tokens dispatches once; 4097 rejects the whole prepared input without model retry", async () => {
  for (const tokens of [4096, 4097]) {
    const f = fixture({ tokens }), report = await f.packet.outcome;
    assert.deepEqual(report.completeInputTokenCounts, [tokens]); assert.equal(f.generates(), tokens === 4096 ? 1 : 0);
    assert.equal(report.results[0]!.result, tokens === 4096 ? "success" : "failure");
    assert.equal(report.results[0]!.assistantsCommitted, tokens === 4096 ? 1 : 0);
    assert.equal(report.results[0]!.usersCommitted, 1); assert.equal(report.results[0]!.borrowedGettersRevoked, true);
  }
});

test("invalid structured output is discarded before the separate semantic gate, assistant and sink", async () => {
  let candidateChecks = 0;
  const f = fixture({ reply: async () => done('{"schemaVersion":"ai_assistant_message_v1","message":"a","message":"b"}'),
    gates: { beforeGeneration: allowed.beforeGeneration, candidate: async () => { candidateChecks++; return { ok: true, value: undefined }; } } });
  const report = await f.packet.outcome;
  assert.equal(report.results[0]!.failure, "AI_REPLY_REJECTED"); assert.equal(candidateChecks, 0);
  assert.equal(report.results[0]!.assistantsCommitted, 0); assert.equal(report.results[0]!.bodiesAccepted, 0);
  assert.equal(report.results[0]!.syntheticRetentionAnchor, "user");
});

test("Cancel scrubs borrowed getters immediately; late actual-adapter done releases only the quarantined model lane", async () => {
  const pending = deferred<Response>(), f = fixture({ reply: () => pending.promise });
  await until(() => f.generates() === 1);
  assert.equal(await f.packet.cancel(), "closed"); const report = await f.packet.outcome;
  assert.equal(report.results[0]!.result, "terminated"); assert.equal(report.runtime.quarantined, true);
  assert.equal(report.results[0]!.borrowedGettersRevoked, true); assert.equal(report.results[0]!.assistantsCommitted, 0);
  assert.equal(report.results[0]!.bodiesAccepted, 0); pending.resolve(done());
  await until(() => !f.packet.state().runtime.quarantined);
  assert.equal(f.packet.state().modelState, "stopped"); assert.equal(f.generates(), 1);
});

test("disconnect forwards abort; fetch rejection is not model-stop proof and leaves the actual transport quarantined", async () => {
  const f = fixture({ reply: init => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => reject(new Error("synthetic-abort")), { once: true });
  }) });
  await until(() => f.generates() === 1); f.packet.disconnect(); const report = await f.packet.outcome;
  await until(() => f.packet.state().modelState === "termination_unconfirmed");
  assert.equal(report.results[0]!.result, "terminated"); assert.equal(f.packet.state().runtime.quarantined, true);
  assert.equal(report.results[0]!.bodiesAccepted, 0); assert.equal(report.results[0]!.syntheticRetentionAnchor, "user");
  assert.equal(report.results[0]!.borrowedGettersRevoked, true);
});

test("original 45s generation bound terminates without releasing unconfirmed generation or delivering late content", async () => {
  const pending = deferred<Response>(), f = fixture({ reply: () => pending.promise });
  await until(() => f.generates() === 1); f.clock.advance(45_000);
  const report = await f.packet.outcome;
  assert.equal(report.results[0]!.elapsedMs, 45_000); assert.equal(report.results[0]!.failure, "AI_UNAVAILABLE");
  assert.equal(report.runtime.quarantined, true); assert.equal(report.results[0]!.bodiesAccepted, 0);
  pending.resolve(done()); await until(() => !f.packet.state().runtime.quarantined);
  assert.equal(f.generates(), 1);
});

test("original 60s deadline revokes candidate input/output getters and creates no late A or failure body", async () => {
  let entered = false;
  const pending = deferred<Awaited<ReturnType<ConversationGates["candidate"]>>>();
  const f = fixture({ gates: { beforeGeneration: allowed.beforeGeneration,
    candidate: () => { entered = true; return pending.promise; } } });
  await until(() => entered); f.clock.advance(60_000); const report = await f.packet.outcome;
  assert.equal(report.results[0]!.result, "terminated"); assert.equal(report.results[0]!.elapsedMs, 60_000);
  assert.equal(report.results[0]!.borrowedGettersRevoked, true); assert.equal(report.results[0]!.assistantsCommitted, 0);
  assert.equal(report.results[0]!.bodiesAccepted, 0); assert.equal(report.runtime.quarantined, false);
  pending.resolve({ ok: true, value: undefined }); await setImmediate();
  assert.equal(f.generates(), 1); assert.equal(f.packet.state().runtime.nonTerminal, 0);
});

test("one active/two queued and original 5s queue bound leave queued requests without U while fourth rejects before acceptance", async () => {
  const pending = deferred<Response>(), f = fixture({ requests: 4, reply: () => pending.promise });
  await until(() => f.generates() === 1 && f.packet.state().runtime.queued === 2);
  f.clock.advance(5_000); await setImmediate();
  assert.equal(f.packet.state().runtime.queued, 0); await f.packet.cancel(); const report = await f.packet.outcome;
  assert.equal(report.results[3]!.failure, "AI_BUSY");
  for (const index of [1, 2, 3]) {
    assert.equal(report.results[index]!.usersCommitted, 0); assert.equal(report.results[index]!.assistantsCommitted, 0);
    assert.equal(report.results[index]!.bodiesAccepted, 0); assert.equal(report.results[index]!.syntheticRetentionAnchor, "none");
  }
  assert.equal(report.results[1]!.failure, "AI_UNAVAILABLE"); assert.equal(report.results[2]!.failure, "AI_UNAVAILABLE");
  assert.equal(f.generates(), 1); pending.resolve(done()); await until(() => !f.packet.state().runtime.quarantined);
});

// These cases preserve the corpus's exact input as well as its output. Cases
// with a different current message, Notes or Persona remain in the separate
// full policy corpus suite; the empty-Note packet cannot claim their context.
const packetCorpus = boundedConversationSemanticCorpus.filter(row => row.input.currentMessage === "今天读书了。" &&
  row.input.checkIns.length === 0 && row.input.persona === undefined);
for (const row of packetCorpus) {
  test(`actual semantic policy joins full compiled-prompt/executor for ${row.id} ${row.category}`, async () => {
    const gates: ConversationGates = {
      beforeGeneration: async (input, budget) => input() !== undefined && !budget.signal.aborted && budget.remainingMs() > 0
        ? { ok: true, value: undefined } : { ok: false, failure: "stale_authority" },
      candidate: boundedConversationSemanticCandidate,
    };
    const f = fixture({ gates, reply: async () => done(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: row.message })) });
    const report = await f.packet.outcome, result = report.results[0]!, allowedCase = row.category === "allowed";
    assert.equal(result.result, allowedCase ? "success" : "failure");
    if (!allowedCase) assert.equal(result.failure, "AI_REPLY_REJECTED");
    assert.equal(result.usersCommitted, 1); assert.equal(result.assistantsCommitted, allowedCase ? 1 : 0);
    assert.equal(result.bodiesAccepted, allowedCase ? 1 : 0);
    assert.equal(result.syntheticRetentionAnchor, allowedCase ? "assistant" : "user");
    assert.equal(result.borrowedGettersRevoked, true); assert.equal(result.originalCapabilityRevoked, true);
    assert.equal(report.modelDispatches, 1); assert.equal(report.modelState, "stopped");
  });
}
