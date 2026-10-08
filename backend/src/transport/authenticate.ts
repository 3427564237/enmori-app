import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type {
  AuthPrincipal,
  IdentityVerifier,
} from "../shared/ports/identity-verifier.js";
import { sendFailureCode } from "./error-response.js";

declare module "fastify" {
  interface FastifyRequest {
    authPrincipal: AuthPrincipal | null;
  }
}

const BEARER_PATTERN = /^Bearer ([^\s,]+)$/;

export function buildAuthenticate(
  identityVerifier: IdentityVerifier,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === "string"
        ? BEARER_PATTERN.exec(authorization)
        : null;
    if (match?.[1] === undefined) {
      sendFailureCode(request, reply, "AUTH_REQUIRED");
      return;
    }

    const result = await identityVerifier.verifyIdToken(match[1]);
    switch (result.kind) {
      case "verified":
        request.authPrincipal = result.principal;
        return;
      case "invalid":
        sendFailureCode(request, reply, "AUTH_REQUIRED");
        return;
      case "forbidden":
        sendFailureCode(request, reply, "AUTH_FORBIDDEN");
        return;
      case "dependency_unavailable":
        sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    }
  };
}

export function requirePrincipal(request: FastifyRequest): AuthPrincipal {
  if (request.authPrincipal === null) {
    throw new Error("Authenticated route reached without an Auth Principal");
  }
  return request.authPrincipal;
}
