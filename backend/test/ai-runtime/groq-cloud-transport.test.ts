import assert from 'node:assert/strict';
import test from 'node:test';
import { GroqCloudTransport, type GroqTransportConfiguration } from '../../src/ai-runtime/infrastructure/groq-cloud-transport.js';
import { GroqChatTransport } from '../../src/ai-runtime/infrastructure/groq-chat-transport.js';
import { LocalChatTransport } from '../../src/ai-runtime/infrastructure/local-chat-transport.js';
import { AuthorizedAsyncCloudConversationTransport } from '../../src/ai-conversation/application/async-cloud-conversation-transport.js';
import type { AsyncConversationModelInput } from '../../src/ai-conversation/ports/async-conversation.js';
import type { ConversationInput } from '../../src/ai-conversation/ports/conversation-lifecycle.js';
import { deferred, FakeClock, flush } from './support.js';

const config: GroqTransportConfiguration = { model: 'openai/gpt-oss-120b', reasoningEffort: 'medium',
  maxCompletionTokens: 2048, maxInputTokens: 5440, maxRequestBytes: 5440 };
const messages = [{ role: 'system', content: 'Synthetic test.' }, { role: 'user', content: 'Hello.' }] as const;
const raw = JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message: 'Synthetic reply.' });
const envelope = (change: Record<string, unknown> = {}) => ({ model: config.model,
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: raw } }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }, ...change });
const unknown = { kind: 'unknown', physical: 'unknown' };
const failure = { kind: 'failure', physical: 'stopped' };
function fixture(http: typeof fetch = async () => Response.json(envelope()), settings = config) {
  const clock = new FakeClock(), abort = new AbortController();
  const budget = { signal: abort.signal, deadline: 45000, remainingMs: () => 45000 - clock.now() };
  return { clock, abort, budget, transport: new GroqCloudTransport('gsk_synthetic_test_key_1234567890', settings, clock, http, { inputTokenUpperBound: () => 100, reservedTokens: 8000, available: () => true, rateLimited: async () => {} }) };
}

test('Groq adapter sends one bounded strict request only to the fixed HTTPS endpoint', async () => {
  let calls = 0;
  const f = fixture(async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store'); assert.equal(init?.method, 'POST');
    const body = JSON.parse(init?.body as string);
    assert.deepEqual(body.messages, messages); assert.equal(body.stream, false);
    assert.equal(body.max_completion_tokens, 2048); assert.equal(body.reasoning_effort, 'medium');
    assert.equal(body.response_format.json_schema.strict, true); assert.equal(body.include_reasoning, false);
    assert.equal(body.tools, undefined); assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer gsk_synthetic_test_key_1234567890');
    return Response.json(envelope());
  });
  const result = await f.transport.dispatch(messages, f.budget);
  assert.equal(result.kind, 'response');
  if (result.kind === 'response') assert.equal(new TextDecoder().decode(result.raw), raw);
  assert.equal(calls, 1); assert.equal(f.clock.pending, 0);
});

test('cancel and deadline settle unknown even when fetch ignores abort; late response cannot replace outcome', async () => {
  for (const mode of ['cancel', 'deadline']) {
    const pending = deferred<Response>(); let signal: AbortSignal | undefined;
    const f = fixture(async (_url, init) => { signal = init?.signal as AbortSignal; return pending.promise; });
    const result = f.transport.dispatch(messages, f.budget);
    if (mode === 'cancel') f.abort.abort(); else f.clock.advance(45000);
    assert.deepEqual(await result, unknown); assert.equal(signal?.aborted, true);
    pending.resolve(Response.json(envelope())); await flush();
    assert.deepEqual(await result, unknown); assert.equal(f.clock.pending, 0);
  }
});

test('HTTP 429, errors, redirects and malformed or unterminated envelopes remain unknown with no retries', async () => {
  for (const make of [() => new Response('', { status: 429 }), () => new Response('', { status: 503 }),
    () => new Response('', { status: 302 }), () => { throw Error('private upstream error'); },
    () => new Response('{'), () => Response.json(envelope({ model: 'different' })),
    () => Response.json(envelope({ choices: [{ index: 0, finish_reason: null, message: { role: 'assistant', content: raw } }] }))]) {
    let calls = 0; const f = fixture(async () => { calls++; return make(); });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown); assert.equal(calls, 1);
  }
});

test('complete refusals, truncation, tools and invalid usage are stopped failures without candidate text', async () => {
  for (const value of [envelope({ usage: undefined }), envelope({ usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 1 } }),
    envelope({ usage: { prompt_tokens: 5441, completion_tokens: 1, total_tokens: 5442 } }),
    ...['length', 'tool_calls', 'content_filter'].map(reason => envelope({ choices: [{ index: 0, finish_reason: reason,
      message: { role: 'assistant', content: raw } }] })),
    envelope({ choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: raw, refusal: 'refused' } }] })]) {
    const f = fixture(async () => Response.json(value));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure);
  }
});

test('response UTF-8/byte bounds and stalled body are enforced independently of response headers', async () => {
  for (const bytes of [new Uint8Array([0xff]), new Uint8Array(1024 * 1024 + 1)]) {
    const f = fixture(async () => new Response(bytes));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
  }
  let cancelled = 0;
  const f = fixture(async () => new Response(new ReadableStream({ cancel() { cancelled++; } })));
  const result = f.transport.dispatch(messages, f.budget); await flush();
  f.clock.advance(45000); assert.deepEqual(await result, unknown); await flush();
  assert.equal(cancelled, 1);
});

test('invalid, oversized or pre-cancelled input performs zero HTTP calls', async () => {
  let calls = 0; const f = fixture(async () => { calls++; return Response.json(envelope()); });
  for (const input of [[], [{ role: 'user', content: 'missing system' }],
    [{ role: 'system', content: 'a' }, { role: 'user', content: 'x'.repeat(5500) }]]) {
    assert.deepEqual(await f.transport.dispatch(input as unknown as typeof messages, f.budget), unknown);
  }
  f.abort.abort(); assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
  assert.equal(calls, 0);
});

test('credential reflection is suppressed even when JSON uses Unicode escapes', async () => {
  for (const content of [raw.replace('Synthetic reply.', 'gsk_synthetic_test_key_1234567890'),
    raw.replace('Synthetic reply.', '\\u0067sk_synthetic_test_key_1234567890')]) {
    const f = fixture(async () => Response.json(envelope({ choices: [{ index: 0, finish_reason: 'stop',
      message: { role: 'assistant', content } }] })));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure);
  }
});

test('chat reuses exact existing local messages including Persona, history and selected-context boundaries', async () => {
  let localMessages: unknown, cloudMessages: unknown;
  const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Now rest.', checkIns: [],
    history: [{ user: 'Earlier fact.', assistant: 'Earlier suggestion.' }],
    persona: { schemaVersion: 'persona_presentation_v1', tone: 'warm', responseLength: 'concise', formatStyle: 'bulleted' } };
  const f = fixture(async (_url, init) => { cloudMessages = JSON.parse(init?.body as string).messages; return Response.json(envelope()); });
  const local = new LocalChatTransport('qwen3.5:9b', async (_url, init) => {
    localMessages = JSON.parse(init?.body as string).messages;
    return Response.json({ model: 'qwen3.5:9b', done: true, message: { content: raw } });
  });
  await local.generate(input, f.budget);
  assert.equal((await new GroqChatTransport(f.transport).dispatch(input, f.budget)).kind, 'response');
  assert.deepEqual(cloudMessages, localMessages);
});

test('cloud authorization bridge consumes once, rejects late authority and never forwards the handle', async () => {
  const f = fixture(); let calls = 0;
  const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Synthetic.', checkIns: [], persona: undefined };
  const transport = new AuthorizedAsyncCloudConversationTransport({ async dispatch(value) {
    calls++; assert.equal(value, input); return { kind: 'failure', physical: 'stopped' };
  } }, { verify: async () => true, current: () => true });
  const handle = { authorize: async () => true, projection: () => input } as AsyncConversationModelInput;
  assert.deepEqual(await transport.dispatch(handle, f.budget), failure);
  assert.deepEqual(await transport.dispatch(handle, f.budget), unknown); assert.equal(calls, 1);
  const wait = deferred<boolean>();
  const late = transport.dispatch({ authorize: () => wait.promise, projection: () => input } as AsyncConversationModelInput, f.budget);
  f.abort.abort(); wait.resolve(true);
  assert.deepEqual(await late, unknown); assert.equal(calls, 1);
});

test('token accounting requires an explicit framing-aware bound and sufficient pre-reservation', async () => {
  const clock = new FakeClock(); let calls = 0;
  const http: typeof fetch = async () => { calls++; return Response.json(envelope()); };
  const controls = { inputTokenUpperBound: () => 5441, reservedTokens: 8000, available: () => true, rateLimited: async () => {} };
  const key = 'gsk_synthetic_test_key_1234567890';
  assert.throws(() => new GroqCloudTransport(key, config, clock, http, { ...controls, reservedTokens: 100 }));
  assert.throws(() => new GroqCloudTransport('key"with-special-characters', config, clock, http, controls));
  const transport = new GroqCloudTransport(key, config, clock, http, controls);
  assert.deepEqual(await transport.dispatch(messages, fixture().budget), unknown); assert.equal(calls, 0);
});

test('final HTTP guard observes a cooldown arising while cloud request authorization is awaiting', async () => {
  const clock = new FakeClock(), wait = deferred<boolean>(); let available = true, calls = 0;
  const rawTransport = new GroqCloudTransport('gsk_synthetic_test_key_1234567890', config, clock,
    async () => { calls++; return Response.json(envelope()); },
    { inputTokenUpperBound: () => 100, reservedTokens: 8000, available: () => available, rateLimited: async () => {} });
  const cloud = new AuthorizedAsyncCloudConversationTransport(new GroqChatTransport(rawTransport),
    { verify: async () => true, current: () => true });
  const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Synthetic.', checkIns: [], persona: undefined };
  const result = cloud.dispatch({ authorize: () => wait.promise, projection: () => input } as AsyncConversationModelInput, fixture().budget);
  await flush(); available = false; wait.resolve(true);
  assert.deepEqual(await result, unknown); assert.equal(calls, 0);
});

test('local authority never substitutes for cloud consent, including consent lost after verification', async () => {
  let calls = 0;
  const model = { async dispatch() { calls++; return { kind: 'failure', physical: 'stopped' } as const; } };
  const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Synthetic.', checkIns: [], persona: undefined };
  for (const consent of [{ verify: async () => false, current: () => true }, { verify: async () => true, current: () => false }]) {
    const cloud = new AuthorizedAsyncCloudConversationTransport(model, consent);
    assert.deepEqual(await cloud.dispatch({ authorize: async () => true, projection: () => input } as AsyncConversationModelInput, fixture().budget), unknown);
  }
  assert.equal(calls, 0);
});

test('duplicate decoded envelope keys cannot hide truncation or refusal', async () => {
  for (const text of [JSON.stringify(envelope()).replace('"finish_reason":"stop"', '"finish_reason":"length","finish_reason":"stop"'),
    JSON.stringify(envelope()).replace('"finish_reason":"stop"', '"finish_reason":"length","finish_rea\\u0073on":"stop"')]) {
    const f = fixture(async () => new Response(text));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
  }
});

test('cloud factory binds token reservation to durable policy and remains closed without recovery', async () => {
  const { createCloudConversationRuntime } = await import('../../src/bootstrap/cloud-conversation-runtime.js');
  let externalCalls = 0; const clock = new FakeClock();
  const options = {
    gateway: { async runTransaction<T>(): Promise<T> { externalCalls++; throw Error('must not run during construction'); } },
    epoch: { processEpoch: '11111111-1111-4111-8111-111111111111', generation: 1 }, scope: 'synthetic',
    policy: { minute: { windowMs: 60000, maxRequests: 30, maxTokens: 8000 },
      day: { windowMs: 86400000, maxRequests: 1000, maxTokens: 200000 }, tokensPerRequest: 8000 },
    clock, utcMilliseconds: () => 1000000, ownsHost: () => true, apiKey: 'gsk_synthetic_test_key_1234567890', configuration: config,
    inputTokenUpperBound: () => 100, cloudConsent: { verify: async () => true, current: () => true },
    http: async () => { externalCalls++; return Response.json(envelope()); },
  };
  const built = createCloudConversationRuntime(options);
  assert.equal(built.owner.state.ready, false); assert.equal(externalCalls, 0);
  assert.throws(() => createCloudConversationRuntime({ ...options, policy: { ...options.policy, tokensPerRequest: 100 } }));
  assert.equal(externalCalls, 0);
});

test('counter cannot mutate the sent message snapshot and synchronous guard cancellation prevents HTTP', async () => {
  const clock = new FakeClock(); let calls = 0;
  const http: typeof fetch = async () => { calls++; return Response.json(envelope()); };
  const key = 'gsk_synthetic_test_key_1234567890', f = fixture();
  const transport = new GroqCloudTransport(key, config, clock, http, {
    inputTokenUpperBound: snapshot => { (snapshot[1] as { content: string }).content = 'mutated'; return 1; },
    reservedTokens: 8000, available: () => true, rateLimited: async () => {},
  });
  assert.deepEqual(await transport.dispatch(messages, f.budget), unknown);
  const cancelled = new GroqCloudTransport(key, config, clock, http, {
    inputTokenUpperBound: () => 100, reservedTokens: 8000,
    available: () => { f.abort.abort(); return true; }, rateLimited: async () => {},
  });
  assert.deepEqual(await cancelled.dispatch(messages, f.budget), unknown); assert.equal(calls, 0);
});
