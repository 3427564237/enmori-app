import assert from "node:assert/strict";
import { test } from "node:test";
import { FieldPath, Timestamp, type Firestore, type Transaction, type ReadOnlyTransactionOptions } from "firebase-admin/firestore";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { FirebaseAdminRealContextReader, type SourceBoundNotePrerequisites } from "../../src/ai-conversation/infrastructure/firebase-admin-real-context-reader.js";
import { FirebaseAdminAsyncConversationAuthority } from "../../src/ai-conversation/infrastructure/firebase-admin-async-conversation-authority.js";
import { PreparedRealContextReader } from "../../src/ai-conversation/application/real-context-reader.js";
import type { AcceptedContextRead, ContextDependencies, FixedStartReadView } from "../../src/ai-conversation/ports/real-context-reader.js";
import type { AsyncConversationIdentity, AsyncOperation } from "../../src/ai-conversation/ports/async-conversation.js";

// SDK-subset fake: verifies actual adapter calls/mapping. Historical capability is
// separately exercised by the guarded isolated Emulator, never claimed by this fake.
type Row = { data: Record<string, unknown>; updateTime: Timestamp };
type QueryCall = { where: [string, string, unknown][]; order: [string | FieldPath, string][]; limit: number;
  after: readonly unknown[] | undefined };
class Query {
  readonly kind = "query";
  readonly call: QueryCall = { where: [], order: [], limit: 0, after: undefined };
  constructor(readonly path: string) {}
  where(field: string, op: string, value: unknown): this { this.call.where.push([field, op, value]); return this; }
  orderBy(field: string | FieldPath, direction: string): this { this.call.order.push([field, direction]); return this; }
  limit(value: number): this { this.call.limit = value; return this; }
  startAfter(...value: unknown[]): this { this.call.after = value; return this; }
}
class SdkFixture {
  readonly documents = new Map<string, Row>();
  readonly gets: string[] = [];
  readonly queries: QueryCall[] = [];
  readonly options: (ReadOnlyTransactionOptions | undefined)[] = [];
  readonly db: Firestore;
  rejectRead = false;
  holdQuery: (() => Promise<void>) | undefined;
  callbackCompleted = 0;
  constructor() {
    this.db = {
      projectId: "demo-enmori-context-test",
      _settings: { servicePath: "127.0.0.1", port: 8080, ssl: false },
      doc: (path: string) => ({ kind: "document", path }),
      collection: (path: string) => new Query(path),
      runTransaction: async <T>(work: (tx: Transaction) => Promise<T>, options?: ReadOnlyTransactionOptions): Promise<T> => {
        this.options.push(options);
        const view = new Map([...this.documents].map(([path, row]) => [path, { data: structuredClone(row.data), updateTime: row.updateTime }]));
        const get = async (reference: { kind: string; path: string; call?: QueryCall }) => {
          if (this.rejectRead) throw new Error("private vendor content must not escape");
          if (reference.kind === "document") {
            this.gets.push(reference.path); const row = view.get(reference.path);
            return { exists: !!row, data: () => row?.data, updateTime: row?.updateTime, readTime: options?.readTime };
          }
          const call = reference.call!; this.queries.push(structuredClone({ ...call, order: [] }));
          this.queries.at(-1)!.order = call.order;
          await this.holdQuery?.();
          const rows = [...view].filter(([path, row]) => path.startsWith(`${reference.path}/`) && call.where.every(([field, op, v]) => {
            const actual = row.data[field] as string, expected = v as string;
            return op === "==" ? actual === expected : op === ">=" ? actual >= expected : actual <= expected;
          })).map(([path, row]) => ({ id: path.slice(reference.path.length + 1), ...row }))
            .sort((a, b) => a.data.createdAt === b.data.createdAt ? (a.id < b.id ? -1 : 1) : a.data.createdAt! > b.data.createdAt! ? -1 : 1)
            .filter(row => !call.after || row.data.createdAt! < call.after[0]! ||
              (row.data.createdAt === call.after[0] && row.id > (call.after[1] as string))).slice(0, call.limit);
          return { readTime: options?.readTime, docs: rows.map(row => ({ id: row.id, data: () => row.data,
            updateTime: row.updateTime, readTime: options?.readTime })) };
        };
        try { return await work({ get } as unknown as Transaction); } finally { this.callbackCompleted += 1; }
      },
    } as unknown as Firestore;
  }
  put(path: string, data: Record<string, unknown>, updateTime = new Timestamp(200, 123)): void {
    this.documents.set(path, { data, updateTime });
  }
}
const environment = Object.freeze({ ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: "context-test-profile",
  HOME: "context-test-profile", USERPROFILE: "context-test-profile", APPDATA: "context-test-profile", XDG_CONFIG_HOME: "context-test-profile",
  GCLOUD_PROJECT: "demo-enmori-context-test", GOOGLE_CLOUD_PROJECT: "demo-enmori-context-test",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" });
const uid = "synthetic-context-owner", ownerId = "synthetic-account";
const bindingPath = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
const personaId = "a".repeat(64), secondPersonaId = "b".repeat(64);
const iso = "2026-10-14T09:00:00.000Z", start = "2026-10-07T09:00:00.000Z";
const asOf = Timestamp.fromDate(new Date(iso));
const operation: AsyncOperation = { operationId: "op", conversationId: "conv", userMessageId: "u", kind: "send", targetKind: "reserved_new" };
function identity(): AsyncConversationIdentity { return { principal: { firebaseUid: uid }, ownerId,
  session: {}, tokenInstance: {}, originalRequest: {} }; }
function context(abort = new AbortController()): AcceptedContextRead {
  const i = identity(); return { principal: i.principal, ownerId, session: i.session,
    originalRequest: i.originalRequest, acceptedAt: 10, deadline: 60_010,
    asOf: { seconds: asOf.seconds, nanoseconds: asOf.nanoseconds }, signal: abort.signal };
}
function persona(tone = "warm", revision = 1) { return { displayName: "private display name", tone, responseLength: "balanced",
  formatStyle: "plain", createdAt: iso, updatedAt: iso, revision }; }
function seed(): SdkFixture {
  const f = new SdkFixture(); f.put(bindingPath, { accountId: ownerId });
  f.put(`accounts/${ownerId}`, { username: "context_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
    onboardingCompletedAt: iso, purposeRevocationGeneration: 2, settingsRevision: 3 });
  f.put(`accounts/${ownerId}/persona_state/current`, { livePersonaIds: [personaId], activePersonaId: personaId, stateRevision: 1 });
  f.put(`accounts/${ownerId}/personas/${personaId}`, persona()); return f;
}
function capability(f: SdkFixture): SourceBoundNotePrerequisites {
  // Declares only this fake's complete, immutable/no-restore fixture inventory.
  return { firestore: f.db, sourceReferences: ["test-only SDK fixture inventory"], completeCanonicalUtcInventory: true,
    immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true };
}
function reader(f: SdkFixture, note = true, now: () => number = () => 10) {
  return new FirebaseAdminRealContextReader(f.db, { controlledEnvironment: environment, monotonicNow: now,
    originalAuthority: { verify: async c => ({ kind: "read", value: c.principal }) },
    ...(note ? { notePrerequisites: capability(f) } : {}) });
}
async function open(f: SdkFixture, r = reader(f), c = context()): Promise<FixedStartReadView> {
  const result = await r.openStart(c); assert.equal(result.kind, "read");
  if (result.kind !== "read") throw new Error("expected view"); return result.value;
}
const query = (c: AcceptedContextRead = context()) => ({ ownerId, fromInclusive: { seconds: c.asOf.seconds - 7 * 24 * 60 * 60,
  nanoseconds: c.asOf.nanoseconds }, toInclusive: c.asOf, after: undefined, limit: 25 as const });
const dependencies = (sources: ContextDependencies["sources"] = []): ContextDependencies => ({ ownerId,
  purpose: "checkin_conversation", purposeRevocationGeneration: 2, usedPersonaId: personaId, sources });
const source = (id = "n"): ContextDependencies["sources"][number] => ({ sourceType: "check_in", sourceId: id,
  observedVersion: { seconds: 200, nanoseconds: 123 } });
const note = (createdAt = iso) => ({ ownerAccountId: ownerId, note: "immutable exact Note 🧩", createdAt, checkInVisibility: "private" });

test("preaccept reads only fresh binding/completed Account/purpose and observes latest withdrawal", async () => {
  const f = seed(), i = identity(); let verified = 0;
  const a = new FirebaseAdminAsyncConversationAuthority(f.db, { current: value => value === i,
    verify: async value => { assert.equal(value, i); verified++; return { kind: "verified", principal: i.principal }; } }, environment);
  assert.equal(await a.preaccept(i, operation), "authorized");
  assert.deepEqual(f.gets, [bindingPath, `accounts/${ownerId}`]); assert.equal(f.queries.length, 0);
  f.documents.get(`accounts/${ownerId}`)!.data.optionalProcessingConsent = "rejected";
  assert.equal(await a.preaccept(i, operation), "denied"); assert.equal(verified, 2);
  assert.ok(f.options.every(value => value?.readOnly && value.readTime === undefined));
});
test("preaccept fails closed on identity mismatch/revocation/dependency and reads no content", async () => {
  for (const result of ["invalid", "forbidden", "dependency_unavailable", "mismatch"] as const) {
    const f = seed(), i = identity();
    const a = new FirebaseAdminAsyncConversationAuthority(f.db, { current: () => true, verify: async () =>
      result === "mismatch" ? { kind: "verified", principal: { firebaseUid: "different" } } : { kind: result } }, environment);
    assert.equal(await a.preaccept(i, operation), result === "dependency_unavailable" ? "unavailable" : "denied");
    assert.equal(f.gets.length, 0); assert.equal(f.options.length, 0);
  }
});
test("preaccept missing/corrupt generations never default to zero; binding owner mismatch never reads Account", async () => {
  for (const invalid of [undefined, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const f = seed(), i = identity(); f.documents.get(`accounts/${ownerId}`)!.data.purposeRevocationGeneration = invalid;
    const a = new FirebaseAdminAsyncConversationAuthority(f.db, { current: () => true,
      verify: async () => ({ kind: "verified", principal: i.principal }) }, environment);
    assert.equal(await a.preaccept(i, operation), "unavailable");
  }
  const f = seed(), i = identity(); f.put(bindingPath, { accountId: "different-owner" });
  const a = new FirebaseAdminAsyncConversationAuthority(f.db, { current: () => true,
    verify: async () => ({ kind: "verified", principal: i.principal }) }, environment);
  assert.equal(await a.preaccept(i, operation), "denied"); assert.deepEqual(f.gets, [bindingPath]);
});
test("isolated constructors reject an environment-only claim when actual SDK host/project/SSL differs", () => {
  const f = seed(); (f.db as unknown as { _settings: { ssl: boolean } })._settings.ssl = true;
  assert.throws(() => reader(f), /binding unavailable/u);
  assert.throws(() => new FirebaseAdminAsyncConversationAuthority(f.db, { current: () => true,
    verify: async () => ({ kind: "verified", principal: { firebaseUid: uid } }) }, environment), /binding unavailable/u);
});
test("start uses one exact fixed readTime for complete authority/Persona/Note view with bounded inclusive ASC tie query", async () => {
  const f = seed(); f.put("check_ins/a", note()); f.put("check_ins/b", note()); f.put("check_ins/start", note(start));
  f.put("check_ins/outside", note("2026-10-07T08:59:59.999Z")); f.put("check_ins/future", note("2026-10-14T09:00:00.001Z"));
  const c = context(), v = await open(f, reader(f), c);
  f.documents.get(`accounts/${ownerId}`)!.data.optionalProcessingConsent = "rejected";
  try {
    const a = await v.readAuthority(); assert.equal(a.kind, "read");
    const p = await v.readPersonas(); assert.equal(p.kind, "read");
    if (p.kind === "read") assert.deepEqual(Object.keys(p.value.value.items[0]!.projection).sort(), ["formatStyle", "responseLength", "schemaVersion", "tone"]);
    const page = await v.readNotePage(query(c)); assert.equal(page.kind, "read");
    if (page.kind === "read") { assert.deepEqual(page.value.value.rows.map(row => row.sourceId), ["a", "b", "start"]);
      assert.equal(page.value.view, v.identity); assert.deepEqual(page.value.asOf, c.asOf); }
    assert.equal(f.options.length, 1); assert.equal(f.options[0]!.readOnly, true);
    assert.equal(f.options[0]!.readTime!.isEqual(asOf), true);
    assert.deepEqual(f.queries[0]!.where, [["ownerAccountId", "==", ownerId], ["createdAt", ">=", start], ["createdAt", "<=", iso]]);
    assert.deepEqual(f.queries[0]!.order[0], ["createdAt", "desc"]);
    assert.equal((f.queries[0]!.order[1]![0] as FieldPath).isEqual(FieldPath.documentId()), true);
    assert.equal(f.queries[0]!.order[1]![1], "asc"); assert.equal(f.queries[0]!.limit, 25);
  } finally { v.close(); }
});
test("absent/source-mismatched prerequisites fail before any Note query or required-source current read", async () => {
  for (const mismatched of [false, true]) {
    const f = seed();
    const r = mismatched ? new FirebaseAdminRealContextReader(f.db, { controlledEnvironment: environment, monotonicNow: () => 10,
      originalAuthority: { verify: async c => ({ kind: "read", value: c.principal }) }, notePrerequisites: capability(seed()) }) : reader(f, false);
    const v = await open(f, r);
    assert.equal((await v.readAuthority()).kind, "read"); assert.equal((await v.readPersonas()).kind, "read");
    assert.equal((await v.readNotePage(query())).kind, "unavailable"); assert.equal(f.queries.length, 0);
    assert.equal((await r.readCurrent(context(), dependencies([source()]))).kind, "unavailable");
    assert.ok(!f.gets.includes("check_ins/n")); v.close();
  }
});
test("content cannot be read before fixed-view owner/purpose authorization", async () => {
  const f = seed(), v = await open(f);
  assert.equal((await v.readPersonas()).kind, "unavailable"); assert.equal(f.gets.length, 0); v.close();
});
test("internal page25 keyset uses final raw tuple; complete reader keeps at most five legal exact Notes", async () => {
  const f = seed(); for (let n = 0; n < 27; n++) f.put(`check_ins/n${String(n).padStart(2, "0")}`, note());
  const v = await open(f); await v.readAuthority();
  try {
    const first = await v.readNotePage(query()); assert.equal(first.kind, "read");
    if (first.kind !== "read") return;
    assert.deepEqual(first.value.value.next, { occurredAt: iso, sourceId: "n24" });
    const second = await v.readNotePage({ ...query(), after: first.value.value.next }); assert.equal(second.kind, "read");
    if (second.kind === "read") assert.deepEqual(second.value.value.rows.map(row => row.sourceId), ["n25", "n26"]);
    assert.deepEqual(f.queries[1]!.after, [iso, "n24"]);
  } finally { v.close(); }
  const prepared = new PreparedRealContextReader(context(), reader(f), () => 10, () => true);
  assert.equal(await prepared.prepare(), "ready"); assert.equal(prepared.modelContext()!.checkIns.length, 5);
  assert.equal(prepared.modelContext()!.checkIns[0]!.noteText, "immutable exact Note 🧩"); prepared.dispose();
});
test("missing declared Persona or malformed Note fails, while legal empty Note set is captured", async () => {
  const missing = seed(); missing.documents.delete(`accounts/${ownerId}/personas/${personaId}`);
  const p = new PreparedRealContextReader(context(), reader(missing), () => 10, () => true);
  assert.equal(await p.prepare(), "unavailable"); assert.equal(missing.queries.length, 0);
  const bad = seed(); bad.put("check_ins/bad", { ...note(), note: "  altered spacing  " });
  const b = new PreparedRealContextReader(context(), reader(bad), () => 10, () => true);
  assert.equal(await b.prepare(), "unavailable"); assert.equal(b.modelContext(), undefined);
  const empty = seed(); empty.put(`accounts/${ownerId}/persona_state/current`, { livePersonaIds: [], stateRevision: 2 });
  const e = new PreparedRealContextReader(context(), reader(empty), () => 10, () => true);
  assert.equal(await e.prepare(), "ready"); assert.deepEqual(e.modelContext(), { persona: undefined, checkIns: [] }); e.dispose();
});
test("nonmillisecond asOf/string query fails without rounding or moving the inclusive window", async () => {
  const f = seed(), c = { ...context(), asOf: { seconds: asOf.seconds, nanoseconds: 1 } };
  const v = await open(f, reader(f), c); await v.readAuthority();
  assert.equal((await v.readNotePage(query(c))).kind, "unavailable"); assert.equal(f.queries.length, 0); v.close();
});
test("terminal while query is pending drops late content and prevents additional SDK content reads", async () => {
  const f = seed(); f.put("check_ins/n", note()); let unblock!: () => void, entered!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  f.holdQuery = () => { entered(); return new Promise<void>(resolve => { unblock = resolve; }); };
  const abort = new AbortController(), c = context(abort), v = await open(f, reader(f), c); await v.readAuthority();
  const pending = v.readNotePage(query(c)); await enteredPromise; abort.abort();
  const afterTerminal = v.readPersonas();
  unblock(); assert.deepEqual(await pending, { kind: "terminated" });
  assert.equal((await afterTerminal).kind, "terminated");
  assert.ok(!f.gets.includes(`accounts/${ownerId}/persona_state/current`)); v.close();
});
test("current checks fresh original Auth, allows Persona edit/switch and visibility-only updateTime", async () => {
  const f = seed(); f.put("check_ins/n", { ...note(), checkInVisibility: "public" }, new Timestamp(201, 456));
  f.put(`accounts/${ownerId}/personas/${personaId}`, persona("encouraging", 2));
  f.put(`accounts/${ownerId}/personas/${secondPersonaId}`, persona());
  f.put(`accounts/${ownerId}/persona_state/current`, { livePersonaIds: [personaId, secondPersonaId], activePersonaId: secondPersonaId, stateRevision: 2 });
  const r = reader(f); const result = await r.readCurrent(context(), dependencies([source()]));
  assert.equal(result.kind, "read"); if (result.kind === "read") {
    assert.equal(result.value.usedPersona, "exists"); assert.deepEqual(result.value.sources, [{ sourceId: "n", state: "valid" }]); }
  assert.equal(f.options[0]!.readTime, undefined);
});
test("current generation higher/rollback fails; deletion is explicit; present outside Persona membership is corrupt", async () => {
  for (const [generation, expected] of [[3, "denied"], [1, "unavailable"]] as const) {
    const f = seed(); f.documents.get(`accounts/${ownerId}`)!.data.purposeRevocationGeneration = generation;
    assert.equal((await reader(f).readCurrent(context(), dependencies([source()]))).kind, expected);
    assert.ok(!f.gets.includes("check_ins/n"));
  }
  const rollback = seed(); rollback.documents.get(`accounts/${ownerId}`)!.data.purposeRevocationGeneration = 1;
  rollback.documents.get(`accounts/${ownerId}`)!.data.optionalProcessingConsent = "rejected";
  assert.equal((await reader(rollback).readCurrent(context(), dependencies())).kind, "unavailable");
  const f = seed(); const result = await reader(f).readCurrent(context(), dependencies([source()]));
  assert.equal(result.kind, "read"); if (result.kind === "read") assert.deepEqual(result.value.sources, [{ sourceId: "n", state: "deleted" }]);
  f.put(`accounts/${ownerId}/persona_state/current`, { livePersonaIds: [], stateRevision: 2 });
  assert.equal((await reader(f).readCurrent(context(), dependencies())).kind, "unavailable");
  f.documents.delete(`accounts/${ownerId}/personas/${personaId}`);
  const deleted = await reader(f).readCurrent(context(), dependencies());
  assert.equal(deleted.kind, "read"); if (deleted.kind === "read") assert.equal(deleted.value.usedPersona, "deleted");
});
test("late current/Auth failure and raw SDK error return stable safe categories", async () => {
  const f = seed(); f.rejectRead = true;
  const v = await open(f); assert.deepEqual(await v.readAuthority(), { kind: "unavailable" }); v.close();
  assert.deepEqual(await reader(f).readCurrent(context(), dependencies()), { kind: "unavailable" });
  let now = 10;
  const r = new FirebaseAdminRealContextReader(f.db, { controlledEnvironment: environment, monotonicNow: () => now,
    originalAuthority: { verify: async c => { now = c.deadline; return { kind: "read", value: c.principal }; } } });
  assert.deepEqual(await r.openStart(context()), { kind: "terminated" });
});

test("simple local reader opts into all current Persona expression while issuing no Check-in queries", async () => {
  const f = seed();
  f.put(`accounts/${ownerId}/personas/${personaId}`, { ...persona(), relationship: "Companion", shortIntroduction: "Hello",
    description: "A voice", personality: "Curious", communicationStyle: "One question", interests: "custom piano", extraInstructions: "Chinese" });
  const r = new FirebaseAdminRealContextReader(f.db, { controlledEnvironment: environment, monotonicNow: () => 10,
    includeCheckIns: false, includePersonaExpression: true,
    originalAuthority: { verify: async c => ({ kind: "read", value: c.principal }) } });
  const prepared = new PreparedRealContextReader(context(), r, () => 10, () => true);
  assert.equal(await prepared.prepare(), "ready");
  const input = prepared.modelContext()!;
  assert.deepEqual(input.checkIns, []);
  assert.deepEqual(input.persona?.expression, { displayName: "private display name", tone: "warm", responseLength: "balanced", formatStyle: "plain",
    relationship: "Companion", shortIntroduction: "Hello", description: "A voice", personality: "Curious", communicationStyle: "One question", interests: "custom piano", extraInstructions: "Chinese" });
  assert.equal(f.queries.length, 0);
  assert.ok(f.gets.every(path => path === bindingPath || path === `accounts/${ownerId}` ||
    path === `accounts/${ownerId}/persona_state/current` || path === `accounts/${ownerId}/personas/${personaId}`));
  prepared.dispose(); assert.equal(prepared.modelContext(), undefined);
});
