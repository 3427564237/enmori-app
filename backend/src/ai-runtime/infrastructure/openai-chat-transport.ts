import type { ConversationInput } from '../../ai-conversation/ports/conversation-lifecycle.js';
import type { CloudGenerationObservation, CloudGenerationTransport } from '../ports/cloud-generation-transport.js';
import type { RequestBudget } from '../ports/generation-transport.js';
import { buildChatMessages } from './local-chat-transport.js';
import type { OpenAiCloudTransport } from './openai-cloud-transport.js';
import { OPENAI_CLOUD_PROCESSING } from '../../account/domain/cloud-ai-consent.js';

/** Preserve the authorized projection and existing prompt without provider state. */
export class OpenAiChatTransport implements CloudGenerationTransport<ConversationInput> {
  readonly processing = OPENAI_CLOUD_PROCESSING;
  constructor(private readonly transport: OpenAiCloudTransport) {}
  dispatch(input: ConversationInput, budget: RequestBudget): Promise<CloudGenerationObservation> {
    try { return this.transport.dispatch(buildChatMessages(input), budget); }
    catch { return Promise.resolve({ kind: 'unknown', physical: 'unknown' }); }
  }
}
