import type { FastifyInstance, FastifyReply, FastifyRequest, preValidationHookHandler } from "fastify";
import type { OwnPersonas } from "../application/own-personas.js";
import type { IdentityVerifier } from "../../shared/ports/identity-verifier.js";
import { buildAuthenticate, requirePrincipal } from "../../transport/authenticate.js";
import { sendFailure, sendFailureCode } from "../../transport/error-response.js";
import {
  activatePersonaSchema, createPersonaSchema, deletePersonaSchema, editPersonaSchema,
  getPersonaSchema, listPersonasSchema, personaCreateKeySchema, personaIdSchema,
} from "./schemas.js";

export type PersonaOperations = Pick<OwnPersonas, "list" | "get" | "create" | "edit" | "activate" | "delete">;
type EditableBody = { displayName: string; tone: string; responseLength: string; formatStyle: string };
type Versions = { expectedRevision: number; expectedStateRevision: number };
type CreateBody = EditableBody & { expectedStateRevision: number };
type Params = { personaId: string };
const idPattern = new RegExp(personaIdSchema.pattern);
const keyPattern = new RegExp(personaCreateKeySchema.pattern);
const editableShape = { displayName: "string", tone: "string", responseLength: "string", formatStyle: "string" } as const;
const versionsShape = { expectedRevision: "number", expectedStateRevision: "number" } as const;

/** Reject malformed input before AJV can coerce it, without changing older routes. */
function validateShape(fields?: Readonly<Record<string, "string" | "number">>, create = false): preValidationHookHandler {
  return async (request, reply) => {
    if (Object.keys(request.query as object).length !== 0) return sendFailureCode(request, reply, "REQUEST_INVALID");
    const params = request.params as Partial<Params>;
    if (params.personaId !== undefined && (params.personaId.length !== 64 || !idPattern.test(params.personaId))) return sendFailureCode(request, reply, "REQUEST_INVALID");
    const body = request.body;
    if (fields === undefined) {
      if (body !== undefined || Number(request.headers["content-length"] ?? 0) > 0 || request.headers["transfer-encoding"] !== undefined) {
        return sendFailureCode(request, reply, "REQUEST_INVALID");
      }
    } else {
      if (typeof body !== "object" || body === null || Array.isArray(body)) return sendFailureCode(request, reply, "REQUEST_INVALID");
      const values = body as Record<string, unknown>;
      if (Object.keys(values).length !== Object.keys(fields).length ||
        Object.entries(fields).some(([name, type]) => !Object.hasOwn(values, name) || typeof values[name] !== type)) {
        return sendFailureCode(request, reply, "REQUEST_INVALID");
      }
      if ("personaId" in values && ((values.personaId as string).length !== 64 || !idPattern.test(values.personaId as string))) return sendFailureCode(request, reply, "REQUEST_INVALID");
    }
    // Node joins repeated custom headers with commas; the exact syntax rejects those too.
    const key = request.headers["idempotency-key"];
    if (create) {
      if (typeof key !== "string" || key.length !== 36 || !keyPattern.test(key)) return sendFailureCode(request, reply, "IDEMPOTENCY_KEY_INVALID");
    } else if (key !== undefined) return sendFailureCode(request, reply, "REQUEST_INVALID");
  };
}

function personaErrorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): FastifyReply {
  const failure = error as Error & { validation?: unknown; validationContext?: string; statusCode?: number };
  if (failure.validation !== undefined) {
    return sendFailureCode(request, reply, failure.validationContext === "body" ? "PERSONA_INVALID" : "REQUEST_INVALID");
  }
  if (failure.statusCode === 400 || failure.statusCode === 413 || failure.statusCode === 415) {
    return sendFailureCode(request, reply, "REQUEST_INVALID");
  }
  return sendFailureCode(request, reply, "SERVICE_UNAVAILABLE");
}

export async function registerPersonaRoutes(app: FastifyInstance, identity: IdentityVerifier, personas: PersonaOperations): Promise<void> {
  const base = { onRequest: buildAuthenticate(identity), bodyLimit: 4096, errorHandler: personaErrorHandler };
  app.get("/v1/me/personas", { ...base, exposeHeadRoute: false, preValidation: validateShape(), schema: structuredClone(listPersonasSchema) }, async (request, reply) => {
    const result = await personas.list(requirePrincipal(request));
    return result.ok ? reply.send({ personas: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.get<{ Params: Params }>("/v1/me/personas/:personaId", { ...base, exposeHeadRoute: false, preValidation: validateShape(), schema: structuredClone(getPersonaSchema) }, async (request, reply) => {
    const result = await personas.get(requirePrincipal(request), request.params.personaId);
    return result.ok ? reply.send(result.value) : sendFailure(request, reply, result.failure);
  });
  app.post<{ Body: CreateBody }>("/v1/me/personas", {
    ...base, preValidation: validateShape({ ...editableShape, expectedStateRevision: "number" }, true), schema: structuredClone(createPersonaSchema),
  }, async (request, reply) => {
    const result = await personas.create({ principal: requirePrincipal(request), idempotencyKey: request.headers["idempotency-key"] as string, ...request.body });
    return result.ok ? reply.code(result.value.created ? 201 : 200).send({ persona: result.value.persona, stateRevision: result.value.stateRevision }) : sendFailure(request, reply, result.failure);
  });
  app.put<{ Body: EditableBody & Versions; Params: Params }>("/v1/me/personas/:personaId", {
    ...base, preValidation: validateShape({ ...editableShape, ...versionsShape }), schema: structuredClone(editPersonaSchema),
  }, async (request, reply) => {
    const result = await personas.edit({ principal: requirePrincipal(request), personaId: request.params.personaId, ...request.body });
    return result.ok ? reply.send(result.value) : sendFailure(request, reply, result.failure);
  });
  app.put<{ Body: Params & Versions }>("/v1/me/persona-selection", {
    ...base, preValidation: validateShape({ personaId: "string", ...versionsShape }), schema: structuredClone(activatePersonaSchema),
  }, async (request, reply) => {
    const result = await personas.activate({ principal: requirePrincipal(request), ...request.body });
    return result.ok ? reply.send({ personas: result.value }) : sendFailure(request, reply, result.failure);
  });
  app.delete<{ Body: Versions; Params: Params }>("/v1/me/personas/:personaId", {
    ...base, preValidation: validateShape(versionsShape), schema: structuredClone(deletePersonaSchema),
  }, async (request, reply) => {
    const result = await personas.delete({ principal: requirePrincipal(request), personaId: request.params.personaId, ...request.body });
    return result.ok ? reply.code(204).send() : sendFailure(request, reply, result.failure);
  });
}
