import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate,requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure,sendFailureCode } from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
import type { FriendActivity,ActivityCategory } from "../ports/friend-activity.js";
const types=["check_in_created","event_interested","event_going"];
const common={sourceRecordId:{type:"string",minLength:1,maxLength:128},
  occurredAt:{type:"string",format:"date-time"},username:{type:"string"},
  displayName:{anyOf:[{type:"string"},{type:"null"}]}};
const required=["type","sourceRecordId","occurredAt","username","displayName"];
export const activityItemSchema={oneOf:[
  {type:"object",additionalProperties:false,required:[...required,"checkIn"],properties:{...common,
    type:{const:"check_in_created"},checkIn:{type:"object",additionalProperties:false,required:["note"],properties:{
      note:{type:"string"},mood:{type:"string",minLength:1,maxLength:50}}}}},
  {type:"object",additionalProperties:false,required:[...required,"event"],properties:{...common,
    type:{enum:["event_interested","event_going"]},event:{type:"object",additionalProperties:false,required:["eventId","title"],properties:{
      eventId:{type:"string",pattern:"^(?:tm_event_[0-9a-f]{64}|(?!tm_)[A-Za-z0-9_-]{1,128})(?![\\s\\S])"},title:{type:"string",minLength:1,maxLength:500}}}}}
]};
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
