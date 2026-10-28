import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claimCloudAuthorization } from './cloud-runner.mjs';
import { createGroqPacer, groqRunPolicy, validGroqAuthorization, withinGroqRequestBound, withinGroqUsageBound } from './groq-run-policy.mjs';

const now = Date.parse('2026-10-28T09:00:00Z');
const model = 'openai/gpt-oss-120b', corpus = 'synthetic-corpus';
const auth = profile => ({ approvedBy: 'LI', scope: `groq-fixed24-${profile}-20261028`, profile,
  maximumCompletionTokens: profile === 'goal-v2' ? 1024 : 2048, freePlanVerified: true, maxUsd: 0,
  maxRequests: 24, model, corpusSha256: corpus, approvalReference: 'synthetic-only',
  verifiedAt: '2026-10-28T08:59:00Z', expiresAt: '2026-10-28T09:30:00Z' });

test('baseline-medium requires its own fresh, specifically scoped authorization', () => {
  const baseline = auth('baseline'), goal = auth('goal-v2');
  assert.equal(validGroqAuthorization(baseline, 'baseline', corpus, model, now), true);
  assert.equal(validGroqAuthorization(goal, 'goal-v2', corpus, model, now), true);
  assert.equal(validGroqAuthorization(baseline, 'baseline-medium', corpus, model, now), false);
  assert.equal(validGroqAuthorization(goal, 'baseline-medium', corpus, model, now), false);
  const medium = { ...auth('baseline-medium'), reasoningEffort: 'medium' };
  assert.equal(validGroqAuthorization(medium, 'baseline-medium', corpus, model, now), true);
  for (const change of [
    { profile: 'baseline' }, { scope: 'groq-fixed24-baseline-20261028' }, { reasoningEffort: 'low' },
    { reasoningEffort: undefined }, { freePlanVerified: false }, { maxUsd: 1 }, { maxRequests: 25 },
    { approvalReference: '' }, { approvalReference: '   ' }, { approvalReference: {} },
    { verifiedAt: '2026-10-28T07:59:00Z' }, { expiresAt: '2026-10-28T09:00:00Z' },
  ]) assert.equal(validGroqAuthorization({ ...medium, ...change }, 'baseline-medium', corpus, model, now), false);
});

test('a previously claimed reference cannot authorize medium by editing its profile in the shared ledger', t => {
  const root = mkdtempSync(join(tmpdir(), 'groq-policy-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ledger = join(root, 'claims'), baseline = auth('baseline');
  claimCloudAuthorization(ledger, baseline);
  const reused = { ...auth('baseline-medium'), reasoningEffort: 'medium', approvalReference: baseline.approvalReference };
  assert.equal(validGroqAuthorization(reused, 'baseline-medium', corpus, model, now), true);
  assert.throws(() => claimCloudAuthorization(ledger, reused), /AUTHORIZATION_ALREADY_CLAIMED_OR_UNCONFIRMED/);
  claimCloudAuthorization(ledger, { ...reused, approvalReference: 'separately-authorized-synthetic-reference' });
});

test('the medium profile enforces a 61-second physical-start interval without waiting in a test', async () => {
  let clock = 500, waited = 0;
  const pacer = createGroqPacer('baseline-medium', () => clock, async ms => { waited += ms; clock += ms; });
  await pacer.waitForSlot();
  pacer.recordStart();
  clock += 100;
  assert.throws(() => pacer.recordStart(), /GROQ_DISPATCH_TOO_EARLY/);
  await pacer.waitForSlot();
  assert.equal(waited, 60900);
  pacer.recordStart();
  clock += 60999;
  assert.throws(() => pacer.recordStart(), /GROQ_DISPATCH_TOO_EARLY/);
  clock++;
  pacer.recordStart();
  assert.equal(groqRunPolicy('baseline').minimumSpacingMs, 30100);
  assert.equal(groqRunPolicy('goal-v2').minimumSpacingMs, 30100);
});

test('the medium profile enforces its whole-request and reported-usage 8k reservation', () => {
  const policy = groqRunPolicy('baseline-medium');
  assert.equal(policy.maximumCompletionTokens, 2048);
  assert.equal(policy.reasoningEffort, 'medium');
  assert.equal(policy.minimumSpacingMs, 61000);
  assert.equal(policy.maxRequestBodyBytes + policy.maximumCompletionTokens + 512, 8000);
  assert.equal(withinGroqRequestBound('x'.repeat(5440), 'baseline-medium'), true);
  assert.equal(withinGroqRequestBound('x'.repeat(5441), 'baseline-medium'), false);
  assert.equal(withinGroqRequestBound('中'.repeat(1814), 'baseline-medium'), false);
  assert.equal(withinGroqUsageBound({ inputTokens: 5440, outputTokens: 2048 }, 'baseline-medium'), true);
  assert.equal(withinGroqUsageBound({ inputTokens: 5441, outputTokens: 2048 }, 'baseline-medium'), false);
  assert.equal(withinGroqUsageBound({ inputTokens: 5440, outputTokens: 2049 }, 'baseline-medium'), false);
  assert.equal(withinGroqUsageBound({ inputTokens: 0 }, 'baseline-medium'), false);
  assert.equal(withinGroqUsageBound({ inputTokens: -1, outputTokens: 0 }, 'baseline-medium'), false);
  assert.equal(groqRunPolicy('baseline').maxRequestBodyBytes, 1900);
  assert.equal(groqRunPolicy('goal-v2').maxRequestBodyBytes, 2500);
  assert.equal(groqRunPolicy('baseline').maxInputTokens, 1952);
  assert.equal(groqRunPolicy('goal-v2').maxInputTokens, 2976);
  assert.throws(() => groqRunPolicy('unknown'), /GROQ_PROFILE_INVALID/);
});
