import type { FastifyReply, FastifyRequest } from "fastify";
import {
  APP_FAILURE_CATALOGUE,
  appFailure,
  type AppFailure,
  type AppFailureCode,
} from "../shared/application/app-failure.js";

export function sendFailure(
  request: FastifyRequest,
  reply: FastifyReply,
  failure: AppFailure,
): FastifyReply {
  const statusCode = APP_FAILURE_CATALOGUE[failure.code].statusCode;
  return reply.code(statusCode).send({
    error: {
      code: failure.code,
      message: failure.message,
      requestId: request.id,
    },
  });
}

export function sendFailureCode(
  request: FastifyRequest,
  reply: FastifyReply,
  code: AppFailureCode,
): FastifyReply {
  return sendFailure(request, reply, appFailure(code));
}
