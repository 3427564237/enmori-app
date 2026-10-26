import { readFileSync, lstatSync, realpathSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { loadCases, prepareCase, buildEvaluationRequest, observeSyntheticEvaluation, protocolAssessment,
  costObservation, sha256, priceSnapshot } from './evaluation.mjs';
import { CloudBudget, validateCloudAuthorization } from './cloud-budget.mjs';
import { writeExclusiveJson } from './private-output.mjs';
import { freeService, freeSelection, freeSelectionSha256, freeMinimumSpacingMs,
  validateFreeAuthorization, FreeBudget } from './free-cloud-scope.mjs';

const generateUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
const countUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:countTokens';
const requireValue = (condition, code) => { if (!condition) throw Error(code); };
export const safeErrorCode = error => typeof error?.message === 'string' && /^[A-Z][A-Z0-9_]{3,70}$/.test(error.message)
  ? error.message : 'EVALUATION_STOPPED';

export function sourceBundle(root) {
  const files = ['tool/ai-companion-eval/free-cloud-scope.mjs', 'tool/ai-companion-eval/cloud-budget.mjs', 'tool/ai-companion-eval/cloud-runner.mjs',
    'tool/ai-companion-eval/cloud-run.mjs', 'tool/ai-companion-eval/evaluation.mjs', 'tool/ai-companion-eval/private-output.mjs',
    'tool/ai-companion-eval/fixtures/companion-cases.json', 'tool/ai-companion-eval/fixtures/preserved-small-plan-cases.json',
    'backend/src/ai-runtime/infrastructure/synthetic-evaluation-adapters.ts',
    'backend/dist/src/ai-runtime/infrastructure/synthetic-evaluation-adapters.js',
    'backend/dist/src/ai-runtime/infrastructure/local-chat-transport.js',
    'backend/dist/src/ai-runtime/infrastructure/local-model-lane.js',
    'backend/dist/src/ai-runtime/infrastructure/ollama-response.js',
    'backend/dist/src/ai-conversation/application/persona-expression.js',
    'backend/dist/src/personas/domain/persona-values.js',
    'backend/dist/src/check-ins/domain/content.js', 'backend/dist/src/check-ins/domain/note.js',
    'backend/dist/src/shared/domain/result.js', 'backend/dist/src/shared/application/app-failure.js',
    'backend/dist/src/ai-runtime/domain/parse-output.js',
    'backend/dist/src/ai-conversation/application/open-conversation-semantic-policy.js', 'pnpm-lock.yaml'];
  const hashes = Object.fromEntries(files.map(p => [p, sha256(readFileSync(resolve(root, p)))]));
  return { hashes, sha256: sha256(JSON.stringify(hashes)) };
}

/** Only the explicit cloud composition calls this; no ambient environment read. */
export function createGeminiHttp(apiKey, fetchImplementation) {
  requireValue(typeof apiKey === 'string' && /^[A-Za-z0-9_-]{20,256}$/.test(apiKey), 'SERVER_KEY_REQUIRED');
  requireValue(typeof fetchImplementation === 'function', 'HTTP_REQUIRED');
  return async (request, signal) => {
    requireValue([generateUrl, countUrl].includes(request.url), 'PROVIDER_URL_FORBIDDEN');
    return fetchImplementation(request.url, { method: 'POST', redirect: 'error', cache: 'no-store', signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body: request.body });
  };
}

/** One authorization reference is consumed once on this controlled host.
 * This is not deleted after failure or interruption and is never auto-resumed. */
export function claimCloudAuthorization(directory, authorization) {
  try { mkdirSync(directory, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const stat = lstatSync(directory);
  requireValue(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() &&
    (stat.mode & 0o077) === 0 && realpathSync(directory) === directory, 'AUTHORIZATION_LEDGER_UNSAFE');
  const path = resolve(directory, `${sha256(authorization.approvalReference)}.claimed.json`);
  try {
    writeExclusiveJson(path, { approvalReference: authorization.approvalReference,
      grantSha256: sha256(JSON.stringify(authorization)), claimedAt: new Date().toISOString(),
      disposition: 'Single use; interrupted/unknown work must not be retried or reset.' });
  } catch { throw Error('AUTHORIZATION_ALREADY_CLAIMED_OR_UNCONFIRMED'); }
  return path;
}

export function redactCredential(value, secret) {
  if (!secret) return value;
  const serialized = JSON.stringify(value);
  return serialized.includes(secret) ? { ...JSON.parse(serialized.split(secret).join('[REDACTED]')), credentialRedacted: true } : value;
}

async function countInput(request, http, signal) {
  let rawBody = '', httpStatus;
  const started = performance.now();
  try {
    const timeout = AbortSignal.timeout(120_000);
    const response = await http(request, signal ? AbortSignal.any([signal, timeout]) : timeout);
    httpStatus = response.status;
    requireValue(response.body, 'COUNT_BODY_MISSING');
    const reader = response.body.getReader(), decoder = new TextDecoder('utf8', { fatal: true });
    let bytes = 0;
    try {
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.length; requireValue(bytes <= 1024 * 1024, 'COUNT_BODY_LIMIT');
        rawBody += decoder.decode(part.value, { stream: true });
      }
      rawBody += decoder.decode();
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    requireValue(response.ok, 'COUNT_HTTP_FAILURE');
    const parsed = JSON.parse(rawBody);
    requireValue(Number.isSafeInteger(parsed?.totalTokens) && parsed.totalTokens > 0, 'COUNT_RESPONSE_INVALID');
    return { outcome: 'response-observed', totalTokens: parsed.totalTokens, rawBody, httpStatus,
      elapsedMs: performance.now() - started };
  } catch {
    return { outcome: 'unconfirmed', rawBody, ...(httpStatus === undefined ? {} : { httpStatus }),
      elapsedMs: performance.now() - started };
  }
}

/** Fixed checked-in corpus only. save must create exclusive private files and
 * succeed before each dispatch. Caller owns actual permission and key supply. */
export async function runSyntheticCloud({ mode, authorization, passes, maxUsd, sourceBundleSha256, http, save,
  secret, signal, now = () => new Date().toISOString(), verifyExternal = () => {},
  monotonicNow = () => performance.now(), wait = ms => delay(ms, undefined, { signal }) }) {
  requireValue(mode !== 'cloud', 'PAID_EXECUTION_SUPERSEDED');
  requireValue(['mock', 'free'].includes(mode), 'EXECUTION_MODE_INVALID');
  const free = authorization?.service === freeService;
  requireValue(mode !== 'free' || free, 'FREE_AUTHORIZATION_REQUIRED');
  const corpus = loadCases(), verify = () => {
    verifyExternal();
    return (free ? validateFreeAuthorization : validateCloudAuthorization)(authorization, {
      corpusSha256: corpus.corpusSha256, sourceBundleSha256, passes, maxUsd, now: now(), mock: mode === 'mock' });
  };
  const grant = verify(), budget = free ? new FreeBudget() : new CloudBudget(grant), rows = [];
  const cases = free ? freeSelection.map(item => corpus.cases.find(fixture => fixture.id === item.id)) : corpus.cases;
  requireValue(cases.every(Boolean), 'FREE_SUBSET_MISSING');
  let nextDispatchAt = -Infinity;
  const pace = async () => {
    if (!free) return;
    while (monotonicNow() < nextDispatchAt) {
      try { await wait(nextDispatchAt - monotonicNow()); } catch { throw Error(signal?.aborted ? 'CANCELLED' : 'FREE_PACING_UNCONFIRMED'); }
    }
    verify(); requireValue(!signal?.aborted, 'CANCELLED');
  };
  let generationCalls = 0, countCalls = 0, dispatchBlockReason;
  const measuredHttp = async (request, abortSignal) => {
    // Intent persistence can cross expiry or observe cancellation. Recheck
    // synchronously at the actual HTTP boundary before counting or dispatching.
    try {
      verify();
      requireValue(!signal?.aborted, 'CANCELLED');
      requireValue(!abortSignal.aborted, 'RECEIVE_DEADLINE_EXPIRED');
      requireValue(!free || monotonicNow() >= nextDispatchAt, 'FREE_RATE_GUARD');
    } catch (error) {
      dispatchBlockReason = safeErrorCode(error);
      throw error;
    }
    if (request.url === generateUrl) generationCalls++;
    else if (request.url === countUrl) countCalls++;
    else throw Error('PROVIDER_URL_FORBIDDEN');
    if (free) nextDispatchAt = monotonicNow() + freeMinimumSpacingMs;
    return http(request, abortSignal);
  };
  const safe = value => redactCredential(value, secret);
  const observedDispatch = value => {
    if (!dispatchBlockReason) return value;
    const { failure: _failure, ...rest } = value;
    return { ...rest, outcome: 'not-started', dispatchBlockReason };
  };
  const persist = (name, value) => save(name, safe(value));
  const report = { schemaVersion: 'synthetic_evaluation_run_v1', mode, provider: 'gemini-candidate', syntheticOnly: true,
    startedAt: now(), intendedCases: cases.length * passes, sourceBundleSha256,
    corpusSha256: corpus.corpusSha256, authorization: grant,
    ...(free ? { selection: freeSelection, selectionSha256: freeSelectionSha256,
      minimumRequestSpacingMs: freeMinimumSpacingMs, spendAuthorizationUsd: 0,
      priceSnapshot: { service: freeService, source: 'https://ai.google.dev/gemini-api/docs/pricing',
        verifiedAt: grant.verifiedAt, inputPerMillion: 0, outputIncludingThinkingPerMillion: 0 } } : { priceSnapshot }), rows };
  persist('cloud-manifest.json', { ...report, budget: budget.snapshot() });
  let stopReason = 'case-budget-exhausted';
  for (let pass = 1; pass <= passes; pass++) {
    for (const fixture of cases) {
      const id = `pass-${pass}--${fixture.id}`;
      let row;
      try {
        verify(); requireValue(!signal?.aborted, 'CANCELLED');
        const { prompt } = await prepareCase(fixture), request = buildEvaluationRequest('gemini-candidate', prompt);
        const countRequest = { url: countUrl, body: JSON.stringify({ generateContentRequest: {
          model: 'models/gemini-3.8-flash', ...JSON.parse(request.body) } }) };
        const reservedCount = budget.reserveCount();
        // Durable reservation/intent first; a crash never means safe to resend.
        persist(`${id}.count-intent.json`, { id, fixture, prompt, request: countRequest, budget: reservedCount, at: now() });
        await pace();
        const count = safe(observedDispatch(await countInput(countRequest, measuredHttp, signal)));
        persist(`${id}.count-response.json`, count);
        row = { id, caseId: fixture.id, pass, track: fixture.track, tags: fixture.tags, criteria: fixture.criteria, count,
          protocol: { valid: false, eligible: false }, semanticReview: 'unreviewed' };
        requireValue(!dispatchBlockReason, dispatchBlockReason);
        requireValue(!signal?.aborted, 'CANCELLED');
        requireValue(count.outcome === 'response-observed', 'COUNT_UNCONFIRMED');
        verify(); requireValue(!signal?.aborted, 'CANCELLED');
        const reservation = budget.reserveGeneration(count.totalTokens);
        persist(`${id}.generation-intent.json`, { id, request, requestSha256: sha256(JSON.stringify(request)),
          budget: reservation, at: now() });
        await pace();
        const observation = safe(observedDispatch(await observeSyntheticEvaluation('gemini-candidate', prompt, measuredHttp, { signal })));
        row = { ...row, requestSha256: sha256(JSON.stringify(request)), observation,
          protocol: protocolAssessment(observation), cost: free && mode === 'free'
            ? { kind: 'verified-free-tier', authorizedMaxUsd: 0, estimateUsd: 0, billedUsd: null }
            : costObservation(observation, mode === 'mock') };
        // Persist each response before interpreting failures or considering the next case.
        persist(`${id}.response.json`, row);
        rows.push(row);
        requireValue(!dispatchBlockReason, dispatchBlockReason);
        requireValue(!signal?.aborted, 'CANCELLED');
        requireValue(observation.outcome === 'response-observed', 'GENERATION_UNCONFIRMED');
        requireValue(row.protocol.eligible, 'GENERATION_INELIGIBLE');
        requireValue(typeof observation.modelRevision === 'string' && observation.modelRevision.startsWith('gemini-3.8-flash'),
          'MODEL_REVISION_UNCONFIRMED');
        const u = observation.usage;
        requireValue(u && [u.inputTokens, u.outputTokens, u.thinkingTokens].every(n => Number.isSafeInteger(n) && n >= 0), 'USAGE_UNKNOWN');
        requireValue(u.inputTokens <= 8192 && u.outputTokens + u.thinkingTokens <= 2048, 'PROVIDER_USAGE_EXCEEDS_RESERVATION');
      } catch (error) {
        stopReason = safeErrorCode(error);
        if (row && !rows.includes(row)) { row = { ...row, stoppedBeforeGeneration: stopReason }; rows.push(row); }
        // No budget release, retry, continuation, model swap or alternate provider.
        persist('stop.json', { id, stopReason, budget: budget.snapshot(), at: now() });
        return safe({ ...report, finishedAt: now(), budget: budget.snapshot(), stopReason,
          realGenerationCalls: mode === 'free' ? generationCalls : 0,
          realCountCalls: mode === 'free' ? countCalls : 0 });
      }
    }
  }
  return safe({ ...report, finishedAt: now(), budget: budget.snapshot(), stopReason,
    realGenerationCalls: mode === 'free' ? generationCalls : 0,
    realCountCalls: mode === 'free' ? countCalls : 0 });
}
