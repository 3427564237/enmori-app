// Operator-only existing-host probes. No ordinary application wiring, writes,
// model installation, fallback or raw output logging. The semantic-once mode
// uses the LI-approved finite gate; its Auth/store/sink remain synthetic.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { ControlledTokenizerProcess } from '../backend/dist/src/ai-runtime/infrastructure/controlled-tokenizer-process.js';
import { ControlledConversationPrompt } from '../backend/dist/src/ai-runtime/infrastructure/controlled-conversation-prompt.js';
import { ControlledOllamaTransport } from '../backend/dist/src/ai-runtime/infrastructure/controlled-ollama-transport.js';
import { BoundedAiRuntime } from '../backend/dist/src/ai-runtime/application/bounded-ai-runtime.js';
import { MonotonicRuntimeClock } from '../backend/dist/src/ai-runtime/infrastructure/monotonic-runtime-clock.js';
import { boundedConversationSemanticCandidate, boundedConversationSemanticPolicyVersion } from '../backend/dist/src/ai-conversation/application/bounded-conversation-semantic-policy.js';
import { startControlledChatPacket } from '../backend/dist/test/zhou-controlled-chat-packet.js';

/** One joined Application/compiler/model attempt. No retry, response repair,
 * canned success or policy weakening. Failed/unknown output remains rejected. */
export async function runSemanticProbe(binding, counter, http = fetch) {
  assert.equal(binding.mode, 'formal-9b');
  const packet = startControlledChatPacket({ binding, counter, http, requests: 1, gates: {
    beforeGeneration: async (input, budget) => input() !== undefined && !budget.signal.aborted && budget.remainingMs() > 0
      ? { ok: true, value: undefined } : { ok: false, failure: 'stale_authority' },
    candidate: boundedConversationSemanticCandidate,
  } });
  const report = await packet.outcome, row = report.results[0];
  const pass = report.modelDispatches === 1 && report.modelState === 'stopped' && !report.runtime.quarantined &&
    report.runtime.nonTerminal === 0 && row.result === 'success' && row.usersCommitted === 1 && row.assistantsCommitted === 1 &&
    row.bodiesAccepted === 1 && row.borrowedGettersRevoked && row.originalCapabilityRevoked && report.localContentHoldersCleared;
  return { status: pass ? 'Pass' : 'Not Proven', policyVersion: boundedConversationSemanticPolicyVersion,
    ...report, productWrites: 0, actualDatabase: 'Not Run', semanticScope: 'finite-exact-attribution-only' };
}

async function bounded(work) {
  const abort = new AbortController(), end = performance.now() + 60000;
  const timer = setTimeout(() => abort.abort(), 60000);
  try { return await work({ signal: abort.signal, deadline: end, remainingMs: () => Math.max(0, end - performance.now()) }); }
  finally { clearTimeout(timer); abort.abort(); }
}

/** Finite search over valid <=2400-code-point current messages, no Notes.
 * Counts are observed for EACH exact full input; no BPE monotonicity assumption
 * is used as proof. If exact targets are absent, return incomplete, never round. */
export async function findCompleteInputBoundaries(counter, maxMeasurements = 192) {
  assert(Number.isInteger(maxMeasurements) && maxMeasurements > 0 && maxMeasurements <= 192);
  const hits = new Map(); let measurements = 0;
  const measure = async (repetitions, suffix = '') => {
    if (measurements >= maxMeasurements) return undefined;
    const input = { currentMessage: `Synthetic input ${'🧭'.repeat(repetitions)}${suffix}`, checkIns: [], persona: undefined };
    if ([...input.currentMessage].length > 2400) return undefined;
    let observed;
    const compiler = new ControlledConversationPrompt({ manifestDigest: counter.manifestDigest, tokenizerDigest: counter.tokenizerDigest,
      current: () => counter.current(), count: async (raw, budget) => { observed = await counter.count(raw, budget); return observed; } });
    measurements++;
    let admitted = false;
    await bounded(async budget => {
      try { const result = await compiler.compile(input, budget); admitted = true; assert.equal(result.tokens, observed); }
      catch { assert(Number.isSafeInteger(observed) && observed > 4096, 'Unexpected counter/compiler failure'); }
    });
    assert.equal(admitted, observed <= 4096);
    if (observed === 4096 || observed === 4097) hits.set(observed, { input, count: observed, admitted, codePoints: [...input.currentMessage].length });
    return observed;
  };
  let low = 0, high = 2370;
  // Search hint only; exact nearby candidate counts, not the hint, establish hits.
  while (low < high && measurements < maxMeasurements) {
    const mid = Math.floor((low + high) / 2), count = await measure(mid);
    if (count < 4096) low = mid + 1; else high = mid;
  }
  for (let n = Math.max(0, low - 4); n <= Math.min(2370, low + 4) && hits.size < 2; n++) {
    for (let suffix = 0; suffix <= 18 && hits.size < 2; suffix++) {
      await measure(n, ' a'.repeat(suffix));
      if (measurements >= maxMeasurements) break;
    }
    if (measurements >= maxMeasurements) break;
  }
  return { hits, measurements };
}

export async function runCompleteInputProbe(binding, counter, http = fetch) {
  assert.equal(binding.mode, 'formal-9b');
  let postCalls = 0;
  const noGeneration = async (url, init) => {
    if (new URL(String(url)).pathname === '/api/generate') { postCalls++; throw new Error('Generation forbidden in boundary probe'); }
    return http(url, init);
  };
  const transport = new ControlledOllamaTransport(binding, new ControlledConversationPrompt(counter), noGeneration);
  await bounded(budget => transport.preflight(budget));
  const found = await findCompleteInputBoundaries(counter);
  const summary = { status: found.hits.size === 2 ? 'Pass' : 'Blocked', measurements: found.measurements,
    cases: [...found.hits.values()].map(x => ({ completeTokens: x.count, currentMessageCodePoints: x.codePoints, compilerAdmitted: x.admitted })),
    noNotes: true, generatePostCalls: 0, productWrites: 0, semanticAcceptance: 'Not Run' };
  try {
    const over = found.hits.get(4097);
    if (over) await bounded(budget => assert.rejects(transport.generate(over.input, budget)));
    assert.equal(postCalls, 0); summary.generatePostCalls = postCalls;
    return summary;
  } finally { found.hits.clear(); }
}

/** One real adapter/runtime invocation, immediate local cancellation after the
 * HTTP invocation is observed. Dispatch is NOT proof of server receipt/start.
 * There is no accepting semantic gate or persistence/delivery capability. */
export async function runCancellationProbe(binding, counter, http = fetch) {
  assert.equal(binding.mode, 'formal-9b');
  let request, posts = 0, candidates = 0, forwardedAbort = false;
  const observedHttp = (url, init) => {
    if (new URL(String(url)).pathname === '/api/generate') {
      posts++;
      init.signal.addEventListener('abort', () => { forwardedAbort = true; }, { once: true });
      // Invoke actual HTTP first; cancel at next event-loop boundary, not before.
      const pending = http(url, init);
      setImmediate(() => request?.cancel('abandoned'));
      return pending;
    }
    return http(url, init);
  };
  const adapter = new ControlledOllamaTransport(binding, new ControlledConversationPrompt(counter), observedHttp);
  const runtime = new BoundedAiRuntime(new MonotonicRuntimeClock(), adapter);
  const work = { purpose: 'ai_assistant_message_v1', prepare: async () => ({ currentMessage: 'Synthetic operator cancellation check.', checkIns: [], persona: undefined }),
    checkCandidate: async () => { candidates++; return { ok: false, failure: 'unsafe_output' }; } };
  const start = performance.now(), admission = runtime.submit('synthetic-operator', work);
  assert.equal(admission.accepted, true); request = admission.request;
  try {
    const outcome = await request.outcome;
    await new Promise(done => setTimeout(done, 100));
    const quarantined = runtime.state.quarantined;
    let nextDenied = false;
    if (quarantined) {
      const next = runtime.submit('different-synthetic-operator', work);
      nextDenied = !next.accepted && next.failure === 'dependency_unavailable';
    }
    return { status: posts === 1 && !outcome.ok && outcome.failure === 'abandoned' && forwardedAbort && candidates === 0 && (quarantined ? nextDenied : adapter.state === 'stopped') ? 'Pass' : 'Not Proven',
      elapsedMs: Math.round(performance.now() - start), generatePostCalls: posts, applicationFailure: outcome.ok ? 'unexpected-success' : outcome.failure,
      forwardedAbort, adapterState: adapter.state, quarantined, nextAdmissionDenied: nextDenied, candidateChecks: candidates,
      serverReceiptOrStartProved: false, remoteStopProved: adapter.state === 'stopped', productWrites: 0,
      semanticAcceptance: 'Not Run', nextGenerationRequiresOperatorRemoteSettlement: quarantined };
  } finally { runtime.shutdown(); request = undefined; }
}

async function main() {
  assert.equal(process.version, 'v24.19.0');
  const mode = process.argv[2]; assert(['semantic-once', 'complete-inputs', 'cancel-once'].includes(mode) && process.argv.length === 3);
  // Existing private operator configuration only, passed by stdin. No content,
  // key, endpoint, digest or exception is printed by this tool.
  let input = ''; for await (const chunk of process.stdin) { input += chunk; assert(Buffer.byteLength(input) <= 16384); }
  const config = JSON.parse(input); input = '';
  assert.equal(config.controlledHostVerified, true);
  assert.equal(config.binding.mode, 'formal-9b');
  const origin = new URL(config.binding.endpoint);
  assert(['127.0.0.1', '[::1]'].includes(origin.hostname));
  assert.equal(config.tokenizerFiles.manifestDigest, config.binding.manifestDigest);
  assert.equal(config.tokenizerFiles.tokenizerSha256, config.binding.tokenizerDigest);
  let live = true;
  const binding = { ...config.binding, current: () => live };
  const counter = new ControlledTokenizerProcess({ ...config.tokenizerFiles, current: () => live });
  try {
    const result = mode === 'semantic-once' ? await runSemanticProbe(binding, counter) :
      mode === 'complete-inputs' ? await runCompleteInputProbe(binding, counter) : await runCancellationProbe(binding, counter);
    process.stdout.write(JSON.stringify({ mode, ...result }) + '\n');
    process.exitCode = result.status === 'Pass' ? 0 : 2;
  } finally { live = false; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { process.stdout.write('{"status":"Fail","detail":"Guard or probe failed; no private output published"}\n'); process.exitCode = 1; });
}
