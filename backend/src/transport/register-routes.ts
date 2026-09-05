import type { FastifyInstance } from "fastify";
import type { CreateCheckIn } from "../check-ins/application/create-check-in.js";
import type { GetCheckIn } from "../check-ins/application/get-check-in.js";
import type { CompleteOnboarding } from "../onboarding/application/complete-onboarding.js";
import type { GetOnboarding } from "../onboarding/application/get-onboarding.js";
import type { AccountProjection } from "../onboarding/application/onboarding-model.js";
import type { CheckInProjection } from "../check-ins/application/check-in-model.js";
import type { IdentityVerifier } from "../shared/ports/identity-verifier.js";
import { buildAuthenticate, requirePrincipal } from "./authenticate.js";
import { sendFailure } from "./error-response.js";
import {
  completeOnboardingSchema,
  createCheckInSchema,
  getCheckInSchema,
  getOnboardingSchema,
} from "./schemas.js";

export interface R4RouteDependencies {
  readonly identityVerifier: IdentityVerifier;
  readonly completeOnboarding: Pick<CompleteOnboarding, "execute">;
  readonly getOnboarding: Pick<GetOnboarding, "execute">;
  readonly createCheckIn: Pick<CreateCheckIn, "execute">;
  readonly getCheckIn: Pick<GetCheckIn, "execute">;
}

interface CompleteOnboardingBody {
  readonly username: string;
  readonly initialChoice: "accept" | "reject";
}

interface CommandHeaders {
  readonly "idempotency-key": string;
}

interface CreateCheckInBody {
  readonly note: string;
}

interface CheckInParams {
  readonly checkInId: string;
}

export async function registerR4Routes(
  app: FastifyInstance,
  dependencies: R4RouteDependencies,
): Promise<void> {
  const authenticate = buildAuthenticate(dependencies.identityVerifier);

  app.put<{
    Body: CompleteOnboardingBody;
    Headers: CommandHeaders;
  }>(
    "/v1/me/onboarding",
    { schema: completeOnboardingSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.completeOnboarding.execute({
        principal: requirePrincipal(request),
        username: request.body.username,
        initialChoice: request.body.initialChoice,
        idempotencyKey: request.headers["idempotency-key"],
      });
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply
        .code(result.value.disposition === "created" ? 201 : 200)
        .send({ account: accountResponse(result.value.account) });
    },
  );

  app.get(
    "/v1/me/onboarding",
    { schema: getOnboardingSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.getOnboarding.execute(
        requirePrincipal(request),
      );
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply.code(200).send(
        result.value.status === "required"
          ? { status: "required" }
          : {
              status: "completed",
              account: accountResponse(result.value.account),
            },
      );
    },
  );

  app.post<{ Body: CreateCheckInBody; Headers: CommandHeaders }>(
    "/v1/check-ins",
    { schema: createCheckInSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.createCheckIn.execute({
        principal: requirePrincipal(request),
        note: request.body.note,
        idempotencyKey: request.headers["idempotency-key"],
      });
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply
        .code(result.value.disposition === "created" ? 201 : 200)
        .send({ checkIn: checkInResponse(result.value.checkIn) });
    },
  );

  app.get<{ Params: CheckInParams }>(
    "/v1/check-ins/:checkInId",
    { schema: getCheckInSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.getCheckIn.execute({
        principal: requirePrincipal(request),
        checkInId: request.params.checkInId,
      });
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply.code(200).send({ checkIn: checkInResponse(result.value) });
    },
  );
}

function accountResponse(account: AccountProjection): AccountProjection {
  return {
    username: account.username,
    optionalProcessingConsent: account.optionalProcessingConsent,
    checkInVisibility: account.checkInVisibility,
    onboardingCompletedAt: account.onboardingCompletedAt,
  };
}

function checkInResponse(checkIn: CheckInProjection): CheckInProjection {
  return {
    checkInId: checkIn.checkInId,
    note: checkIn.note,
    createdAt: checkIn.createdAt,
  };
}
