import type { FastifyInstance } from 'fastify';
import type { IdentityVerifier } from '../../shared/ports/identity-verifier.js';
import type { CreateInterestTag } from '../application/create-interest-tag.js';
import { buildAuthenticate, requirePrincipal } from '../../transport/authenticate.js';
import { sendFailure } from '../../transport/error-response.js';
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
export async function registerInterestAdmin(app: FastifyInstance, identity: IdentityVerifier, command: CreateInterestTag): Promise<void> {
  app.post<{ Body: { displayName: string } }>('/v1/admin/interest-tags', { onRequest: buildAuthenticate(identity), schema: createInterestTagSchema }, async (request, reply) => {
    const result = await command.execute(requirePrincipal(request), request.body.displayName);
    return result.ok ? reply.code(201).send({ interestTag: result.value }) : sendFailure(request, reply, result.failure);
  });
}
