import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { ConversationCaller, ConversationFailureCode, ConversationResult } from "../ports/conversation-operations.js";
import type { OwnedMessageAnchor, OwnedSourceTarget } from "../ports/owned-sources.js";
import { CONVERSATION_ERRORS, parseConversationCursor } from "./register-routes.js";

/** Root supplies fresh business-source authority and the canonical Store reader.
 * This interface carries no storage path, model-produced locator or cached grant. */
export interface OwnedSourceOperations {
  resolve(caller: ConversationCaller, input: { readonly conversationId: string; readonly messageId: string; readonly cardRef: string },
    current: () => boolean): Promise<ConversationResult<OwnedSourceTarget>>;
  anchor(caller: ConversationCaller, conversationId: string, messageId: string,
    current: () => boolean): Promise<ConversationResult<OwnedMessageAnchor>>;
  /** Optional explicit first-flow composition. An opaque delivery reference
   * grants no access until the wrapper resolves and revalidates its message. */
  deliveryAnchor?(caller: ConversationCaller, deliveryRef: string,
    current: () => boolean): Promise<ConversationResult<OwnedMessageAnchor>>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const uuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: Record<string, unknown>, fields: readonly string[]) =>
  fields.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => fields.includes(key));
const headers = ["idempotency-key", "ai-operation-key", "if-match", "if-none-match", "if-unmodified-since"];
function failure(request: FastifyRequest, reply: FastifyReply, code: ConversationFailureCode): FastifyReply {
  const [status, message] = CONVERSATION_ERRORS[code];
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}
function close(reply: FastifyReply): FastifyReply { reply.hijack(); reply.raw.destroy(); return reply; }
function anchorView(anchor: OwnedMessageAnchor) {
  if (!uuid(anchor.conversationId) || !uuid(anchor.messageId) || !Number.isSafeInteger(anchor.sequence) || anchor.sequence < 1 ||
    anchor.sequence >= Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(anchor.pageBefore) || anchor.pageBefore !== anchor.sequence + 1)
    throw Error("Invalid inner anchor");
  const pageBefore = Buffer.from(JSON.stringify({ v: 1, before: anchor.pageBefore })).toString("base64url");
  if (parseConversationCursor(pageBefore) !== anchor.pageBefore) throw Error("Invalid inner cursor");
  return { conversationId: anchor.conversationId, messageId: anchor.messageId, sequence: anchor.sequence, pageBefore };
}
function sourceView(target: OwnedSourceTarget) {
  if (target.kind === "conversation_message") return { kind: "conversation_message", anchor: anchorView(target.anchor) };
  if (target.kind === "check_in" && typeof target.checkInId === "string" && isSafeDocumentId(target.checkInId))
    return { kind: "check_in", checkInId: target.checkInId };
  throw Error("Invalid inner source target");
}

/** Read-only F0/F1a navigation sidecars. Authentication precedes input parsing;
 * the supplied operation rechecks owner, source version, purpose and retention. */
export async function registerOwnedSourceRoutes(app: FastifyInstance, identity: IdentityVerifier,
  operations: OwnedSourceOperations, accepting: () => boolean = () => true): Promise<void> {
  const admitted = (): boolean => { try { return accepting() === true; } catch { return false; } };
  await app.register(async scope => {
    const callers = new WeakMap<FastifyRequest, { caller: ConversationCaller; current: () => boolean }>();
    scope.addHook("onRequest", async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      if (!admitted()) return failure(request, reply, "AI_UNAVAILABLE");
      const authorization = request.headers.authorization;
      const token = typeof authorization === "string" ? /^Bearer ([^\s,]+)$/.exec(authorization)?.[1] : undefined;
      if (!token) return failure(request, reply, "AUTH_REQUIRED");
      let verification;
      try { verification = await identity.verifyIdToken(token); } catch { return failure(request, reply, "AI_UNAVAILABLE"); }
      if (!admitted()) return failure(request, reply, "AI_UNAVAILABLE");
      if (verification.kind !== "verified") return failure(request, reply,
        verification.kind === "invalid" ? "AUTH_REQUIRED" : verification.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AI_UNAVAILABLE");
      let live = true;
      request.raw.once("aborted", () => { live = false; });
      reply.raw.once("close", () => { live = false; });
      callers.set(request, { current: () => admitted() && live && !request.raw.aborted && !reply.raw.destroyed,
        caller: { principal: verification.principal, tokenInstance: createHash("sha256").update(token).digest("hex"),
          verifyCurrentAuth: () => identity.verifyIdToken(token) } });
    });
    scope.setErrorHandler((error, request, reply) => {
      const status = (error as { statusCode?: number }).statusCode;
      return failure(request, reply, status === 413 ? "REQUEST_TOO_LARGE" : status === 400 || status === 415 ? "REQUEST_INVALID" : "AI_UNAVAILABLE");
    });
    const clean = (request: FastifyRequest, body: boolean) => record(request.query) && Object.keys(request.query).length === 0 &&
      headers.every(header => request.headers[header] === undefined) &&
      (body || request.body === undefined && Number(request.headers["content-length"] ?? 0) === 0 && request.headers["transfer-encoding"] === undefined);
    async function read<T>(request: FastifyRequest, reply: FastifyReply,
      operation: (caller: ConversationCaller, current: () => boolean) => Promise<ConversationResult<T>>, project: (value: T) => unknown) {
      const original = callers.get(request);
      if (!original) return failure(request, reply, "AI_UNAVAILABLE");
      if (!original.current()) return close(reply);
      try {
        const result = await operation(original.caller, original.current);
        if (result.kind === "terminated" || !original.current()) return close(reply);
        if (result.kind === "failure") return failure(request, reply, result.code);
        const value = project(result.value);
        if (!original.current()) return close(reply);
        return reply.code(200).send(value);
      } catch { return original.current() ? failure(request, reply, "AI_UNAVAILABLE") : close(reply); }
    }
    scope.post("/v1/me/ai/source-references/resolve", { bodyLimit: 8192 }, async (request, reply) => {
      const body = request.body;
      if (!clean(request, true) || !record(body) || !exact(body, ["conversationId", "messageId", "cardRef"]) ||
        !uuid(body.conversationId) || !uuid(body.messageId) || !uuid(body.cardRef)) return failure(request, reply, "REQUEST_INVALID");
      const input = { conversationId: body.conversationId, messageId: body.messageId, cardRef: body.cardRef };
      return read(request, reply, (caller, current) => operations.resolve(caller, input, current), sourceView);
    });
    const deliveryAnchor = operations.deliveryAnchor?.bind(operations);
    if (deliveryAnchor) scope.post("/v1/me/ai/delivery-references/resolve", { bodyLimit: 8192 }, async (request, reply) => {
      const body = request.body;
      if (!clean(request, true) || !record(body) || !exact(body, ["deliveryRef"]) || !uuid(body.deliveryRef))
        return failure(request, reply, "REQUEST_INVALID");
      const deliveryRef = body.deliveryRef;
      return read(request, reply, (caller, current) => deliveryAnchor(caller, deliveryRef, current), anchorView);
    });
    scope.get<{ Params: { conversationId: string; messageId: string } }>(
      "/v1/me/conversations/:conversationId/messages/:messageId/anchor", { bodyLimit: 8192, exposeHeadRoute: false }, async (request, reply) => {
        const { conversationId, messageId } = request.params;
        if (!clean(request, false) || !uuid(conversationId) || !uuid(messageId)) return failure(request, reply, "REQUEST_INVALID");
        return read(request, reply, (caller, current) => operations.anchor(caller, conversationId, messageId, current), value => {
          if (value.conversationId !== conversationId || value.messageId !== messageId) throw Error("Wrong inner anchor");
          return anchorView(value);
        });
      });
  });
}
