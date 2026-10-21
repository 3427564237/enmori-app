import type { FastifyInstance } from 'fastify';
import { buildAuthenticate, requirePrincipal } from '../../transport/authenticate.js';
import { sendFailure, sendFailureCode } from '../../transport/error-response.js';
import type { IdentityVerifier } from '../../shared/ports/identity-verifier.js';
import type { ParticipationChange } from '../ports/participation-repository.js';
import type { ParticipationOperations } from '../application/participation-operations.js';
import { changeSchema, participationResponse, participantPageSchema, ownPageSchema, publicPageSchema, participationResponses } from './schemas.js';

export async function registerParticipationRoutes(app:FastifyInstance,identity:IdentityVerifier,repository:ParticipationOperations):Promise<void>{
  await app.register(async feature=>{
    if(!feature.hasRequestDecorator('authPrincipal'))feature.decorateRequest('authPrincipal',null);
    const authenticate=buildAuthenticate(identity);
    feature.setErrorHandler((error,request,reply)=>sendFailureCode(request,reply,
      (error as {validation?:unknown;statusCode?:number}).validation || (error as {statusCode?:number}).statusCode===400?'REQUEST_INVALID':'SERVICE_UNAVAILABLE'));
    feature.addHook('onRequest',async(request,reply)=>{
      reply.header('Cache-Control','no-store');await authenticate(request,reply);if(reply.sent)return;
      const result=await repository.authorize(requirePrincipal(request).firebaseUid);
      if(!result.ok)return sendFailure(request,reply,result.failure);
    });
    feature.addHook('preValidation',async(request,reply)=>{
      if(request.headers['idempotency-key']!==undefined)return sendFailureCode(request,reply,'REQUEST_INVALID');
      const keys=request.url.split('?')[0]?.endsWith('/participants')?['status','group','cursor']:['cursor'];
      const query=request.query as Record<string,unknown>;
      const write=request.method==='PUT',body=request.body;
      if(Object.keys(query??{}).some(k=>!keys.includes(k))||Object.values(query??{}).some(v=>typeof v!=='string')||
        write&&(typeof body!=='object'||body===null||Array.isArray(body)||Object.keys(body).some(k=>!['status','ignored','expectedRevision'].includes(k))))return sendFailureCode(request,reply,'REQUEST_INVALID');
      if(!write&&body!==undefined)return sendFailureCode(request,reply,'REQUEST_INVALID');
      if(write){const value=body as Record<string,unknown>;if(typeof value.status!=='string'||typeof value.ignored!=='boolean'||typeof value.expectedRevision!=='number')return sendFailureCode(request,reply,'REQUEST_INVALID');}
      if(request.url.split('?')[0]?.endsWith('/participation')&&Object.keys(query??{}).length!==0)return sendFailureCode(request,reply,'REQUEST_INVALID');
    });
    feature.get<{Params:{eventId:string}}>('/v1/events/:eventId/participation',{schema:{response:participationResponses(participationResponse)}},async(req,reply)=>{
      const r=await repository.read(requirePrincipal(req).firebaseUid,req.params.eventId);return r.ok?reply.send({participation:r.value}):sendFailure(req,reply,r.failure);
    });
    feature.put<{Params:{eventId:string};Body:ParticipationChange}>('/v1/events/:eventId/participation',{schema:{body:changeSchema,response:participationResponses(participationResponse)}},async(req,reply)=>{
      const r=await repository.save(requirePrincipal(req).firebaseUid,req.params.eventId,req.body);return r.ok?reply.send({participation:r.value}):sendFailure(req,reply,r.failure);
    });
    feature.get<{Params:{eventId:string};Querystring:{status:'interested'|'going';group:'friends'|'others';cursor?:string}}>('/v1/events/:eventId/participants',{schema:{querystring:{type:'object',additionalProperties:false,required:['status','group'],properties:{status:{type:'string'},group:{type:'string'},cursor:{type:'string'}}},response:participationResponses(participantPageSchema)}},async(req,reply)=>{
      const q=req.query,r=await repository.participants(requirePrincipal(req).firebaseUid,req.params.eventId,q.status,q.group,q.cursor);return r.ok?reply.send(r.value):sendFailure(req,reply,r.failure);
    });
    for(const isOwn of [true,false])feature.get<{Params:{username?:string};Querystring:{cursor?:string}}>(isOwn?'/v1/me/event-participations':'/v1/users/:username/event-participations',{schema:{response:participationResponses(isOwn?ownPageSchema:publicPageSchema)}},async(req,reply)=>{
      const r=await repository.list(requirePrincipal(req).firebaseUid,isOwn?undefined:req.params.username,req.query.cursor);return r.ok?reply.send(r.value):sendFailure(req,reply,r.failure);
    });
  });
}
