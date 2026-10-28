import { readFileSync } from 'node:fs';
import { loadCases, prepareCase, protocolAssessment } from './evaluation.mjs';
import { goalPromptCandidate } from './goal-prompt-candidate.mjs';
import { constraintsPromptCandidate } from './constraints-prompt-candidate.mjs';

// Offline evaluation only. Constructing or importing this module never opens a
// socket or looks up a credential. The caller supplies the HTTP function.
export const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
export const groqModel = 'openai/gpt-oss-120b';
export function groqModelForProfile(profile) {
  checkedProfile(profile);
  return profile === 'qwen38-medium' ? 'qwen/qwen3.8-27b' : groqModel;
}
const maxResponseBytes = 1024 * 1024;
const maxDeliveryMs = 45_000;
const maxReceiveMs = 120_000;
const secrets = new WeakMap();
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
function reflectsSecret(content, secret) {
  if (!secret || typeof content !== 'string') return false;
  if (content.includes(secret) || content.includes(JSON.stringify(secret).slice(1, -1))) return true;
  // A JSON answer may encode the key as Unicode escapes. Check the decoded
  // values too without returning or logging the provider's full envelope.
  try {
    const pending = [JSON.parse(content)];
    while (pending.length) {
      const value = pending.pop();
      if (typeof value === 'string' && value.includes(secret)) return true;
      if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          if (key.includes(secret)) return true;
          pending.push(child);
        }
      }
    }
  } catch { /* malformed text was checked directly above */ }
  return false;
}

const golden = JSON.parse(readFileSync(new URL('./fixtures/current-prompt-requests.json', import.meta.url), 'utf8'));
if (golden.schemaVersion !== 'current_prompt_request_golden_v1' || !Array.isArray(golden.cases) ||
    golden.cases.length !== 24 || new Set(golden.cases.map(item => item.id)).size !== 24) {
  throw Error('GROQ_CORPUS_INVALID');
}
const goldenMessages = golden.cases.map(item => {
  const messages = JSON.parse(item.body).messages;
  if (!Array.isArray(messages) || !record(messages[0]) || messages[0].role !== 'system' ||
      typeof messages[0].content !== 'string') throw Error('GROQ_CORPUS_INVALID');
  return JSON.stringify(messages);
});
const personaMarker = ' Presentation preferences: ';
const baselineSystems = goldenMessages.map(serialized => JSON.parse(serialized)[0].content);
const baselineBases = new Set(baselineSystems.map(system => system.split(personaMarker, 1)[0]));
if (baselineBases.size !== 1 || typeof goalPromptCandidate !== 'string' || !goalPromptCandidate.trim()) {
  throw Error('GROQ_CORPUS_INVALID');
}
const baselineSystem = [...baselineBases][0];

/** Preserve the exact suffix captured by the production serializer, not a
 * reconstruction of Persona data from the fixture or user/history text. */
function candidateMessages(serialized, candidate = goalPromptCandidate) {
  const messages = JSON.parse(serialized), system = messages[0].content;
  if (!system.startsWith(baselineSystem)) throw Error('GROQ_CORPUS_INVALID');
  const suffix = system.slice(baselineSystem.length);
  if (suffix) {
    if (!suffix.startsWith(personaMarker)) throw Error('GROQ_CORPUS_INVALID');
    let persona;
    try { persona = JSON.parse(suffix.slice(personaMarker.length)); } catch { throw Error('GROQ_CORPUS_INVALID'); }
    if (!record(persona) || JSON.stringify(persona) !== suffix.slice(personaMarker.length)) {
      throw Error('GROQ_CORPUS_INVALID');
    }
  }
  return [{ role: 'system', content: candidate + suffix }, ...messages.slice(1)];
}

const profileMessages = {
  baseline: goldenMessages,
  'baseline-medium': goldenMessages,
  'qwen38-medium': goldenMessages,
  'constraints-v3': goldenMessages.map(serialized => JSON.stringify(candidateMessages(serialized, constraintsPromptCandidate))),
  'goal-v2': goldenMessages.map(serialized => JSON.stringify(candidateMessages(serialized))),
};
const permittedMessages = Object.fromEntries(Object.entries(profileMessages).map(([profile, items]) => [profile, new Set(items)]));
function checkedProfile(profile) {
  if (!Object.hasOwn(profileMessages, profile)) throw Error('GROQ_PROFILE_INVALID');
  return profile;
}

function requestBody(messages, profile = 'baseline') {
  checkedProfile(profile);
  return JSON.stringify({
    model: groqModelForProfile(profile),
    messages,
    stream: false,
    // The candidate uses a smaller explicitly recorded ceiling; baseline is unchanged.
    max_completion_tokens: profile === 'goal-v2' ? 1024 : 2048,
    reasoning_effort: ['baseline-medium', 'constraints-v3', 'qwen38-medium'].includes(profile) ? 'medium' : 'low',
    include_reasoning: false,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ai_assistant_message_v1',
        strict: true,
        schema: {
          type: 'object',
          properties: { schemaVersion: { type: 'string', enum: ['ai_assistant_message_v1'] },
            message: { type: 'string' } },
          required: ['schemaVersion', 'message'],
          additionalProperties: false,
        },
      },
    },
  });
}
const permittedBodies = Object.fromEntries(Object.entries(profileMessages)
  .map(([profile, items]) => [profile, new Set(items.map(messages => requestBody(JSON.parse(messages), profile)))]));

export function loadGroqCases() {
  const cases = loadCases().cases.filter(item => item.track === 'current-prompt');
  if (cases.length !== 24 || cases.some((item, index) => item.id !== golden.cases[index].id)) {
    throw Error('GROQ_CORPUS_INVALID');
  }
  return cases;
}

/** Reuses the existing production-serializer capture, never a live model. */
export async function prepareGroqCase(id, profile = 'baseline') {
  checkedProfile(profile);
  const cases = loadGroqCases(), index = cases.findIndex(item => item.id === id);
  if (index < 0) throw Error('GROQ_CASE_INVALID');
  const prepared = await prepareCase(cases[index]);
  const messages = [{ role: 'system', content: prepared.prompt.system },
    ...prepared.prompt.turns.map(turn => ({ role: turn.role, content: turn.text }))];
  // Every profile is derived from the exact same original case capture.
  if (JSON.stringify(messages) !== goldenMessages[index]) throw Error('GROQ_CORPUS_INVALID');
  if (!['goal-v2', 'constraints-v3'].includes(profile)) return prepared;
  const candidate = profile === 'constraints-v3' ? constraintsPromptCandidate : goalPromptCandidate;
  return { ...prepared, prompt: { ...prepared.prompt, system: candidateMessages(goldenMessages[index], candidate)[0].content } };
}

export function buildGroqRequest(prompt, profile = 'baseline') {
  checkedProfile(profile);
  if (!record(prompt) || prompt.scope !== 'synthetic-evaluation-only' || typeof prompt.system !== 'string' ||
      !Array.isArray(prompt.turns)) throw Error('GROQ_INPUT_INVALID');
  const messages = [{ role: 'system', content: prompt.system },
    ...prompt.turns.map(turn => ({ role: turn?.role, content: turn?.text }))];
  if (!permittedMessages[profile].has(JSON.stringify(messages))) throw Error('GROQ_INPUT_INVALID');
  return Object.freeze({ url: groqEndpoint, body: requestBody(messages, profile) });
}

/** Only an explicit caller may provide credentials and an HTTP implementation.
 * URL and bodies are restricted to the 24 golden cases under the selected
 * profile. Selecting a profile does not itself authorize any provider call. */
export function createGroqHttp(apiKey, fetchImplementation, profile = 'baseline') {
  checkedProfile(profile);
  if (typeof apiKey !== 'string' || !/^[\x21-\x7e]{1,512}$/u.test(apiKey)) throw Error('GROQ_KEY_REQUIRED');
  if (typeof fetchImplementation !== 'function') throw Error('GROQ_HTTP_REQUIRED');
  const http = async (request, signal) => {
    if (!record(request) || request.url !== groqEndpoint || !permittedBodies[profile].has(request.body) ||
        !signal || typeof signal.aborted !== 'boolean') throw Error('GROQ_REQUEST_FORBIDDEN');
    try {
      return await fetchImplementation(groqEndpoint, { method: 'POST', redirect: 'error', cache: 'no-store', signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: request.body });
    } catch { throw Error('GROQ_NETWORK_UNCONFIRMED'); }
  };
  secrets.set(http, apiKey);
  return http;
}

/** One request only. Delivery cancellation revokes eligibility, but does not
 * pretend that the provider stopped. An unconfirmed result requires the caller
 * to stop; this module never retries, falls back, or starts another case. */
export async function observeGroq(prompt, http, options = {}) {
  const now = options.now ?? (() => performance.now());
  const started = now();
  const deliveryMs = options.deliveryMs ?? maxDeliveryMs;
  const receiveMs = options.receiveMs ?? maxReceiveMs;
  const current = () => Math.max(0, now() - started);
  const base = () => ({ provider: 'groq-candidate', elapsedMs: current(),
    withinDeliveryDeadline: current() < deliveryMs && !options.signal?.aborted });
  const result = observation => ({ observation, protocol: protocolAssessment(observation) });
  if (options.signal?.aborted) return result({ ...base(), outcome: 'not-started', physicallySettled: false,
    withinDeliveryDeadline: false, failure: 'cancelled' });
  let request;
  try {
    if (typeof http !== 'function' || !Number.isFinite(started) || !Number.isSafeInteger(deliveryMs) ||
        deliveryMs < 1 || deliveryMs > maxDeliveryMs || !Number.isSafeInteger(receiveMs) ||
        receiveMs < deliveryMs || receiveMs > maxReceiveMs) throw Error();
    request = buildGroqRequest(prompt, options.profile === undefined ? 'baseline' : options.profile);
  } catch { return result({ ...base(), outcome: 'not-started', physicallySettled: false,
    withinDeliveryDeadline: false, failure: 'invalid-input' }); }

  const receive = new AbortController();
  let timer, reader, httpStatus;
  const unknown = failure => ({ ...base(), outcome: 'unconfirmed', physicallySettled: false, failure,
    ...(httpStatus === undefined ? {} : { httpStatus }) });
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => {
      receive.abort();
      if (reader) void reader.cancel().catch(() => {});
      resolve(unknown('network-or-receive'));
    }, receiveMs);
  });
  const operation = (async () => {
    try {
      // Recheck immediately before dispatch, after any caller-side scheduling.
      if (options.signal?.aborted) return { ...base(), outcome: 'not-started', physicallySettled: false,
        withinDeliveryDeadline: false, failure: 'cancelled' };
      const response = await http(request, receive.signal);
      httpStatus = response.status;
      if (!response.ok) {
        if (response.body) void response.body.cancel().catch(() => {});
        return unknown('http');
      }
      if (!response.body) return unknown('network-or-receive');
      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let raw = '', bytes = 0, complete = false;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) { complete = true; break; }
          if (!(part.value instanceof Uint8Array)) throw Error();
          bytes += part.value.byteLength;
          if (bytes > maxResponseBytes) throw Error();
          raw += decoder.decode(part.value, { stream: true });
        }
        raw += decoder.decode();
      } finally {
        if (!complete) void reader.cancel().catch(() => {});
        try { reader.releaseLock(); } catch { /* a still-pending read remains unconfirmed */ }
      }
      if (receive.signal.aborted || current() >= receiveMs) return unknown('network-or-receive');
      let envelope;
      try { envelope = JSON.parse(raw); } catch { return unknown('malformed'); }
      if (!record(envelope) || envelope.model !== groqModelForProfile(options.profile ?? 'baseline') || !Array.isArray(envelope.choices) ||
          envelope.choices.length !== 1 || !record(envelope.choices[0])) return unknown('malformed');
      const choice = envelope.choices[0], message = choice.message;
      if (choice.index !== 0 || !record(message) || message.role !== 'assistant' ||
          !['stop', 'length', 'tool_calls', 'function_call', 'content_filter'].includes(choice.finish_reason)) {
        return unknown('incomplete');
      }
      const usage = record(envelope.usage) ? envelope.usage : {};
      const details = record(usage.completion_tokens_details) ? usage.completion_tokens_details : {};
      const observation = { ...base(), outcome: 'response-observed', physicallySettled: true, httpStatus,
        modelRevision: groqModelForProfile(options.profile ?? 'baseline'), finishReason: choice.finish_reason,
        usage: { ...(count(usage.prompt_tokens) ? { inputTokens: usage.prompt_tokens } : {}),
          // Groq completion_tokens already includes any reasoning tokens.
          ...(count(usage.completion_tokens) ? { outputTokens: usage.completion_tokens } : {}),
          ...(count(details.reasoning_tokens) ? { thinkingTokens: details.reasoning_tokens } : {}),
          ...(count(usage.total_tokens) ? { totalTokens: usage.total_tokens } : {}) } };
      if (message.refusal != null || choice.finish_reason === 'content_filter') return { ...observation, failure: 'blocked' };
      // The provider response is untrusted; do not return a reflected API key,
      // including in an incomplete or otherwise ineligible answer.
      // A caller that wraps the credential-bearing HTTP client can pass the
      // key in options.secret for the same reflection guard; it is never
      // included in observations, errors, logs, or requests' JSON bodies.
      const secret = secrets.get(http) ?? (typeof options.secret === 'string' ? options.secret : undefined);
      if (reflectsSecret(message.content, secret)) {
        return { ...observation, failure: 'credential-redacted' };
      }
      if (message.tool_calls != null || message.function_call != null || choice.finish_reason !== 'stop') {
        return { ...observation, ...(typeof message.content === 'string' ? { rawText: message.content } : {}), failure: 'incomplete' };
      }
      if (typeof message.content !== 'string') return { ...observation, failure: 'invalid-output' };
      observation.rawText = message.content;
      if (!protocolAssessment(observation).valid) observation.failure = 'invalid-output';
      return observation;
    } catch { return unknown('network-or-receive'); }
  })();
  try { return result(await Promise.race([operation, timeout])); }
  finally { clearTimeout(timer); }
}
