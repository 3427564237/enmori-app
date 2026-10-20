import type { FastifyInstance } from "fastify";
import type { CreateCheckIn } from "../check-ins/application/create-check-in.js";
import type { GetCheckIn } from "../check-ins/application/get-check-in.js";
import type { CompleteOnboarding } from "../onboarding/application/complete-onboarding.js";
import type { GetOnboarding } from "../onboarding/application/get-onboarding.js";
import type { GetInterestTags } from "../interests/application/get-interest-tags.js";
import type { GetOwnInterests } from "../interests/application/get-own-interests.js";
import type { ReplaceOwnInterests } from "../interests/application/replace-own-interests.js";
import type { OwnInterestsProjection } from "../interests/application/interest-model.js";
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
  getInterestTagsSchema,
  getOwnInterestsSchema,
  replaceOwnInterestsSchema,
} from "./schemas.js";

export interface R4RouteDependencies {
  readonly identityVerifier: IdentityVerifier;
  readonly completeOnboarding: Pick<CompleteOnboarding, "execute">;
  readonly getOnboarding: Pick<GetOnboarding, "execute">;
  readonly createCheckIn: Pick<CreateCheckIn, "execute">;
  readonly getCheckIn: Pick<GetCheckIn, "execute">;
  readonly getInterestTags: Pick<GetInterestTags, "execute">;
  readonly getOwnInterests: Pick<GetOwnInterests, "execute">;
  readonly replaceOwnInterests: Pick<ReplaceOwnInterests, "execute">;
}

interface CompleteOnboardingBody {
  readonly username: string;
  readonly initialChoice: "accept" | "reject";
}

interface CommandHeaders {
  readonly "idempotency-key": string;
}

interface CreateCheckInBody extends CheckInLocationInput {
  readonly mood?: string | null;
  readonly activity?: string | null;
  readonly checkInVisibility?: "private" | "friends_only" | "public";
  readonly note: string;
}
type CheckInLocationInput = import("../check-ins/domain/check-in-location.js").CheckInLocationInput;

interface CheckInParams {
  readonly checkInId: string;
}

interface ReplaceOwnInterestsBody {
  readonly interestTagIds: readonly string[];
  readonly expectedRevision: number;
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
        ...request.body,
        idempotencyKey: request.headers["idempotency-key"],
      });
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply
        .code(result.value.disposition === "created" ? 201 : 200)
        .send({ checkIn: checkInResponse(result.value.checkIn),
          ...(result.value.notice === undefined ? {} : {notice:result.value.notice}) });
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

  app.get(
    "/v1/interest-tags",
    { schema: getInterestTagsSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.getInterestTags.execute(
        requirePrincipal(request),
      );
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply.code(200).send({ interestTags: result.value });
    },
  );

  app.get(
    "/v1/me/interests",
    { schema: getOwnInterestsSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.getOwnInterests.execute(
        requirePrincipal(request),
      );
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply.code(200).send({ interests: interestsResponse(result.value) });
    },
  );

  app.put<{ Body: ReplaceOwnInterestsBody }>(
    "/v1/me/interests",
    { schema: replaceOwnInterestsSchema, onRequest: authenticate },
    async (request, reply) => {
      const result = await dependencies.replaceOwnInterests.execute({
        principal: requirePrincipal(request),
        interestTagIds: request.body.interestTagIds,
        expectedRevision: request.body.expectedRevision,
      });
      if (!result.ok) return sendFailure(request, reply, result.failure);
      return reply.code(200).send({ interests: interestsResponse(result.value) });
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
    ...(checkIn.location === undefined ? {} : {location:checkIn.location}),
    ...(checkIn.weather === undefined ? {} : {weather:checkIn.weather}),
    checkInId: checkIn.checkInId,
    ...(checkIn.revision === undefined ? {} : { revision: checkIn.revision }),
    note: checkIn.note,
    ...(checkIn.mood === undefined ? {} : {mood:checkIn.mood}),
    ...(checkIn.activity === undefined ? {} : {activity:checkIn.activity}),
    createdAt: checkIn.createdAt,
    ...(checkIn.checkInVisibility === undefined ? {} : { checkInVisibility: checkIn.checkInVisibility }),
  };
}

function interestsResponse(
  interests: OwnInterestsProjection,
): OwnInterestsProjection {
  return {
    interestTags: interests.interestTags.map((tag) => ({
      interestTagId: tag.interestTagId,
      displayName: tag.displayName,
      lifecycleState: tag.lifecycleState,
    })),
    revision: interests.revision,
  };
}
