import type { FastifyInstance } from 'fastify';
import type { IdentityVerifier } from '../../shared/ports/identity-verifier.js';
import type { CreateInterestTag } from '../application/create-interest-tag.js';
import type { GetInterestAdminCapability } from '../application/get-interest-admin-capability.js';
import { buildAuthenticate, requirePrincipal } from '../../transport/authenticate.js';
import { sendFailure, sendFailureCode } from '../../transport/error-response.js';
import { errorEnvelopeSchema } from '../../transport/schemas.js';
export const createInterestTagSchema = {
  body: { type: 'object', additionalProperties: false, required: ['displayName'], properties: { displayName: { type: 'string' } } },
  querystring: { type: 'object', additionalProperties: false, properties: {} },
  response: {
    201: { type: 'object', additionalProperties: false, required: ['interestTag'], properties: { interestTag: {
      type: 'object', additionalProperties: false, required: ['interestTagId', 'displayName', 'lifecycleState', 'revision'], properties: {
        interestTagId: { type: 'string' }, displayName: { type: 'string' }, lifecycleState: { const: 'active' }, revision: { const: 1 },
      },
    } } },
    ...Object.fromEntries([400,401,403,409,422,503].map(status => [status, errorEnvelopeSchema])),
  },
};
export const interestAdminCapabilitySchema = {
  response: {
    200: { type: 'object', additionalProperties: false, required: ['canCreateInterestTags'], properties: { canCreateInterestTags: { type: 'boolean' } } },
    ...Object.fromEntries([400,401,403,503].map(status => [status,errorEnvelopeSchema])),
  },
};
export async function registerInterestAdmin(app: FastifyInstance, identity: IdentityVerifier, command: CreateInterestTag, capability?: GetInterestAdminCapability): Promise<void> {
  if (capability) app.get('/v1/me/interest-tag-admin-capability', {
    exposeHeadRoute: false,
    schema: interestAdminCapabilitySchema,
    onRequest: async (request, reply) => { reply.header('Cache-Control','no-store'); await buildAuthenticate(identity)(request,reply); },
    errorHandler: (error, request, reply) => sendFailureCode(request,reply,error.statusCode === 400 || error.statusCode === 415 ? 'REQUEST_INVALID' : 'SERVICE_UNAVAILABLE'),
  }, async (request, reply) => {
    if (Object.keys(request.query as object).length || request.body !== undefined ||
      Number(request.headers['content-length'] ?? 0) !== 0 || request.headers['transfer-encoding'] !== undefined) return sendFailureCode(request,reply,'REQUEST_INVALID');
    const result = await capability.execute(requirePrincipal(request));
    return result.ok ? reply.send(result.value) : sendFailure(request,reply,result.failure);
  });
  app.post<{ Body: { displayName: string } }>('/v1/admin/interest-tags', { onRequest: buildAuthenticate(identity), schema: createInterestTagSchema }, async (request, reply) => {
    const result = await command.execute(requirePrincipal(request), request.body.displayName);
    return result.ok ? reply.code(201).send({ interestTag: result.value }) : sendFailure(request, reply, result.failure);
  });
}
