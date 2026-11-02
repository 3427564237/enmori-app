import type { CloudGenerationObservation, CloudGenerationTransport } from '../../ai-runtime/ports/cloud-generation-transport.js';
import type { RequestBudget } from '../../ai-runtime/ports/generation-transport.js';
import type { AsyncConversationModelInput } from '../ports/async-conversation.js';
import type { ConversationInput } from '../ports/conversation-lifecycle.js';
import { GROQ_CLOUD_PROCESSING, legacyCloudAiProcessing, parseCloudAiProcessing, type CloudAiProcessing } from '../../account/domain/cloud-ai-consent.js';

export interface CloudConversationConsent {
  readonly processing?: CloudAiProcessing;
  verify(handle: AsyncConversationModelInput, budget: RequestBudget): Promise<boolean>;
  current(handle: AsyncConversationModelInput): boolean;
}

/** Revalidate the existing request-local authority before cloud projection.
 * No handle, user ID or authority callback enters provider JSON. */
export class AuthorizedAsyncCloudConversationTransport implements CloudGenerationTransport<AsyncConversationModelInput> {
  private readonly consumed = new WeakSet<AsyncConversationModelInput>();
  private readonly processing: CloudAiProcessing;
  constructor(private readonly transport: CloudGenerationTransport<ConversationInput> & { readonly processing?: CloudAiProcessing }, private readonly consent: CloudConversationConsent) {
    if (!consent || typeof consent.verify !== 'function' || typeof consent.current !== 'function') throw Error('CLOUD_CONSENT_REQUIRED');
    const transportProcessing = transport.processing ?? GROQ_CLOUD_PROCESSING;
    const consentProcessing = consent.processing ?? GROQ_CLOUD_PROCESSING;
    const processing = parseCloudAiProcessing(transportProcessing.provider, transportProcessing.disclosureVersion);
    if (!processing || !parseCloudAiProcessing(consentProcessing.provider, consentProcessing.disclosureVersion) ||
        processing.provider !== consentProcessing.provider) throw Error('CLOUD_PROCESSING_REQUIRED');
    this.processing = processing;
  }
  async dispatch(handle: AsyncConversationModelInput, budget: RequestBudget): Promise<CloudGenerationObservation> {
    const unknown = (): CloudGenerationObservation => ({ kind: 'unknown', physical: 'unknown' });
    const live = () => !budget.signal.aborted && budget.remainingMs() > 0;
    try {
      if (!handle || this.consumed.has(handle) || !live()) return unknown();
      this.consumed.add(handle);
      if (legacyCloudAiProcessing(handle)?.provider !== this.processing.provider) return unknown();
      if (!await this.consent.verify(handle, budget) || !live()) return unknown();
      if (!await handle.authorize() || !live()) return unknown();
      const projection = handle.projection();
      if (!projection || !live() || !this.consent.current(handle)) return unknown();
      return await this.transport.dispatch(projection, budget);
    } catch { return unknown(); }
  }
}

/** Concrete bridge for handles produced by the cloud-enabled Application.
 * authorize() performs fresh Auth, cloud grant, source and generation checks. */
export class ApplicationCloudConversationConsent implements CloudConversationConsent {
  constructor(readonly processing: CloudAiProcessing = GROQ_CLOUD_PROCESSING) {
    if (!parseCloudAiProcessing(processing.provider, processing.disclosureVersion)) throw Error('CLOUD_PROCESSING_REQUIRED');
  }
  async verify(handle: AsyncConversationModelInput, budget: RequestBudget): Promise<boolean> {
    return !budget.signal.aborted && budget.remainingMs() > 0 && this.current(handle);
  }
  current(handle: AsyncConversationModelInput): boolean {
    try { return handle.processing === 'cloud' && legacyCloudAiProcessing(handle)?.provider === this.processing.provider && handle.cloudConsentCurrent?.() === true; }
    catch { return false; }
  }
}
