import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { CONVERSATION_ERRORS } from "../ai-conversation/transport/register-routes.js";
import { diagnosticStages, diagnosticStatuses, type ControlledAiDiagnostic } from "../ai-runtime/infrastructure/controlled-ai-diagnostic.js";
import type { CompletePromptCompiler } from "../ai-runtime/infrastructure/controlled-ollama-transport.js";

export const controlledDiagnosticRoutes: ReadonlyMap<string, string> = new Map([
  ["/v1/me/ai/operations", "POST"],
  ["/v1/me/ai/operations/:operationId/execute", "POST"],
  ["/v1/me/ai/operations/:operationId/cancel", "POST"],
  ["/v1/me/conversations/:conversationId/operations/:operationId", "GET"],
  ["/v1/me/conversations/:conversationId/messages", "GET"],
  ["/v1/me/conversations/:conversationId", "DELETE"],
]);
type ErrorCategory = keyof typeof CONVERSATION_ERRORS;
export interface ControlledPhoneDiagnosticRecord {
  readonly loggedAt: string;
  readonly requestId?: string;
  readonly routeTemplate?: string;
  readonly method?: string;
  readonly httpStatus?: number;
  readonly latencyMs?: number;
  readonly errorCategory?: ErrorCategory;
  readonly dependencyStage?: ControlledAiDiagnostic["stage"];
  readonly dependencyStatus?: ControlledAiDiagnostic["status"];
  readonly durationMs?: number;
}
type Context = { readonly requestId: string; readonly routeTemplate: string; readonly method: string;
  readonly started: number; errorCategory?: ErrorCategory };

/** Opt-in, process-local collector for the assigned controlled phone diagnosis.
 * No filesystem, default logger, retention platform, public endpoint or IDs from
 * request paths/bodies. A sink must separately enforce the approved Q14 storage
 * boundary; ordinary service construction supplies no collector.
 */
export class ControlledPhoneDiagnostics {
  private readonly context = new AsyncLocalStorage<Context>();
  private readonly requests = new WeakMap<FastifyRequest, Context>();
  private failed = false;
  constructor(private readonly sink: (record: ControlledPhoneDiagnosticRecord) => void) {}
  get healthy(): boolean { return !this.failed; }
  private emit(record: Omit<ControlledPhoneDiagnosticRecord, "loggedAt">): void {
    if (this.failed) return;
    try {
      const returned: unknown = this.sink(Object.freeze({ loggedAt: new Date().toISOString(), ...record }));
      if (returned !== undefined) {
        this.failed = true;
        if (returned instanceof Promise) void returned.catch(() => {});
      }
    }
    catch { this.failed = true; } // No raw sink exception, retries or false success.
  }
  readonly observe = (event: ControlledAiDiagnostic): void => {
    // Reject forged fields even when a JS caller bypasses TypeScript. Never
    // spread an event, request, response or exception into an output record.
    if (!event || !diagnosticStages.includes(event.stage) || !diagnosticStatuses.includes(event.status) ||
        !Number.isFinite(event.durationMs) || event.durationMs < 0 ||
        Object.keys(event).some(key => !["stage", "status", "durationMs", "httpStatus"].includes(key)) ||
        (event.httpStatus !== undefined && (!Number.isInteger(event.httpStatus) || event.httpStatus < 100 || event.httpStatus > 599))) {
      this.failed = true; return;
    }
    const ctx = this.context.getStore();
    this.emit({ ...(ctx ? { requestId: ctx.requestId, routeTemplate: ctx.routeTemplate, method: ctx.method } : {}),
      dependencyStage: event.stage, dependencyStatus: event.status, durationMs: event.durationMs,
      ...(event.httpStatus === undefined ? {} : { httpStatus: event.httpStatus }) });
  };
  compiler<Input>(stage: "startup_compile" | "before_generation_compile", compiler: CompletePromptCompiler<Input>): CompletePromptCompiler<Input> {
    return { compile: async (input, budget) => {
      const started = performance.now();
      this.observe({ stage, status: "started", durationMs: 0 });
      try {
        const result = await compiler.compile(input, budget);
        this.observe({ stage, status: "passed", durationMs: performance.now() - started });
        return result;
      } catch (error) {
        this.observe({ stage, status: "compile_failed", durationMs: performance.now() - started });
        throw error;
      }
    } };
  }
  install(app: FastifyInstance): void {
    app.addHook("onRequest", (request, reply, done) => {
      const route = request.routeOptions.url;
      if (route === undefined || controlledDiagnosticRoutes.get(route) !== request.method) { done(); return; }
      // Independent trusted ID, never a client header or business identifier.
      const ctx: Context = { requestId: randomUUID(), routeTemplate: route, method: request.method, started: performance.now() };
      request.id = ctx.requestId;
      this.requests.set(request, ctx);
      this.context.run(ctx, () => {
        this.emit({ requestId: ctx.requestId, routeTemplate: route, method: request.method });
        done();
      });
    });
    app.addHook("preHandler", (request, reply, done) => {
      const ctx = this.requests.get(request);
      // Run after the existing route authentication. A failed capture prevents
      // another positive attempt without overriding Auth or original settlement.
      if (ctx && !this.healthy && (ctx.routeTemplate === "/v1/me/ai/operations" || ctx.routeTemplate.endsWith("/execute"))) {
        void reply.header("Cache-Control", "no-store").code(503).send({ error: { code: "AI_UNAVAILABLE", message: "AI is temporarily unavailable." }, requestId: ctx.requestId });
        return;
      }
      done();
    });
    app.addHook("onSend", (request, reply, payload, done) => {
      const ctx = this.requests.get(request);
      // Only a bounded ERROR envelope is inspected, never success content.
      if (ctx && reply.statusCode >= 400 && typeof payload === "string" && payload.length <= 8192) {
        try {
          const code: unknown = (JSON.parse(payload) as { error?: { code?: unknown } })?.error?.code;
          if (typeof code === "string" && Object.hasOwn(CONVERSATION_ERRORS, code)) {
            const category = code as ErrorCategory;
            if (CONVERSATION_ERRORS[category][0] === reply.statusCode) ctx.errorCategory = category;
          }
        } catch { /* Unknown/malformed content is never copied into diagnostics. */ }
      }
      done(null, payload);
    });
    app.addHook("onResponse", (request, reply, done) => {
      const ctx = this.requests.get(request);
      if (ctx) {
        this.emit({ requestId: ctx.requestId, routeTemplate: ctx.routeTemplate, method: ctx.method,
          httpStatus: reply.statusCode, latencyMs: Math.max(0, performance.now() - ctx.started),
          ...(ctx.errorCategory ? { errorCategory: ctx.errorCategory } : {}) });
        this.requests.delete(request);
      }
      done();
    });
  }
}
