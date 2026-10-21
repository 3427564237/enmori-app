import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate,requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure,sendFailureCode } from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
import type { FriendSummary } from "../ports/friend-summary.js";
export const friendSummarySchema={querystring:{type:"object",additionalProperties:false,properties:{}},response:{
  200:{type:"object",additionalProperties:false,required:["pendingRequestCount"],properties:{pendingRequestCount:{type:"integer",minimum:0,maximum:999}}},
  ...Object.fromEntries([400,401,403,409,503].map(code=>[code,errorEnvelopeSchema]))}};
export async function registerFriendSummary(app:FastifyInstance,identity:IdentityVerifier,summary:FriendSummary){
  await app.register(async scope=>{
    if(!scope.hasRequestDecorator("authPrincipal"))scope.decorateRequest("authPrincipal",null);
    scope.addHook("onSend",async(_request,reply,payload)=>{reply.header("Cache-Control","no-store");return payload;});
    scope.setErrorHandler((error,request,reply)=>sendFailureCode(request,reply,
      (error as {validation?:unknown}).validation?"REQUEST_INVALID":"SERVICE_UNAVAILABLE"));
    scope.get("/v1/me/friends/summary",{onRequest:buildAuthenticate(identity),schema:friendSummarySchema},async(request,reply)=>{
      const result=await summary.pendingCount(requirePrincipal(request).firebaseUid);return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);
    });
  });
}
