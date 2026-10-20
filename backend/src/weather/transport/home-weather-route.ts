import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate,requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure,sendFailureCode } from "../../transport/error-response.js";
import { errorEnvelopeSchema } from "../../transport/schemas.js";
import { weatherRequestSchema,weatherProjectionSchema } from "./schemas.js";
import type { HomeWeather } from "../application/home-weather.js";
export const homeWeatherSchema={
  querystring:{type:"object",additionalProperties:false,properties:{}},body:weatherRequestSchema,
  response:{200:{type:"object",additionalProperties:false,required:["weather"],properties:{weather:weatherProjectionSchema}},
    ...Object.fromEntries([400,401,403,409,412,503].map(code=>[code,errorEnvelopeSchema]))},
};
export async function registerHomeWeather(app:FastifyInstance,identity:IdentityVerifier,weather:HomeWeather){
  await app.register(async scope=>{
    if(!scope.hasRequestDecorator("authPrincipal"))scope.decorateRequest("authPrincipal",null);
    scope.addHook("onSend",async(_request,reply,payload)=>{reply.header("Cache-Control","no-store");return payload;});
    scope.setErrorHandler((error,request,reply)=>sendFailureCode(request,reply,
      (error as {validation?:unknown}).validation?"REQUEST_INVALID":"SERVICE_UNAVAILABLE"));
    scope.post<{Body:{position:unknown;expectedSettingsRevision:number}}>("/v1/me/home-weather",
      {onRequest:buildAuthenticate(identity),schema:homeWeatherSchema},async(request,reply)=>{
        const result=await weather.current(requirePrincipal(request),request.body);
        return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);
      });
  });
}
