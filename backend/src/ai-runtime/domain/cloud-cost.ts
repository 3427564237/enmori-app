import type { CloudConfirmedUsage, CloudCostAttemptInput, CloudCostGrant, CloudGiftCostGrant, CloudPaidCostGrant, CloudCostModel, CloudModelPrice } from '../ports/cloud-cost-budget.js';

export const isCostInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
export const isCostUuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export const costRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const exactCostFields = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const reference = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(value);
const model = (value: unknown): value is CloudCostModel => value === 'gpt-6-luna' || value === 'gpt-6.1-sol';
const positive = (value: unknown): value is number => isCostInteger(value) && value > 0;

/** Exact integer floor, then the lower verified spendable amount. */
export function cloudCostCapNanoUsd(originalGift: number, spendable: number): number | undefined {
  if (!positive(originalGift) || !isCostInteger(spendable)) return undefined;
  return Number(BigInt(originalGift) / 20n < BigInt(spendable) ? BigInt(originalGift) / 20n : BigInt(spendable));
}

function decodePriceSnapshot(value: unknown, startedAt: number, creditExpiresAt: number): CloudCostGrant['priceSnapshot'] | undefined {
  if (!costRecord(value)) return undefined;
  const snapshot = value;
  if (!exactCostFields(snapshot, ['snapshotId', 'verifiedAtMs', 'validUntilMs', 'prices']) || !reference(snapshot.snapshotId) ||
    !isCostInteger(snapshot.verifiedAtMs) || !positive(snapshot.validUntilMs) || snapshot.verifiedAtMs < startedAt ||
    snapshot.verifiedAtMs >= creditExpiresAt || snapshot.validUntilMs <= snapshot.verifiedAtMs ||
    !Array.isArray(snapshot.prices) || snapshot.prices.length < 1 || snapshot.prices.length > 2) return undefined;
  const prices: CloudModelPrice[] = [];
  for (const price of snapshot.prices as unknown[]) {
    if (!costRecord(price) || !exactCostFields(price, ['model', 'serviceTier', 'inputNanoUsdPerMillionTokens',
      'cachedInputNanoUsdPerMillionTokens', 'cacheWriteNanoUsdPerMillionTokens', 'outputNanoUsdPerMillionTokens']) ||
      !model(price.model) || price.serviceTier !== 'default' || !positive(price.inputNanoUsdPerMillionTokens) ||
      !isCostInteger(price.cachedInputNanoUsdPerMillionTokens) || !isCostInteger(price.cacheWriteNanoUsdPerMillionTokens) ||
      !positive(price.outputNanoUsdPerMillionTokens) || prices.some(existing => existing.model === price.model)) return undefined;
    prices.push(Object.freeze({ model: price.model, serviceTier: 'default', inputNanoUsdPerMillionTokens: price.inputNanoUsdPerMillionTokens,
      cachedInputNanoUsdPerMillionTokens: price.cachedInputNanoUsdPerMillionTokens, cacheWriteNanoUsdPerMillionTokens: price.cacheWriteNanoUsdPerMillionTokens,
      outputNanoUsdPerMillionTokens: price.outputNanoUsdPerMillionTokens }));
  }
  return Object.freeze({ snapshotId: snapshot.snapshotId, verifiedAtMs: snapshot.verifiedAtMs, validUntilMs: snapshot.validUntilMs, prices: Object.freeze(prices) });
}

function decodeGiftGrant(value: unknown): CloudGiftCostGrant | undefined {
  if (!costRecord(value) || !exactCostFields(value, ['schemaVersion', 'grantId', 'provider', 'currency', 'cycleId',
    'cycleStartedAtMs', 'creditExpiresAtMs', 'originalGiftCreditNanoUsd', 'verifiedSpendableRemainingNanoUsd',
    'balanceVerifiedAtMs', 'balanceValidUntilMs', 'capNanoUsd', 'priceSnapshot']) ||
    value.schemaVersion !== 'openai_cost_grant_v1' || !isCostUuid(value.grantId) || value.provider !== 'openai' || value.currency !== 'USD' ||
    !reference(value.cycleId) || !isCostInteger(value.cycleStartedAtMs) || !positive(value.creditExpiresAtMs) ||
    !positive(value.originalGiftCreditNanoUsd) || !isCostInteger(value.verifiedSpendableRemainingNanoUsd) ||
    !isCostInteger(value.balanceVerifiedAtMs) || !positive(value.balanceValidUntilMs) || !isCostInteger(value.capNanoUsd) ||
    value.capNanoUsd !== cloudCostCapNanoUsd(value.originalGiftCreditNanoUsd, value.verifiedSpendableRemainingNanoUsd) ||
    value.balanceVerifiedAtMs < value.cycleStartedAtMs || value.balanceVerifiedAtMs >= value.creditExpiresAtMs ||
    value.balanceValidUntilMs <= value.balanceVerifiedAtMs || !costRecord(value.priceSnapshot)) return undefined;
  const snapshot = decodePriceSnapshot(value.priceSnapshot, value.cycleStartedAtMs, value.creditExpiresAtMs);
  if (!snapshot) return undefined;
  return Object.freeze({ schemaVersion: 'openai_cost_grant_v1', grantId: value.grantId, provider: 'openai', currency: 'USD',
    cycleId: value.cycleId, cycleStartedAtMs: value.cycleStartedAtMs, creditExpiresAtMs: value.creditExpiresAtMs,
    originalGiftCreditNanoUsd: value.originalGiftCreditNanoUsd, verifiedSpendableRemainingNanoUsd: value.verifiedSpendableRemainingNanoUsd,
    balanceVerifiedAtMs: value.balanceVerifiedAtMs, balanceValidUntilMs: value.balanceValidUntilMs, capNanoUsd: value.capNanoUsd,
    priceSnapshot: snapshot });
}

// Maximum per-observation envelope; the reviewed operator packet fixes the earlier absolute cutoff.
export const paidCreditReviewWindowMs = 61 * 24 * 60 * 60 * 1000;
/** C=min(A,max(0,min(P,R)-U-D)); no floating-point subtraction or overflow. */
export function cloudPaidCostCapNanoUsd(purchased: number, spendable: number, approved: number,
  reservedLiability: number, unreflectedSpent: number): number | undefined {
  if (![purchased, spendable, approved, reservedLiability, unreflectedSpent].every(isCostInteger) || purchased === 0 || approved > purchased) return undefined;
  const net = BigInt(Math.min(purchased, spendable)) - BigInt(reservedLiability) - BigInt(unreflectedSpent);
  return Number(net <= 0n ? 0n : net < BigInt(approved) ? net : BigInt(approved));
}

function decodePaidGrant(value: unknown): CloudPaidCostGrant | undefined {
  if (!costRecord(value) || !exactCostFields(value, ['schemaVersion', 'grantId', 'provider', 'currency', 'fundingKind',
    'fundingReference', 'creditIssuedAtMs', 'creditExpiresAtMs', 'creditedPurchasedNanoUsd', 'approvedCapNanoUsd',
    'verifiedSpendableRemainingNanoUsd', 'predecessor', 'balanceVerifiedAtMs', 'balanceValidUntilMs', 'capNanoUsd', 'priceSnapshot']) ||
    value.schemaVersion !== 'openai_cost_grant_v2' || !isCostUuid(value.grantId) || value.provider !== 'openai' || value.currency !== 'USD' ||
    value.fundingKind !== 'purchased_credit' || !reference(value.fundingReference) || !isCostInteger(value.creditIssuedAtMs) ||
    !positive(value.creditExpiresAtMs) || !positive(value.creditedPurchasedNanoUsd) || !isCostInteger(value.approvedCapNanoUsd) ||
    !isCostInteger(value.verifiedSpendableRemainingNanoUsd) || !isCostInteger(value.balanceVerifiedAtMs) ||
    !positive(value.balanceValidUntilMs) || !isCostInteger(value.capNanoUsd) || !costRecord(value.predecessor)) return undefined;
  const predecessor = value.predecessor;
  if (!exactCostFields(predecessor, ['grantId', 'reservedLiabilityNanoUsd', 'unreflectedSpentNanoUsd']) ||
    !isCostUuid(predecessor.grantId) || predecessor.grantId === value.grantId || !isCostInteger(predecessor.reservedLiabilityNanoUsd) ||
    !isCostInteger(predecessor.unreflectedSpentNanoUsd) || value.capNanoUsd !== cloudPaidCostCapNanoUsd(value.creditedPurchasedNanoUsd,
      value.verifiedSpendableRemainingNanoUsd, value.approvedCapNanoUsd, predecessor.reservedLiabilityNanoUsd, predecessor.unreflectedSpentNanoUsd) ||
    value.balanceVerifiedAtMs < value.creditIssuedAtMs || value.balanceVerifiedAtMs >= value.creditExpiresAtMs ||
    value.balanceValidUntilMs <= value.balanceVerifiedAtMs || value.balanceValidUntilMs > value.creditExpiresAtMs ||
    value.balanceValidUntilMs - value.balanceVerifiedAtMs > paidCreditReviewWindowMs || !costRecord(value.priceSnapshot)) return undefined;
  const priceSnapshot = decodePriceSnapshot(value.priceSnapshot, value.creditIssuedAtMs, value.creditExpiresAtMs);
  if (!priceSnapshot || priceSnapshot.prices.length !== 1 || priceSnapshot.prices[0]!.model !== 'gpt-6.1-sol' ||
    priceSnapshot.validUntilMs > value.creditExpiresAtMs ||
    priceSnapshot.validUntilMs - priceSnapshot.verifiedAtMs > paidCreditReviewWindowMs) return undefined;
  return Object.freeze({schemaVersion: 'openai_cost_grant_v2', grantId: value.grantId, provider: 'openai', currency: 'USD',
    fundingKind: 'purchased_credit', fundingReference: value.fundingReference, creditIssuedAtMs: value.creditIssuedAtMs,
    creditExpiresAtMs: value.creditExpiresAtMs, creditedPurchasedNanoUsd: value.creditedPurchasedNanoUsd,
    approvedCapNanoUsd: value.approvedCapNanoUsd, verifiedSpendableRemainingNanoUsd: value.verifiedSpendableRemainingNanoUsd,
    balanceVerifiedAtMs: value.balanceVerifiedAtMs, balanceValidUntilMs: value.balanceValidUntilMs, capNanoUsd: value.capNanoUsd,
    predecessor: Object.freeze({grantId: predecessor.grantId, reservedLiabilityNanoUsd: predecessor.reservedLiabilityNanoUsd,
      unreflectedSpentNanoUsd: predecessor.unreflectedSpentNanoUsd}), priceSnapshot});
}

export function decodeCloudCostGrant(value: unknown): CloudCostGrant | undefined {
  return costRecord(value) && value.schemaVersion === 'openai_cost_grant_v2' ? decodePaidGrant(value) : decodeGiftGrant(value);
}
/** Explicit deployment allowlist; does not prove billing evidence or install a grant. */
export function decodeOpenAiDeploymentCostGrant(value: unknown): CloudCostGrant | undefined {
  const grant = decodeCloudCostGrant(value);
  return grant && (grant.schemaVersion === 'openai_cost_grant_v2' || grant.capNanoUsd === 3_400_000_000) ? grant : undefined;
}

export function cloudCostGrantExpiresAt(grant: CloudCostGrant): number {
  return Math.min(grant.creditExpiresAtMs, grant.balanceValidUntilMs, grant.priceSnapshot.validUntilMs);
}
export function cloudCostGrantCurrent(grant: CloudCostGrant, now: number): boolean {
  return isCostInteger(now) && now >= grant.balanceVerifiedAtMs && now >= grant.priceSnapshot.verifiedAtMs && now < cloudCostGrantExpiresAt(grant);
}
export function decodeCloudCostAttempt(value: unknown): CloudCostAttemptInput | undefined {
  if (!costRecord(value) || !exactCostFields(value, ['attemptId', 'consumer', 'model', 'maxInputTokens', 'maxOutputTokens']) ||
    !isCostUuid(value.attemptId) || !['evaluation', 'test_app', 'conversation', 'persona', 'proactive'].includes(String(value.consumer)) ||
    !model(value.model) || !isCostInteger(value.maxInputTokens) || value.maxInputTokens > 272_000 || !positive(value.maxOutputTokens)) return undefined;
  return Object.freeze({ attemptId: value.attemptId, consumer: value.consumer as CloudCostAttemptInput['consumer'], model: value.model,
    maxInputTokens: value.maxInputTokens, maxOutputTokens: value.maxOutputTokens });
}
export function decodeCloudConfirmedUsage(value: unknown): CloudConfirmedUsage | undefined {
  if (!costRecord(value) || !exactCostFields(value, ['provider', 'model', 'inputTokens', 'cachedInputTokens', 'cacheWriteTokens',
    'outputTokens', 'reasoningTokens', 'totalTokens']) || value.provider !== 'openai' || !model(value.model) ||
    !isCostInteger(value.inputTokens) || !isCostInteger(value.cachedInputTokens) || !isCostInteger(value.cacheWriteTokens) ||
    !isCostInteger(value.outputTokens) || !isCostInteger(value.reasoningTokens) || !isCostInteger(value.totalTokens) ||
    BigInt(value.cachedInputTokens) + BigInt(value.cacheWriteTokens) > BigInt(value.inputTokens) ||
    value.reasoningTokens > value.outputTokens || BigInt(value.inputTokens) + BigInt(value.outputTokens) !== BigInt(value.totalTokens)) return undefined;
  return Object.freeze({ provider: 'openai', model: value.model, inputTokens: value.inputTokens, cachedInputTokens: value.cachedInputTokens,
    cacheWriteTokens: value.cacheWriteTokens, outputTokens: value.outputTokens, reasoningTokens: value.reasoningTokens, totalTokens: value.totalTokens });
}
/** Sum exact integer products, rounding the final nanodollar up once. */
function priceCost(parts: readonly (readonly [number, number])[]): number | undefined {
  let total = 0n;
  for (const [tokens, rate] of parts) total += BigInt(tokens) * BigInt(rate);
  const rounded = (total + 999_999n) / 1_000_000n;
  return rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : undefined;
}
export function cloudReservationNanoUsd(grant: CloudCostGrant, input: CloudCostAttemptInput): number | undefined {
  const price = grant.priceSnapshot.prices.find(item => item.model === input.model);
  if (!price || !decodeCloudCostAttempt(input)) return undefined;
  return priceCost([[input.maxInputTokens, Math.max(price.inputNanoUsdPerMillionTokens, price.cachedInputNanoUsdPerMillionTokens,
    price.cacheWriteNanoUsdPerMillionTokens)], [input.maxOutputTokens, price.outputNanoUsdPerMillionTokens]]);
}
export function cloudConfirmedCostNanoUsd(grant: CloudCostGrant, usage: CloudConfirmedUsage): number | undefined {
  const price = grant.priceSnapshot.prices.find(item => item.model === usage.model);
  if (!price || !decodeCloudConfirmedUsage(usage)) return undefined;
  return priceCost([[usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens, price.inputNanoUsdPerMillionTokens],
    [usage.cachedInputTokens, price.cachedInputNanoUsdPerMillionTokens], [usage.cacheWriteTokens, price.cacheWriteNanoUsdPerMillionTokens],
    [usage.outputTokens, price.outputNanoUsdPerMillionTokens]]);
}
