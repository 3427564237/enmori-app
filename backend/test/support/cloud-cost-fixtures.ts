import type { CloudConfirmedUsage, CloudCostAttemptInput, CloudGiftCostGrant, CloudPaidCostGrant } from '../../src/ai-runtime/ports/cloud-cost-budget.js';

/** Fabricated rates, money and identifiers; never provider pricing/balance evidence. */
export const syntheticCostGrant: CloudGiftCostGrant = {
  schemaVersion: 'openai_cost_grant_v1', grantId: '11111111-1111-4111-8111-111111111111', provider: 'openai', currency: 'USD',
  cycleId: 'synthetic_cycle', cycleStartedAtMs: 0, creditExpiresAtMs: 2_000_000,
  originalGiftCreditNanoUsd: 20_000_000, verifiedSpendableRemainingNanoUsd: 5_000_000,
  balanceVerifiedAtMs: 900_000, balanceValidUntilMs: 1_900_000, capNanoUsd: 1_000_000,
  priceSnapshot: { snapshotId: 'synthetic_prices', verifiedAtMs: 950_000, validUntilMs: 1_800_000, prices: [{
    model: 'gpt-6-luna', serviceTier: 'default', inputNanoUsdPerMillionTokens: 1_000_000,
    cachedInputNanoUsdPerMillionTokens: 100_000, cacheWriteNanoUsdPerMillionTokens: 2_000_000, outputNanoUsdPerMillionTokens: 4_000_000,
  }] },
};
export const syntheticCostAttempt: CloudCostAttemptInput = { attemptId: '33333333-3333-4333-8333-333333333333',
  consumer: 'evaluation', model: 'gpt-6-luna', maxInputTokens: 100, maxOutputTokens: 100 };
export const syntheticCostUsage: CloudConfirmedUsage = { provider: 'openai', model: 'gpt-6-luna', inputTokens: 100,
  cachedInputTokens: 30, cacheWriteTokens: 20, outputTokens: 10, reasoningTokens: 4, totalTokens: 110 };

/** Fabricated purchase and rates ONLY; this is not the planned S$10 receipt. */
export const syntheticPaidCostGrant: CloudPaidCostGrant = {
  schemaVersion: 'openai_cost_grant_v2', grantId: '66666666-6666-4666-8666-666666666666', provider: 'openai', currency: 'USD',
  fundingKind: 'purchased_credit', fundingReference: 'synthetic_purchase', creditIssuedAtMs: 900_000, creditExpiresAtMs: 2_000_000,
  creditedPurchasedNanoUsd: 2_000, approvedCapNanoUsd: 2_000, verifiedSpendableRemainingNanoUsd: 2_000,
  predecessor: {grantId: syntheticCostGrant.grantId, reservedLiabilityNanoUsd: 600, unreflectedSpentNanoUsd: 0},
  balanceVerifiedAtMs: 950_000, balanceValidUntilMs: 1_900_000, capNanoUsd: 1_400,
  priceSnapshot: {...syntheticCostGrant.priceSnapshot, prices: [{...syntheticCostGrant.priceSnapshot.prices[0]!, model: 'gpt-6.1-sol'}]},
};
