import test from 'node:test';
import assert from 'node:assert/strict';
import { runF0, f0CorpusSha256, validateF0Authorization } from './f0-runner.mjs';

const message = '{"schemaVersion":"ai_assistant_message_v1","message":"MOCK ONLY"}';
const good = url => Response.json({ model: 'qwen3.5:9b', done: true, done_reason: 'stop',
  ...(url.endsWith('/generate') ? { response: '' } : { message: { content: message } }) });
const options = () => ({ mode: 'mock', http: async url => good(url), save() {}, guard() {} });

test('one production lane: optional empty preload then exact eight sequential generation bodies', async () => {
  const calls = [], saved = new Map(); let pending = false;
  const result = await runF0({ ...options(), preload: true, save: (name, value) => saved.set(name, value),
    http: async (url, init) => { assert.equal(pending, false); pending = true;
      const body = JSON.parse(init.body); calls.push(body);
      assert.equal(body.options.num_ctx, 8192);
      if (url.endsWith('/chat')) { assert.equal(body.options.num_predict, 512); assert.equal(body.think, false); }
      await new Promise(resolve => setImmediate(resolve)); pending = false; return good(url); } });
  assert.deepEqual(result.counts, { emptyPreloads: 1, generations: 8 });
  assert.equal(calls[0].prompt, ''); assert.equal(calls.length, 9); assert.equal(saved.size, 18);
  assert.equal(result.realProviderCalls, 0); assert.equal(result.rows.length, 8);
  assert(result.rows.every(row => row.protocol.eligible && row.observation.rawBodySha256 && row.observation.rawText === message));
  assert.deepEqual(result.laneState, { pending: false, outcomeUnknown: false });
});

test('unknown HTTP, envelopes, UTF-8, reader, receive timeout stop without second dispatch', async t => {
  const responses = [
    ['http', async () => new Response('unavailable', { status: 503 })],
    ['duplicate', async () => new Response('{"model":"qwen3.5:9b","done":false,"done":true}')],
    ['wrong model', async () => Response.json({ model: 'other', done: true })],
    ['not done', async () => Response.json({ model: 'qwen3.5:9b', done: false })],
    ['invalid utf8', async () => new Response(new Uint8Array([0xff]))],
    ['lost', async () => { throw Error('FAKE_CONNECTION_LOST'); }],
    ['reader', async () => new Response(new ReadableStream({ start(c) { c.error(Error('FAKE_READER_LOST')); } }))],
    ['oversize', async () => new Response('x'.repeat(1024 * 1024 + 1))],
    ['timeout', async () => new Promise(() => {})],
  ];
  for (const [name, http] of responses) await t.test(name, async () => {
    let calls = 0;
    const result = await runF0({ ...options(), receiveMs: 30, http: (...args) => { calls++; return http(...args); } });
    assert.equal(calls, 1); assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].observation.physicallySettled, false);
    assert.equal(result.laneState.pending, true); assert.notEqual(result.stopReason, 'case-budget-exhausted');
  });
});

test('known invalid output stays raw, frees the lane and is not repaired or retried', async () => {
  const result = await runF0({ ...options(), http: async () => Response.json({ model: 'qwen3.5:9b', done: true,
    done_reason: 'length', message: { content: '{bad' } }) });
  assert.equal(result.counts.generations, 8);
  assert(result.rows.every(row => !row.protocol.eligible && row.observation.rawText === '{bad'));
  assert.deepEqual(result.laneState, { pending: false, outcomeUnknown: false });
});

test('late complete response is physically settled but delivery is ineligible', async () => {
  let time = 0;
  const result = await runF0({ ...options(), now: () => time,
    http: async url => { time += 46_000; return good(url); } });
  assert.equal(result.rows.length, 8);
  assert(result.rows.every(row => row.observation.physicallySettled && !row.protocol.eligible));
  assert.equal(result.laneState.pending, false);
});

test('cancellation or expired authorization during intent persistence dispatches zero requests', async t => {
  for (const kind of ['cancel', 'expire']) await t.test(kind, async () => {
    const controller = new AbortController(); let expired = false, calls = 0;
    const result = await runF0({ ...options(), signal: controller.signal,
      http: async url => { calls++; return good(url); },
      save: name => { if (name.endsWith('.request.json')) kind === 'cancel' ? controller.abort() : expired = true; },
      guard: () => { if (expired) throw Error('F0_AUTHORIZATION_INVALID'); } });
    assert.equal(calls, 0); assert.equal(result.counts.generations, 0); assert.equal(result.rows[0].observation.outcome, 'not-started');
  });
});

test('preload invalid/unknown prevents all generation', async () => {
  const result = await runF0({ ...options(), preload: true,
    http: async () => Response.json({ model: 'qwen3.5:9b', done: true, response: 'unexpected' }) });
  assert.deepEqual(result.counts, { emptyPreloads: 1, generations: 0 }); assert.equal(result.rows.length, 0);
});

test('response artifact failure preserves physical settlement and stops before another case', async () => {
  const result = await runF0({ ...options(), save: name => {
    if (name.endsWith('.response.json')) throw Error('FAKE_CAPTURE_FAILURE');
  } });
  assert.equal(result.counts.generations, 1); assert.equal(result.stopReason, 'FAKE_CAPTURE_FAILURE');
  assert.deepEqual(result.laneState, { pending: false, outcomeUnknown: false });
});

test('authorization binds exact source, fixture, slot, limits and expiry', () => {
  const binding = { sourceHead: 'a'.repeat(40), sourceBundleSha256: 'b'.repeat(64), preload: true, now: 1000 };
  const auth = { schemaVersion: 'f0_local_authorization_v1', status: 'approved', approvedBy: 'Integration',
    scope: 'enmori-f0-exact8-20261025', slotReference: 'fake-test-slot-only', hostReadbackReference: 'fake-host-only',
    sourceHead: binding.sourceHead, sourceBundleSha256: binding.sourceBundleSha256, corpusSha256: f0CorpusSha256(),
    model: 'qwen3.5:9b', maxGenerationRequests: 8, maxEmptyPreloads: 1, expiresAt: new Date(2000).toISOString() };
  validateF0Authorization(auth, binding);
  for (const change of [{ sourceHead: 'c'.repeat(40) }, { corpusSha256: 'x' }, { maxGenerationRequests: 9 },
    { maxEmptyPreloads: 0 }, { model: 'qwen3.5:0.8b' }, { expiresAt: new Date(999).toISOString() }, { approvedBy: 'MOCK' }])
    assert.throws(() => validateF0Authorization({ ...auth, ...change }, binding), /F0_AUTHORIZATION_INVALID/);
});
