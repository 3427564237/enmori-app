import { randomUUID } from 'node:crypto';
import { OwnAccountPreferences } from '../account/application/own-account-preferences.js';
import type { OwnAvatar } from '../account/application/own-avatar.js';
import { OPENAI_CLOUD_PROCESSING } from '../account/domain/cloud-ai-consent.js';
import { FirestoreAccountPreferencesRepository } from '../account/infrastructure/firestore-account-preferences-repository.js';
import type { RuntimeEpochClaim } from '../ai-conversation/ports/real-conversation-store.js';
import { CloudCostBudgetOwner } from '../ai-runtime/application/cloud-cost-budget-owner.js';
import { FirestoreCloudCostBudget } from '../ai-runtime/infrastructure/firestore-cloud-cost-budget.js';
import { FirestoreCloudQuotaAuthority, type CloudQuotaPolicy } from '../ai-runtime/infrastructure/firestore-cloud-quota-authority.js';
import type { CloudCostGrant } from '../ai-runtime/ports/cloud-cost-budget.js';
import type { FirestoreGateway } from '../shared/infrastructure/firebase/firestore-gateway.js';
import { dependencyUnavailable } from '../shared/ports/dependency-failure.js';
import type { IdentityVerifier } from '../shared/ports/identity-verifier.js';
import { createCloudConsentServices } from './cloud-consent-services.js';
import type { OpenAiConversationSelection } from './isolated-conversation-composition.js';
import { createOpenAiConversationRuntime } from './openai-conversation-runtime.js';

export interface OpenAiTestAppConfiguration {
  readonly claim: RuntimeEpochClaim;
  readonly firebaseUid: string;
  readonly grant: CloudCostGrant;
  readonly rateScope: string;
  readonly ratePolicy: CloudQuotaPolicy;
  readonly apiKey: string;
}

const configuration = Object.freeze({ model: 'gpt-6.1-sol', promptProfile: 'goal-grounding-v1', reasoningEffort: 'low',
  maxInputTokens: 8192, maxOutputTokens: 2048, maxRequestBytes: 131072 } as const);

/** A malformed/absent arm in an explicitly armed deployment still closes
 * Settings writes. Only a definitely claimed epoch can open its shared fence. */
export function createOpenAiTestAppComposition(config: OpenAiTestAppConfiguration | null, gateway: FirestoreGateway,
  environment: Readonly<Record<string, string | undefined>>, avatar: OwnAvatar, identity: IdentityVerifier) {
  const ordinary = new FirestoreAccountPreferencesRepository(gateway, environment);
  let preferences = new OwnAccountPreferences({
    getProfile: uid => ordinary.getProfile(uid), saveProfile: (uid, change) => ordinary.saveProfile(uid, change),
    getSettings: uid => ordinary.getSettings(uid), saveSettings: async () => dependencyUnavailable,
  }, avatar);
  let owned = false, admitting = true;
  let openAi: ReturnType<typeof createOpenAiConversationRuntime> | undefined;
  const ownsHost = () => owned;
  const testUid = config?.firebaseUid;
  const testIdentity: IdentityVerifier = { async verifyIdToken(token) {
    const result = await identity.verifyIdToken(token);
    return result.kind === 'verified' && result.principal.firebaseUid !== testUid ? { kind: 'forbidden' } : result;
  } };
  const selection: OpenAiConversationSelection | undefined = config?.claim && typeof testUid === 'string' &&
    testUid.length > 0 && testUid.length <= 128 && testUid.isWellFormed() ? {
      claim: config.claim,
      afterClaim(epoch, clock, utcMilliseconds) {
        owned = true;
        const services = createCloudConsentServices(gateway, environment, epoch, ownsHost, avatar, OPENAI_CLOUD_PROCESSING);
        preferences = services.preferences;
        return {
          consent: services.authority,
          async createRuntime() {
            if (config.grant.capNanoUsd !== 3_400_000_000) throw Error('OPENAI_TEST_APP_GRANT_INVALID');
            const budget = new CloudCostBudgetOwner(new FirestoreCloudCostBudget(gateway, epoch, config.grant, clock, utcMilliseconds, ownsHost));
            const quota = new FirestoreCloudQuotaAuthority(gateway, epoch, config.rateScope, configuration.model,
              config.ratePolicy, clock, utcMilliseconds, ownsHost, 'openai');
            openAi = createOpenAiConversationRuntime({ clock, costBudget: budget,
              rateAuthority: quota, rateLimits: { ...config.ratePolicy.day, tokensPerRequest: config.ratePolicy.tokensPerRequest },
              ownsHost: () => owned && admitting, apiKey: config.apiKey, configuration, countInputTokens: true, consumer: 'test_app',
              cloudConsent: services.dispatchConsent, randomAttemptId: randomUUID, http: fetch });
            if ((await budget.recover()).kind === 'confirmed') await openAi.owner.recover();
            return openAi.runtime;
          },
        };
      },
    } : undefined;
  return { selection, identity: testIdentity, get preferences() { return preferences; },
    closeAdmission() { admitting = false; }, release() { owned = false; }, state: () => openAi?.owner.state,
    rateLimitPending: () => openAi?.rateLimitPending() === true };
}
