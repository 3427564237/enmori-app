import { OPENAI_CLOUD_PROCESSING } from '../account/domain/cloud-ai-consent.js';
import { AuthorizedAsyncCloudConversationTransport, type CloudConversationConsent }
  from '../ai-conversation/application/async-cloud-conversation-transport.js';
import type { AsyncConversationModelInput } from '../ai-conversation/ports/async-conversation.js';
import { BoundedAiRuntime } from '../ai-runtime/application/bounded-ai-runtime.js';
import { CloudAdmissionOwner } from '../ai-runtime/application/cloud-admission-owner.js';
import { CloudCostBudgetOwner } from '../ai-runtime/application/cloud-cost-budget-owner.js';
import { OpenAiChatTransport } from '../ai-runtime/infrastructure/openai-chat-transport.js';
import { OpenAiCloudTransport, assertOpenAiTransportSettings, type OpenAiTransportConfiguration } from '../ai-runtime/infrastructure/openai-cloud-transport.js';
import type { CloudAdmissionLimits, CloudGenerationObservation, CloudGenerationTransport, CloudRecoveryAuthority }
  from '../ai-runtime/ports/cloud-generation-transport.js';
import type { RuntimeClock } from '../ai-runtime/ports/runtime-clock.js';

export interface OpenAiRateAuthority extends CloudRecoveryAuthority {
  readonly quotaIdentity: Readonly<{ provider: 'openai' | 'groq'; model: string }>;
  dispatchAllowed(lease: object): boolean;
  blockRateLimit(retryAfterSeconds: number | undefined): Promise<void>;
}

export interface OpenAiConversationRuntimeOptions {
  readonly clock: RuntimeClock;
  /** The SAME monetary owner must serve evaluation, chat, Persona and proactive work. */
  readonly costBudget: CloudCostBudgetOwner;
  /** Verified OpenAI account/model quota, bound to the configured model. */
  readonly rateAuthority: OpenAiRateAuthority;
  readonly rateLimits: CloudAdmissionLimits;
  readonly ownsHost: () => boolean;
  readonly apiKey: string;
  readonly configuration: OpenAiTransportConfiguration;
  readonly inputTokenUpperBound: (requestBody: string) => number;
  readonly cloudConsent: CloudConversationConsent;
  readonly randomAttemptId: () => string;
  readonly http: typeof fetch;
}

const unknown = (): CloudGenerationObservation => ({ kind: 'unknown', physical: 'unknown' });

/** Explicit, closed Conversation construction only. No env, credential lookup,
 * store initialization, recovery, route, worker or real network defaults.
 * Recover the already-verified shared monetary owner before owner.recover().
 * Verified OpenAI rate scope, token count/framing, consent services, exclusive
 * host cutover and Persona/F0 integration remain separate enablement gates. */
export function createOpenAiConversationRuntime(options: OpenAiConversationRuntimeOptions) {
  const rateAuthority = options?.rateAuthority;
  if (!options || !(options.costBudget instanceof CloudCostBudgetOwner) ||
      typeof options.ownsHost !== 'function' || typeof options.randomAttemptId !== 'function' ||
      typeof options.http !== 'function' || typeof options.inputTokenUpperBound !== 'function' ||
      typeof rateAuthority?.dispatchAllowed !== 'function' || typeof rateAuthority.blockRateLimit !== 'function' ||
      typeof rateAuthority.recover !== 'function' || typeof rateAuthority.reserve !== 'function' ||
      typeof rateAuthority.current !== 'function' ||
      options.cloudConsent?.processing?.provider !== OPENAI_CLOUD_PROCESSING.provider ||
      options.cloudConsent.processing.disclosureVersion !== OPENAI_CLOUD_PROCESSING.disclosureVersion ||
      typeof options.cloudConsent.verify !== 'function' || typeof options.cloudConsent.current !== 'function' ||
      !options.configuration || !options.rateLimits) {
    throw Error('OPENAI_RUNTIME_CONFIGURATION_INVALID');
  }
  let configuration: Readonly<OpenAiTransportConfiguration>;
  try {
    configuration = assertOpenAiTransportSettings(options.apiKey, options.configuration, options.rateLimits.tokensPerRequest);
    const identity = rateAuthority.quotaIdentity;
    if (identity?.provider !== 'openai' || identity.model !== configuration.model) throw Error();
  }
  catch { throw Error('OPENAI_RUNTIME_CONFIGURATION_INVALID'); }
  const rateLimits = Object.freeze({ ...options.rateLimits });
  let owner: CloudAdmissionOwner<AsyncConversationModelInput>;
  let rateLease: object | undefined;
  let rateLimitPending = false, rateLimitFailed = false;
  const consumed = new WeakSet<AsyncConversationModelInput>();
  const monetaryHostCurrent = () => {
    try { return options.ownsHost() === true && options.costBudget.isCurrent() === true; }
    catch { return false; }
  };
  const authority: CloudRecoveryAuthority = {
    recover: async limits => {
      if (!monetaryHostCurrent()) return { kind: 'unavailable' };
      const result = await rateAuthority.recover(limits);
      if (result.kind === 'confirmed') rateLease = result.lease;
      return result;
    },
    current: lease => monetaryHostCurrent() && rateAuthority.current(lease) === true,
    reserve: (lease, input, live) => rateAuthority.reserve(lease, input, () => monetaryHostCurrent() && live()),
    dispatchAllowed: lease => !rateLimitPending && !rateLimitFailed && monetaryHostCurrent() &&
      rateAuthority.current(lease) === true && rateAuthority.dispatchAllowed(lease) === true,
  };
  const finalRateCurrent = () => {
    try { return !!rateLease && authority.current(rateLease) && authority.dispatchAllowed!(rateLease); }
    catch { return false; }
  };
  const rateLimited = async (seconds: number | undefined) => {
    if (rateLimitPending || rateLimitFailed) { rateLimitFailed = true; return; }
    rateLimitPending = true;
    try { await rateAuthority.blockRateLimit(seconds); }
    catch { rateLimitFailed = true; throw Error('OPENAI_RATE_AUTHORITY_UNAVAILABLE'); }
    finally { rateLimitPending = false; }
  };
  const transport: CloudGenerationTransport<AsyncConversationModelInput> = {
    async dispatch(handle, budget) {
      try {
        if (!handle || typeof handle !== 'object' || consumed.has(handle)) return unknown();
        consumed.add(handle);
        const live = () => {
          try {
            return !budget.signal.aborted && Number.isFinite(budget.deadline) && options.clock.now() < budget.deadline &&
              budget.remainingMs() > 0 && owner.isCurrent() && finalRateCurrent() &&
              options.cloudConsent.processing?.provider === OPENAI_CLOUD_PROCESSING.provider &&
              options.cloudConsent.processing.disclosureVersion === OPENAI_CLOUD_PROCESSING.disclosureVersion &&
              handle.processing === 'cloud' && handle.provider === OPENAI_CLOUD_PROCESSING.provider &&
              handle.disclosureVersion === OPENAI_CLOUD_PROCESSING.disclosureVersion && options.cloudConsent.current(handle) === true;
          } catch { return false; }
        };
        if (!live()) return unknown();
        // Reserve metadata before borrowing the projection. The authorized bridge
        // performs fresh checkpoints AFTER this asynchronous monetary mutation.
        const reserved = await options.costBudget.reserve({ attemptId: options.randomAttemptId(), consumer: 'conversation',
          model: configuration.model, maxInputTokens: configuration.maxInputTokens, maxOutputTokens: configuration.maxOutputTokens }, live);
        if (reserved.kind !== 'confirmed' || !live()) return unknown();
        const pending = options.costBudget.dispatch(reserved.reservation, async money => {
          if (!live()) return unknown();
          const model = new OpenAiCloudTransport(options.apiKey, configuration, options.clock, options.http, {
            inputTokenUpperBound: options.inputTokenUpperBound, reservedTokens: rateLimits.tokensPerRequest,
            available: () => live() && money.available() === true, rateLimited,
            confirmUsage: usage => money.confirmUsage(usage),
          });
          const authorized = new AuthorizedAsyncCloudConversationTransport(new OpenAiChatTransport(model), options.cloudConsent);
          return authorized.dispatch(handle, budget);
        });
        if (!pending) return unknown();
        const observation = await pending;
        return live() ? observation : unknown();
      } catch { return unknown(); }
    },
  };
  owner = new CloudAdmissionOwner(options.clock, transport, authority, rateLimits);
  const runtime = new BoundedAiRuntime(options.clock, { kind: 'cloud', owner }, true);
  return Object.freeze({ runtime, owner, costBudget: options.costBudget });
}
