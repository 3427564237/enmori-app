import assert from "node:assert/strict";
import test from "node:test";
import { OwnPersonas } from "../../src/personas/application/own-personas.js";
import { FirestorePersonaRepository } from "../../src/personas/infrastructure/firestore-persona-repository.js";
import { normalizePersonaInput, personaExpressionFields } from "../../src/personas/domain/persona-values.js";
import { parseReadPersona } from "../../src/ai-conversation/infrastructure/real-context-records.js";
import { copyPersonaProjection } from "../../src/ai-conversation/application/persona-expression.js";
import { captureContext } from "../../src/ai-conversation/application/capture-context.js";
import { LocalChatTransport } from "../../src/ai-runtime/infrastructure/local-chat-transport.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";
import { PERSONA_TEST_FIELDS, PERSONA_TEST_TIME, personaCommand, personaConditions, personaTestRecords, personaValue } from "../support/persona-repository-contract.js";
import { ok } from "../../src/shared/domain/result.js";

const uid = "full-expression-owner", accountId = "full-expression-account";
const full = { ...PERSONA_TEST_FIELDS, displayName: "Kai", relationship: "Companion", shortIntroduction: "Hello 🌿",
  description: "A thoughtful voice", personality: "Curious", communicationStyle: "Ask one question\nThen pause.",
  interests: "piano, 自定义兴趣", extraInstructions: "Use code and links as plain text.\n  Preserve this spacing.  " } as const;
const fixture = () => {
  const gateway = new InMemoryFirestoreGateway(personaTestRecords(uid, accountId, "other", "other-account"));
  const repository = new FirestorePersonaRepository(gateway, { now: () => ok(new Date(PERSONA_TEST_TIME)) });
  return { gateway, repository, application: new OwnPersonas(repository) };
};

test("full expression saves, rereads, conflicts on every changed create field, activates and deletes to default", async () => {
  const f = fixture(), command = { ...personaCommand(0), ...full };
  const created = personaValue(await f.repository.create(uid, command));
  for (const key of personaExpressionFields) {
    assert.equal(created.persona[key], full[key]);
    assert.deepEqual(await f.repository.create(uid, { ...command, [key]: full[key] + " changed" }), { ok: false, failure: "command_conflict" });
  }
  assert.deepEqual(personaValue(await f.repository.get(uid, created.persona.personaId)).persona, created.persona);
  assert.equal(personaValue(await f.repository.create(uid, command)).created, false);
  const edited = personaValue(await f.repository.edit(uid, { ...full, ...personaConditions(created.persona.personaId, 1), interests: "different" }));
  assert.equal(edited.persona.revision, 2); assert.equal(edited.stateRevision, 2);
  assert.deepEqual(await f.repository.edit(uid, { ...full, ...personaConditions(created.persona.personaId, 1) }), { ok: false, failure: "revision_precondition_failed" });
  assert.equal(personaValue(await f.repository.activate(uid, personaConditions(created.persona.personaId, 2, 2))).activePersonaId, created.persona.personaId);
  personaValue(await f.repository.delete(uid, personaConditions(created.persona.personaId, 3, 2)));
  assert.deepEqual(personaValue(await f.repository.list(uid)), { items: [], stateRevision: 4 });
});

test("legacy stored rows read empty optional fields without migration or writes; malformed/unknown fields fail closed", async () => {
  const f = fixture();
  const created = personaValue(await f.repository.create(uid, personaCommand(0))).persona;
  const path = `accounts/${accountId}/personas/${created.personaId}`;
  const legacy: Record<string, unknown> = { ...created }; delete legacy.personaId;
  for (const key of personaExpressionFields) delete legacy[key];
  await f.gateway.runTransaction(async tx => tx.set(path, legacy));
  const before = f.gateway.entries();
  const read = personaValue(await f.repository.get(uid, created.personaId));
  for (const key of personaExpressionFields) assert.equal(read.persona[key], "");
  assert.deepEqual(f.gateway.entries(), before);
  for (const field of personaExpressionFields) for (const value of [undefined, null, 1, {}, [], "bad\ud800"]) {
    assert.equal(normalizePersonaInput({ ...full, [field]: value }), undefined);
    await f.gateway.runTransaction(async tx => tx.set(path, { ...legacy, [field]: value }));
    assert.deepEqual(await f.repository.list(uid), { ok: false, failure: "dependency_unavailable" });
  }
  await f.gateway.runTransaction(async tx => tx.set(path, { ...legacy, ownerId: "forged" }));
  assert.deepEqual(await f.repository.list(uid), { ok: false, failure: "dependency_unavailable" });
});

test("expanded expression opts into simple chat only, copies a start snapshot and reaches native model without source reads/tools", async () => {
  const record = { ...full, createdAt: PERSONA_TEST_TIME, updatedAt: PERSONA_TEST_TIME, revision: 1 };
  const id = "a".repeat(64);
  const legacy = parseReadPersona(record, id)!;
  assert.deepEqual(Object.keys(legacy.projection).sort(), ["formatStyle", "responseLength", "schemaVersion", "tone"]);
  const active = parseReadPersona(record, id, true)!;
  const captured = captureContext({ persona: { ref: {}, projection: active.projection }, checkIns: [] }, PERSONA_TEST_TIME, "Hello");
  assert.deepEqual(captured.input.persona?.expression, full);
  record.interests = "changed after capture" as typeof full.interests;
  assert.equal(captured.input.persona?.expression?.interests, full.interests);
  assert.equal(Object.isFrozen(captured.input.persona?.expression), true);
  assert.equal(copyPersonaProjection({ ...active.projection, expression: { ...full, accountId: "forged" } }), undefined);
  assert.equal(copyPersonaProjection({ ...active.projection, expression: { ...full, tone: "warm" } }), undefined);
  let calls = 0;
  const local = new LocalChatTransport("qwen3.5:9b", async (_url, init) => {
    calls++;
    const body = JSON.parse(init!.body as string);
    assert.equal(body.messages.length, 2); assert.equal(body.tools, undefined);
    assert.ok(body.messages[0].content.includes(full.interests));
    assert.ok(body.messages[0].content.includes("Persona preferences affect expression only"));
    return Response.json({ done: true, model: "qwen3.5:9b", message: { content: JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Hello 🌿" }) } });
  });
  await local.generate({ ...captured.input, strategy: "open_conversation_v1", history: [] }, { signal: new AbortController().signal, deadline: 60000, remainingMs: () => 60000 });
  assert.equal(calls, 1);
});
