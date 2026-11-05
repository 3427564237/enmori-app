import type { FastifyInstance } from 'fastify';
import type { IdentityVerifier } from '../../shared/ports/identity-verifier.js';
import type { CreateInterestTag } from '../application/create-interest-tag.js';
import type { GetInterestAdminCapability } from '../application/get-interest-admin-capability.js';
import type { ManageInterestTags } from '../application/manage-interest-tags.js';
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
export const managedInterestTagSchema = {
  type: 'object', additionalProperties: false, required: ['interestTagId', 'displayName', 'lifecycleState', 'revision'],
  properties: { interestTagId: { type: 'string', minLength: 1 }, displayName: { type: 'string', minLength: 1 },
    lifecycleState: { type: 'string', enum: ['active', 'inactive'] }, revision: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } },
};
const emptyQuery = { type: 'object', additionalProperties: false, properties: {} };
const tagParams = { type: 'object', additionalProperties: false, required: ['interestTagId'], properties: { interestTagId: { type: 'string', minLength: 1 } } };
const expectedRevision = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const managedEnvelope = { type: 'object', additionalProperties: false, required: ['interestTag'], properties: { interestTag: managedInterestTagSchema } };
export const manageInterestTagsSchema = {
  querystring: emptyQuery,
  response: { 200: { type: 'object', additionalProperties: false, required: ['interestTags'], properties: { interestTags: { type: 'array', items: managedInterestTagSchema } } },
    ...Object.fromEntries([400,401,403,503].map(status => [status, errorEnvelopeSchema])) },
};
export const changeInterestTagSchema = {
  params: tagParams, querystring: emptyQuery,
  body: { type: 'object', additionalProperties: false, required: ['expectedRevision'], properties: {
    expectedRevision, displayName: { type: 'string' }, lifecycleState: { type: 'string', enum: ['active', 'inactive'] },
  }, oneOf: [{ required: ['displayName'], not: { required: ['lifecycleState'] } }, { required: ['lifecycleState'], not: { required: ['displayName'] } }] },
  response: { 200: managedEnvelope, ...Object.fromEntries([400,401,403,404,409,412,422,503].map(status => [status, errorEnvelopeSchema])) },
};
export const deleteInterestTagSchema = {
  params: tagParams, querystring: emptyQuery,
  body: { type: 'object', additionalProperties: false, required: ['expectedRevision'], properties: { expectedRevision } },
  response: Object.fromEntries([400,401,403,404,409,412,422,503].map(status => [status, errorEnvelopeSchema])),
};
export async function registerInterestAdmin(app: FastifyInstance, identity: IdentityVerifier, command: CreateInterestTag, capability?: GetInterestAdminCapability, management?: ManageInterestTags): Promise<void> {
  const authenticate = buildAuthenticate(identity);
  const noStoreAuth = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    reply.header('Cache-Control', 'no-store'); await authenticate(request, reply);
  };
  const safeError = (error: { statusCode?: number }, request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) =>
    sendFailureCode(request, reply, error.statusCode === 400 || error.statusCode === 415 ? 'REQUEST_INVALID' : 'SERVICE_UNAVAILABLE');
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
  app.post<{ Body: { displayName: string } }>('/v1/admin/interest-tags', { onRequest: noStoreAuth, errorHandler: safeError, schema: createInterestTagSchema }, async (request, reply) => {
    const result = await command.execute(requirePrincipal(request), request.body.displayName);
    return result.ok ? reply.code(201).send({ interestTag: result.value }) : sendFailure(request, reply, result.failure);
  });
  if (!management) return;
  app.get('/v1/admin/interest-tags', { exposeHeadRoute: false, onRequest: noStoreAuth, errorHandler: safeError, schema: manageInterestTagsSchema }, async (request, reply) => {
    if (request.body !== undefined || Number(request.headers['content-length'] ?? 0) !== 0 || request.headers['transfer-encoding'] !== undefined) return sendFailureCode(request, reply, 'REQUEST_INVALID');
    const result = await management.list(requirePrincipal(request));
    return result.ok ? reply.send(result.value) : sendFailure(request, reply, result.failure);
  });
  app.patch<{ Params: { interestTagId: string }; Body: { expectedRevision: number; displayName?: string; lifecycleState?: 'active' | 'inactive' } }>(
    '/v1/admin/interest-tags/:interestTagId', { onRequest: noStoreAuth, errorHandler: safeError, schema: changeInterestTagSchema }, async (request, reply) => {
      const result = await management.change(requirePrincipal(request), request.params.interestTagId, request.body);
      return result.ok ? reply.send({ interestTag: result.value }) : sendFailure(request, reply, result.failure);
    });
  app.delete<{ Params: { interestTagId: string }; Body: { expectedRevision: number } }>(
    '/v1/admin/interest-tags/:interestTagId', { onRequest: noStoreAuth, errorHandler: safeError, schema: deleteInterestTagSchema }, async (request, reply) => {
      const result = await management.delete(requirePrincipal(request), request.params.interestTagId, request.body.expectedRevision);
      return result.ok ? reply.code(204).send() : sendFailure(request, reply, result.failure);
    });
}
