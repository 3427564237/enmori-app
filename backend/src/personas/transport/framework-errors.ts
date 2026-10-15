import type { FastifyError, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate } from "../../transport/authenticate.js";
import { sendFailureCode } from "../../transport/error-response.js";

/** Match only the existing addressed methods, without repairing an invalid ID. */
function isAddressedPersonaRequest(request: FastifyRequest): boolean {
  if (request.method !== "GET" && request.method !== "PUT" && request.method !== "DELETE") return false;
  let target = request.url;
  if (!target.startsWith("/")) {
    // Absolute-form targets are supported by the pinned router. Validate their
    // authority, but retain the original path (URL.pathname normalizes dots).
    const absolute = /^https?:\/\/[^/?#]+(\/[^#]*)$/i.exec(target);
    if (absolute === null) return false;
    try { if (new URL(target).host.length === 0) return false; }
    catch { return false; }
    target = absolute[1]!;
  }
  const segments = target.split(/[?#]/, 1)[0]!.split("/");
  if (segments.length !== 5 || segments[4] === "") return false;
  try {
    // Decode only the static segments. Encoded separators never become a path
    // boundary, and malformed ID bytes never prevent identifying this route.
    return decodeURIComponent(segments[1]!) === "v1" &&
      decodeURIComponent(segments[2]!) === "me" &&
      decodeURIComponent(segments[3]!) === "personas";
  } catch { return false; }
}

/** Preserve the pinned Fastify framework response for unrelated routes. */
export function sendDefaultFrameworkFailure(error: FastifyError, reply: FastifyReply): void {
  const pathFailure = error.code === "FST_ERR_BAD_URL" || error.code === "FST_ERR_MAX_PARAM_LENGTH";
  const statusCode = error.code === "FST_ERR_MAX_PARAM_LENGTH" ? 414 : pathFailure ? 400 : 500;
  reply.code(statusCode).send({
    error: pathFailure ? "Bad Request" : "Internal Server Error",
    ...(pathFailure ? { code: error.code } : {}),
    message: error.message,
    statusCode,
  });
}

/** Installed only after the explicit Persona Emulator composition passes its guard. */
export function buildPersonaFrameworkErrors(identity: IdentityVerifier): NonNullable<FastifyServerOptions["frameworkErrors"]> {
  const authenticate = buildAuthenticate(identity);
  return (error, request, reply) => {
    if ((error.code !== "FST_ERR_BAD_URL" && error.code !== "FST_ERR_MAX_PARAM_LENGTH") ||
      !isAddressedPersonaRequest(request)) {
      sendDefaultFrameworkFailure(error, reply);
      return;
    }
    // Fastify invokes frameworkErrors before route hooks and does not consume
    // returned promises. Consume this one explicitly, including verifier throws.
    void authenticate(request, reply).then(() => {
      if (!reply.sent) sendFailureCode(request, reply,
        request.authPrincipal == null ? "SERVICE_UNAVAILABLE" : "REQUEST_INVALID");
    }).catch(() => {
      if (!reply.sent) sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
    });
  };
}
