import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate,requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure,sendFailureCode } from "../../transport/error-response.js";
import { checkInSchema,errorEnvelopeSchema } from "../../transport/schemas.js";
import { positionSchema } from "../../weather/transport/schemas.js";
import type { SocialProfiles } from "../application/social-profile.js";

const nullableText={anyOf:[{type:"string"},{type:"null"}]};
const revision={type:"integer",minimum:0,maximum:Number.MAX_SAFE_INTEGER-1};
const empty={type:"object",additionalProperties:false,properties:{}};
const params={type:"object",additionalProperties:false,required:["username"],properties:{username:{type:"string",minLength:1,maxLength:32}}};
export const socialProfileSchema={type:"object",additionalProperties:false,
  required:["username","displayName","details","relationship","specialCare","friendshipRevision","interests","mapAvailable","participationAvailable"],
  properties:{username:{type:"string"},displayName:nullableText,
    details:{type:"object",additionalProperties:false,required:["bio","affiliationType","affiliationName","region"],
      properties:{bio:nullableText,affiliationType:{anyOf:[{enum:["school","company"]},{type:"null"}]},affiliationName:nullableText,region:nullableText}},
    relationship:{enum:["self","friend","other"]},specialCare:{type:"boolean"},friendshipRevision:revision,
    interests:{type:"array",maxItems:10,items:{type:"object",additionalProperties:false,required:["interestTagId","displayName"],
      properties:{interestTagId:{type:"string"},displayName:{type:"string"}}}},
    mapAvailable:{type:"boolean"},participationAvailable:{type:"boolean"}}};
export const socialRecordsSchema={type:"object",additionalProperties:false,required:["checkIns","nextCursor"],
  properties:{checkIns:{type:"array",maxItems:20,items:checkInSchema},nextCursor:nullableText}};
export const socialMonthSchema={type:"object",additionalProperties:false,required:["month","timeZone","days","points"],
  properties:{month:{type:"string"},timeZone:{type:"string"},days:{type:"array",maxItems:31,items:{
    type:"object",additionalProperties:false,required:["date","count"],properties:{date:{type:"string"},count:{type:"integer",minimum:0}}}},
    points:{type:"array",maxItems:2000,items:{type:"object",additionalProperties:false,required:["checkInId","createdAt","location"],
      properties:{checkInId:{type:"string"},createdAt:{type:"string"},location:positionSchema}}}}};
export const careRequestSchema={type:"object",additionalProperties:false,required:["specialCare","expectedRevision"],
  properties:{specialCare:{type:"boolean"},expectedRevision:revision}};
export const careResponseSchema={type:"object",additionalProperties:false,required:["specialCare","friendshipRevision"],
  properties:{specialCare:{type:"boolean"},friendshipRevision:revision}};
export const removeFriendSchema={type:"object",additionalProperties:false,required:["expectedRevision"],properties:{expectedRevision:revision}};
const responses=(success:unknown)=>({200:success,...Object.fromEntries([400,401,403,404,409,412,503].map(code=>[code,errorEnvelopeSchema]))});
export async function registerSocialRoutes(app:FastifyInstance,identity:IdentityVerifier,profiles:SocialProfiles){
  await app.register(async scope=>{
    if(!scope.hasRequestDecorator("authPrincipal"))scope.decorateRequest("authPrincipal",null);
    const onRequest=buildAuthenticate(identity);
    scope.addHook("onSend",async(_request,reply,payload)=>{reply.header("Cache-Control","no-store");return payload;});
    scope.setErrorHandler((error,request,reply)=>sendFailureCode(request,reply,
      (error as {validation?:unknown}).validation?"REQUEST_INVALID":"SERVICE_UNAVAILABLE"));
    scope.get<{Params:{username:string}}>("/v1/people/:username",{onRequest,schema:{params,querystring:empty,response:responses(socialProfileSchema)}},
      async(request,reply)=>{const result=await profiles.profile(requirePrincipal(request),request.params.username);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);});
    scope.get<{Params:{username:string};Querystring:{date:string;timeZone:string;cursor?:string}}>("/v1/people/:username/check-ins",
      {onRequest,schema:{params,querystring:{type:"object",additionalProperties:false,required:["date","timeZone"],properties:{
        date:{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}$"},timeZone:{type:"string",maxLength:128},cursor:{type:"string",maxLength:4096}}},
        response:responses(socialRecordsSchema)}},async(request,reply)=>{
        const result=await profiles.records(requirePrincipal(request),request.params.username,request.query);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);});
    scope.get<{Params:{username:string;checkInId:string}}>("/v1/people/:username/check-ins/:checkInId",
      {onRequest,schema:{params:{type:"object",additionalProperties:false,required:["username","checkInId"],properties:{
        username:params.properties.username,checkInId:{type:"string",minLength:1,maxLength:128}}},querystring:empty,
        response:responses({type:"object",additionalProperties:false,required:["checkIn"],properties:{checkIn:checkInSchema}})}},
      async(request,reply)=>{const result=await profiles.record(requirePrincipal(request),request.params.username,request.params.checkInId);
        return result.ok?reply.send({checkIn:result.value}):sendFailure(request,reply,result.failure);});
    scope.get<{Params:{username:string};Querystring:{month:string;timeZone:string}}>("/v1/people/:username/calendar-map",
      {onRequest,schema:{params,querystring:{type:"object",additionalProperties:false,required:["month","timeZone"],properties:{
        month:{type:"string",pattern:"^\\d{4}-\\d{2}$"},timeZone:{type:"string",maxLength:128}}},response:responses(socialMonthSchema)}},
      async(request,reply)=>{const result=await profiles.month(requirePrincipal(request),request.params.username,request.query);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);});
    scope.put<{Params:{username:string};Body:{specialCare:boolean;expectedRevision:number}}>("/v1/me/friends/:username/special-care",
      {onRequest,schema:{params,querystring:empty,body:careRequestSchema,response:responses(careResponseSchema)}},
      async(request,reply)=>{const result=await profiles.care(requirePrincipal(request),request.params.username,request.body);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);});
    scope.delete<{Params:{username:string};Body:{expectedRevision:number}}>("/v1/me/friends/:username",
      {onRequest,schema:{params,querystring:empty,body:removeFriendSchema,response:responses({
        type:"object",additionalProperties:false,required:["removed"],properties:{removed:{const:true}}})}},
      async(request,reply)=>{const result=await profiles.remove(requirePrincipal(request),request.params.username,request.body.expectedRevision);
        return result.ok?reply.send({removed:true}):sendFailure(request,reply,result.failure);});
  });
}
