import type { PersonaInput } from "../../personas/application/persona-model.js";
import { normalizePersonaInput, personaExpressionFields } from "../../personas/domain/persona-values.js";
import type { PersonaProjection } from "../ports/conversation-lifecycle.js";

const baseFields = ["schemaVersion", "tone", "responseLength", "formatStyle"];
const editableFields = ["displayName", "tone", "responseLength", "formatStyle", ...personaExpressionFields];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const dataFields = (value: object, allowed: readonly string[]) => Reflect.ownKeys(value).every(key =>
  typeof key === "string" && allowed.includes(key) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key) ?? {}, "value"));

/** A copied expression is data, never a tool, lookup request, identity or authorization claim. */
export function copyPersonaExpression(value: unknown): PersonaInput | undefined {
  if (!record(value) || !dataFields(value, editableFields) ||
      !["displayName", "tone", "responseLength", "formatStyle"].every(key => Object.hasOwn(value, key))) return undefined;
  const normalized = normalizePersonaInput(value);
  return normalized ? Object.freeze(normalized) : undefined;
}

export function copyPersonaProjection(value: unknown): PersonaProjection | undefined {
  if (!record(value) || !baseFields.every(key => Object.hasOwn(value, key)) ||
      !dataFields(value, [...baseFields, "expression"]) ||
      value.schemaVersion !== "persona_presentation_v1" ||
      !["neutral", "warm", "encouraging"].includes(value.tone as string) ||
      !["concise", "balanced", "detailed"].includes(value.responseLength as string) ||
      !["plain", "bulleted"].includes(value.formatStyle as string)) return undefined;
  const expression = Object.hasOwn(value, "expression") ? copyPersonaExpression(value.expression) : undefined;
  if (Object.hasOwn(value, "expression") && !expression) return undefined;
  if (expression && (expression.tone !== value.tone || expression.responseLength !== value.responseLength || expression.formatStyle !== value.formatStyle)) return undefined;
  return Object.freeze({ schemaVersion: "persona_presentation_v1", tone: value.tone as PersonaProjection["tone"],
    responseLength: value.responseLength as PersonaProjection["responseLength"], formatStyle: value.formatStyle as PersonaProjection["formatStyle"],
    ...(expression ? { expression } : {}) });
}

export function personaExpressionProjection(input: PersonaInput): PersonaProjection {
  const expression = copyPersonaExpression(input);
  if (!expression) throw new Error("Invalid Persona expression");
  return Object.freeze({ schemaVersion: "persona_presentation_v1", tone: expression.tone,
    responseLength: expression.responseLength, formatStyle: expression.formatStyle, expression });
}
