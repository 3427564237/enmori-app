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
    matchedInterests: { type: "array", items: matchedInterest },
    reasons: {type:"array",minItems:1,maxItems:3,items:{type:"object",additionalProperties:false,required:["code","count","points"],properties:{
      code:{type:"string",enum:["shared_interests","friends_participating","same_region"]},count:{type:"integer",minimum:1,maximum:1000},points:{type:"integer",minimum:1,maximum:40}}}},
    reasonCode: { type: "string", enum: ["interest_match","relevance_match"] },
  },
} as const;
export const eventRecommendationsSchema = {
  type: "object", additionalProperties: false, required: ["asOf", "formulaVersion", "items"],
  properties: { asOf: utc, formulaVersion: { type: "string", enum: ["event_recommendation_v1","event_recommendation_v2"] },
    items: { type: "array", items: eventRecommendationItemSchema } },
} as const;
export const recommendEventsSchema = {
  querystring: { type: "object", additionalProperties: false, required: ["view"],
    properties: { view: { type: "string", enum: ["home", "all"] } } },
  response: { 200: eventRecommendationsSchema, 400: errorEnvelopeSchema,
    401: errorEnvelopeSchema, 403: errorEnvelopeSchema, 409: errorEnvelopeSchema, 503: errorEnvelopeSchema },
} satisfies FastifySchema;
