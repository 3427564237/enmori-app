import { err, ok, type Result } from "../../shared/domain/result.js";

export type OutputPurpose = "ai_assistant_message_v1" | "recommendation_explanation_v1";

/** Structurally checked text only: NOT semantic, authority or delivery approval. */
export interface OutputCandidate {
  readonly schemaVersion: OutputPurpose;
  readonly message: string;
}

// LF is permitted for Q31 textual bullets. Other C0/C1 and bidi controls fail.
const prohibitedCharacters = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const markupOrObject = /<\/?[a-z][^>]*>|<!|<\?|```|~~~|[{}]|\[[^\]]*\]\s*\(|!\[|\[\s*[\["]/iu;
const url = /\b[a-z][a-z0-9+.-]*:\/\/|\b(?:https?|mailto|tel|data|javascript):|\bwww\.|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\b|\b(?:\d{1,3}\.){3}\d{1,3}\b/iu;
// Recognizable executable/tool syntax only. Natural-language semantic policy
// is explicitly outside this parser and must never be inferred from this list.
const toolSyntax = /\b(?:functions|tools)\s*\.\s*\w+\s*\(|\b(?:tool_call|tool_calls|function_call)\s*[:=(]|<\|[^>]*\|>/iu;

/**
 * Parse the exact Q31 grammar directly from raw bytes. Values can only be
 * strings: nested objects/arrays (including any nested duplicate) are rejected
 * before materialization, not handed to a duplicate-losing object parser.
 */
export function parseOutput(raw: Uint8Array, purpose: OutputPurpose): Result<OutputCandidate, "invalid_output"> {
  if (purpose !== "ai_assistant_message_v1" && purpose !== "recommendation_explanation_v1") return err("invalid_output");
  try {
    // Preserve BOM so it fails the JSON grammar; fatal decoding rejects bad UTF-8.
    const source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
    let offset = 0;
    const space = (): void => { while (/[\x20\t\r\n]/u.test(source[offset] ?? "!")) offset++; };
    const take = (character: string): void => {
      space();
      if (source[offset++] !== character) throw new Error();
    };
    const string = (): string => {
      space();
      const start = offset;
      if (source[offset++] !== '"') throw new Error();
      while (offset < source.length) {
        const character = source[offset++];
        if (character === "\\") { offset++; continue; }
        if (character === '"') {
          const value: unknown = JSON.parse(source.slice(start, offset));
          if (typeof value !== "string" || !value.isWellFormed()) throw new Error();
          return value;
        }
      }
      throw new Error();
    };
    take("{");
    const fields = new Map<string, string>();
    space();
    if (source[offset] !== "}") {
      while (true) {
        const key = string();
        if (fields.has(key) || (key !== "schemaVersion" && key !== "message")) throw new Error();
        take(":");
        fields.set(key, string());
        space();
        if (source[offset] !== ",") break;
        offset++;
      }
    }
    take("}");
    space();
    if (offset !== source.length || fields.size !== 2 || fields.get("schemaVersion") !== purpose) return err("invalid_output");
    const untrimmed = fields.get("message");
    if (untrimmed === undefined || prohibitedCharacters.test(untrimmed)) return err("invalid_output");
    const message = untrimmed.trim();
    const maximum = purpose === "ai_assistant_message_v1" ? 2400 : 800;
    if (!message || [...message].length > maximum || markupOrObject.test(message) || url.test(message) || toolSyntax.test(message)) return err("invalid_output");
    return ok(Object.freeze({ schemaVersion: purpose, message }));
  } catch {
    return err("invalid_output");
  }
}
