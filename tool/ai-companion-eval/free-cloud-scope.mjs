import { sha256 } from './evaluation.mjs';

export const freeService = 'gemini-developer-api-standard-free';
export const freeProject = 'gen-lang-client-0930184174';
export const freeMinimumSpacingMs = 15_100; // Counts and generations together: at most four starts per rolling minute.
export const freeSelection = Object.freeze([
  { id: 'reported-english-goal-chinese-reply', why: 'Preserved label/rest misreading and requested Chinese.' },
  { id: 'actual-study-goal', why: 'Preserved genuine study goal; historical local length/protocol failure.' },
  { id: 'normal-chat', why: 'Natural conversation without an imposed plan.' },
  { id: 'switch-to-english', why: 'Latest explicit language switch across history.' },
  { id: 'correct-personal-claim', why: 'Latest correction overrides an assistant-invented personal fact.' },
  { id: 'past-mood-time', why: 'Dated mood observation is not current mood.' },
  { id: 'intent-not-attendance', why: 'Interest, Going and attendance remain distinct.' },
  { id: 'quoted-instruction-not-authority', why: 'Quoted instructions cannot authorize actions or forged sources.' },
]);
export const freeSelectionSha256 = sha256(JSON.stringify(freeSelection));
const guard = (condition, code) => { if (!condition) throw Error(code); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Evidence is an operator readback, not something a boolean can discover.
 * This separate schema cannot pass the superseded paid authorization guard. */
export function validateFreeAuthorization(raw, { corpusSha256, sourceBundleSha256, passes, maxUsd, now, mock = false }) {
  const keys = ['schemaVersion', 'status', 'approvedBy', 'scope', 'approvalReference', 'projectReference', 'service', 'model',
    'dataScope', 'corpusSha256', 'sourceBundleSha256', 'selectionSha256', 'maxPasses', 'maxGenerationRequests', 'maxCountRequests',
    'maxInputTokens', 'maxOutputTokens', 'maxUsd', 'expiresAt', 'verifiedAt', 'freeTierVerified', 'billingDisabled',
    'projectEvidenceSha256', 'credentialEvidenceSha256', 'credentialFileSha256', 'credentialProjectReference',
    'credentialApiRestriction', 'operatorEligibilityVerified', 'contributorEnrollment'];
  guard(raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length === keys.length &&
    keys.every(key => Object.hasOwn(raw, key)), 'FREE_AUTHORIZATION_FIELDS_INVALID');
  guard(raw.schemaVersion === 'synthetic_free_authorization_v1' && raw.scope === 'enmori-free-exact8-20261025' &&
    raw.status === (mock ? 'mock-only' : 'approved') && raw.approvedBy === (mock ? 'MOCK' : 'LI') &&
    typeof raw.approvalReference === 'string' && raw.approvalReference.trim().length >= 8 && raw.approvalReference.length <= 512,
    'FREE_AUTHORIZATION_NOT_APPROVED');
  guard(raw.service === freeService && raw.projectReference === freeProject && raw.credentialProjectReference === freeProject &&
    raw.model === 'gemini-3.8-flash' && raw.dataScope === 'checked-in-synthetic-only' &&
    raw.freeTierVerified === true && raw.billingDisabled === true && raw.operatorEligibilityVerified === true &&
    raw.credentialApiRestriction === 'generativelanguage.googleapis.com' && raw.contributorEnrollment === false &&
    [raw.projectEvidenceSha256, raw.credentialEvidenceSha256, raw.credentialFileSha256].every(hash), 'FREE_ELIGIBILITY_UNCONFIRMED');
  guard(raw.corpusSha256 === corpusSha256 && raw.sourceBundleSha256 === sourceBundleSha256 &&
    raw.selectionSha256 === freeSelectionSha256, 'SOURCE_AUTHORIZATION_MISMATCH');
  guard(passes === 1 && raw.maxPasses === 1 && raw.maxGenerationRequests === 8 && raw.maxCountRequests === 8 &&
    raw.maxInputTokens === 8192 && raw.maxOutputTokens === 2048 && maxUsd === 0 && raw.maxUsd === 0, 'FREE_SCOPE_INVALID');
  const at = Date.parse(now), expiry = Date.parse(raw.expiresAt), verified = Date.parse(raw.verifiedAt);
  guard(Number.isFinite(at) && Number.isFinite(expiry) && expiry > at, 'AUTHORIZATION_EXPIRED');
  guard(Number.isFinite(verified) && verified <= at && at - verified <= 3_600_000, 'FREE_EVIDENCE_RECHECK_REQUIRED');
  return Object.freeze({ ...raw, passes: 1, runMaxUsd: 0 });
}

export class FreeBudget {
  #counts = 0;
  #generations = 0;
  snapshot() { return { countAttempts: this.#counts, generationAttempts: this.#generations,
    reservedMicroUsd: 0, reservedUsd: 0, maxUsd: 0 }; }
  reserveCount() { guard(this.#counts < 8 && this.#generations < 8, 'COUNT_BUDGET_EXHAUSTED'); this.#counts++; return this.snapshot(); }
  reserveGeneration(tokens) {
    guard(Number.isSafeInteger(tokens) && tokens > 0 && tokens <= 8192, 'INPUT_TOKEN_LIMIT');
    guard(this.#generations < 8 && this.#generations < this.#counts, 'GENERATION_BUDGET_EXHAUSTED');
    this.#generations++; return this.snapshot();
  }
}

export function mockFreeAuthorization(corpusSha256, sourceBundleSha256, now) {
  return { schemaVersion: 'synthetic_free_authorization_v1', status: 'mock-only', approvedBy: 'MOCK',
    scope: 'enmori-free-exact8-20261025', approvalReference: 'MOCK ONLY - no actual project or key verification',
    projectReference: freeProject, service: freeService, model: 'gemini-3.8-flash', dataScope: 'checked-in-synthetic-only',
    corpusSha256, sourceBundleSha256, selectionSha256: freeSelectionSha256, maxPasses: 1,
    maxGenerationRequests: 8, maxCountRequests: 8, maxInputTokens: 8192, maxOutputTokens: 2048, maxUsd: 0,
    expiresAt: new Date(Date.parse(now) + 3_600_000).toISOString(), verifiedAt: now,
    freeTierVerified: true, billingDisabled: true, projectEvidenceSha256: 'a'.repeat(64),
    credentialEvidenceSha256: 'b'.repeat(64), credentialFileSha256: 'c'.repeat(64),
    credentialProjectReference: freeProject, credentialApiRestriction: 'generativelanguage.googleapis.com',
    operatorEligibilityVerified: true, contributorEnrollment: false };
}
