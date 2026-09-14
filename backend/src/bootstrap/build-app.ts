import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import type { AppFailureCode } from "../shared/application/app-failure.js";
import { sendFailureCode } from "../transport/error-response.js";
import {
  registerR4Routes,
  type R4RouteDependencies,
} from "../transport/register-routes.js";

export async function buildApp(
  dependencies: R4RouteDependencies,
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
