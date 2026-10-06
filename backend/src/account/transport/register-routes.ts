import type { FastifyInstance } from "fastify";
import type { OwnAccountPreferences } from "../application/own-account-preferences.js";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate, requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure } from "../../transport/error-response.js";
import { getProfileSchema, getSettingsSchema, putProfileSchema, putSettingsSchema } from "./schemas.js";

export async function registerAccountPreferencesRoutes(app: FastifyInstance, identityVerifier: IdentityVerifier,
  preferences: Pick<OwnAccountPreferences, "getProfile" | "getSettings" | "saveProfile" | "saveSettings">): Promise<void> {
  const authenticate = buildAuthenticate(identityVerifier);
  app.get("/v1/me/profile", { onRequest: authenticate, schema: structuredClone(getProfileSchema) }, async (request, reply) => {
    const result = await preferences.getProfile(requirePrincipal(request));
    return result.ok ? reply.send({ profile: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.get("/v1/me/settings", { onRequest: authenticate, schema: structuredClone(getSettingsSchema) }, async (request, reply) => {
    const result = await preferences.getSettings(requirePrincipal(request));
    return result.ok ? reply.send({ settings: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.put<{ Body: { displayName: string | null; profileVisibility: string; expectedRevision: number } }>(
    "/v1/me/profile", { onRequest: authenticate, schema: structuredClone(putProfileSchema) }, async (request, reply) => {
      const result = await preferences.saveProfile({ principal: requirePrincipal(request), ...request.body });
      return result.ok ? reply.send({ profile: result.value }) : sendFailure(request, reply, result.failure);
    });
  app.put<{ Body: { checkInVisibility: string; optionalProcessingConsent: string; expectedRevision: number } }>(
    "/v1/me/settings", { onRequest: authenticate, schema: structuredClone(putSettingsSchema) }, async (request, reply) => {
      const result = await preferences.saveSettings({ principal: requirePrincipal(request), ...request.body });
      return result.ok ? reply.send({ settings: result.value }) : sendFailure(request, reply, result.failure);
    });
}
