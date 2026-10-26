import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadCases } from './evaluation.mjs';
import { runSyntheticCloud } from './cloud-runner.mjs';
import { FreeBudget, mockFreeAuthorization, validateFreeAuthorization,
  freeSelection, freeSelectionSha256, freeMinimumSpacingMs } from './free-cloud-scope.mjs';

const instant = '2026-10-25T08:00:00.000Z', corpus = loadCases(), sourceBundleSha256 = 'a'.repeat(64);
const grant = () => mockFreeAuthorization(corpus.corpusSha256, sourceBundleSha256, instant);
const binding = { corpusSha256: corpus.corpusSha256, sourceBundleSha256, passes: 1, maxUsd: 0, now: instant, mock: true };
const good = request => request.url.endsWith(':countTokens') ? Response.json({ totalTokens: 512 }) : Response.json({
  modelVersion: 'gemini-3.8-flash-mock-only', candidates: [{ finishReason: 'STOP', content: { role: 'model',
    parts: [{ text: '{"schemaVersion":"ai_assistant_message_v1","message":"MOCK ONLY"}' }] } }],
  usageMetadata: { promptTokenCount: 512, candidatesTokenCount: 20, thoughtsTokenCount: 12, totalTokenCount: 544 } });
function setup(extra = {}) {
  let time = 0;
  return { mode: 'mock', authorization: grant(), passes: 1, maxUsd: 0, sourceBundleSha256,
    now: () => instant, monotonicNow: () => time, wait: async ms => { time += ms; },
    save() {}, http: async req => good(req), ...extra };
}

test('free evidence binds a separate zero-spend project/key/corpus/selection schema', () => {
  assert.equal(validateFreeAuthorization(grant(), binding).runMaxUsd, 0);
  assert.throws(() => validateFreeAuthorization(grant(), { ...binding, mock: false }), /NOT_APPROVED/);
  for (const change of [{ billingDisabled: false }, { freeTierVerified: false }, { service: 'gemini-developer-api-standard-paid' },
    { projectReference: 'enmori-rmvp-controlled' }, { credentialProjectReference: 'another-project' },
    { credentialApiRestriction: 'none' }, { credentialFileSha256: 'unknown' }, { credentialEvidenceSha256: 'unknown' },
    { projectEvidenceSha256: 'unknown' }, { maxUsd: 1 }, { maxCountRequests: 64 }, { maxGenerationRequests: 9 },
    { maxPasses: 2 }, { selectionSha256: 'different' }, { model: 'gemini-3.5-flash-lite' },
    { verifiedAt: '2026-10-25T06:00:00.000Z' }, { verifiedAt: '2026-10-25T09:00:00.000Z' },
    { operatorEligibilityVerified: false }, { billingVerified: true }])
    assert.throws(() => validateFreeAuthorization({ ...grant(), ...change }, binding));
  assert.throws(() => validateFreeAuthorization(grant(), { ...binding, passes: 2 }));
  assert.throws(() => validateFreeAuthorization(grant(), { ...binding, maxUsd: 1 }));
});

test('free budget admits only eight counts and eight generations, no paid reservation or reset', () => {
  const budget = new FreeBudget();
  assert.throws(() => budget.reserveGeneration(1));
  for (let i = 0; i < 8; i++) { budget.reserveCount(); budget.reserveGeneration(8192); }
  assert.deepEqual(budget.snapshot(), { countAttempts: 8, generationAttempts: 8, reservedMicroUsd: 0, reservedUsd: 0, maxUsd: 0 });
  assert.throws(() => budget.reserveCount()); assert.throws(() => budget.reserveGeneration(1));
  assert.equal(budget.reset, undefined); assert.equal(budget.refund, undefined);
});

test('one unchanged eight-case subset; sixteen serial starts paced together outside measured provider latency', async () => {
  let time = 0, active = false; const starts = [], saved = new Map();
  const report = await runSyntheticCloud(setup({ monotonicNow: () => time, wait: async ms => { time += ms; },
    save: (name, value) => saved.set(name, value), http: async request => {
      assert.equal(active, false); active = true; starts.push(time);
      const body = JSON.parse(request.body), count = request.url.endsWith(':countTokens');
      const requestBody = count ? body.generateContentRequest : body;
      assert.equal(requestBody.serviceTier, 'standard'); assert.equal(requestBody.store, false);
      assert.equal(requestBody.generationConfig.maxOutputTokens, 2048);
      assert.equal(requestBody.generationConfig.thinkingConfig.thinkingLevel, 'low');
      assert.equal([...saved.keys()].filter(k => k.endsWith(count ? '.count-intent.json' : '.generation-intent.json')).length,
        Math.ceil(starts.length / 2));
      time += 50; active = false; return good(request);
    } }));
  assert.equal(starts.length, 16);
  assert(starts.slice(1).every((at, i) => at - starts[i] >= freeMinimumSpacingMs));
  assert.deepEqual(report.rows.map(row => row.caseId), freeSelection.map(item => item.id));
  assert.equal(report.intendedCases, 8); assert.equal(report.selectionSha256, freeSelectionSha256);
  assert.equal(report.corpusSha256, '1f216f2d8a4facafaac55eb9567c2136864999cc68c6759e831a81693ff0912a');
  assert.equal(report.realGenerationCalls, 0); assert.equal(report.realCountCalls, 0);
  assert.equal(report.budget.reservedUsd, 0); assert.equal(report.stopReason, 'case-budget-exhausted');
});

test('429, 402, 403 or ambiguous outcomes stop at either boundary without retry or paid fallback', async () => {
  for (const status of [429, 402, 403, 503]) for (const boundary of ['count', 'generation']) {
    let calls = 0;
    const report = await runSyntheticCloud(setup({ http: async request => {
      calls++;
      const match = request.url.endsWith(':countTokens') === (boundary === 'count');
      return match ? new Response('{"error":"synthetic"}', { status }) : good(request);
    } }));
    assert.equal(calls, boundary === 'count' ? 1 : 2);
    assert.notEqual(report.stopReason, 'case-budget-exhausted'); assert.equal(report.budget.maxUsd, 0);
  }
});

test('expiry, cancellation or changed evidence during pacing stops before generation and keeps reservation', async () => {
  for (const kind of ['expire', 'cancel', 'binding']) {
    const controller = new AbortController(), authorization = grant();
    let time = 0, at = instant, changed = false, calls = 0;
    const report = await runSyntheticCloud(setup({ authorization, signal: controller.signal,
      now: () => at, monotonicNow: () => time, wait: async ms => {
        time += ms;
        if (kind === 'expire') at = authorization.expiresAt;
        if (kind === 'cancel') controller.abort();
        if (kind === 'binding') changed = true;
      }, verifyExternal: () => { if (changed) throw Error('SOURCE_BUNDLE_CHANGED'); },
      http: async request => { calls++; return good(request); } }));
    assert.equal(calls, 1); assert.equal(report.budget.generationAttempts, 1);
    assert.equal(report.stopReason, { expire: 'AUTHORIZATION_EXPIRED', cancel: 'CANCELLED', binding: 'SOURCE_BUNDLE_CHANGED' }[kind]);
  }
});

test('superseded paid execution is denied before supplied HTTP, and default CLI is free dry', async () => {
  let calls = 0;
  await assert.rejects(runSyntheticCloud(setup({ mode: 'cloud', http: async request => { calls++; return good(request); } })), /PAID_EXECUTION_SUPERSEDED/);
  assert.equal(calls, 0);
  const dry = JSON.parse(execFileSync(process.execPath, ['tool/ai-companion-eval/cloud-run.mjs'], { encoding: 'utf8' }));
  assert.equal(dry.realCalls, 0); assert.equal(dry.cases, 8); assert.equal(dry.maxUsd, 0); assert.equal(dry.passes, 1);
  const denied = spawnSync(process.execPath, ['tool/ai-companion-eval/cloud-run.mjs', '--mode', 'free', '--out', '/should-not-create'], { encoding: 'utf8' });
  assert.equal(denied.status, 2); assert.match(denied.stderr, /EXPLICIT_FREE_AUTHORIZATION_REQUIRED/);
});
