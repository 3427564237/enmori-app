import type { PersonaInput } from "../application/persona-model.js";

export const personaExpressionFields = ["relationship", "shortIntroduction", "description", "personality", "communicationStyle", "interests", "extraInstructions"] as const;
export type UnknownPersonaInput = { readonly [K in keyof PersonaInput]?: unknown };

export function isPersonaId(value: unknown): value is string {
  return typeof value === "string" && value.length === 64 && /^[0-9a-f]{64}$/.test(value);
}

export function isPersonaCreateKey(value: unknown): value is string {
  return typeof value === "string" && value.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

export function isStateRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isPersonaRevision(value: unknown): value is number {
  return isStateRevision(value) && value >= 1;
}

export function normalizePersonaInput(input: UnknownPersonaInput): PersonaInput | undefined {
  if (typeof input.displayName !== "string" || !input.displayName.isWellFormed()) return undefined;
  const displayName = input.displayName.trim();
  const length = [...displayName].length;
  if (length < 1 || length > 50 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(displayName) ||
    (input.tone !== "neutral" && input.tone !== "warm" && input.tone !== "encouraging") ||
    (input.responseLength !== "concise" && input.responseLength !== "balanced" && input.responseLength !== "detailed") ||
    (input.formatStyle !== "plain" && input.formatStyle !== "bulleted")) return undefined;
  const expression: Record<string, string> = {};
  for (const field of personaExpressionFields) {
    const value = input[field];
    if (Object.hasOwn(input, field) && (typeof value !== "string" || !value.isWellFormed())) return undefined;
    expression[field] = value === undefined ? "" : value as string;
  }
  return { displayName, tone: input.tone, responseLength: input.responseLength, formatStyle: input.formatStyle, ...expression };
}

export function samePersonaInput(a: PersonaInput, b: PersonaInput): boolean {
  return a.displayName === b.displayName && a.tone === b.tone &&
    a.responseLength === b.responseLength && a.formatStyle === b.formatStyle &&
    personaExpressionFields.every(field => (a[field] ?? "") === (b[field] ?? ""));
}
