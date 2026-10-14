import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import type { ConversationOperations, ConversationCaller, ConversationFailureCode, PrepareConversation, ConversationResult } from "../ports/conversation-operations.js";
import type { StoredConversationMessage } from "../ports/real-conversation-store.js";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KEY = /^[A-Za-z0-9_-]{43}$/;
export const CONVERSATION_ERRORS: Record<ConversationFailureCode, readonly [number, string]> = {
  REQUEST_INVALID: [400, "Request parameters are invalid."],
  AUTH_REQUIRED: [401, "Your session has expired. Sign in again."],
  AUTH_FORBIDDEN: [403, "This account cannot continue."],
  ONBOARDING_REQUIRED: [409, "Finish setting up your ENMORI account."],
  AI_CONTEXT_NOT_PERMITTED: [403, "This use of your information is not permitted."],
  CONVERSATION_UNAVAILABLE: [404, "This conversation is unavailable."],
  AI_OPERATION_UNAVAILABLE: [404, "This operation is unavailable."],
  AI_OPERATION_CONFLICT: [409, "Check saved messages before trying again."],
  REQUEST_TOO_LARGE: [413, "The request is too large."],
  AI_INPUT_INVALID: [422, "Enter a valid message within the input limit."],
  AI_BUSY: [429, "AI is busy. Try again later."],
  AI_UNAVAILABLE: [503, "AI is temporarily unavailable."],
  AI_REPLY_REJECTED: [502, "The reply could not be accepted."],
  AI_AUTHORITY_CHANGED: [409, "Your permission to continue has changed."],
  AI_OUTCOME_UNRESOLVED: [503, "We couldn’t confirm the result. Check saved messages before trying again."],
};
function failure(request: FastifyRequest, reply: FastifyReply, code: ConversationFailureCode): FastifyReply {
  const [status, message] = CONVERSATION_ERRORS[code];
  // N01's selected envelope differs from older routes; preserve both contracts.
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
function keys(v: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
}
function uuid(v: unknown): v is string { return typeof v === "string" && ID.test(v); }
function operationKey(v: unknown): v is string {
  return typeof v === "string" && KEY.test(v) && Buffer.from(v, "base64url").length === 32 && Buffer.from(v, "base64url").toString("base64url") === v;
}
export function parseConversationCursor(v: unknown): number | undefined {
  if (typeof v !== "string" || v.length === 0 || v.length > 128 || !/^[A-Za-z0-9_-]+$/.test(v)) return undefined;
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(v, "base64url"));
    const value: unknown = JSON.parse(decoded);
    if (!record(value) || !keys(value, ["v", "before"]) || value.v !== 1 || typeof value.before !== "number" ||
        !Number.isSafeInteger(value.before) || value.before <= 0 ||
        Buffer.from(JSON.stringify({ v: 1, before: value.before })).toString("base64url") !== v) return undefined;
    return value.before;
  } catch { return undefined; }
}
function message(m: StoredConversationMessage): Record<string, unknown> {
  if (!uuid(m.messageId) || !Number.isSafeInteger(m.sequence) || m.sequence <= 0 ||
      !Number.isSafeInteger(m.persistedAt.seconds) || !Number.isInteger(m.persistedAt.nanoseconds) ||
      m.persistedAt.nanoseconds < 0 || m.persistedAt.nanoseconds > 999999999 ||
      !((m.role === "user" && m.availability === "available") || (m.role === "assistant" && ["available", "unavailable"].includes(m.availability))) ||
      (m.availability === "available" ? typeof m.text !== "string" : m.text !== undefined)) throw new Error("Invalid inner message");
  // Wire is presentation only. The store uses integer full precision for authorization.
  const base = new Date(m.persistedAt.seconds * 1000).toISOString().slice(0, 19);
  // Accepted client UTC parser supports up to six fractional digits. This
  // projection never feeds retention/ordering authority back into the store.
  const persistedAt = `${base}.${String(Math.floor(m.persistedAt.nanoseconds / 1000)).padStart(6, "0")}Z`;
  return { messageId: m.messageId, sequence: m.sequence, role: m.role, persistedAt, availability: m.availability,
    ...(m.text === undefined ? {} : { text: m.text }) };
}
function noBody(request: FastifyRequest): boolean {
  return request.body === undefined && Number(request.headers["content-length"] ?? 0) === 0 && request.headers["transfer-encoding"] === undefined;
}
function deliver<T>(request: FastifyRequest, reply: FastifyReply, result: ConversationResult<T>, status: number, project: (value: T) => unknown): FastifyReply {
  if (result.kind === "terminated" || reply.raw.destroyed) { reply.hijack(); reply.raw.destroy(); return reply; }
  if (result.kind === "failure") return failure(request, reply, result.code);
  return reply.code(status).send(project(result.value));
}

export async function registerConversationRoutes(app: FastifyInstance, identity: IdentityVerifier, operations: ConversationOperations): Promise<void> {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.header("Cache-Control", "no-store");
    const value = request.headers.authorization;
    const token = typeof value === "string" ? /^Bearer ([^\s,]+)$/.exec(value)?.[1] : undefined;
    if (token === undefined) { failure(request, reply, "AUTH_REQUIRED"); return; }
    const verified = await identity.verifyIdToken(token);
    if (verified.kind === "verified") request.authPrincipal = verified.principal;
    else failure(request, reply, verified.kind === "invalid" ? "AUTH_REQUIRED" : verified.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AI_UNAVAILABLE");
  };
  function caller(request: FastifyRequest): ConversationCaller {
    if (request.authPrincipal === null) throw new Error("Missing verified caller");
    const token = (request.headers.authorization as string).slice(7);
    return { principal: request.authPrincipal, tokenInstance: createHash("sha256").update(token).digest("hex"),
      verifyCurrentAuth: () => identity.verifyIdToken(token) };
  }
  const options = { onRequest: authenticate, bodyLimit: 16 * 1024,
    errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): FastifyReply {
      const status = (error as Error & { statusCode?: number }).statusCode;
      return failure(request, reply, status === 413 ? "REQUEST_TOO_LARGE" : status === 400 || status === 415 ? "REQUEST_INVALID" : "AI_UNAVAILABLE");
    } };
  const clean = (request: FastifyRequest, allowedQuery: readonly string[] = []): boolean =>
    Object.keys(request.query as object).every(k => allowedQuery.includes(k)) && request.headers["idempotency-key"] === undefined;

  app.post("/v1/me/ai/operations", options, async (request, reply) => {
    const b = request.body;
    if (!clean(request) || request.headers["ai-operation-key"] !== undefined || !record(b) || b.purpose !== "checkin_conversation" ||
      !((b.kind === "send" && keys(b, ["kind", "purpose"], ["conversationId"]) && (b.conversationId === undefined || uuid(b.conversationId))) ||
        (b.kind === "retry" && keys(b, ["kind", "purpose", "conversationId", "userMessageId"]) && uuid(b.conversationId) && uuid(b.userMessageId)))) return failure(request, reply, "REQUEST_INVALID");
    return deliver(request, reply, await operations.prepare(caller(request), b as unknown as PrepareConversation), 201, v => {
      if (!uuid(v.operationId) || !operationKey(v.operationKey) || !uuid(v.conversationId) ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.preparationExpiresAt) ||
          new Date(v.preparationExpiresAt).toISOString() !== v.preparationExpiresAt) throw new Error("Invalid inner preparation");
      return { operationId: v.operationId, operationKey: v.operationKey, conversationId: v.conversationId, preparationExpiresAt: v.preparationExpiresAt };
    });
  });
  app.post<{ Params: { operationId: string } }>("/v1/me/ai/operations/:operationId/execute", options, async (request, reply) => {
    const key = request.headers["ai-operation-key"], b = request.body;
    if (!clean(request) || !uuid(request.params.operationId) || !operationKey(key) || !record(b) || !keys(b, ["text"]) || typeof b.text !== "string") return failure(request, reply, "REQUEST_INVALID");
    if (!b.text.isWellFormed() || b.text.trim().length === 0 || [...b.text].length > 2400) return failure(request, reply, "AI_INPUT_INVALID");
    const controller = new AbortController();
    const disconnected = (): void => { if (!reply.raw.writableEnded) controller.abort(); };
    request.raw.once("aborted", disconnected); reply.raw.once("close", disconnected);
    try {
      const result = await operations.execute(caller(request), { operationId: request.params.operationId, operationKey: key, text: b.text },
        { signal: controller.signal, current: () => !controller.signal.aborted && !reply.raw.destroyed });
      if (controller.signal.aborted) { reply.hijack(); reply.raw.destroy(); return reply; }
      return deliver(request, reply, result, 200, v => {
        if (v.operationId !== request.params.operationId || !uuid(v.conversationId) || v.userMessage.role !== "user" ||
            v.assistantMessage.role !== "assistant" || v.userMessage.messageId === v.assistantMessage.messageId ||
            v.userMessage.sequence >= v.assistantMessage.sequence || v.assistantMessage.availability !== "available") throw new Error("Invalid inner execution pair");
        return { operationId: v.operationId, conversationId: v.conversationId, userMessage: message(v.userMessage), assistantMessage: message(v.assistantMessage) };
      });
    } finally { request.raw.off("aborted", disconnected); reply.raw.off("close", disconnected); }
  });
  app.post<{ Params: { operationId: string } }>("/v1/me/ai/operations/:operationId/cancel", options, async (request, reply) => {
    const key = request.headers["ai-operation-key"];
    if (!clean(request) || !noBody(request) || !uuid(request.params.operationId) || !operationKey(key)) return failure(request, reply, "REQUEST_INVALID");
    return deliver(request, reply, await operations.cancel(caller(request), { operationId: request.params.operationId, operationKey: key }), 200,
      v => {
        if (v.operationId !== request.params.operationId || v.state !== "terminal") throw new Error("Invalid inner cancellation");
        return { operationId: v.operationId, state: v.state };
      });
  });
  app.get<{ Params: { conversationId: string; operationId: string } }>("/v1/me/conversations/:conversationId/operations/:operationId",
    { ...options, exposeHeadRoute: false }, async (request, reply) => {
      if (!clean(request) || !noBody(request) || request.headers["ai-operation-key"] !== undefined || !uuid(request.params.conversationId) || !uuid(request.params.operationId)) return failure(request, reply, "REQUEST_INVALID");
      return deliver(request, reply, await operations.readOutcome(caller(request), request.params.conversationId, request.params.operationId), 200,
        v => {
          if (v.operationId !== request.params.operationId ||
              !["active", "no_effect", "unresolved", "user_saved", "assistant_saved"].includes(v.state) ||
              (v.state === "user_saved" || v.state === "assistant_saved" ? !("userMessage" in v) || v.userMessage.role !== "user" : "userMessage" in v) ||
              (v.state === "assistant_saved" ? !("assistantMessage" in v) || v.assistantMessage.role !== "assistant" ||
                v.userMessage.messageId === v.assistantMessage.messageId || v.userMessage.sequence >= v.assistantMessage.sequence : "assistantMessage" in v)) throw new Error("Invalid inner outcome");
          return { operationId: v.operationId, state: v.state, ...("userMessage" in v ? { userMessage: message(v.userMessage) } : {}),
            ...("assistantMessage" in v ? { assistantMessage: message(v.assistantMessage) } : {}) };
        });
    });
  app.get<{ Params: { conversationId: string }; Querystring: { before?: unknown } }>("/v1/me/conversations/:conversationId/messages",
    { ...options, exposeHeadRoute: false }, async (request, reply) => {
      const before = request.query.before === undefined ? undefined : parseConversationCursor(request.query.before);
      if (!clean(request, ["before"]) || !noBody(request) || request.headers["ai-operation-key"] !== undefined || !uuid(request.params.conversationId) ||
          (request.query.before !== undefined && before === undefined)) return failure(request, reply, "REQUEST_INVALID");
      return deliver(request, reply, await operations.listMessages(caller(request), request.params.conversationId, before), 200, v => {
        if (v.messages.length > 20 || new Set(v.messages.map(m => m.messageId)).size !== v.messages.length ||
            v.messages.some((m, i) => (i > 0 && m.sequence <= v.messages[i - 1]!.sequence) || (before !== undefined && m.sequence >= before)) ||
            (v.nextBefore !== undefined && (!Number.isSafeInteger(v.nextBefore) || v.nextBefore <= 0 || v.nextBefore !== v.messages[0]?.sequence))) throw new Error("Invalid inner page");
        return { messages: v.messages.map(message), ...(v.nextBefore === undefined ? {} : { nextCursor: Buffer.from(JSON.stringify({ v: 1, before: v.nextBefore })).toString("base64url") }) };
      });
    });
  app.delete<{ Params: { conversationId: string } }>("/v1/me/conversations/:conversationId", options, async (request, reply) => {
    if (!clean(request) || !noBody(request) || request.headers["ai-operation-key"] !== undefined || !uuid(request.params.conversationId)) return failure(request, reply, "REQUEST_INVALID");
    return deliver(request, reply, await operations.deleteConversation(caller(request), request.params.conversationId), 204, () => undefined);
  });
}
