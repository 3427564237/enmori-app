import type { RequestBudget } from '../ports/generation-transport.js';
import { readOllamaEnvelope } from './ollama-response.js';

export interface LocalModelMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}
const unavailable = () => new Error('AI_UNAVAILABLE');
function live(budget: RequestBudget): boolean {
  try {
    const remaining = budget.remainingMs();
    return !budget.signal.aborted && Number.isFinite(budget.deadline) && Number.isFinite(remaining) && remaining > 0;
  } catch { return false; }
}

/** One instance per local model host, explicitly shared by Chat, Persona
 * preview and F0. No queue, retry, timeout reset or provider fallback here. */
export class LocalModelLane {
  private pending = false;
  private uncertain = false;
  constructor(readonly model: string, private readonly http: typeof fetch = fetch) {
    if (!/^[a-zA-Z0-9_.:-]+$/.test(model)) throw Error('AI_CONFIGURATION_INVALID');
  }
  get state() { return { pending: this.pending, outcomeUnknown: this.uncertain }; }

  async prepareForChat(): Promise<void> {
    if (this.pending || this.uncertain) throw unavailable();
    const response = await this.http('http://127.0.0.1:11434/api/ps', {
      method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw unavailable();
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || !('models' in value) || !Array.isArray(value.models)) throw unavailable();
    // Do not race an idle expiry during the existing 75-second client send.
    if (value.models.some((model: unknown) => model && typeof model === 'object' &&
      'name' in model && model.name === this.model && 'expires_at' in model &&
      typeof model.expires_at === 'string' && Date.parse(model.expires_at) > Date.now() + 75_000)) return;
    await this.prepareModel();
  }

  async prepareModel(): Promise<void> {
    const value = await this.receive('/api/generate', JSON.stringify({ model: this.model,
      prompt: '', stream: false, keep_alive: '30m', options: { num_ctx: 8192 } }));
    if (value.response !== '') throw unavailable();
  }

  async generate(messages: readonly LocalModelMessage[], budget: RequestBudget): Promise<Uint8Array> {
    // Keep the existing MVP request byte-for-byte, including field order.
    const body = JSON.stringify({ model: this.model, messages, stream: false, think: false, keep_alive: '30m',
      format: { type: 'object', properties: { schemaVersion: { type: 'string', const: 'ai_assistant_message_v1' }, message: { type: 'string' } }, required: ['schemaVersion','message'], additionalProperties: false },
      options: { num_ctx: 8192, num_predict: 512 } });
    const value = await this.receive('/api/chat', body, budget);
    if (!live(budget) || !value.message || typeof value.message !== 'object' ||
        !('content' in value.message) || typeof value.message.content !== 'string') throw unavailable();
    return new TextEncoder().encode(value.message.content);
  }

  private async receive(path: '/api/chat' | '/api/generate', body: string,
    budget?: RequestBudget): Promise<Record<string, unknown>> {
    if (this.pending || (budget && !live(budget))) throw unavailable();
    this.pending = true;
    let stopped = false;
    try {
      // Delivery cancellation does not abort receipt of the original response.
      // The bounded HTTP receive timeout is also not proof of model stoppage.
      const response = await this.http(`http://127.0.0.1:11434${path}`, {
        method: 'POST', redirect: 'error', ...(path === '/api/chat' ? { cache: 'no-store' as const } : {}),
        signal: AbortSignal.timeout(120_000), headers: { 'content-type': 'application/json' }, body,
      });
      const value = await readOllamaEnvelope(response);
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
          !('done' in value) || value.done !== true || !('model' in value) || value.model !== this.model) throw unavailable();
      stopped = true;
      return value as Record<string, unknown>;
    } catch {
      this.uncertain = true;
      // Neither an HTTP error nor socket closure proves physical settlement.
      // Leave all consumers blocked, even after the caller's delivery expires.
      return new Promise<Record<string, unknown>>(() => {});
    } finally { if (stopped) this.pending = false; }
  }
}
