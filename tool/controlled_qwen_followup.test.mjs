import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findCompleteInputBoundaries, runCompleteInputProbe, runCancellationProbe, runSemanticProbe } from './controlled_qwen_followup.mjs';
const binding = { endpoint: 'http://127.0.0.1:11434', reference: 'synthetic:9b', manifestDigest: 'a'.repeat(64), tokenizerDigest: 'b'.repeat(64),
  ollamaVersion: '0.0.0-test', mode: 'formal-9b', current: () => true };
const counter = { manifestDigest: binding.manifestDigest, tokenizerDigest: binding.tokenizerDigest, current: () => true,
  count: async raw => 190 + (raw.match(/🧭/gu)?.length ?? 0) * 3 + (JSON.parse(raw.split('<|im_start|>user\n')[1].split('<|im_end|>')[0]).currentMessage.match(/ a/g)?.length ?? 0) };
const model = { name: binding.reference, digest: binding.manifestDigest, details: { family: 'qwen35', parameter_size: '9B' }, context_length: 8192 };
const reads = url => Response.json(new URL(String(url)).pathname === '/api/version' ? { version: binding.ollamaVersion } : { models: [model] });

for (const [message, accepted] of [['你提到：今天读书了。', true], ['你今天阅读了一本书。', false], ['你提到：今天读书了。你应该每天坚持。', false]]) {
  test(`guided real semantic gate keeps exact-attribution outcome ${accepted ? 'accepted' : 'rejected'} without response repair`, async () => {
    let measured, posts = 0;
    const result = await runSemanticProbe(binding, { ...counter, count: async raw => { measured = raw; return 600; } }, async (url, init) => {
      if (new URL(String(url)).pathname !== '/api/generate') return reads(url);
      posts++;
      const body = JSON.parse(init.body);
      assert.equal(body.prompt, measured);
      assert(body.prompt.includes('bounded_routine_summary_v1'));
      assert(body.prompt.includes('Never paraphrase, translate, normalize, shorten or extend'));
      assert(body.prompt.includes('你提到：今天读书了。'));
      assert.equal(body.raw, true);
      return Response.json({ model: binding.reference, done: true, response: JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message }),
        prompt_eval_count: 600, eval_count: 20 });
    });
    assert.equal(posts, 1); assert.equal(result.status, accepted ? 'Pass' : 'Not Proven');
    assert.equal(result.results[0].usersCommitted, 1); assert.equal(result.results[0].assistantsCommitted, accepted ? 1 : 0);
    assert.equal(result.results[0].bodiesAccepted, accepted ? 1 : 0); assert.equal(result.results[0].borrowedGettersRevoked, true);
    assert.equal(result.policyVersion, 'bounded_routine_summary_v1'); assert.equal(result.productWrites, 0);
    assert.equal(result.actualDatabase, 'Not Run'); assert.equal(JSON.stringify(result).includes(message), false);
    if (!accepted) assert.equal(result.results[0].failure, 'AI_REPLY_REJECTED');
  });
}
test('bounded search observes exact full valid input counts without raw control-token stuffing', async () => {
  const result = await findCompleteInputBoundaries(counter);
  assert.equal(result.hits.size, 2); assert(result.measurements <= 192);
  for (const row of result.hits.values()) { assert(row.codePoints <= 2400); assert(!row.input.currentMessage.includes('<|')); }
});
test('a tokenizer unable to produce exact targets remains incomplete rather than rounding to Pass', async () => {
  const result = await findCompleteInputBoundaries({ ...counter, count: async () => 100 }, 20);
  assert.equal(result.hits.size, 0); assert.equal(result.measurements, 20);
});
test('full 4097 rejection is observed before any real-adapter generation call', async () => {
  let posts = 0;
  const result = await runCompleteInputProbe(binding, counter, async (url, init) => { if (init?.method === 'POST') posts++; return reads(url); });
  assert.equal(result.status, 'Pass'); assert.equal(result.generatePostCalls, 0); assert.equal(posts, 0);
});
test('operator cancellation probe records uncertain termination and forbids a second invocation', async () => {
  let posts = 0;
  const result = await runCancellationProbe(binding, { ...counter, count: async () => 193 }, async (url, init) => {
    if (new URL(String(url)).pathname !== '/api/generate') return reads(url);
    posts++; return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('synthetic abort')), { once: true }));
  });
  assert.equal(result.status, 'Pass'); assert.equal(posts, 1); assert.equal(result.remoteStopProved, false);
  assert.equal(result.quarantined, true); assert.equal(result.nextAdmissionDenied, true); assert.equal(result.productWrites, 0);
});
