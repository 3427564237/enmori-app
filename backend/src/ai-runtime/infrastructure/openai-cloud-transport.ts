import type { CloudGenerationObservation, CloudGenerationTransport } from '../ports/cloud-generation-transport.js';
import type { RequestBudget } from '../ports/generation-transport.js';
import type { RuntimeClock } from '../ports/runtime-clock.js';

export type OpenAiTrialModel = 'gpt-6-luna' | 'gpt-6.1-sol';
export interface OpenAiMessage { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }
export interface OpenAiTransportConfiguration {
  readonly model: OpenAiTrialModel;
  readonly reasoningEffort: 'low';
  /** Includes reasoning tokens, not just the visible JSON. */
  readonly maxOutputTokens: number;
  readonly maxInputTokens: number;
  readonly maxRequestBytes: number;
}

/** Content-free accounting from a complete, validated provider response.
 * Cache reads and writes are disjoint subsets of inputTokens; reasoning is
 * already included in outputTokens. No response text or provider error escapes. */
export interface OpenAiUsage {
  readonly provider: 'openai';
  readonly model: OpenAiTrialModel;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheWriteTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
}

export interface OpenAiDispatchControls {
  /** Verified bound for this exact Responses body, including schema/framing.
   * No tokenizer, byte estimate, credential or permissive default is supplied. */
  inputTokenUpperBound(requestBody: string): number;
  readonly reservedTokens: number;
  /** Bind to the original confirmed money reservation and exclusive owner. */
  available(): boolean;
  /** undefined means absent; Infinity means unusable and must stay closed. */
  rateLimited(retryAfterSeconds: number | undefined): Promise<void>;
  /** The composition captures the original reservation, never the model input.
   * An unknown result retains that reservation and must close budget admission.
   * A confirmed invalid/refused output is still billable. */
  confirmUsage(usage: Readonly<OpenAiUsage>): Promise<'confirmed' | 'unknown'>;
}

export const openAiResponsesEndpoint = 'https://api.openai.com/v1/responses';
const maxResponseBytes = 1024 * 1024;
const unknown = (): CloudGenerationObservation => ({ kind: 'unknown', physical: 'unknown' });
const stopped = (): CloudGenerationObservation => ({ kind: 'failure', physical: 'stopped' });
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const within = (v: unknown, min: number, max: number): v is number => count(v) && v >= min && v <= max;
const keysWithin = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).every(key => keys.includes(key));

function validConfiguration(config: OpenAiTransportConfiguration): boolean {
  return !!config && ['gpt-6-luna', 'gpt-6.1-sol'].includes(config.model) && config.reasoningEffort === 'low' &&
    within(config.maxOutputTokens, 16, 128000) && within(config.maxInputTokens, 1, 131072) &&
    within(config.maxRequestBytes, 1, 131072);
}

/** Shared pure preflight for constructors/composition. Reject misconfiguration
 * before a caller can consume a monetary reservation; never retain the key. */
export function assertOpenAiTransportSettings(key: string, config: OpenAiTransportConfiguration,
  reservedTokens: number): Readonly<OpenAiTransportConfiguration> {
  try {
    const selected: OpenAiTransportConfiguration = { model: config.model, reasoningEffort: config.reasoningEffort,
      maxOutputTokens: config.maxOutputTokens, maxInputTokens: config.maxInputTokens, maxRequestBytes: config.maxRequestBytes };
    if (typeof key !== 'string' || !/^sk-[A-Za-z0-9_-]{20,508}$/.test(key) || !validConfiguration(selected) ||
        !count(reservedTokens) || reservedTokens < selected.maxInputTokens + selected.maxOutputTokens) throw Error();
    return Object.freeze(selected);
  } catch { throw Error('OPENAI_CONFIGURATION_INVALID'); }
}

/** Pure exact body for pre-dispatch hashing/counting; never supplies a token
 * estimate, credential, reservation or HTTP client. dispatch uses this same body. */
export function buildOpenAiRequest(messages: readonly OpenAiMessage[], config: OpenAiTransportConfiguration): string {
  let body: string;
  try {
    if (!validConfiguration(config) || !Array.isArray(messages) || messages.length < 2 || messages.length > 6 ||
        messages[0]?.role !== 'system' || messages.at(-1)?.role !== 'user' || messages.some((m, i) => !m ||
          !record(m) || Object.keys(m).length !== 2 || !keysWithin(m, ['role', 'content']) ||
          m.role !== (i === 0 ? 'system' : i % 2 === 1 ? 'user' : 'assistant') ||
          typeof m.content !== 'string' || !m.content.isWellFormed() || !m.content.trim())) throw Error();
    const input = messages.map(message => ({ role: message.role, content: message.content }));
    body = JSON.stringify({ model: config.model, input,
      reasoning: { effort: config.reasoningEffort }, max_output_tokens: config.maxOutputTokens,
      stream: false, store: false, background: false, service_tier: 'default', truncation: 'disabled',
      tools: [], tool_choice: 'none',
      text: { format: { type: 'json_schema', name: 'ai_assistant_message_v1', strict: true,
        schema: { type: 'object', properties: { schemaVersion: { type: 'string', enum: ['ai_assistant_message_v1'] },
          message: { type: 'string' } }, required: ['schemaVersion', 'message'], additionalProperties: false } } },
    });
    if (Buffer.byteLength(body, 'utf8') > config.maxRequestBytes) throw Error();
  } catch { throw Error('OPENAI_REQUEST_INVALID'); }
  return body;
}

/** Reject duplicate decoded keys before trusting status, usage or inner JSON. */
function parseUnambiguousJson(text: string): unknown {
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
      while (next < text.length && /\s/.test(text[next] ?? '')) next++;
      if (text[next] === ':') {
        const key: string = JSON.parse(text.slice(start, i + 1)), keys = stack.at(-1);
        if (!keys || keys.has(key)) throw Error();
        keys.add(key);
      }
    }
  }
  return parsed;
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('retry-after');
  if (value === null) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds : Infinity;
  }
  const at = Date.parse(value), date = Date.parse(response.headers.get('date') ?? '');
  return Number.isFinite(at) && Number.isFinite(date) && at > date ? Math.ceil((at - date) / 1000) : Infinity;
}

/** An isolated Responses adapter, never an SDK/default-fetch or service switch.
 * Official shape: /api/reference/resources/responses/methods/create and
 * /api/docs/guides/structured-outputs. Only the separately approved trial models
 * are constructible. Abort/HTTP errors cannot establish remote termination. */
export class OpenAiCloudTransport implements CloudGenerationTransport<readonly OpenAiMessage[]> {
  readonly #key: string;
  private readonly config: Readonly<OpenAiTransportConfiguration>;
  private readonly reservedTokens: number;
  constructor(key: string, config: OpenAiTransportConfiguration,
    private readonly clock: RuntimeClock, private readonly http: typeof fetch,
    private readonly controls: OpenAiDispatchControls) {
    let valid = false;
    let selected: Readonly<OpenAiTransportConfiguration> | undefined;
    let reservedTokens = 0;
    try {
      reservedTokens = controls.reservedTokens;
      selected = assertOpenAiTransportSettings(key, config, reservedTokens);
      valid = typeof http === 'function' && !!clock &&
        typeof clock.now === 'function' && typeof clock.at === 'function' && !!controls &&
        typeof controls.inputTokenUpperBound === 'function' && typeof controls.available === 'function' &&
        typeof controls.rateLimited === 'function' && typeof controls.confirmUsage === 'function';
    } catch { /* Never expose an injected/configuration error or credential. */ }
    if (!valid || !selected) throw Error('OPENAI_CONFIGURATION_INVALID');
    this.#key = key;
    this.config = selected;
    this.reservedTokens = reservedTokens;
  }

  private live(budget: RequestBudget): boolean {
    try {
      const now = this.clock.now(), remaining = budget.remainingMs();
      return !budget.signal.aborted && Number.isFinite(now) && Number.isFinite(budget.deadline) &&
        now < budget.deadline && Number.isFinite(remaining) && remaining > 0;
    } catch { return false; }
  }

  private request(messages: readonly OpenAiMessage[]): { body: string; inputBound: number } {
    const body = buildOpenAiRequest(messages, this.config);
    if (body.includes(this.#key)) throw Error();
    const inputBound = this.controls.inputTokenUpperBound(body);
    if (!within(inputBound, 1, this.config.maxInputTokens)) throw Error();
    return { body, inputBound };
  }

  private usage(value: unknown, inputBound: number): Readonly<OpenAiUsage> | undefined {
    if (!record(value) || !record(value.input_tokens_details) || !record(value.output_tokens_details)) return;
    const input = value.input_tokens, cached = value.input_tokens_details.cached_tokens,
      writes = value.input_tokens_details.cache_write_tokens, output = value.output_tokens,
      reasoning = value.output_tokens_details.reasoning_tokens, total = value.total_tokens;
    if (!count(input) || !count(cached) || !count(writes) || !count(output) || !count(reasoning) || !count(total) ||
        input > inputBound || input > this.config.maxInputTokens || output > this.config.maxOutputTokens ||
        cached + writes > input || reasoning > output || total !== input + output ||
        total > this.reservedTokens) return;
    return Object.freeze({ provider: 'openai', model: this.config.model, inputTokens: input,
      cachedInputTokens: cached, cacheWriteTokens: writes, outputTokens: output, reasoningTokens: reasoning, totalTokens: total });
  }

  /** Only one complete assistant output_text. Recognized reasoning metadata is
   * discarded; tools, extra messages/parts, refusals and unknown types fail closed. */
  private candidate(output: unknown): Uint8Array | undefined {
    if (!Array.isArray(output) || output.length < 1 || output.length > 2) return;
    let index = 0;
    const reasoning: unknown = output[0];
    if (record(reasoning) && reasoning.type === 'reasoning') {
      if (typeof reasoning.id !== 'string' || !reasoning.id || !Array.isArray(reasoning.summary) ||
          !keysWithin(reasoning, ['id', 'type', 'summary', 'status', 'content', 'encrypted_content']) ||
          (reasoning.status !== undefined && reasoning.status !== 'completed') ||
          reasoning.summary.some((part: unknown) => !record(part) || part.type !== 'summary_text' || typeof part.text !== 'string') ||
          (reasoning.content !== undefined && (!Array.isArray(reasoning.content) || reasoning.content.some(
            (part: unknown) => !record(part) || part.type !== 'reasoning_text' || typeof part.text !== 'string'))) ||
          (reasoning.encrypted_content != null && typeof reasoning.encrypted_content !== 'string')) return;
      index++;
    }
    if (output.length !== index + 1) return;
    const message: unknown = output[index];
    if (!record(message) || message.type !== 'message' || message.role !== 'assistant' || message.status !== 'completed' ||
        !keysWithin(message, ['id', 'type', 'role', 'status', 'content', 'phase']) ||
        typeof message.id !== 'string' || !message.id || !Array.isArray(message.content) || message.content.length !== 1 ||
        (message.phase != null && message.phase !== 'final_answer')) return;
    const part: unknown = message.content[0];
    if (!record(part) || part.type !== 'output_text' || typeof part.text !== 'string' || !part.text.isWellFormed() ||
        !keysWithin(part, ['type', 'text', 'annotations', 'logprobs']) ||
        (part.logprobs !== undefined && (!Array.isArray(part.logprobs) || part.logprobs.length !== 0)) ||
        !part.text.trim() || !Array.isArray(part.annotations) || part.annotations.length !== 0) return;
    let parsed: unknown;
    try { parsed = parseUnambiguousJson(part.text); } catch { return; }
    if (!record(parsed) || Object.keys(parsed).length !== 2 || parsed.schemaVersion !== 'ai_assistant_message_v1' ||
        typeof parsed.message !== 'string' || !parsed.message.isWellFormed() || !parsed.message.trim() ||
        part.text.includes(this.#key) || JSON.stringify(parsed).includes(this.#key)) return;
    return new TextEncoder().encode(part.text);
  }

  async dispatch(messages: readonly OpenAiMessage[], budget: RequestBudget): Promise<CloudGenerationObservation> {
    let prepared: { body: string; inputBound: number };
    try { if (!this.live(budget)) return unknown(); prepared = this.request(messages); } catch { return unknown(); }
    const receive = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let closeTimer: (() => void) | undefined;
    let ended = false;
    let complete!: (value: CloudGenerationObservation) => void;
    const result = new Promise<CloudGenerationObservation>(resolve => { complete = resolve; });
    const finish = (observation: CloudGenerationObservation) => {
      if (ended) return;
      ended = true;
      try { closeTimer?.(); } catch { /* Cleanup cannot expose injected errors. */ }
      budget.signal.removeEventListener('abort', cancel);
      if (observation.physical === 'unknown') {
        receive.abort();
        if (reader) void reader.cancel().catch(() => {});
      }
      complete(observation);
    };
    const cancel = () => finish(unknown());
    budget.signal.addEventListener('abort', cancel, { once: true });
    try {
      const now = this.clock.now();
      closeTimer = this.clock.at(Math.min(budget.deadline, now + budget.remainingMs(), now + 120000), cancel);
      if (!this.live(budget) || ended || this.controls.available() !== true || !this.live(budget) || ended) { cancel(); return result; }
      // No asynchronous gap between the final original-budget guard and HTTP.
      const pending = this.http(openAiResponsesEndpoint, { method: 'POST', redirect: 'error', cache: 'no-store',
        signal: receive.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${this.#key}` },
        body: prepared.body });
      void (async () => {
        try {
          const response = await pending;
          if (ended) { if (response.body) void response.body.cancel().catch(() => {}); return; }
          if (response.status === 429) await this.controls.rateLimited(retryAfter(response));
          if (ended || !this.live(budget) || response.status !== 200 || !response.body ||
              response.redirected || response.url && response.url !== openAiResponsesEndpoint ||
              !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
            if (response.body) void response.body.cancel().catch(() => {});
            cancel(); return;
          }
          reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8', { fatal: true });
          let text = '', bytes = 0;
          for (;;) {
            const part = await reader.read();
            if (ended) return;
            if (part.done) break;
            bytes += part.value.byteLength;
            if (bytes > maxResponseBytes) throw Error();
            text += decoder.decode(part.value, { stream: true });
          }
          text += decoder.decode();
          reader.releaseLock(); reader = undefined;
          if (!this.live(budget)) { cancel(); return; }
          const value: unknown = parseUnambiguousJson(text);
          if (!record(value) || value.object !== 'response' || value.model !== this.config.model ||
              typeof value.id !== 'string' || !value.id || !['completed', 'failed', 'cancelled', 'incomplete'].includes(value.status as string)) {
            cancel(); return;
          }
          // A complete terminal provider envelope proves stop, not deliverability
          // or permission to reduce an unknown monetary reservation.
          const usage = this.usage(value.usage, prepared.inputBound);
          if (value.service_tier !== 'default' || (value.store !== undefined && value.store !== false) ||
              (value.background !== undefined && value.background !== false) ||
              value.tool_usage != null || !usage || !Array.isArray(value.output) || value.output.some(
                (item: unknown) => !record(item) || !['message', 'reasoning'].includes(item.type as string))) { finish(stopped()); return; }
          let confirmed = false;
          try { confirmed = await this.controls.confirmUsage(usage) === 'confirmed'; } catch { /* Retain reservation. */ }
          if (ended) return;
          if (!this.live(budget)) { cancel(); return; }
          if (!confirmed || value.status !== 'completed' || value.error !== null || value.incomplete_details !== null) {
            finish(stopped()); return;
          }
          const raw = this.candidate(value.output);
          finish(raw ? { kind: 'response', physical: 'stopped', raw } : stopped());
        } catch { cancel(); }
      })();
    } catch { cancel(); }
    return result;
  }
}
