import assert from "node:assert/strict";
import test from "node:test";
import { OwnPersonas } from "../../src/personas/application/own-personas.js";
import type { PersonaCreate, PersonaEdit, PersonaPreconditions } from "../../src/personas/application/persona-model.js";
import { isPersonaCreateKey, isPersonaId, isPersonaRevision, isStateRevision, normalizePersonaInput } from "../../src/personas/domain/persona-values.js";
import { derivePersonaId, FirestorePersonaRepository } from "../../src/personas/infrastructure/firestore-persona-repository.js";
import type { PersonaFailure, PersonaRepository } from "../../src/personas/ports/persona-repository.js";
import { err, ok } from "../../src/shared/domain/result.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { dependencyUnavailable } from "../../src/shared/ports/dependency-failure.js";
import { FailingFirestoreGateway, InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";
import { PERSONA_TEST_FIELDS, PERSONA_TEST_TIME, personaCommand, personaConditions, personaRepositoryContract, personaTestKey, personaTestRecords, personaValue } from "../support/persona-repository-contract.js";

const uid = "persona-core-one", otherUid = "persona-core-two", accountId = "persona-core-account-one", otherAccountId = "persona-core-account-two";
const principal = { firebaseUid: uid };
const clock = { now: () => ok(new Date(PERSONA_TEST_TIME)) };
const statePath = `accounts/${accountId}/persona_state/current`;
const rowPath = (id: string) => `accounts/${accountId}/personas/${id}`;
const store = (extra: Record<string, StoredDocument> = {}) => new InMemoryFirestoreGateway({ ...personaTestRecords(uid, accountId, otherUid, otherAccountId), ...extra });
const rawPersona = (revision = 1): StoredDocument => ({ ...PERSONA_TEST_FIELDS, createdAt: PERSONA_TEST_TIME, updatedAt: PERSONA_TEST_TIME, revision });

class FakePersonaRepository implements PersonaRepository {
  public failure: PersonaFailure = "dependency_unavailable";
  public calls: unknown[][] = [];
  private response(...args: unknown[]) { this.calls.push(args); return Promise.resolve(err(this.failure)); }
  public list(uid: string) { return this.response("list", uid); }
  public get(uid: string, id: string) { return this.response("get", uid, id); }
  public create(uid: string, input: PersonaCreate) { return this.response("create", uid, input); }
  public edit(uid: string, input: PersonaEdit) { return this.response("edit", uid, input); }
  public activate(uid: string, input: PersonaPreconditions) { return this.response("activate", uid, input); }
  public delete(uid: string, input: PersonaPreconditions) { return this.response("delete", uid, input); }
}

class TracedGateway implements FirestoreGateway {
  public attempts: { gets: string[]; writes: number }[] = [];
  public interruption: "none" | "before_commit" | "after_commit" = "none";
  public constructor(public readonly underlying: InMemoryFirestoreGateway) {}
  public async runTransaction<T>(work: (transaction: FirestoreTransactionGateway) => Promise<T>): Promise<T> {
    const attempt = { gets: [] as string[], writes: 0 };
    this.attempts.push(attempt);
    const result = await this.underlying.runTransaction(async transaction => {
      const traced: FirestoreTransactionGateway = {
        get: async path => {
          assert.equal(attempt.writes, 0, "transaction reads must precede writes");
          attempt.gets.push(path);
          return transaction.get(path);
        },
        list: async () => { throw new Error("Persona must not scan collections"); },
        create: (path, data) => { attempt.writes++; transaction.create(path, data); },
        set: (path, data) => { attempt.writes++; transaction.set(path, data); },
        delete: path => { attempt.writes++; transaction.delete!(path); },
      };
      const value = await work(traced);
      if (this.interruption === "before_commit") throw new Error("synthetic interrupted commit");
      return value;
    });
    if (this.interruption === "after_commit") throw new Error("synthetic lost committed response");
    return result;
  }
}

personaRepositoryContract("in-memory Persona Port", async () => {
  const gateway = store();
  return { repository: new FirestorePersonaRepository(gateway, clock), uid, otherUid, accountId, otherAccountId,
    change: async (path, data) => gateway.runTransaction(async tx => { if (data === undefined) tx.delete!(path); else tx.set(path, data); }),
    dump: async () => Object.fromEntries(gateway.entries().map(([path, data]) => [path, { ...data }])),
  };
});

test("PC02 names use scalar length, exact enums and approved trim without Unicode composition", () => {
  for (const displayName of ["a", "😀".repeat(50), " a  b \n", "e\u0301"]) {
    const normalized = normalizePersonaInput({ ...PERSONA_TEST_FIELDS, displayName });
    assert.equal(normalized?.displayName, displayName.trim());
  }
  for (const displayName of ["", " \n", "a".repeat(51), "😀".repeat(51), "x\u0000y", "x\u200By", "x\u2028y", "x\u2029y", "\uD800", "\uDC00", null]) {
    assert.equal(normalizePersonaInput({ ...PERSONA_TEST_FIELDS, displayName }), undefined);
  }
  for (const patch of [{ tone: "Warm" }, { tone: "roleplay" }, { responseLength: "long" }, { formatStyle: "markdown" }, { tone: null }]) {
    assert.equal(normalizePersonaInput({ ...PERSONA_TEST_FIELDS, ...patch }), undefined);
  }
  assert.equal(isStateRevision(0), true);
  assert.equal(isStateRevision(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isPersonaRevision(0), false);
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "1", null]) {
    assert.equal(isStateRevision(value), false);
    assert.equal(isPersonaRevision(value), false);
  }
});

test("PC02 IDs and command keys reject trailing newlines, coercion and noncanonical forms", () => {
  const id = "a".repeat(64), key = personaTestKey(1);
  assert.equal(isPersonaId(id), true);
  assert.equal(isPersonaCreateKey(key), true);
  for (const value of [id + "\n", id + "\r", id + " ", " " + id, id.toUpperCase(), id.slice(1), "g".repeat(64), null]) assert.equal(isPersonaId(value), false);
  for (const value of [key + "\n", key + "\r", key + " ", " " + key, key.replace("4000", "3000"), key.replace("8000", "7000"), key.replace(/-/g, ""), "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa".toUpperCase(), null]) assert.equal(isPersonaCreateKey(value), false);
});

test("PC02 use case canonicalizes before the Port and rejects invalid values without a repository call", async () => {
  const repository = new FakePersonaRepository(), useCase = new OwnPersonas(repository);
  await useCase.create({ principal, ...personaCommand(0), displayName: "  Synthetic Persona\n" });
  assert.deepEqual(repository.calls, [["create", uid, personaCommand(0)]]);
  repository.calls = [];
  const invalid = [
    useCase.create({ principal, ...personaCommand(0), displayName: "" }),
    useCase.create({ principal, ...personaCommand(0), expectedStateRevision: -1 }),
    useCase.edit({ principal, ...PERSONA_TEST_FIELDS, ...personaConditions("a".repeat(64), 0, 0) }),
    useCase.activate({ principal, ...personaConditions("a".repeat(64), 0.5) }),
    useCase.delete({ principal, ...personaConditions("a".repeat(64), Number.MAX_SAFE_INTEGER + 1) }),
  ];
  for (const result of await Promise.all(invalid)) assert.equal(result.ok ? "unexpected" : result.failure.code, "PERSONA_INVALID");
  for (const personaId of ["not-an-id", "a".repeat(64) + "\n", "A".repeat(64), null]) {
    const result = await useCase.activate({ principal, personaId, expectedRevision: 1, expectedStateRevision: 0 });
    assert.equal(result.ok ? "unexpected" : result.failure.code, "REQUEST_INVALID");
  }
  const invalidKey = await useCase.create({ principal, ...personaCommand(0), idempotencyKey: personaTestKey(1) + "\n" });
  assert.equal(invalidKey.ok ? "unexpected" : invalidKey.failure.code, "IDEMPOTENCY_KEY_INVALID");
  assert.equal(repository.calls.length, 0);
});

test("application translates each stable Port failure into the approved safe catalogue", async () => {
  const repository = new FakePersonaRepository(), useCase = new OwnPersonas(repository);
  const mapping = {
    onboarding_required: "ONBOARDING_REQUIRED", dependency_unavailable: "SERVICE_UNAVAILABLE", unavailable: "PERSONA_UNAVAILABLE",
    limit_reached: "PERSONA_LIMIT_REACHED", command_conflict: "PERSONA_COMMAND_CONFLICT", revision_precondition_failed: "PERSONA_REVISION_PRECONDITION_FAILED",
  } as const;
  for (const failure of Object.keys(mapping) as PersonaFailure[]) {
    repository.failure = failure;
    const result = await useCase.list(principal);
    assert.equal(result.ok ? "unexpected" : result.failure.code, mapping[failure]);
  }
});

test("PC01 current binding and completed Account are validated before Persona access", async () => {
  for (const variant of ["missing-binding", "malformed-binding", "missing-account", "malformed-account"] as const) {
    const records = personaTestRecords(uid, accountId, otherUid, otherAccountId);
    const binding = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
    if (variant === "missing-binding") delete records[binding];
    if (variant === "malformed-binding") records[binding] = { accountId: "bad/path" };
    if (variant === "missing-account") delete records[`accounts/${accountId}`];
    if (variant === "malformed-account") records[`accounts/${accountId}`] = { username: "incomplete" };
    const gateway = new TracedGateway(new InMemoryFirestoreGateway(records));
    const r = new FirestorePersonaRepository(gateway, clock);
    assert.deepEqual(await r.create(uid, personaCommand(0)), { ok: false, failure: variant === "missing-binding" ? "onboarding_required" : "dependency_unavailable" });
    assert.equal(gateway.attempts[0]!.gets.some(path => path.includes("/personas/") || path.includes("/persona_state/")), false);
    assert.equal(gateway.attempts[0]!.writes, 0);
  }
});

test("PC01 no target operation probes another owner partition", async () => {
  const gateway = new TracedGateway(store());
  const r = new FirestorePersonaRepository(gateway, clock);
  const other = personaValue(await r.create(otherUid, personaCommand(0))).persona;
  gateway.attempts = [];
  await r.get(uid, other.personaId);
  await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(other.personaId, 0) });
  await r.activate(uid, personaConditions(other.personaId, 0));
  await r.delete(uid, personaConditions(other.personaId, 0));
  assert.equal(gateway.attempts.length, 4);
  for (const attempt of gateway.attempts) {
    assert.equal(attempt.gets.some(path => path.includes(otherAccountId)), false);
    assert.equal(attempt.writes, 0);
  }
});

test("PC03/10 malformed owner state and strict live record values never fabricate a set", async () => {
  const id = "a".repeat(64);
  const states: StoredDocument[] = [
    { livePersonaIds: [], stateRevision: -1 }, { livePersonaIds: [], stateRevision: 0.5 },
    { livePersonaIds: [], stateRevision: Number.MAX_SAFE_INTEGER + 1 }, { livePersonaIds: [id, id], stateRevision: 2 },
    { livePersonaIds: ["b".repeat(64), id], stateRevision: 2 }, { livePersonaIds: [], stateRevision: 0, activePersonaId: null },
    { livePersonaIds: [], stateRevision: 0, rawKey: "prohibited" },
    { livePersonaIds: [id + "\n"], stateRevision: 1 },
    { livePersonaIds: Array.from({ length: 6 }, (_, i) => i.toString().repeat(64)), stateRevision: 6 },
  ];
  for (const state of states) {
    const gateway = store({ [statePath]: state });
    const before = gateway.entries();
    assert.deepEqual(await new FirestorePersonaRepository(gateway, clock).list(uid), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(gateway.entries(), before);
  }
  const rows: StoredDocument[] = [
    { ...rawPersona(), displayName: " padded " }, { ...rawPersona(), displayName: "\uD800" },
    { ...rawPersona(), tone: "roleplay" }, { ...rawPersona(), revision: 0 }, { ...rawPersona(), revision: Number.MAX_SAFE_INTEGER + 1 },
    { ...rawPersona(), ownerId: accountId }, { ...rawPersona(), createdAt: "2026-10-08T01:02:03Z" },
    { ...rawPersona(), createdAt: "2026-02-30T01:02:03.004Z" }, { ...rawPersona(), updatedAt: "invalid" },
  ];
  for (const row of rows) {
    const r = new FirestorePersonaRepository(store({ [statePath]: { livePersonaIds: [id], stateRevision: 1 }, [rowPath(id)]: row }), clock);
    assert.deepEqual(await r.list(uid), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.get(uid, id), { ok: false, failure: "dependency_unavailable" });
  }
});

test("PC10 orphan candidate integrity precedes both stale and capacity outcomes", async () => {
  for (const expected of [0, 5]) {
    const gateway = store(), r = new FirestorePersonaRepository(gateway, clock);
    for (let i = 0; i < 5; i++) personaValue(await r.create(uid, personaCommand(i)));
    const command = { ...personaCommand(expected), idempotencyKey: personaTestKey(100) };
    const orphanId = derivePersonaId(accountId, expected, command.idempotencyKey);
    await gateway.runTransaction(async tx => { tx.set(rowPath(orphanId), rawPersona()); });
    const before = gateway.entries();
    assert.deepEqual(await r.create(uid, command), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.get(uid, orphanId), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.delete(uid, personaConditions(orphanId, 0)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(gateway.entries(), before);
  }
});

test("PC10 full derived ID and unexpected member collisions fail without overwrite", async () => {
  const id = derivePersonaId(accountId, 0, personaTestKey(0));
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.notEqual(id, derivePersonaId(accountId, 1, personaTestKey(0)));
  assert.notEqual(id, derivePersonaId(otherAccountId, 0, personaTestKey(0)));
  for (const [revision, rowRevision] of [[0, 1], [1, 2]]) {
    const gateway = store({ [statePath]: { livePersonaIds: [id], stateRevision: revision }, [rowPath(id)]: rawPersona(rowRevision) });
    const before = gateway.entries();
    assert.deepEqual(await new FirestorePersonaRepository(gateway, clock).create(uid, personaCommand(0)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(gateway.entries(), before);
  }
});

test("PC06 before-commit interruption rolls back both records; after-commit loss replays one creation", async () => {
  for (const interruption of ["before_commit", "after_commit"] as const) {
    const gateway = new TracedGateway(store()), r = new FirestorePersonaRepository(gateway, clock);
    gateway.interruption = interruption;
    assert.deepEqual(await r.create(uid, personaCommand(0)), { ok: false, failure: "dependency_unavailable" });
    const id = derivePersonaId(accountId, 0, personaTestKey(0));
    assert.equal(gateway.underlying.read(statePath)?.stateRevision, interruption === "before_commit" ? 0 : 1);
    assert.equal(gateway.underlying.read(rowPath(id)) === undefined, interruption === "before_commit");
    gateway.interruption = "none";
    const retried = personaValue(await r.create(uid, personaCommand(0)));
    assert.equal(retried.created, interruption === "before_commit");
    assert.equal(personaValue(await r.list(uid)).items.length, 1);
    assert.equal(gateway.underlying.entries().filter(([path]) => path.includes("/personas/")).length, 1);
  }
});

test("PC10 counts eight/nine logical gets per attempt and prohibits scans/read-after-write", async () => {
  const gateway = new TracedGateway(store()), r = new FirestorePersonaRepository(gateway, clock);
  let last = "";
  for (let i = 0; i < 5; i++) last = personaValue(await r.create(uid, personaCommand(i))).persona.personaId;
  assert.deepEqual(gateway.attempts.map(a => a.gets.length), [4, 5, 6, 7, 8]);
  assert.deepEqual(gateway.attempts.map(a => a.writes), [2, 2, 2, 2, 2]);
  gateway.attempts = [];
  await r.list(uid);
  await r.get(uid, last);
  await r.get(uid, "f".repeat(64));
  await r.create(uid, personaCommand(5));
  await r.create(uid, personaCommand(4));
  assert.deepEqual(gateway.attempts.map(a => a.gets.length), [8, 8, 9, 9, 8]);
  assert.equal(gateway.attempts.every(a => a.writes === 0), true);
});

test("PC10 target revision overflow leaves safe no-ops, activation and reads available", async () => {
  const id = "a".repeat(64), max = Number.MAX_SAFE_INTEGER;
  const gateway = store({ [statePath]: { livePersonaIds: [id], stateRevision: 1 }, [rowPath(id)]: rawPersona(max) });
  const r = new FirestorePersonaRepository(gateway, clock);
  personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(id, 1, max) }));
  assert.deepEqual(await r.edit(uid, { ...PERSONA_TEST_FIELDS, tone: "warm", ...personaConditions(id, 1, max) }), { ok: false, failure: "dependency_unavailable" });
  assert.equal(personaValue(await r.activate(uid, personaConditions(id, 1, max))).stateRevision, 2);
  assert.equal(personaValue(await r.get(uid, id)).persona.revision, max);
});

test("PC03/09 effective edit changes only updated time; read order is created time then ordinal ID", async () => {
  let instant = PERSONA_TEST_TIME;
  let clockCalls = 0;
  const r = new FirestorePersonaRepository(store(), { now: () => { clockCalls++; return ok(new Date(instant)); } });
  const a = personaValue(await r.create(uid, personaCommand(0))).persona;
  instant = "2026-10-08T01:02:04.004Z";
  const b = personaValue(await r.create(uid, personaCommand(1))).persona;
  assert.deepEqual(personaValue(await r.list(uid)).items.map(p => p.personaId), [a.personaId, b.personaId]);
  const edited = personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, tone: "warm", ...personaConditions(a.personaId, 2) }));
  assert.equal(edited.persona.createdAt, a.createdAt);
  assert.equal(edited.persona.updatedAt, instant);
  assert.equal(edited.persona.revision, 2);
  assert.equal(clockCalls, 3);
  instant = "2026-10-08T01:02:05.004Z";
  const noOp = personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, tone: "warm", ...personaConditions(a.personaId, 3, 2) }));
  assert.deepEqual(noOp, edited);
  assert.equal(clockCalls, 3, "no-op must not consult or change timestamp");
  assert.deepEqual(personaValue(await r.list(uid)).items.map(p => p.personaId), [a.personaId, b.personaId]);
});

test("dependency and invalid clock failure are safe; valid replay and no-ops need no new time", async () => {
  const unavailable = new FirestorePersonaRepository(new FailingFirestoreGateway(), clock);
  assert.deepEqual(await unavailable.list(uid), { ok: false, failure: "dependency_unavailable" });
  assert.deepEqual(await unavailable.create(uid, personaCommand(0)), { ok: false, failure: "dependency_unavailable" });
  const gateway = store();
  const first = personaValue(await new FirestorePersonaRepository(gateway, clock).create(uid, personaCommand(0)));
  for (const unavailableClock of [{ now: () => err(dependencyUnavailable) }, { now: () => ok(new Date(NaN)) }]) {
    const r = new FirestorePersonaRepository(gateway, unavailableClock);
    assert.equal(personaValue(await r.create(uid, personaCommand(0))).created, false);
    personaValue(await r.edit(uid, { ...PERSONA_TEST_FIELDS, ...personaConditions(first.persona.personaId, 1) }));
    assert.deepEqual(await r.create(uid, personaCommand(1)), { ok: false, failure: "dependency_unavailable" });
    assert.deepEqual(await r.edit(uid, { ...PERSONA_TEST_FIELDS, tone: "warm", ...personaConditions(first.persona.personaId, 1) }), { ok: false, failure: "dependency_unavailable" });
  }
});
