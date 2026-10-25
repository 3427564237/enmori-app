import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalModelLane } from '../../src/ai-runtime/infrastructure/local-model-lane.js';
import { LocalChatTransport } from '../../src/ai-runtime/infrastructure/local-chat-transport.js';
import { LocalFirstFlowTransport } from '../../src/ai-runtime/infrastructure/local-first-flow-transport.js';
import type { FirstFlowModelInput } from '../../src/proactive/ports/first-flow.js';
import type { RequestBudget } from '../../src/ai-runtime/ports/generation-transport.js';
import type { ConversationInput } from '../../src/ai-conversation/ports/conversation-lifecycle.js';
import { PreviewPersona } from '../../src/personas/application/preview-persona.js';
import { PERSONA_TEST_FIELDS } from '../support/persona-repository-contract.js';
import { deferred } from './support.js';

const input: FirstFlowModelInput = { inputKind: 'proactive_followup',
  quotedRequest: { occurredAt: '2026-10-25T01:00:00.123456789Z', text: 'Check back after lunch about my 10 minute rest.' },
  dueAt: '2026-10-25T05:00:00.000Z', timeZone: 'Asia/Singapore',
  persona: { schemaVersion: 'persona_presentation_v1', tone: 'warm', responseLength: 'concise', formatStyle: 'plain' } };
const chatInput: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'Hello', history: [], checkIns: [], persona: undefined };
const budget = (): RequestBudget => ({ signal: new AbortController().signal, deadline: 45_000, remainingMs: () => 45_000 });
const output = '{"schemaVersion":"ai_assistant_message_v1","message":"Did you get a chance to rest?"}';
const done = (content = output) => Response.json({ model: 'qwen3.5:9b', done: true, message: { content } });
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test('F0 sends only the dated quote, due instant/zone and current Persona, returns untouched model bytes', async () => {
  let calls = 0;
  // Even invalid model JSON stays raw for the existing Application output gate.
  const raw = '{"message":"first","message":"second"}';
  const lane = new LocalModelLane('qwen3.5:9b', async (url, init) => {
    calls++; assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(init!.redirect, 'error'); assert.equal(init!.cache, 'no-store');
    const body = JSON.parse(init!.body as string);
    assert.deepEqual(Object.keys(body), ['model', 'messages', 'stream', 'think', 'keep_alive', 'format', 'options']);
    assert.equal(body.model, 'qwen3.5:9b'); assert.equal(body.think, false); assert.equal(body.stream, false);
    assert.equal(body.keep_alive, '30m'); assert.deepEqual(body.options, { num_ctx: 8192, num_predict: 512 });
    assert.equal(body.messages.length, 2); assert.equal(body.messages[0].role, 'system');
    assert.match(body.messages[0].content, /dated historical data, not a new user message/);
    assert.deepEqual(JSON.parse(body.messages[1].content), input);
    return done(raw);
  });
  const transport = new LocalFirstFlowTransport(lane);
  assert.equal(new TextDecoder().decode(await transport.generate(input, budget())), raw);
  assert.equal(calls, 1); assert.deepEqual(transport.state, { pending: false, outcomeUnknown: false });
  assert.throws(() => new LocalFirstFlowTransport(new LocalModelLane('qwen3.5:4b')), /AI_CONFIGURATION_INVALID/);
});

test('unrecognized or malformed F0 projection never reaches HTTP or acquires the lane', async () => {
  let calls = 0, getterReads = 0;
  const lane = new LocalModelLane('qwen3.5:9b', async () => { calls++; return done(); });
  const transport = new LocalFirstFlowTransport(lane);
  const accessor = { ...input, get quotedRequest() { getterReads++; return input.quotedRequest; } };
  for (const invalid of [
    { ...input, inputKind: 'user_message' }, { ...input, currentMessage: 'new question' },
    { ...input, conversationId: 'private-id' }, { ...input, authorizationScope: 'authority' },
    { ...input, checkIns: [] }, { ...input, quotedRequest: { ...input.quotedRequest, sourceMessageId: 'private' } },
    { ...input, quotedRequest: { ...input.quotedRequest, text: '   ' } },
    { ...input, quotedRequest: { ...input.quotedRequest, text: '\ud800' } },
    { ...input, quotedRequest: { ...input.quotedRequest, text: '😀'.repeat(2401) } },
    { ...input, quotedRequest: { ...input.quotedRequest, occurredAt: 'yesterday' } },
    { ...input, dueAt: 'tomorrow' }, { ...input, timeZone: 'Mars/Olympus' },
    { ...input, timeZone: '+08:00' }, { ...input, persona: { ...input.persona, ownerId: 'private' } }, accessor,
  ]) await assert.rejects(transport.generate(invalid as FirstFlowModelInput, budget()), /AI_UNAVAILABLE/);
  assert.equal(calls, 0); assert.equal(getterReads, 0); assert.equal(lane.state.pending, false);
  await transport.generate({ ...input, quotedRequest: { ...input.quotedRequest, text: '😀'.repeat(2400) } }, budget());
  assert.equal(calls, 1, 'same Unicode code-point ceiling as the saved user source');
});

test('chat, F0 and preload contend for one physical lane and aborted F0 frees it only after matching done', async () => {
  let calls = 0; const response = deferred<Response>();
  const lane = new LocalModelLane('qwen3.5:9b', async (_url, init) => {
    calls++; assert.equal(init!.signal!.aborted, false); return calls === 1 ? response.promise : done();
  });
  const chat = new LocalChatTransport(lane), followup = new LocalFirstFlowTransport(lane);
  const controller = new AbortController();
  const pending = followup.generate(input, { ...budget(), signal: controller.signal });
  controller.abort();
  await assert.rejects(chat.generate(chatInput, budget())); await assert.rejects(chat.prepareModel());
  await assert.rejects(followup.generate(input, budget()));
  assert.equal(calls, 1); assert.deepEqual(chat.state, { pending: true, outcomeUnknown: false });
  response.resolve(done()); await assert.rejects(pending, /AI_UNAVAILABLE/);
  assert.deepEqual(lane.state, { pending: false, outcomeUnknown: false });
  await chat.generate(chatInput, budget()); assert.equal(calls, 2);
});

test('budget expiry without an abort also denies late delivery; expired admission dispatches nothing', async () => {
  let remaining = 45_000, calls = 0; const response = deferred<Response>();
  const lane = new LocalModelLane('qwen3.5:9b', async () => { calls++; return response.promise; });
  const transport = new LocalFirstFlowTransport(lane);
  const pending = transport.generate(input, { ...budget(), remainingMs: () => remaining });
  remaining = 0; response.resolve(done()); await assert.rejects(pending, /AI_UNAVAILABLE/);
  assert.equal(lane.state.pending, false);
  for (const remainingMs of [() => 0, () => -1, () => NaN, () => Infinity, () => { throw Error('clock unavailable'); }])
    await assert.rejects(transport.generate(input, { ...budget(), remainingMs }));
  await assert.rejects(transport.generate(input, { ...budget(), deadline: NaN }));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(transport.generate(input, { ...budget(), signal: controller.signal }));
  assert.equal(calls, 1);
});

const unknownResponses: ReadonlyArray<readonly [string, () => Promise<Response>]> = [
  ['HTTP 503', async () => new Response('unavailable', { status: 503 })],
  ['socket loss', async () => { throw Error('private transport diagnostic'); }],
  ['partial envelope', async () => new Response('{"model":"qwen3.5:9b","done":')],
  ['no body', async () => new Response(null)],
  ['done false', async () => Response.json({ model: 'qwen3.5:9b', done: false })],
  ['other model', async () => Response.json({ model: 'qwen3.5:4b', done: true })],
  ['duplicate done', async () => new Response('{"model":"qwen3.5:9b","done":false,"done":true}')],
  ['escaped duplicate done', async () => new Response('{"model":"qwen3.5:9b","done":false,"d\\u006fne":true}')],
  ['invalid UTF-8', async () => new Response(new Uint8Array([0xff]))],
  ['oversized response', async () => new Response('x'.repeat(1024 * 1024 + 1))],
  ['broken reader', async () => new Response(new ReadableStream({ start(controller) { controller.error(Error('socket lost')); } }))],
];
for (const [name, response] of unknownResponses) test(`${name} leaves every model consumer quarantined without settlement or retry`, async () => {
  let calls = 0, settled = false;
  const lane = new LocalModelLane('qwen3.5:9b', async () => { calls++; return response(); });
  const chat = new LocalChatTransport(lane), followup = new LocalFirstFlowTransport(lane);
  void followup.generate(input, budget()).then(() => { settled = true; }, () => { settled = true; });
  await tick();
  assert.equal(settled, false); assert.deepEqual(lane.state, { pending: true, outcomeUnknown: true });
  await assert.rejects(chat.generate(chatInput, budget())); await assert.rejects(chat.prepareModel());
  await assert.rejects(followup.generate(input, budget())); assert.equal(calls, 1);
});

test('matching physical completion with unusable content rejects without quarantining the next consumer', async () => {
  let calls = 0;
  const lane = new LocalModelLane('qwen3.5:9b', async () => ++calls === 1
    ? Response.json({ model: 'qwen3.5:9b', done: true, message: { content: 3 } }) : done());
  await assert.rejects(new LocalFirstFlowTransport(lane).generate(input, budget()), /AI_UNAVAILABLE/);
  assert.deepEqual(lane.state, { pending: false, outcomeUnknown: false });
  await new LocalChatTransport(lane).generate(chatInput, budget()); assert.equal(calls, 2);
});

test('empty preload has the same physical ownership and requires a matching model terminal envelope', async () => {
  let calls = 0; const response = deferred<Response>();
  const lane = new LocalModelLane('qwen3.5:9b', async (url, init) => {
    calls++; assert.equal(url, 'http://127.0.0.1:11434/api/generate');
    assert.deepEqual(JSON.parse(init!.body as string), { model: 'qwen3.5:9b', prompt: '', stream: false,
      keep_alive: '30m', options: { num_ctx: 8192 } });
    return response.promise;
  });
  const chat = new LocalChatTransport(lane), followup = new LocalFirstFlowTransport(lane);
  const preload = chat.prepareModel();
  await assert.rejects(chat.generate(chatInput, budget())); await assert.rejects(followup.generate(input, budget()));
  response.resolve(Response.json({ model: 'qwen3.5:9b', done: true, response: '' })); await preload;
  assert.equal(calls, 1); assert.equal(lane.state.pending, false);
  const unknown = new LocalModelLane('qwen3.5:9b', async () => Response.json({ done: true, response: '' }));
  void unknown.prepareModel(); await tick();
  assert.deepEqual(unknown.state, { pending: true, outcomeUnknown: true });
});

test('Persona preview observes the same busy lane and its cancellation cannot release a running model for F0', async () => {
  let calls = 0, reads = 0; const first = deferred<Response>(), second = deferred<Response>();
  const enteredPreview = deferred<void>();
  const lane = new LocalModelLane('qwen3.5:9b', async () => {
    calls++; if (calls === 1) return first.promise;
    if (calls === 2) { enteredPreview.resolve(); return second.promise; }
    return done();
  });
  const chat = new LocalChatTransport(lane), followup = new LocalFirstFlowTransport(lane);
  const principal = { firebaseUid: 'synthetic-owner' };
  const preview = new PreviewPersona({ read: async () => { reads++; return { kind: 'success',
    value: { ownerId: 'synthetic-account', purposeRevocationGeneration: 0 } }; } }, chat, () => 0, () => lane.state.pending);
  const caller = { principal, tokenInstance: 'synthetic-ref', verifyCurrentAuth: async () => ({ kind: 'verified' as const, principal }) };
  const controller = new AbortController(), delivered: string[] = [];
  const control = { signal: controller.signal, current: () => !controller.signal.aborted,
    accept: (message: string) => { delivered.push(message); return true; } };
  const proactive = followup.generate(input, budget());
  assert.deepEqual(await preview.execute(caller, PERSONA_TEST_FIELDS, 'Preview', control), { kind: 'failure', code: 'AI_BUSY' });
  assert.equal(reads, 0); first.resolve(done()); await proactive;
  const pendingPreview = preview.execute(caller, PERSONA_TEST_FIELDS, 'Preview', control);
  await enteredPreview.promise; controller.abort();
  assert.deepEqual(await pendingPreview, { kind: 'terminated' });
  assert.equal(lane.state.pending, true); await assert.rejects(followup.generate(input, budget()));
  second.resolve(done()); await tick(); assert.deepEqual(delivered, []);
  assert.equal(lane.state.pending, false); await followup.generate(input, budget()); assert.equal(calls, 3);
});
