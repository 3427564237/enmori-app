import { CloudFirstFlowExecution } from '../proactive/application/cloud-first-flow-execution.js';
import { FirestoreCloudConsentGateway } from '../account/infrastructure/firestore-cloud-consent-gateway.js';
import type { RegisteredFirstFlowConfiguration } from './first-flow-composition.js';
import { CloudPreviewPersona } from '../personas/application/cloud-preview-persona.js';
import { FirestorePersonaPreviewAuthority } from '../personas/infrastructure/firestore-persona-preview-authority.js';
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
import { RenewableServiceOwner } from '../ai-runtime/application/renewable-service-owner.js';
import { FirestoreServiceOwner } from '../ai-runtime/infrastructure/firestore-service-owner.js';
import { SuspendInclusiveRuntimeClock } from '../ai-runtime/infrastructure/suspend-inclusive-runtime-clock.js';
import { parseServiceOwnership } from '../ai-runtime/domain/service-owner.js';
import type { ServiceOwnershipConfiguration } from '../ai-runtime/ports/service-owner.js';
import type { RuntimeEpoch } from '../ai-conversation/ports/real-conversation-store.js';
import type { RuntimeClock } from '../ai-runtime/ports/runtime-clock.js';
import { decodeOpenAiDeploymentCostGrant } from '../ai-runtime/domain/cloud-cost.js';

interface OpenAiTestAppCommon {
  readonly firebaseUid: string;
  readonly grant: CloudCostGrant;
  readonly rateScope: string;
  readonly ratePolicy: CloudQuotaPolicy;
  readonly apiKey: string;
  readonly firstFlow?: RegisteredFirstFlowConfiguration;
}
export type OpenAiTestAppConfiguration = OpenAiTestAppCommon & (
  {readonly claim:RuntimeEpochClaim;readonly ownership?:never} |
  {readonly ownership:ServiceOwnershipConfiguration;readonly claim?:never});

const configuration = Object.freeze({ model: 'gpt-6.1-sol', promptProfile: 'goal-grounding-v1', reasoningEffort: 'low',
  maxInputTokens: 8192, maxOutputTokens: 2048, maxRequestBytes: 131072 } as const);

/** A malformed/absent arm in an explicitly armed deployment still closes
 * Settings writes. Only a definitely claimed epoch can open its shared fence. */
export function createOpenAiTestAppComposition(config: OpenAiTestAppConfiguration | null, gateway: FirestoreGateway,
  environment: Readonly<Record<string, string | undefined>>, avatar: OwnAvatar, identity: IdentityVerifier,
  ownershipClock?: RuntimeClock) {
  const ordinary = new FirestoreAccountPreferencesRepository(gateway, environment);
  let preferences = new OwnAccountPreferences({
    getProfile: uid => ordinary.getProfile(uid), saveProfile: (uid, change) => ordinary.saveProfile(uid, change),
    getSettings: uid => ordinary.getSettings(uid), saveSettings: async () => dependencyUnavailable,
  }, avatar);
  let owned = false, admitting = true;
  let personaPreview: CloudPreviewPersona | undefined;
  let proactive: {execution:CloudFirstFlowExecution;current:()=>boolean} | undefined;
  let openAi: ReturnType<typeof createOpenAiConversationRuntime> | undefined;
  let activeEpoch:RuntimeEpoch|undefined;
  const ownership=config?.ownership===undefined?undefined:parseServiceOwnership(config.ownership);
  const validMode=!!config&&(config.claim!==undefined&&config.ownership===undefined||config.claim===undefined&&ownership!==undefined);
  const serviceOwner=validMode&&ownership?new RenewableServiceOwner(new FirestoreServiceOwner(gateway,ownership),
    ownershipClock??new SuspendInclusiveRuntimeClock(),ownership,randomUUID()):undefined;
  const ownsHost = () => owned && admitting && (!serviceOwner || serviceOwner.current(activeEpoch));
  const testUid = config?.firebaseUid;
  // LI's 11 November demo decision opens the existing flow to every verified
  // account. Consent and account-owned context remain checked downstream.
  const testIdentity = identity;
  const selection: OpenAiConversationSelection | undefined = config && validMode && typeof testUid === 'string' &&
    testUid.length > 0 && testUid.length <= 128 && testUid.isWellFormed() ? {
      ...(serviceOwner?{acquireEpoch:()=>serviceOwner.start(),current:(epoch:RuntimeEpoch)=>serviceOwner.current(epoch)}:{claim:config.claim!}),
      afterClaim(epoch, clock, utcMilliseconds) {
        if(serviceOwner&&!serviceOwner.current(epoch))throw Error('OPENAI_SERVICE_OWNER_UNAVAILABLE');
        activeEpoch=Object.freeze({...epoch});
        owned = true;
        const services = createCloudConsentServices(gateway, environment, epoch, ownsHost, avatar, OPENAI_CLOUD_PROCESSING);
        preferences = services.preferences;
        return {
          consent: services.authority,
          async createRuntime() {
            if (!decodeOpenAiDeploymentCostGrant(config.grant)) throw Error('OPENAI_TEST_APP_GRANT_INVALID');
            const budget = new CloudCostBudgetOwner(new FirestoreCloudCostBudget(gateway, epoch, config.grant, clock, utcMilliseconds, ownsHost));
            const quota = new FirestoreCloudQuotaAuthority(gateway, epoch, config.rateScope, configuration.model,
              config.ratePolicy, clock, utcMilliseconds, ownsHost, 'openai');
            openAi = createOpenAiConversationRuntime({ clock, costBudget: budget,
              rateAuthority: quota, rateLimits: { ...config.ratePolicy.day, tokensPerRequest: config.ratePolicy.tokensPerRequest },
              ownsHost, apiKey: config.apiKey, configuration, countInputTokens: true, consumer: 'test_app',
              cloudConsent: services.dispatchConsent, randomAttemptId: randomUUID, http: fetch });
            if ((await budget.recover()).kind === 'confirmed') await openAi.owner.recover();
            personaPreview = new CloudPreviewPersona(new FirestorePersonaPreviewAuthority(gateway), services.authority, openAi.runtime, () => clock.now());
            if(config.firstFlow) proactive={execution:new CloudFirstFlowExecution(
              new FirestorePersonaPreviewAuthority(new FirestoreCloudConsentGateway(gateway,epoch,ownsHost)),services.authority,openAi.runtime),
              current:ownsHost};
            return openAi.runtime;
          },
        };
      },
    } : undefined;
  return { selection, identity: testIdentity, get proactive(){return proactive;}, get personaPreview() { return personaPreview; }, get preferences() { return preferences; },
    closeAdmission() { admitting = false; serviceOwner?.stop(); }, release() { owned = false; serviceOwner?.stop(); },
    whenOwnershipLost:serviceOwner?.whenLost,ownershipLost:()=>serviceOwner?.lost===true,
    ownerCurrent:ownsHost,state: () => openAi?.owner.state,
    rateLimitPending: () => openAi?.rateLimitPending() === true };
}
