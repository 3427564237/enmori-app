import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import type { FirstFlowApplication } from "../application/first-flow-application.js";
import type { FirstFlowFailure, FirstFlowIntent, FirstFlowIntentCommand, FirstFlowIntentView,
  FirstFlowRegistration, FirstFlowRegistrationCommand, FirstFlowResult, FirstFlowSettings,
  FirstFlowSettingsInput, FirstFlowSettingsView, ProactiveActor } from "../ports/first-flow.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const exact = (x: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean =>
  required.every(key => Object.hasOwn(x, key)) && Object.keys(x).every(key => required.includes(key) || optional.includes(key));
const version = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
const uuid = (x: unknown): x is string => typeof x === "string" && UUID.test(x);
function utc(x: unknown): x is string {
  return typeof x === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) &&
    Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
}
function zone(x: unknown): x is string {
  if (typeof x !== "string" || !(x === "UTC" || /^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(x))) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: x }).format(); return true; } catch { return false; }
}

export function parseFirstFlowSettings(x: unknown): { expectedRevision: number; input: FirstFlowSettingsInput } | undefined {
  if (!record(x) || !exact(x, ["expectedRevision", "mode", "categories", "timeZone", "quiet", "maximumInRolling24h", "cooldownMinutes", "pushEnabled", "preview"], ["pausedUntil"]) ||
    !version(x.expectedRevision) || typeof x.mode !== "string" || !["off", "on", "paused"].includes(x.mode) || !Array.isArray(x.categories) ||
    x.categories.length > 1 || x.categories.some(value => value !== "explicit_follow_up") || !zone(x.timeZone) ||
    x.maximumInRolling24h !== 1 || x.cooldownMinutes !== 480 || typeof x.pushEnabled !== "boolean" ||
    typeof x.preview !== "string" || !["generic", "hidden"].includes(x.preview) || !record(x.quiet)) return undefined;
  if (x.pausedUntil !== undefined && (x.mode !== "paused" || !utc(x.pausedUntil))) return undefined;
  const q = x.quiet;
  if (!(q.kind === "disabled" && exact(q, ["kind"]) || q.kind === "window" && exact(q, ["kind", "startMinute", "endMinute"]) &&
    version(q.startMinute) && q.startMinute < 1440 && version(q.endMinute) && q.endMinute < 1440 && q.startMinute !== q.endMinute)) return undefined;
  return { expectedRevision: x.expectedRevision, input: {
    mode: x.mode as FirstFlowSettingsInput["mode"], categories: [...x.categories] as "explicit_follow_up"[], timeZone: x.timeZone,
    quiet: q.kind === "disabled" ? { kind: "disabled" } : { kind: "window", startMinute: q.startMinute as number, endMinute: q.endMinute as number },
    maximumInRolling24h: 1, cooldownMinutes: 480, pushEnabled: x.pushEnabled, preview: x.preview as "generic" | "hidden",
    ...(x.pausedUntil === undefined ? {} : { pausedUntil: x.pausedUntil as string }),
  } };
}
function intentCommand(body: unknown, key: unknown): FirstFlowIntentCommand | undefined {
  if (!record(body) || !exact(body, ["conversationId", "sourceMessageId", "category", "dueAt", "timeZone", "processing", "expectedSettingsRevision"]) ||
    !uuid(key) || !uuid(body.conversationId) || !uuid(body.sourceMessageId) || body.category !== "explicit_follow_up" ||
    body.processing !== "local" || !utc(body.dueAt) || !zone(body.timeZone) || !version(body.expectedSettingsRevision)) return undefined;
  return { intentId: key, conversationId: body.conversationId, sourceMessageId: body.sourceMessageId,
    category: "explicit_follow_up", dueAt: body.dueAt, timeZone: body.timeZone, processing: "local", expectedSettingsRevision: body.expectedSettingsRevision };
}

/** Explicit wire allowlists. Never spread store records into responses. */
export function firstFlowSettingsView(value: FirstFlowSettings): FirstFlowSettingsView {
  return { revision: value.revision, mode: value.mode, categories: [...value.categories], timeZone: value.timeZone,
    quiet: value.quiet.kind === "disabled" ? { kind: "disabled" } : { kind: "window", startMinute: value.quiet.startMinute, endMinute: value.quiet.endMinute },
    maximumInRolling24h: 1, cooldownMinutes: 480, pushEnabled: value.pushEnabled, preview: value.preview,
    ...(value.pausedUntil === undefined ? {} : { pausedUntil: value.pausedUntil }) };
}
export function firstFlowIntentView(value: FirstFlowIntent): FirstFlowIntentView {
  const irreversible = ["dispatching", "accepted", "unknown"].includes(value.dispatchState);
  const terminal = ["cancelled", "expired", "failed"].includes(value.state);
  return { intentId: value.intentId, revision: value.revision,
    state: !terminal && irreversible ? value.dispatchState as "dispatching" | "accepted" | "unknown" : value.state,
    dueAt: value.dueAt, expiresAt: value.expiresAt, category: value.category, conversationId: value.conversationId,
    ...(irreversible ? { recallPossible: false as const } : {}) };
}
function registrationView(value: FirstFlowRegistration): FirstFlowRegistration {
  return { revision: value.revision, enabled: value.enabled, availability: value.availability,
    ...(value.installationRef === undefined ? {} : { installationRef: value.installationRef }),
    ...(value.expiresAt === undefined ? {} : { expiresAt: value.expiresAt }) };
}

const failureCode: Record<FirstFlowFailure, readonly [number, string, string]> = {
  invalid: [422, "PROACTIVE_INPUT_INVALID", "Check the follow-up time and options."],
  denied: [409, "AI_AUTHORITY_CHANGED", "Your permission to continue has changed."],
  terminated: [409, "AI_AUTHORITY_CHANGED", "Your permission to continue has changed."],
  not_found: [404, "AI_SOURCE_UNAVAILABLE", "This reference is unavailable. Keep your draft and review the sources."],
  expired: [404, "AI_SOURCE_UNAVAILABLE", "This reference is unavailable. Keep your draft and review the sources."],
  revision_conflict: [412, "PROACTIVE_REVISION_PRECONDITION_FAILED", "Follow-up state changed. Read the current state before continuing."],
  conflict: [409, "AI_OPERATION_CONFLICT", "Check saved messages before trying again."],
  selection_conflict: [409, "AI_CONTEXT_SELECTION_CONFLICT", "The selected sources conflict with this context. Review them before continuing."],
  not_due: [429, "AI_BUSY", "AI is busy. Try again later."],
  quiet: [429, "AI_BUSY", "AI is busy. Try again later."],
  frequency: [429, "AI_BUSY", "AI is busy. Try again later."],
  unavailable: [503, "AI_UNAVAILABLE", "AI is temporarily unavailable."],
  unknown: [503, "AI_OUTCOME_UNRESOLVED", "We couldn’t confirm the result. Check saved messages before trying again."],
};
function failure(request: FastifyRequest, reply: FastifyReply, error: FirstFlowFailure): FastifyReply {
  const [status, code, message] = failureCode[error];
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}
function requestFailure(request: FastifyRequest, reply: FastifyReply, code = "REQUEST_INVALID", status = 400): FastifyReply {
  const message = code === "REQUEST_TOO_LARGE" ? "The request is too large." : code === "IDEMPOTENCY_KEY_INVALID"
    ? "Use a valid idempotency key." : "Request parameters are invalid.";
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}
function rawHeaderCount(request: FastifyRequest, name: string): number {
  let count = 0;
  for (let i = 0; i < request.raw.rawHeaders.length; i += 2) if (request.raw.rawHeaders[i]?.toLowerCase() === name) count++;
  return count;
}

export async function registerFirstFlowRoutes(app: FastifyInstance, identity: IdentityVerifier,
  service: FirstFlowApplication, accepting: () => boolean = () => true): Promise<void> {
  const admitted = (): boolean => { try { return accepting() === true; } catch { return false; } };
  await app.register(async scope => {
    const actors = new WeakMap<FastifyRequest, ProactiveActor>();
    scope.addHook("onRequest", async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      if (!admitted()) return failure(request, reply, "unavailable");
      const match = /^Bearer ([^\s,]+)$/.exec(request.headers.authorization ?? "");
      if (!match?.[1]) return reply.code(401).send({ error: { code: "AUTH_REQUIRED", message: "Your session has expired. Sign in again." }, requestId: request.id });
      const token = match[1];
      let verified;
      try { verified = await identity.verifyIdToken(token); } catch { return failure(request, reply, "unavailable"); }
      if (!admitted()) return failure(request, reply, "unavailable");
      if (verified.kind === "dependency_unavailable") return failure(request, reply, "unavailable");
      if (verified.kind !== "verified") return reply.code(verified.kind === "forbidden" ? 403 : 401)
        .send({ error: { code: verified.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AUTH_REQUIRED", message: "This session cannot continue." }, requestId: request.id });
      let live = true;
      request.raw.once("aborted", () => { live = false; });
      reply.raw.once("close", () => { live = false; });
      actors.set(request, { principal: verified.principal, current: () => admitted() && live && !request.raw.aborted && !reply.raw.destroyed,
        verifyCurrentAuth: () => identity.verifyIdToken(token) });
    });
    scope.setErrorHandler((error, request, reply) => {
      const status = (error as { statusCode?: number }).statusCode;
      return status === 413 ? requestFailure(request, reply, "REQUEST_TOO_LARGE", 413)
        : status === 400 || status === 415 ? requestFailure(request, reply) : failure(request, reply, "unavailable");
    });
    const actor = (request: FastifyRequest): ProactiveActor => { const found = actors.get(request); if (!found) throw Error("Missing verified actor"); return found; };
    const clean = (request: FastifyRequest, body = false, create = false): boolean =>
      record(request.query) && Object.keys(request.query).length === 0 &&
      ["ai-operation-key", "if-match", "if-none-match", "if-unmodified-since"].every(key => request.headers[key] === undefined) &&
      (create || request.headers["idempotency-key"] === undefined) &&
      (body || request.body === undefined && Number(request.headers["content-length"] ?? 0) === 0 && request.headers["transfer-encoding"] === undefined);
    const deliver = <T>(request: FastifyRequest, reply: FastifyReply, result: FirstFlowResult<T>, project: (value: T) => unknown, status = 200): FastifyReply => {
      const current = () => { try { return actors.get(request)?.current() === true && !reply.raw.destroyed; } catch { return false; } };
      if (result.kind === "terminated" || !current()) { reply.hijack(); reply.raw.destroy(); return reply; }
      if (result.kind !== "ok") return failure(request, reply, result.kind);
      const projected = project(result.value);
      if (!current()) { reply.hijack(); reply.raw.destroy(); return reply; }
      return reply.code(status).send(projected);
    };
    const options = { bodyLimit: 8192 };
    const getOptions = { exposeHeadRoute: false };

    scope.get("/v1/me/proactive-settings", getOptions, async (req, res) => clean(req)
      ? deliver(req, res, await service.settings(actor(req)), firstFlowSettingsView) : requestFailure(req, res));
    scope.put("/v1/me/proactive-settings", options, async (req, res) => {
      if (!clean(req, true) || !record(req.body) || !exact(req.body, ["expectedRevision", "mode", "categories", "timeZone", "quiet", "maximumInRolling24h", "cooldownMinutes", "pushEnabled", "preview"], ["pausedUntil"])) return requestFailure(req, res);
      const parsed = clean(req, true) && parseFirstFlowSettings(req.body);
      return parsed ? deliver(req, res, await service.replaceSettings(actor(req), parsed.expectedRevision, parsed.input), firstFlowSettingsView) : failure(req, res, "invalid");
    });
    scope.post("/v1/me/proactive-intents", options, async (req, res) => {
      if (rawHeaderCount(req, "idempotency-key") !== 1 || !uuid(req.headers["idempotency-key"])) return requestFailure(req, res, "IDEMPOTENCY_KEY_INVALID");
      if (!clean(req, true, true) || !record(req.body) || !exact(req.body, ["conversationId", "sourceMessageId", "category", "dueAt", "timeZone", "processing", "expectedSettingsRevision"])) return requestFailure(req, res);
      const parsed = intentCommand(req.body, req.headers["idempotency-key"]);
      return parsed ? deliver(req, res, await service.createIntent(actor(req), parsed), firstFlowIntentView, 201) : failure(req, res, "invalid");
    });
    scope.get("/v1/me/proactive-intents", getOptions, async (req, res) => clean(req)
      ? deliver(req, res, await service.activeIntents(actor(req)), values => {
        if (values.length > 3) throw Error("Incomplete active set"); return { intents: values.map(firstFlowIntentView) };
      }) : requestFailure(req, res));
    scope.get<{ Params: { intentId: string } }>("/v1/me/proactive-intents/:intentId", getOptions, async (req, res) =>
      clean(req) && uuid(req.params.intentId) ? deliver(req, res, await service.intent(actor(req), req.params.intentId), firstFlowIntentView) : requestFailure(req, res));
    scope.delete<{ Params: { intentId: string } }>("/v1/me/proactive-intents/:intentId", options, async (req, res) =>
      clean(req, true) && uuid(req.params.intentId) && record(req.body) && exact(req.body, ["expectedRevision"]) && version(req.body.expectedRevision)
        ? deliver(req, res, await service.cancelIntent(actor(req), req.params.intentId, req.body.expectedRevision), firstFlowIntentView) : requestFailure(req, res));
    scope.get("/v1/me/proactive-registration", getOptions, async (req, res) => clean(req)
      ? deliver(req, res, await service.registration(actor(req)), registrationView) : requestFailure(req, res));
    scope.put("/v1/me/proactive-registration", options, async (req, res) => {
      const b = req.body;
      if (!clean(req, true) || !record(b) || !exact(b, ["expectedRevision", "installationRef", "registrationKind", "registrationValue", "enabled"])) return requestFailure(req, res);
      if (!clean(req, true) || !record(b) || !exact(b, ["expectedRevision", "installationRef", "registrationKind", "registrationValue", "enabled"]) ||
        !version(b.expectedRevision) || !uuid(b.installationRef) || b.registrationKind !== "fcm_token" || b.enabled !== true ||
        typeof b.registrationValue !== "string" || !b.registrationValue.isWellFormed() || !b.registrationValue.trim() ||
        Buffer.byteLength(b.registrationValue, "utf8") > 4096 || /[\u0000-\u001f\u007f]/.test(b.registrationValue)) return failure(req, res, "invalid");
      const command: FirstFlowRegistrationCommand = { expectedRevision: b.expectedRevision, installationRef: b.installationRef,
        registrationKind: "fcm_token", registrationValue: b.registrationValue, enabled: true };
      return deliver(req, res, await service.replaceRegistration(actor(req), command), registrationView);
    });
    scope.delete("/v1/me/proactive-registration", options, async (req, res) => {
      const b = req.body;
      return clean(req, true) && record(b) && exact(b, ["expectedRevision", "installationRef"]) && version(b.expectedRevision) && uuid(b.installationRef)
        ? deliver(req, res, await service.deleteRegistration(actor(req), b.installationRef, b.expectedRevision), registrationView) : requestFailure(req, res);
    });
    scope.get<{ Params: { conversationId: string } }>("/v1/me/conversations/:conversationId/read-state", getOptions, async (req, res) =>
      clean(req) && uuid(req.params.conversationId) ? deliver(req, res, await service.readState(actor(req), req.params.conversationId), value => ({ revision: value.revision, readThroughSequence: value.readThroughSequence })) : requestFailure(req, res));
    scope.put<{ Params: { conversationId: string } }>("/v1/me/conversations/:conversationId/read-state", options, async (req, res) => {
      const b = req.body;
      return clean(req, true) && uuid(req.params.conversationId) && record(b) && exact(b, ["expectedRevision", "readThroughSequence"]) && version(b.expectedRevision) && version(b.readThroughSequence)
        ? deliver(req, res, await service.markRead(actor(req), req.params.conversationId, b.expectedRevision, b.readThroughSequence), value => ({ revision: value.revision, readThroughSequence: value.readThroughSequence })) : requestFailure(req, res);
    });
  });
}
