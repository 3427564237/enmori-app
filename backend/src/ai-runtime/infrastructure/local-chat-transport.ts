import type { ConversationInput, ConversationGates } from '../../ai-conversation/ports/conversation-lifecycle.js';
import type { GenerationTransport, RequestBudget } from '../ports/generation-transport.js';
import { validOpenConversationInput } from '../../ai-conversation/application/open-conversation-semantic-policy.js';
import { err, ok } from '../../shared/domain/result.js';
import { LocalModelLane, type LocalModelMessage } from './local-model-lane.js';

/** MVP chat. Model receives only the Application's authorized projection.
 * No keyword/claim censorship, tokenizer sidecar, tools or business writes. */
export class LocalChatTransport implements GenerationTransport<ConversationInput> {
  private readonly lane: LocalModelLane;
  constructor(lane: LocalModelLane);
  constructor(model: string, http?: typeof fetch);
  constructor(modelOrLane: string | LocalModelLane, http: typeof fetch = fetch) {
    this.lane = typeof modelOrLane === 'string' ? new LocalModelLane(modelOrLane, http) : modelOrLane;
  }
  get state() { return this.lane.state; }
  prepareModel(): Promise<void> { return this.lane.prepareModel(); }
  async generate(input: ConversationInput, budget: RequestBudget): Promise<Uint8Array> {
    if (this.lane.state.pending || budget.signal.aborted || !validOpenConversationInput(input) || input.checkIns.length !== 0) {
      throw Error('AI_UNAVAILABLE');
    }
    const messages: LocalModelMessage[] = [
      { role: 'system', content: 'You are ENMORI, a helpful conversational companion. Reply naturally in the user’s language. Use only the supplied conversation. You have no tools, location access, event catalogue or ability to change application data. Do not invent personal facts or events. Persona preferences affect expression only. Return a JSON object with schemaVersion "ai_assistant_message_v1" and a non-empty "message" string.' +
        (input.persona ? ` Presentation preferences: ${JSON.stringify(input.persona)}` : '') },
      ...(input.history ?? []).flatMap<LocalModelMessage>(pair => [{ role: 'user', content: pair.user }, { role: 'assistant', content: pair.assistant }]),
      { role: 'user', content: input.currentMessage },
    ];
    return this.lane.generate(messages, budget);
  }
}

export const simpleChatGates: ConversationGates = {
  beforeGeneration: async (get, budget) => {
    const input = get();
    return input && validOpenConversationInput(input) && input.checkIns.length === 0 && !budget.signal.aborted && budget.remainingMs() > 0
      ? ok(undefined) : err('stale_authority');
  },
  candidate: async (get, output, budget) => {
    const input = get(), reply = output();
    if (!input || !reply || budget.signal.aborted || budget.remainingMs() <= 0) return err('stale_authority');
    return reply.schemaVersion === 'ai_assistant_message_v1' && reply.message.trim().length > 0
      ? ok(undefined) : err('unsafe_output');
  },
};
