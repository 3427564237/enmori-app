import type { FastifyInstance, FastifySchema } from "fastify";
import type { IdentityVerifier } from "../shared/ports/identity-verifier.js";
import type { FriendRequests } from "../friends/application/friend-requests.js";
import type { GetEventDetail } from "../event-detail/application/get-event-detail.js";
import type { ListOwnCheckInsForDate } from "../check-ins/application/check-in-history.js";
import { decodeFriendCursor, isRequestRef } from "../friends/domain/request-reference.js";
import { buildAuthenticate, requirePrincipal } from "./authenticate.js";
import { sendFailure, sendFailureCode } from "./error-response.js";
import { errorEnvelopeSchema, getCheckInHistorySchema } from "./schemas.js";
export const targetSchema = { type: "object", additionalProperties: false, required: ["username","displayName","relationshipState"], properties: {
  username: { type: "string" }, displayName: { type: "string" }, relationshipState: { type: "string", enum: ["self","already_friends","outgoing_request_pending","incoming_request_pending","can_send_request"] } } } as const;
export const eventDetailSchema = { type: "object", additionalProperties: false, required: ["eventId","title","startAt","externalSourceUrl"], properties: {
  eventId: { type: "string", minLength: 1 }, title: { type: "string", minLength: 1, maxLength: 200 }, startAt: { type: "string" }, externalSourceUrl: { type: "string", maxLength: 2048 }, endAt: { type: "string" },
  locationLabel: { type: "string", minLength: 1, maxLength: 200 }, categoryLabel: { type: "string", minLength: 1, maxLength: 100 }, shortDescription: { type: "string", minLength: 1, maxLength: 1000 } } } as const;
export const friendInboxSchema = { type: "object", additionalProperties: false, required: ["requests","nextCursor"], properties: {
  requests: { type: "array", maxItems: 20, items: { type: "object", additionalProperties: false, required: ["username","displayName","requestRef"], properties: { username: { type:"string" }, displayName: { type:"string" }, requestRef: { type:"string" } } } }, nextCursor: { anyOf: [{type:"string"},{type:"null"}] } } } as const;
export const friendActionSchema = { type: "object", additionalProperties: false, required: ["result"], properties: { result: { type:"string", enum:["accepted","declined"] } } } as const;
export const myFriendsSchema = { type: "object", additionalProperties: false, required: ["friends", "nextCursor"], properties: {
  friends: { type: "array", maxItems: 20, items: { type: "object", additionalProperties: false, required: ["username", "displayName"], properties: { username: { type: "string" }, displayName: { type: "string" } } } },
  nextCursor: { anyOf: [{ type: "string" }, { type: "null" }] } } } as const;
function responses(success: unknown) { return { 200: success, 400:errorEnvelopeSchema,401:errorEnvelopeSchema,403:errorEnvelopeSchema,404:errorEnvelopeSchema,409:errorEnvelopeSchema,503:errorEnvelopeSchema }; }
const emptyQuery = { type:"object", additionalProperties:false, properties:{} };
export async function registerIsolatedSlices(app: FastifyInstance, identity: IdentityVerifier, friends?: FriendRequests, events?: GetEventDetail, checkInHistory?: Pick<ListOwnCheckInsForDate, "execute">): Promise<void> {
  const authenticate = buildAuthenticate(identity);
  if (friends !== undefined) {
    app.get<{Querystring:{cursor?:string}}>("/v1/me/friends", {onRequest:authenticate, schema:{querystring:{type:"object",additionalProperties:false,properties:{cursor:{type:"string"}}},response:{200:myFriendsSchema,400:errorEnvelopeSchema,401:errorEnvelopeSchema,403:errorEnvelopeSchema,409:errorEnvelopeSchema,503:errorEnvelopeSchema}}}, async(request,reply) => {
      const params = new URL(request.url, "http://localhost").searchParams;
      if ([...params.keys()].some(key => key !== "cursor") || params.getAll("cursor").length > 1 ||
        (request.query.cursor !== undefined && decodeFriendCursor(request.query.cursor) === undefined)) return sendFailureCode(request,reply,"REQUEST_INVALID");
      const result = await friends.listFriends(requirePrincipal(request),request.query.cursor);
      return result.ok ? reply.send(result.value) : sendFailure(request,reply,result.failure);
    });
    for (const [path, send] of [["/v1/friends/lookup", false], ["/v1/friend-requests", true]] as const) {
      const schema: FastifySchema = { querystring:emptyQuery, body: { type:"object", additionalProperties:false, required:["username"], properties:{username:{type:"string"}} }, response: responses({ type:"object", additionalProperties:false, required:["target"], properties:{target:targetSchema} }) };
      app.post<{Body:{username:string}}>(path, {onRequest:authenticate, schema}, async (request,reply) => {
        const result = await friends.lookup(requirePrincipal(request),request.body.username,send);
        return result.ok ? reply.send({target:result.value}) : sendFailure(request,reply,result.failure);
      });
    }
    app.get<{Querystring:{cursor?:string}}>("/v1/me/friend-requests", {onRequest:authenticate, schema:{querystring:{type:"object",additionalProperties:false,properties:{cursor:{type:"string"}}},response:responses(friendInboxSchema)}}, async(request,reply) => {
      if (request.query.cursor !== undefined && decodeFriendCursor(request.query.cursor) === undefined) return sendFailureCode(request,reply,"REQUEST_INVALID");
      const result = await friends.inbox(requirePrincipal(request),request.query.cursor);
      return result.ok ? reply.send(result.value) : sendFailure(request,reply,result.failure);
    });
    for (const action of ["accept","decline"] as const) {
      app.post<{Params:{requestRef:string}}>(`/v1/friend-requests/:requestRef/${action}`, {onRequest:authenticate,schema:{querystring:emptyQuery,params:{type:"object",additionalProperties:false,required:["requestRef"],properties:{requestRef:{type:"string"}}},response:responses(friendActionSchema)}}, async(request,reply) => {
        if (request.body !== undefined) return sendFailureCode(request,reply,"REQUEST_INVALID");
        if (!isRequestRef(request.params.requestRef)) return sendFailureCode(request,reply,"REQUEST_INVALID");
        const result = await friends.act(requirePrincipal(request),request.params.requestRef,action);
        return result.ok ? reply.send(result.value) : sendFailure(request,reply,result.failure);
      });
    }
  }
  if (events !== undefined) app.get<{Params:{eventId:string}}>("/v1/events/:eventId", {onRequest:authenticate,schema:{querystring:emptyQuery,params:{type:"object",additionalProperties:false,required:["eventId"],properties:{eventId:{type:"string",minLength:1}}},response:responses({type:"object",additionalProperties:false,required:["event"],properties:{event:eventDetailSchema}})}}, async(request,reply) => {
    const result = await events.execute(requirePrincipal(request),request.params.eventId);
    return result.ok ? reply.send({event:result.value}) : sendFailure(request,reply,result.failure);
  });
  if (checkInHistory !== undefined) {
    app.get<{ Querystring: { date: string; timeZone: string; cursor?: string } }>(
      "/v1/me/check-ins",
      {
        schema: getCheckInHistorySchema,
        onRequest: [async (_request, reply) => { reply.header("Cache-Control", "no-store"); }, authenticate],
      },
      async (request, reply) => {
        const result = await checkInHistory.execute({
          principal: requirePrincipal(request),
          date: request.query.date,
          timeZone: request.query.timeZone,
          ...(request.query.cursor === undefined ? {} : { cursor: request.query.cursor }),
        });
        if (!result.ok) return sendFailure(request, reply, result.failure);
        return reply.code(200).send({
          checkIns: result.value.checkIns.map(row => ({
            checkInId: row.checkInId,
            note: row.note,
            createdAt: row.createdAt,
            ...(row.checkInVisibility === undefined ? {} : { checkInVisibility: row.checkInVisibility }),
          })),
          nextCursor: result.value.nextCursor,
        });
      },
    );
  }
}
