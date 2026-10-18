import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { ControlledOllamaTransport, type CompletePromptCompiler } from "../../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
import type { ControlledAiDiagnostic, ControlledAiObserver } from "../../src/ai-runtime/infrastructure/controlled-ai-diagnostic.js";

const manifest = "1".repeat(64), tokenizer = "2".repeat(64), reference = "private-model-canary:9b";
const binding = { endpoint: "http://127.0.0.1:11434", reference, manifestDigest: manifest, tokenizerDigest: tokenizer,
  ollamaVersion: "0.0.0-test", mode: "formal-9b" as const, current: () => true };
const compiled = { rawPrompt: "private-prompt-canary", tokens: 12, manifestDigest: manifest, tokenizerDigest: tokenizer, includesAllFraming: true as const };
const model = { name: reference, digest: manifest, details: { family: "qwen35", parameter_size: "9B" }, context_length: 8192 };
function fixture(options: { reply?: (path: string) => Response | undefined; compile?: CompletePromptCompiler<string>["compile"]; observer?: ControlledAiObserver } = {}) {
  const records: ControlledAiDiagnostic[] = [], calls: string[] = [], abort = new AbortController();
  const http: typeof fetch = (url) => {
    const path = new URL(String(url)).pathname; calls.push(path);
    const override = options.reply?.(path); // Deliberately permits a synchronous transport throw.
    return Promise.resolve(override ?? Response.json(path === "/api/version" ? { version: binding.ollamaVersion } : path === "/api/generate" ?
      { model: reference, done: true, response: "private-output-canary", prompt_eval_count: 12, eval_count: 20 } : { models: [model] }));
  };
  const adapter = new ControlledOllamaTransport(binding, { compile: options.compile ?? (async () => compiled) }, http,
    options.observer ?? (record => { records.push(record); }));
  return { adapter, records, calls, abort, budget: { deadline: 1000, signal: abort.signal, remainingMs: () => 1000 } };
}
const has = (records: ControlledAiDiagnostic[], stage: ControlledAiDiagnostic["stage"], status: ControlledAiDiagnostic["status"]) => records.some(r => r.stage === stage && r.status === status);

test("startup-ready then missing resident model reproduces not_checked before compile/POST, without claiming historical cause", async () => {
  let resident = true, compiles = 0;
  const f = fixture({ reply: path => path === "/api/ps" && !resident ? Response.json({ models: [] }) : undefined,
    compile: async () => { compiles++; return compiled; } });
  await f.adapter.preflight(f.budget); assert.equal(f.adapter.state, "ready"); resident = false;
  await assert.rejects(f.adapter.generate("input", f.budget), /AI_UNAVAILABLE/);
  assert.equal(f.adapter.state, "not_checked"); assert.equal(compiles, 0); assert(!f.calls.includes("/api/generate"));
  assert(has(f.records, "preflight_ps", "model_match_failed"));
});

for (const [label, path, response, stage, status] of [
  ["version", "/api/version", () => Response.json({ version: "wrong" }), "preflight_version", "version_mismatch"],
  ["HTTP", "/api/tags", () => new Response("private-error-canary", { status: 503 }), "preflight_tags", "http_failed"],
  ["envelope", "/api/tags", () => new Response('{"models":[],"models":[]}'), "preflight_tags", "envelope_invalid"],
  ["manifest", "/api/tags", () => Response.json({ models: [{ ...model, digest: "wrong" }] }), "preflight_tags", "manifest_mismatch"],
  ["family", "/api/tags", () => Response.json({ models: [{ ...model, details: { family: "other", parameter_size: "9B" } }] }), "preflight_tags", "family_size_mismatch"],
  ["context", "/api/ps", () => Response.json({ models: [{ ...model, context_length: 4096 }] }), "preflight_ps", "context_mismatch"],
] as const) test(`diagnosis distinguishes preflight ${label} and records no private vendor data`, async () => {
  const f = fixture({ reply: actual => actual === path ? response() : undefined });
  await assert.rejects(f.adapter.generate("input", f.budget), /AI_UNAVAILABLE/);
  assert(has(f.records, stage, status)); assert.equal(f.adapter.state, "not_checked"); assert(!f.calls.includes("/api/generate"));
  assert(!JSON.stringify(f.records).includes("private-"));
  assert(f.records.every(r => Number.isFinite(r.durationMs) && r.durationMs >= 0));
  if (label === "HTTP") assert.equal(f.records.at(-1)?.httpStatus, 503);
});

test("request failure, revoked budget, compiler failure and invalid compiler output remain distinguishable", async () => {
  const f = fixture({ reply: path => { if (path === "/api/ps") throw new Error("private-network-canary"); return undefined; } });
  await assert.rejects(f.adapter.generate("input", f.budget), /AI_UNAVAILABLE/);
  assert(has(f.records, "preflight_ps", "request_failed"));
  const revoked = fixture(); revoked.abort.abort();
  await assert.rejects(revoked.adapter.generate("input", revoked.budget), /AI_UNAVAILABLE/);
  assert(has(revoked.records, "preflight", "budget_or_authority_lost")); assert.equal(revoked.calls.length, 0);
  for (const kind of ["throw", "tokens"] as const) {
    const g = fixture({ compile: async () => { if (kind === "throw") throw new Error("private-compiler-canary"); return { ...compiled, tokens: 4097 }; } });
    await assert.rejects(g.adapter.generate("input", g.budget), /AI_UNAVAILABLE/);
    assert(has(g.records, "adapter_compile", kind === "throw" ? "compile_failed" : "compiled_input_invalid"));
    assert.equal(g.adapter.state, "ready"); assert(!g.calls.includes("/api/generate"));
  }
});

for (const kind of ["sync-throw", "HTTP", "partial"] as const) test(`dispatch ${kind} remains unresolved and is never diagnosed as stopped`, async () => {
  const f = fixture({ reply: path => {
    if (path !== "/api/generate") return undefined;
    if (kind === "sync-throw") throw new Error("private-dispatch-canary");
    return kind === "HTTP" ? new Response("private-error-canary", { status: 500 }) : Response.json({ model: reference, done: false });
  } });
  let settled = false; void f.adapter.generate("input", f.budget).then(() => { settled = true; }, () => { settled = true; });
  await setImmediate(); await setImmediate();
  assert.equal(settled, false); assert.equal(f.adapter.state, "termination_unconfirmed");
  assert(has(f.records, "generate_dispatch", "dispatch_attempted")); assert(has(f.records, "generate_done", "termination_unconfirmed"));
  assert(!has(f.records, "generate_done", "done_confirmed")); assert(!JSON.stringify(f.records).includes("private-"));
});

test("confirmed done with invalid counts is distinct from successful validation and contains no response bytes", async () => {
  const f = fixture({ reply: path => path === "/api/generate" ? Response.json({ model: reference, done: true, response: "private-output-canary", prompt_eval_count: 99, eval_count: 1 }) : undefined });
  await assert.rejects(f.adapter.generate("input", f.budget), /AI_UNAVAILABLE/); assert.equal(f.adapter.state, "stopped");
  assert(has(f.records, "generate_done", "done_confirmed")); assert(has(f.records, "output_validation", "output_invalid"));
  const g = fixture(); assert.equal(new TextDecoder().decode(await g.adapter.generate("input", g.budget)), "private-output-canary");
  assert(has(g.records, "output_validation", "passed")); assert.equal(g.adapter.state, "stopped");
  assert(!JSON.stringify([...f.records, ...g.records]).includes("private-"));
});

test("throwing observer cannot fabricate settlement of an unresolved original generation", async () => {
  const f = fixture({ observer: () => { throw new Error("private-sink-canary"); }, reply: path => path === "/api/generate" ? new Response("", { status: 500 }) : undefined });
  let settled = false; void f.adapter.generate("input", f.budget).then(() => { settled = true; }, () => { settled = true; });
  await setImmediate(); await setImmediate(); assert.equal(settled, false); assert.equal(f.adapter.state, "termination_unconfirmed");
  assert.equal(f.calls.filter(path => path === "/api/generate").length, 1);
});
