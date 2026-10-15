import assert from "node:assert/strict";
import test from "node:test";
import { boundedConversationSemanticCandidate, boundedConversationSemanticPolicyVersion } from "../src/ai-conversation/application/bounded-conversation-semantic-policy.js";
import type { ConversationInput } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import type { OutputCandidate } from "../src/ai-runtime/domain/parse-output.js";
import type { RequestBudget } from "../src/ai-runtime/ports/generation-transport.js";
import { boundedConversationSemanticCorpus, boundedConversationSemanticCorpusPolicyVersion,
  boundedConversationSemanticCorpusVersion } from "./support/bounded-conversation-semantic-corpus.js";

const input: ConversationInput = Object.freeze({ currentMessage: "今天读书了。", checkIns: Object.freeze([]), persona: undefined });
const output: OutputCandidate = Object.freeze({ schemaVersion: "ai_assistant_message_v1", message: "你提到：今天读书了。" });
function budget(controller = new AbortController(), remaining = () => 60_000): RequestBudget {
  return { deadline: 60_000, signal: controller.signal, remainingMs: remaining };
}

test("versioned synthetic corpus binds this conservative policy and all eight Q31-C rejection categories", () => {
  assert.equal(boundedConversationSemanticPolicyVersion, "bounded_routine_summary_v1");
  assert.equal(boundedConversationSemanticCorpusVersion, "bounded_routine_summary_corpus_v1");
  assert.equal(boundedConversationSemanticCorpusPolicyVersion, boundedConversationSemanticPolicyVersion);
  assert.equal(new Set(boundedConversationSemanticCorpus.map(row => row.id)).size, boundedConversationSemanticCorpus.length);
  for (const policyCategory of ["private-nonprojected-information", "claimed-external-access", "diagnosis-treatment-crisis",
    "claimed-mutation-action", "unsupported-recommendation-fact", "deterministic-result-contradiction-outside-purpose",
    "backend-instruction-disclosure", "outside-approved-purpose"]) {
    assert.ok(boundedConversationSemanticCorpus.some(row => row.category === "prohibited" && row.policyCategory === policyCategory));
  }
});

for (const row of boundedConversationSemanticCorpus) test(`${boundedConversationSemanticCorpusVersion} ${row.id} ${row.category}: ${row.policyCategory}`, async () => {
  const candidate: OutputCandidate = { schemaVersion: "ai_assistant_message_v1", message: row.message };
  assert.deepEqual(await boundedConversationSemanticCandidate(() => row.input, () => candidate, budget()),
    row.category === "allowed" ? { ok: true, value: undefined } : { ok: false, failure: "unsafe_output" });
});

test("grammar generalizes over recognized routine atoms rather than fixture identifiers", async () => {
  for (const action of ["散步", "读书", "阅读", "画画", "听音乐", "写日记", "整理房间", "做饭", "休息"]) {
    for (const time of ["今天", "昨天", "刚才", "早上", "上午", "下午", "晚上"]) {
      const statement = `我${time}${action}了。`;
      const projection = { ...input, currentMessage: statement };
      const candidate = { ...output, message: `你提到：${statement}` };
      assert.deepEqual(await boundedConversationSemanticCandidate(() => projection, () => candidate, budget()), { ok: true, value: undefined });
    }
  }
});

test("fresh equal projection and candidate objects are compatible with the real Application getters", async () => {
  assert.deepEqual(await boundedConversationSemanticCandidate(() => ({ ...input }), () => ({ ...output }), budget()), { ok: true, value: undefined });
});

test("whole-source parsing rejects final line separators and outer whitespace without trimming", async () => {
  for (const suffix of ["\n", "\r", "\u2028", "\u2029", " "]) {
    const source = `${input.currentMessage}${suffix}`;
    const projection = { ...input, currentMessage: source };
    const candidate = { ...output, message: `你提到：${source}` };
    assert.deepEqual(await boundedConversationSemanticCandidate(() => projection, () => candidate, budget()), { ok: false, failure: "unsafe_output" });
  }
});

test("other output purpose and unexpected input/Note/Persona/candidate fields fail closed", async () => {
  const invalidInputs: ConversationInput[] = [
    { ...input, privateField: "synthetic undeclared content" } as ConversationInput,
    { ...input, checkIns: [{ occurredAt: "2026-10-14T00:00:00.000Z", noteText: "昨天散步了。", moodLabel: "synthetic" }] },
    { ...input, checkIns: [{ occurredAt: "2026-10-14T00:00:00.000Z" }] } as unknown as ConversationInput,
    { ...input, checkIns: Array.from({ length: 6 }, () => ({ occurredAt: "2026-10-14T00:00:00.000Z", noteText: "昨天散步了。" })) },
    { ...input, persona: { schemaVersion: "persona_presentation_v1", tone: "neutral", responseLength: "concise", formatStyle: "plain", displayName: "synthetic" } } as ConversationInput,
  ];
  for (const projection of invalidInputs) {
    // Same unchanged malformed projection is a policy denial, not a missing holder.
    assert.deepEqual(await boundedConversationSemanticCandidate(() => projection, () => output, budget()), { ok: false, failure: "unsafe_output" });
  }
  const otherPurpose: OutputCandidate = { ...output, schemaVersion: "recommendation_explanation_v1" };
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => otherPurpose, budget()), { ok: false, failure: "unsafe_output" });
  const extra = { ...output, internalField: "synthetic" };
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => extra, budget()), { ok: false, failure: "unsafe_output" });
});

test("missing or throwing content getters and already-aborted/expired budgets deny stale authority", async () => {
  assert.deepEqual(await boundedConversationSemanticCandidate(() => undefined, () => output, budget()), { ok: false, failure: "stale_authority" });
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => undefined, budget()), { ok: false, failure: "stale_authority" });
  assert.deepEqual(await boundedConversationSemanticCandidate(() => { throw new Error("synthetic"); }, () => output, budget()), { ok: false, failure: "stale_authority" });
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => { throw new Error("synthetic"); }, budget()), { ok: false, failure: "stale_authority" });
  const controller = new AbortController(); controller.abort();
  let reads = 0;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => { reads++; return input; }, () => output, budget(controller)), { ok: false, failure: "stale_authority" });
  assert.equal(reads, 0);
  for (const remaining of [0, -1, NaN, Infinity]) {
    assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => output, budget(undefined, () => remaining)), { ok: false, failure: "stale_authority" });
  }
});

test("terminal or changed holders during a synchronous gate cannot receive old-content acceptance", async () => {
  let inputReads = 0;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => ++inputReads === 1 ? input : undefined, () => output, budget()),
    { ok: false, failure: "stale_authority" });
  let outputReads = 0;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => ++outputReads === 1 ? output : undefined, budget()),
    { ok: false, failure: "stale_authority" });
  inputReads = 0;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => ++inputReads === 1 ? input : { ...input, currentMessage: "昨天散步了。" }, () => output, budget()),
    { ok: false, failure: "stale_authority" });
  outputReads = 0;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => ++outputReads === 1 ? output : { ...output, message: "你提到：昨天散步了。" }, budget()),
    { ok: false, failure: "stale_authority" });
  const controller = new AbortController();
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => { controller.abort(); return output; }, budget(controller)),
    { ok: false, failure: "stale_authority" });
  let remaining = 60_000;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => { remaining = 0; return output; }, budget(undefined, () => remaining)),
    { ok: false, failure: "stale_authority" });
});

test("fresh candidate shape changes cannot borrow an earlier valid acceptance", async () => {
  const malformed: OutputCandidate[] = [
    { ...output, extra: "synthetic" } as OutputCandidate,
    Object.create(output) as OutputCandidate,
    Object.defineProperty({ ...output }, "message", { get: () => { throw new Error("must not invoke"); } }),
  ];
  for (const fresh of malformed) {
    let reads = 0;
    assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => ++reads === 1 ? output : fresh, budget()),
      { ok: false, failure: "stale_authority" });
  }
});

test("required projection fields must be own data properties and never invoke accessors", async () => {
  let accessorReads = 0;
  const accessor = () => { accessorReads++; return "今天读书了。"; };
  const accessorNote = Object.defineProperty({ occurredAt: "2026-10-14T00:00:00.000Z", noteText: "昨天散步了。" }, "noteText", { get: accessor });
  const accessorPersona = Object.defineProperty({ schemaVersion: "persona_presentation_v1", tone: "neutral", responseLength: "concise", formatStyle: "plain" }, "formatStyle", { get: accessor });
  const accessorNotes: unknown[] = [];
  Object.defineProperty(accessorNotes, "0", { get: accessor, enumerable: true, configurable: true });
  const malformed: ConversationInput[] = [
    Object.create(input) as ConversationInput,
    Object.assign(Object.create({ currentMessage: input.currentMessage }), { checkIns: [], persona: undefined }) as ConversationInput,
    Object.defineProperty({ ...input }, "currentMessage", { get: accessor }),
    Object.defineProperty({ ...input }, "checkIns", { get: accessor }),
    Object.defineProperty({ ...input }, "persona", { get: accessor }),
    { ...input, checkIns: [Object.create({ occurredAt: "2026-10-14T00:00:00.000Z", noteText: "昨天散步了。" })] },
    { ...input, checkIns: [accessorNote] },
    { ...input, persona: accessorPersona } as ConversationInput,
    { ...input, checkIns: accessorNotes } as unknown as ConversationInput,
  ];
  for (const projection of malformed) {
    assert.deepEqual(await boundedConversationSemanticCandidate(() => projection, () => output, budget()),
      { ok: false, failure: "unsafe_output" });
  }
  const malformedCandidates = [Object.create(output) as OutputCandidate,
    Object.defineProperty({ ...output }, "schemaVersion", { get: accessor }),
    Object.defineProperty({ ...output }, "message", { get: accessor })];
  for (const candidate of malformedCandidates) {
    assert.deepEqual(await boundedConversationSemanticCandidate(() => input, () => candidate, budget()),
      { ok: false, failure: "unsafe_output" });
  }
  assert.equal(accessorReads, 0);
});

test("absent optional Persona never reads an inherited accessor", async () => {
  let reads = 0;
  const prototype = Object.defineProperty({}, "persona", { get: () => { reads++; throw new Error("must not invoke"); } });
  const projection = Object.assign(Object.create(prototype), { currentMessage: input.currentMessage, checkIns: [] }) as ConversationInput;
  assert.deepEqual(await boundedConversationSemanticCandidate(() => projection, () => output, budget()), { ok: true, value: undefined });
  assert.equal(reads, 0);
});
