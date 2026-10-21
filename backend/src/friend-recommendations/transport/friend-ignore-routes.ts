import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate, requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure, sendFailureCode } from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
import type { FriendIgnoreRepository } from "../ports/friend-ignore-repository.js";
const version = { type: "string", pattern: "^[a-f0-9]{64}$" };
export const friendIgnoreStateSchema = {
  type: "object", additionalProperties: false, required: ["username", "displayName", "ignored", "version"],
  properties: { username: { type: "string" }, displayName: { anyOf: [{ type: "string" }, { type: "null" }] },
    ignored: { type: "boolean" }, version },
};
const errors = Object.fromEntries([400, 401, 403, 404, 409, 412, 503].map(code => [code, errorEnvelopeSchema]));
const querystring = { type: "object", additionalProperties: false, properties: {} };
export const friendIgnoredListSchema = { querystring, response: {
  200: { type: "object", additionalProperties: false, required: ["people"],
    properties: { people: { type: "array", maxItems: 999, items: friendIgnoreStateSchema } } }, ...errors,
} };
export const friendIgnoreReadSchema = {
  querystring, params: { type: "object", additionalProperties: false, required: ["username"],
    properties: { username: { type: "string", minLength: 3, maxLength: 30, pattern: "^[a-z0-9]+(?:_[a-z0-9]+)*$" } } },
  response: { 200: friendIgnoreStateSchema, ...errors },
};
export const friendIgnoreWriteSchema = { ...friendIgnoreReadSchema,
  body: { type: "object", additionalProperties: false, required: ["ignored", "expectedVersion"],
    properties: { ignored: { type: "boolean" }, expectedVersion: version } },
};
export async function registerFriendIgnoreRoutes(app: FastifyInstance, identity: IdentityVerifier, repository: FriendIgnoreRepository) {
  await app.register(async scope => {
    if (!scope.hasRequestDecorator("authPrincipal")) scope.decorateRequest("authPrincipal", null);
    scope.addHook("onSend", async (_request, reply, payload) => { reply.header("Cache-Control", "no-store"); return payload; });
    scope.setErrorHandler((error, request, reply) => sendFailureCode(request, reply,
      (error as { validation?: unknown }).validation ? "REQUEST_INVALID" : "SERVICE_UNAVAILABLE"));
    const onRequest = buildAuthenticate(identity);
    scope.get("/v1/me/friend-recommendation-ignores", { onRequest, schema: friendIgnoredListSchema }, async (request, reply) => {
      const result = await repository.list(requirePrincipal(request).firebaseUid);
      return result.ok ? reply.send(result.value) : sendFailure(request, reply, result.failure);
    });
    scope.get<{ Params: { username: string } }>("/v1/me/friend-recommendation-ignores/:username",
      { onRequest, schema: friendIgnoreReadSchema }, async (request, reply) => {
        const result = await repository.read(requirePrincipal(request).firebaseUid, request.params.username);
        return result.ok ? reply.send(result.value) : sendFailure(request, reply, result.failure);
      });
    scope.put<{ Params: { username: string }; Body: { ignored: boolean; expectedVersion: string } }>(
      "/v1/me/friend-recommendation-ignores/:username", { onRequest, schema: friendIgnoreWriteSchema }, async (request, reply) => {
        const result = await repository.set(requirePrincipal(request).firebaseUid, request.params.username, request.body.ignored, request.body.expectedVersion);
        return result.ok ? reply.send(result.value) : sendFailure(request, reply, result.failure);
      });
  });
}
