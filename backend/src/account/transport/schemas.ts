import { errorEnvelopeSchema } from "../../transport/schemas.js";
import { AVATAR_MAX_BASE64_LENGTH } from "../domain/avatar-values.js";

const visibility = { type: "string", enum: ["private", "friends_only", "public"] } as const;
const revision = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const name = { type: ["string", "null"] } as const;
export const profileDetailsSchema = {
  type: "object", additionalProperties: false, required: ["bio", "affiliationType", "affiliationName", "region"],
  properties: { bio: name, affiliationType: { enum: ["school", "company", null] }, affiliationName: name, region: name },
} as const;
export const fieldPrivacySchema = {
  type: "object", additionalProperties: false, required: ["interests", "location", "participation", "mapSharedWithFriends"],
  properties: { interests: visibility, location: visibility, participation: visibility, mapSharedWithFriends: { type: "boolean" } },
} as const;
export const profileSchema = {
  type: "object", additionalProperties: false, required: ["username", "displayName", "profileVisibility", "revision"],
  properties: { details: profileDetailsSchema, username: { type: "string" }, displayName: name, profileVisibility: visibility, revision },
} as const;
export const cloudAiConsentSchema = { type: "object", additionalProperties: false,
  required: ["state", "disclosureVersion"], properties: {
    state: { type: "string", enum: ["accepted", "declined"] },
    disclosureVersion: { type: "string", enum: ["groq_cloud_v1"] },
  } } as const;
export const settingsSchema = {
  type: "object", additionalProperties: false, required: ["checkInVisibility", "optionalProcessingConsent", "revision"],
  properties: { cloudAiConsent: cloudAiConsentSchema, defaultCheckInLocation: { type: "boolean" }, defaultCheckInWeather: { type: "boolean" }, homeWeatherAuto: { type: "boolean" }, fieldPrivacy: fieldPrivacySchema, checkInVisibility: visibility, optionalProcessingConsent: { type: "string", enum: ["accepted", "rejected"] }, revision },
} as const;
export const saveProfileBody = {
  type: "object", additionalProperties: false, required: ["displayName", "profileVisibility", "expectedRevision"],
  properties: { details: profileDetailsSchema, displayName: name, profileVisibility: visibility, expectedRevision: revision },
} as const;
export const saveSettingsBody = {
  type: "object", additionalProperties: false, required: ["checkInVisibility", "optionalProcessingConsent", "expectedRevision"],
  properties: { cloudAiConsent: cloudAiConsentSchema, defaultCheckInLocation: { type: "boolean" }, defaultCheckInWeather: { type: "boolean" }, homeWeatherAuto: { type: "boolean" }, fieldPrivacy: fieldPrivacySchema, checkInVisibility: visibility, optionalProcessingConsent: settingsSchema.properties.optionalProcessingConsent, expectedRevision: revision },
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
export const avatarSchema = {
  type: "object", additionalProperties: false, required: ["pngBase64", "sourceSha256", "revision"],
  properties: {
    pngBase64: { type: ["string", "null"], maxLength: AVATAR_MAX_BASE64_LENGTH },
    sourceSha256: { type: ["string", "null"], pattern: "^[0-9a-f]{64}$" }, revision,
  },
} as const;
export const saveAvatarBody = {
  type: "object", additionalProperties: false, required: ["pngBase64", "expectedRevision"],
  properties: { pngBase64: avatarSchema.properties.pngBase64, expectedRevision: revision },
} as const;
export const getAvatarSchema = { querystring: noQuery, response: response("avatar", avatarSchema, false) };
export const putAvatarSchema = { querystring: noQuery, body: saveAvatarBody, response: response("avatar", avatarSchema, true) };

export const sharedAvatarSchema = { ...avatarSchema,
  required: [...avatarSchema.required, "visibleToAuthenticatedUsers"],
  properties: { ...avatarSchema.properties, visibleToAuthenticatedUsers: { type: "boolean" } } };
export const getSharedAvatarSchema = { querystring: noQuery, response: response("avatar", sharedAvatarSchema, false) };
export const putSharedAvatarSchema = { querystring: noQuery,
  body: { ...saveAvatarBody, required: [...saveAvatarBody.required, "visibleToAuthenticatedUsers"],
    properties: { ...saveAvatarBody.properties, visibleToAuthenticatedUsers: { type: "boolean" } } },
  response: response("avatar", sharedAvatarSchema, true) };
export const getVisibleAvatarSchema = { querystring: noQuery,
  params: { type: "object", additionalProperties: false, required: ["username"], properties: { username: { type: "string", maxLength: 64 } } },
  response: response("avatar", { type: "object", additionalProperties: false, required: ["pngBase64", "sourceSha256"],
    properties: { pngBase64: avatarSchema.properties.pngBase64, sourceSha256: avatarSchema.properties.sourceSha256 } }, false) };
