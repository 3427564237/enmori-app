import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGroqCases, prepareGroqCase } from './groq-evaluation.mjs';
import { loadCases, sha256, protocolAssessment, validateReview } from './evaluation.mjs';
import { OpenAiCloudTransport, assertOpenAiTransportSettings, buildOpenAiInputTokenCountRequest, buildOpenAiRequest,
  openAiInputTokensEndpoint, readOpenAiInputTokenCount }
  from '../../backend/dist/src/ai-runtime/infrastructure/openai-cloud-transport.js';

const countMethod = 'responses-input-token-count';

export const openAiEvaluationConfiguration = (model, promptProfile = 'baseline') => Object.freeze({ model,
  ...(promptProfile === 'baseline' ? {} : { promptProfile }),
  reasoningEffort: 'low', maxOutputTokens: 2048, maxInputTokens: 8192, maxRequestBytes: 131072 });

/** Golden production messages and original criteria. The shared OpenAI request
 * builder applies an explicitly selected profile to the system message. */
export async function prepareOpenAiCases(model, promptProfile = 'baseline') {
  assert(['gpt-6-luna', 'gpt-6.1-sol'].includes(model));
  assert(['baseline', 'goal-grounding-v1'].includes(promptProfile));
  const config = openAiEvaluationConfiguration(model, promptProfile), rows = [];
  for (const fixture of loadGroqCases()) {
    const { prompt } = await prepareGroqCase(fixture.id, 'baseline');
    const messages = [{ role: 'system', content: prompt.system },
      ...prompt.turns.map(turn => ({ role: turn.role, content: turn.text }))];
    const body = buildOpenAiRequest(messages, config);
    rows.push({ id: fixture.id, criteria: fixture.criteria, messages, requestSha256: sha256(body) });
  }
  assert.equal(rows.length, 24);
  return { config, corpusSha256: loadCases().corpusSha256, rows };
}

function countRequestBody(row, config) {
  const generationBody = buildOpenAiRequest(row.messages, config);
  assert(sha256(generationBody) === row.requestSha256, 'OPENAI_COUNT_REQUEST_CHANGED');
  return buildOpenAiInputTokenCountRequest(generationBody, config);
}

function checkGrant(grant, prepared, now) {
  assert(grant?.syntheticOnly === true && grant.model === prepared.config.model && grant.corpusSha256 === prepared.corpusSha256 &&
    grant.maximumRequests === 24 && typeof grant.approvalReference === 'string' && grant.approvalReference.length > 0 &&
    Number.isSafeInteger(now) && Number.isSafeInteger(grant.expiresAtMs) && now < grant.expiresAtMs);
  const { promptProfile = 'baseline' } = grant;
  assert(promptProfile === (prepared.config.promptProfile ?? 'baseline'));
  assert(grant.model === 'gpt-6-luna' || grant.lunaQualityFailed === true);
}

function checkHttpMode(mode, http) {
  assert(typeof http === 'function' && (mode === 'live' || mode === 'mock'));
  assert((mode === 'live') === (http === globalThis.fetch));
}

/** The exact-body token evidence must come from verified Responses counting
 * or verified model framing, never a bytes/characters heuristic. */
export function validateOpenAiTokenEvidence(evidence, prepared, now, mode = 'mock') {
  assert(evidence?.schemaVersion === 'openai_input_bound_v1' && evidence.model === prepared.config.model);
  const { promptProfile = 'baseline' } = evidence;
  assert(promptProfile === (prepared.config.promptProfile ?? 'baseline'));
  assert(Number.isSafeInteger(evidence.verifiedAtMs) && evidence.verifiedAtMs <= now &&
    Number.isSafeInteger(evidence.expiresAtMs) && now < evidence.expiresAtMs);
  assert([countMethod, 'verified-model-framing'].includes(evidence.method));
  assert(evidence.mode === 'live' || (mode === 'mock' && evidence.mode === 'mock'));
  assert(evidence.corpusSha256 === prepared.corpusSha256 && Array.isArray(evidence.rows) && evidence.rows.length === 24);
  const bounds = new Map();
  for (const row of prepared.rows) {
    const matching = evidence.rows.filter(r => r.id === row.id && r.requestSha256 === row.requestSha256);
    assert.equal(matching.length, 1);
    const { inputTokenUpperBound: bound, countRequestSha256 } = matching[0];
    if (evidence.method === countMethod) assert(countRequestSha256 === sha256(countRequestBody(row, prepared.config)));
    assert(Number.isSafeInteger(bound) && bound > 0 && bound <= prepared.config.maxInputTokens);
    bounds.set(row.requestSha256, bound);
  }
  return bounds;
}

/** An explicit, one-use synthetic preflight. OpenAI documents this endpoint
 * as free; paid generation stays in runOpenAiEvaluation and its monetary owner.
 * The caller supplies a durable count claim separate from the generation claim. */
export async function collectOpenAiTokenEvidence({ mode = 'mock', model, promptProfile = 'baseline', key, grant,
  claimPreflight, save, http, utcNow = Date.now }) {
  const prepared = await prepareOpenAiCases(model, promptProfile), { config, corpusSha256 } = prepared;
  checkGrant(grant, prepared, utcNow());
  assertOpenAiTransportSettings(key, config, config.maxInputTokens + config.maxOutputTokens);
  assert(typeof save === 'function' && typeof claimPreflight === 'function');
  checkHttpMode(mode, http);
  await claimPreflight(grant);
  const evidence = { schemaVersion: 'openai_input_bound_v1', method: countMethod, mode, model,
    ...(config.promptProfile === undefined ? {} : { promptProfile: config.promptProfile }),
    corpusSha256, expiresAtMs: grant.expiresAtMs, rows: [] };
  for (const row of prepared.rows) {
    const body = countRequestBody(row, config);
    assert(!body.includes(key), 'OPENAI_COUNT_REQUEST_INVALID');
    const intent = { id: row.id, requestSha256: row.requestSha256, countRequestSha256: sha256(body) };
    await save(`${row.id}.count-intent.json`, intent);
    const now = utcNow();
    checkGrant(grant, prepared, now);
    let inputTokenUpperBound, httpStatus;
    try {
      const signal = AbortSignal.timeout(Math.min(15000, evidence.expiresAtMs - now));
      const response = await http(openAiInputTokensEndpoint, { method: 'POST', redirect: 'error', cache: 'no-store', signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body });
      if (Number.isInteger(response.status) && response.status >= 100 && response.status <= 599) httpStatus = response.status;
      if (response.status !== 200 || response.redirected || (response.url && response.url !== openAiInputTokensEndpoint)) {
        if (response.body) void response.body.cancel().catch(() => {});
        throw Error();
      }
      inputTokenUpperBound = await readOpenAiInputTokenCount(response, config.maxInputTokens, signal);
      checkGrant(grant, prepared, utcNow());
      assert(!signal.aborted);
    } catch {
      await save(`${row.id}.count-failure.json`, { ...intent, httpStatus, outcome: 'unconfirmed-no-retry' });
      throw Error('OPENAI_COUNT_UNCONFIRMED_NO_RETRY');
    }
    const observed = { ...intent, inputTokenUpperBound };
    await save(`${row.id}.count.json`, observed);
    evidence.rows.push(observed);
  }
  evidence.verifiedAtMs = utcNow();
  validateOpenAiTokenEvidence(evidence, prepared, evidence.verifiedAtMs, mode);
  await save('token-evidence.json', evidence);
  return evidence;
}

/** Explicit dependency injection: one shared durable monetary owner, a private
 * writer, a single-use run claim, and verified exact-request input bounds.
 * Importing this module never reads credentials, calls HTTP, or renews credit. */
export async function runOpenAiEvaluation({ mode = 'mock', model, promptProfile = 'baseline', key, owner, tokenEvidence, grant,
  claimRun, save, http, clock, rateAuthority, utcNow = Date.now, newAttemptId = randomUUID }) {
  const prepared = await prepareOpenAiCases(model, promptProfile), { config } = prepared;
  const bounds = validateOpenAiTokenEvidence(tokenEvidence, prepared, utcNow(), mode);
  checkGrant(grant, prepared, utcNow());
  assert(typeof save === 'function' && typeof claimRun === 'function');
  checkHttpMode(mode, http);
  if (mode === 'live' || rateAuthority !== undefined) {
    assert(typeof rateAuthority?.reserve === 'function' && typeof rateAuthority.available === 'function' &&
      typeof rateAuthority.rateLimited === 'function');
  }
  await claimRun(grant);
  if (owner.isCurrent?.() !== true) {
    const recovery = await owner.recover();
    assert.equal(recovery.kind, 'confirmed');
  }
  const report = { schemaVersion: 'openai_synthetic_run_v1', mode, syntheticOnly: true, model, promptProfile,
    corpusSha256: prepared.corpusSha256, configuration: config, intendedCases: 24, maximumRequests: 24,
    grantSha256: sha256(JSON.stringify(grant)), tokenEvidenceSha256: sha256(JSON.stringify(tokenEvidence)),
    actualProviderCalls: 0, transportInvocations: 0,
    startedAt: new Date(utcNow()).toISOString(), rows: [], semanticReview: 'unreviewed' };
  await save('manifest.json', report);
  let rateLimited = false;
  const live = () => !rateLimited && utcNow() < grant.expiresAtMs && utcNow() < tokenEvidence.expiresAtMs &&
    (rateAuthority === undefined || rateAuthority.available() === true);
  for (const row of prepared.rows) {
    if (!live()) { report.stopReason = 'grant-or-rate-authority-closed'; break; }
    if (rateAuthority && await rateAuthority.reserve(live) !== 'confirmed') {
      report.stopReason = 'rate-reservation-unavailable'; break;
    }
    const attemptId = newAttemptId();
    const reservation = await owner.reserve({ attemptId, consumer: 'evaluation', model,
      maxInputTokens: config.maxInputTokens, maxOutputTokens: config.maxOutputTokens }, live);
    if (reservation.kind !== 'confirmed') { report.stopReason = 'budget-unavailable'; break; }
    // Intent is durable before any HTTP effect. A writer failure burns the
    // conservative reservation rather than authorizing an untracked request.
    await save(`${row.id}.intent.json`, { ...row, attemptId, model });
    const started = clock.now(), controller = new AbortController();
    const deadline = started + 15000;
    const requestBudget = { signal: controller.signal, deadline, remainingMs: () => Math.max(0, deadline - clock.now()) };
    let usage, cooldownPersisted, httpStatus, rejectionDiagnostic;
    const dispatch = owner.dispatch(reservation.reservation, controls => {
      const transport = new OpenAiCloudTransport(key, config, clock, async (...args) => {
        assert(live() && report.transportInvocations < 24);
        report.transportInvocations++;
        if (mode === 'live') report.actualProviderCalls++;
        const response = await http(...args);
        if (Number.isInteger(response.status) && response.status >= 100 && response.status <= 599) httpStatus = response.status;
        return response;
      }, { ...controls, available: () => live() && controls.available(),
        reservedTokens: config.maxInputTokens + config.maxOutputTokens,
        inputTokenUpperBound: body => {
          assert.equal(sha256(body), row.requestSha256);
          assert(live()); return bounds.get(row.requestSha256);
        },
        rateLimited: seconds => {
          rateLimited = true;
          cooldownPersisted = Promise.resolve(rateAuthority?.rateLimited(seconds));
          return cooldownPersisted;
        },
        confirmUsage: async observed => {
          const result = await controls.confirmUsage(observed);
          if (result === 'confirmed') usage = observed;
          return result;
        },
        observeRejection: diagnostic => { rejectionDiagnostic = diagnostic; },
      });
      return transport.dispatch(row.messages, requestBudget);
    });
    const outcome = dispatch ? await dispatch : { kind: 'unknown', physical: 'unknown' };
    if (cooldownPersisted) await cooldownPersisted;
    const elapsedMs = Math.max(0, clock.now() - started);
    const observation = { provider: 'openai', outcome: outcome.kind === 'response' ? 'response-observed' : 'unconfirmed',
      physicallySettled: outcome.physical === 'stopped', elapsedMs, withinDeliveryDeadline: elapsedMs < 15000,
      ...(httpStatus === undefined ? {} : { httpStatus }),
      ...(rejectionDiagnostic ? { rejectionDiagnostic } : {}),
      ...(usage ? { usage } : {}),
      ...(outcome.kind === 'response' ? { rawText: new TextDecoder().decode(outcome.raw) } : {}) };
    const result = { id: row.id, criteria: row.criteria, requestSha256: row.requestSha256,
      observation, protocol: protocolAssessment(observation), semanticReview: 'unreviewed' };
    report.rows.push(result); await save(`${row.id}.response.json`, result);
    if (!result.protocol.eligible || !usage) { report.stopReason = 'ineligible-or-unconfirmed-no-retry'; break; }
  }
  report.stopReason ??= 'case-budget-exhausted';
  report.finishedAt = new Date(utcNow()).toISOString();
  await save('report.json', report);
  return report;
}

export function requireOpenAiSemanticAcceptance(report, runSha256, review) {
  assert(report.schemaVersion === 'openai_synthetic_run_v1' && report.mode === 'live' &&
    report.actualProviderCalls === 24 && report.transportInvocations === 24 && report.rows.length === 24 &&
    report.stopReason === 'case-budget-exhausted' && report.rows.every(row => row.protocol.eligible));
  validateReview(report, runSha256, review);
  assert(review.rows.every(row => row.verdict === 'pass'));
}
