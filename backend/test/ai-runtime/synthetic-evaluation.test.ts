import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvaluationRequest, observeSyntheticEvaluation } from '../../src/ai-runtime/infrastructure/synthetic-evaluation-adapters.js';
import type { SyntheticPrompt } from '../../src/ai-runtime/ports/synthetic-evaluation.js';

const prompt: SyntheticPrompt = { scope: 'synthetic-evaluation-only', system: 'Synthetic system', turns: [
  { role: 'user', text: 'I like tea.' }, { role: 'assistant', text: 'You live in Paris.' },
  { role: 'user', text: 'That is wrong. I did not tell you where I live. Reply in English.' },
] };
const jsonText = '{"schemaVersion":"ai_assistant_message_v1","message":"synthetic text"}';
const gemini = (overrides: object = {}) => Response.json({ modelVersion: 'gemini-3.8-flash-test-revision',
  candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: jsonText }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 5, totalTokenCount: 35 }, ...overrides });

test('Gemini maps ordered history and correction, fixed model and budget, without tools or credentials', () => {
  const req = buildEvaluationRequest('gemini-candidate', prompt), body = JSON.parse(req.body);
  assert.equal(req.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(body.systemInstruction.parts[0].text, prompt.system);
  assert.deepEqual(body.contents, prompt.turns.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })));
  assert.equal(body.generationConfig.maxOutputTokens, 2048);
  assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: 'low', includeThoughts: false });
  for (const key of ['tools', 'toolConfig', 'cachedContent', 'safetySettings', 'apiKey']) assert.equal(body[key], undefined);
  assert.equal(req.url.includes('key='), false);
});

test('unapproved input and malformed turn order cannot reach either HTTP client', async () => {
  let calls = 0;
  for (const provider of ['ollama-baseline', 'gemini-candidate'] as const) {
    for (const input of [{ ...prompt, scope: 'product-data' }, { ...prompt, turns: [prompt.turns[1]] },
      { ...prompt, system: 'x'.repeat(25_000) }]) {
      const result = await observeSyntheticEvaluation(provider, input as SyntheticPrompt, async () => { calls++; return gemini(); });
      assert.equal(result.outcome, 'not-started');
    }
  }
  assert.equal(calls, 0);
});

test('network loss is unconfirmed with one call and no cloud fallback after local failure', async () => {
  const urls: string[] = [];
  const result = await observeSyntheticEvaluation('ollama-baseline', prompt, async request => {
    urls.push(request.url); throw Error('PRIVATE_PROVIDER_DETAIL');
  });
  assert.equal(result.outcome, 'unconfirmed');
  assert.equal(result.failure, 'network-or-receive');
  assert.deepEqual(urls, ['http://127.0.0.1:11434/api/chat']);
  assert.equal(JSON.stringify(result).includes('PRIVATE_PROVIDER_DETAIL'), false);
});

test('pre-cancel prevents a call; mid-flight cancellation observes the original response but revokes eligibility', async () => {
  const pre = new AbortController(); pre.abort();
  let calls = 0;
  const stopped = await observeSyntheticEvaluation('gemini-candidate', prompt, async () => { calls++; return gemini(); }, { signal: pre.signal });
  assert.equal(stopped.outcome, 'not-started'); assert.equal(calls, 0);
  const during = new AbortController();
  const late = await observeSyntheticEvaluation('gemini-candidate', prompt, async (_req, signal) => {
    during.abort(); assert.equal(signal.aborted, false); calls++; return gemini();
  }, { signal: during.signal });
  assert.equal(calls, 1); assert.equal(late.outcome, 'response-observed');
  assert.equal(late.withinDeliveryDeadline, false); assert.equal(late.rawText, jsonText);
});

test('response, usage including thinking and provider revision are retained without semantic acceptance', async () => {
  const result = await observeSyntheticEvaluation('gemini-candidate', prompt, async () => gemini());
  assert.equal(result.rawText, jsonText); assert.equal(result.finishReason, 'STOP');
  assert.equal(result.modelRevision, 'gemini-3.8-flash-test-revision');
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 20, thinkingTokens: 5, totalTokens: 35 });
  assert.equal('semanticPass' in result, false);
});

test('missing usage stays absent, max tokens and tool/thought parts do not become complete answers', async () => {
  const noUsage = await observeSyntheticEvaluation('gemini-candidate', prompt, async () => gemini({ usageMetadata: {} }));
  assert.deepEqual(noUsage.usage, {});
  for (const candidate of [
    { finishReason: 'MAX_TOKENS', content: { parts: [{ text: jsonText }] } },
    { finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'bookEvent' } }] } },
    { finishReason: 'STOP', content: { parts: [{ thought: true, text: 'internal summary' }] } },
  ]) {
    const result = await observeSyntheticEvaluation('gemini-candidate', prompt, async () => gemini({ candidates: [candidate] }));
    assert.equal(result.failure, 'incomplete');
    if (candidate.finishReason === 'STOP') assert.equal(result.rawText, undefined);
  }
});

test('HTTP failures, malformed envelope and provider block preserve raw evidence and never retry', async () => {
  const responses = [new Response('synthetic error', { status: 429 }), new Response('not-json'),
    Response.json({ promptFeedback: { blockReason: 'SAFETY' } })];
  for (const response of responses) {
    let calls = 0;
    const result = await observeSyntheticEvaluation('gemini-candidate', prompt, async () => { calls++; return response; });
    assert.equal(calls, 1); assert.ok(result.rawBody); assert.ok(result.failure);
  }
});

test('Ollama completion requires exact model and done; known late completion is not delivery', async () => {
  const missingDone = await observeSyntheticEvaluation('ollama-baseline', prompt, async () => Response.json({ model: 'qwen3.5:9b' }));
  assert.equal(missingDone.outcome, 'unconfirmed');
  let clock = 0;
  const late = await observeSyntheticEvaluation('ollama-baseline', prompt, async () => {
    clock = 46_000;
    return Response.json({ done: true, done_reason: 'stop', model: 'qwen3.5:9b',
      message: { content: jsonText }, prompt_eval_count: 40, eval_count: 20 });
  }, { now: () => clock });
  assert.equal(late.outcome, 'response-observed'); assert.equal(late.withinDeliveryDeadline, false);
  assert.equal(late.rawText, jsonText); assert.deepEqual(late.usage, { inputTokens: 40, outputTokens: 20 });
});

test('bounded body receive records unknown instead of silently accepting oversized provider data', async () => {
  const result = await observeSyntheticEvaluation('gemini-candidate', prompt,
    async () => new Response('x'.repeat(1024 * 1024 + 1)));
  assert.equal(result.outcome, 'unconfirmed'); assert.equal(result.failure, 'network-or-receive');
});

test('malformed success envelope cannot release the serial evaluation lane', async () => {
  for (const provider of ['ollama-baseline', 'gemini-candidate'] as const) {
    for (const raw of ['not-json', 'null']) {
      const result = await observeSyntheticEvaluation(provider, prompt, async () => new Response(raw));
      assert.equal(result.outcome, 'unconfirmed');
      assert.equal(result.rawBody, raw);
    }
  }
  const noFinish = await observeSyntheticEvaluation('gemini-candidate', prompt,
    async () => gemini({ candidates: [{ content: { role: 'model', parts: [{ text: jsonText }] } }] }));
  assert.equal(noFinish.outcome, 'unconfirmed');
});
