import type { FastifyInstance } from "fastify";
import type { RecommendEvents } from "../application/recommend-events.js";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate, requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure, sendFailureCode } from "../../transport/error-response.js";
import { recommendEventsSchema } from "./schemas.js";

export async function registerEventRecommendationRoute(app: FastifyInstance, dependencies: {
  readonly identityVerifier: IdentityVerifier;
  readonly recommendEvents: Pick<RecommendEvents, "execute">;
}): Promise<void> {
  app.get<{ Querystring: { readonly view: "home" | "all" } }>("/v1/recommendations/events", {
    schema: recommendEventsSchema,
    onRequest: [buildAuthenticate(dependencies.identityVerifier), async (request, reply) => {
      // Inspect multiplicity before AJV coercion: duplicate values never become valid.
      const query = new URL(request.raw.url ?? "", "http://localhost").searchParams;
      const values = query.getAll("view");
      if ([...query.keys()].some((key) => key !== "view") || values.length !== 1 ||
          (values[0] !== "home" && values[0] !== "all")) {
        return sendFailureCode(request, reply, "REQUEST_INVALID");
      }
      // Body is not an approved input. Do not broaden the query-only 400 code.
      if (Number(request.headers["content-length"] ?? 0) > 0 ||
          request.headers["transfer-encoding"] !== undefined) {
        return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
      }
    }],
  }, async (request, reply) => {
    const result = await dependencies.recommendEvents.execute({
      principal: requirePrincipal(request), view: request.query.view,
    });
    if (!result.ok) return sendFailure(request, reply, result.failure);
    return reply.code(200).send({
      asOf: result.value.asOf, formulaVersion: result.value.formulaVersion,
      items: result.value.items.map((item) => ({
        eventId: item.eventId, title: item.title, startAt: item.startAt, endAt: item.endAt,
        matchedInterests: item.matchedInterests.map((tag) => ({
          interestTagId: tag.interestTagId, displayName: tag.displayName,
        })), reasonCode: "interest_match",
      })),
    });
  });
}
