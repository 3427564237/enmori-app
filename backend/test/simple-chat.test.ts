import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalChatTransport, simpleChatGates } from '../src/ai-runtime/infrastructure/local-chat-transport.js';
import { parseOutput } from '../src/ai-runtime/domain/parse-output.js';
import type { ConversationInput } from '../src/ai-conversation/ports/conversation-lifecycle.js';

const input: ConversationInput = { strategy: 'open_conversation_v1', currentMessage: 'What about two songs?', checkIns: [], persona: undefined,
  history: [{ user: 'I enjoy piano music.', assistant: 'What sort of piano music?' }] };
const budget = () => ({ signal: new AbortController().signal, deadline: 60000, remainingMs: () => 60000 });
test('simple chat keeps numbers, questions, code and links as text; authorized history reaches local model', async () => {
  const message = 'Do you have a preference? Try 2 ideas. https://example.org\n```text\nhello\n```';
  const transport = new LocalChatTransport('qwen3.5:9b', async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(init!.body as string);
    assert.equal(body.think, false); assert.equal(body.tools, undefined);
    assert.equal(body.messages[1].content, input.history![0]!.user);
    assert.equal(body.messages.at(-1).content, input.currentMessage);
    return Response.json({ done: true, model: 'qwen3.5:9b', message: { content: JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message }) } });
  });
  const raw = await transport.generate(input, budget());
  assert.equal(parseOutput(raw, 'ai_assistant_message_v1').ok, false);
  const parsed = parseOutput(raw, 'ai_assistant_message_v1', true); assert.ok(parsed.ok);
  assert.equal((await simpleChatGates.candidate(() => input, () => parsed.value, budget())).ok, true);
  assert.deepEqual(transport.state, { pending: false, outcomeUnknown: false });
});
test('plan adapter forwards corrections in order without rewriting user text or model output', async () => {
  const correction: ConversationInput = {
    strategy: 'open_conversation_v1', checkIns: [], persona: undefined,
    history: [{
      user: 'Test label Cedar25. I want a quiet 15 minute break after studying, indoors with no equipment or spending.',
      assistant: 'Cedar25：先检查设备，然后复习笔记。',
    }],
    currentMessage: '上面的回复偏题了。我只想休息，不要检查设备或复习。Reply in English with three steps totaling 15 minutes and my earlier marker.',
  };
  const requests: Array<{ messages: Array<{ role: string; content: string }>; options: unknown; think: boolean; tools?: unknown }> = [];
  const output = { schemaVersion: 'ai_assistant_message_v1', message:
    'Cedar25: 1. Sit comfortably for 3 minutes. 2. Rest quietly for 9 minutes. 3. Gently stretch for 3 minutes.' };
  const transport = new LocalChatTransport('qwen3.5:9b', async (_url, init) => {
    requests.push(JSON.parse(init!.body as string));
    return Response.json({ done: true, model: 'qwen3.5:9b', message: { content: JSON.stringify(output) } });
  });
  const raw = await transport.generate(correction, budget());
  assert.equal(requests.length, 1, 'One inference; no hidden model repair or retry');
  const request = requests[0]!;
  assert.equal(request.messages[0]!.role, 'system');
  assert.deepEqual(request.messages.slice(1), [
    { role: 'user', content: correction.history![0]!.user },
    { role: 'assistant', content: correction.history![0]!.assistant },
    { role: 'user', content: correction.currentMessage },
  ]);
  assert.deepEqual(request.options, { num_ctx: 8192, num_predict: 512 });
  assert.equal(request.think, false);
  assert.equal(request.tools, undefined);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(raw)), output);
  assert.deepEqual(transport.state, { pending: false, outcomeUnknown: false });
});
test('simple chat retains malformed output, revoked request and unauthorized source boundaries', async () => {
  assert.equal(parseOutput(new TextEncoder().encode('{"message":"hello"}'), 'ai_assistant_message_v1', true).ok, false);
  const controller = new AbortController(); controller.abort();
  const expired = { ...budget(), signal: controller.signal };
  assert.equal((await simpleChatGates.beforeGeneration(() => input, expired)).ok, false);
  let calls = 0;
  const transport = new LocalChatTransport('qwen3.5:9b', async () => { calls++; throw Error('unexpected'); });
  await assert.rejects(transport.generate({ ...input, checkIns: [{ occurredAt: '2026-10-19', noteText: 'not allowed in this composition' }] }, budget()));
  assert.equal(calls, 0);
});
test('late provider completion releases lane without delivering cancelled text; HTTP failure is settled', async () => {
  let complete!: (response: Response) => void;
  const controller = new AbortController();
  const transport = new LocalChatTransport('qwen3.5:9b', async (_url, init) => {
    controller.abort();
    assert.equal(init!.signal!.aborted, false, 'keep reading the original response after user cancellation');
    return new Promise<Response>(resolve => { complete = resolve; });
  });
  const operation = transport.generate(input, { ...budget(), signal: controller.signal });
  assert.equal(transport.state.pending, true);
  complete(Response.json({ done: true, model: 'qwen3.5:9b', message: { content: '{}' } }));
  await assert.rejects(operation);
  assert.deepEqual(transport.state, { pending: false, outcomeUnknown: false });
  const failed = new LocalChatTransport('qwen3.5:9b', async () => new Response('unavailable', { status: 503 }));
  await assert.rejects(failed.generate(input, budget()));
  assert.deepEqual(failed.state, { pending: false, outcomeUnknown: false });
});
test('retained messages preserve original server timestamp across imported metadata and replacement writes', async () => {
  const { Timestamp } = await import('firebase-admin/firestore');
  const { withRetainedMessageTimes } = await import('../src/ai-conversation/infrastructure/retained-message-times.js');
  const original = new Timestamp(100, 123000), path = 'accounts/a/conversations/b/messages/c';
  let saved: any;
  const row = { id: 'c', data: { role: 'user', retainedCreatedAt: original }, createTime: { seconds: 999, nanoseconds: 0 } };
  const base: any = { runTransaction: async (work: any) => work({
    getSnapshot: async () => row, listSnapshots: async () => [row],
    get: async () => row.data, set: (_path: string, value: any) => { saved = value; },
    create: (_path: string, value: any) => { saved = value; },
  }) };
  await withRetainedMessageTimes(base).runTransaction(async tx => {
    const read = (await tx.getSnapshot!(path))!;
    assert.deepEqual(read.createTime, { seconds: 100, nanoseconds: 123000 });
    assert.equal(read.data.retainedCreatedAt, undefined);
    tx.set(path, { ...read.data, acceptedAssistantMessageId: 'd' });
    assert.equal(saved.retainedCreatedAt, original);
    assert.throws(() => tx.create(path, { retainedCreatedAt: original }));
    tx.create(path, { role: 'user' });
    assert.equal(saved.retainedCreatedAt.constructor.name, 'ServerTimestampTransform');
  });
});
