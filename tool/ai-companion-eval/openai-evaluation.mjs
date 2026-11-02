import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGroqCases, prepareGroqCase } from './groq-evaluation.mjs';
import { loadCases, sha256, protocolAssessment, validateReview } from './evaluation.mjs';
import { OpenAiCloudTransport, buildOpenAiRequest } from '../../backend/dist/src/ai-runtime/infrastructure/openai-cloud-transport.js';

export const openAiEvaluationConfiguration = model => Object.freeze({ model,
  reasoningEffort: 'low', maxOutputTokens: 2048, maxInputTokens: 8192, maxRequestBytes: 131072 });

/** Golden production prompts and original criteria, not candidate-specific
 * rewrites. This preparation is offline and accepts no arbitrary user data. */
export async function prepareOpenAiCases(model) {
  assert(['gpt-6-luna', 'gpt-6.1-sol'].includes(model));
  const config = openAiEvaluationConfiguration(model), rows = [];
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

/** The exact-body token evidence must come from verified Responses counting
 * or verified model framing, never a bytes/characters heuristic. Count calls
 * are a separate gated operation; this module cannot bypass grant accounting. */
export function validateOpenAiTokenEvidence(evidence, prepared, now) {
  assert(evidence?.schemaVersion === 'openai_input_bound_v1' && evidence.model === prepared.config.model);
  assert(Number.isSafeInteger(evidence.verifiedAtMs) && evidence.verifiedAtMs <= now &&
    Number.isSafeInteger(evidence.expiresAtMs) && now < evidence.expiresAtMs);
  assert(['responses-input-token-count', 'verified-model-framing'].includes(evidence.method));
  assert(evidence.corpusSha256 === prepared.corpusSha256 && Array.isArray(evidence.rows) && evidence.rows.length === 24);
  const bounds = new Map();
  for (const row of prepared.rows) {
    const matching = evidence.rows.filter(r => r.id === row.id && r.requestSha256 === row.requestSha256);
    assert.equal(matching.length, 1);
    const bound = matching[0].inputTokenUpperBound;
    assert(Number.isSafeInteger(bound) && bound > 0 && bound <= prepared.config.maxInputTokens);
    bounds.set(row.requestSha256, bound);
  }
  return bounds;
}

/** Explicit dependency injection: one shared durable monetary owner, a private
 * writer, a single-use run claim, and verified exact-request input bounds.
 * Importing this module never reads credentials, calls HTTP, or renews credit. */
export async function runOpenAiEvaluation({ mode = 'mock', model, key, owner, tokenEvidence, grant,
  claimRun, save, http, clock, utcNow = Date.now, newAttemptId = randomUUID }) {
  const prepared = await prepareOpenAiCases(model), { config } = prepared;
  const bounds = validateOpenAiTokenEvidence(tokenEvidence, prepared, utcNow());
  assert(grant?.syntheticOnly === true && grant.model === model && grant.corpusSha256 === prepared.corpusSha256 &&
    grant.maximumRequests === 24 && typeof grant.approvalReference === 'string' && grant.approvalReference.length > 0 &&
    Number.isSafeInteger(grant.expiresAtMs) && utcNow() < grant.expiresAtMs);
  // Sol is a bounded second candidate, not a silently preferred provider.
  assert(model === 'gpt-6-luna' || grant.lunaQualityFailed === true);
  assert(typeof http === 'function' && typeof save === 'function' && typeof claimRun === 'function');
  assert(mode === 'mock' || mode === 'live');
  // A live-labelled run must use the native HTTP boundary; injected fabricated
  // responses remain mock evidence regardless of their output quality.
  assert(mode !== 'live' || http === globalThis.fetch);
  await claimRun(grant);
  if (owner.isCurrent?.() !== true) {
    const recovery = await owner.recover();
    assert.equal(recovery.kind, 'confirmed');
  }
  const report = { schemaVersion: 'openai_synthetic_run_v1', mode, syntheticOnly: true, model,
    corpusSha256: prepared.corpusSha256, configuration: config, maximumRequests: 24,
    grantSha256: sha256(JSON.stringify(grant)), tokenEvidenceSha256: sha256(JSON.stringify(tokenEvidence)),
    actualProviderCalls: 0, transportInvocations: 0,
    startedAt: new Date(utcNow()).toISOString(), rows: [], semanticReview: 'unreviewed' };
  await save('manifest.json', report);
  let rateLimited = false;
  const live = () => !rateLimited && utcNow() < grant.expiresAtMs && utcNow() < tokenEvidence.expiresAtMs;
  for (const row of prepared.rows) {
    if (!live()) { report.stopReason = 'grant-expired-or-rate-limited'; break; }
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
    let usage;
    const dispatch = owner.dispatch(reservation.reservation, controls => {
      const transport = new OpenAiCloudTransport(key, config, clock, async (...args) => {
        assert(live() && report.transportInvocations < 24);
        report.transportInvocations++;
        if (mode === 'live') report.actualProviderCalls++;
        return http(...args);
      }, { ...controls, available: () => live() && controls.available(),
        reservedTokens: config.maxInputTokens + config.maxOutputTokens,
        inputTokenUpperBound: body => {
          assert.equal(sha256(body), row.requestSha256);
          assert(live()); return bounds.get(row.requestSha256);
        },
        rateLimited: async () => { rateLimited = true; },
        confirmUsage: async observed => {
          const result = await controls.confirmUsage(observed);
          if (result === 'confirmed') usage = observed;
          return result;
        },
      });
      return transport.dispatch(row.messages, requestBudget);
    });
    const outcome = dispatch ? await dispatch : { kind: 'unknown', physical: 'unknown' };
    const elapsedMs = Math.max(0, clock.now() - started);
    const observation = { provider: 'openai', outcome: outcome.kind === 'response' ? 'response-observed' : 'unconfirmed',
      physicallySettled: outcome.physical === 'stopped', elapsedMs, withinDeliveryDeadline: elapsedMs < 15000,
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
