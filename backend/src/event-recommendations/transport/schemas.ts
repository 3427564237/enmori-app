import type { FastifySchema } from "fastify";
import { errorEnvelopeSchema } from "../../transport/schemas.js";

const utc = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?Z$" } as const;
const matchedInterest = {
  type: "object", additionalProperties: false, required: ["interestTagId", "displayName"],
  properties: { interestTagId: { type: "string", minLength: 1 }, displayName: { type: "string", minLength: 1 } },
} as const;
export const eventRecommendationItemSchema = {
  type: "object", additionalProperties: false,
  required: ["eventId", "title", "startAt", "matchedInterests", "reasonCode"],
  properties: {
    eventId: { type: "string", minLength: 1 }, title: { type: "string", minLength: 1 },
    startAt: utc, endAt: utc,
    matchedInterests: { type: "array", minItems: 1, items: matchedInterest },
    reasonCode: { type: "string", const: "interest_match" },
  },
} as const;
export const eventRecommendationsSchema = {
  type: "object", additionalProperties: false, required: ["asOf", "formulaVersion", "items"],
  properties: { asOf: utc, formulaVersion: { type: "string", const: "event_recommendation_v1" },
    items: { type: "array", items: eventRecommendationItemSchema } },
} as const;
export const recommendEventsSchema = {
  querystring: { type: "object", additionalProperties: false, required: ["view"],
    properties: { view: { type: "string", enum: ["home", "all"] } } },
  response: { 200: eventRecommendationsSchema, 400: errorEnvelopeSchema,
    401: errorEnvelopeSchema, 403: errorEnvelopeSchema, 409: errorEnvelopeSchema, 503: errorEnvelopeSchema },
} satisfies FastifySchema;
