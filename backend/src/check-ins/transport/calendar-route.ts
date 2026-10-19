import type {FastifyInstance}from 'fastify';
import type {IdentityVerifier}from '../../shared/ports/identity-verifier.js';
import {buildAuthenticate,requirePrincipal}from '../../transport/authenticate.js';
import {sendFailure}from '../../transport/error-response.js';
import {errorEnvelopeSchema}from '../../transport/schemas.js';
import type {OwnCheckInCalendar}from '../application/check-in-calendar.js';
export const calendarSchema={
 querystring:{type:'object',additionalProperties:false,required:['month','timeZone'],properties:{month:{type:'string'},timeZone:{type:'string'}}},
 response:{200:{type:'object',additionalProperties:false,required:['month','timeZone','days'],properties:{month:{type:'string'},timeZone:{type:'string'},days:{type:'array',minItems:28,maxItems:31,items:{type:'object',additionalProperties:false,required:['date','count'],properties:{date:{type:'string'},count:{type:'integer',minimum:0}}}}}},...Object.fromEntries([400,401,403,409,503].map(code=>[code,errorEnvelopeSchema]))}
};
export async function registerCheckInCalendar(app:FastifyInstance,identity:IdentityVerifier,calendar:OwnCheckInCalendar){
 app.get<{Querystring:{month:string;timeZone:string}}>('/v1/me/check-ins/calendar',{onRequest:buildAuthenticate(identity),schema:structuredClone(calendarSchema)},async(request,reply)=>{
  const result=await calendar.execute({...request.query,principal:requirePrincipal(request)});
  return result.ok?reply.send(result.value):sendFailure(request,reply,result.failure);
 });
}
