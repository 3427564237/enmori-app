import type { CloudGenerationObservation, CloudGenerationTransport } from '../ports/cloud-generation-transport.js';
import type { RequestBudget } from '../ports/generation-transport.js';
import type { RuntimeClock } from '../ports/runtime-clock.js';

export interface GroqMessage { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }
/** Explicit composition settings, not approval to adopt this model or send data.
 * The caller must reserve at least the verified total token bound before dispatch. */
export interface GroqDispatchControls {
  /** Includes exact model chat framing; no byte-heuristic default is supplied. */
  inputTokenUpperBound(messages: readonly GroqMessage[]): number;
  readonly reservedTokens: number;
  available(): boolean;
  rateLimited(retryAfterSeconds: number | undefined): Promise<void>;
}
export interface GroqTransportConfiguration {
  readonly model: 'openai/gpt-oss-120b';
  readonly reasoningEffort: 'low' | 'medium' | 'high';
  readonly maxCompletionTokens: number;
  readonly maxRequestBytes: number;
  readonly maxInputTokens: number;
}
const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
const unknown = (): CloudGenerationObservation => ({ kind: 'unknown', physical: 'unknown' });
const stopped = (): CloudGenerationObservation => ({ kind: 'failure', physical: 'stopped' });
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

/** JSON.parse validates syntax; this second lexical pass rejects decoded
 * duplicate object keys before terminal/usage fields can be trusted. */
function parseEnvelope(text: string): unknown {
  const parsed: unknown = JSON.parse(text), stack: (Set<string> | undefined)[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') stack.push(new Set());
    else if (ch === '[') stack.push(undefined);
    else if (ch === '}' || ch === ']') stack.pop();
    else if (ch === '"') {
      const start = i++;
      while (text[i] !== '"') { if (text[i] === '\\') i++; i++; }
      let next = i + 1;
      while (/\s/.test(text[next] ?? '') && next < text.length) next++;
      if (text[next] === ':') {
        const key: string = JSON.parse(text.slice(start, i + 1)), keys = stack.at(-1);
        if (!keys || keys.has(key)) throw Error();
        keys.add(key);
      }
    }
  }
  return parsed;
}

/** Backend-only HTTP adapter. No credential lookup, default fetch, retry,
 * provider fallback, prompt construction, quota refund, storage or logging.
 * HTTP errors/abort never impersonate physical settlement of a cloud request. */
export class GroqCloudTransport implements CloudGenerationTransport<readonly GroqMessage[]> {
  private readonly config: Readonly<GroqTransportConfiguration>;
  constructor(private readonly key: string, config: GroqTransportConfiguration,
    private readonly clock: RuntimeClock, private readonly http: typeof fetch,
    private readonly controls: GroqDispatchControls) {
    if (!/^gsk_[A-Za-z0-9_-]{20,508}$/.test(key) || config.model !== 'openai/gpt-oss-120b' ||
        !['low', 'medium', 'high'].includes(config.reasoningEffort) ||
        !Number.isSafeInteger(config.maxCompletionTokens) || config.maxCompletionTokens < 1 || config.maxCompletionTokens > 65536 ||
        !Number.isSafeInteger(config.maxRequestBytes) || config.maxRequestBytes < 1 || config.maxRequestBytes > 131072 ||
        !Number.isSafeInteger(config.maxInputTokens) || config.maxInputTokens < 1 || config.maxInputTokens > 131072 ||
        typeof http !== 'function' || !controls || typeof controls.rateLimited !== 'function' ||
        typeof controls.available !== 'function' || typeof controls.inputTokenUpperBound !== 'function' ||
        !Number.isSafeInteger(controls.reservedTokens) || controls.reservedTokens < config.maxInputTokens + config.maxCompletionTokens ||
        controls.reservedTokens > 8000) throw Error('GROQ_CONFIGURATION_INVALID');
    this.config = Object.freeze({ ...config });
  }
  private live(budget: RequestBudget): boolean {
    try { const now = this.clock.now(), remaining = budget.remainingMs();
      return !budget.signal.aborted && Number.isFinite(now) && Number.isFinite(budget.deadline) &&
        now < budget.deadline && Number.isFinite(remaining) && remaining > 0;
    } catch { return false; }
  }
  private request(messages: readonly GroqMessage[]): string {
    if (!Array.isArray(messages) || messages.length < 2 || messages.length > 6 || messages[0]?.role !== 'system' ||
        messages.at(-1)?.role !== 'user' || messages.some((m, i) => !m ||
          m.role !== (i === 0 ? 'system' : i % 2 === 1 ? 'user' : 'assistant') ||
          typeof m.content !== 'string' || !m.content.isWellFormed() || !m.content.trim())) throw Error();
    const snapshot = Object.freeze(messages.map(m => Object.freeze({ role: m.role, content: m.content })));
    const upperBound = this.controls.inputTokenUpperBound(snapshot);
    if (!Number.isSafeInteger(upperBound) || upperBound < 1 || upperBound > this.config.maxInputTokens) throw Error();
    const body = JSON.stringify({ model: this.config.model,
      messages: snapshot, stream: false,
      max_completion_tokens: this.config.maxCompletionTokens, reasoning_effort: this.config.reasoningEffort,
      include_reasoning: false, response_format: { type: 'json_schema', json_schema: {
        name: 'ai_assistant_message_v1', strict: true, schema: { type: 'object',
          properties: { schemaVersion: { type: 'string', enum: ['ai_assistant_message_v1'] }, message: { type: 'string' } },
          required: ['schemaVersion', 'message'], additionalProperties: false } } } });
    if (Buffer.byteLength(body, 'utf8') > this.config.maxRequestBytes || body.includes(this.key)) throw Error();
    return body;
  }
  async dispatch(messages: readonly GroqMessage[], budget: RequestBudget): Promise<CloudGenerationObservation> {
    let body: string;
    try { if (!this.live(budget)) return unknown(); body = this.request(messages); } catch { return unknown(); }
    const receive = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let closeTimer: (() => void) | undefined;
    let ended = false;
    let end!: (value: CloudGenerationObservation) => void;
    const result = new Promise<CloudGenerationObservation>(resolve => { end = resolve; });
    const finish = (observation: CloudGenerationObservation) => {
      if (ended) return;
      ended = true;
      closeTimer?.(); budget.signal.removeEventListener('abort', cancel);
      if (observation.physical === 'unknown') {
        receive.abort();
        if (reader) void reader.cancel().catch(() => {});
      }
      end(observation);
    };
    const cancel = () => finish(unknown());
    budget.signal.addEventListener('abort', cancel, { once: true });
    try {
      const now = this.clock.now();
      closeTimer = this.clock.at(Math.min(budget.deadline, now + budget.remainingMs(), now + 120000), cancel);
      if (!this.live(budget) || ended || !this.controls.available() || !this.live(budget) || ended) { cancel(); return result; }
      // No asynchronous gap after the final original-budget check.
      const pending = this.http(endpoint, { method: 'POST', redirect: 'error', cache: 'no-store', signal: receive.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.key}` }, body });
      void (async () => {
        try {
          const response = await pending;
          if (response.status === 429) {
            const value = response.headers.get('retry-after');
            let seconds = value !== null && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : undefined;
            if (seconds === undefined && value !== null) {
              const at = Date.parse(value), serverDate = Date.parse(response.headers.get('date') ?? '');
              seconds = Number.isFinite(at) && Number.isFinite(serverDate) && at > serverDate
                ? Math.ceil((at - serverDate) / 1000) : Infinity;
            }
            await this.controls.rateLimited(seconds);
          }
          if (ended || !response.ok || !response.body) {
            if (response.body) void response.body.cancel().catch(() => {});
            finish(unknown()); return;
          }
          reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8', { fatal: true });
          let text = '', size = 0;
          for (;;) {
            const part = await reader.read();
            if (ended) return;
            if (part.done) break;
            size += part.value.byteLength;
            if (size > 1024 * 1024) throw Error();
            text += decoder.decode(part.value, { stream: true });
          }
          text += decoder.decode();
          reader.releaseLock(); reader = undefined;
          if (!this.live(budget)) { finish(unknown()); return; }
          const value: unknown = parseEnvelope(text);
          if (!record(value) || value.model !== this.config.model || !Array.isArray(value.choices) || value.choices.length !== 1) throw Error();
          const choice: unknown = value.choices[0];
          if (!record(choice) || choice.index !== 0 || !record(choice.message) || choice.message.role !== 'assistant' ||
              !['stop', 'length', 'tool_calls', 'function_call', 'content_filter'].includes(choice.finish_reason as string)) throw Error();
          // A complete validated terminal envelope establishes physical stop.
          // A refusal, truncation or missing/bad usage is still not a candidate.
          const usage = value.usage, message = choice.message;
          if (choice.finish_reason !== 'stop' || message.refusal != null || message.tool_calls != null || message.function_call != null ||
              !record(usage) || !count(usage.prompt_tokens) || !count(usage.completion_tokens) || !count(usage.total_tokens) ||
              usage.total_tokens !== usage.prompt_tokens + usage.completion_tokens ||
              usage.prompt_tokens > this.config.maxInputTokens || usage.completion_tokens > this.config.maxCompletionTokens ||
              typeof message.content !== 'string' || !message.content.isWellFormed() || !message.content.trim()) { finish(stopped()); return; }
          // Decode only to inspect credential reflection, never repair output.
          let decoded: unknown;
          try { decoded = JSON.parse(message.content); } catch { finish(stopped()); return; }
          if (message.content.includes(this.key) || JSON.stringify(decoded).includes(this.key)) { finish(stopped()); return; }
          finish({ kind: 'response', physical: 'stopped', raw: new TextEncoder().encode(message.content) });
        } catch { finish(unknown()); }
      })();
    } catch { finish(unknown()); }
    return result;
  }
}
