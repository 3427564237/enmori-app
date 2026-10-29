import test from 'node:test';
import assert from 'node:assert/strict';
import { constraintsPromptCandidate } from './constraints-prompt-candidate.mjs';
import { prepareGroqCase, buildGroqRequest, loadGroqCases, createGroqHttp } from './groq-evaluation.mjs';
import { validGroqAuthorization, withinGroqRequestBound, groqRunPolicy } from './groq-run-policy.mjs';

test('constraints-v3 changes only system instructions and retains exact Persona/history and all settings', async () => {
  for (const fixture of loadGroqCases()) {
    const baseline = await prepareGroqCase(fixture.id, 'baseline-medium');
    const candidate = await prepareGroqCase(fixture.id, 'constraints-v3');
    const before = JSON.parse(buildGroqRequest(baseline.prompt, 'baseline-medium').body);
    const request = buildGroqRequest(candidate.prompt, 'constraints-v3');
    const after = JSON.parse(request.body);
    const split = before.messages[0].content.indexOf(' Presentation preferences: ');
    assert.equal(after.messages[0].content, constraintsPromptCandidate + (split < 0 ? '' : before.messages[0].content.slice(split)));
    assert.deepEqual(after.messages.slice(1), before.messages.slice(1));
    after.messages[0] = before.messages[0];
    assert.deepEqual(after, before);
    assert.deepEqual(candidate.fixture, baseline.fixture);
    assert.equal(withinGroqRequestBound(request.body, 'constraints-v3'), true);
  }
});

test('constraints-v3 cannot dispatch another profile or arbitrary private messages', async () => {
  let calls = 0;
  const http = createGroqHttp('synthetic_test_key', async () => { calls++; return new Response(); }, 'constraints-v3');
  const original = await prepareGroqCase(loadGroqCases()[0].id, 'baseline-medium');
  await assert.rejects(http(buildGroqRequest(original.prompt, 'baseline-medium'), new AbortController().signal));
  assert.throws(() => buildGroqRequest({ ...original.prompt, turns: [{ role: 'user', text: 'private text' }] }, 'constraints-v3'));
  assert.equal(calls, 0);
});

test('constraints-v3 requires a fresh profile-specific grant with unchanged zero-cost bounds', () => {
  const now = Date.now();
  const auth = { approvedBy: 'LI', scope: 'groq-fixed24-constraints-v3-20261028', profile: 'constraints-v3',
    maximumCompletionTokens: 2048, reasoningEffort: 'medium', freePlanVerified: true, maxUsd: 0,
    maxRequests: 24, model: 'openai/gpt-oss-120b', corpusSha256: 'fake-corpus', approvalReference: 'new-explicit-grant',
    verifiedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60000).toISOString() };
  assert.equal(validGroqAuthorization(auth, 'constraints-v3', 'fake-corpus', auth.model, now), true);
  for (const change of [{ profile: 'baseline-medium' }, { scope: 'groq-fixed24-baseline-medium-20261028' },
    { reasoningEffort: 'low' }, { maxRequests: 25 }, { maxUsd: 1 }, { freePlanVerified: false }]) {
    assert.equal(validGroqAuthorization({ ...auth, ...change }, 'constraints-v3', 'fake-corpus', auth.model, now), false);
  }
  assert.deepEqual(groqRunPolicy('constraints-v3'), groqRunPolicy('baseline-medium'));
});
