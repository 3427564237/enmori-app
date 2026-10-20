import type { FastifyInstance } from 'fastify';
import type { EditCheckIn } from '../application/edit-check-in.js';
import type { IdentityVerifier } from '../../shared/ports/identity-verifier.js';
import { buildAuthenticate, requirePrincipal } from '../../transport/authenticate.js';
import { sendFailure } from '../../transport/error-response.js';
import { checkInSchema, errorEnvelopeSchema } from '../../transport/schemas.js';
import { positionSchema } from '../../weather/transport/schemas.js';
import type { Position } from '../../weather/domain/weather.js';

const revision = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER - 1 };
const params = { type: 'object', additionalProperties: false, required: ['checkInId'], properties: { checkInId: { type: 'string', minLength: 1 } } };
const querystring = { type: 'object', additionalProperties: false, properties: {} };
const failures = Object.fromEntries([400, 401, 403, 404, 409, 412, 503].map(code => [code, errorEnvelopeSchema]));
export const updateCheckInSchema = { params, querystring,
  body: { type: 'object', additionalProperties: false, required: ['note', 'checkInVisibility', 'expectedRevision'], properties: {
    location:{anyOf:[positionSchema,{type:'null'}]},removeWeather:{type:'boolean'},
    mood: {anyOf:[{type:'string',maxLength:50},{type:'null'}]}, activity: {anyOf:[{type:'string',maxLength:50},{type:'null'}]},
    note: { type: 'string' }, checkInVisibility: { type: 'string', enum: ['private', 'friends_only', 'public'] }, expectedRevision: revision } },
  response: { 200: { type: 'object', additionalProperties: false, required: ['checkIn'], properties: { checkIn: checkInSchema } }, ...failures } };
export const deleteCheckInSchema = { params, querystring,
  body: { type: 'object', additionalProperties: false, required: ['expectedRevision'], properties: { expectedRevision: revision } },
  response: { 200: { type: 'object', additionalProperties: false, required: ['deleted'], properties: { deleted: { const: true } } }, ...failures } };
export async function registerCheckInMutations(app: FastifyInstance, identity: IdentityVerifier, edits: EditCheckIn) {
  const onRequest = buildAuthenticate(identity);
  app.put<{ Params: {checkInId:string}; Body: {location?:Position|null;removeWeather?:boolean;mood?:string|null;activity?:string|null;note:string; checkInVisibility:string; expectedRevision:number} }>('/v1/check-ins/:checkInId',
    { onRequest, schema: structuredClone(updateCheckInSchema) }, async (request, reply) => {
      const result = await edits.update({ ...request.body, checkInId: request.params.checkInId, principal: requirePrincipal(request) });
      return result.ok ? reply.send({checkIn:result.value}) : sendFailure(request, reply, result.failure);
    });
  app.delete<{ Params: {checkInId:string}; Body: {expectedRevision:number} }>('/v1/check-ins/:checkInId',
    { onRequest, schema: structuredClone(deleteCheckInSchema) }, async (request, reply) => {
      const result = await edits.remove({ ...request.body, checkInId: request.params.checkInId, principal: requirePrincipal(request) });
      return result.ok ? reply.send({deleted:true}) : sendFailure(request, reply, result.failure);
    });
}
