import { area } from "../../recommendation-profile/domain/areas.js";
import { eventPresentation } from "../../event-detail/domain/event-content.js";
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
  app.get<{ Querystring: { readonly view: "home" | "all"; readonly activityAreaCode?:string } }>("/v1/recommendations/events", {
    schema: recommendEventsSchema,
    onRequest: [async (_request, reply) => { reply.header("Cache-Control", "no-store"); }, buildAuthenticate(dependencies.identityVerifier), async (request, reply) => {
      // Inspect multiplicity before AJV coercion: duplicate values never become valid.
      const query = new URL(request.raw.url ?? "", "http://localhost").searchParams;
      const values = query.getAll("view");
      if(query.getAll("activityAreaCode").length>1||(query.has("activityAreaCode")&&!area(query.get("activityAreaCode"))))return sendFailureCode(request,reply,"REQUEST_INVALID");
      if ([...query.keys()].some((key) => !["view","activityAreaCode"].includes(key)) || values.length !== 1 ||
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
      principal: requirePrincipal(request), view: request.query.view, legacyClient: request.headers["x-enmori-contract-version"] !== "3",...(request.query.activityAreaCode?{activityAreaCode:request.query.activityAreaCode}:{}),
    });
    if (!result.ok) return sendFailure(request, reply, result.failure);
    return reply.code(200).send({
      asOf: result.value.asOf, formulaVersion: result.value.formulaVersion,
      ...(request.headers["x-enmori-contract-version"]==="3" && result.value.formulaVersion==="event_recommendation_v3" && result.value.sourceStatus!==undefined
        ? {sourceStatus:result.value.sourceStatus.map(({provider,available})=>({provider,available}))} : {}),
      ...(request.headers["x-enmori-contract-version"]==="3" && result.value.formulaVersion==="event_recommendation_v3" &&
        result.value.sourceStatus?.some(status=>status.provider==='onepa'&&status.available) && result.value.sourceCoverage!==undefined
        ? {sourceCoverage:result.value.sourceCoverage.map(({provider,complete})=>({provider,complete}))} : {}),
      items: result.value.items.map((item) => ({
        ...eventPresentation(item), eventId: item.eventId, title: item.title, startAt: item.startAt, ...(item.endAt === undefined ? {} : { endAt: item.endAt }),
        matchedInterests: item.matchedInterests.map((tag) => ({
          interestTagId: tag.interestTagId, displayName: tag.displayName,
        })), reasonCode: result.value.formulaVersion!=="event_recommendation_v1"?"relevance_match":"interest_match",
        ...(item.reasons?{reasons:item.reasons.map(({code,count,points})=>({code,count,points}))}:{}),
      })),
    });
  });
}
