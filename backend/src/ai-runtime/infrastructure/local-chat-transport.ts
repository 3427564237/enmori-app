import type { ConversationInput, ConversationGates } from '../../ai-conversation/ports/conversation-lifecycle.js';
import type { GenerationTransport, RequestBudget } from '../ports/generation-transport.js';
import { validOpenConversationInput } from '../../ai-conversation/application/open-conversation-semantic-policy.js';
import { err, ok } from '../../shared/domain/result.js';

/** MVP chat. Model receives only the Application's authorized projection.
 * No keyword/claim censorship, tokenizer sidecar, tools or business writes. */
export class LocalChatTransport implements GenerationTransport<ConversationInput> {
  private pending = false;
  private uncertain = false;
  constructor(private readonly model: string, private readonly http: typeof fetch = fetch) {
    if (!/^[a-zA-Z0-9_.:-]+$/.test(model)) throw Error('AI_CONFIGURATION_INVALID');
  }
  get state() { return { pending: this.pending, outcomeUnknown: this.uncertain }; }
  async prepareModel(): Promise<void> {
    // Empty load request: no user content, no chat history and no business write.
    const response = await this.http('http://127.0.0.1:11434/api/generate', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120_000),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: '', stream: false,
        keep_alive: '30m', options: { num_ctx: 8192 } }),
    });
    if (!response.ok) throw Error('AI_UNAVAILABLE');
    const value = await response.json() as { done?: boolean; response?: string };
    if (value.done !== true || value.response !== '') throw Error('AI_UNAVAILABLE');
  }
  async generate(input: ConversationInput, budget: RequestBudget): Promise<Uint8Array> {
    if (this.pending || budget.signal.aborted || !validOpenConversationInput(input) || input.checkIns.length !== 0) {
      throw Error('AI_UNAVAILABLE');
    }
    const messages = [
      { role: 'system', content: 'You are ENMORI, a helpful conversational companion. Reply naturally in the user’s language. Use only the supplied conversation. You have no tools, location access, event catalogue or ability to change application data. Do not invent personal facts or events. Persona preferences affect expression only. Return a JSON object with schemaVersion "ai_assistant_message_v1" and a non-empty "message" string.' +
        (input.persona ? ` Presentation preferences: ${JSON.stringify(input.persona)}` : '') },
      ...(input.history ?? []).flatMap(pair => [{ role: 'user', content: pair.user }, { role: 'assistant', content: pair.assistant }]),
      { role: 'user', content: input.currentMessage },
    ];
    this.pending = true;
    let done = false;
    // A user deadline withdraws delivery authority, but keep receiving the
    // original local response so a late completion can release the single lane.
    // No late response is saved or returned after budget cancellation.
    try {
      const response = await this.http('http://127.0.0.1:11434/api/chat', {
        method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(120_000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, stream: false, think: false, keep_alive: '30m',
          format: { type: 'object', properties: { schemaVersion: { type: 'string', const: 'ai_assistant_message_v1' }, message: { type: 'string' } }, required: ['schemaVersion','message'], additionalProperties: false },
          options: { num_ctx: 8192, num_predict: 512 } }),
      });
      if (!response.ok) { done = true; throw Error('AI_UNAVAILABLE'); }
      if (!response.body) throw Error('AI_UNAVAILABLE');
      const reader = response.body.getReader(); let raw = '', length = 0;
      const decoder = new TextDecoder('utf8', { fatal: true });
      try {
        for (;;) {
          const part = await reader.read(); if (part.done) break;
          length += part.value.length; if (length > 1024 * 1024) throw Error('AI_UNAVAILABLE');
          raw += decoder.decode(part.value, { stream: true });
        }
        raw += decoder.decode();
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || !('done' in value) || value.done !== true ||
          !('model' in value) || value.model !== this.model) throw Error('AI_UNAVAILABLE');
      done = true;
      if (budget.signal.aborted || !('message' in value) || !value.message || typeof value.message !== 'object' ||
          !('content' in value.message) || typeof value.message.content !== 'string') throw Error('AI_UNAVAILABLE');
      return new TextEncoder().encode(value.message.content);
    } catch {
      if (done) throw Error('AI_UNAVAILABLE');
      this.uncertain = true;
      // Keep the lane occupied when the provider outcome is unknown; never retry blindly.
      return new Promise<Uint8Array>(() => {});
    } finally { if (done) this.pending = false; }
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
