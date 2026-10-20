import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import type { ConversationCaller, ConversationFailureCode } from "../../ai-conversation/ports/conversation-operations.js";
import { CONVERSATION_ERRORS } from "../../ai-conversation/transport/register-routes.js";
import type { PreviewPersona } from "../application/preview-persona.js";
import { personaExpressionFields } from "../domain/persona-values.js";
import { personaEditableProperties } from "./schemas.js";

export type PersonaPreviewOperations = Pick<PreviewPersona, "execute">;
const fields = ["displayName", "tone", "responseLength", "formatStyle"];
export const personaPreviewRequestSchema = {
  type: "object", additionalProperties: false, required: ["draft", "text"],
  properties: {
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

/** Explicit registration seam; ordinary/bootstrap compositions enable it only with a real approved authority/model. */
export async function registerPersonaPreviewRoute(app: FastifyInstance, identity: IdentityVerifier,
  preview: PersonaPreviewOperations): Promise<void> {
  app.post("/v1/me/persona-preview", {
    bodyLimit: 16 * 1024,
    onRequest: async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const header = request.headers.authorization;
      const token = typeof header === "string" ? /^Bearer ([^\s,]+)$/.exec(header)?.[1] : undefined;
      if (!token) { failure(request, reply, "AUTH_REQUIRED"); return; }
      try {
        const verified = await identity.verifyIdToken(token);
        if (verified.kind === "verified") request.authPrincipal = verified.principal;
        else failure(request, reply, verified.kind === "invalid" ? "AUTH_REQUIRED" : verified.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AI_UNAVAILABLE");
      } catch { failure(request, reply, "AI_UNAVAILABLE"); }
    },
    errorHandler: (error, request, reply) => {
      const value = error as Error & { statusCode?: number; validation?: unknown };
      return failure(request, reply, value.statusCode === 413 ? "REQUEST_TOO_LARGE" : value.statusCode === 400 || value.statusCode === 415 ? "REQUEST_INVALID" : "AI_UNAVAILABLE");
    },
  }, async (request, reply) => {
    const body = request.body;
    if (Object.keys(request.query as object).length !== 0 || request.headers["idempotency-key"] !== undefined ||
        request.headers["ai-operation-key"] !== undefined || !record(body) || Object.keys(body).length !== 2 ||
        !Object.hasOwn(body, "draft") || !Object.hasOwn(body, "text") || !record(body.draft) || typeof body.text !== "string" ||
        Object.keys(body.draft).some(key => !fields.includes(key) && !personaExpressionFields.includes(key as typeof personaExpressionFields[number])) ||
        fields.some(key => !Object.hasOwn(body.draft as object, key)) ||
        Object.values(body.draft).some(value => typeof value !== "string")) return failure(request, reply, "REQUEST_INVALID");
    const principal = request.authPrincipal;
    if (!principal) return failure(request, reply, "AUTH_REQUIRED");
    const token = (request.headers.authorization as string).slice(7);
    const caller: ConversationCaller = { principal, tokenInstance: createHash("sha256").update(token).digest("hex"),
      verifyCurrentAuth: () => identity.verifyIdToken(token) };
    const controller = new AbortController();
    let accepted = false;
    const current = () => !controller.signal.aborted && !reply.raw.destroyed;
    const disconnected = () => { if (!reply.raw.writableEnded) controller.abort(); };
    request.raw.once("aborted", disconnected); reply.raw.once("close", disconnected);
    try {
      const result = await preview.execute(caller, body.draft, body.text, { signal: controller.signal, current,
        accept: message => {
          if (!current() || accepted || reply.sent || !message.isWellFormed() || !message.trim() || [...message].length > 2400) return false;
          const bytes = Buffer.from(JSON.stringify({ message }), "utf8");
          try {
            reply.hijack();
            for (const [name, value] of Object.entries(reply.getHeaders())) if (value !== undefined) reply.raw.setHeader(name, value);
            reply.raw.setHeader("content-type", "application/json; charset=utf-8");
            reply.raw.setHeader("cache-control", "no-store"); reply.raw.setHeader("content-length", bytes.length);
            reply.raw.writeHead(200); reply.raw.end(bytes); accepted = true; return true;
          } catch { controller.abort(); reply.raw.destroy(); return false; }
        },
      });
      if (accepted || reply.sent) return reply;
      if (result.kind === "failure") return failure(request, reply, result.code);
      if (result.kind === "terminated") { reply.hijack(); reply.raw.destroy(); return reply; }
      return failure(request, reply, "AI_UNAVAILABLE");
    } finally { request.raw.off("aborted", disconnected); reply.raw.off("close", disconnected); }
  });
}
