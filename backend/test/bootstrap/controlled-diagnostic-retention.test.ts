import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { ControlledDiagnosticRetention, diagnosticRetentionMs, diagnosticCleanupAllowanceMs } from "../../src/bootstrap/controlled-diagnostic-retention.js";
import { ControlledPhoneDiagnostics, type ControlledPhoneDiagnosticRecord } from "../../src/bootstrap/controlled-phone-diagnostics.js";
const start = Date.parse("2026-10-18T00:00:00.000Z");
const record = { loggedAt: new Date(start).toISOString(), dependencyStage: "startup_compile", dependencyStatus: "passed", durationMs: 1 };

test("original loggedAt makes the exact 30-day boundary inaccessible and the next 24 hours are cleanup only", () => {
  let now = start; const policy = new ControlledDiagnosticRetention(() => now);
  assert.deepEqual(policy.read(record, true), record);
  now = start + diagnosticRetentionMs - 1; assert(policy.read(record, true));
  now++; assert.equal(policy.read(record, true), undefined); assert.equal(policy.cleanupState(record), "expired_cleanup_due");
  now += diagnosticCleanupAllowanceMs - 1; assert.equal(policy.read(record, true), undefined);
  assert.equal(policy.cleanupState(record), "expired_cleanup_due");
  now++; assert.equal(policy.read(record, true), undefined); assert.equal(policy.cleanupState(record), "cleanup_deadline_reached");
  assert.equal(record.loggedAt, "2026-10-18T00:00:00.000Z");
});

test("repeated reads and copies cannot extend retention or make expired records visible", () => {
  let now = start + diagnosticRetentionMs - 2; const policy = new ControlledDiagnosticRetention(() => now);
  const first = policy.read(record, true); assert(first); assert(Object.isFrozen(first));
  now++; assert(policy.read({ ...first }, true));
  now++; assert.equal(policy.read({ ...first }, true), undefined);
});

test("operator denial inspects no content and grants no raw data access", () => {
  let touched = false; const value = { get loggedAt() { touched = true; return record.loggedAt; } };
  const policy = new ControlledDiagnosticRetention(() => start);
  for (const granted of [false, undefined, 1, "true"])
    assert.throws(() => policy.read(value, granted as boolean), /OPERATOR_REQUIRED/);
  assert.equal(touched, false); assert.equal(policy.healthy, true);
});

test("invalid/future times, clock rollback and unavailable clock latch refusal without raw errors", () => {
  for (const loggedAt of ["2026-10-18", "invalid", "2026-10-18T00:00:00.001Z", "1969-12-31T23:59:59.999Z"]) {
    const policy = new ControlledDiagnosticRetention(() => start);
    assert.throws(() => policy.read({ ...record, loggedAt }, true), /POLICY_UNAVAILABLE/); assert.equal(policy.healthy, false);
  }
  let now = start + diagnosticRetentionMs; const policy = new ControlledDiagnosticRetention(() => now);
  assert.equal(policy.read(record, true), undefined); now = start;
  assert.throws(() => policy.read(record, true), /POLICY_UNAVAILABLE/); now += diagnosticRetentionMs;
  assert.throws(() => policy.read(record, true), /POLICY_UNAVAILABLE/);
  const clock = new ControlledDiagnosticRetention(() => { throw new Error("private-clock-canary"); });
  assert.throws(() => clock.read(record, true), error => error instanceof Error && error.message === "CONTROLLED_DIAGNOSTIC_POLICY_UNAVAILABLE");
});

test("stored metadata revalidates every key, template, category and finite numeric field", () => {
  const request = { loggedAt: record.loggedAt, requestId: "11111111-1111-4111-8111-111111111111", routeTemplate: "/v1/me/ai/operations/:operationId/execute", method: "POST", httpStatus: 503, latencyMs: 1, errorCategory: "AI_UNAVAILABLE" };
  for (const row of [{ ...record, text: "private-canary" }, { ...record, durationMs: Infinity }, { ...record, dependencyStatus: "private-canary" },
    { ...request, routeTemplate: "/v1/me/ai/operations/private-operation/execute" }, { ...request, requestId: "private-id" },
    { ...request, method: "GET" }, { ...request, httpStatus: 200 }, { ...request, latencyMs: NaN }, { ...request, errorCategory: "private-error" },
    { loggedAt: record.loggedAt, method: "POST" }, { ...record, [Symbol("private-canary")]: "hidden" }]) {
    const policy = new ControlledDiagnosticRetention(() => start);
    assert.throws(() => policy.read(row, true), /POLICY_UNAVAILABLE/); assert.equal(policy.healthy, false);
  }
  assert.deepEqual(new ControlledDiagnosticRetention(() => start).read(request, true), request);
  let touched = false; const getter = { ...record, get durationMs() { touched = true; return 0; } };
  assert.throws(() => new ControlledDiagnosticRetention(() => start).read(getter, true), /POLICY_UNAVAILABLE/); assert.equal(touched, false);
});

test("real collector records cross the retention validator with only trusted metadata", async t => {
  const rows: ControlledPhoneDiagnosticRecord[] = [], policy = new ControlledDiagnosticRetention();
  const diagnostics = new ControlledPhoneDiagnostics(row => { assert(policy.read(row, true)); rows.push(row); });
  const app = Fastify({ logger: false }); t.after(() => app.close()); diagnostics.install(app);
  app.post("/v1/me/ai/operations/:operationId/execute", async (_request, reply) => {
    diagnostics.observe({ stage: "preflight_ps", status: "model_match_failed", durationMs: 1 });
    return reply.code(503).send({ error: { code: "AI_UNAVAILABLE", message: "private-reply-canary" } });
  });
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/ai/operations/private-canary/execute" })).statusCode, 503);
  assert.equal(rows.length, 3); assert.equal(policy.healthy, true); assert.equal(diagnostics.healthy, true);
  assert(!JSON.stringify(rows).includes("private-"));
});

test("unknown cleanup propagates capture failure and refuses a new positive request without invoking its handler", async t => {
  const policy = new ControlledDiagnosticRetention();
  const diagnostics = new ControlledPhoneDiagnostics(row => { policy.read(row, true); });
  const app = Fastify({ logger: false }); t.after(() => app.close()); diagnostics.install(app);
  let calls = 0; app.post("/v1/me/ai/operations", async () => { calls++; return {}; });
  policy.observeCleanup(false);
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/ai/operations" })).statusCode, 503);
  assert.equal(calls, 0); assert.equal(diagnostics.healthy, false); policy.observeCleanup(true);
  assert.equal(policy.healthy, false); // A later receipt cannot erase an unknown original deletion.
});
