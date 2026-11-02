import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudConfirmedCostNanoUsd, cloudCostCapNanoUsd, cloudReservationNanoUsd, decodeCloudConfirmedUsage, decodeCloudCostGrant }
  from '../../src/ai-runtime/domain/cloud-cost.js';
import type { CloudCostGrant } from '../../src/ai-runtime/ports/cloud-cost-budget.js';
import { syntheticCostAttempt, syntheticCostGrant, syntheticCostUsage } from '../support/cloud-cost-fixtures.js';

test('fixed grant uses exact floor of 5 percent of original cycle gift, capped by verified spendable credit', () => {
  assert.equal(cloudCostCapNanoUsd(101, 100), 5);
  assert.equal(cloudCostCapNanoUsd(101, 3), 3);
  assert.equal(cloudCostCapNanoUsd(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), Number(BigInt(Number.MAX_SAFE_INTEGER) / 20n));
  assert.equal(cloudCostCapNanoUsd(101, 0), 0);
  for (const invalid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(cloudCostCapNanoUsd(invalid, 10), undefined);
  assert.ok(decodeCloudCostGrant(syntheticCostGrant));
  assert.equal(decodeCloudCostGrant({ ...syntheticCostGrant, capNanoUsd: 1_000_001 }), undefined);
});

test('reservation uses premium cache-write rate and includes all possible reasoning output', () => {
  assert.equal(cloudReservationNanoUsd(syntheticCostGrant, syntheticCostAttempt), 600);
  assert.equal(cloudConfirmedCostNanoUsd(syntheticCostGrant, syntheticCostUsage), 133);
  assert.equal(cloudConfirmedCostNanoUsd(syntheticCostGrant, { ...syntheticCostUsage, reasoningTokens: 10 }), 133);
  assert.equal(cloudConfirmedCostNanoUsd(syntheticCostGrant, { ...syntheticCostUsage, inputTokens: 1, cachedInputTokens: 1,
    cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 1 }), 1);
});

test('unknown pricing and model access price entries never supply a default rate', () => {
  const missing = structuredClone(syntheticCostGrant) as unknown as Record<string, unknown>;
  const prices = (missing.priceSnapshot as { prices: Record<string, unknown>[] }).prices;
  delete prices[0]!.cacheWriteNanoUsdPerMillionTokens;
  assert.equal(decodeCloudCostGrant(missing), undefined);
  assert.equal(cloudReservationNanoUsd(syntheticCostGrant, { ...syntheticCostAttempt, model: 'gpt-6.1-sol' }), undefined);
  assert.equal(cloudReservationNanoUsd(syntheticCostGrant, { ...syntheticCostAttempt, maxInputTokens: 272_001 }), undefined);
  assert.equal(decodeCloudCostGrant({ ...syntheticCostGrant, priceSnapshot: { ...syntheticCostGrant.priceSnapshot, validUntilMs: 950_000 } }), undefined);
});

test('usage subsets, total equality, safe integers and overflow are verified without floating-point products', () => {
  for (const change of [{ cachedInputTokens: 81 }, { reasoningTokens: 11 }, { totalTokens: 109 },
    { inputTokens: 0.5 }, { outputTokens: -1 }, { cacheWriteTokens: undefined }, { extra: true }])
    assert.equal(decodeCloudConfirmedUsage({ ...syntheticCostUsage, ...change }), undefined);
  const huge: CloudCostGrant = { ...syntheticCostGrant, priceSnapshot: { ...syntheticCostGrant.priceSnapshot,
    prices: [{ ...syntheticCostGrant.priceSnapshot.prices[0]!, outputNanoUsdPerMillionTokens: Number.MAX_SAFE_INTEGER }] } };
  assert.equal(cloudReservationNanoUsd(huge, { ...syntheticCostAttempt, maxOutputTokens: Number.MAX_SAFE_INTEGER }), undefined);
});
