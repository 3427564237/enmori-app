import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCases } from './evaluation.mjs';
import { loadF0Cases, prepareF0Case } from './f0-evaluation.mjs';

test('eight separate F0 cases compile through fake HTTP without changing the approved cloud corpus', async () => {
  const original = loadCases();
  assert.equal(original.corpusSha256, '1f216f2d8a4facafaac55eb9567c2136864999cc68c6759e831a81693ff0912a');
  const corpus = loadF0Cases(); assert.equal(corpus.reviewStatus, 'pending-independent-QA');
  for (const fixture of corpus.cases) {
    assert.ok(!original.cases.some(c => c.id === fixture.id));
    const request = await prepareF0Case(fixture), body = JSON.parse(request.body);
    assert.equal(request.url, 'http://127.0.0.1:11434/api/chat');
    assert.deepEqual(JSON.parse(body.messages[1].content), fixture.input);
    assert.equal(body.messages.length, 2);
    assert.deepEqual(body.options, { num_ctx: 8192, num_predict: 512 });
    assert.equal(body.think, false); assert.equal(body.tools, undefined);
    assert.ok(Object.values(fixture.criteria).every(v => typeof v === 'string' && v.trim()));
  }
});
