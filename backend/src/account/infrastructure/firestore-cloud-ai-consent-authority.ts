import { CloudConsentFence } from "../application/cloud-consent-fence.js";
import type { CloudAiConsentAuthority, CloudConsentObservation } from '../ports/cloud-ai-consent-authority.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
import type { FirestoreGateway } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { resolveAccount } from './firestore-account-preferences-repository.js';
import { hasCloudAiConsent, parseCloudAiConsent } from '../domain/cloud-ai-consent.js';
/** No grant cache or implicit acceptance from local consent. */
export class FirestoreCloudAiConsentAuthority implements CloudAiConsentAuthority {
  constructor(private readonly gateway: FirestoreGateway, private readonly fence: CloudConsentFence, private readonly ownsHost: () => boolean = () => true) {
    if (!(fence instanceof CloudConsentFence)) throw Error("CLOUD_CONSENT_FENCE_REQUIRED");
  }
  async read(principal: AuthPrincipal, ownerId: string, current: () => boolean, signal?: AbortSignal): Promise<CloudConsentObservation> {
    const rawLease = this.fence.read(principal);
    const lease = { current: () => this.ownsHost() && rawLease.current(), release: rawLease.release };
    let retained = false;
    const abort = () => lease.release();
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) abort();
    try {
      if (!current() || !lease.current()) return { kind: 'terminated' };
      const result = await this.gateway.runTransaction<CloudConsentObservation>(async tx => {
        if (!current() || !lease.current()) return { kind: 'terminated' };
        const account = await resolveAccount(tx, principal.firebaseUid);
        if (!current() || !lease.current()) return { kind: 'terminated' };
        if (account.kind === 'dependency_unavailable') return { kind: 'unavailable' };
        if (account.kind !== 'found' || account.path !== `accounts/${ownerId}`) return { kind: 'denied' };
        if (Object.hasOwn(account.data, 'cloudAiConsent') && !parseCloudAiConsent(account.data.cloudAiConsent)) return { kind: 'unavailable' };
        if (!hasCloudAiConsent(account.data.cloudAiConsent, account.data.optionalProcessingConsent)) return { kind: 'denied' };
        const generation = account.data.cloudAiConsentGeneration, purposeGeneration = account.data.purposeRevocationGeneration;
        return typeof generation === 'number' && Number.isSafeInteger(generation) && generation >= 0 && typeof purposeGeneration === 'number' && Number.isSafeInteger(purposeGeneration) && purposeGeneration >= 0
          ? { kind: 'authorized', generation, purposeGeneration, current: lease.current, release: lease.release } : { kind: 'unavailable' };
      }, { maxAttempts: 1 });
      if (!current() || !lease.current()) return {kind:'terminated'};
      retained = result.kind === 'authorized';
      return result;
    } catch { return { kind: 'unavailable' }; } finally { signal?.removeEventListener("abort",abort); if (!retained) lease.release(); }
  }
}
