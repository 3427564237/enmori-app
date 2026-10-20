import assert from "node:assert/strict";
import test from "node:test";
import type { PersonaCreate, PersonaPreconditions } from "../../src/personas/application/persona-model.js";
import type { PersonaRepository, PersonaResult } from "../../src/personas/ports/persona-repository.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";

export const PERSONA_TEST_TIME = "2026-10-08T01:02:03.004Z";
export const PERSONA_TEST_FIELDS = { displayName: "Synthetic Persona", tone: "neutral", responseLength: "balanced", formatStyle: "plain",
  relationship: "", shortIntroduction: "", description: "", personality: "", communicationStyle: "", interests: "", extraInstructions: "" } as const;
export const personaTestKey = (index: number): string => `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
export const personaCommand = (expectedStateRevision: number, index = expectedStateRevision): PersonaCreate => ({
  ...PERSONA_TEST_FIELDS, expectedStateRevision, idempotencyKey: personaTestKey(index),
});
export const personaConditions = (personaId: string, expectedStateRevision: number, expectedRevision = 1): PersonaPreconditions => ({
  personaId, expectedRevision, expectedStateRevision,
});
export function personaValue<T>(result: PersonaResult<T>): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected synthetic Persona operation success");
  return result.value;
}

export function personaTestRecords(uid: string, accountId: string, otherUid: string, otherAccountId: string): Record<string, Record<string, unknown>> {
  const account = (username: string) => ({ username, optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: PERSONA_TEST_TIME });
  return {
    [`auth_bindings/${createAuthBindingDocumentId(uid)!}`]: { accountId },
    [`auth_bindings/${createAuthBindingDocumentId(otherUid)!}`]: { accountId: otherAccountId },
    [`accounts/${accountId}`]: account("persona_one"),
    [`accounts/${otherAccountId}`]: account("persona_two"),
    [`accounts/${accountId}/persona_state/current`]: { livePersonaIds: [], stateRevision: 0 },
    [`accounts/${otherAccountId}/persona_state/current`]: { livePersonaIds: [], stateRevision: 0 },
  };
}

export interface PersonaRepositoryFixture {
  readonly repository: PersonaRepository;
  readonly uid: string;
  readonly otherUid: string;
  readonly accountId: string;
  readonly otherAccountId: string;
  readonly change: (path: string, data: Record<string, unknown> | undefined) => Promise<void>;
  readonly dump: () => Promise<Record<string, Record<string, unknown>>>;
}

/** Sequential Port semantics shared by in-memory and real Emulator adapters; concurrency is tested separately. */
export function personaRepositoryContract(label: string, create: (scenario: string) => Promise<PersonaRepositoryFixture>): void {
  test(`${label}: PC03/04/08 complete set, duplicate names and inactive creation`, async () => {
    const f = await create("lifecycle");
    const { repository: r, uid } = f;
    assert.deepEqual(personaValue(await r.list(uid)), { items: [], stateRevision: 0 });
    const first = personaValue(await r.create(uid, personaCommand(0)));
    const second = personaValue(await r.create(uid, personaCommand(1)));
    assert.equal(first.created, true);
    assert.equal(second.created, true);
    assert.equal(first.persona.displayName, second.persona.displayName);
    assert.notEqual(first.persona.personaId, second.persona.personaId);
    const view = personaValue(await r.list(uid));
    assert.deepEqual(view.items.map(p => p.personaId), [first.persona.personaId, second.persona.personaId].sort());
    assert.equal(view.stateRevision, 2);
    assert.equal(Object.hasOwn(view, "activePersonaId"), false);
    assert.deepEqual(personaValue(await r.get(uid, first.persona.personaId)), { persona: first.persona, stateRevision: 2 });
    const records = await f.dump();
    for (const p of view.items) assert.deepEqual(Object.keys(records[`accounts/${f.accountId}/personas/${p.personaId}`]!).sort(),
      [...Object.keys(PERSONA_TEST_FIELDS), "createdAt", "updatedAt", "revision"].sort());
    assert.equal(Object.keys(records).some(path => path.includes("idempotency") || path.includes("receipt")), false);
  });

  test(`${label}: PC04/05 fifth create replays before capacity and unequal fields conflict`, async () => {
    const { repository: r, uid } = await create("capacity");
    for (let i = 0; i < 5; i++) personaValue(await r.create(uid, personaCommand(i)));
    const fifth = personaValue(await r.create(uid, personaCommand(4)));
    assert.equal(fifth.created, false);
    assert.equal(fifth.stateRevision, 5);
    assert.deepEqual(await r.create(uid, { ...personaCommand(4), tone: "warm" }), { ok: false, failure: "command_conflict" });
    assert.deepEqual(await r.create(uid, personaCommand(5)), { ok: false, failure: "limit_reached" });
    assert.equal(personaValue(await r.list(uid)).items.length, 5);
  });

  test(`${label}: PC05/07/09 no-op preserves replay, effective edit and restored fields close it`, async () => {
    const f = await create("edit-window");
    const r = f.repository, uid = f.uid;
    const first = personaValue(await r.create(uid, personaCommand(0)));
    const id = first.persona.personaId;
    const before = await f.dump();
    assert.deepEqual(await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(id, 0) }), { ok: false, failure: "revision_precondition_failed" });
    assert.deepEqual(await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(id, 1, 2) }), { ok: false, failure: "revision_precondition_failed" });
    assert.deepEqual(personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(id, 1) })),
      { persona: first.persona, stateRevision: 1 });
    assert.deepEqual(await f.dump(), before);
    assert.equal(personaValue(await r.create(uid, personaCommand(0))).created, false);
    const edited = personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, tone: "warm", ...personaConditions(id, 1) }));
    assert.equal(edited.persona.revision, 2);
    assert.equal(edited.persona.createdAt, first.persona.createdAt);
    assert.equal(edited.stateRevision, 2);
    assert.deepEqual(await r.create(uid, personaCommand(0)), { ok: false, failure: "revision_precondition_failed" });
    personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(id, 2, 2) }));
    assert.deepEqual(await r.create(uid, personaCommand(0)), { ok: false, failure: "revision_precondition_failed" });
  });

  test(`${label}: PC07/08/09 activation no-op preserves replay, delete Active clears without replacement`, async () => {
    const f = await create("activation");
    const r = f.repository, uid = f.uid;
    const a = personaValue(await r.create(uid, personaCommand(0))).persona;
    assert.equal(personaValue(await r.activate(uid, personaConditions(a.personaId, 1))).activePersonaId, a.personaId);
    const b = personaValue(await r.create(uid, personaCommand(2))).persona;
    const before = await f.dump();
    assert.deepEqual(await r.activate(uid, personaConditions(a.personaId, 2)), { ok: false, failure: "revision_precondition_failed" });
    const confirmed = personaValue(await r.activate(uid, personaConditions(a.personaId, 3)));
    assert.equal(confirmed.stateRevision, 3);
    assert.deepEqual(await f.dump(), before);
    assert.equal(personaValue(await r.create(uid, personaCommand(2))).created, false);
    const changed = personaValue(await r.activate(uid, personaConditions(b.personaId, 3)));
    assert.equal(changed.activePersonaId, b.personaId);
    assert.deepEqual(changed.items.find(p => p.personaId === b.personaId), b);
    assert.deepEqual(await r.create(uid, personaCommand(2)), { ok: false, failure: "revision_precondition_failed" });
    assert.deepEqual(await r.delete(uid, personaConditions(b.personaId, 3)), { ok: false, failure: "revision_precondition_failed" });
    personaValue(await r.delete(uid, personaConditions(b.personaId, 4)));
    const remaining = personaValue(await r.list(uid));
    assert.equal(remaining.stateRevision, 5);
    assert.deepEqual(remaining.items, [a]);
    assert.equal(Object.hasOwn(remaining, "activePersonaId"), false);
    personaValue(await r.delete(uid, personaConditions(a.personaId, 5)));
    assert.deepEqual(personaValue(await r.list(uid)), { items: [], stateRevision: 6 });
    const deleted = await f.dump();
    assert.equal(Object.hasOwn(deleted, `accounts/${f.accountId}/personas/${a.personaId}`), false);
    assert.deepEqual(deleted[`accounts/${f.accountId}/persona_state/current`], { livePersonaIds: [], stateRevision: 6 });
    personaValue(await r.delete(uid, personaConditions(a.personaId, 0)));
    assert.deepEqual(await f.dump(), deleted);
    assert.deepEqual(await r.create(uid, personaCommand(0)), { ok: false, failure: "revision_precondition_failed" });
  });

  test(`${label}: PC01/04 owner identity isolates the same key and foreign IDs`, async () => {
    const f = await create("owner");
    const r = f.repository;
    const own = personaValue(await r.create(f.uid, personaCommand(0))).persona;
    const other = personaValue(await r.create(f.otherUid, personaCommand(0))).persona;
    assert.notEqual(own.personaId, other.personaId);
    assert.deepEqual(await r.get(f.uid, other.personaId), { ok: false, failure: "unavailable" });
    assert.deepEqual(await r.edit(f.uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(other.personaId, 1) }), { ok: false, failure: "unavailable" });
    assert.deepEqual(await r.activate(f.uid, personaConditions(other.personaId, 1)), { ok: false, failure: "unavailable" });
    const before = await f.dump();
    personaValue(await r.delete(f.uid, personaConditions(other.personaId, 0)));
    assert.deepEqual(await f.dump(), before);
    assert.deepEqual(personaValue(await r.get(f.otherUid, other.personaId)).persona, other);
  });

  test(`${label}: PC01/03 missing state is unavailable and is never initialized`, async () => {
    const f = await create("missing-state");
    await f.change(`accounts/${f.accountId}/persona_state/current`, undefined);
    const before = await f.dump();
    assert.deepEqual(await f.repository.list(f.uid), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await f.repository.create(f.uid, personaCommand(0)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await f.dump(), before);
  });

  test(`${label}: PC03/10 corrupt live member and invalid Active fail closed`, async () => {
    const f = await create("corrupt-member");
    const r = f.repository;
    const persona = personaValue(await r.create(f.uid, personaCommand(0))).persona;
    await f.change(`accounts/${f.accountId}/personas/${persona.personaId}`, undefined);
    assert.deepEqual(await r.list(f.uid), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.create(f.uid, personaCommand(0)), { ok: false, failure: "dependency_unavailable" });
    await f.change(`accounts/${f.otherAccountId}/persona_state/current`, { livePersonaIds: [], stateRevision: 0, activePersonaId: persona.personaId });
    assert.deepEqual(await r.list(f.otherUid), { ok: false, failure: "dependency_unavailable" });
  });

  test(`${label}: PC10 overflow blocks effects but allows reads, no-ops and absent repeat deletion`, async () => {
    const f = await create("overflow");
    const r = f.repository;
    const a = personaValue(await r.create(f.uid, personaCommand(0))).persona;
    const b = personaValue(await r.create(f.uid, personaCommand(1))).persona;
    const max = Number.MAX_SAFE_INTEGER;
    await f.change(`accounts/${f.accountId}/persona_state/current`, {
      livePersonaIds: [a.personaId, b.personaId].sort(), stateRevision: max, activePersonaId: a.personaId,
    });
    const before = await f.dump();
    assert.equal(personaValue(await r.list(f.uid)).stateRevision, max);
    personaValue(await r.edit(f.uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(a.personaId, max) }));
    personaValue(await r.activate(f.uid, personaConditions(a.personaId, max)));
    personaValue(await r.delete(f.uid, personaConditions("f".repeat(64), 0)));
    assert.deepEqual(await r.create(f.uid, personaCommand(max)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.edit(f.uid, { ...PERSONA_TEST_FIELDS, tone: "warm", ...personaConditions(a.personaId, max) }), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.activate(f.uid, personaConditions(b.personaId, max)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.delete(f.uid, personaConditions(a.personaId, max)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await f.dump(), before);
  });
}
