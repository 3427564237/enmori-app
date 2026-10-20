import { errorEnvelopeSchema } from "../../transport/schemas.js";
import { personaExpressionFields } from "../domain/persona-values.js";

export const personaIdSchema = { type: "string", minLength: 64, maxLength: 64, pattern: "^[0-9a-f]{64}$" } as const;
export const personaCreateKeySchema = {
  type: "string", minLength: 36, maxLength: 36, pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
} as const;
const ownerRevision = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const targetRevision = { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER } as const;
const name = {
  type: "string",
  description: "Well-formed Unicode; ECMAScript trim, then 1–50 Unicode scalar values. Reject remaining Cc, Cf, Zl and Zp characters. Preserve internal spacing; no composition normalization or uniqueness requirement.",
} as const;
export const personaEditableProperties = {
  displayName: name,
  tone: { type: "string", enum: ["neutral", "warm", "encouraging"] },
  responseLength: { type: "string", enum: ["concise", "balanced", "detailed"] },
  formatStyle: { type: "string", enum: ["plain", "bulleted"] },
  ...Object.fromEntries(personaExpressionFields.map(field => [field, { type: "string", description: "Optional expression-only free text; omitted legacy values read as an empty string. Well-formed Unicode, preserved verbatim; no data-access authority." }])),
} as const;
const timestamp = {
  type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
  description: "Backend UTC timestamp representing a real instant.",
} as const;
export const personaViewSchema = {
  type: "object", additionalProperties: false,
  required: ["personaId", "displayName", "tone", "responseLength", "formatStyle", ...personaExpressionFields, "createdAt", "updatedAt", "revision"],
  properties: { personaId: personaIdSchema, ...personaEditableProperties, createdAt: timestamp, updatedAt: timestamp, revision: targetRevision },
} as const;
export const personaSetSchema = {
  type: "object", additionalProperties: false, required: ["items", "stateRevision"],
  properties: {
    items: { type: "array", maxItems: 5, items: personaViewSchema },
    stateRevision: ownerRevision, activePersonaId: personaIdSchema,
  },
  description: "One coherent transaction snapshot; items ordered by createdAt ascending, then ordinal personaId. An optional activePersonaId names an item in this set.",
} as const;
export const personaEnvelopeSchema = {
  type: "object", additionalProperties: false, required: ["persona", "stateRevision"],
  properties: { persona: personaViewSchema, stateRevision: ownerRevision },
} as const;
export const personasEnvelopeSchema = {
  type: "object", additionalProperties: false, required: ["personas"], properties: { personas: personaSetSchema },
} as const;
export const createPersonaBody = {
  type: "object", additionalProperties: false,
  required: ["displayName", "tone", "responseLength", "formatStyle", "expectedStateRevision"],
  properties: { ...personaEditableProperties, expectedStateRevision: ownerRevision },
} as const;
export const editPersonaBody = {
  type: "object", additionalProperties: false,
  required: [...createPersonaBody.required, "expectedRevision"],
  properties: { ...createPersonaBody.properties, expectedRevision: targetRevision },
} as const;
export const activatePersonaBody = {
  type: "object", additionalProperties: false, required: ["personaId", "expectedRevision", "expectedStateRevision"],
  properties: { personaId: personaIdSchema, expectedRevision: targetRevision, expectedStateRevision: ownerRevision },
} as const;
export const deletePersonaBody = {
  type: "object", additionalProperties: false, required: ["expectedRevision", "expectedStateRevision"],
  properties: { expectedRevision: targetRevision, expectedStateRevision: ownerRevision },
} as const;
export const personaPathSchema = {
  type: "object", additionalProperties: false, required: ["personaId"], properties: { personaId: personaIdSchema },
} as const;
const noQuery = { type: "object", additionalProperties: false, properties: {} } as const;
const failures = (statuses: readonly number[]) => Object.fromEntries(statuses.map(status => [status, errorEnvelopeSchema]));
const readErrors = [400, 401, 403, 409, 503];
const mutationErrors = [400, 401, 403, 409, 412, 422, 503];
export const listPersonasSchema = { querystring: noQuery, response: { 200: personasEnvelopeSchema, ...failures(readErrors) } };
export const getPersonaSchema = { querystring: noQuery, params: personaPathSchema, response: { 200: personaEnvelopeSchema, ...failures([...readErrors, 404]) } };
export const createPersonaSchema = { querystring: noQuery, headers: { type: "object", required: ["idempotency-key"], properties: { "idempotency-key": personaCreateKeySchema } }, body: createPersonaBody, response: { 200: personaEnvelopeSchema, 201: personaEnvelopeSchema, ...failures(mutationErrors) } };
export const editPersonaSchema = { querystring: noQuery, params: personaPathSchema, body: editPersonaBody, response: { 200: personaEnvelopeSchema, ...failures([...mutationErrors, 404]) } };
export const activatePersonaSchema = { querystring: noQuery, body: activatePersonaBody, response: { 200: personasEnvelopeSchema, ...failures([...mutationErrors, 404]) } };
export const deletePersonaSchema = { querystring: noQuery, params: personaPathSchema, body: deletePersonaBody, response: { ...failures(mutationErrors) } };
