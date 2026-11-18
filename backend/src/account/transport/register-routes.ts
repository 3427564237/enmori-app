import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { OwnAccountPreferences } from "../application/own-account-preferences.js";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate, requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure, sendFailureCode } from "../../transport/error-response.js";
import { getProfileSchema, getSettingsSchema, putProfileSchema, putSettingsSchema, getAvatarSchema, putAvatarSchema, getSharedAvatarSchema, putSharedAvatarSchema, getVisibleAvatarSchema } from "./schemas.js";
import { AVATAR_MAX_BASE64_LENGTH } from "../domain/avatar-values.js";

export async function registerAccountPreferencesRoutes(app: FastifyInstance, identityVerifier: IdentityVerifier,
  preferences: Pick<OwnAccountPreferences, "getProfile" | "getSettings" | "saveProfile" | "saveSettings"> &
    Partial<Pick<OwnAccountPreferences, "getAvatar" | "saveAvatar" | "getSharedAvatar" | "saveSharedAvatar" | "getVisibleAvatar">>): Promise<void> {
  const authenticate = buildAuthenticate(identityVerifier);
  app.get("/v1/me/profile", { onRequest: authenticate, schema: structuredClone(getProfileSchema) }, async (request, reply) => {
    const result = await preferences.getProfile(requirePrincipal(request));
    return result.ok ? reply.send({ profile: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.get("/v1/me/settings", { onRequest: authenticate, schema: structuredClone(getSettingsSchema) }, async (request, reply) => {
    const result = await preferences.getSettings(requirePrincipal(request));
    return result.ok ? reply.send({ settings: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.put<{ Body: { displayName: string | null; profileVisibility: string; expectedRevision: number; details?: unknown } }>(
    "/v1/me/profile", { onRequest: authenticate, schema: structuredClone(putProfileSchema),
      preValidation: async (request, reply) => {
        // Keep a malformed region from being coerced into a stored string or null.
        const details = request.body?.details;
        if (details && typeof details === "object" && "region" in details &&
            details.region !== null && typeof details.region !== "string") {
          return sendFailureCode(request, reply, "REQUEST_INVALID");
        }
      },
    }, async (request, reply) => {
      const result = await preferences.saveProfile({ principal: requirePrincipal(request), ...request.body });
      return result.ok ? reply.send({ profile: result.value }) : sendFailure(request, reply, result.failure);
    });
  app.put<{ Body: { checkInVisibility: string; optionalProcessingConsent: string; expectedRevision: number } }>(
    "/v1/me/settings", { onRequest: authenticate, schema: structuredClone(putSettingsSchema) }, async (request, reply) => {
      const result = await preferences.saveSettings({ principal: requirePrincipal(request), ...request.body });
      return result.ok ? reply.send({ settings: result.value }) : sendFailure(request, reply, result.failure);
    });
  const avatarAuthenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header("Cache-Control", "no-store");
    await authenticate(request, reply);
  };
  const avatarError = (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const details = error as Error & { statusCode?: number; validationContext?: string; validation?: { keyword: string }[] };
    const malformed = details.validation?.some(item => ["type", "required", "additionalProperties"].includes(item.keyword));
    const code = details.validation
      ? (details.validationContext === "querystring" || details.validationContext === "params") || malformed ? "REQUEST_INVALID" : "PROFILE_INVALID"
      : [400, 415].includes(details.statusCode ?? 0) ? "REQUEST_INVALID"
      : details.statusCode === 413 ? "PROFILE_INVALID" : "SERVICE_UNAVAILABLE";
    return sendFailureCode(request, reply, code);
  };
  app.get("/v1/me/profile/shared-avatar", { onRequest: avatarAuthenticate, schema: structuredClone(getSharedAvatarSchema), errorHandler: avatarError }, async (request, reply) => {
    if (request.headers["transfer-encoding"] !== undefined || request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0") return sendFailureCode(request, reply, "REQUEST_INVALID");
    if (!preferences.getSharedAvatar) return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    const result = await preferences.getSharedAvatar(requirePrincipal(request));
    return result.ok ? reply.send({ avatar: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.get<{ Params: { username: string } }>("/v1/users/:username/avatar", { onRequest: avatarAuthenticate, schema: structuredClone(getVisibleAvatarSchema), errorHandler: avatarError }, async (request, reply) => {
    if (request.headers["transfer-encoding"] !== undefined || request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0") return sendFailureCode(request, reply, "REQUEST_INVALID");
    if (!preferences.getVisibleAvatar) return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    const result = await preferences.getVisibleAvatar(requirePrincipal(request), request.params.username);
    return result.ok ? reply.send({ avatar: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.put<{ Body: { pngBase64: string | null; expectedRevision: number; visibleToAuthenticatedUsers: boolean } }>("/v1/me/profile/shared-avatar", {
    onRequest: avatarAuthenticate, schema: structuredClone(putSharedAvatarSchema), errorHandler: avatarError,
    bodyLimit: AVATAR_MAX_BASE64_LENGTH + 1024,
    preValidation: async (request, reply) => {
      const body: unknown = request.body;
      if (body === null || typeof body !== "object" || Array.isArray(body) ||
          !("pngBase64" in body) || !("expectedRevision" in body) || !("visibleToAuthenticatedUsers" in body) ||
          !(body.pngBase64 === null || typeof body.pngBase64 === "string") ||
          typeof body.expectedRevision !== "number" || typeof body.visibleToAuthenticatedUsers !== "boolean") return sendFailureCode(request, reply, "REQUEST_INVALID");
    },
  }, async (request, reply) => {
    if (!preferences.saveSharedAvatar) return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    const result = await preferences.saveSharedAvatar({ principal: requirePrincipal(request), ...request.body });
    return result.ok ? reply.send({ avatar: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.get("/v1/me/profile/avatar", { onRequest: avatarAuthenticate, schema: structuredClone(getAvatarSchema), errorHandler: avatarError }, async (request, reply) => {
    if (request.body !== undefined || request.headers["transfer-encoding"] !== undefined ||
        request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0") {
      return sendFailureCode(request, reply, "REQUEST_INVALID");
    }
    if (!preferences.getAvatar) return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    const result = await preferences.getAvatar(requirePrincipal(request));
    return result.ok ? reply.send({ avatar: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.put<{ Body: { pngBase64: string | null; expectedRevision: number } }>("/v1/me/profile/avatar", {
    onRequest: avatarAuthenticate, schema: structuredClone(putAvatarSchema), errorHandler: avatarError,
    bodyLimit: AVATAR_MAX_BASE64_LENGTH + 1024,
    // Fastify's shared validator coerces scalar types. Preserve the strict
    // avatar wire contract before schema validation can turn null into zero.
    preValidation: async (request, reply) => {
      const body: unknown = request.body;
      if (body === null || typeof body !== "object" || Array.isArray(body) ||
          !("pngBase64" in body) || !("expectedRevision" in body) ||
          !(body.pngBase64 === null || typeof body.pngBase64 === "string") ||
          typeof body.expectedRevision !== "number") return sendFailureCode(request, reply, "REQUEST_INVALID");
    },
  }, async (request, reply) => {
    if (!preferences.saveAvatar) return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    const result = await preferences.saveAvatar({ principal: requirePrincipal(request), ...request.body });
    return result.ok ? reply.send({ avatar: result.value }) : sendFailure(request, reply, result.failure);
  });
}
