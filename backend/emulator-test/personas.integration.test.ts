import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { after, afterEach, test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/bootstrap/build-app.js";
import { OwnPersonas } from "../src/personas/application/own-personas.js";
import type { PersonaInput } from "../src/personas/application/persona-model.js";
import { personaExpressionFields } from "../src/personas/domain/persona-values.js";
import { FirestorePersonaRepository, derivePersonaId } from "../src/personas/infrastructure/firestore-persona-repository.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err, ok } from "../src/shared/domain/result.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway, type FirestoreGateway, type FirestoreTransactionGateway, type StoredDocument } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { personaRepositoryContract, PERSONA_TEST_TIME, PERSONA_TEST_FIELDS } from "../test/support/persona-repository-contract.js";

// Validate the actual runner-filtered environment before obtaining either service.
// The same process.env is passed to buildApp. No alternate environment/store exists.
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
const firebase = initializeApp({ projectId: environment.projectId }, `persona-emulator-${process.pid}`);
const auth = getAuth(firebase);
const firestore = getFirestore(firebase);
const baseGateway = new FirebaseAdminFirestoreGateway(firestore);
const instant = "2026-10-08T00:00:00.000Z";
const fields = PERSONA_TEST_FIELDS;
const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
const maximum = Number.MAX_SAFE_INTEGER;
const unknownId = "f".repeat(64);

interface PersonaView extends PersonaInput {
  personaId: string; createdAt: string; updatedAt: string; revision: number;
}
interface PersonaSet { items: PersonaView[]; stateRevision: number; activePersonaId?: string }
interface PersonaReply { persona: PersonaView; stateRevision: number }
interface Reply { statusCode: number; body: string; json(): unknown }
interface Owner { uid: string; accountId: string; token: string; email: string; password: string }
interface Attempt { reads: string[]; writes: number; scans: number }
interface Call { attempts: Attempt[] }
type Fault = "before-commit" | "after-commit" | "sdk-abort";

/** Observes actual SDK callbacks; faults wrap real Emulator transactions, never fake persistence. */
class ObservedGateway implements FirestoreGateway {
  readonly calls: Call[] = [];
  readonly history: Call[] = [];
  fault: Fault | undefined;
  async runTransaction<T>(work: (transaction: FirestoreTransactionGateway) => Promise<T>): Promise<T> {
    const call: Call = { attempts: [] };
    this.calls.push(call);
    this.history.push(call);
    const outcome = await baseGateway.runTransaction(async (transaction) => {
      const attempt: Attempt = { reads: [], writes: 0, scans: 0 };
      call.attempts.push(attempt);
      const observed: FirestoreTransactionGateway = {
        get: async (path) => { attempt.reads.push(path); return transaction.get(path); },
        list: async (path) => { attempt.scans += 1; return transaction.list(path); },
        listPage: async (path, afterId, limit) => { attempt.scans += 1; return transaction.listPage!(path, afterId, limit); },
        create: (path, data) => { attempt.writes += 1; transaction.create(path, data); },
        set: (path, data) => { attempt.writes += 1; transaction.set(path, data); },
        delete: (path) => { attempt.writes += 1; transaction.delete!(path); },
      };
      const result = await work(observed);
      if (attempt.writes > 0 && (this.fault === "before-commit" || this.fault === "sdk-abort")) {
        const fault = this.fault;
        this.fault = undefined;
        // ABORTED is handled by the actual Firestore SDK retry loop. Ordinary
        // injected errors abort without retry. Neither diagnostic includes data.
        if (fault === "sdk-abort") throw Object.assign(new Error("Synthetic transaction abort"), { code: 10 });
        throw new Error("Synthetic pre-commit interruption");
      }
      return result;
    });
    if (this.fault === "after-commit" && call.attempts.some((attempt) => attempt.writes > 0)) {
      this.fault = undefined;
      throw new Error("Synthetic lost post-commit completion");
    }
    return outcome;
  }
  clear(): void { this.calls.length = 0; }
  attempts(): Attempt[] { return this.calls.flatMap((call) => call.attempts); }
}

interface Fixture {
  binding?: StoredDocument | null;
  account?: StoredDocument | null;
  state?: StoredDocument | null;
  rows?: Readonly<Record<string, StoredDocument>>;
  admin?: boolean;
}

async function signIn(owner: Pick<Owner, "email" | "password">): Promise<string> {
  const response = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: owner.password, returnSecureToken: true }),
  });
  assert.equal(response.ok, true, "synthetic Auth Emulator sign-in succeeds");
  const payload = await response.json() as { idToken?: unknown };
  assert.equal(typeof payload.idToken, "string");
  return payload.idToken as string;
}

function row(overrides: StoredDocument = {}): StoredDocument {
  return { ...fields, createdAt: instant, updatedAt: instant, revision: 1, ...overrides };
}

class Harness {
  readonly gateway = new ObservedGateway();
  readonly owners: Owner[] = [];
  readonly pending = new Set<Promise<Reply>>();
  readonly clock = { now: () => ok(new Date(this.now)) };
  now = instant;
  api: FastifyInstance | undefined;
  readonly useCases = new OwnPersonas(new FirestorePersonaRepository(this.gateway, this.clock));

  async initialize(fixtures: readonly Fixture[]): Promise<void> {
    requireControlledEmulatorEnvironment(process.env);
    for (const fixture of fixtures) {
      const nonce = randomUUID();
      const owner: Owner = { uid: `persona-${nonce}`, accountId: `persona-owner-${nonce}`,
        email: `persona-${nonce}@example.invalid`, password: `${randomUUID()}Aa1!`, token: "" };
      this.owners.push(owner);
      await auth.createUser({ uid: owner.uid, email: owner.email, password: owner.password });
      if (fixture.admin) await auth.setCustomUserClaims(owner.uid, { admin: true });
      owner.token = await signIn(owner);
      if (fixture.binding !== null) await firestore.doc(this.bindingPath(owner)).create(fixture.binding ?? { accountId: owner.accountId });
      if (fixture.account !== null) await firestore.doc(`accounts/${owner.accountId}`).create(fixture.account ?? {
        username: `p_${nonce.replaceAll("-", "").slice(0, 16)}`, optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: instant,
      });
      if (fixture.state !== null) await firestore.doc(this.statePath(owner)).create(fixture.state ?? { livePersonaIds: [], stateRevision: 0 });
      for (const [id, data] of Object.entries(fixture.rows ?? {})) await firestore.doc(this.rowPath(id, owner)).create(data);
    }
    this.api = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth),
      completeOnboarding: unavailable, getOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable,
      getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable,
      isolatedSlices: { environment: process.env, personas: this.useCases } });
  }
  owner(index = 0): Owner { return this.owners[index]!; }
  bindingPath(owner = this.owner()): string { return `auth_bindings/${createAuthBindingDocumentId(owner.uid)!}`; }
  statePath(owner = this.owner()): string { return `accounts/${owner.accountId}/persona_state/current`; }
  rowPath(id: string, owner = this.owner()): string { return `accounts/${owner.accountId}/personas/${id}`; }
  async request(method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object, options: { owner?: Owner; token?: string | null; key?: string } = {}): Promise<Reply> {
    const token = options.token === undefined ? (options.owner ?? this.owner()).token : options.token;
    const headers = { ...(token === null ? {} : { authorization: `Bearer ${token}` }), ...(options.key === undefined ? {} : { "idempotency-key": options.key }) };
    const pending = Promise.resolve(this.api!.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) }));
    this.pending.add(pending);
    try { return await pending; } finally { this.pending.delete(pending); }
  }
  create(revision: number, key: string = randomUUID(), input: object = fields, owner = this.owner()): Promise<Reply> {
    return this.request("POST", "/v1/me/personas", { ...input, expectedStateRevision: revision }, { owner, key });
  }
  async list(owner = this.owner()): Promise<PersonaSet> {
    const response = await this.request("GET", "/v1/me/personas", undefined, { owner });
    assert.equal(response.statusCode, 200);
    return (response.json() as { personas: PersonaSet }).personas;
  }
  async state(owner = this.owner()): Promise<StoredDocument | undefined> { return (await firestore.doc(this.statePath(owner)).get()).data(); }
  async stored(id: string, owner = this.owner()): Promise<StoredDocument | undefined> { return (await firestore.doc(this.rowPath(id, owner)).get()).data(); }
  async close(): Promise<void> {
    // No still-addressable owner is reset. Drain requests, close the transport,
    // terminate identity sessions, then remove ONLY this test's fresh partitions.
    await Promise.allSettled([...this.pending]);
    await this.api?.close();
    for (const owner of this.owners) {
      await auth.deleteUser(owner.uid);
      await firestore.recursiveDelete(firestore.doc(`accounts/${owner.accountId}`));
      await firestore.doc(this.bindingPath(owner)).delete();
    }
  }
}

const totals = { transactionCalls: 0, transactionAttempts: 0, retriedCalls: 0, maximumGets: 0, collectionScans: 0 };
async function run(fixtures: readonly Fixture[], work: (harness: Harness) => Promise<void>): Promise<void> {
  const harness = new Harness();
  try { await harness.initialize(fixtures); await work(harness); }
  finally {
    try { recordCounts(harness); } finally { await harness.close(); }
  }
}

function recordCounts(harness: Harness): void {
  for (const call of harness.gateway.history) {
    totals.transactionCalls += 1;
    totals.transactionAttempts += call.attempts.length;
    if (call.attempts.length > 1) totals.retriedCalls += 1;
    for (const attempt of call.attempts) {
      totals.maximumGets = Math.max(totals.maximumGets, attempt.reads.length);
      totals.collectionScans += attempt.scans;
      assert.ok(attempt.reads.length <= 9, "each observed SDK transaction attempt uses at most nine logical gets");
      assert.equal(attempt.scans, 0, "Persona operations do not scan collections");
    }
  }
}

after(async () => { await deleteApp(firebase); });
after(() => {
  // Counts only: no UID, Account/Persona ID, path, key, body, token or vendor error.
  console.info(`Persona Emulator transaction counts ${JSON.stringify(totals)}; SDK retries are separate attempts, not a billing/runtime bound`);
});

function failure(response: Reply, status: number, code: string): void {
  assert.equal(response.statusCode, status);
  const body = response.json() as { error: { code: string; message: string; requestId: string } };
  assert.equal(body.error.code, code);
  assert.deepEqual(Object.keys(body.error).sort(), ["code", "message", "requestId"]);
  assert.equal(typeof body.error.requestId, "string");
}
function created(response: Reply): PersonaReply { assert.equal(response.statusCode, 201); return response.json() as PersonaReply; }
function expected(input: PersonaReply): object { return { expectedRevision: input.persona.revision, expectedStateRevision: input.stateRevision }; }
function expiredToken(uid: string): string {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ aud: environment.projectId, auth_time: now - 7200,
    exp: now - 3600, firebase: { identities: {}, sign_in_provider: "password" }, iat: now - 7200,
    iss: `https://securetoken.google.com/${environment.projectId}`, sub: uid, user_id: uid })}.`;
}

test("PC01 actual Firebase identity rejects absent, malformed, expired, disabled and revoked sessions before Persona access", async () => {
  await run([{}, {}], async (h) => {
    for (const token of [null, "not-a-token", expiredToken(h.owner().uid)]) {
      failure(await h.request("GET", "/v1/me/personas", undefined, { token }), 401, "AUTH_REQUIRED");
    }
    await auth.updateUser(h.owner().uid, { disabled: true });
    failure(await h.request("GET", "/v1/me/personas"), 403, "AUTH_FORBIDDEN");
    // Auth Emulator revocation uses whole seconds; cross the token's auth_time.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await auth.revokeRefreshTokens(h.owner(1).uid);
    failure(await h.request("GET", "/v1/me/personas", undefined, { owner: h.owner(1) }), 403, "AUTH_FORBIDDEN");
    assert.equal(h.gateway.calls.length, 0);
  });
});

test("PC01 current binding and completed Account are validated before any Persona get", async () => {
  for (const [fixture, code, status, count] of [
    [{ binding: null }, "ONBOARDING_REQUIRED", 409, 1],
    [{ binding: { accountId: 7 } }, "SERVICE_UNAVAILABLE", 503, 1],
    [{ binding: { accountId: "bad/path" } }, "SERVICE_UNAVAILABLE", 503, 1],
    [{ account: null }, "SERVICE_UNAVAILABLE", 503, 2],
    [{ account: { username: "synthetic_member", optionalProcessingConsent: "rejected" } }, "SERVICE_UNAVAILABLE", 503, 2],
  ] as const) {
    await run([fixture], async (h) => {
      failure(await h.request("GET", "/v1/me/personas"), status, code);
      for (const attempt of h.gateway.attempts()) {
        assert.equal(attempt.reads.length, count);
        assert.equal(attempt.reads.some((path) => path.includes("/personas/") || path.includes("/persona_state/")), false);
        assert.equal(attempt.writes, 0);
      }
    });
  }
});

test("PC01/PC04 real Admin claims and identical keys never cross owner partitions", async () => {
  await run([{}, { admin: true }], async (h) => {
    assert.equal((await auth.verifyIdToken(h.owner(1).token, true)).admin, true);
    const key = randomUUID();
    const first = created(await h.create(0, key));
    const second = created(await h.create(0, key, fields, h.owner(1)));
    assert.notEqual(first.persona.personaId, second.persona.personaId);
    h.gateway.clear();
    for (const id of [first.persona.personaId, unknownId]) {
      failure(await h.request("GET", `/v1/me/personas/${id}`, undefined, { owner: h.owner(1) }), 404, "PERSONA_UNAVAILABLE");
    }
    assert.equal(h.gateway.attempts().flatMap((attempt) => attempt.reads).some((path) => path.startsWith(`accounts/${h.owner().accountId}/`)), false);
    failure(await h.request("POST", "/v1/me/personas", { ...fields, expectedStateRevision: 1, ownerAccountId: h.owner().accountId }, { owner: h.owner(1), key: randomUUID() }), 400, "REQUEST_INVALID");
    assert.deepEqual((await h.list()).items, [first.persona]);
  });
});

test("PC02 authenticated invalid activation IDs and malformed values never reach Firestore", async () => {
  await run([{}], async (h) => {
    for (const personaId of [undefined, null, 5, "not-an-id", "A".repeat(64), ` ${unknownId}`, "g".repeat(64), "a".repeat(63), "a".repeat(65)]) {
      failure(await h.request("PUT", "/v1/me/persona-selection", { ...(personaId === undefined ? {} : { personaId }), expectedRevision: 1, expectedStateRevision: 0 }), 400, "REQUEST_INVALID");
    }
    for (const input of [
      { ...fields, displayName: "" }, { ...fields, displayName: "a".repeat(51) },
      { ...fields, displayName: "bad\u0000name" }, { ...fields, displayName: "bad\u200bname" },
      { ...fields, displayName: "bad\u2028name" }, { ...fields, displayName: "\ud800" },
      { ...fields, tone: "Neutral" }, { ...fields, responseLength: "brief" }, { ...fields, formatStyle: "markdown" },
    ]) failure(await h.create(0, randomUUID(), input), 422, "PERSONA_INVALID");
    for (const revision of [-1, 1.5, maximum + 1]) failure(await h.create(revision), 422, "PERSONA_INVALID");
    failure(await h.request("POST", "/v1/me/personas", { ...fields, expectedStateRevision: 0 }), 400, "IDEMPOTENCY_KEY_INVALID");
    failure(await h.create(0, "NOT-A-UUID"), 400, "IDEMPOTENCY_KEY_INVALID");
    failure(await h.request("GET", "/v1/me/personas?owner=other"), 400, "REQUEST_INVALID");
    failure(await h.request("GET", "/v1/me/personas", undefined, { key: randomUUID() }), 400, "REQUEST_INVALID");
    assert.equal(h.gateway.calls.length, 0);
    for (const name of ["x", "😀".repeat(50)]) {
      const set = await h.list();
      const result = created(await h.create(set.stateRevision, randomUUID(), { ...fields, displayName: `  ${name}  ` }));
      assert.equal(result.persona.displayName, name);
    }
  });
});

test("PC01/PC02 actual Auth precedes malformed Persona URL rejection without Firestore access", async () => {
  await run([{}], async (h) => {
    for (const method of ["GET", "PUT", "DELETE"] as const) {
      for (const suffix of ["%", "%E0%A4%A", "a".repeat(1001)]) {
        const url = `/v1/me/personas/${suffix}?private=synthetic-url-content`;
        for (const [token, status, code] of [
          [null, 401, "AUTH_REQUIRED"], ["not-a-token", 401, "AUTH_REQUIRED"],
          [expiredToken(h.owner().uid), 401, "AUTH_REQUIRED"], [h.owner().token, 400, "REQUEST_INVALID"],
        ] as const) {
          const response = await h.request(method, url, undefined, { token });
          failure(response, status, code);
          assert.equal(response.body.includes("synthetic-url-content"), false);
          assert.equal(response.body.includes("FST_ERR_"), false);
        }
      }
    }
    await auth.updateUser(h.owner().uid, { disabled: true });
    failure(await h.request("GET", "/v1/me/personas/%"), 403, "AUTH_FORBIDDEN");
    assert.equal(h.gateway.calls.length, 0);
  });
});

test("PC03 initialized empty set is distinct from missing, malformed, incomplete and orphaned state", async () => {
  const member = "a".repeat(64);
  await run([{}], async (h) => assert.deepEqual(await h.list(), { items: [], stateRevision: 0 }));
  for (const fixture of [
    { state: null }, { state: { livePersonaIds: [], stateRevision: -1 } },
    { state: { livePersonaIds: [member], stateRevision: 1 } },
    { state: { livePersonaIds: [member, member], stateRevision: 1 }, rows: { [member]: row() } },
    { state: { livePersonaIds: [], stateRevision: 0, activePersonaId: member } },
    { state: { livePersonaIds: [member], stateRevision: 1 }, rows: { [member]: row({ tone: "invalid" }) } },
  ]) await run([fixture], async (h) => {
    failure(await h.request("GET", "/v1/me/personas"), 503, "SERVICE_UNAVAILABLE");
    assert.equal(h.gateway.attempts().some((attempt) => attempt.writes > 0), false);
    if (fixture.state === null) assert.equal(await h.state(), undefined);
  });
  await run([{ rows: { [member]: row() } }], async (h) => {
    failure(await h.request("GET", `/v1/me/personas/${member}`), 503, "SERVICE_UNAVAILABLE");
    failure(await h.request("DELETE", `/v1/me/personas/${member}`, { expectedRevision: 1, expectedStateRevision: 0 }), 503, "SERVICE_UNAVAILABLE");
    assert.deepEqual(await h.stored(member), row());
  });
});

test("PC04/PC05 fifth creation replays before capacity; normalized conflict and different-key races cannot overwrite", async () => {
  await run([{}], async (h) => {
    for (let revision = 0; revision < 4; revision += 1) created(await h.create(revision));
    const key = randomUUID();
    const fifth = created(await h.create(4, key));
    assert.equal((await h.create(4, key, { ...fields, displayName: ` ${fields.displayName} ` })).statusCode, 200);
    failure(await h.create(4, key, { ...fields, tone: "warm" }), 409, "PERSONA_COMMAND_CONFLICT");
    failure(await h.create(5), 409, "PERSONA_LIMIT_REACHED");
    assert.deepEqual(await h.stored(fifth.persona.personaId), row());
    assert.equal((await h.list()).items.length, 5);
  });
  await run([{}], async (h) => {
    for (let revision = 0; revision < 4; revision += 1) created(await h.create(revision));
    const replies = await Promise.all([h.create(4), h.create(4)]);
    assert.deepEqual(replies.map((response) => response.statusCode).sort(), [201, 412]);
    assert.equal((await h.list()).items.length, 5);
    assert.equal((await firestore.collection(`accounts/${h.owner().accountId}/personas`).get()).size, 5);
  });
});

test("PC05 actual concurrent identical command commits once and same open command with changed input conflicts", async () => {
  await run([{}], async (h) => {
    const key = randomUUID();
    const replies = await Promise.all(Array.from({ length: 4 }, () => h.create(0, key)));
    assert.deepEqual(replies.map((response) => response.statusCode).sort(), [200, 200, 200, 201]);
    for (const response of replies) assert.deepEqual(response.json(), replies[0]!.json());
    const set = await h.list();
    assert.equal(set.stateRevision, 1); assert.equal(set.items.length, 1);
    failure(await h.create(0, key, { ...fields, formatStyle: "bulleted" }), 409, "PERSONA_COMMAND_CONFLICT");
    assert.deepEqual(await h.list(), set);
  });
});

test("PC06 real pre-commit interruption is atomic and an identical retry creates at the original revision", async () => {
  await run([{}], async (h) => {
    const key = randomUUID();
    h.gateway.fault = "before-commit";
    failure(await h.create(0, key), 503, "SERVICE_UNAVAILABLE");
    assert.deepEqual(await h.state(), { livePersonaIds: [], stateRevision: 0 });
    assert.equal((await firestore.collection(`accounts/${h.owner().accountId}/personas`).get()).size, 0);
    const result = created(await h.create(0, key));
    assert.deepEqual(await h.state(), { livePersonaIds: [result.persona.personaId], stateRevision: 1 });
  });
});

test("PC06 real commit with lost completion replays unchanged; later mutation closes recovery", async () => {
  await run([{}], async (h) => {
    const key = randomUUID();
    h.gateway.fault = "after-commit";
    failure(await h.create(0, key), 503, "SERVICE_UNAVAILABLE");
    const current = await h.list();
    assert.equal(current.items.length, 1); assert.equal(current.stateRevision, 1);
    const recovered = await h.create(0, key);
    assert.equal(recovered.statusCode, 200);
    assert.deepEqual(recovered.json(), { persona: current.items[0], stateRevision: 1 });
    created(await h.create(1));
    failure(await h.create(0, key), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
    assert.equal((await h.list()).items.length, 2);
  });
});

test("PC07 every subsequent effective owner mutation closes original creation without restoring deleted content", async () => {
  for (const mutation of ["edit", "activate", "create", "delete"] as const) await run([{}], async (h) => {
    const key = randomUUID();
    const initial = created(await h.create(0, key));
    const id = initial.persona.personaId;
    if (mutation === "edit") {
      assert.equal((await h.request("PUT", `/v1/me/personas/${id}`, { ...fields, tone: "warm", ...expected(initial) })).statusCode, 200);
      assert.equal((await h.request("PUT", `/v1/me/personas/${id}`, { ...fields, expectedRevision: 2, expectedStateRevision: 2 })).statusCode, 200);
    } else if (mutation === "activate") {
      assert.equal((await h.request("PUT", "/v1/me/persona-selection", { personaId: id, ...expected(initial) })).statusCode, 200);
    } else if (mutation === "create") created(await h.create(1));
    else assert.equal((await h.request("DELETE", `/v1/me/personas/${id}`, expected(initial))).statusCode, 204);
    const before = await h.state();
    failure(await h.create(0, key), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
    assert.deepEqual(await h.state(), before);
    if (mutation === "delete") { assert.equal(await h.stored(id), undefined); assert.deepEqual(before, { livePersonaIds: [], stateRevision: 2 }); }
  });
});

test("PC07/PC09 valid same-value edit and already-Active confirmation preserve the latest create window", async () => {
  const active = "1".repeat(64);
  await run([{ state: { livePersonaIds: [active], stateRevision: 10, activePersonaId: active }, rows: { [active]: row() } }], async (h) => {
    const key = randomUUID();
    const latest = created(await h.create(10, key));
    h.now = "2026-10-08T01:00:00.000Z";
    const before = await h.state();
    const edited = await h.request("PUT", `/v1/me/personas/${latest.persona.personaId}`, { ...fields, ...expected(latest) });
    assert.equal(edited.statusCode, 200); assert.deepEqual(edited.json(), latest);
    const confirmed = await h.request("PUT", "/v1/me/persona-selection", { personaId: active, expectedRevision: 1, expectedStateRevision: 11 });
    assert.equal(confirmed.statusCode, 200);
    assert.deepEqual(await h.state(), before);
    assert.deepEqual(await h.stored(latest.persona.personaId), row());
    const replay = await h.create(10, key); assert.equal(replay.statusCode, 200); assert.deepEqual(replay.json(), latest);
    for (const [method, url, payload] of [
      ["PUT", `/v1/me/personas/${latest.persona.personaId}`, { ...fields, expectedRevision: 1, expectedStateRevision: 10 }],
      ["PUT", "/v1/me/persona-selection", { personaId: active, expectedRevision: 1, expectedStateRevision: 10 }],
      ["DELETE", `/v1/me/personas/${latest.persona.personaId}`, { expectedRevision: 1, expectedStateRevision: 10 }],
    ] as const) failure(await h.request(method, url, payload), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
  });
});

test("PC08 deleting Active clears without replacement, frees capacity and repeat-delete ignores stale supplied versions", async () => {
  await run([{}], async (h) => {
    const entities: PersonaReply[] = [];
    for (let revision = 0; revision < 5; revision += 1) entities.push(created(await h.create(revision)));
    assert.equal(Object.hasOwn(await h.list(), "activePersonaId"), false);
    const id = entities[0]!.persona.personaId;
    const active = await h.request("PUT", "/v1/me/persona-selection", { personaId: id, expectedRevision: 1, expectedStateRevision: 5 });
    assert.equal(active.statusCode, 200);
    assert.equal((active.json() as { personas: PersonaSet }).personas.activePersonaId, id);
    const removed = await h.request("DELETE", `/v1/me/personas/${id}`, { expectedRevision: 1, expectedStateRevision: 6 });
    assert.equal(removed.statusCode, 204); assert.equal(removed.body, "");
    const state = await h.list();
    assert.equal(state.items.length, 4); assert.equal(state.stateRevision, 7); assert.equal(Object.hasOwn(state, "activePersonaId"), false);
    const repeat = await h.request("DELETE", `/v1/me/personas/${id}`, { expectedRevision: maximum, expectedStateRevision: 0 });
    assert.equal(repeat.statusCode, 204); assert.equal(repeat.body, ""); assert.deepEqual(await h.list(), state);
    created(await h.create(7));
    assert.equal((await h.list()).items.length, 5);
    assert.equal(await h.stored(id), undefined);
    assert.equal(JSON.stringify(await h.state()).includes(id), false);
  });
});

test("PC09 real competing edits commit once and stale target preconditions cannot bypass same-value checks", async () => {
  await run([{}], async (h) => {
    const initial = created(await h.create(0));
    const url = `/v1/me/personas/${initial.persona.personaId}`;
    const results = await Promise.all(["warm", "encouraging"].map((tone) => h.request("PUT", url, { ...fields, tone, ...expected(initial) })));
    assert.deepEqual(results.map((response) => response.statusCode).sort(), [200, 412]);
    const current = (await h.list()).items[0]!;
    assert.equal(current.revision, 2);
    failure(await h.request("PUT", url, { ...fields, tone: current.tone, expectedRevision: 1, expectedStateRevision: 2 }), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
    failure(await h.request("PUT", "/v1/me/persona-selection", { personaId: current.personaId, expectedRevision: 1, expectedStateRevision: 2 }), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
    failure(await h.request("DELETE", url, { expectedRevision: 1, expectedStateRevision: 2 }), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
    assert.deepEqual((await h.list()).items[0], current);
  });
});

test("PC03 actual concurrent reads remain coherent across create, edit, activation and deletion commits", async () => {
  await run([{}], async (h) => {
    let previous = await h.list();
    async function transition(change: () => Promise<Reply>): Promise<Reply> {
      const [mutation, ...reads] = await Promise.all([change(), ...Array.from({ length: 5 }, () => h.request("GET", "/v1/me/personas"))]);
      const current = await h.list();
      assert.equal(current.stateRevision, previous.stateRevision + 1);
      for (const response of reads) {
        assert.equal(response.statusCode, 200);
        const snapshot = (response.json() as { personas: PersonaSet }).personas;
        assert.deepEqual(snapshot, snapshot.stateRevision === previous.stateRevision ? previous : current);
      }
      previous = current;
      return mutation!;
    }
    const initial = created(await transition(() => h.create(0)));
    const id = initial.persona.personaId;
    assert.equal((await transition(() => h.request("PUT", `/v1/me/personas/${id}`, { ...fields, tone: "warm", expectedRevision: 1, expectedStateRevision: 1 }))).statusCode, 200);
    assert.equal((await transition(() => h.request("PUT", "/v1/me/persona-selection", { personaId: id, expectedRevision: 2, expectedStateRevision: 2 }))).statusCode, 200);
    assert.equal((await transition(() => h.request("DELETE", `/v1/me/personas/${id}`, { expectedRevision: 2, expectedStateRevision: 3 }))).statusCode, 204);
    assert.deepEqual(previous, { items: [], stateRevision: 4 });
  });
});

test("PC10 owner and target overflow fail without partial writes while current reads and no-ops succeed", async () => {
  const id = "2".repeat(64);
  await run([{ state: { livePersonaIds: [id], stateRevision: maximum, activePersonaId: id }, rows: { [id]: row({ revision: maximum }) } }], async (h) => {
    const before = await h.list();
    assert.equal((await h.request("PUT", `/v1/me/personas/${id}`, { ...fields, expectedRevision: maximum, expectedStateRevision: maximum })).statusCode, 200);
    assert.equal((await h.request("PUT", "/v1/me/persona-selection", { personaId: id, expectedRevision: maximum, expectedStateRevision: maximum })).statusCode, 200);
    failure(await h.create(maximum), 503, "SERVICE_UNAVAILABLE");
    failure(await h.request("PUT", `/v1/me/personas/${id}`, { ...fields, tone: "warm", expectedRevision: maximum, expectedStateRevision: maximum }), 503, "SERVICE_UNAVAILABLE");
    failure(await h.request("DELETE", `/v1/me/personas/${id}`, { expectedRevision: maximum, expectedStateRevision: maximum }), 503, "SERVICE_UNAVAILABLE");
    assert.deepEqual(await h.list(), before);
  });
  await run([{ state: { livePersonaIds: [id], stateRevision: 1 }, rows: { [id]: row({ revision: maximum }) } }], async (h) => {
    failure(await h.request("PUT", `/v1/me/personas/${id}`, { ...fields, tone: "warm", expectedRevision: maximum, expectedStateRevision: 1 }), 503, "SERVICE_UNAVAILABLE");
    assert.equal((await h.list()).stateRevision, 1);
  });
  await run([{ state: { livePersonaIds: [], stateRevision: maximum - 1 } }], async (h) => {
    const key = randomUUID(); const initial = created(await h.create(maximum - 1, key));
    const replay = await h.create(maximum - 1, key);
    assert.equal(replay.statusCode, 200); assert.deepEqual(replay.json(), initial);
  });
});

test("PC10 derived candidate orphan and full-ID collision checks precede stale and capacity outcomes", async () => {
  // Every damaged fixture is installed before the first business request; it is
  // discarded after its transport/session ends, never repaired/reset in place.
  for (const revision of [0, 5]) await run([{ state: { livePersonaIds: [], stateRevision: revision } }], async (h) => {
    const key = randomUUID(); const id = derivePersonaId(h.owner().accountId, 0, key);
    assert.match(id, /^[a-f0-9]{64}$/);
    await firestore.doc(h.rowPath(id)).create(row());
    failure(await h.create(0, key), 503, "SERVICE_UNAVAILABLE");
    assert.equal(h.gateway.attempts().every((attempt) => attempt.writes === 0), true);
  });
  const ids = ["3", "4", "5", "6", "7"].map((digit) => digit.repeat(64));
  await run([{ state: { livePersonaIds: ids, stateRevision: 5 }, rows: Object.fromEntries(ids.map((id) => [id, row()])) }], async (h) => {
    const key = randomUUID(); const id = derivePersonaId(h.owner().accountId, 5, key);
    await firestore.doc(h.rowPath(id)).create(row());
    failure(await h.create(5, key), 503, "SERVICE_UNAVAILABLE");
    assert.equal(h.gateway.attempts().every((attempt) => attempt.writes === 0), true);
  });
  await run([{}], async (h) => {
    const key = randomUUID(); const id = derivePersonaId(h.owner().accountId, 0, key);
    await firestore.doc(h.rowPath(id)).create(row());
    await firestore.doc(h.statePath()).set({ livePersonaIds: [id], stateRevision: 0 });
    failure(await h.create(0, key), 503, "SERVICE_UNAVAILABLE");
    assert.deepEqual(await h.stored(id), row());
  });
});

test("PC10 measured logical-get ceilings are eight/nine per actual SDK attempt, with retry accounting separate", async () => {
  const ids = ["3", "4", "5", "6", "7"].map((digit) => digit.repeat(64));
  await run([{ state: { livePersonaIds: ids, stateRevision: 5 }, rows: Object.fromEntries(ids.map((id) => [id, row()])) }], async (h) => {
    await h.list();
    assert.equal(h.gateway.calls.at(-1)!.attempts.every((attempt) => attempt.reads.length === 8), true);
    failure(await h.request("GET", `/v1/me/personas/${unknownId}`), 404, "PERSONA_UNAVAILABLE");
    assert.equal(h.gateway.calls.at(-1)!.attempts.every((attempt) => attempt.reads.length === 9), true);
    failure(await h.create(5), 409, "PERSONA_LIMIT_REACHED");
    assert.equal(h.gateway.calls.at(-1)!.attempts.every((attempt) => attempt.reads.length === 9), true);
    for (const attempt of h.gateway.attempts()) {
      assert.deepEqual(attempt.reads.slice(0, 3), [h.bindingPath(), `accounts/${h.owner().accountId}`, h.statePath()]);
      assert.equal(new Set(attempt.reads).size, attempt.reads.length);
    }
  });
  await run([{}], async (h) => {
    h.gateway.fault = "sdk-abort";
    created(await h.create(0));
    const call = h.gateway.calls[0]!;
    assert.ok(call.attempts.length >= 2, "actual SDK retries the injected ABORTED attempt");
    assert.equal(call.attempts.every((attempt) => attempt.reads.length === 4), true);
    assert.deepEqual((await h.list()).stateRevision, 1);
  });
});

test("PC14 live persistence and permanent deletion retain only approved records and content-free owner state", async () => {
  await run([{}], async (h) => {
    const beforeReceipts = (await firestore.collection("idempotency").get()).size;
    const key = randomUUID(); const initial = created(await h.create(0, key));
    const id = initial.persona.personaId;
    assert.deepEqual(Object.keys((await h.stored(id))!).sort(), [...Object.keys(fields), "createdAt", "revision", "updatedAt"].sort());
    assert.deepEqual(Object.keys((await h.state())!).sort(), ["livePersonaIds", "stateRevision"]);
    assert.equal((await firestore.collection("idempotency").get()).size, beforeReceipts);
    assert.deepEqual((await firestore.doc(`accounts/${h.owner().accountId}`).listCollections()).map((collection) => collection.id).sort(), ["persona_state", "personas"]);
    assert.equal((await h.request("DELETE", `/v1/me/personas/${id}`, expected(initial))).statusCode, 204);
    assert.deepEqual(await h.state(), { livePersonaIds: [], stateRevision: 2 });
    assert.equal(await h.stored(id), undefined);
    assert.equal((await firestore.collection(`accounts/${h.owner().accountId}/personas`).get()).empty, true);
    failure(await h.create(0, key), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
  });
});

test("20Oct actual populated expression saves, reads, conflicts, edits, activates and deletes without changing owner state semantics", async () => {
  const full = { ...fields, displayName: "Kai", relationship: "Companion", shortIntroduction: "Hello 🌿",
    description: "A thoughtful voice", personality: "Curious", communicationStyle: "One question\nThen pause.",
    interests: "Piano, 自定义兴趣", extraInstructions: "  Keep this spacing.\nReply naturally.  " };
  await run([{}], async h => {
    const key = randomUUID(), first = created(await h.create(0, key, full)), id = first.persona.personaId;
    for (const field of personaExpressionFields) assert.equal(first.persona[field], full[field]);
    assert.deepEqual((await h.request("GET", `/v1/me/personas/${id}`)).json(), first);
    assert.deepEqual(await h.stored(id), row(full));
    assert.equal((await h.create(0, key, full)).statusCode, 200);
    for (const field of personaExpressionFields) failure(await h.create(0, key, { ...full, [field]: full[field] + " changed" }), 409, "PERSONA_COMMAND_CONFLICT");
    const changed = { ...full, relationship: "Guide", shortIntroduction: "Changed", description: "A new description", personality: "Calm",
      communicationStyle: "Plain words", interests: "Custom reading", extraInstructions: "Use Chinese" };
    const edit = await h.request("PUT", `/v1/me/personas/${id}`, { ...changed, ...expected(first) });
    assert.equal(edit.statusCode, 200);
    const edited = edit.json() as PersonaReply;
    assert.equal(edited.stateRevision, 2); assert.equal(edited.persona.revision, 2);
    for (const field of personaExpressionFields) assert.equal(edited.persona[field], changed[field]);
    assert.deepEqual((await h.request("GET", `/v1/me/personas/${id}`)).json(), edited);
    failure(await h.request("PUT", `/v1/me/personas/${id}`, { ...full, ...expected(first) }), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
    const active = await h.request("PUT", "/v1/me/persona-selection", { personaId: id, ...expected(edited) });
    assert.equal(active.statusCode, 200); assert.equal((active.json() as { personas: PersonaSet }).personas.activePersonaId, id);
    assert.equal((await h.request("DELETE", `/v1/me/personas/${id}`, { expectedRevision: 2, expectedStateRevision: 3 })).statusCode, 204);
    assert.deepEqual(await h.list(), { items: [], stateRevision: 4 }); assert.equal(await h.stored(id), undefined);
  });
});

test("20Oct actual legacy expression reads empty without migration; malformed free fields remain unavailable", async () => {
  const id = "9".repeat(64), legacy = { ...row() };
  for (const field of personaExpressionFields) delete legacy[field];
  await run([{ state: { livePersonaIds: [id], stateRevision: 1 }, rows: { [id]: legacy } }], async h => {
    const view = (await h.list()).items[0]!;
    for (const field of personaExpressionFields) assert.equal(view[field], "");
    assert.deepEqual(await h.stored(id), legacy);
    assert.equal(h.gateway.attempts().every(attempt => attempt.writes === 0), true);
  });
  for (const value of [null, 7, ["not-text"]]) await run([{ state: { livePersonaIds: [id], stateRevision: 1 }, rows: { [id]: row({ interests: value }) } }], async h => {
    failure(await h.request("GET", "/v1/me/personas"), 503, "SERVICE_UNAVAILABLE");
    assert.equal(h.gateway.attempts().every(attempt => attempt.writes === 0), true);
  });
});

// The same repository Port contract is also executed against the real adapter.
// Each scenario gets fresh partitions and actual Emulator users, and is closed
// by afterEach before any fixture cleanup; deliberate corruption does not repair
// or reset a previously used partition for another scenario.
let contractHarness: Harness | undefined;
afterEach(async () => {
  const h = contractHarness;
  contractHarness = undefined;
  if (h !== undefined) {
    try { recordCounts(h); } finally { await h.close(); }
  }
});
personaRepositoryContract("actual Persona Emulator Port contract", async () => {
  const h = new Harness();
  contractHarness = h;
  h.now = PERSONA_TEST_TIME;
  await h.initialize([{}, {}]);
  return {
    repository: new FirestorePersonaRepository(h.gateway, h.clock),
    uid: h.owner().uid, otherUid: h.owner(1).uid,
    accountId: h.owner().accountId, otherAccountId: h.owner(1).accountId,
    change: async (path, data) => {
      assert.ok(h.owners.some((owner) => path === h.bindingPath(owner) || path === `accounts/${owner.accountId}` || path.startsWith(`accounts/${owner.accountId}/`)));
      if (data === undefined) await firestore.doc(path).delete();
      else await firestore.doc(path).set(data);
    },
    dump: async () => {
      const records: Record<string, Record<string, unknown>> = {};
      for (const owner of h.owners) {
        for (const path of [h.bindingPath(owner), `accounts/${owner.accountId}`, h.statePath(owner)]) {
          const data = (await firestore.doc(path).get()).data();
          if (data !== undefined) records[path] = data;
        }
        const personas = await firestore.collection(`accounts/${owner.accountId}/personas`).get();
        for (const document of personas.docs) records[document.ref.path] = document.data();
      }
      return records;
    },
  };
});
