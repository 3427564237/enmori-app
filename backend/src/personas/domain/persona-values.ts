import type { PersonaInput } from "../application/persona-model.js";

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

export function normalizePersonaInput(input: {
  readonly displayName: unknown;
  readonly tone: unknown;
  readonly responseLength: unknown;
  readonly formatStyle: unknown;
}): PersonaInput | undefined {
  if (typeof input.displayName !== "string" || !input.displayName.isWellFormed()) return undefined;
  const displayName = input.displayName.trim();
  const length = [...displayName].length;
  if (length < 1 || length > 50 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(displayName) ||
    (input.tone !== "neutral" && input.tone !== "warm" && input.tone !== "encouraging") ||
    (input.responseLength !== "concise" && input.responseLength !== "balanced" && input.responseLength !== "detailed") ||
    (input.formatStyle !== "plain" && input.formatStyle !== "bulleted")) return undefined;
  return { displayName, tone: input.tone, responseLength: input.responseLength, formatStyle: input.formatStyle };
}

export function samePersonaInput(a: PersonaInput, b: PersonaInput): boolean {
  return a.displayName === b.displayName && a.tone === b.tone &&
    a.responseLength === b.responseLength && a.formatStyle === b.formatStyle;
}
