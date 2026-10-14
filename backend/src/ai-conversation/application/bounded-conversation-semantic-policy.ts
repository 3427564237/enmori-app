import type { ConversationGates, ConversationInput } from "../ports/conversation-lifecycle.js";
import type { OutputCandidate } from "../../ai-runtime/domain/parse-output.js";
import type { RequestBudget } from "../../ai-runtime/ports/generation-transport.js";
import { err, ok } from "../../shared/domain/result.js";

/** Internal implementation version, not a DTO, content fingerprint or readiness claim. */
export const boundedConversationSemanticPolicyVersion = "bounded_routine_summary_v1";

// Q31-C permits conservative concrete checks, with unknown/ambiguous output
// failing closed. This positive grammar recognizes only routine diary language;
// these words are NOT new Activity enums, product fields or a keyword blacklist.
// Unknown objects, names, numbers, locations, medical language and instructions
// cannot occupy an open slot. The entire source must match, never a substring.
const chineseRoutine = /^(?:我)?(?:今天|昨天|刚才|早上|上午|下午|晚上)?(?:散步|读书|阅读|画画|听音乐|写日记|整理房间|做饭|休息)(?:了)?[。.!]?$/u;
const englishAction = "(?:went for a walk|read a book|did some reading|drew a picture|listened to music|wrote in my journal|tidied my room|cooked a meal|rested)";
const englishRoutine = new RegExp(`^(?:I ${englishAction}(?: today| yesterday| this morning| this afternoon| this evening)?|(?:Today|Yesterday|This morning|This afternoon|This evening),? I ${englishAction})[.!]?$`, "u");

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const fields = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Reflect.ownKeys(value).every(key => typeof key === "string" && allowed.includes(key));
const text = (value: unknown): value is string => typeof value === "string" && value.isWellFormed();

function validInput(value: ConversationInput): boolean {
  if (!record(value) || !fields(value, ["currentMessage", "checkIns", "persona"]) ||
      !text(value.currentMessage) || !value.currentMessage || !Array.isArray(value.checkIns) || value.checkIns.length > 5) return false;
  // This increment is explicitly Note-only. An unexpected projected field is
  // not silently ignored, and unavailable/malformed context is not an empty set.
  for (const note of value.checkIns) {
    if (!record(note) || !fields(note, ["occurredAt", "noteText"]) ||
        !text(note.occurredAt) || !note.occurredAt || !text(note.noteText) || !note.noteText) return false;
  }
  const persona = value.persona;
  return persona === undefined || (record(persona) && fields(persona, ["schemaVersion", "tone", "responseLength", "formatStyle"]) &&
    persona.schemaVersion === "persona_presentation_v1" &&
    ["neutral", "warm", "encouraging"].includes(persona.tone) &&
    ["concise", "balanced", "detailed"].includes(persona.responseLength) &&
    ["plain", "bulleted"].includes(persona.formatStyle));
}

function routine(source: string): boolean {
  // No normalization, trimming, truncation, source repair or prompt rewriting.
  // JavaScript's $ can match before a final line terminator. Require the match
  // to consume the whole string as well, including Unicode line separators.
  const matched = chineseRoutine.exec(source) ?? englishRoutine.exec(source);
  return matched?.[0] === source;
}

function attributed(line: string, input: ConversationInput): boolean {
  for (const prefix of ["你提到：", "You mentioned: "]) {
    if (line.startsWith(prefix)) {
      const source = line.slice(prefix.length);
      return source === input.currentMessage && routine(source);
    }
  }
  for (const prefix of ["你的记录提到：", "Your check-in mentions: "]) {
    if (line.startsWith(prefix)) {
      const source = line.slice(prefix.length);
      return routine(source) && input.checkIns.some(note => source === note.noteText);
    }
  }
  return false;
}

function accepts(input: ConversationInput, output: OutputCandidate): boolean {
  if (!validInput(input) || !record(output) || !fields(output, ["schemaVersion", "message"]) ||
      output.schemaVersion !== "ai_assistant_message_v1" || !text(output.message) || !output.message ||
      [...output.message].length > 2400) return false;
  const lines = output.message.split("\n");
  if (lines.length === 1 && !lines[0]!.startsWith("- ")) return attributed(lines[0]!, input);
  // Textual bullets are presentation only, and require the captured authorized
  // Persona projection. No default style, arbitrary Markdown or extra footer.
  return input.persona?.formatStyle === "bulleted" &&
    lines.every(line => line.startsWith("- ") && attributed(line.slice(2), input));
}

function current(budget: RequestBudget): boolean {
  try {
    const remaining = budget.remainingMs();
    return budget.signal.aborted === false && Number.isFinite(budget.deadline) &&
      Number.isFinite(remaining) && remaining > 0;
  } catch { return false; }
}

function sameInput(first: ConversationInput, fresh: ConversationInput): boolean {
  if (!validInput(first) || !validInput(fresh) || first.currentMessage !== fresh.currentMessage ||
      first.checkIns.length !== fresh.checkIns.length) return false;
  if (!first.checkIns.every((note, index) => note.occurredAt === fresh.checkIns[index]!.occurredAt &&
      note.noteText === fresh.checkIns[index]!.noteText)) return false;
  const a = first.persona, b = fresh.persona;
  return a === undefined ? b === undefined : b !== undefined && a.schemaVersion === b.schemaVersion &&
    a.tone === b.tone && a.responseLength === b.responseLength && a.formatStyle === b.formatStyle;
}

/**
 * Q17/Q19/Q31-C: a conservative source-grounded summary candidate gate.
 * Only fixed attribution plus an exact, entirely recognized harmless routine
 * statement may pass. It never accepts arbitrary quoted text or checks a
 * fixture identifier. A finite language means safe free-form paraphrases can
 * be rejected; this is not universal natural-language grounding or Q31-E Release
 * proof. Auth/source/deletion revalidation and real token/model checks remain
 * their existing independent boundaries; no second model validates this gate.
 *
 * All content is borrowed synchronously. Only a content-free Result is returned;
 * no input, output, cache, log, fingerprint or promise continuation retains it.
 */
export const boundedConversationSemanticCandidate: ConversationGates["candidate"] = (input, output, budget) => {
  if (!current(budget)) return Promise.resolve(err("stale_authority"));
  try {
    const projection = input(), candidate = output();
    if (projection === undefined || candidate === undefined || !current(budget)) return Promise.resolve(err("stale_authority"));
    const accepted = accepts(projection, candidate);
    // The Application creates fresh projection objects on each read, so check
    // their values rather than introducing an object-identity prerequisite.
    const freshProjection = input(), freshCandidate = output();
    if (freshProjection === undefined || freshCandidate === undefined || !current(budget)) return Promise.resolve(err("stale_authority"));
    if (!accepted) return Promise.resolve(err("unsafe_output"));
    if (!sameInput(projection, freshProjection) || candidate.schemaVersion !== freshCandidate.schemaVersion ||
        candidate.message !== freshCandidate.message) return Promise.resolve(err("stale_authority"));
    return Promise.resolve(ok(undefined));
  } catch { return Promise.resolve(err("stale_authority")); }
};
