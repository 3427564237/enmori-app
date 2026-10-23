import { errorEnvelopeSchema } from '../../transport/schemas.js';
const text={type:'string'} as const;
const revision={type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER} as const;
export const participationSchema={type:'object',additionalProperties:false,required:['eventId','status','ignored','revision'],properties:{
  eventId:text,status:{enum:['none','interested','going']},ignored:{type:'boolean'},revision,updatedAt:{type:'string',format:'date-time'},
}} as const;
export const changeSchema={type:'object',additionalProperties:false,required:['status','ignored','expectedRevision'],properties:{status:text,ignored:{type:'boolean'},expectedRevision:{type:'number'}}} as const;
export const participantPageSchema={type:'object',additionalProperties:false,required:['items','countState'],properties:{
  items:{type:'array',maxItems:20,items:{type:'object',additionalProperties:false,required:['username'],properties:{username:text,displayName:text}}},
  nextCursor:text,countState:{enum:['exact','unavailable']},visibleCount:{type:'integer',minimum:0,maximum:200},
}} as const;
export const ownPageSchema={type:'object',additionalProperties:false,required:['items'],properties:{items:{type:'array',maxItems:20,items:participationSchema},nextCursor:text}} as const;
export const publicPageSchema={type:'object',additionalProperties:false,required:['items'],properties:{items:{type:'array',maxItems:20,items:{type:'object',additionalProperties:false,required:['eventId','status'],properties:{eventId:text,status:{enum:['interested','going']}}}},nextCursor:text}} as const;
export const participationResponse={type:'object',additionalProperties:false,required:['participation'],properties:{participation:participationSchema}} as const;
export const participationResponses=(success:unknown)=>({200:success,...Object.fromEntries([400,401,403,404,409,412,422,503].map(s=>[s,errorEnvelopeSchema]))});
