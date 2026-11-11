import { OPENAI_CLOUD_PROCESSING } from '../account/domain/cloud-ai-consent.js';
import { AuthorizedAsyncCloudConversationTransport, type CloudConversationConsent }
  from '../ai-conversation/application/async-cloud-conversation-transport.js';
import type { AsyncConversationModelInput } from '../ai-conversation/ports/async-conversation.js';
import type { ConversationInput } from '../ai-conversation/ports/conversation-lifecycle.js';
import { BoundedAiRuntime } from '../ai-runtime/application/bounded-ai-runtime.js';
import { CloudAdmissionOwner } from '../ai-runtime/application/cloud-admission-owner.js';
import { CloudCostBudgetOwner } from '../ai-runtime/application/cloud-cost-budget-owner.js';
import { OpenAiChatTransport } from '../ai-runtime/infrastructure/openai-chat-transport.js';
import { buildChatMessages } from '../ai-runtime/infrastructure/local-chat-transport.js';
import { OpenAiCloudTransport, assertOpenAiTransportSettings, buildOpenAiRequest, countOpenAiInputTokens,
  type OpenAiTransportConfiguration } from '../ai-runtime/infrastructure/openai-cloud-transport.js';
import type { CloudAdmissionLimits, CloudGenerationObservation, CloudGenerationTransport, CloudRecoveryAuthority }
  from '../ai-runtime/ports/cloud-generation-transport.js';
import type { RuntimeClock } from '../ai-runtime/ports/runtime-clock.js';

export interface OpenAiRateAuthority extends CloudRecoveryAuthority {
  readonly quotaIdentity: Readonly<{ provider: 'openai' | 'groq'; model: string }>;
  dispatchAllowed(lease: object): boolean;
  blockRateLimit(retryAfterSeconds: number | undefined): Promise<void>;
}

interface OpenAiConversationRuntimeBase {
  readonly clock: RuntimeClock;
  /** The SAME monetary owner must serve evaluation, chat, Persona and proactive work. */
  readonly costBudget: CloudCostBudgetOwner;
  /** Verified OpenAI account/model quota, bound to the configured model. */
  readonly rateAuthority: OpenAiRateAuthority;
  readonly rateLimits: CloudAdmissionLimits;
  readonly ownsHost: () => boolean;
  readonly apiKey: string;
  readonly configuration: OpenAiTransportConfiguration;
  readonly consumer?: 'conversation' | 'test_app';
  readonly cloudConsent: CloudConversationConsent;
  readonly randomAttemptId: () => string;
  readonly http: typeof fetch;
}

export type OpenAiConversationRuntimeOptions = OpenAiConversationRuntimeBase & (
  | { readonly inputTokenUpperBound: (requestBody: string) => number; readonly countInputTokens?: never }
  | { readonly countInputTokens: true; readonly inputTokenUpperBound?: never });

const unknown = (): CloudGenerationObservation => ({ kind: 'unknown', physical: 'unknown' });
const stopped = (): CloudGenerationObservation => ({ kind: 'failure', physical: 'stopped' });

function cooldownDuration(seconds: number | undefined): number {
  // Match the quota authority's full-day default and fail-closed invalid value.
  if (seconds === undefined) return 86_400;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : Infinity;
}

/** Explicit, closed Conversation construction only. No env, credential lookup,
 * store initialization, recovery, route, worker or real network defaults.
 * Recover the already-verified shared monetary owner before owner.recover().
 * Verified OpenAI rate scope, token count/framing, consent services, exclusive
 * host cutover and Persona/F0 integration remain separate enablement gates. */
export function createOpenAiConversationRuntime(options: OpenAiConversationRuntimeOptions) {
  const rateAuthority = options?.rateAuthority;
  const countInputTokens = options?.countInputTokens === true, verifiedBound = options?.inputTokenUpperBound;
  if (!options || !(options.costBudget instanceof CloudCostBudgetOwner) ||
      typeof options.ownsHost !== 'function' || typeof options.randomAttemptId !== 'function' ||
      typeof options.http !== 'function' ||
      (countInputTokens ? verifiedBound !== undefined : options.countInputTokens !== undefined || typeof verifiedBound !== 'function') ||
      (options.consumer !== undefined && options.consumer !== 'conversation' && options.consumer !== 'test_app') ||
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
  const consumer = options.consumer ?? 'conversation';
  let owner: CloudAdmissionOwner<AsyncConversationModelInput>;
  let rateLease: object | undefined;
  let rateLimitPersistence: Promise<void> | undefined;
  let nextCooldown: { seconds: number | undefined } | undefined;
  let rateLimitFailed = false;
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
    current: lease => !rateLimitFailed && monetaryHostCurrent() && rateAuthority.current(lease) === true,
    reserve: (lease, input, live) => rateAuthority.reserve(lease, input,
      () => !rateLimitPersistence && !rateLimitFailed && monetaryHostCurrent() && live()),
    dispatchAllowed: lease => !rateLimitPersistence && !rateLimitFailed && monetaryHostCurrent() &&
      rateAuthority.current(lease) === true && rateAuthority.dispatchAllowed(lease) === true,
  };
  const finalRateCurrent = () => {
    try { return !!rateLease && authority.current(rateLease) && authority.dispatchAllowed!(rateLease); }
    catch { return false; }
  };
  const rateLimited = (seconds: number | undefined): Promise<void> => {
    if (rateLimitFailed) return Promise.resolve();
    if (rateLimitPersistence) {
      // An aborted request can still supply a trusted 429. Keep only the
      // longest waiting cooldown and let the authority extend its durable hold.
      if (!nextCooldown || cooldownDuration(seconds) > cooldownDuration(nextCooldown.seconds)) {
        nextCooldown = { seconds };
      }
      return rateLimitPersistence;
    }
    rateLimitPersistence = Promise.resolve().then(async () => {
      let cooldown: { seconds: number | undefined } | undefined = { seconds };
      try {
        while (cooldown) {
          await rateAuthority.blockRateLimit(cooldown.seconds);
          if (!rateLease || rateAuthority.current(rateLease) !== true) throw Error();
          cooldown = nextCooldown;
          nextCooldown = undefined;
        }
      } catch {
        rateLimitFailed = true;
        throw Error('OPENAI_RATE_AUTHORITY_UNAVAILABLE');
      } finally {
        nextCooldown = undefined;
        rateLimitPersistence = undefined;
      }
    });
    return rateLimitPersistence;
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
        // CloudAdmissionOwner already reserved one slot for generation. Count
        // gets another full slot in the same durable rate ledger before any
        // provider effect. Its larger token ceiling is deliberately conservative.
        if (countInputTokens) {
          const countAttempt = await owner.reserve(budget, live);
          if (!countAttempt) return stopped();
          owner.notStarted(countAttempt);
          if (!live()) return stopped();
        }
        // Reserve metadata before borrowing the projection. The authorized bridge
        // performs fresh checkpoints AFTER this asynchronous monetary mutation.
        const reserved = await options.costBudget.reserve({ attemptId: options.randomAttemptId(), consumer: handle.monetaryConsumer === 'persona' ? 'persona' : consumer,
          model: configuration.model, maxInputTokens: configuration.maxInputTokens, maxOutputTokens: configuration.maxOutputTokens }, live);
        if (reserved.kind !== 'confirmed' || !live()) return unknown();
        const pending = options.costBudget.dispatch(reserved.reservation, async money => {
          if (!live()) return unknown();
          const available = () => live() && money.available() === true;
          const createChat = (inputTokenUpperBound: (body: string) => number, http = options.http) =>
            new OpenAiChatTransport(new OpenAiCloudTransport(options.apiKey, configuration, options.clock, http, {
              inputTokenUpperBound, reservedTokens: rateLimits.tokensPerRequest, available, rateLimited,
              confirmUsage: usage => money.confirmUsage(usage),
            }));
          const chat: CloudGenerationTransport<ConversationInput> & { readonly processing: typeof OPENAI_CLOUD_PROCESSING } =
            verifiedBound ? createChat(verifiedBound) : { processing: OPENAI_CLOUD_PROCESSING, async dispatch(projection, budget) {
              let paidStarted = false;
              try {
                const body = buildOpenAiRequest(buildChatMessages(projection), configuration);
                const tokens = await countOpenAiInputTokens(body, configuration, budget, { key: options.apiKey,
                  clock: options.clock, http: options.http, available, rateLimited });
                // The bridge authorized the Count request. Refresh the original
                // authority after that network wait before sending inference.
                if (tokens === undefined || !available() || !await options.cloudConsent.verify(handle, budget) || !available() ||
                    !await handle.authorize() || !available()) return stopped();
                const countedChat = createChat(paidBody => {
                  if (paidBody !== body) throw Error('OPENAI_COUNT_REQUEST_CHANGED');
                  return tokens;
                }, (...args) => {
                  paidStarted = true;
                  return options.http(...args);
                });
                const observation = await countedChat.dispatch(projection, budget);
                return paidStarted ? observation : stopped();
              } catch { return paidStarted ? unknown() : stopped(); }
            } };
          const authorized = new AuthorizedAsyncCloudConversationTransport(chat, options.cloudConsent);
          return authorized.dispatch(handle, budget);
        });
        if (!pending) return unknown();
        const observation = await pending;
        return live() || (countInputTokens && observation.kind === 'failure' && observation.physical === 'stopped') ? observation : unknown();
      } catch { return unknown(); }
    },
  };
  owner = new CloudAdmissionOwner(options.clock, transport, authority, rateLimits);
  const runtime = new BoundedAiRuntime(options.clock, { kind: 'cloud', owner }, true);
  return Object.freeze({ runtime, owner, costBudget: options.costBudget, rateLimitPending: () => rateLimitPersistence !== undefined });
}
