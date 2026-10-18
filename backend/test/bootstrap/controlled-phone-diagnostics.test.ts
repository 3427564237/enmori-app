import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { ControlledPhoneDiagnostics, type ControlledPhoneDiagnosticRecord } from "../../src/bootstrap/controlled-phone-diagnostics.js";
import type { ControlledAiDiagnostic } from "../../src/ai-runtime/infrastructure/controlled-ai-diagnostic.js";

const template = "/v1/me/ai/operations/:operationId/execute";
test("actual Fastify async requests get independent trusted correlation IDs and template-only safe errors", async t => {
  const records: ControlledPhoneDiagnosticRecord[] = [];
  const diagnostics = new ControlledPhoneDiagnostics(record => { records.push(record); });
  const app = Fastify({ logger: false, requestIdHeader: "x-request-id" }); t.after(() => app.close()); diagnostics.install(app);
  const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>();
  app.post<{ Params: { operationId: string } }>(template, async (request, reply) => {
    if (request.params.operationId === "private-first") { entered.resolve(); await release.promise; }
    else { await entered.promise; release.resolve(); }
    diagnostics.observe({ stage: "preflight_ps", status: "model_match_failed", durationMs: 3 });
    await Promise.resolve();
    return reply.code(503).send({ error: { code: "AI_UNAVAILABLE", message: "private-response-canary" }, requestId: request.id });
  });
  const responses = await Promise.all(["private-first", "private-second"].map(operationId => app.inject({
    method: "POST", url: `/v1/me/ai/operations/${operationId}/execute?private-query-canary=secret`,
    headers: { "x-request-id": "private-client-id", authorization: "Bearer private-token-canary" }, payload: { text: "private-body-canary" },
  })));
  assert.equal(diagnostics.healthy, true); assert.equal(records.length, 6);
  const ids = responses.map(r => r.json<{ requestId: string }>().requestId); assert.equal(new Set(ids).size, 2);
  for (const id of ids) {
    assert.match(id, /^[0-9a-f-]{36}$/);
    const group = records.filter(r => r.requestId === id); assert.equal(group.length, 3);
    assert(group.every(r => r.routeTemplate === template && r.method === "POST"));
    assert.equal(group[1]?.dependencyStatus, "model_match_failed");
    assert.equal(group[2]?.errorCategory, "AI_UNAVAILABLE"); assert.equal(group[2]?.httpStatus, 503);
    assert((group[2]?.latencyMs ?? -1) >= 0);
  }
  assert(!JSON.stringify(records).includes("private-"));
  assert(records.every(r => Object.isFrozen(r) && Number.isFinite(Date.parse(r.loggedAt))));
});

test("unknown error text, successful bodies and unrelated endpoints never enter diagnostics", async t => {
  const records: ControlledPhoneDiagnosticRecord[] = [], diagnostics = new ControlledPhoneDiagnostics(r => { records.push(r); });
  const app = Fastify({ logger: false }); t.after(() => app.close()); diagnostics.install(app);
  app.post(template, async (_request, reply) => reply.code(500).send({ error: { code: "private-error-code", message: "private-error-canary" } }));
  app.get("/v1/me/conversations/:conversationId/messages", async () => ({ text: "private-message-canary" }));
  app.get("/unrelated", async () => ({ token: "private-token-canary" }));
  await app.inject({ method: "POST", url: "/v1/me/ai/operations/private-op/execute" });
  await app.inject({ method: "GET", url: "/v1/me/conversations/private-conversation/messages" });
  await app.inject({ method: "GET", url: "/unrelated" });
  assert.equal(records.length, 4); assert(records.every(r => r.errorCategory === undefined));
  assert(!JSON.stringify(records).includes("private-"));
});

test("failed capture refuses subsequent positive attempts but retains original cancel/read routes", async t => {
  let fail = false, positive = 0, cancel = 0, reads = 0;
  const diagnostics = new ControlledPhoneDiagnostics(() => { if (fail) throw new Error("private-sink-canary"); });
  const app = Fastify({ logger: false }); t.after(() => app.close()); diagnostics.install(app);
  app.post(template, async () => { positive++; return {}; });
  app.post("/v1/me/ai/operations", async () => { positive++; return {}; });
  app.post("/v1/me/ai/operations/:operationId/cancel", async () => { cancel++; return {}; });
  app.get("/v1/me/conversations/:conversationId/operations/:operationId", async () => { reads++; return {}; });
  await app.inject({ method: "POST", url: "/v1/me/ai/operations/private-op/execute" }); assert.equal(positive, 1);
  fail = true;
  for (const url of ["/v1/me/ai/operations", "/v1/me/ai/operations/private-op/execute"]) {
    const result = await app.inject({ method: "POST", url }); assert.equal(result.statusCode, 503);
    assert.equal(result.json<{ error: { code: string } }>().error.code, "AI_UNAVAILABLE");
    assert.equal(result.headers["cache-control"], "no-store");
  }
  assert.equal(diagnostics.healthy, false); assert.equal(positive, 1);
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/ai/operations/private-op/cancel" })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: "/v1/me/conversations/private-conv/operations/private-op" })).statusCode, 200);
  assert.equal(cancel, 1); assert.equal(reads, 1);
});

test("extra fields and async sink failure latch unhealthy without logging content or unhandled rejection", async () => {
  const records: ControlledPhoneDiagnosticRecord[] = [], d = new ControlledPhoneDiagnostics(r => { records.push(r); });
  d.observe({ stage: "preflight_ps", status: "passed", durationMs: 0, privateId: "private-id-canary" } as ControlledAiDiagnostic);
  assert.equal(d.healthy, false); assert.equal(records.length, 0);
  const asyncSink = new ControlledPhoneDiagnostics(async () => { throw new Error("private-sink-canary"); });
  asyncSink.observe({ stage: "preflight_ps", status: "passed", durationMs: 0 }); await Promise.resolve();
  assert.equal(asyncSink.healthy, false);
});

test("startup and request compiler completion/failure are separated without copying input or errors", async () => {
  const records: ControlledPhoneDiagnosticRecord[] = [], d = new ControlledPhoneDiagnostics(r => { records.push(r); });
  const budget = { deadline: 10, signal: new AbortController().signal, remainingMs: () => 10 };
  const result = { rawPrompt: "private-prompt-canary", tokens: 12, manifestDigest: "private-manifest", tokenizerDigest: "private-tokenizer", includesAllFraming: true as const };
  assert.equal(await d.compiler("startup_compile", { compile: async () => result }).compile({}, budget), result);
  const error = new Error("private-compiler-canary");
  await assert.rejects(d.compiler("before_generation_compile", { compile: async () => { throw error; } }).compile({}, budget), e => e === error);
  assert.deepEqual(records.map(r => [r.dependencyStage, r.dependencyStatus]), [
    ["startup_compile", "started"], ["startup_compile", "passed"], ["before_generation_compile", "started"], ["before_generation_compile", "compile_failed"],
  ]);
  assert(records.every(r => r.requestId === undefined)); assert(!JSON.stringify(records).includes("private-"));
});
