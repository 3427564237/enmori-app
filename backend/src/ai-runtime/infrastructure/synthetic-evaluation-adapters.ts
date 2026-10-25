import type { EvaluationHttp, EvaluationHttpRequest, EvaluationObservation, EvaluationProvider,
  SyntheticPrompt } from '../ports/synthetic-evaluation.js';

export const evaluationProfiles = Object.freeze({
  'ollama-baseline': { model: 'qwen3.5:9b', contextTokens: 8192, outputTokens: 512, thinking: false },
  'gemini-candidate': { model: 'gemini-3.8-flash', outputTokens: 2048, thinking: 'low' },
});
const schema = { type: 'object', properties: { schemaVersion: { type: 'string', enum: ['ai_assistant_message_v1'] },
  message: { type: 'string' } }, required: ['schemaVersion', 'message'], additionalProperties: false };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const text = (v: unknown): v is string => typeof v === 'string' && v.isWellFormed() && v.trim().length > 0;

export function buildEvaluationRequest(provider: EvaluationProvider, input: SyntheticPrompt): EvaluationHttpRequest {
  if (!input || input.scope !== 'synthetic-evaluation-only' || !text(input.system) ||
      !Array.isArray(input.turns) || ![1, 3, 5].includes(input.turns.length) ||
      input.turns.some((turn, i) => !turn || turn.role !== (i % 2 ? 'assistant' : 'user') || !text(turn.text)) ||
      Buffer.byteLength(JSON.stringify(input)) > 24_000) throw Error('EVALUATION_INPUT_INVALID');
  if (provider === 'ollama-baseline') {
    return { url: 'http://127.0.0.1:11434/api/chat', body: JSON.stringify({
      model: evaluationProfiles[provider].model,
      messages: [{ role: 'system', content: input.system }, ...input.turns.map(t => ({ role: t.role, content: t.text }))],
      stream: false, think: false, keep_alive: '30m',
      // Match current LocalChatTransport's exact schema/options, including const.
      format: { ...schema, properties: { ...schema.properties, schemaVersion: { type: 'string', const: 'ai_assistant_message_v1' } } },
      options: { num_ctx: 8192, num_predict: 512 },
    }) };
  }
  if (provider !== 'gemini-candidate') throw Error('EVALUATION_PROVIDER_INVALID');
  return { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    body: JSON.stringify({ systemInstruction: { parts: [{ text: input.system }] },
      contents: input.turns.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })),
      generationConfig: { candidateCount: 1, maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
        responseMimeType: 'application/json', responseJsonSchema: schema },
    }) };
}

/** No default HTTP client, no retry, no fallback, no tools, no business writes.
 * Raw payloads are returned ONLY for private synthetic evaluation artifacts.
 * Never import this experiment into the product composition root. */
export async function observeSyntheticEvaluation(provider: EvaluationProvider, prompt: SyntheticPrompt,
  http: EvaluationHttp, options: { readonly signal?: AbortSignal; readonly deliveryMs?: number;
    readonly receiveMs?: number; readonly now?: () => number } = {}): Promise<EvaluationObservation> {
  const now = options.now ?? (() => performance.now()), started = now();
  const deliveryMs = options.deliveryMs ?? 45_000, receiveMs = options.receiveMs ?? 120_000;
  const base = () => ({ provider, elapsedMs: Math.max(0, now() - started),
    withinDeliveryDeadline: now() - started < deliveryMs && !options.signal?.aborted });
  if (options.signal?.aborted) return { ...base(), outcome: 'not-started', failure: 'cancelled' };
  let request: EvaluationHttpRequest;
  try {
    if (!Number.isFinite(deliveryMs) || deliveryMs <= 0 || !Number.isSafeInteger(receiveMs) ||
        receiveMs < deliveryMs || receiveMs > 120_000) throw Error();
    request = buildEvaluationRequest(provider, prompt);
  } catch { return { ...base(), outcome: 'not-started', failure: 'invalid-input' }; }
  let rawBody = '', httpStatus: number | undefined;
  try {
    // User cancellation revokes eligibility but does not abort the original receive.
    const response = await http(request, AbortSignal.timeout(receiveMs));
    httpStatus = response.status;
    if (!response.body) return { ...base(), outcome: 'unconfirmed', httpStatus, failure: 'network-or-receive' };
    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    try {
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.length;
        if (bytes > 1024 * 1024) throw Error('EVALUATION_BODY_LIMIT');
        rawBody += decoder.decode(part.value, { stream: true });
      }
      rawBody += decoder.decode();
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const observed = { ...base(), outcome: 'response-observed' as const, httpStatus, rawBody };
    if (!response.ok) return { ...observed, failure: 'http' };
    let value: unknown;
    try { value = JSON.parse(rawBody); } catch { return { ...observed, failure: 'malformed' }; }
    if (!record(value)) return { ...observed, failure: 'malformed' };
    if (provider === 'ollama-baseline') {
      if (value.done !== true || value.model !== evaluationProfiles[provider].model)
        return { ...observed, outcome: 'unconfirmed', failure: 'incomplete' };
      const usage = { ...(count(value.prompt_eval_count) ? { inputTokens: value.prompt_eval_count } : {}),
        ...(count(value.eval_count) ? { outputTokens: value.eval_count } : {}) };
      return { ...observed, modelRevision: value.model as string, usage,
        ...(typeof value.done_reason === 'string' ? { finishReason: value.done_reason } : {}),
        ...(record(value.message) && typeof value.message.content === 'string' ? { rawText: value.message.content } : {}),
        ...(value.done_reason !== 'stop' ? { failure: 'incomplete' as const } : {}) };
    }
    const u = record(value.usageMetadata) ? value.usageMetadata : {};
    const usage = { ...(count(u.promptTokenCount) ? { inputTokens: u.promptTokenCount } : {}),
      ...(count(u.candidatesTokenCount) ? { outputTokens: u.candidatesTokenCount } : {}),
      ...(count(u.thoughtsTokenCount) ? { thinkingTokens: u.thoughtsTokenCount } : {}),
      ...(count(u.totalTokenCount) ? { totalTokens: u.totalTokenCount } : {}) };
    const metadata = { ...observed, usage,
      ...(typeof value.modelVersion === 'string' ? { modelRevision: value.modelVersion } : {}) };
    if (record(value.promptFeedback) && value.promptFeedback.blockReason)
      return { ...metadata, failure: 'blocked' };
    if (!Array.isArray(value.candidates) || value.candidates.length !== 1 || !record(value.candidates[0]))
      return { ...metadata, failure: 'malformed' };
    const candidate = value.candidates[0], parts = record(candidate.content) ? candidate.content.parts : undefined;
    const finishReason = typeof candidate.finishReason === 'string' ? candidate.finishReason : undefined;
    // Do not treat a tool call or thought summary as the assistant's final text.
    const plainParts = Array.isArray(parts) && parts.length > 0 && parts.every(p => record(p) &&
      p.thought !== true && typeof p.text === 'string' && p.functionCall === undefined);
    return { ...metadata, ...(finishReason ? { finishReason } : {}),
      ...(plainParts ? { rawText: (parts as { text: string }[]).map(p => p.text).join('') } : {}),
      ...(!plainParts || finishReason !== 'STOP' ? { failure: 'incomplete' as const } : {}) };
  } catch {
    // This does NOT assert remote cancellation/termination. The runner must stop.
    return { ...base(), outcome: 'unconfirmed', failure: 'network-or-receive', rawBody,
      ...(httpStatus !== undefined ? { httpStatus } : {}) };
  }
}
