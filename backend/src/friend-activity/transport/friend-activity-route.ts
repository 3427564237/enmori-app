import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate,requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure,sendFailureCode } from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
import type { FriendActivity,ActivityCategory } from "../ports/friend-activity.js";
const types=["check_in_created","event_interested","event_going"];
export const activityItemSchema={
  type:"object",additionalProperties:false,
  required:["type","sourceRecordId","occurredAt","username","displayName"],
  properties:{type:{enum:types},sourceRecordId:{type:"string"},
    occurredAt:{type:"string",format:"date-time"},username:{type:"string"},
    displayName:{anyOf:[{type:"string"},{type:"null"}]}},
};
export const friendActivitySchema={
  querystring:{type:"object",additionalProperties:false,required:["view","category"],
    properties:{view:{enum:["home","all"]},category:{enum:["all",...types]}}},
  response:{
    200:{type:"object",additionalProperties:false,required:["activities"],
      properties:{activities:{type:"array",items:activityItemSchema}}},
    ...Object.fromEntries([400,401,403,409,503].map(code=>[code,errorEnvelopeSchema])),
  },
};
export async function registerFriendActivity(app:FastifyInstance,identity:IdentityVerifier,activity:FriendActivity){
  await app.register(async scope=>{
    if(!scope.hasRequestDecorator("authPrincipal"))scope.decorateRequest("authPrincipal",null);
    scope.addHook("onSend",async(_request,reply,payload)=>{reply.header("Cache-Control","no-store");return payload;});
    scope.setErrorHandler((error,request,reply)=>sendFailureCode(request,reply,
      (error as {validation?:unknown}).validation?"REQUEST_INVALID":"SERVICE_UNAVAILABLE"));
    scope.get<{Querystring:{view:"home"|"all";category:ActivityCategory}}>("/v1/me/friends/activity",
      {onRequest:buildAuthenticate(identity),schema:friendActivitySchema},async(request,reply)=>{
        const result=await activity.read(requirePrincipal(request).firebaseUid,request.query.view,request.query.category);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);
      });
  });
}
