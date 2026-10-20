import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate,requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure,sendFailureCode } from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
import type { FriendRecommendations } from "../ports/friend-recommendations.js";
export const friendSuggestionSchema={
  type:"object",additionalProperties:false,
  required:["username","displayName","sharedInterests","commonEventCount","reason","ignoreVersion"],
  properties:{username:{type:"string"},displayName:{anyOf:[{type:"string"},{type:"null"}]},
    sharedInterests:{type:"array",maxItems:10,items:{type:"string"}},
    commonEventCount:{type:"integer",minimum:0,maximum:2000},reason:{type:"string"},ignoreVersion:{type:"string",pattern:"^[a-f0-9]{64}$"}},
};
export const friendRecommendationsSchema={
  querystring:{type:"object",additionalProperties:false,required:["view"],properties:{view:{enum:["home","all"]}}},
  response:{200:{type:"object",additionalProperties:false,required:["suggestions"],
    properties:{suggestions:{type:"array",maxItems:999,items:friendSuggestionSchema}}},
    ...Object.fromEntries([400,401,403,409,503].map(code=>[code,errorEnvelopeSchema]))},
};
export async function registerFriendRecommendations(app:FastifyInstance,identity:IdentityVerifier,recommendations:FriendRecommendations){
  await app.register(async scope=>{
    if(!scope.hasRequestDecorator("authPrincipal"))scope.decorateRequest("authPrincipal",null);
    scope.addHook("onSend",async(_request,reply,payload)=>{reply.header("Cache-Control","no-store");return payload;});
    scope.setErrorHandler((error,request,reply)=>sendFailureCode(request,reply,
      (error as {validation?:unknown}).validation?"REQUEST_INVALID":"SERVICE_UNAVAILABLE"));
    scope.get<{Querystring:{view:"home"|"all"}}>("/v1/recommendations/friends",{onRequest:buildAuthenticate(identity),schema:friendRecommendationsSchema},
      async(request,reply)=>{const result=await recommendations.recommend(requirePrincipal(request).firebaseUid,request.query.view);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);});
  });
}
