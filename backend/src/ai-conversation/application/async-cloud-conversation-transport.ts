import type { CloudGenerationObservation, CloudGenerationTransport } from '../../ai-runtime/ports/cloud-generation-transport.js';
import type { RequestBudget } from '../../ai-runtime/ports/generation-transport.js';
import type { AsyncConversationModelInput } from '../ports/async-conversation.js';
import type { ConversationInput } from '../ports/conversation-lifecycle.js';

export interface CloudConversationConsent {
  verify(handle: AsyncConversationModelInput, budget: RequestBudget): Promise<boolean>;
  current(handle: AsyncConversationModelInput): boolean;
}

/** Revalidate the existing request-local authority before cloud projection.
 * No handle, user ID or authority callback enters provider JSON. */
export class AuthorizedAsyncCloudConversationTransport implements CloudGenerationTransport<AsyncConversationModelInput> {
  private readonly consumed = new WeakSet<AsyncConversationModelInput>();
  constructor(private readonly transport: CloudGenerationTransport<ConversationInput>, private readonly consent: CloudConversationConsent) {
    if (!consent || typeof consent.verify !== 'function' || typeof consent.current !== 'function') throw Error('CLOUD_CONSENT_REQUIRED');
  }
  async dispatch(handle: AsyncConversationModelInput, budget: RequestBudget): Promise<CloudGenerationObservation> {
    const unknown = (): CloudGenerationObservation => ({ kind: 'unknown', physical: 'unknown' });
    const live = () => !budget.signal.aborted && budget.remainingMs() > 0;
    try {
      if (!handle || this.consumed.has(handle) || !live()) return unknown();
      this.consumed.add(handle);
      if (!await this.consent.verify(handle, budget) || !live()) return unknown();
      if (!await handle.authorize() || !live()) return unknown();
      const projection = handle.projection();
      if (!projection || !live() || !this.consent.current(handle)) return unknown();
      return await this.transport.dispatch(projection, budget);
    } catch { return unknown(); }
  }
}
