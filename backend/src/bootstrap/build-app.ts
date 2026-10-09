import { registerIsolatedSlices } from "../transport/register-isolated-slices.js";
import { requireControlledEmulatorEnvironment } from "../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { FriendRequests } from "../friends/application/friend-requests.js";
import type { GetEventDetail } from "../event-detail/application/get-event-detail.js";
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import type { RecommendEvents } from "../event-recommendations/application/recommend-events.js";
import type { OwnAccountPreferences } from "../account/application/own-account-preferences.js";
import { registerAccountPreferencesRoutes } from "../account/transport/register-routes.js";
import { registerEventRecommendationRoute } from "../event-recommendations/transport/register-route.js";
import type { AppFailureCode } from "../shared/application/app-failure.js";
import { sendFailureCode } from "../transport/error-response.js";
import {
  registerR4Routes,
  type R4RouteDependencies,
} from "../transport/register-routes.js";

export async function buildApp(
  dependencies: R4RouteDependencies & { readonly recommendEvents?: Pick<RecommendEvents, "execute">;
    readonly accountPreferences?: OwnAccountPreferences;
    readonly isolatedSlices?: { readonly environment: NodeJS.ProcessEnv; readonly friends?: FriendRequests; readonly eventDetail?: GetEventDetail } },
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.decorateRequest("authPrincipal", null);

  app.setErrorHandler((error, request, reply) => {
    const code = validationFailureCode(error, request);
    return sendFailureCode(request, reply, code);
  });

  await registerR4Routes(app, dependencies);
  if (dependencies.accountPreferences !== undefined) {
    await registerAccountPreferencesRoutes(app, dependencies.identityVerifier, dependencies.accountPreferences);
  }
  if (dependencies.recommendEvents !== undefined) {
    await registerEventRecommendationRoute(app, {
      identityVerifier: dependencies.identityVerifier,
      recommendEvents: dependencies.recommendEvents,
    });
  }
  if (dependencies.isolatedSlices !== undefined) {
    requireControlledEmulatorEnvironment(dependencies.isolatedSlices.environment);
    await registerIsolatedSlices(app, dependencies.identityVerifier, dependencies.isolatedSlices.friends, dependencies.isolatedSlices.eventDetail);
  }
  await app.ready();
  return app;
}

function validationFailureCode(
  error: unknown,
  request: FastifyRequest,
): AppFailureCode {
  const fastifyError = error as {
    readonly validation?: unknown;
    readonly validationContext?: string;
    readonly statusCode?: number;
  };
  if (
    fastifyError.validation !== undefined ||
    fastifyError.statusCode === 400
  ) {
    const context = fastifyError.validationContext;
    if (context === "headers") return "IDEMPOTENCY_KEY_INVALID";

    const route = request.routeOptions.url;
    if (route?.startsWith("/v1/friend") || route === "/v1/me/friend-requests" || route === "/v1/me/friends" || route === "/v1/events/:eventId") return "REQUEST_INVALID";
    if (route === "/v1/me/profile" || route === "/v1/me/settings") {
      const validation = fastifyError.validation as readonly { readonly keyword?: string }[] | undefined;
      const malformed = validation === undefined || validation.some((item) =>
        item.keyword === "type" || item.keyword === "required" || item.keyword === "additionalProperties");
      return malformed ? "REQUEST_INVALID" : route === "/v1/me/profile" ? "PROFILE_INVALID" : "SETTINGS_INVALID";
    }
    if (context === "querystring" && route === "/v1/recommendations/events") {
      return "REQUEST_INVALID";
    }
    if (request.method === "PUT" && route === "/v1/me/onboarding") {
      return "USERNAME_INVALID";
    }
    if (request.method === "POST" && route === "/v1/check-ins") {
      return "CHECKIN_INVALID";
    }
    if (request.method === "GET" && route === "/v1/check-ins/:checkInId") {
      return "CHECKIN_UNAVAILABLE";
    }
    if (request.method === "PUT" && route === "/v1/me/interests") {
      return "INTEREST_SELECTION_INVALID";
    }
  }
  return "SERVICE_UNAVAILABLE";
}
