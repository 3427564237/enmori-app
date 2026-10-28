// Synthetic evaluation only. These checks do not themselves grant permission.
const profiles = Object.freeze({
  baseline: Object.freeze({ maximumCompletionTokens: 2048, reasoningEffort: 'low', minimumSpacingMs: 30100,
    maxRequestBodyBytes: 1900, maxInputTokens: 1952 }),
  'goal-v2': Object.freeze({ maximumCompletionTokens: 1024, reasoningEffort: 'low', minimumSpacingMs: 30100,
    maxRequestBodyBytes: 2500, maxInputTokens: 2976 }),
  // One request per rolling minute; UTF-8 bytes are an estimate rather than
  // proof of tokenization. Reserve 512 for provider-side wrappers.
  'baseline-medium': Object.freeze({ maximumCompletionTokens: 2048, reasoningEffort: 'medium', minimumSpacingMs: 61000,
    maxRequestBodyBytes: 8000 - 2048 - 512, maxInputTokens: 8000 - 2048 - 512 }),
});

export function groqRunPolicy(profile) {
  if (!Object.hasOwn(profiles, profile)) throw Error('GROQ_PROFILE_INVALID');
  return profiles[profile];
}

export function validGroqAuthorization(authorization, profile, corpusSha256, model, now = Date.now()) {
  const policy = groqRunPolicy(profile);
  return !!authorization && authorization.approvedBy === 'LI' &&
    authorization.scope === `groq-fixed24-${profile}-20261028` && authorization.profile === profile &&
    authorization.maximumCompletionTokens === policy.maximumCompletionTokens &&
    (profile !== 'baseline-medium' || (authorization.reasoningEffort === 'medium' &&
      typeof authorization.approvalReference === 'string' && !!authorization.approvalReference.trim())) &&
    authorization.freePlanVerified === true && authorization.maxUsd === 0 && authorization.maxRequests === 24 &&
    authorization.model === model && authorization.corpusSha256 === corpusSha256 &&
    !!authorization.approvalReference && Date.parse(authorization.expiresAt) > now &&
    Date.parse(authorization.verifiedAt) <= now && now - Date.parse(authorization.verifiedAt) < 3600000;
}

export function withinGroqRequestBound(body, profile) {
  return typeof body === 'string' && Buffer.byteLength(body, 'utf8') <= groqRunPolicy(profile).maxRequestBodyBytes;
}

export function withinGroqUsageBound(usage, profile) {
  const policy = groqRunPolicy(profile);
  return Number.isSafeInteger(usage?.inputTokens) && Number.isSafeInteger(usage?.outputTokens) &&
    usage.inputTokens >= 0 && usage.outputTokens >= 0 &&
    usage.inputTokens <= policy.maxInputTokens && usage.outputTokens <= policy.maximumCompletionTokens;
}

// Mark the next start at the physical dispatch boundary. The clock and wait
// are injectable so pacing can be verified without provider calls or delays.
export function createGroqPacer(profile, now, wait) {
  const { minimumSpacingMs } = groqRunPolicy(profile);
  if (typeof now !== 'function' || typeof wait !== 'function') throw Error('GROQ_PACER_INVALID');
  let nextStart = 0;
  const current = () => {
    const value = now();
    if (!Number.isFinite(value)) throw Error('GROQ_PACER_INVALID');
    return value;
  };
  return Object.freeze({
    async waitForSlot() {
      const remaining = nextStart - current();
      if (remaining > 0) await wait(remaining);
    },
    recordStart() {
      const time = current();
      if (time < nextStart) throw Error('GROQ_DISPATCH_TOO_EARLY');
      nextStart = time + minimumSpacingMs;
    },
  });
}
