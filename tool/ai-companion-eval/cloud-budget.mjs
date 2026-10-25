import { priceSnapshot } from './evaluation.mjs';

const guard = (condition, code) => { if (!condition) throw Error(code); };
export const reservationMicroUsd = 13_824; // 8192 input + 2048 combined output at checked Standard rates.
export const cloudService = 'gemini-developer-api-standard-paid';
export const cloudScope = 'enmori-synthetic-companion-20261025';

/** A recorded human decision is required outside this file. Booleans cannot
 * establish actual provider eligibility/billing or manufacture LI's approval. */
export function validateCloudAuthorization(raw, { corpusSha256, sourceBundleSha256, passes, maxUsd, now, mock = false }) {
  guard(raw && typeof raw === 'object' && !Array.isArray(raw), 'AUTHORIZATION_REQUIRED');
  const keys = ['schemaVersion', 'status', 'approvedBy', 'scope', 'approvalReference', 'projectReference', 'service', 'model',
    'dataScope', 'corpusSha256', 'sourceBundleSha256', 'maxPasses', 'maxGenerationRequests', 'maxCountRequests',
    'maxInputTokens', 'maxOutputTokens', 'maxUsd', 'expiresAt', 'pricingVerifiedOn', 'inputPerMillion',
    'outputIncludingThinkingPerMillion', 'billingVerified', 'operatorEligibilityVerified', 'contributorEnrollment'];
  guard(keys.length === Object.keys(raw).length && keys.every(k => Object.hasOwn(raw, k)), 'AUTHORIZATION_FIELDS_INVALID');
  guard(raw.schemaVersion === 'synthetic_cloud_authorization_v1' && raw.scope === cloudScope &&
    raw.status === (mock ? 'mock-only' : 'approved') && raw.approvedBy === (mock ? 'MOCK' : 'LI') &&
    typeof raw.approvalReference === 'string' && raw.approvalReference.trim().length >= 8 && raw.approvalReference.length <= 512,
  'AUTHORIZATION_NOT_APPROVED');
  guard(raw.service === cloudService && raw.model === 'gemini-3.8-flash' &&
    raw.dataScope === 'checked-in-synthetic-only' && raw.contributorEnrollment === false &&
    raw.billingVerified === true && raw.operatorEligibilityVerified === true &&
    typeof raw.projectReference === 'string' && /^[a-zA-Z0-9_.:-]{3,128}$/.test(raw.projectReference), 'SERVICE_SCOPE_NOT_CONFIRMED');
  guard(raw.corpusSha256 === corpusSha256 && raw.sourceBundleSha256 === sourceBundleSha256, 'SOURCE_AUTHORIZATION_MISMATCH');
  guard([1, 2].includes(passes) && [1, 2].includes(raw.maxPasses) && passes <= raw.maxPasses &&
    Number.isInteger(raw.maxGenerationRequests) && raw.maxGenerationRequests >= 32 * passes && raw.maxGenerationRequests <= 64 &&
    Number.isInteger(raw.maxCountRequests) && raw.maxCountRequests >= 32 * passes && raw.maxCountRequests <= 64 &&
    raw.maxInputTokens === 8192 && raw.maxOutputTokens === 2048, 'REQUEST_BUDGET_INVALID');
  guard(Number.isFinite(maxUsd) && maxUsd > 0 && maxUsd <= 1 && Number.isFinite(raw.maxUsd) &&
    raw.maxUsd > 0 && raw.maxUsd <= 1 && maxUsd <= raw.maxUsd, 'SPEND_BUDGET_INVALID');
  const at = new Date(now), expiry = Date.parse(raw.expiresAt);
  guard(Number.isFinite(at.getTime()) && Number.isFinite(expiry) && expiry > at.getTime() &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw.expiresAt), 'AUTHORIZATION_EXPIRED');
  guard(raw.pricingVerifiedOn === at.toISOString().slice(0, 10) && raw.pricingVerifiedOn <= priceSnapshot.validThrough &&
    raw.inputPerMillion === priceSnapshot.inputPerMillion &&
    raw.outputIncludingThinkingPerMillion === priceSnapshot.outputIncludingThinkingPerMillion, 'PRICING_RECHECK_REQUIRED');
  return Object.freeze({ ...raw, passes, runMaxUsd: maxUsd });
}

export class CloudBudget {
  #countAttempts = 0;
  #generationAttempts = 0;
  #reservedMicroUsd = 0;
  constructor(authorization) { this.authorization = Object.freeze({ ...authorization }); }
  snapshot() { return { countAttempts: this.#countAttempts, generationAttempts: this.#generationAttempts,
    reservedMicroUsd: this.#reservedMicroUsd, reservedUsd: this.#reservedMicroUsd / 1_000_000,
    maxUsd: this.authorization.runMaxUsd }; }
  #room() {
    guard(this.#generationAttempts < Math.min(this.authorization.maxGenerationRequests, this.authorization.passes * 32) &&
      this.#reservedMicroUsd + reservationMicroUsd <= Math.floor(this.authorization.runMaxUsd * 1_000_000), 'BUDGET_EXHAUSTED');
  }
  reserveCount() {
    this.#room();
    guard(this.#countAttempts < Math.min(this.authorization.maxCountRequests, this.authorization.passes * 32), 'COUNT_BUDGET_EXHAUSTED');
    this.#countAttempts++;
    return this.snapshot();
  }
  reserveGeneration(inputTokens) {
    this.#room();
    guard(Number.isSafeInteger(inputTokens) && inputTokens > 0 && inputTokens <= 8192, 'INPUT_TOKEN_LIMIT');
    guard(this.#generationAttempts < this.#countAttempts, 'COUNT_REQUIRED');
    this.#generationAttempts++;
    this.#reservedMicroUsd += reservationMicroUsd;
    return this.snapshot();
  }
  // There is deliberately no release/refund/reset/resume method, even on failure.
}

export function mockAuthorization(corpusSha256, sourceBundleSha256, now, passes = 2) {
  return { schemaVersion: 'synthetic_cloud_authorization_v1', status: 'mock-only', approvedBy: 'MOCK', scope: cloudScope,
    approvalReference: 'MOCK ONLY - not human authorization', projectReference: 'mock-project', service: cloudService,
    model: 'gemini-3.8-flash', dataScope: 'checked-in-synthetic-only', corpusSha256, sourceBundleSha256,
    maxPasses: passes, maxGenerationRequests: 64, maxCountRequests: 64, maxInputTokens: 8192, maxOutputTokens: 2048,
    maxUsd: 1, expiresAt: new Date(new Date(now).getTime() + 3_600_000).toISOString(), pricingVerifiedOn: new Date(now).toISOString().slice(0, 10),
    inputPerMillion: 0.75, outputIncludingThinkingPerMillion: 3.75, billingVerified: true,
    operatorEligibilityVerified: true, contributorEnrollment: false };
}
