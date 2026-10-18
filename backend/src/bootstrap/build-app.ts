import { createIsolatedEventBrowse, type IsolatedEventBrowseInput } from "./isolated-event-browse.js";
import { buildEventBrowseFrameworkErrors } from "./event-browse-framework-errors.js";
import { registerEventBrowseRoutes } from "../event-browse/transport/register-routes.js";
import { registerIsolatedSlices } from "../transport/register-isolated-slices.js";
import { registerConversationRoutes } from "../ai-conversation/transport/register-routes.js";
import type { ConversationOperations } from "../ai-conversation/ports/conversation-operations.js";
import { registerPersonaRoutes, type PersonaOperations } from "../personas/transport/register-routes.js";
import { buildPersonaFrameworkErrors } from "../personas/transport/framework-errors.js";
import { requireControlledEmulatorEnvironment } from "../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { FriendRequests } from "../friends/application/friend-requests.js";
import type { GetEventDetail } from "../event-detail/application/get-event-detail.js";
import type { ListOwnCheckInsForDate } from "../check-ins/application/check-in-history.js";
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
import type { ControlledPhoneDiagnostics } from "./controlled-phone-diagnostics.js";
import {
  registerR4Routes,
  type R4RouteDependencies,
} from "../transport/register-routes.js";

export async function buildApp(
  dependencies: R4RouteDependencies & { readonly recommendEvents?: Pick<RecommendEvents, "execute">;
    readonly accountPreferences?: OwnAccountPreferences;
    readonly controlledPhoneDiagnostics?: ControlledPhoneDiagnostics;
    readonly isolatedSlices?: { readonly environment: NodeJS.ProcessEnv; readonly friends?: FriendRequests; readonly eventDetail?: GetEventDetail; readonly checkInHistory?: Pick<ListOwnCheckInsForDate, "execute">; readonly personas?: PersonaOperations; readonly conversations?: ConversationOperations; readonly eventBrowse?: IsolatedEventBrowseInput } },
): Promise<FastifyInstance> {
  if (dependencies.isolatedSlices !== undefined) {
    requireControlledEmulatorEnvironment(dependencies.isolatedSlices.environment);
  }
  if (dependencies.controlledPhoneDiagnostics && dependencies.isolatedSlices === undefined) {
    throw new Error("CONTROLLED_PHONE_DIAGNOSTICS_REQUIRE_ISOLATED_ENVIRONMENT");
  }
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
    ...(dependencies.isolatedSlices?.eventBrowse !== undefined ? {
      routerOptions: { maxParamLength: 174 },
      frameworkErrors: buildEventBrowseFrameworkErrors(dependencies.identityVerifier,
        dependencies.getOnboarding, dependencies.isolatedSlices.personas !== undefined),
    } : dependencies.isolatedSlices?.personas === undefined ? {} : {
      frameworkErrors: buildPersonaFrameworkErrors(dependencies.identityVerifier),
    }),
  });
  app.decorateRequest("authPrincipal", null);
  dependencies.controlledPhoneDiagnostics?.install(app);

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
    await registerIsolatedSlices(app, dependencies.identityVerifier, dependencies.isolatedSlices.friends, dependencies.isolatedSlices.eventDetail, dependencies.isolatedSlices.checkInHistory);
    if (dependencies.isolatedSlices.personas !== undefined) {
      await registerPersonaRoutes(app, dependencies.identityVerifier, dependencies.isolatedSlices.personas);
    }
    if (dependencies.isolatedSlices.eventBrowse !== undefined) {
      await registerEventBrowseRoutes(app, dependencies.identityVerifier,
        createIsolatedEventBrowse(dependencies.getOnboarding, dependencies.isolatedSlices.eventBrowse));
    }
    if (dependencies.isolatedSlices.conversations !== undefined) {
      await registerConversationRoutes(app, dependencies.identityVerifier, dependencies.isolatedSlices.conversations);
    }
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
    if (route?.startsWith("/v1/friend") || route === "/v1/me/friend-requests" || route === "/v1/me/friends" || route === "/v1/me/friends/search" || route === "/v1/events/:eventId") return "REQUEST_INVALID";
    if (route === "/v1/me/profile" || route === "/v1/me/settings") {
      const validation = fastifyError.validation as readonly { readonly keyword?: string }[] | undefined;
      const malformed = validation === undefined || validation.some((item) =>
        item.keyword === "type" || item.keyword === "required" || item.keyword === "additionalProperties");
      return malformed ? "REQUEST_INVALID" : route === "/v1/me/profile" ? "PROFILE_INVALID" : "SETTINGS_INVALID";
    }
    if (context === "querystring" && route === "/v1/recommendations/events") {
      return "REQUEST_INVALID";
    }
    if (context === "querystring" && route === "/v1/me/check-ins") {
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
