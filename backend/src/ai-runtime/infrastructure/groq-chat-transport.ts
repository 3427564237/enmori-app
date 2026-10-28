import type { ConversationInput } from '../../ai-conversation/ports/conversation-lifecycle.js';
import type { CloudGenerationObservation, CloudGenerationTransport } from '../ports/cloud-generation-transport.js';
import type { RequestBudget } from '../ports/generation-transport.js';
import { buildChatMessages } from './local-chat-transport.js';
import type { GroqCloudTransport } from './groq-cloud-transport.js';

/** Existing authorized projection and prompt, no experimental prompt adoption. */
export class GroqChatTransport implements CloudGenerationTransport<ConversationInput> {
  constructor(private readonly transport: GroqCloudTransport) {}
  dispatch(input: ConversationInput, budget: RequestBudget): Promise<CloudGenerationObservation> {
    try { return this.transport.dispatch(buildChatMessages(input), budget); }
    catch { return Promise.resolve({ kind: 'unknown', physical: 'unknown' }); }
  }
}
