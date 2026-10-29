import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGroqCase, buildGroqRequest, loadGroqCases, createGroqHttp, observeGroq, groqModelForProfile } from './groq-evaluation.mjs';
import { validGroqAuthorization, withinGroqRequestBound, groqRunPolicy } from './groq-run-policy.mjs';

test('Qwen 3.8 comparison changes only the model ID for all 24 original medium requests', async () => {
  for (const fixture of loadGroqCases()) {
    const before = await prepareGroqCase(fixture.id, 'baseline-medium');
    const after = await prepareGroqCase(fixture.id, 'qwen38-medium');
    assert.deepEqual(after, before);
    const baseline = buildGroqRequest(before.prompt, 'baseline-medium');
    const qwen = buildGroqRequest(after.prompt, 'qwen38-medium');
    assert.equal(qwen.body.replace('"model":"qwen/qwen3.8-27b"', '"model":"openai/gpt-oss-120b"'), baseline.body);
    assert.equal(withinGroqRequestBound(qwen.body, 'qwen38-medium'), true);
    assert.equal(JSON.parse(qwen.body).include_reasoning, false);
  }
  assert.equal(groqModelForProfile('baseline-medium'), 'openai/gpt-oss-120b');
  assert.equal(groqModelForProfile('qwen38-medium'), 'qwen/qwen3.8-27b');
});

test('Qwen accepts only its fixed model and original golden messages', async () => {
  const { prompt } = await prepareGroqCase(loadGroqCases()[0].id, 'qwen38-medium');
  let calls = 0;
  const response = model => Response.json({ model, choices: [{ index: 0, finish_reason: 'stop',
    message: { role: 'assistant', content: JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message: 'Synthetic.' }) } }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } });
  const http = createGroqHttp('synthetic_test_key', async () => { calls++; return response('qwen/qwen3.8-27b'); }, 'qwen38-medium');
  await assert.rejects(http(buildGroqRequest(prompt, 'baseline-medium'), new AbortController().signal));
  assert.equal(calls, 0);
  assert.equal((await observeGroq(prompt, http, { profile: 'qwen38-medium' })).protocol.eligible, true);
  const wrong = await observeGroq(prompt, async () => response('openai/gpt-oss-120b'), { profile: 'qwen38-medium' });
  assert.equal(wrong.protocol.eligible, false);
  assert.equal(wrong.observation.outcome, 'unconfirmed');
});

test('Qwen requires a new model-bound, zero-cost 24-call grant; earlier grants cannot authorize it', () => {
  const now = Date.now(), model = 'qwen/qwen3.8-27b';
  const auth = { approvedBy: 'LI', scope: 'groq-fixed24-qwen38-medium-20261028', profile: 'qwen38-medium',
    maximumCompletionTokens: 2048, reasoningEffort: 'medium', freePlanVerified: true, maxUsd: 0,
    maxRequests: 24, model, corpusSha256: 'synthetic', approvalReference: 'new-direct-user-grant',
    verifiedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60000).toISOString() };
  assert.equal(validGroqAuthorization(auth, 'qwen38-medium', 'synthetic', model, now), true);
  for (const change of [{ model: 'openai/gpt-oss-120b' }, { profile: 'constraints-v3' }, { scope: 'groq-fixed24-baseline-medium-20261028' },
    { maxRequests: 25 }, { maxUsd: 1 }, { reasoningEffort: 'none' }]) {
    assert.equal(validGroqAuthorization({ ...auth, ...change }, 'qwen38-medium', 'synthetic', model, now), false);
  }
  assert.deepEqual(groqRunPolicy('qwen38-medium'), groqRunPolicy('baseline-medium'));
});
