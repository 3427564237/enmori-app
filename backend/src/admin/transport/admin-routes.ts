import type { FastifyInstance } from 'fastify';
import type { IdentityVerifier } from '../../shared/ports/identity-verifier.js';
import type { AdminOperations } from '../application/admin-operations.js';
import { buildAuthenticate, requirePrincipal } from '../../transport/authenticate.js';
import { sendFailure, sendFailureCode } from '../../transport/error-response.js';
import { errorEnvelopeSchema } from '../../transport/schemas.js';

const text = {type: 'string'}, instant = {type:'string',format:'date-time'};
const revision = {type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER};
const object = (properties: object, required: readonly string[]) => ({type:'object',additionalProperties:false,properties,required});
const empty = object({}, []);
export const managedCategorySchema = object({eventCategoryId:text,displayName:text,lifecycleState:{type:'string',enum:['active','inactive']}}, ['eventCategoryId','displayName','lifecycleState']);
const category = object({...managedCategorySchema.properties,revision}, ['eventCategoryId','displayName','lifecycleState','revision']);
const classification = object({eventId:text,revision:{...revision,minimum:0},...managedCategorySchema.properties}, ['eventId','revision']);
const record = object({recordId:text,occurredAt:instant,expiresAt:instant,actorAdminUid:text,targetType:{type:'string',enum:['interest_tag','event_category','event_category_assignment']},targetId:text,
  operation:{type:'string',enum:['create','rename','deactivate','restore','assign','clear']},beforeRevision:{...revision,minimum:0},afterRevision:revision,result:{const:'committed'}},
  ['recordId','occurredAt','expiresAt','actorAdminUid','targetType','targetId','operation','afterRevision','result']);
const service = object({service:{type:'string',enum:['backend','firebase','ai','ticketmaster','onepa']},configured:{type:'boolean'},state:{type:'string',enum:['ready','unavailable','unknown','disabled']},lastObservedAt:instant,lastSucceededAt:instant,
  reason:{type:'string',enum:['not_configured','not_observed','stale_observation','dependency_unavailable','maintenance_unavailable']}}, ['service','configured','state']);
const response = (status: number, schema: object) => ({[status]:schema,...Object.fromEntries([400,401,403,404,409,412,422,503].map(s=>[s,errorEnvelopeSchema]))});
export const adminSchemas = {
  status: {querystring:empty,response:response(200,object({observedAt:instant,services:{type:'array',items:service,minItems:5,maxItems:5}},['observedAt','services']))},
  categories: {querystring:empty,response:response(200,object({eventCategories:{type:'array',items:category}},['eventCategories']))},
  create: {querystring:empty,body:object({displayName:text},['displayName']),response:response(201,object({eventCategory:category},['eventCategory']))},
  change: {querystring:empty,params:object({eventCategoryId:{type:'string',minLength:1,maxLength:64}},['eventCategoryId']),
    body:{...object({expectedRevision:revision,displayName:text,lifecycleState:{type:'string',enum:['active','inactive']}},['expectedRevision']),oneOf:[{required:['displayName'],not:{required:['lifecycleState']}},{required:['lifecycleState'],not:{required:['displayName']}}]},response:response(200,object({eventCategory:category},['eventCategory']))},
  classification: {querystring:empty,params:object({eventId:{type:'string',minLength:1,maxLength:174}},['eventId']),response:response(200,classification)},
  assign: {querystring:empty,params:object({eventId:{type:'string',minLength:1,maxLength:174}},['eventId']),body:object({expectedRevision:{...revision,minimum:0},eventCategoryId:{type:'string',minLength:1,maxLength:64}},['expectedRevision']),response:response(200,classification)},
  records: {querystring:object({cursor:{type:'string',minLength:1,maxLength:256}},[]),response:response(200,object({records:{type:'array',items:record,maxItems:50},nextCursor:text},['records']))},
};
export async function registerAdminOperations(app: FastifyInstance, identity: IdentityVerifier, operations: AdminOperations) {
  const auth = buildAuthenticate(identity);
  const options = {onRequest: async (r: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {reply.header('Cache-Control','no-store');await auth(r,reply);},
    errorHandler: (error: {statusCode?:number}, r: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => sendFailureCode(r,reply,[400,413,415].includes(error.statusCode ?? 0)?'REQUEST_INVALID':'SERVICE_UNAVAILABLE')};
  const noBody = (r: import('fastify').FastifyRequest) => r.body !== undefined || Number(r.headers['content-length']??0)!==0 || r.headers['transfer-encoding']!==undefined;
  app.get('/v1/admin/operations-status',{...options,exposeHeadRoute:false,schema:adminSchemas.status},async(r,reply)=>{
    if(noBody(r))return sendFailureCode(r,reply,'REQUEST_INVALID');
    const result=await operations.status(requirePrincipal(r));return result.ok?reply.send(result.value):sendFailure(r,reply,result.failure);
  });
  app.get('/v1/admin/event-categories',{...options,exposeHeadRoute:false,schema:adminSchemas.categories},async(r,reply)=>{
    if(noBody(r))return sendFailureCode(r,reply,'REQUEST_INVALID');
    const result=await operations.categories(requirePrincipal(r));return result.ok?reply.send({eventCategories:result.value}):sendFailure(r,reply,result.failure);
  });
  app.post<{Body:{displayName:string}}>('/v1/admin/event-categories',{...options,bodyLimit:4096,schema:adminSchemas.create},async(r,reply)=>{
    const result=await operations.create(requirePrincipal(r),r.body.displayName);return result.ok?reply.code(201).send({eventCategory:result.value}):sendFailure(r,reply,result.failure);
  });
  app.patch<{Params:{eventCategoryId:string};Body:{expectedRevision:number;displayName?:string;lifecycleState?:'active'|'inactive'}}>('/v1/admin/event-categories/:eventCategoryId',{...options,bodyLimit:4096,schema:adminSchemas.change},async(r,reply)=>{
    const result=await operations.change(requirePrincipal(r),r.params.eventCategoryId,r.body);return result.ok?reply.send({eventCategory:result.value}):sendFailure(r,reply,result.failure);
  });
  app.get<{Params:{eventId:string}}>('/v1/admin/events/:eventId/category',{...options,exposeHeadRoute:false,schema:adminSchemas.classification},async(r,reply)=>{
    if(noBody(r))return sendFailureCode(r,reply,'REQUEST_INVALID');
    const result=await operations.classification(requirePrincipal(r),r.params.eventId);return result.ok?reply.send(result.value):sendFailure(r,reply,result.failure);
  });
  app.put<{Params:{eventId:string};Body:{expectedRevision:number;eventCategoryId?:string}}>('/v1/admin/events/:eventId/category',{...options,bodyLimit:4096,schema:adminSchemas.assign},async(r,reply)=>{
    const result=await operations.assign(requirePrincipal(r),r.params.eventId,r.body);return result.ok?reply.send(result.value):sendFailure(r,reply,result.failure);
  });
  app.get<{Querystring:{cursor?:string}}>('/v1/admin/operation-records',{...options,exposeHeadRoute:false,schema:adminSchemas.records},async(r,reply)=>{
    if(noBody(r))return sendFailureCode(r,reply,'REQUEST_INVALID');
    const result=await operations.records(requirePrincipal(r),r.query.cursor);return result.ok?reply.send(result.value):sendFailure(r,reply,result.failure);
  });
}
