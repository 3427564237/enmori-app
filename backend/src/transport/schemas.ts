import type { FastifySchema } from "fastify";
import { positionSchema, weatherRequestSchema, weatherProjectionSchema } from "../weather/transport/schemas.js";

export const approvedFailureCodes = [
  "EVENT_PARTICIPATION_INVALID",
  "EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED",
  "FRIEND_IGNORE_PRECONDITION_FAILED",
  "FRIEND_REVISION_PRECONDITION_FAILED",
  "CATALOGUE_INVALID",
  "CATALOGUE_NAME_CONFLICT",
  "PERSONA_INVALID",
  "PERSONA_UNAVAILABLE",
  "PERSONA_LIMIT_REACHED",
  "PERSONA_COMMAND_CONFLICT",
  "PERSONA_REVISION_PRECONDITION_FAILED",
  "ADD_FRIEND_TARGET_UNAVAILABLE",
  "FRIEND_REQUEST_UNAVAILABLE",
  "EVENT_UNAVAILABLE",
  "PROFILE_INVALID",
  "PROFILE_REVISION_PRECONDITION_FAILED",
  "SETTINGS_INVALID",
  "SETTINGS_REVISION_PRECONDITION_FAILED",
  "REQUEST_INVALID",
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "USERNAME_INVALID",
  "USERNAME_UNAVAILABLE",
  "ONBOARDING_REQUIRED",
  "ONBOARDING_CONFLICT",
  "CHECKIN_INVALID",
  "CHECKIN_UNAVAILABLE",
  "INTEREST_SELECTION_INVALID",
  "INTEREST_REVISION_PRECONDITION_FAILED",
  "IDEMPOTENCY_KEY_INVALID",
  "IDEMPOTENCY_CONFLICT",
  "SERVICE_UNAVAILABLE",
] as const;

const utcTimestamp = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$",
} as const;

export const accountSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "username",
    "optionalProcessingConsent",
    "checkInVisibility",
    "onboardingCompletedAt",
  ],
  properties: {
    username: { type: "string" },
    optionalProcessingConsent: {
      type: "string",
      enum: ["accepted", "rejected"],
    },
    checkInVisibility: { type: "string", enum: ["public", "private", "friends_only"] },
    onboardingCompletedAt: utcTimestamp,
  },
} as const;

export const checkInSchema = {
  type: "object",
  additionalProperties: false,
  required: ["checkInId", "note", "createdAt"],
  properties: {
    location:positionSchema,weather:weatherProjectionSchema,
    checkInVisibility: { type: "string", enum: ["private", "friends_only", "public"] },
    mood: { type: "string", minLength: 1, maxLength: 50 },
    activity: { type: "string", minLength: 1, maxLength: 50 },
    revision: { type: "integer", minimum: 1 },
    checkInId: { type: "string", minLength: 1 },
    note: { type: "string" },
    createdAt: utcTimestamp,
  },
} as const;

export const interestTagSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["interestTagId", "displayName"],
  properties: {
    interestTagId: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
  },
} as const;

export const selectedInterestTagSchema = {
  type: "object",
  additionalProperties: false,
  required: ["interestTagId", "displayName", "lifecycleState"],
  properties: {
    ...interestTagSummarySchema.properties,
    lifecycleState: { type: "string", enum: ["active", "inactive"] },
  },
} as const;

export const ownInterestsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["interestTags", "revision"],
  properties: {
    interestTags: {
      type: "array",
      maxItems: 10,
      items: selectedInterestTagSchema,
    },
    revision: { type: "integer", minimum: 0 },
  },
} as const;

export const errorEnvelopeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: {
    error: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message", "requestId"],
      properties: {
        code: { type: "string", enum: approvedFailureCodes },
        message: { type: "string", minLength: 1 },
        requestId: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

const commandHeaders = {
  type: "object",
  required: ["idempotency-key"],
  properties: {
    "idempotency-key": {
      type: "string",
      pattern: "^[A-Za-z0-9_-]{22,64}$",
    },
  },
} as const;

const onboardingBody = {
  type: "object",
  additionalProperties: false,
  required: ["username", "initialChoice"],
  properties: {
    username: { type: "string" },
    initialChoice: { type: "string", enum: ["accept", "reject"] },
  },
} as const;

const checkInBody = {
  type: "object",
  additionalProperties: false,
  required: ["note"],
  properties: {
    location:{anyOf:[positionSchema,{type:"null"}]},weatherRequest:weatherRequestSchema,
    mood: { anyOf: [{ type: "string", maxLength: 50 }, {type:"null"}] },
    activity: { anyOf: [{ type: "string", maxLength: 50 }, {type:"null"}] },
    checkInVisibility: {type:"string",enum:["private","friends_only","public"]},
    note: { type: "string" },
  },
} as const;

const checkInParams = {
  type: "object",
  additionalProperties: false,
  required: ["checkInId"],
  properties: {
    checkInId: { type: "string", minLength: 1 },
  },
} as const;

const accountEnvelope = {
  type: "object",
  additionalProperties: false,
  required: ["account"],
  properties: { account: accountSchema },
} as const;

const onboardingStatus = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["status"],
      properties: { status: { const: "required" } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["status", "account"],
      properties: {
        status: { const: "completed" },
        account: accountSchema,
      },
    },
  ],
} as const;

const checkInEnvelope = {
  type: "object",
  additionalProperties: false,
  required: ["checkIn"],
  properties: { checkIn: checkInSchema, notice:{const:"Check-in saved without weather."} },
} as const;

const checkInHistoryQuery = {
  type: "object",
  additionalProperties: false,
  required: ["date", "timeZone"],
  properties: {
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    timeZone: { type: "string", minLength: 1, maxLength: 128 },
    cursor: { type: "string", minLength: 1, maxLength: 4096 },
  },
} as const;

const checkInHistoryEnvelope = {
  type: "object",
  additionalProperties: false,
  required: ["checkIns", "nextCursor"],
  properties: {
    checkIns: { type: "array", maxItems: 20, items: checkInSchema },
    nextCursor: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
  },
} as const;

const interestTagListEnvelope = {
  type: "object",
  additionalProperties: false,
  required: ["interestTags"],
  properties: {
    interestTags: { type: "array", items: interestTagSummarySchema },
  },
} as const;

const ownInterestsEnvelope = {
  type: "object",
  additionalProperties: false,
  required: ["interests"],
  properties: { interests: ownInterestsSchema },
} as const;

const replaceOwnInterestsBody = {
  type: "object",
  additionalProperties: false,
  required: ["interestTagIds", "expectedRevision"],
  properties: {
    interestTagIds: {
      type: "array",
      maxItems: 10,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    expectedRevision: { type: "integer", minimum: 0 },
  },
} as const;

const withErrors = (
  success: Record<number, unknown>,
  statuses: readonly number[],
) => Object.fromEntries([
  ...Object.entries(success),
  ...statuses.map((status) => [status, errorEnvelopeSchema]),
]);

export const completeOnboardingSchema = {
  headers: commandHeaders,
  body: onboardingBody,
  response: withErrors(
    { 200: accountEnvelope, 201: accountEnvelope },
    [400, 401, 403, 409, 503],
  ),
} satisfies FastifySchema;

export const getOnboardingSchema = {
  response: withErrors({ 200: onboardingStatus }, [401, 403, 503]),
} satisfies FastifySchema;

export const createCheckInSchema = {
  headers: commandHeaders,
  body: checkInBody,
  response: withErrors(
    { 200: checkInEnvelope, 201: checkInEnvelope },
    [400, 401, 403, 409, 503],
  ),
} satisfies FastifySchema;

export const getCheckInSchema = {
  params: checkInParams,
  response: withErrors({ 200: checkInEnvelope }, [401, 403, 404, 409, 503]),
} satisfies FastifySchema;

export const getCheckInHistorySchema = {
  querystring: checkInHistoryQuery,
  response: withErrors({ 200: checkInHistoryEnvelope }, [400, 401, 403, 409, 503]),
} satisfies FastifySchema;

export const getInterestTagsSchema = {
  response: withErrors({ 200: interestTagListEnvelope }, [401, 403, 409, 503]),
} satisfies FastifySchema;

export const getOwnInterestsSchema = {
  response: withErrors({ 200: ownInterestsEnvelope }, [401, 403, 409, 503]),
} satisfies FastifySchema;

export const replaceOwnInterestsSchema = {
  body: replaceOwnInterestsBody,
  response: withErrors(
    { 200: ownInterestsEnvelope },
    [401, 403, 409, 412, 422, 503],
  ),
} satisfies FastifySchema;
