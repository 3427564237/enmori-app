import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGroqRequest, createGroqHttp, groqEndpoint, groqModel, loadGroqCases,
  observeGroq, prepareGroqCase } from './groq-evaluation.mjs';
import { goalPromptCandidate } from './goal-prompt-candidate.mjs';

const goodText = JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message: 'Synthetic response only.' });
const envelope = (changes = {}) => ({ model: groqModel,
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: goodText } }],
  usage: { prompt_tokens: 123, completion_tokens: 33, total_tokens: 156,
    completion_tokens_details: { reasoning_tokens: 7 } }, ...changes });
const response = value => Response.json(value);
const prompt = async () => (await prepareGroqCase(loadGroqCases()[0].id)).prompt;

test('exactly the existing 24 prompts produce fixed strict, non-streaming Groq requests', async () => {
  const fixtures = loadGroqCases();
  const golden = JSON.parse(readFileSync(new URL('./fixtures/current-prompt-requests.json', import.meta.url)));
  assert.equal(fixtures.length, 24);
  assert.deepEqual(fixtures.map(item => item.id), golden.cases.map(item => item.id));
  for (const [index, fixture] of fixtures.entries()) {
    const prepared = await prepareGroqCase(fixture.id);
    const request = buildGroqRequest(prepared.prompt), body = JSON.parse(request.body);
    assert.equal(request.url, groqEndpoint);
    assert.deepEqual(body.messages, JSON.parse(golden.cases[index].body).messages);
    assert.equal(body.model, groqModel);
    assert.equal(body.stream, false);
    assert.equal(body.max_completion_tokens, 2048);
    assert.equal(body.reasoning_effort, 'low');
    assert.equal(body.include_reasoning, false);
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.deepEqual(body.response_format.json_schema.schema.required, ['schemaVersion', 'message']);
    assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
    assert.equal(Object.hasOwn(body, 'tools'), false);
    assert.equal(Object.hasOwn(body, 'reasoning_format'), false);
  }
  await assert.rejects(prepareGroqCase('not-a-synthetic-case'), /GROQ_CASE_INVALID/);
});

test('only checked-in prompts and the fixed HTTPS host can be dispatched', async () => {
  const original = await prompt(), request = buildGroqRequest(original);
  assert.throws(() => buildGroqRequest({ ...original, turns: [{ role: 'user', text: 'private data' }] }), /GROQ_INPUT_INVALID/);
  let calls = 0;
  const http = createGroqHttp('fake_key_for_unit_test', async (url, init) => {
    calls++;
    assert.equal(url, groqEndpoint);
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.authorization, 'Bearer fake_key_for_unit_test');
    return response(envelope());
  });
  const signal = new AbortController().signal;
  await assert.rejects(http({ ...request, url: 'https://elsewhere.example/' }, signal), /GROQ_REQUEST_FORBIDDEN/);
  await assert.rejects(http({ ...request, body: '{}' }, signal), /GROQ_REQUEST_FORBIDDEN/);
  assert.equal(calls, 0);
  const result = await observeGroq(original, http);
  assert.equal(calls, 1);
  assert.equal(result.observation.outcome, 'response-observed');
  assert.equal(result.observation.physicallySettled, true);
  assert.equal(result.protocol.eligible, true);
  assert.deepEqual(result.observation.usage, { inputTokens: 123, outputTokens: 33, thinkingTokens: 7, totalTokens: 156 });
  assert.equal(JSON.stringify(result).includes('fake_key_for_unit_test'), false);
});

test('goal-v2 preserves each exact golden history and Persona suffix with its explicit 1024 ceiling', async () => {
  const fixtures = loadGroqCases();
  let personaCases = 0;
  for (const fixture of fixtures) {
    const baseline = await prepareGroqCase(fixture.id);
    const sourceSnapshot = JSON.stringify(baseline);
    const candidate = await prepareGroqCase(fixture.id, 'goal-v2');
    const before = JSON.parse(buildGroqRequest(baseline.prompt).body);
    const after = JSON.parse(buildGroqRequest(candidate.prompt, 'goal-v2').body);
    const separator = ' Presentation preferences: ';
    const suffixIndex = before.messages[0].content.indexOf(separator);
    const suffix = suffixIndex < 0 ? '' : before.messages[0].content.slice(suffixIndex);
    if (suffix) personaCases++;
    assert.equal(after.messages[0].content, goalPromptCandidate + suffix);
    assert.deepEqual(after.messages.slice(1), before.messages.slice(1));
    assert.deepEqual(candidate.fixture, baseline.fixture);
    assert.deepEqual(candidate.capturedLocalRequest, baseline.capturedLocalRequest);
    assert.equal(JSON.stringify(baseline), sourceSnapshot);
    assert.equal(before.max_completion_tokens, 2048);
    assert.equal(after.max_completion_tokens, 1024);
    const { messages: _beforeMessages, max_completion_tokens: _beforeMax, ...beforeRest } = before;
    const { messages: _afterMessages, max_completion_tokens: _afterMax, ...afterRest } = after;
    assert.deepEqual(afterRest, beforeRest);
  }
  assert.ok(personaCases > 0, 'exercise the production Persona suffix');
});

test('profile and credential allowlists reject modified text, profile mixing, and foreign hosts', async () => {
  const fixture = loadGroqCases()[0];
  const baseline = (await prepareGroqCase(fixture.id)).prompt;
  const candidate = (await prepareGroqCase(fixture.id, 'goal-v2')).prompt;
  const candidateRequest = buildGroqRequest(candidate, 'goal-v2');
  const baselineRequest = buildGroqRequest(baseline);
  assert.throws(() => buildGroqRequest(candidate), /GROQ_INPUT_INVALID/);
  assert.throws(() => buildGroqRequest(baseline, 'goal-v2'), /GROQ_INPUT_INVALID/);
  assert.throws(() => buildGroqRequest({ ...candidate, system: `${candidate.system} changed` }, 'goal-v2'), /GROQ_INPUT_INVALID/);
  assert.throws(() => buildGroqRequest({ ...candidate, turns: [{ role: 'user', text: 'private data' }] }, 'goal-v2'), /GROQ_INPUT_INVALID/);
  assert.throws(() => buildGroqRequest(candidate, 'unknown'), /GROQ_PROFILE_INVALID/);
  await assert.rejects(prepareGroqCase(fixture.id, 'unknown'), /GROQ_PROFILE_INVALID/);
  let calls = 0;
  const fakeFetch = async () => { calls++; return response(envelope()); };
  const baselineHttp = createGroqHttp('fake_key_for_unit_test', fakeFetch);
  const candidateHttp = createGroqHttp('fake_key_for_unit_test', fakeFetch, 'goal-v2');
  const signal = new AbortController().signal;
  await assert.rejects(baselineHttp(candidateRequest, signal), /GROQ_REQUEST_FORBIDDEN/);
  await assert.rejects(candidateHttp(baselineRequest, signal), /GROQ_REQUEST_FORBIDDEN/);
  const changedBudget = JSON.parse(candidateRequest.body); changedBudget.max_completion_tokens = 2048;
  await assert.rejects(candidateHttp({ ...candidateRequest, body: JSON.stringify(changedBudget) }, signal), /GROQ_REQUEST_FORBIDDEN/);
  await assert.rejects(candidateHttp({ ...candidateRequest, url: 'https://elsewhere.example/' }, signal), /GROQ_REQUEST_FORBIDDEN/);
  assert.equal(calls, 0);
  const wrongProfile = await observeGroq(candidate, candidateHttp);
  assert.equal(wrongProfile.observation.outcome, 'not-started');
  assert.equal(calls, 0);
  const observed = await observeGroq(candidate, candidateHttp, { profile: 'goal-v2' });
  assert.equal(calls, 1);
  assert.equal(observed.observation.physicallySettled, true);
  assert.equal(observed.protocol.eligible, true);
});

test('goal-v2 treats a length finish as ineligible even if the partial JSON is structurally valid', async () => {
  const candidate = (await prepareGroqCase(loadGroqCases()[0].id, 'goal-v2')).prompt;
  let calls = 0;
  const result = await observeGroq(candidate, async () => {
    calls++;
    return response(envelope({ choices: [{ index: 0, finish_reason: 'length', message: { role: 'assistant', content: goodText } }] }));
  }, { profile: 'goal-v2' });
  assert.equal(calls, 1);
  assert.equal(result.observation.physicallySettled, true);
  assert.equal(result.observation.failure, 'incomplete');
  assert.equal(result.protocol.valid, true);
  assert.equal(result.protocol.eligible, false);
});

test('terminal refusal, truncation, tool calls and invalid output are never eligible', async t => {
  const input = await prompt();
  const variations = [
    ['refusal', { finish_reason: 'stop', message: { role: 'assistant', content: null, refusal: 'declined' } }, 'blocked'],
    ['truncation', { finish_reason: 'length', message: { role: 'assistant', content: goodText } }, 'incomplete'],
    ['tool call', { finish_reason: 'tool_calls', message: { role: 'assistant', content: goodText, tool_calls: [{}] } }, 'incomplete'],
    ['duplicate JSON key', { finish_reason: 'stop', message: { role: 'assistant',
      content: '{"schemaVersion":"ai_assistant_message_v1","message":"one","message":"two"}' } }, 'invalid-output'],
    ['wrong schema', { finish_reason: 'stop', message: { role: 'assistant', content: '{"message":"hello"}' } }, 'invalid-output'],
    ['blank message', { finish_reason: 'stop', message: { role: 'assistant',
      content: '{"schemaVersion":"ai_assistant_message_v1","message":"  "}' } }, 'invalid-output'],
  ];
  for (const [name, choice, failure] of variations) await t.test(name, async () => {
    let calls = 0;
    const result = await observeGroq(input, async () => { calls++; return response(envelope({ choices: [{ index: 0, ...choice }] })); });
    assert.equal(calls, 1);
    assert.equal(result.observation.outcome, 'response-observed');
    assert.equal(result.observation.physicallySettled, true);
    assert.equal(result.observation.failure, failure);
    assert.equal(result.protocol.eligible, false);
  });
});

test('unknown response or network outcomes remain unconfirmed after a single call', async t => {
  const input = await prompt();
  const cases = [
    ['wrong model', () => response(envelope({ model: 'different-model' }))],
    ['missing choices', () => response(envelope({ choices: [] }))],
    ['unknown finish', () => response(envelope({ choices: [{ index: 0, finish_reason: 'unknown', message: { role: 'assistant', content: goodText } }] }))],
    ['http failure', () => new Response('not returned or logged', { status: 503 })],
    ['malformed JSON', () => new Response('{not-json')],
    ['invalid UTF-8', () => new Response(Uint8Array.of(255))],
    ['oversize response', () => new Response(new Uint8Array(1024 * 1024 + 1))],
    ['network failure', () => { throw Error('provider error may include a secret'); }],
  ];
  for (const [name, makeResponse] of cases) await t.test(name, async () => {
    let calls = 0;
    const result = await observeGroq(input, async () => { calls++; return makeResponse(); });
    assert.equal(calls, 1);
    assert.equal(result.observation.outcome, 'unconfirmed');
    assert.equal(result.observation.physicallySettled, false);
    assert.equal(result.protocol.eligible, false);
    assert.equal(JSON.stringify(result).includes('provider error may include a secret'), false);
  });
});

test('late or cancelled delivery retains the original receive and is ineligible', async () => {
  const input = await prompt();
  let clock = 0;
  const late = await observeGroq(input, async () => { clock = 45_000; return response(envelope()); }, { now: () => clock });
  assert.equal(late.observation.physicallySettled, true);
  assert.equal(late.observation.withinDeliveryDeadline, false);
  assert.equal(late.protocol.eligible, false);
  const cancellation = new AbortController();
  const cancelled = await observeGroq(input, async (_request, receiveSignal) => {
    cancellation.abort();
    assert.equal(receiveSignal.aborted, false);
    return response(envelope());
  }, { signal: cancellation.signal });
  assert.equal(cancelled.observation.physicallySettled, true);
  assert.equal(cancelled.observation.withinDeliveryDeadline, false);
  assert.equal(cancelled.protocol.eligible, false);
  let calls = 0;
  const notStarted = await observeGroq(input, async () => { calls++; }, { signal: cancellation.signal });
  assert.equal(notStarted.observation.outcome, 'not-started');
  assert.equal(calls, 0);
});

test('physical timeout aborts receipt but does not claim remote settlement or retry', async () => {
  let calls = 0, receiveAborted = false;
  const result = await observeGroq(await prompt(), (_request, signal) => {
    calls++;
    signal.addEventListener('abort', () => { receiveAborted = true; });
    return new Promise(() => {});
  }, { deliveryMs: 5, receiveMs: 25 });
  assert.equal(calls, 1);
  assert.equal(receiveAborted, true);
  assert.equal(result.observation.outcome, 'unconfirmed');
  assert.equal(result.observation.physicallySettled, false);
  assert.equal(result.protocol.eligible, false);
});

test('a response body that never finishes still reaches the physical receive limit', async () => {
  let calls = 0;
  const result = await observeGroq(await prompt(), async () => {
    calls++;
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } }));
  }, { deliveryMs: 5, receiveMs: 25 });
  assert.equal(calls, 1);
  assert.equal(result.observation.outcome, 'unconfirmed');
  assert.equal(result.observation.physicallySettled, false);
});

test('reflected keys are removed from complete and truncated provider responses', async () => {
  const secret = 'fake_secret_for_unit_test';
  for (const finishReason of ['stop', 'length']) {
    const http = createGroqHttp(secret, async () => response(envelope({ choices: [{ index: 0, finish_reason: finishReason,
      message: { role: 'assistant', content: JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message: secret }) } }] })));
    const result = await observeGroq(await prompt(), http);
    assert.equal(result.observation.failure, 'credential-redacted');
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.equal(result.protocol.eligible, false);
  }
});

test('wrapped clients also remove JSON-escaped reflected keys when supplied to the observer', async () => {
  const secret = 'fake_secret_for_unit_test';
  const escaped = secret.replaceAll('e', '\\u0065');
  const content = `{"schemaVersion":"ai_assistant_message_v1","message":"${escaped}"}`;
  const http = createGroqHttp(secret, async () => response(envelope({ choices: [{ index: 0, finish_reason: 'stop',
    message: { role: 'assistant', content } }] })));
  const wrapper = (...args) => http(...args);
  const result = await observeGroq(await prompt(), wrapper, { secret });
  assert.equal(result.observation.failure, 'credential-redacted');
  assert.equal(Object.hasOwn(result.observation, 'rawText'), false);
  assert.equal(JSON.stringify(result).includes(secret), false);
});
