import assert from 'node:assert/strict';
import test from 'node:test';
import { summarize } from './backend_latency_probe.mjs';

test('latency includes failed and timeout attempts instead of reporting success-only percentiles', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ status: i < 28 ? 200 : 0,
    timeout: i >= 28, elapsedMs: i < 28 ? 500 : 15000 }));
  const result = summarize(rows, 3000);
  assert.equal(result.p50Ms, 500); assert.equal(result.p95Ms, 15000);
  assert.equal(result.timeouts, 2); assert.equal(result.failures, 2); assert.equal(result.meetsTarget, false);
});

test('even a fast failed response prevents an acceptance claim', () => {
  const result = summarize([{ status: 503, timeout: false, elapsedMs: 100 }], 3000);
  assert.equal(result.p95Ms, 100); assert.equal(result.meetsTarget, false);
});
