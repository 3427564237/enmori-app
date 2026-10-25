import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadCases } from './evaluation.mjs';
import { CloudBudget, mockAuthorization, validateCloudAuthorization, reservationMicroUsd } from './cloud-budget.mjs';
import { runSyntheticCloud, createGeminiHttp, claimCloudAuthorization } from './cloud-runner.mjs';

const instant = '2026-10-25T07:00:00.000Z', corpusSha256 = loadCases().corpusSha256, sourceBundleSha256 = 'test-source-bundle';
const grant = () => mockAuthorization(corpusSha256, sourceBundleSha256, instant);
const setup = (overrides = {}) => ({ mode: 'mock', authorization: grant(), passes: 2, maxUsd: 1,
  sourceBundleSha256, now: () => instant, save: () => {}, ...overrides });
const validGeneration = (extra = {}) => Response.json({ modelVersion: 'gemini-3.8-flash-mock-only',
  candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{
    text: '{"schemaVersion":"ai_assistant_message_v1","message":"Mock only."}' }] } }],
  usageMetadata: { promptTokenCount: 512, candidatesTokenCount: 20, thoughtsTokenCount: 12, totalTokenCount: 544 }, ...extra });
const fakeHttp = async req => req.url.endsWith(':countTokens') ? Response.json({ totalTokens: 512 }) : validGeneration();
const verify = (raw, extra = {}) => validateCloudAuthorization(raw, { corpusSha256, sourceBundleSha256,
  passes: 2, maxUsd: 1, now: instant, mock: true, ...extra });

test('cloud eligibility, exact corpus/source, price and time are mandatory; mock approval never enables cloud', () => {
  assert.throws(() => verify(grant(), { mock: false }), /NOT_APPROVED/);
  for (const change of [ { service: 'free-tier' }, { contributorEnrollment: true }, { billingVerified: false },
    { operatorEligibilityVerified: false }, { model: 'gemini-latest' }, { dataScope: 'real-records' },
    { corpusSha256: 'changed' }, { sourceBundleSha256: 'changed' }, { maxOutputTokens: 9999 },
    { maxInputTokens: 9999 }, { maxGenerationRequests: 65 }, { maxCountRequests: 65 }, { maxPasses: 3 },
    { maxUsd: 2 }, { inputPerMillion: 0.1 }, { pricingVerifiedOn: '2026-10-24' },
    { expiresAt: '2026-10-24T00:00:00Z' }, { apiKey: 'must-not-be-in-file' } ]) {
    assert.throws(() => verify({ ...grant(), ...change }));
  }
  assert.throws(() => verify(grant(), { now: '2027-01-01T00:00:00Z' }));
});

test('generation reserves cost before dispatch; hard 64-attempt cap and no refund/reset API', () => {
  const budget = new CloudBudget(verify(grant()));
  assert.throws(() => budget.reserveGeneration(512), /COUNT_REQUIRED/);
  for (let i = 0; i < 64; i++) { budget.reserveCount(); budget.reserveGeneration(8192); }
  assert.deepEqual(budget.snapshot(), { countAttempts: 64, generationAttempts: 64,
    reservedMicroUsd: 884736, reservedUsd: 0.884736, maxUsd: 1 });
  assert.throws(() => budget.reserveCount(), /BUDGET_EXHAUSTED/);
  assert.throws(() => budget.reserveGeneration(512), /BUDGET_EXHAUSTED/);
  assert.equal(budget.refund, undefined); assert.equal(budget.reset, undefined);
  const small = new CloudBudget(verify(grant(), { maxUsd: 0.02 }));
  small.reserveCount(); small.reserveGeneration(512);
  assert.throws(() => small.reserveCount(), /BUDGET_EXHAUSTED/);
  assert.equal(small.snapshot().reservedMicroUsd, reservationMicroUsd);
});

test('two passes use fixed 32-case corpus, 64 serial counts/generations and persisted reservations before each call', async () => {
  const files = new Map(); let counts = 0, generations = 0, active = 0, peak = 0;
  const report = await runSyntheticCloud(setup({ save: (name, value) => {
    assert.equal(files.has(name), false); files.set(name, structuredClone(value));
  }, http: async req => {
    active++; peak = Math.max(peak, active);
    const count = req.url.endsWith(':countTokens'), body = JSON.parse(req.body);
    if (count) {
      counts++;
      assert.equal([...files.keys()].filter(k => k.endsWith('.count-intent.json')).length, counts);
      assert.equal(body.generateContentRequest.model, 'models/gemini-3.8-flash');
      assert.equal(body.generateContentRequest.serviceTier, 'standard');
    } else {
      generations++;
      const entries = [...files.entries()].filter(([k]) => k.endsWith('.generation-intent.json'));
      assert.equal(entries.length, generations);
      assert.equal(entries.at(-1)[1].budget.reservedMicroUsd, generations * reservationMicroUsd);
      assert.equal(body.generationConfig.maxOutputTokens, 2048); assert.equal(body.store, false);
    }
    await Promise.resolve(); active--;
    return count ? Response.json({ totalTokens: 512 }) : validGeneration();
  } }));
  assert.equal(peak, 1); assert.equal(counts, 64); assert.equal(generations, 64);
  assert.equal(report.rows.length, 64); assert.equal(new Set(report.rows.map(r => r.id)).size, 64);
  assert.equal(report.stopReason, 'case-budget-exhausted'); assert.equal(report.realGenerationCalls, 0);
  assert.ok(report.rows.every(row => row.semanticReview === 'unreviewed'));
});

test('unknown generation retains full reservation and stops with one attempt, no retry or fallback', async () => {
  let counts = 0, generations = 0;
  const report = await runSyntheticCloud(setup({ http: async req => {
    if (req.url.endsWith(':countTokens')) { counts++; return Response.json({ totalTokens: 512 }); }
    generations++; throw Error('synthetic lost response');
  } }));
  assert.equal(counts, 1); assert.equal(generations, 1);
  assert.equal(report.stopReason, 'GENERATION_UNCONFIRMED');
  assert.equal(report.budget.reservedMicroUsd, reservationMicroUsd);
  assert.equal(report.rows[0].observation.outcome, 'unconfirmed');
});

test('unknown/malformed/over-limit count prevents generation; no partial prompt truncation', async () => {
  for (const response of [() => new Response('invalid'), () => Response.json({ totalTokens: 8193 }),
    () => Response.json({}), () => { throw Error('network'); }]) {
    let generations = 0, countRequests = 0;
    const report = await runSyntheticCloud(setup({ http: async req => {
      if (req.url.endsWith(':countTokens')) { countRequests++; return response(); }
      generations++; return validGeneration();
    } }));
    assert.equal(countRequests, 1); assert.equal(generations, 0);
    assert.equal(report.budget.reservedMicroUsd, 0); assert.notEqual(report.stopReason, 'case-budget-exhausted');
  }
});

test('count/usage/model anomalies and cancellation stop, while existing reservations remain', async () => {
  for (const extra of [ { modelVersion: 'another-model' }, { usageMetadata: {} },
    { usageMetadata: { promptTokenCount: 8193, candidatesTokenCount: 20, thoughtsTokenCount: 12 } },
    { usageMetadata: { promptTokenCount: 512, candidatesTokenCount: 2048, thoughtsTokenCount: 1 } } ]) {
    let calls = 0;
    const report = await runSyntheticCloud(setup({ http: async req => {
      calls++; return req.url.endsWith(':countTokens') ? Response.json({ totalTokens: 512 }) : validGeneration(extra);
    } }));
    assert.equal(calls, 2); assert.equal(report.budget.reservedMicroUsd, reservationMicroUsd);
    assert.notEqual(report.stopReason, 'case-budget-exhausted');
  }
  const controller = new AbortController(); let calls = 0;
  const cancelled = await runSyntheticCloud(setup({ signal: controller.signal, http: async () => {
    calls++; controller.abort(); return Response.json({ totalTokens: 512 });
  } }));
  assert.equal(calls, 1); assert.equal(cancelled.stopReason, 'CANCELLED');
  assert.equal(cancelled.budget.generationAttempts, 0);
});

test('failed evidence write before generation causes zero generation calls and preserves reservation', async () => {
  let generationCalls = 0;
  const report = await runSyntheticCloud(setup({ save: name => {
    if (name.endsWith('.generation-intent.json')) throw Error('EVIDENCE_WRITE_FAILED');
  }, http: async req => {
    if (req.url.endsWith(':generateContent')) generationCalls++;
    return fakeHttp(req);
  } }));
  assert.equal(generationCalls, 0); assert.equal(report.budget.reservedMicroUsd, reservationMicroUsd);
  assert.equal(report.stopReason, 'EVIDENCE_WRITE_FAILED');
});

test('credential is only in the request header, fixed URL and redirect guard; vendor echoes are redacted from every artifact', async () => {
  const secret = 'SYNTHETIC_KEY_NOT_REAL_123456789'; let requests = 0;
  const http = createGeminiHttp(secret, async (url, init) => {
    requests++; assert.equal(init.redirect, 'error'); assert.equal(init.headers['x-goog-api-key'], secret);
    assert.equal(url.includes(secret), false); assert.equal(init.body.includes(secret), false);
    return url.endsWith(':countTokens') ? Response.json({ totalTokens: 512 }) : new Response(`echo ${secret}`, { status: 503 });
  });
  for (const url of ['http://generativelanguage.googleapis.com/v1beta/foo', 'https://evil.invalid',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=x'])
    await assert.rejects(http({ url, body: '{}' }, new AbortController().signal), /PROVIDER_URL_FORBIDDEN/);
  assert.equal(requests, 0);
  const artifacts = [];
  const report = await runSyntheticCloud(setup({ secret, http, save: (_name, value) => artifacts.push(value) }));
  assert.equal(JSON.stringify([...artifacts, report]).includes(secret), false);
  assert.equal(report.rows[0].observation.credentialRedacted, true);
  assert.equal(requests, 2);
});

test('an authorization reference cannot be replayed even by changing output/grant fields', t => {
  const parent = mkdtempSync(join(tmpdir(), 'enmori-cloud-claim-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const directory = join(parent, 'ledger'), auth = grant();
  const marker = claimCloudAuthorization(directory, auth);
  assert.match(readFileSync(marker, 'utf8'), /Single use/);
  assert.throws(() => claimCloudAuthorization(directory, { ...auth, maxUsd: 0.5 }), /ALREADY_CLAIMED_OR_UNCONFIRMED/);
});

test('CLI defaults to zero-call dry mode and rejects cloud before any key/network/output without explicit scope', () => {
  const output = execFileSync(process.execPath, ['tool/ai-companion-eval/cloud-run.mjs'], { encoding: 'utf8',
    env: { ...process.env, ENMORI_SYNTHETIC_GEMINI_API_KEY: 'SYNTHETIC_KEY_NOT_REAL_123456789' } });
  const dry = JSON.parse(output); assert.equal(dry.mode, 'dry'); assert.equal(dry.realCalls, 0);
  assert.equal(output.includes('SYNTHETIC_KEY_NOT_REAL'), false);
  const denied = spawnSync(process.execPath, ['tool/ai-companion-eval/cloud-run.mjs', '--mode', 'cloud', '--out', '/should-not-create'], { encoding: 'utf8' });
  assert.equal(denied.status, 2); assert.match(denied.stderr, /EXPLICIT_CLOUD_AUTHORIZATION_REQUIRED/);
});
