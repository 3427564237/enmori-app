import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LocalChatTransport } from '../../backend/dist/src/ai-runtime/infrastructure/local-chat-transport.js';
import { loadCases, prepareCase, buildEvaluationRequest, protocolAssessment, costObservation, blankReview,
  rubricDimensions, validateReview, sha256 } from './evaluation.mjs';

test('all 24 current-prompt HTTP requests remain byte-identical to the pre-shared-lane production capture', async () => {
  const golden = JSON.parse(readFileSync(new URL('./fixtures/current-prompt-requests.json', import.meta.url)));
  const fixtures = loadCases().cases.filter(c => c.track === 'current-prompt');
  assert.equal(golden.sourceCommit, '24f913dd26afa9af82f7c31ac9eefcf543b64140');
  assert.deepEqual(golden.cases.map(c => c.id), fixtures.map(c => c.id));
  for (const [index, fixture] of fixtures.entries()) {
    let captured;
    const transport = new LocalChatTransport('qwen3.5:9b', async (url, init) => {
      captured = { id: fixture.id, url, method: init.method, redirect: init.redirect, cache: init.cache,
        headers: init.headers, body: init.body };
      return Response.json({ model: 'qwen3.5:9b', done: true, message: { content: '{}' } });
    });
    await transport.generate(fixture.input, { signal: new AbortController().signal, deadline: 60000, remainingMs: () => 60000 });
    assert.deepEqual(captured, golden.cases[index], fixture.id);
  }
});

test('preserved inputs remain byte-identical and all 32 fixtures compile; baseline requests match production', async () => {
  const { cases, preservedSha256 } = loadCases();
  assert.equal(preservedSha256, '837d0a2076e86736e9e46f9d950ff0bcaaec1e1f10c825bf6aee9476e281311b');
  assert.equal(cases.filter(c => c.track === 'current-prompt').length, 24);
  assert.equal(cases.filter(c => c.track === 'candidate-context').length, 8);
  for (const fixture of cases) {
    const prepared = await prepareCase(fixture);
    if (fixture.track === 'current-prompt')
      assert.deepEqual(JSON.parse(buildEvaluationRequest('ollama-baseline', prepared.prompt).body), prepared.capturedLocalRequest);
    assert.ok(buildEvaluationRequest('gemini-candidate', prepared.prompt));
    assert.equal(prepared.prompt.turns.at(-1).text, fixture.input.currentMessage);
  }
});

test('raw valid JSON does not override incomplete, late or unconfirmed provider outcomes', () => {
  const rawText = '{"schemaVersion":"ai_assistant_message_v1","message":"an irrelevant but valid answer"}';
  for (const observation of [
    { rawText, outcome: 'unconfirmed', withinDeliveryDeadline: true },
    { rawText, outcome: 'response-observed', withinDeliveryDeadline: false },
    { rawText, outcome: 'response-observed', withinDeliveryDeadline: true, failure: 'incomplete' },
  ]) { const p = protocolAssessment(observation); assert.equal(p.valid, true); assert.equal(p.eligible, false); }
  assert.equal(protocolAssessment({ rawText: '{"message":"missing schema"}' }).valid, false);
});

test('cost uses thought tokens and does not call missing usage, mock cost or local host cost zero', () => {
  const obs = { provider: 'gemini-candidate', usage: { inputTokens: 1000, outputTokens: 100, thinkingTokens: 300 } };
  assert.equal(costObservation(obs, false).estimateUsd, 0.00225);
  assert.equal(costObservation(obs, false).billedUsd, null);
  assert.equal(costObservation(obs, true).estimateUsd, null);
  assert.equal(costObservation({ ...obs, usage: { inputTokens: 1000, outputTokens: 100 } }, false).estimateUsd, null);
  assert.equal(costObservation({ provider: 'ollama-baseline' }, false).hostCost, 'not-measured');
});

test('review binds exact report/result, requires evidence, and rejects mock semantic passes', () => {
  const rows = [{ id: 'case-one', protocol: { eligible: true } }], report = { mode: 'mock', rows, intendedCases: 1 };
  const review = blankReview('abc', rows);
  assert.equal(review.rows[0].verdict, 'unreviewed'); assert.equal(review.independent, false);
  assert.throws(() => validateReview(report, 'abc', review));
  review.reviewer = 'Independent QA'; review.independent = true;
  assert.equal(validateReview(report, 'abc', review).unreviewed, 1);
  review.rows[0].verdict = 'pass'; review.rows[0].rationale = 'Answers the actual goal.'; review.rows[0].evidence = ['quoted phrase'];
  review.rows[0].dimensions = Object.fromEntries(rubricDimensions.map(d => [d, 2]));
  assert.throws(() => validateReview(report, 'abc', review), /SEMANTIC_PASS_NOT_SUPPORTED/);
  assert.equal(validateReview({ ...report, mode: 'local' }, 'abc', review).pass, 1);
  assert.throws(() => validateReview({ ...report, mode: 'local' }, 'wrong-hash', review), /REVIEW_BINDING_INVALID/);
  assert.throws(() => validateReview({ ...report, mode: 'local', rows: [{ ...rows[0], changed: true }] }, 'abc', review), /REVIEW_ROW_INVALID/);
  review.rows[0].dimensions.relevance = 1;
  assert.throws(() => validateReview({ ...report, mode: 'local' }, 'abc', review), /SEMANTIC_PASS_NOT_SUPPORTED/);
});
