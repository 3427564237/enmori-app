import { errorEnvelopeSchema } from "../../transport/schemas.js";

const visibility = { type: "string", enum: ["private", "friends_only", "public"] } as const;
const revision = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const name = { type: ["string", "null"] } as const;
export const profileSchema = {
  type: "object", additionalProperties: false, required: ["username", "displayName", "profileVisibility", "revision"],
  properties: { username: { type: "string" }, displayName: name, profileVisibility: visibility, revision },
} as const;
export const settingsSchema = {
  type: "object", additionalProperties: false, required: ["checkInVisibility", "optionalProcessingConsent", "revision"],
  properties: { checkInVisibility: visibility, optionalProcessingConsent: { type: "string", enum: ["accepted", "rejected"] }, revision },
} as const;
export const saveProfileBody = {
  type: "object", additionalProperties: false, required: ["displayName", "profileVisibility", "expectedRevision"],
  properties: { displayName: name, profileVisibility: visibility, expectedRevision: revision },
} as const;
export const saveSettingsBody = {
  type: "object", additionalProperties: false, required: ["checkInVisibility", "optionalProcessingConsent", "expectedRevision"],
  properties: { checkInVisibility: visibility, optionalProcessingConsent: settingsSchema.properties.optionalProcessingConsent, expectedRevision: revision },
} as const;
const response = (key: string, resource: unknown, write: boolean) => Object.fromEntries([
  [200, { type: "object", additionalProperties: false, required: [key], properties: { [key]: resource } }],
  ...(write ? [400, 401, 403, 409, 412, 422, 503] : [400, 401, 403, 409, 503]).map((status) => [status, errorEnvelopeSchema]),
]);
const noQuery = { type: "object", additionalProperties: false, properties: {} };
export const getProfileSchema = { querystring: noQuery, response: response("profile", profileSchema, false) };
export const getSettingsSchema = { querystring: noQuery, response: response("settings", settingsSchema, false) };
export const putProfileSchema = { querystring: noQuery, body: saveProfileBody, response: response("profile", profileSchema, true) };
export const putSettingsSchema = { querystring: noQuery, body: saveSettingsBody, response: response("settings", settingsSchema, true) };
