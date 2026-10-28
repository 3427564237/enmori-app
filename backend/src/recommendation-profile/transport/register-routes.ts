import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import type { RecommendationProfiles } from "../ports/recommendation-profile.js";
import { emptyRecommendationProfile } from "../domain/recommendation-profile.js";
import { areas } from "../domain/areas.js";
import {
  buildAuthenticate,
  requirePrincipal,
} from "../../transport/authenticate.js";
import {
  sendFailure,
  sendFailureCode,
} from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
const fields = {
  birthDate: {
    anyOf: [
      { type: "null" },
      { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    ],
  },
  homeAreaCode: {
    anyOf: [
      { type: "null" },
      { type: "string", enum: areas.map((a) => a.code) },
    ],
  },
  ...Object.fromEntries(
    Object.keys(emptyRecommendationProfile)
      .filter((k) => !["birthDate", "homeAreaCode", "revision"].includes(k))
      .map((k) => [k, { type: "boolean" }]),
  ),
};
export const recommendationProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(emptyRecommendationProfile),
  properties: { ...fields, revision: { type: "integer", minimum: 0 } },
};
export async function registerRecommendationProfiles(
  app: FastifyInstance,
  identity: IdentityVerifier,
  repository: RecommendationProfiles,
) {
  await app.register(async (scope) => {
    scope.addHook("onSend", async (_req, reply, payload) => {
      reply.header("Cache-Control", "no-store");
      return payload;
    });
    scope.setErrorHandler((e, req, reply) =>
      sendFailureCode(
        req,
        reply,
        (e as { validation?: unknown }).validation
          ? "REQUEST_INVALID"
          : "SERVICE_UNAVAILABLE",
      ),
    );
    const response = {
      200: {
        type: "object",
        required: ["profile"],
        properties: { profile: recommendationProfileSchema },
      },
      ...Object.fromEntries(
        [400, 401, 403, 409, 412, 422, 503].map((n) => [
          n,
          errorEnvelopeSchema,
        ]),
      ),
    };
    scope.get(
      "/v1/me/recommendation-profile",
      { onRequest: buildAuthenticate(identity), schema: { response } },
      async (req, reply) => {
        const r = await repository.read(requirePrincipal(req).firebaseUid);
        return r.ok
          ? reply.send({ profile: r.value })
          : sendFailure(req, reply, r.failure);
      },
    );
    scope.put(
      "/v1/me/recommendation-profile",
      {
        onRequest: buildAuthenticate(identity),
        schema: {
          body: {
            type: "object",
            additionalProperties: false,
            required: [...Object.keys(fields), "expectedRevision"],
            properties: {
              ...fields,
              expectedRevision: { type: "integer", minimum: 0 },
            },
          },
          response,
        },
        preValidation: async (req, reply) => {
          const b = req.body as Record<string, unknown> | null;
          if (
            !b ||
            typeof b !== "object" ||
            Array.isArray(b) ||
            typeof b.expectedRevision !== "number" ||
            Object.keys(fields)
              .filter((k) => !["birthDate", "homeAreaCode"].includes(k))
              .some((k) => typeof b[k] !== "boolean")
          )
            return sendFailureCode(req, reply, "REQUEST_INVALID");
        },
      },
      async (req, reply) => {
        const r = await repository.save(
          requirePrincipal(req).firebaseUid,
          req.body,
        );
        return r.ok
          ? reply.send({ profile: r.value })
          : sendFailure(req, reply, r.failure);
      },
    );
    scope.get<{ Params: { username: string } }>(
      "/v1/users/:username/discovery-card",
      {
        onRequest: buildAuthenticate(identity),
        schema: {
          response: {
            ...response,
            200: {
              type: "object",
              additionalProperties: false,
              required: ["card"],
              properties: {
                card: {
                  type: "object",
                  additionalProperties: false,
                  required: ["username", "displayName"],
                  properties: {
                    username: { type: "string" },
                    displayName: {
                      anyOf: [{ type: "null" }, { type: "string" }],
                    },
                  },
                },
              },
            },
          },
          params: {
            type: "object",
            required: ["username"],
            properties: {
              username: { type: "string", minLength: 1, maxLength: 50 },
            },
          },
        },
      },
      async (req, reply) => {
        const result = await repository.card(
          requirePrincipal(req).firebaseUid,
          req.params.username,
        );
        return result.ok
          ? reply.send({ card: result.value })
          : sendFailure(req, reply, result.failure);
      },
    );
  });
}
