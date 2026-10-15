import type { FastifyRequest, FastifyServerOptions } from "fastify";
import type { GetOnboarding } from "../onboarding/application/get-onboarding.js";
import { buildPersonaFrameworkErrors, sendDefaultFrameworkFailure } from "../personas/transport/framework-errors.js";
import type { IdentityVerifier } from "../shared/ports/identity-verifier.js";
import { buildAuthenticate } from "../transport/authenticate.js";
import { sendFailure, sendFailureCode } from "../transport/error-response.js";

function isAddressedBrowseDetail(request: FastifyRequest): boolean {
  if (request.method !== "GET") return false;
  let target = request.url;
  if (!target.startsWith("/")) {
    const absolute = /^https?:\/\/[^/?#]+(\/[^#]*)$/i.exec(target);
    if (absolute === null) return false;
    try { if (new URL(target).host.length === 0) return false; } catch { return false; }
    target = absolute[1]!;
  }
  const parts = target.split(/[?#]/, 1)[0]!.split("/");
  if (parts.length !== 4 || parts[3] === "") return false;
  try { return decodeURIComponent(parts[1]!) === "v1" && decodeURIComponent(parts[2]!) === "event-browse"; }
  catch { return false; }
}

/** The router can reject malformed/oversized locators before any route hook. */
export function buildEventBrowseFrameworkErrors(
  identity: IdentityVerifier,
  onboarding: Pick<GetOnboarding, "execute">,
  personasEnabled: boolean,
): NonNullable<FastifyServerOptions["frameworkErrors"]> {
  const authenticate = buildAuthenticate(identity);
  const personaFallback = personasEnabled ? buildPersonaFrameworkErrors(identity) : undefined;
  return (error, request, reply) => {
    if ((error.code !== "FST_ERR_BAD_URL" && error.code !== "FST_ERR_MAX_PARAM_LENGTH") || !isAddressedBrowseDetail(request)) {
      if (personaFallback !== undefined) personaFallback(error, request, reply);
      else sendDefaultFrameworkFailure(error, reply);
      return;
    }
    reply.header("Cache-Control", "no-store");
    // Fastify does not await this callback. Consume every asynchronous rejection.
    void authenticate(request, reply).then(async () => {
      if (reply.sent) return;
      if (request.authPrincipal == null) { sendFailureCode(request, reply, "SERVICE_UNAVAILABLE"); return; }
      const owner = await onboarding.execute(request.authPrincipal);
      if (!owner.ok) { sendFailure(request, reply, owner.failure); return; }
      sendFailureCode(request, reply, owner.value.status === "completed" ? "EVENT_UNAVAILABLE" : "ONBOARDING_REQUIRED");
    }).catch(() => { if (!reply.sent) sendFailureCode(request, reply, "SERVICE_UNAVAILABLE"); });
  };
}
