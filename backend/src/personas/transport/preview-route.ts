import { OPENAI_CLOUD_PROCESSING, type CloudAiProcessing } from '../../account/domain/cloud-ai-consent.js';
import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import type { ConversationCaller, ConversationFailureCode } from "../../ai-conversation/ports/conversation-operations.js";
import { CONVERSATION_ERRORS } from "../../ai-conversation/transport/register-routes.js";
import type { PreviewPersona } from "../application/preview-persona.js";
import { personaExpressionFields } from "../domain/persona-values.js";
import { personaEditableProperties } from "./schemas.js";

export type PersonaPreviewOperations = Pick<PreviewPersona, "execute"> & { readonly processing?: CloudAiProcessing };
const fields = ["displayName", "tone", "responseLength", "formatStyle"];
export const personaPreviewRequestSchema = {
  type: "object", additionalProperties: false, required: ["draft", "text"],
  properties: {
    processing: { const: "cloud" }, provider: { const: "openai" }, disclosureVersion: { const: "openai_cloud_v1" },
    draft: { type: "object", additionalProperties: false, required: fields, properties: personaEditableProperties },
    text: { type: "string", minLength: 1, maxLength: 2400 },
  },
} as const;
export const personaPreviewResponseSchema = {
  type: "object", additionalProperties: false, required: ["message"],
  properties: { message: { type: "string", minLength: 1, maxLength: 2400 } },
} as const;
export const personaPreviewErrorSchema = {
  type: "object", additionalProperties: false, required: ["error", "requestId"],
  properties: { error: { type: "object", additionalProperties: false, required: ["code", "message"],
    properties: { code: { type: "string" }, message: { type: "string" } } }, requestId: { type: "string" } },
} as const;
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && !!value && !Array.isArray(value);
const failure = (request: FastifyRequest, reply: FastifyReply, code: ConversationFailureCode): FastifyReply => {
  const [status, message] = CONVERSATION_ERRORS[code];
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
};

const stopped = Symbol("preview request ended");
interface PreviewRequestLifetime {
  readonly signal: AbortSignal;
  readonly stopped: Promise<typeof stopped>;
  current(): boolean;
  finish(): void;
}
const lifetimes = new WeakMap<FastifyRequest, PreviewRequestLifetime>();

/** One original route budget, beginning before authentication and body parsing.
 * The shared signal revokes delivery, never confirms that model work stopped. */
function beginLifetime(request: FastifyRequest, reply: FastifyReply): PreviewRequestLifetime {
  const controller = new AbortController(), deadline = performance.now() + 60_000;
  let ended = false, timer: ReturnType<typeof setTimeout> | undefined;
  let resolveStopped!: (value: typeof stopped) => void;
  const completion = new Promise<typeof stopped>(resolve => { resolveStopped = resolve; });
  const finish = () => {
    if (ended) return;
    ended = true;
    if (timer) clearTimeout(timer);
    request.raw.off("aborted", disconnected);
    reply.raw.off("close", closed);
    reply.raw.off("finish", finish);
    lifetimes.delete(request);
    controller.abort(); resolveStopped(stopped);
  };
  const disconnected = () => {
    if (ended) return;
    finish();
    if (!reply.raw.writableEnded) { reply.hijack(); reply.raw.destroy(); }
  };
  const closed = () => { if (reply.raw.writableEnded) finish(); else disconnected(); };
  const expired = () => {
    if (ended) return;
    finish();
    if (!reply.sent && !reply.raw.destroyed) failure(request, reply, "AI_UNAVAILABLE");
  };
  const lifetime: PreviewRequestLifetime = {
    signal: controller.signal, stopped: completion, finish,
    current: () => {
      if (ended || controller.signal.aborted || reply.raw.destroyed) return false;
      if (performance.now() >= deadline) { expired(); return false; }
      return true;
    },
  };
  lifetimes.set(request, lifetime);
  request.raw.once("aborted", disconnected); reply.raw.once("close", closed); reply.raw.once("finish", finish);
  timer = setTimeout(expired, 60_000); timer.unref();
  return lifetime;
}

/** Explicit registration seam; ordinary/bootstrap compositions enable it only with a real approved authority/model. */
export async function registerPersonaPreviewRoute(app: FastifyInstance, identity: IdentityVerifier,
  preview: PersonaPreviewOperations): Promise<void> {
  app.post("/v1/me/persona-preview", {
    bodyLimit: 16 * 1024,
    onRequest: async (request, reply) => {
      const lifetime = beginLifetime(request, reply);
      reply.header("Cache-Control", "no-store");
      const header = request.headers.authorization;
      const token = typeof header === "string" ? /^Bearer ([^\s,]+)$/.exec(header)?.[1] : undefined;
      if (!token) { failure(request, reply, "AUTH_REQUIRED"); return; }
      try {
        if (!lifetime.current()) return reply;
        const verified = await Promise.race([identity.verifyIdToken(token), lifetime.stopped]);
        if (verified === stopped || !lifetime.current()) return reply;
        if (verified.kind === "verified") request.authPrincipal = verified.principal;
        else failure(request, reply, verified.kind === "invalid" ? "AUTH_REQUIRED" : verified.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AI_UNAVAILABLE");
      } catch { if (lifetime.current()) failure(request, reply, "AI_UNAVAILABLE"); }
    },
    onResponse: async request => { lifetimes.get(request)?.finish(); },
    errorHandler: (error, request, reply) => {
      lifetimes.get(request)?.finish();
      if (reply.sent || reply.raw.destroyed) return reply;
      const value = error as Error & { statusCode?: number; validation?: unknown };
      return failure(request, reply, value.statusCode === 413 ? "REQUEST_TOO_LARGE" : value.statusCode === 400 || value.statusCode === 415 ? "REQUEST_INVALID" : "AI_UNAVAILABLE");
    },
  }, async (request, reply) => {
    const lifetime = lifetimes.get(request);
    if (!lifetime?.current()) return reply.sent || reply.raw.destroyed ? reply : failure(request, reply, "AI_UNAVAILABLE");
    const body = request.body;
    if (Object.keys(request.query as object).length !== 0 || request.headers["idempotency-key"] !== undefined ||
        request.headers["ai-operation-key"] !== undefined || !record(body) || Object.keys(body).some(key => !["draft", "text", "processing", "provider", "disclosureVersion"].includes(key)) ||
        !Object.hasOwn(body, "draft") || !Object.hasOwn(body, "text") || !record(body.draft) || typeof body.text !== "string" ||
        Object.keys(body.draft).some(key => !fields.includes(key) && !personaExpressionFields.includes(key as typeof personaExpressionFields[number])) ||
        fields.some(key => !Object.hasOwn(body.draft as object, key)) ||
        Object.values(body.draft).some(value => typeof value !== "string")) return failure(request, reply, "REQUEST_INVALID");
    const marked = ["processing", "provider", "disclosureVersion"].some(key => Object.hasOwn(body, key));
    if (marked && (body.processing !== "cloud" || body.provider !== OPENAI_CLOUD_PROCESSING.provider ||
        body.disclosureVersion !== OPENAI_CLOUD_PROCESSING.disclosureVersion)) return failure(request, reply, "REQUEST_INVALID");
    if (preview.processing?.provider === 'openai' ? !marked : marked) return failure(request, reply, "AI_CONTEXT_NOT_PERMITTED");
    const principal = request.authPrincipal;
    if (!principal) return failure(request, reply, "AUTH_REQUIRED");
    const token = (request.headers.authorization as string).slice(7);
    const caller: ConversationCaller = { principal, tokenInstance: createHash("sha256").update(token).digest("hex"),
      verifyCurrentAuth: () => lifetime.current() ? identity.verifyIdToken(token) : Promise.resolve({ kind: "invalid" }) };
    let accepted = false;
    const current = lifetime.current;
    try {
      const result = await Promise.race([preview.execute(caller, body.draft, body.text, { signal: lifetime.signal, current,
        accept: message => {
          if (!current() || accepted || reply.sent || !message.isWellFormed() || !message.trim() || [...message].length > 2400) return false;
          const bytes = Buffer.from(JSON.stringify({ message }), "utf8");
          try {
            reply.hijack();
            for (const [name, value] of Object.entries(reply.getHeaders())) if (value !== undefined) reply.raw.setHeader(name, value);
            reply.raw.setHeader("content-type", "application/json; charset=utf-8");
            reply.raw.setHeader("cache-control", "no-store"); reply.raw.setHeader("content-length", bytes.length);
            reply.raw.writeHead(200); reply.raw.end(bytes); accepted = true; return true;
          } catch { lifetime.finish(); reply.raw.destroy(); return false; }
        },
      }), lifetime.stopped]);
      if (accepted || reply.sent) return reply;
      if (result === stopped) return reply;
      if (result.kind === "failure") return failure(request, reply, result.code);
      if (result.kind === "terminated") { reply.hijack(); reply.raw.destroy(); return reply; }
      return failure(request, reply, "AI_UNAVAILABLE");
    } finally { lifetime.finish(); }
  });
}
