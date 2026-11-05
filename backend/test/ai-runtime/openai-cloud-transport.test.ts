import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAiCloudTransport, buildOpenAiRequest, assertOpenAiTransportSettings, openAiResponsesEndpoint, type OpenAiDispatchControls,
  type OpenAiMessage, type OpenAiRejectionDiagnostic, type OpenAiTransportConfiguration, type OpenAiUsage }
  from '../../src/ai-runtime/infrastructure/openai-cloud-transport.js';
import { OpenAiChatTransport } from '../../src/ai-runtime/infrastructure/openai-chat-transport.js';
import { buildChatMessages } from '../../src/ai-runtime/infrastructure/local-chat-transport.js';
import type { ConversationInput } from '../../src/ai-conversation/ports/conversation-lifecycle.js';
import { deferred, FakeClock, flush } from './support.js';

const key = 'sk-proj-synthetic_fixture_key_1234567890';
const config: OpenAiTransportConfiguration = { model: 'gpt-6-luna', reasoningEffort: 'low',
  maxOutputTokens: 2048, maxInputTokens: 5440, maxRequestBytes: 8192 };
const messages = [{ role: 'system', content: 'Synthetic test.' }, { role: 'user', content: 'Hello.' }] as const;
const raw = JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message: 'Synthetic reply.' });
const message = (text = raw) => ({ id: 'msg_synthetic', type: 'message', role: 'assistant', status: 'completed',
  content: [{ type: 'output_text', text, annotations: [] }] });
const usage = () => ({ input_tokens: 100, input_tokens_details: { cached_tokens: 20, cache_write_tokens: 30 },
  output_tokens: 200, output_tokens_details: { reasoning_tokens: 100 }, total_tokens: 300 });
const envelope = (change: Record<string, unknown> = {}) => ({ id: 'resp_synthetic', object: 'response', model: config.model,
  status: 'completed', error: null, incomplete_details: null, service_tier: 'default', store: false, background: false,
  output: [message()], usage: usage(), ...change });
const unknown = { kind: 'unknown', physical: 'unknown' };
const failure = { kind: 'failure', physical: 'stopped' };
const expectedUsage: OpenAiUsage = { provider: 'openai', model: config.model, inputTokens: 100,
  cachedInputTokens: 20, cacheWriteTokens: 30, outputTokens: 200, reasoningTokens: 100, totalTokens: 300 };

function fixture(http: typeof fetch = async () => Response.json(envelope()),
  controls: Partial<OpenAiDispatchControls> = {}, settings = config) {
  const clock = new FakeClock(), abort = new AbortController(), confirmed: Readonly<OpenAiUsage>[] = [];
  const budget = { signal: abort.signal, deadline: 45000, remainingMs: () => 45000 - clock.now() };
  const transport = new OpenAiCloudTransport(key, settings, clock, http, {
    inputTokenUpperBound: () => 100, reservedTokens: 8000, available: () => true, rateLimited: async () => {},
    confirmUsage: async value => { confirmed.push(value); return 'confirmed'; }, ...controls,
  });
  return { clock, abort, budget, transport, confirmed };
}

test('Responses sends one fixed-host standard-tier strict JSON request with storage, streaming and tools disabled', async () => {
  let calls = 0, counted: string | undefined;
  const f = fixture(async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(url, openAiResponsesEndpoint);
    assert.equal(init?.method, 'POST'); assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    assert.equal((init?.headers as Record<string, string>).authorization, `Bearer ${key}`);
    const body = JSON.parse(init?.body as string);
    assert.equal(init?.body, counted);
    assert.equal(init?.body, buildOpenAiRequest(messages, config));
    assert.deepEqual(body, { model: 'gpt-6-luna', input: messages, reasoning: { effort: 'low' }, max_output_tokens: 2048,
      stream: false, store: false, background: false, service_tier: 'default', truncation: 'disabled', tools: [], tool_choice: 'none',
      text: { format: { type: 'json_schema', name: 'ai_assistant_message_v1', strict: true,
        schema: { type: 'object', properties: { schemaVersion: { type: 'string', enum: ['ai_assistant_message_v1'] },
          message: { type: 'string' } }, required: ['schemaVersion', 'message'], additionalProperties: false } } } });
    assert(!String(init?.body).includes(key));
    return Response.json(envelope());
  }, { inputTokenUpperBound: body => { counted = body; return 100; } });
  const result = await f.transport.dispatch(messages, f.budget);
  assert(!JSON.stringify(f.transport).includes(key));
  assert.equal(result.kind, 'response');
  if (result.kind === 'response') assert.equal(new TextDecoder().decode(result.raw), raw);
  assert.deepEqual(f.confirmed, [expectedUsage]); assert(Object.isFrozen(f.confirmed[0]));
  assert.equal(calls, 1); assert.equal(f.clock.pending, 0);
});

test('only the two explicitly selected trial models and low effort are constructible; configuration errors are safe', () => {
  for (const delta of [{ model: 'gpt-6-astra' }, { reasoningEffort: 'medium' }, { maxOutputTokens: 15 },
    { maxOutputTokens: 128001 }, { maxInputTokens: 0 }, { maxRequestBytes: 131073 }, { promptProfile: 'unknown' }]) {
    assert.throws(() => fixture(undefined, {}, { ...config, ...delta } as OpenAiTransportConfiguration),
      error => error instanceof Error && error.message === 'OPENAI_CONFIGURATION_INVALID');
  }
  const f = fixture();
  for (const token of ['', 'sk-short', key + '\n', key + '"']) {
    assert.throws(() => new OpenAiCloudTransport(token, config, f.clock, async () => Response.json(envelope()), {
      inputTokenUpperBound: () => 100, reservedTokens: 8000, available: () => true,
      rateLimited: async () => {}, confirmUsage: async () => 'confirmed',
    }), /^Error: OPENAI_CONFIGURATION_INVALID$/);
  }
  assert.throws(() => fixture(undefined, { reservedTokens: 100 }), /^Error: OPENAI_CONFIGURATION_INVALID$/);
  assert.throws(() => fixture(undefined, { confirmUsage: undefined } as unknown as OpenAiDispatchControls), /^Error: OPENAI_CONFIGURATION_INVALID$/);
});

test('pure settings preflight shares constructor validation and returns a frozen content-free configuration', () => {
  const selected = assertOpenAiTransportSettings(key, config, 8000);
  assert.deepEqual(selected, config); assert(Object.isFrozen(selected)); assert(!JSON.stringify(selected).includes(key));
  assert.throws(() => assertOpenAiTransportSettings('invalid', config, 8000), /^Error: OPENAI_CONFIGURATION_INVALID$/);
  assert.throws(() => assertOpenAiTransportSettings(key, { ...config, model: 'unknown' } as unknown as OpenAiTransportConfiguration, 8000),
    /^Error: OPENAI_CONFIGURATION_INVALID$/);
  assert.throws(() => assertOpenAiTransportSettings(key, { ...config, maxOutputTokens: NaN }, 8000), /^Error: OPENAI_CONFIGURATION_INVALID$/);
  assert.throws(() => assertOpenAiTransportSettings(key, config, 1), /^Error: OPENAI_CONFIGURATION_INVALID$/);
});

test('explicit sol comparison does not fallback and requires an exact matching response model', async () => {
  let calls = 0;
  const f = fixture(async (_url, init) => {
    calls++; assert.equal(JSON.parse(init?.body as string).model, 'gpt-6.1-sol');
    return Response.json(envelope({ model: 'gpt-6.1-sol' }));
  }, {}, { ...config, model: 'gpt-6.1-sol' });
  assert.equal((await f.transport.dispatch(messages, f.budget)).kind, 'response');
  assert.equal(calls, 1); assert.equal(f.confirmed[0]?.model, 'gpt-6.1-sol');
});

test('optional storage/background response echoes may be absent while the outgoing request remains explicit', async () => {
  const f = fixture(async () => Response.json(envelope({ store: undefined, background: undefined })));
  assert.equal((await f.transport.dispatch(messages, f.budget)).kind, 'response');
  assert.deepEqual(f.confirmed, [expectedUsage]);
});

test('invalid, oversized, secret-bearing or pre-cancelled inputs issue no HTTP or usage effects', async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return Response.json(envelope()); });
  for (const input of [[], [{ role: 'user', content: 'no system' }],
    [{ role: 'system', content: 's' }, { role: 'user', content: 'x'.repeat(8500) }],
    [{ role: 'system', content: 's' }, { role: 'user', content: '\ud800' }],
    [{ role: 'system', content: 's' }, { role: 'user', content: key }],
    [{ role: 'system', content: 's' }, { role: 'user', content: 'u', extra: true }],
    [{ role: 'system', content: 's' }, { role: 'assistant', content: 'a' }, { role: 'user', content: 'u' }]]) {
    assert.deepEqual(await f.transport.dispatch(input as readonly OpenAiMessage[], f.budget), unknown);
  }
  f.abort.abort(); assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
  assert.equal(calls, 0); assert.equal(f.confirmed.length, 0);
});

test('framing counter must supply a finite positive bound within the configured cap before dispatch', async () => {
  for (const bound of [0, -1, 1.5, Infinity, NaN, 5441]) {
    let calls = 0;
    const f = fixture(async () => { calls++; return Response.json(envelope()); }, { inputTokenUpperBound: () => bound });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown); assert.equal(calls, 0);
  }
  const f = fixture(undefined, { inputTokenUpperBound: () => { throw Error(key); } });
  assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
});

test('counter receives immutable serialized input and later caller mutation cannot change the sent prompt', async () => {
  const mutable: OpenAiMessage[] = messages.map(item => ({ ...item }));
  let sent: unknown;
  const f = fixture(async (_url, init) => { sent = JSON.parse(init?.body as string).input; return Response.json(envelope()); }, {
    inputTokenUpperBound: () => { mutable[1] = { role: 'user', content: 'changed after count' }; return 100; },
  });
  assert.equal((await f.transport.dispatch(mutable, f.budget)).kind, 'response');
  assert.deepEqual(sent, messages);
});

test('final ownership/money guard and synchronous guard cancellation prevent HTTP', async () => {
  let calls = 0;
  const http: typeof fetch = async () => { calls++; return Response.json(envelope()); };
  const closed = fixture(http, { available: () => false });
  assert.deepEqual(await closed.transport.dispatch(messages, closed.budget), unknown);
  const f = fixture(http, { available: () => { f.abort.abort(); return true; } });
  assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
  const throwing = fixture(http, { available: () => { throw Error(key); } });
  assert.deepEqual(await throwing.transport.dispatch(messages, throwing.budget), unknown);
  assert.equal(calls, 0);
});

test('cancel/deadline remain unknown when HTTP ignores abort; late valid responses neither reconcile nor deliver', async () => {
  for (const mode of ['cancel', 'deadline']) {
    const pending = deferred<Response>(); let signal: AbortSignal | undefined;
    const f = fixture(async (_url, init) => { signal = init?.signal as AbortSignal; return pending.promise; });
    const result = f.transport.dispatch(messages, f.budget);
    if (mode === 'cancel') f.abort.abort(); else f.clock.advance(45000);
    assert.deepEqual(await result, unknown); assert.equal(signal?.aborted, true);
    pending.resolve(Response.json(envelope())); await flush();
    assert.deepEqual(await result, unknown); assert.equal(f.confirmed.length, 0); assert.equal(f.clock.pending, 0);
  }
});

test('physical receive has its own 120-second ceiling even when the original application budget is longer', async () => {
  const pending = deferred<Response>(), f = fixture(async () => pending.promise);
  const budget = { signal: f.abort.signal, deadline: 200000, remainingMs: () => 200000 - f.clock.now() };
  const result = f.transport.dispatch(messages, budget);
  f.clock.advance(120000); assert.deepEqual(await result, unknown); assert.equal(f.confirmed.length, 0);
});

test('stalled response body is cancelled without awaiting remote stop or receiving accounting', async () => {
  let cancelled = 0;
  const f = fixture(async () => new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }),
    { headers: { 'content-type': 'application/json' } }));
  const result = f.transport.dispatch(messages, f.budget); await flush();
  f.clock.advance(45000); assert.deepEqual(await result, unknown); await flush();
  assert.equal(cancelled, 1); assert.equal(f.confirmed.length, 0); assert.equal(f.clock.pending, 0);
});

test('429 maps only bounded retry metadata, never upstream bodies, and never retries or confirms usage', async () => {
  const variants: [Record<string, string>, number | undefined][] = [
    [{}, undefined], [{ 'retry-after': '2.5' }, 2.5], [{ 'retry-after': '0' }, 0],
    [{ 'retry-after': 'private-upstream-' + key }, Infinity], [{ 'retry-after': '-1' }, Infinity],
    [{ 'retry-after': 'Wed, 01 Jan 2025 00:00:20 GMT', date: 'Wed, 01 Jan 2025 00:00:00 GMT' }, 20],
    [{ 'retry-after': 'Wed, 01 Jan 2025 00:00:20 GMT' }, Infinity],
  ];
  for (const [headers, expected] of variants) {
    const cooldowns: (number | undefined)[] = []; let calls = 0;
    const f = fixture(async () => { calls++; return new Response(key, { status: 429, headers }); }, {
      rateLimited: async seconds => { cooldowns.push(seconds); },
    });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
    assert.deepEqual(cooldowns, [expected]); assert.equal(calls, 1); assert.equal(f.confirmed.length, 0);
  }
});

test('paid Responses retains authentic 429 cooldown after cancellation or deadline and rejects foreign 429s', async () => {
  for (const mode of ['cancel', 'deadline', 'redirected', 'wrong-url']) {
    const pending = deferred<Response>(), cooldowns: (number | undefined)[] = [];
    let calls = 0, cancelledBodies = 0;
    const f = fixture(async () => { calls++; return pending.promise; }, {
      rateLimited: async seconds => { cooldowns.push(seconds); },
    });
    const result = f.transport.dispatch(messages, f.budget);
    const late = mode === 'cancel' || mode === 'deadline';
    if (late) {
      if (mode === 'cancel') f.abort.abort(); else f.clock.advance(45_000);
      assert.deepEqual(await result, unknown);
    }
    const limited = new Response(new ReadableStream<Uint8Array>({ cancel() { cancelledBodies++; } }),
      { status: 429, headers: { 'retry-after': '60' } });
    Object.defineProperty(limited, 'url', { value: mode === 'wrong-url' ? 'https://wrong.invalid/' : openAiResponsesEndpoint });
    Object.defineProperty(limited, 'redirected', { value: mode === 'redirected' });
    pending.resolve(limited);
    assert.deepEqual(await result, unknown);
    await flush();
    assert.deepEqual(cooldowns, late ? [60] : [], mode);
    assert.equal(cancelledBodies, 1, mode);
    assert.equal(f.confirmed.length, 0);
    assert.equal(calls, 1);
  }
});

test('HTTP errors, redirects, malformed identities and nonterminal statuses are unknown without implicit retries', async () => {
  for (const make of [() => new Response(key, { status: 503 }), () => new Response('', { status: 302 }),
    () => { throw Error(key); }, () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => Response.json(envelope(), { headers: { 'content-type': 'text/event-stream' } }),
    () => Response.json(envelope({ model: 'gpt-6.1-sol' })), () => Response.json(envelope({ object: 'unknown' })),
    () => Response.json(envelope({ id: '' })), ...['in_progress', 'queued', undefined, 'future'].map(status => () => Response.json(envelope({ status })))]) {
    let calls = 0;
    const f = fixture(async () => { calls++; return make(); });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown);
    assert.equal(calls, 1); assert.equal(f.confirmed.length, 0);
  }
});

test('UTF-8 and received-byte caps ignore Content-Length claims and reject unterminated envelopes', async () => {
  for (const bytes of [new Uint8Array([0xff]), new Uint8Array([0xc3]), new Uint8Array(1024 * 1024 + 1), new TextEncoder().encode('{')]) {
    const f = fixture(async () => new Response(bytes, { headers: { 'content-type': 'application/json', 'content-length': '1' } }));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown); assert.equal(f.confirmed.length, 0);
  }
});

test('duplicate decoded envelope keys cannot manufacture completion, usage or a safe model', async () => {
  for (const text of [JSON.stringify(envelope()).replace('"status":"completed"', '"status":"in_progress","status":"completed"'),
    JSON.stringify(envelope()).replace('"status":"completed"', '"status":"in_progress","sta\\u0074us":"completed"'),
    JSON.stringify(envelope()).replace('"input_tokens":100', '"input_tokens":99999,"input_tokens":100')]) {
    const f = fixture(async () => new Response(text, { headers: { 'content-type': 'application/json' } }));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), unknown); assert.equal(f.confirmed.length, 0);
  }
});

test('valid failed/cancelled/incomplete terminal envelopes reconcile known cost while rejecting all candidate text', async () => {
  for (const status of ['failed', 'cancelled', 'incomplete']) {
    const f = fixture(async () => Response.json(envelope({ status,
      error: status === 'failed' ? { code: 'server_error', message: key } : null,
      incomplete_details: status === 'incomplete' ? { reason: 'max_output_tokens' } : null,
    })));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure); assert.deepEqual(f.confirmed, [expectedUsage]);
  }
});

test('invalid, incomplete, inconsistent or over-bound usage retains the reservation and emits no candidate', async () => {
  const cases = [undefined, null, { ...usage(), input_tokens: -1 }, { ...usage(), input_tokens: 101 },
    { ...usage(), output_tokens: 2049, total_tokens: 2149 }, { ...usage(), total_tokens: 301 },
    { ...usage(), input_tokens_details: { cached_tokens: 20 } },
    { ...usage(), input_tokens_details: { cached_tokens: 80, cache_write_tokens: 30 } },
    { ...usage(), input_tokens_details: { cached_tokens: 0.5, cache_write_tokens: 0 } },
    { ...usage(), output_tokens_details: { reasoning_tokens: 201 } }, { ...usage(), total_tokens: Number.MAX_SAFE_INTEGER + 1 }];
  for (const value of cases) {
    const f = fixture(async () => Response.json(envelope({ usage: value })));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure); assert.equal(f.confirmed.length, 0);
  }
});

test('unexpected billing tier, storage mode, background mode, tools or hosted-tool usage cannot reconcile or deliver', async () => {
  for (const delta of [{ service_tier: 'priority' }, { store: true }, { background: true },
    { tool_usage: { web_search: { num_requests: 1 } } },
    { output: [{ type: 'function_call', id: 'fc_synthetic', name: 'forbidden', arguments: '{}' }] },
    { output: [{ type: 'unknown' }] }]) {
    const f = fixture(async () => Response.json(envelope(delta)));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure); assert.equal(f.confirmed.length, 0);
  }
});

test('optional rejection diagnostics separate usage and envelope failures without retaining provider strings', async () => {
  const { model: _model, provider: _provider, ...reportedTokenCounts } = expectedUsage;
  const cases = [
    { delta: { model: key }, reason: 'response-model-mismatch', observation: unknown },
    { delta: { service_tier: key }, reason: 'service-tier-invalid', reportedTokenCounts },
    { delta: { store: true }, reason: 'storage-echo-invalid', reportedTokenCounts },
    { delta: { background: true }, reason: 'background-echo-invalid', reportedTokenCounts },
    { delta: { usage: { ...usage(), input_tokens: 101 } }, reason: 'usage-input-over-bound',
      reportedTokenCounts: { ...reportedTokenCounts, inputTokens: 101 } },
    { delta: { usage: { ...usage(), input_tokens_details: { cached_tokens: 20, unknown: key } } }, reason: 'usage-cache-write-count-missing',
      reportedTokenCounts: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 200, reasoningTokens: 100, totalTokens: 300 } },
    { delta: { usage: { ...usage(), input_tokens: key } }, reason: 'usage-count-invalid',
      reportedTokenCounts: { cachedInputTokens: 20, cacheWriteTokens: 30, outputTokens: 200, reasoningTokens: 100, totalTokens: 300 } },
  ];
  for (const { delta, reason, reportedTokenCounts: counts, observation = failure } of cases) {
    const diagnostics: OpenAiRejectionDiagnostic[] = [];
    const f = fixture(async () => Response.json(envelope({ ...delta, id: key })), {
      observeRejection: diagnostic => { diagnostics.push(diagnostic); throw Error(key); },
    });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), observation);
    assert.deepEqual(diagnostics, [{ reason, ...(counts ? { reportedTokenCounts: counts } : {}) }]);
    assert.equal(f.confirmed.length, 0);
    assert(!JSON.stringify(diagnostics).includes(key));
  }
});

test('documented zero hosted-tool summaries still require output and confirmed base usage', async () => {
  const allZero = { image_gen: { input_tokens: 0, output_tokens: 0, total_tokens: 0, cached_tokens: 0,
    input_tokens_details: { image_tokens: 0, text_tokens: 0 },
    output_tokens_details: { image_tokens: 0, text_tokens: 0 },
    cached_tokens_details: { cached_image_tokens: 0, cached_text_tokens: 0 } }, web_search: { num_requests: 0 } };
  const f = fixture(async () => Response.json(envelope({ tool_usage: allZero })));
  assert.equal((await f.transport.dispatch(messages, f.budget)).kind, 'response');
  assert.deepEqual(f.confirmed, [expectedUsage]);
  for (const delta of [{ usage: undefined }, { output: [{ type: 'web_search_call' }] }]) {
    const rejected = fixture(async () => Response.json(envelope({ tool_usage: allZero, ...delta })));
    assert.deepEqual(await rejected.transport.dispatch(messages, rejected.budget), failure);
    assert.equal(rejected.confirmed.length, 0);
  }
});

test('empty, nonzero or unrecognized hosted-tool usage cannot reconcile or deliver', async () => {
  const variants = [[{}, 'empty'], [{ web_search: { num_requests: 1 } }, 'nonzero'],
    [{ web_search: {} }, 'unrecognized'], [{ web_search: { num_requests: key } }, 'unrecognized'],
    [{ image_gen: { input_tokens: 0, output_tokens: 0, total_tokens: 0,
      input_tokens_details: { image_tokens: 0 } } }, 'unrecognized'], [{ [key]: 0 }, 'unrecognized']] as const;
  for (const [tool_usage, shape] of variants) {
    const diagnostics: OpenAiRejectionDiagnostic[] = [];
    const f = fixture(async () => Response.json(envelope({ tool_usage })), {
      observeRejection: diagnostic => { diagnostics.push(diagnostic); },
    });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure);
    assert.equal(f.confirmed.length, 0);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0]?.reason, 'hosted-tool-usage-present');
    assert.equal(diagnostics[0]?.hostedToolUsageShape, shape);
    assert(!JSON.stringify(diagnostics).includes(key));
  }
});

test('usage confirmation is required before delivery; rejected or thrown accounting remains closed', async () => {
  for (const confirmUsage of [async () => 'unknown' as const, async () => { throw Error(key); }]) {
    const diagnostics: OpenAiRejectionDiagnostic[] = [];
    const f = fixture(undefined, { confirmUsage, observeRejection: diagnostic => { diagnostics.push(diagnostic); } });
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure);
    assert.equal(diagnostics[0]?.reason, 'usage-settlement-unconfirmed');
    assert.equal(diagnostics[0]?.reportedTokenCounts?.inputTokens, 100);
  }
  const pending = deferred<'confirmed' | 'unknown'>(); let confirmed = 0;
  const f = fixture(undefined, { confirmUsage: async () => { confirmed++; return pending.promise; } });
  const result = f.transport.dispatch(messages, f.budget); await flush();
  assert.equal(confirmed, 1); f.abort.abort(); assert.deepEqual(await result, unknown);
  pending.resolve('confirmed'); await flush(); assert.deepEqual(await result, unknown); assert.equal(confirmed, 1);
});

test('complete refusals, malformed JSON, schema violations and multiple output parts never escape as candidates', async () => {
  const refused = { ...message(), content: [{ type: 'refusal', refusal: key }] };
  const outputs = [[refused], [], [message(), message()],
    [{ ...message(), status: 'incomplete' }], [{ ...message(), phase: 'commentary' }],
    [{ ...message(), content: [...message().content, ...message().content] }],
    ...['{', '{}', '{"schemaVersion":"other","message":"a"}',
      '{"schemaVersion":"ai_assistant_message_v1","message":" "}',
      '{"schemaVersion":"ai_assistant_message_v1","message":"a","extra":true}',
      '{"schemaVersion":"ai_assistant_message_v1","message":"a","mess\\u0061ge":"b"}',
      '{"schemaVersion":"ai_assistant_message_v1","message":"\\ud800"}'].map(text => [message(text)])];
  for (const output of outputs) {
    const f = fixture(async () => Response.json(envelope({ output })));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure); assert.deepEqual(f.confirmed, [expectedUsage]);
  }
});

test('reasoning metadata is discarded and only the exact final assistant JSON can escape', async () => {
  const reasoning = { id: 'rs_synthetic', type: 'reasoning', summary: [{ type: 'summary_text', text: 'Private reasoning.' }],
    encrypted_content: 'opaque_synthetic_reasoning', status: 'completed' };
  const f = fixture(async () => Response.json(envelope({ output: [reasoning, message()] })));
  const result = await f.transport.dispatch(messages, f.budget);
  assert.equal(result.kind, 'response');
  if (result.kind === 'response') assert.equal(new TextDecoder().decode(result.raw), raw);
  for (const output of [[{ ...reasoning, status: 'in_progress' }, message()], [{ ...reasoning, summary: [{ type: 'unknown' }] }, message()],
    [{ ...message(), content: [{ ...message().content[0], type: 'output_image' }] }],
    [{ ...message(), content: [{ ...message().content[0], refusal: 'hidden refusal' }] }],
    [{ ...message(), content: [{ ...message().content[0], annotations: [{ type: 'url_citation' }] }] }]]) {
    const invalid = fixture(async () => Response.json(envelope({ output })));
    assert.deepEqual(await invalid.transport.dispatch(messages, invalid.budget), failure);
  }
});

test('credential reflection is suppressed after JSON decoding including Unicode escapes', async () => {
  for (const text of [raw.replace('Synthetic reply.', key), raw.replace('Synthetic reply.', '\\u0073' + key.slice(1))]) {
    const f = fixture(async () => Response.json(envelope({ output: [message(text)] })));
    assert.deepEqual(await f.transport.dispatch(messages, f.budget), failure);
    assert.deepEqual(f.confirmed, [expectedUsage]); assert(!JSON.stringify(f.confirmed).includes(key));
  }
});

test('chat bridge reuses exact local authorized messages and does not add provider-owned conversation state', async () => {
  const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Now rest.', checkIns: [],
    history: [{ user: 'Earlier fact.', assistant: 'Earlier suggestion.' }],
    persona: { schemaVersion: 'persona_presentation_v1', tone: 'warm', responseLength: 'concise', formatStyle: 'bulleted' } };
  let sent: unknown;
  const f = fixture(async (_url, init) => {
    const body = JSON.parse(init?.body as string); sent = body.input;
    assert.equal(body.conversation, undefined); assert.equal(body.previous_response_id, undefined); assert.equal(body.metadata, undefined);
    return Response.json(envelope());
  });
  assert.equal((await new OpenAiChatTransport(f.transport).dispatch(input, f.budget)).kind, 'response');
  assert.deepEqual(sent, buildChatMessages(input));
  assert.deepEqual(await new OpenAiChatTransport(f.transport).dispatch({ ...input, currentMessage: '' }, f.budget), unknown);
});

test('the explicit goal profile uses the same Responses body through the authorized chat bridge', async () => {
  const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Now rest.',
    contextMode: 'selected_checkins_v1', checkIns: [{ occurredAt: '2026-10-24T10:00:00.000Z', noteText: 'Tried sketching.' }],
    history: [{ user: 'Earlier fact.', assistant: 'Earlier suggestion.' }],
    persona: { schemaVersion: 'persona_presentation_v1', tone: 'warm', responseLength: 'concise', formatStyle: 'bulleted' } };
  const settings = { ...config, promptProfile: 'goal-grounding-v1' } as const;
  const authorized = buildChatMessages(input);
  const baseline = buildOpenAiRequest(authorized, config);
  const candidate = buildOpenAiRequest(authorized, settings);
  assert.equal(buildOpenAiRequest(authorized, { ...config, promptProfile: 'baseline' }), baseline);
  const { input: changed, ...controls } = JSON.parse(candidate);
  assert.equal(changed[0].role, 'system');
  assert(changed[0].content.startsWith(`${authorized[0]!.content}\n\n`));
  assert.deepEqual({ ...controls, input: [authorized[0], ...changed.slice(1)] }, JSON.parse(baseline));
  const f = fixture(async (_url, init) => {
    assert.equal(init?.body, candidate);
    return Response.json(envelope());
  }, { inputTokenUpperBound: body => { assert.equal(body, candidate); return 100; } }, settings);
  assert.equal((await new OpenAiChatTransport(f.transport).dispatch(input, f.budget)).kind, 'response');
});
