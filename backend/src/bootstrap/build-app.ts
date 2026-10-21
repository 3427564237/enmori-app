import { registerSocialModule } from './register-social-module.js';
import { requireRemoteGroupEnvironment } from '../shared/infrastructure/firebase/feature-environment.js';
import type { createIsolatedEventParticipation } from "./event-participation.js";
import { registerParticipationRoutes } from "../event-participation/transport/register-routes.js";
import {registerCheckInCalendar} from "../check-ins/transport/calendar-route.js";
import type {OwnCheckInCalendar} from "../check-ins/application/check-in-calendar.js";
import { registerCheckInMutations } from "../check-ins/transport/mutation-routes.js";
import type { EditCheckIn } from "../check-ins/application/edit-check-in.js";
import { registerInterestAdmin } from '../interests/transport/admin-routes.js';
import type { CreateInterestTag } from '../interests/application/create-interest-tag.js';
import { createIsolatedEventBrowse, type IsolatedEventBrowseInput } from "./isolated-event-browse.js";
import { buildEventBrowseFrameworkErrors } from "./event-browse-framework-errors.js";
import { registerEventBrowseRoutes } from "../event-browse/transport/register-routes.js";
import { registerIsolatedSlices } from "../transport/register-isolated-slices.js";
import { registerConversationRoutes } from "../ai-conversation/transport/register-routes.js";
import type { ConversationOperations } from "../ai-conversation/ports/conversation-operations.js";
import { registerPersonaRoutes, type PersonaOperations } from "../personas/transport/register-routes.js";
import { registerPersonaPreviewRoute, type PersonaPreviewOperations } from "../personas/transport/preview-route.js";
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
  dependencies: R4RouteDependencies & { readonly checkInCalendar?:OwnCheckInCalendar; readonly editCheckIn?: EditCheckIn; readonly createInterestTag?: CreateInterestTag; readonly recommendEvents?: Pick<RecommendEvents, "execute">;
    readonly accountPreferences?: OwnAccountPreferences;
    readonly socialModule?: Parameters<typeof registerSocialModule>[1];
    readonly controlledPhoneDiagnostics?: ControlledPhoneDiagnostics;
    readonly isolatedSlices?: { readonly environment: NodeJS.ProcessEnv; readonly friends?: FriendRequests; readonly eventDetail?: GetEventDetail; readonly checkInHistory?: Pick<ListOwnCheckInsForDate, "execute">; readonly personas?: PersonaOperations; readonly personaPreview?: PersonaPreviewOperations; readonly conversations?: ConversationOperations; readonly eventBrowse?: IsolatedEventBrowseInput; readonly eventParticipation?: ReturnType<typeof createIsolatedEventParticipation> };
    readonly remoteSlices?: { readonly environment: NodeJS.ProcessEnv; readonly friends?: FriendRequests; readonly eventDetail?: GetEventDetail; readonly checkInHistory?: Pick<ListOwnCheckInsForDate, "execute">; readonly personas?: PersonaOperations; readonly personaPreview?: PersonaPreviewOperations; readonly conversations?: ConversationOperations; readonly eventBrowse?: IsolatedEventBrowseInput; readonly eventParticipation?: ReturnType<typeof createIsolatedEventParticipation> } },
): Promise<FastifyInstance> {
  if (dependencies.isolatedSlices !== undefined) {
    requireControlledEmulatorEnvironment(dependencies.isolatedSlices.environment);
  }
  if (dependencies.remoteSlices !== undefined) {
    if (dependencies.isolatedSlices !== undefined) throw new Error('Mixed feature environments');
    requireRemoteGroupEnvironment(dependencies.remoteSlices.environment);
  }
  const slices = dependencies.remoteSlices ?? dependencies.isolatedSlices;
  if (dependencies.controlledPhoneDiagnostics && dependencies.isolatedSlices === undefined) {
    throw new Error("CONTROLLED_PHONE_DIAGNOSTICS_REQUIRE_ISOLATED_ENVIRONMENT");
  }
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
    ...((slices?.eventBrowse !== undefined || slices?.eventParticipation !== undefined) ? {
      routerOptions: { maxParamLength: 174 },
      frameworkErrors: buildEventBrowseFrameworkErrors(dependencies.identityVerifier,
        dependencies.getOnboarding, slices.personas !== undefined),
    } : slices?.personas === undefined ? {} : {
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
  if(dependencies.checkInCalendar)await registerCheckInCalendar(app,dependencies.identityVerifier,dependencies.checkInCalendar);
  if (dependencies.editCheckIn) await registerCheckInMutations(app, dependencies.identityVerifier, dependencies.editCheckIn);
  if (dependencies.createInterestTag) await registerInterestAdmin(app, dependencies.identityVerifier, dependencies.createInterestTag);
  if (dependencies.accountPreferences !== undefined) {
    await registerAccountPreferencesRoutes(app, dependencies.identityVerifier, dependencies.accountPreferences);
  }
  if (dependencies.recommendEvents !== undefined) {
    await registerEventRecommendationRoute(app, {
      identityVerifier: dependencies.identityVerifier,
      recommendEvents: dependencies.recommendEvents,
    });
  }
  if (slices !== undefined) {
    await registerIsolatedSlices(app, dependencies.identityVerifier, slices.friends, slices.eventDetail, slices.checkInHistory);
    if (slices.personas !== undefined) {
      await registerPersonaRoutes(app, dependencies.identityVerifier, slices.personas);
    }
    if (slices.personaPreview !== undefined) {
      await registerPersonaPreviewRoute(app, dependencies.identityVerifier, slices.personaPreview);
    }
    if (slices.eventParticipation !== undefined) {
      await registerParticipationRoutes(app, dependencies.identityVerifier, slices.eventParticipation.operations);
      await registerEventBrowseRoutes(app, dependencies.identityVerifier, slices.eventParticipation.browse);
    } else if (slices.eventBrowse !== undefined) {
      await registerEventBrowseRoutes(app, dependencies.identityVerifier,
        createIsolatedEventBrowse(dependencies.getOnboarding, slices.eventBrowse));
    }
    if (slices.conversations !== undefined) {
      await registerConversationRoutes(app, dependencies.identityVerifier, slices.conversations);
    }
  }
  if (dependencies.socialModule) await registerSocialModule(app, dependencies.socialModule);
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
    if(route === "/v1/me/check-ins/calendar")return "REQUEST_INVALID";
    if (route === "/v1/admin/interest-tags") return "REQUEST_INVALID";
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
    if (["PUT", "DELETE"].includes(request.method) && route === "/v1/check-ins/:checkInId") return "CHECKIN_INVALID";
    if (request.method === "GET" && route === "/v1/check-ins/:checkInId") {
      return "CHECKIN_UNAVAILABLE";
    }
    if (request.method === "PUT" && route === "/v1/me/interests") {
      return "INTEREST_SELECTION_INVALID";
    }
  }
  return "SERVICE_UNAVAILABLE";
}
