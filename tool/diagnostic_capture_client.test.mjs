import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import { createHostDiagnostics, installedCapture } from './diagnostic_capture_client.mjs';

test('host collector validates and forwards only Q14 metadata to a fixed helper action', () => {
  const calls = [], diagnostics = createHostDiagnostics((command, row) => { calls.push({ command, row }); });
  assert.equal(diagnostics.healthy, true);
  diagnostics.observe({ stage: 'preflight_ps', status: 'passed', durationMs: 1 });
  assert.deepEqual(calls.map(call => call.command), ['health', 'append']);
  assert.deepEqual(Object.keys(calls[1].row).sort(), ['dependencyStage', 'dependencyStatus', 'durationMs', 'loggedAt']);
});

test('failed installed health is latched across apparent recovery and does not emit private error', () => {
  let failed = true;
  const diagnostics = createHostDiagnostics(() => { if (failed) throw new Error('private config canary'); });
  assert.equal(diagnostics.healthy, false); failed = false;
  assert.equal(diagnostics.healthy, false);
});

test('write or current runner health failure refuses new positive requests and preserves read/cancel', async t => {
  for (const failure of ['append', 'health']) {
    let failed = false, positives = 0;
    const diagnostics = createHostDiagnostics(command => { if (failed && command === failure) throw new Error('private path canary'); });
    const app = Fastify({ logger: false }); t.after(() => app.close()); diagnostics.install(app);
    app.post('/v1/me/ai/operations', async () => { positives++; return {}; });
    app.post('/v1/me/ai/operations/:operationId/cancel', async () => ({}));
    app.get('/v1/me/conversations/:conversationId/operations/:operationId', async () => ({}));
    assert.equal((await app.inject({ method: 'POST', url: '/v1/me/ai/operations' })).statusCode, 200);
    failed = true;
    const result = await app.inject({ method: 'POST', url: '/v1/me/ai/operations' });
    assert.equal(result.statusCode, 503); assert.equal(positives, 1);
    assert(!result.body.includes('private'));
    assert.equal((await app.inject({ method: 'POST', url: '/v1/me/ai/operations/synthetic/cancel' })).statusCode, 200);
    assert.equal((await app.inject({ method: 'GET', url: '/v1/me/conversations/synthetic/operations/synthetic' })).statusCode, 200);
  }
});

test('installed adapter rejects any non-fixed action before privilege invocation', () => {
  for (const command of ['read', 'cleanup', 'shell', 'append extra']) assert.throws(() => installedCapture(command), /CAPTURE_UNAVAILABLE/);
});
