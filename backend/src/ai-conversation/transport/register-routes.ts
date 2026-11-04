import { parseCloudAiProcessing } from "../../account/domain/cloud-ai-consent.js";
import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import type { ConversationOperations, ConversationCaller, ConversationFailureCode, PrepareConversation, ConversationResult, ExecutedConversationPair } from "../ports/conversation-operations.js";
import type { StoredConversationMessage } from "../ports/real-conversation-store.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { OwnedSourceCard } from "../ports/owned-sources.js";
import type { SelectReplyContext, ExecuteReplySelection, PreparedReplySelection } from "../ports/selected-reply.js";
import { parseCivilDay } from "../../check-ins/application/check-in-history.js";

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
  AI_SOURCE_UNAVAILABLE: [404, "This reference is unavailable. Keep your draft and review the sources."],
  AI_CONTEXT_SELECTION_CONFLICT: [409, "The selected sources conflict with this context. Review them before continuing."],
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
function selectContext(value: unknown, processing: "local" | "cloud"): value is SelectReplyContext {
  if (!record(value) || value.processing !== processing) return false;
  if (Object.hasOwn(value, "today")) {
    return keys(value, ["processing", "today"]) && record(value.today) &&
      keys(value.today, ["timeZone"]) && typeof value.today.timeZone === "string" &&
      value.today.timeZone.length <= 100 && parseCivilDay("2000-01-01", value.today.timeZone) !== undefined;
  }
  return keys(value, ["processing", "sources"]) &&
    Array.isArray(value.sources) && value.sources.length <= 5 &&
    value.sources.every(source => record(source) && keys(source, ["kind", "checkInId"]) && source.kind === "check_in" &&
      typeof source.checkInId === "string" && isSafeDocumentId(source.checkInId)) &&
    new Set(value.sources.map(source => source.checkInId)).size === value.sources.length;
}
function executeSelection(value: unknown): value is ExecuteReplySelection {
  if (!record(value) || !keys(value, ["selectionRevision", "includedKeys", "excludedKeys"], ["excludedHistoryKeys"]) || !uuid(value.selectionRevision)) return false;
  if (value.excludedHistoryKeys !== undefined && (!Array.isArray(value.excludedHistoryKeys) || value.excludedHistoryKeys.length > 2 ||
      !value.excludedHistoryKeys.every(uuid) || new Set(value.excludedHistoryKeys).size !== value.excludedHistoryKeys.length)) return false;
  return [value.includedKeys, value.excludedKeys].every(list => Array.isArray(list) && list.length <= 5 &&
    list.every(uuid) && new Set(list).size === list.length);
}
function card(value: OwnedSourceCard): OwnedSourceCard {
  const instant = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v));
  if (!uuid(value.cardRef) || !["conversation_message", "check_in"].includes(value.kind) ||
      typeof value.version !== "string" || !value.version || value.version.length > 512 || !value.version.isWellFormed() ||
      !instant(value.sourceOccurredAt) || !instant(value.observedAt) || value.state !== "available" || value.canNavigate !== true) throw Error("Invalid inner source card");
  return { cardRef: value.cardRef, kind: value.kind, version: value.version, sourceOccurredAt: value.sourceOccurredAt,
    observedAt: value.observedAt, state: value.state, canNavigate: value.canNavigate };
}
function preparedSelection(value: PreparedReplySelection): PreparedReplySelection {
  if (!uuid(value.selectionRevision) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt) ||
      new Date(value.expiresAt).toISOString() !== value.expiresAt || !Array.isArray(value.sourceCards) || value.sourceCards.length > 5 ||
      new Set(value.sourceCards.map(v => v.selectionKey)).size !== value.sourceCards.length ||
      new Set(value.sourceCards.map(v => v.cardRef)).size !== value.sourceCards.length) throw Error("Invalid inner selection");
  if (!Array.isArray(value.historyPairs) || value.historyPairs.length > 2 ||
      new Set(value.historyPairs.map(v => v.historyKey)).size !== value.historyPairs.length ||
      new Set(value.historyPairs.flatMap(v => [v.userMessageId, v.assistantMessageId])).size !== value.historyPairs.length * 2 ||
      new Set(value.historyPairs.flatMap(v => [v.userSequence, v.assistantSequence])).size !== value.historyPairs.length * 2 ||
      value.historyPairs.some((v, i) => !uuid(v.historyKey) || !uuid(v.userMessageId) || !uuid(v.assistantMessageId) ||
        !Number.isSafeInteger(v.userSequence) || !Number.isSafeInteger(v.assistantSequence) || v.userSequence < 1 || v.assistantSequence <= v.userSequence ||
        i > 0 && v.assistantSequence <= value.historyPairs[i - 1]!.assistantSequence)) throw Error("Invalid inner history review");
  const today = value.today;
  if (today !== undefined && (!record(today) || !keys(today, ["date", "timeZone", "limit", "hasMore"]) ||
      typeof today.date !== "string" || typeof today.timeZone !== "string" || today.timeZone.length > 100 ||
      today.limit !== 5 || typeof today.hasMore !== "boolean" || !parseCivilDay(today.date, today.timeZone) ||
      new Set(value.sourceCards.map(v => v.checkInId)).size !== value.sourceCards.length)) throw Error("Invalid inner today selection");
  return { selectionRevision: value.selectionRevision, expiresAt: value.expiresAt,
    ...(today === undefined ? {} : { today: { date: today.date, timeZone: today.timeZone, limit: 5 as const, hasMore: today.hasMore } }),
    historyPairs: value.historyPairs.map(v => ({
    historyKey: v.historyKey, userMessageId: v.userMessageId, assistantMessageId: v.assistantMessageId,
    userSequence: v.userSequence, assistantSequence: v.assistantSequence,
  })), sourceCards: value.sourceCards.map(v => {
    if (!uuid(v.selectionKey) || v.kind !== "check_in") throw Error("Invalid inner selection key");
    if (today !== undefined && (typeof v.checkInId !== "string" || !isSafeDocumentId(v.checkInId))) throw Error("Invalid inner today source");
    return { ...card(v), selectionKey: v.selectionKey,
      ...(today === undefined ? {} : { checkInId: v.checkInId! }) };
  }) };
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
  if ((m.origin !== undefined || m.occurrenceId !== undefined || m.category !== undefined) &&
      !(m.role === "assistant" && m.origin === "proactive" && uuid(m.occurrenceId) && m.category === "explicit_follow_up")) throw Error("Invalid inner proactive message");
  if ((m.processing !== undefined || m.provider !== undefined || m.disclosureVersion !== undefined) &&
      (m.role !== 'assistant' || m.availability !== 'available' || m.processing !== 'cloud' || !parseCloudAiProcessing(m.provider, m.disclosureVersion))) throw Error('Invalid inner cloud provenance');
  if (m.sources !== undefined && (m.role !== "assistant" || m.availability !== "available" || !Array.isArray(m.sources) ||
      m.sources.length < 1 || m.sources.length > 15 || new Set(m.sources.map(v => v.cardRef)).size !== m.sources.length)) throw Error("Invalid inner message sources");
  return { messageId: m.messageId, sequence: m.sequence, role: m.role, persistedAt, availability: m.availability,
    ...(m.text === undefined ? {} : { text: m.text }),
    ...(m.origin === undefined ? {} : { origin: m.origin, occurrenceId: m.occurrenceId, category: m.category }),
    ...(m.sources === undefined ? {} : { sources: m.sources.map(card) }),
    ...(m.processing === 'cloud' ? {processing:m.processing,provider:m.provider,disclosureVersion:m.disclosureVersion} : {}) };
}
function noBody(request: FastifyRequest): boolean {
  return request.body === undefined && Number(request.headers["content-length"] ?? 0) === 0 && request.headers["transfer-encoding"] === undefined;
}
function deliver<T>(request: FastifyRequest, reply: FastifyReply, result: ConversationResult<T>, status: number, project: (value: T) => unknown): FastifyReply {
  if (result.kind === "terminated" || reply.raw.destroyed) { reply.hijack(); reply.raw.destroy(); return reply; }
  if (result.kind === "failure") return failure(request, reply, result.code);
  return reply.code(status).send(project(result.value));
}

export async function registerConversationRoutes(app: FastifyInstance, identity: IdentityVerifier, operations: ConversationOperations, processing: "local" | "cloud" = "local"): Promise<void> {
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
      (b.contextSelection !== undefined && !selectContext(b.contextSelection, processing)) ||
      !((b.kind === "send" && keys(b, ["kind", "purpose"], ["conversationId", "contextSelection"]) && (b.conversationId === undefined || uuid(b.conversationId))) ||
        (b.kind === "retry" && keys(b, ["kind", "purpose", "conversationId", "userMessageId"], ["contextSelection"]) && uuid(b.conversationId) && uuid(b.userMessageId)))) return failure(request, reply, "REQUEST_INVALID");
    if (processing === 'cloud' && b.contextSelection === undefined) return failure(request, reply, "AI_CONTEXT_NOT_PERMITTED");
    return deliver(request, reply, await operations.prepare(caller(request), b as unknown as PrepareConversation), 201, v => {
      if (!uuid(v.operationId) || !operationKey(v.operationKey) || !uuid(v.conversationId) ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.preparationExpiresAt) ||
          new Date(v.preparationExpiresAt).toISOString() !== v.preparationExpiresAt) throw new Error("Invalid inner preparation");
      return { operationId: v.operationId, operationKey: v.operationKey, conversationId: v.conversationId, preparationExpiresAt: v.preparationExpiresAt,
        ...(v.contextSelection === undefined ? {} : { contextSelection: preparedSelection(v.contextSelection) }) };
    });
  });
  app.post<{ Params: { operationId: string } }>("/v1/me/ai/operations/:operationId/execute", options, async (request, reply) => {
    const key = request.headers["ai-operation-key"], b = request.body;
    if (!clean(request) || !uuid(request.params.operationId) || !operationKey(key) || !record(b) ||
      !keys(b, ["text"], ["contextSelection", "replyToMessageId"]) || typeof b.text !== "string" ||
      (b.contextSelection !== undefined && !executeSelection(b.contextSelection)) ||
      (b.replyToMessageId !== undefined && !uuid(b.replyToMessageId))) return failure(request, reply, "REQUEST_INVALID");
    if (processing === 'cloud' && b.contextSelection === undefined) return failure(request, reply, "AI_CONTEXT_NOT_PERMITTED");
    if (!b.text.isWellFormed() || b.text.trim().length === 0 || [...b.text].length > 2400) return failure(request, reply, "AI_INPUT_INVALID");
    const controller = new AbortController();
    let accepted=false;
    const current=()=>!controller.signal.aborted&&!reply.raw.destroyed;
    const project=(v:ExecutedConversationPair)=>{
      if(v.operationId!==request.params.operationId||!uuid(v.conversationId)||v.userMessage.role!=="user"||
        v.assistantMessage.role!=="assistant"||v.userMessage.messageId===v.assistantMessage.messageId||
        v.userMessage.sequence>=v.assistantMessage.sequence||v.assistantMessage.availability!=="available")throw new Error("Invalid inner execution pair");
      return {operationId:v.operationId,conversationId:v.conversationId,userMessage:message(v.userMessage),assistantMessage:message(v.assistantMessage)};
    };
    const acceptCompleteBody=(value:ExecutedConversationPair):boolean=>{
      if(accepted||reply.sent||!current())return false;
      let bytes:Buffer;try{bytes=Buffer.from(JSON.stringify(project(value)),"utf8");}catch{return false;}
      if(accepted||reply.sent||!current())return false;
      try{
        // The complete serialized body enters the actual response sink in this
        // non-yielding event. No asynchronous onSend hook/queued later send may
        // stand in for F02 acceptance. This is not proof of client receipt.
        reply.hijack();
        for(const [name,value] of Object.entries(reply.getHeaders()))if(value!==undefined)reply.raw.setHeader(name,value);
        reply.raw.setHeader("content-type","application/json; charset=utf-8");reply.raw.setHeader("cache-control","no-store");
        reply.raw.setHeader("content-length",bytes.length);reply.raw.writeHead(200);
        reply.raw.end(bytes);accepted=true;return true;
      }catch{controller.abort();reply.raw.destroy();return false;}
    };
    const disconnected = (): void => { if (!reply.raw.writableEnded) controller.abort(); };
    request.raw.once("aborted", disconnected); reply.raw.once("close", disconnected);
    try {
      const result = await operations.execute(caller(request), { operationId: request.params.operationId, operationKey: key, text: b.text,
        ...(b.contextSelection === undefined ? {} : { contextSelection: b.contextSelection as ExecuteReplySelection }),
        ...(b.replyToMessageId === undefined ? {} : { replyToMessageId: b.replyToMessageId as string }) },
        { signal: controller.signal, current, acceptCompleteBody });
      if(accepted||reply.sent)return reply;
      if (controller.signal.aborted) { reply.hijack(); reply.raw.destroy(); return reply; }
      return deliver(request, reply, result, 200, project);
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
  app.get<{ Querystring: { after?: unknown } }>("/v1/me/conversations", { ...options, exposeHeadRoute:false }, async (request,reply) => {
    const after = request.query.after;
    if (!clean(request,["after"]) || !noBody(request) || request.headers["ai-operation-key"] !== undefined ||
        (after !== undefined && !uuid(after))) return failure(request,reply,"REQUEST_INVALID");
    if (!operations.listConversations) return failure(request,reply,"AI_UNAVAILABLE");
    return deliver(request,reply,await operations.listConversations(caller(request),after),200,page => {
      if (!Array.isArray(page.conversations) || page.conversations.length > 20 ||
          page.conversations.some((row,i) => !uuid(row.conversationId) ||
            (after !== undefined && row.conversationId <= after) ||
            (i > 0 && row.conversationId <= page.conversations[i - 1]!.conversationId) ||
            typeof row.lastMessageAt !== "string" || new Date(row.lastMessageAt).toISOString() !== row.lastMessageAt) ||
          (page.nextCursor !== undefined && (!uuid(page.nextCursor) || (after !== undefined && page.nextCursor <= after) ||
            page.conversations.some(row => row.conversationId > page.nextCursor!)))) throw new Error("Invalid inner conversation history");
      return { conversations:page.conversations.map(row => ({ conversationId:row.conversationId,lastMessageAt:row.lastMessageAt })),
        ...(page.nextCursor === undefined ? {} : { nextCursor:page.nextCursor }) };
    });
  });
  app.delete<{ Params: { conversationId: string } }>("/v1/me/conversations/:conversationId", options, async (request, reply) => {
    if (!clean(request) || !noBody(request) || request.headers["ai-operation-key"] !== undefined || !uuid(request.params.conversationId)) return failure(request, reply, "REQUEST_INVALID");
    return deliver(request, reply, await operations.deleteConversation(caller(request), request.params.conversationId), 204, () => undefined);
  });
}
