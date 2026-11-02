import { GROQ_CLOUD_PROCESSING, type CloudAiProcessing } from '../account/domain/cloud-ai-consent.js';
import { FirestoreCloudConsentGateway } from '../account/infrastructure/firestore-cloud-consent-gateway.js';
import type { RuntimeEpoch } from '../ai-conversation/ports/real-conversation-store.js';
import { CloudConsentFence } from '../account/application/cloud-consent-fence.js';
import { OwnAccountPreferences } from '../account/application/own-account-preferences.js';
import type { OwnAvatar } from '../account/application/own-avatar.js';
import { FirestoreAccountPreferencesRepository } from '../account/infrastructure/firestore-account-preferences-repository.js';
import { FirestoreCloudAiConsentAuthority } from '../account/infrastructure/firestore-cloud-ai-consent-authority.js';
import { ApplicationCloudConversationConsent } from '../ai-conversation/application/async-cloud-conversation-transport.js';
import type { FirestoreGateway } from '../shared/infrastructure/firebase/firestore-gateway.js';

/** Explicit single-host composition. Every Settings mutation for the selected
 * service must use this preferences instance; an unfenced second writer/host
 * prevents production enablement. Construction performs no I/O. */
export function createCloudConsentServices(gateway: FirestoreGateway,
  environment: Readonly<Record<string,string|undefined>>, epoch: RuntimeEpoch, ownsHost: () => boolean, avatar?: OwnAvatar, processing: CloudAiProcessing = GROQ_CLOUD_PROCESSING) {
  const fence = new CloudConsentFence();
  const ownedGateway = new FirestoreCloudConsentGateway(gateway,epoch,ownsHost);
  const ordinary = new FirestoreAccountPreferencesRepository(gateway, environment);
  const settingsWriter = new FirestoreAccountPreferencesRepository(ownedGateway, environment);
  return Object.freeze({
    preferences: new OwnAccountPreferences({
      getProfile: uid => ordinary.getProfile(uid),
      saveProfile: (uid, change) => ordinary.saveProfile(uid, change),
      getSettings: uid => ordinary.getSettings(uid),
      saveSettings: (uid, change) => settingsWriter.saveSettings(uid, change),
    }, avatar, fence),
    authority: new FirestoreCloudAiConsentAuthority(ownedGateway, fence, ownsHost, processing),
    dispatchConsent: new ApplicationCloudConversationConsent(processing),
  });
}
