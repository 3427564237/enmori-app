import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LocalModelLane } from '../../backend/dist/src/ai-runtime/infrastructure/local-model-lane.js';
import { LocalFirstFlowTransport } from '../../backend/dist/src/ai-runtime/infrastructure/local-first-flow-transport.js';
import { readOllamaEnvelope } from '../../backend/dist/src/ai-runtime/infrastructure/ollama-response.js';
import { loadF0Cases, prepareF0Case } from './f0-evaluation.mjs';
import { sha256, protocolAssessment } from './evaluation.mjs';

const requireValue = (value, code) => { if (!value) throw Error(code); };
const model = 'qwen3.5:9b';
const code = error => /^[A-Z][A-Z0-9_]{3,70}$/.test(error?.message ?? '') ? error.message : 'F0_STOPPED';
export function f0SourceBundle(root) {
  const files = ['tool/ai-companion-eval/f0-run.mjs', 'tool/ai-companion-eval/f0-runner.mjs',
    'tool/ai-companion-eval/f0-evaluation.mjs', 'tool/ai-companion-eval/evaluation.mjs',
    'tool/ai-companion-eval/private-output.mjs', 'tool/ai-companion-eval/fixtures/f0-cases.json', 'pnpm-lock.yaml',
    ...['local-model-lane', 'local-first-flow-transport', 'ollama-response'].flatMap(name => [
      `backend/src/ai-runtime/infrastructure/${name}.ts`, `backend/dist/src/ai-runtime/infrastructure/${name}.js`]),
    'backend/dist/src/ai-runtime/domain/parse-output.js',
    'backend/dist/src/ai-conversation/application/persona-expression.js',
    'backend/dist/src/personas/domain/persona-values.js',
    'backend/dist/src/ai-runtime/infrastructure/local-chat-transport.js',
    'backend/dist/src/ai-runtime/infrastructure/synthetic-evaluation-adapters.js',
    'backend/dist/src/ai-conversation/application/open-conversation-semantic-policy.js'];
  const hashes = Object.fromEntries(files.map(path => [path, sha256(readFileSync(resolve(root, path)))]));
  return { hashes, sha256: sha256(JSON.stringify(hashes)) };
}
export function f0CorpusSha256() {
  return sha256(readFileSync(new URL('./fixtures/f0-cases.json', import.meta.url)));
}
export function validateF0Authorization(auth, { sourceHead, sourceBundleSha256, preload, now = Date.now() }) {
  requireValue(auth?.schemaVersion === 'f0_local_authorization_v1' && auth.status === 'approved' &&
    auth.approvedBy === 'Integration' && auth.scope === 'enmori-f0-exact8-20261025' &&
    typeof auth.slotReference === 'string' && auth.slotReference.trim().length >= 10 &&
    typeof auth.hostReadbackReference === 'string' && auth.hostReadbackReference.trim().length >= 10 &&
    auth.sourceHead === sourceHead && /^[a-f0-9]{40}$/.test(sourceHead) &&
    auth.sourceBundleSha256 === sourceBundleSha256 && /^[a-f0-9]{64}$/.test(sourceBundleSha256) &&
    auth.corpusSha256 === f0CorpusSha256() && auth.model === model && auth.maxGenerationRequests === 8 &&
    [0, 1].includes(auth.maxEmptyPreloads) && auth.maxEmptyPreloads >= Number(preload) &&
    Number.isFinite(Date.parse(auth.expiresAt)) && Date.parse(auth.expiresAt) > now, 'F0_AUTHORIZATION_INVALID');
}

// Capture bytes before giving the identical response to the production receiver.
// A capture/parse/HTTP failure is unknown; none is proof that Ollama stopped.
async function captureResponse(response, capture) {
  capture.httpStatus = response.status;
  const chunks = []; let length = 0;
  requireValue(response.body, 'F0_BODY_MISSING');
  const reader = response.body.getReader();
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      requireValue(length + part.value.length <= 1024 * 1024, 'F0_BODY_LIMIT');
      chunks.push(part.value); length += part.value.length;
    }
    capture.completeBody = true;
  } finally {
    const bytes = Buffer.concat(chunks);
    capture.rawBodyBase64 = bytes.toString('base64'); capture.rawBodySha256 = sha256(bytes);
    try { capture.rawBody = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { /* retain bytes */ }
    await reader.cancel().catch(() => {}); reader.releaseLock();
  }
  return new Response(Buffer.from(capture.rawBodyBase64, 'base64'), { status: response.status });
}

/** One shared production lane, eight sequential production F0 calls. HTTP is
 * supplied explicitly; importing, planning and testing never opens a socket. */
export async function runF0({ mode, http, save, guard, preload = false, signal,
  now = () => performance.now(), receiveMs = 120_000, onProgress = () => {} }) {
  requireValue(['mock', 'local'].includes(mode) && typeof http === 'function' && typeof guard === 'function', 'F0_OPTIONS_INVALID');
  const corpus = loadF0Cases(), counts = { emptyPreloads: 0, generations: 0 }, rows = [];
  let active, preloadObservation, stopReason = 'case-budget-exhausted';
  const lane = new LocalModelLane(model, async (url, init) => {
    const c = active;
    try {
      requireValue(url === c.expected.url && init.body === c.expected.body, 'F0_SERIALIZER_MISMATCH');
      guard(); requireValue(!signal?.aborted, 'F0_CANCELLED');
      save(`${c.prefix}.request.json`, { id: c.id, kind: c.kind, providerRequest: c.expected,
        requestSha256: sha256(JSON.stringify(c.expected)), at: new Date().toISOString(),
        dispatchIntent: mode === 'mock' ? 'in-memory-fake' : 'single-attempt-no-retry' });
      // Disk persistence can consume the slot or be interrupted. Recheck at HTTP boundary.
      guard(); requireValue(!signal?.aborted, 'F0_CANCELLED');
      if (c.kind === 'preload') { requireValue(counts.emptyPreloads === 0, 'F0_PRELOAD_LIMIT'); counts.emptyPreloads++; }
      else { requireValue(counts.generations < 8, 'F0_GENERATION_LIMIT'); counts.generations++; }
      c.capture.dispatched = true; c.capture.dispatchedAt = new Date().toISOString();
      return await captureResponse(await http(url, init), c.capture);
    } catch (error) { c.capture.failure = code(error); throw error; }
    finally { c.capture.receivedMs = now() - c.started; c.captured(); }
  });
  const transport = new LocalFirstFlowTransport(lane);
  async function attempt(fixture, index, kind = 'generation') {
    const id = fixture?.id ?? 'empty-preload', prefix = `${String(index).padStart(2, '0')}-${id}`;
    const expected = kind === 'preload' ? { url: 'http://127.0.0.1:11434/api/generate',
      body: JSON.stringify({ model, prompt: '', stream: false, keep_alive: '30m', options: { num_ctx: 8192 } }) }
      : await prepareF0Case(fixture);
    const c = { id, prefix, expected, kind, capture: {}, started: now() };
    const captured = new Promise(resolve => { c.captured = () => resolve('captured'); });
    active = c;
    const delivery = new AbortController(), abort = () => delivery.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const deliveryTimer = setTimeout(abort, 45_000);
    let receiveTimer;
    const timeout = new Promise(resolve => { receiveTimer = setTimeout(() => resolve('timeout'), receiveMs); });
    const operation = (kind === 'preload' ? lane.prepareModel() : transport.generate(fixture.input,
      { signal: delivery.signal, deadline: c.started + 45_000, remainingMs: () => c.started + 45_000 - now() }))
      .then(value => ({ ok: true, value }), error => ({ ok: false, failure: code(error) }));
    try {
      const first = await Promise.race([captured, operation, timeout]);
      let envelope;
      if (first === 'captured' && c.capture.completeBody) {
        try { envelope = await readOllamaEnvelope(new Response(Buffer.from(c.capture.rawBodyBase64, 'base64'),
          { status: c.capture.httpStatus })); } catch { /* strict receiver rejects this response */ }
      }
      const physicallySettled = !!envelope && envelope.model === model && envelope.done === true;
      const result = physicallySettled ? await Promise.race([operation, timeout]) : undefined;
      const elapsedMs = now() - c.started;
      const observation = { provider: 'ollama-baseline', ...c.capture, elapsedMs,
        outcome: physicallySettled ? 'response-observed' : c.capture.dispatched ? 'unconfirmed' : 'not-started',
        physicallySettled, withinDeliveryDeadline: elapsedMs <= 45_000 && !delivery.signal.aborted,
        ...(typeof envelope?.message?.content === 'string' ? { rawText: envelope.message.content } : {}),
        ...(envelope ? { doneReason: envelope.done_reason, promptEvalCount: envelope.prompt_eval_count,
          evalCount: envelope.eval_count, totalDurationNs: envelope.total_duration } : {}),
        ...(!physicallySettled ? { failure: c.capture.failure ?? 'F0_PHYSICAL_OUTCOME_UNKNOWN' }
          : !result?.ok ? { failure: result?.failure ?? 'F0_DELIVERY_UNCONFIRMED' }
          : kind === 'generation' && envelope.done_reason !== 'stop' ? { failure: 'F0_COMPLETION_REASON_INVALID' } : {}) };
      const row = { id, kind, requestSha256: sha256(JSON.stringify(expected)),
        ...(fixture ? { criteria: fixture.criteria, commonCriteria: corpus.commonCriteria } : {}), observation,
        protocol: kind === 'generation' ? protocolAssessment(observation) : { eligible: physicallySettled && result?.ok === true },
        semanticReview: 'unreviewed' };
      save(`${prefix}.response.json`, row); onProgress(row);
      return row;
    } finally { clearTimeout(deliveryTimer); clearTimeout(receiveTimer); signal?.removeEventListener('abort', abort); }
  }
  try {
    guard(); requireValue(!signal?.aborted, 'F0_CANCELLED');
    if (preload) {
      preloadObservation = await attempt(undefined, 0, 'preload');
      requireValue(preloadObservation.protocol.eligible, 'F0_PRELOAD_UNCONFIRMED_OR_INVALID');
    }
    for (const [i, fixture] of corpus.cases.entries()) {
      guard(); requireValue(!signal?.aborted, 'F0_CANCELLED');
      const row = await attempt(fixture, i + 1); rows.push(row);
      requireValue(row.observation.physicallySettled, 'F0_PHYSICAL_OUTCOME_UNKNOWN');
    }
  } catch (error) { stopReason = code(error); }
  return { mode, intendedCases: 8, caseIds: corpus.cases.map(c => c.id), counts,
    realProviderCalls: mode === 'local' ? counts.generations + counts.emptyPreloads : 0,
    preload: preloadObservation, rows, stopReason, laneState: lane.state,
    semanticReview: 'independent QA required; protocol is not semantic acceptance' };
}
