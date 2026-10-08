import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { buildApp } from "../../src/bootstrap/build-app.js";
import { OwnPersonas } from "../../src/personas/application/own-personas.js";
import type { PersonaRepository } from "../../src/personas/ports/persona-repository.js";
import type { PersonaFailure } from "../../src/personas/ports/persona-repository.js";
import { FirestorePersonaRepository } from "../../src/personas/infrastructure/firestore-persona-repository.js";
import * as schemas from "../../src/personas/transport/schemas.js";
import { buildPersonaFrameworkErrors } from "../../src/personas/transport/framework-errors.js";
import { err, ok } from "../../src/shared/domain/result.js";
import { appFailure } from "../../src/shared/application/app-failure.js";
import type { IdentityVerifier } from "../../src/shared/ports/identity-verifier.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";

const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: "/tmp/persona-transport",
  HOME: "/tmp/persona-transport", USERPROFILE: "/tmp/persona-transport", APPDATA: "/tmp/persona-transport", XDG_CONFIG_HOME: "/tmp/persona-transport",
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };
const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
const unused = { completeOnboarding: unavailable, getOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable,
  getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable };
const id = "a".repeat(64), key = "12345678-1234-4123-8123-123456789abc";
const instant = "2026-10-08T00:00:00.000Z";
const fields = { displayName: " Calm ", tone: "neutral", responseLength: "balanced", formatStyle: "plain" };
const createBody = { ...fields, expectedStateRevision: 0 };
const headers = { authorization: "Bearer synthetic-owner" };
const createHeaders = { ...headers, "idempotency-key": key };
const paths = [ ["GET", "/v1/me/personas"], ["GET", `/v1/me/personas/${id}`], ["POST", "/v1/me/personas"],
  ["PUT", `/v1/me/personas/${id}`], ["PUT", "/v1/me/persona-selection"], ["DELETE", `/v1/me/personas/${id}`] ] as const;

async function fixture(verifier?: IdentityVerifier) {
  const store = new InMemoryFirestoreGateway({
    [`auth_bindings/${createAuthBindingDocumentId("synthetic-owner")!}`]: { accountId: "owner" },
    "accounts/owner": { username: "synthetic_owner", optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: instant },
    "accounts/owner/persona_state/current": { livePersonaIds: [], stateRevision: 0 },
  });
  const real = new FirestorePersonaRepository(store, { now: () => ok(new Date(instant)) });
  const calls: string[] = [];
  const control: { failure?: PersonaFailure; throwUnexpected?: boolean } = {};
  function call<T>(name: string, run: () => Promise<T>): Promise<T> {
    calls.push(name);
    if (control.throwUnexpected) throw new Error("private vendor diagnostic must stay hidden");
    return run();
  }
  const repository: PersonaRepository = {
    list: uid => call("list", () => control.failure ? Promise.resolve(err(control.failure)) : real.list(uid)),
    get: (uid, value) => call("get", () => control.failure ? Promise.resolve(err(control.failure)) : real.get(uid, value)),
    create: (uid, value) => call("create", () => control.failure ? Promise.resolve(err(control.failure)) : real.create(uid, value)),
    edit: (uid, value) => call("edit", () => control.failure ? Promise.resolve(err(control.failure)) : real.edit(uid, value)),
    activate: (uid, value) => call("activate", () => control.failure ? Promise.resolve(err(control.failure)) : real.activate(uid, value)),
    delete: (uid, value) => call("delete", () => control.failure ? Promise.resolve(err(control.failure)) : real.delete(uid, value)),
  };
  const identityVerifier = verifier ?? { verifyIdToken: async (token: string) => token === "invalid" ? { kind: "invalid" as const } :
    token === "forbidden" ? { kind: "forbidden" as const } : token === "offline" ? { kind: "dependency_unavailable" as const } :
      { kind: "verified" as const, principal: { firebaseUid: token } } };
  const personas = new OwnPersonas(repository);
  const app = await buildApp({ ...unused, identityVerifier, isolatedSlices: { environment, personas } });
  return { app, store, calls, control, identityVerifier, personas };
}

function assertFailure(response: { statusCode: number; json(): unknown; body: string }, status: number, code: string): void {
  assert.equal(response.statusCode, status, response.body);
  const result = response.json() as { error: { code: string; message: string; requestId: string } };
  assert.equal(result.error.code, code);
  assert.deepEqual(Object.keys(result.error).sort(), ["code", "message", "requestId"]);
  assert.equal(typeof result.error.requestId, "string");
}
const create = (app: FastifyInstance, payload: unknown = createBody, requestHeaders = createHeaders) =>
  app.inject({ method: "POST", url: "/v1/me/personas", headers: requestHeaders, payload: payload as object });

test("Persona Transport authenticates before malformed JSON, key, shape, oversized-body or repository work", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const [method, url] of paths) {
    assertFailure(await f.app.inject({ method, url }), 401, "AUTH_REQUIRED");
  }
  for (const payload of ["{", "x".repeat(4097)]) {
    assertFailure(await f.app.inject({ method: "POST", url: "/v1/me/personas", headers: { "content-type": "application/json" }, payload }), 401, "AUTH_REQUIRED");
  }
  for (const [token, status, code] of [["invalid", 401, "AUTH_REQUIRED"], ["forbidden", 403, "AUTH_FORBIDDEN"], ["offline", 503, "SERVICE_UNAVAILABLE"]] as const) {
    assertFailure(await create(f.app, createBody, { ...createHeaders, authorization: `Bearer ${token}` }), status, code);
  }
  assert.deepEqual(f.calls, []);
});

test("Persona router failures authenticate malformed and oversized IDs before returning the stable request error", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  const attempts = [
    { authorization: undefined, status: 401, code: "AUTH_REQUIRED" },
    { authorization: "Basic synthetic-private-token", status: 401, code: "AUTH_REQUIRED" },
    { authorization: "Bearer invalid", status: 401, code: "AUTH_REQUIRED" },
    { authorization: "Bearer forbidden", status: 403, code: "AUTH_FORBIDDEN" },
    { authorization: "Bearer offline", status: 503, code: "SERVICE_UNAVAILABLE" },
    { authorization: headers.authorization, status: 400, code: "REQUEST_INVALID" },
  ];
  for (const method of ["GET", "PUT", "DELETE"] as const) {
    for (const path of ["/v1/me/personas/%", "/v1/me/personas/%E0%A4%A", `/v1/me/personas/${"a".repeat(1001)}`,
      "/v1/me/person%61s/%", "/v1/me/personas/a%2Fb%"]) {
      for (const { authorization, status, code } of attempts) {
        const url = `${path}?private=synthetic-query-content`;
        const response = await f.app.inject({ method, url,
          headers: { ...(authorization === undefined ? {} : { authorization }), "content-type": "application/json" },
          ...(method === "GET" ? {} : { payload: '{"private":"synthetic-body-content"' }),
        });
        assertFailure(response, status, code);
        assert.deepEqual(Object.keys(response.json()), ["error"]);
        assert.notEqual(response.json().error.requestId, "");
        for (const forbidden of [url, path.slice(path.lastIndexOf("/") + 1), "synthetic-private-token", "synthetic-query-content", "synthetic-body-content",
          "FST_ERR_BAD_URL", "FST_ERR_NOT_FOUND", "URI malformed", "Bad URL", "Unexpected token", "SyntaxError"]) {
          assert.equal(response.body.includes(forbidden), false, "router failures must not expose request or parser content");
        }
      }
    }
  }
  assert.deepEqual(f.calls, []);
});

test("Persona router failures await identity verification and hide verifier exceptions", async t => {
  for (const segment of ["%", "a".repeat(1001)]) {
    let entered = false;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const verifier: IdentityVerifier = { verifyIdToken: async () => {
      entered = true;
      await gate;
      return { kind: "verified", principal: { firebaseUid: "synthetic-owner" } };
    } };
    const f = await fixture(verifier); t.after(() => f.app.close());
    let settled = false;
    const pending = f.app.inject({ method: "DELETE", url: `/v1/me/personas/${segment}`, headers }).then(response => {
      settled = true; return response;
    });
    try {
      await new Promise<void>(resolve => setImmediate(resolve));
      assert.equal(entered, true, "router-level failures must invoke the same asynchronous identity boundary");
      assert.equal(settled, false, "no URL outcome may race ahead of identity verification");
    } finally { release(); }
    assertFailure(await pending, 400, "REQUEST_INVALID");
    assert.deepEqual(f.calls, []);

    const throwing = await fixture({ verifyIdToken: async () => { throw new Error("synthetic-private-verifier-diagnostic"); } });
    t.after(() => throwing.app.close());
    const failed = await throwing.app.inject({ method: "GET", url: `/v1/me/personas/${segment}`, headers });
    assertFailure(failed, 503, "SERVICE_UNAVAILABLE");
    assert.equal(failed.body.includes("synthetic-private-verifier-diagnostic"), false);
    assert.deepEqual(throwing.calls, []);
  }
});

test("Persona router failure handling preserves disabled composition, legacy routes and unapproved methods", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  const plain = await buildApp({ ...unused, identityVerifier: f.identityVerifier }); t.after(() => plain.close());
  for (const segment of ["%", "%E0%A4%A", "a".repeat(1001)]) {
    for (const method of ["GET", "PUT", "DELETE"] as const) {
      const response = await plain.inject({ method, url: `/v1/me/personas/${segment}`, headers });
      // The ordinary composition has no DELETE router tree, so it returns 404 before URL decoding.
      assert.equal(response.statusCode, method === "DELETE" || segment.length > 1000 ? 404 : 400);
      assert.equal(response.json().error?.code, undefined, "disabled Persona composition retains the existing router response");
    }
    for (const method of ["GET", "PUT", "DELETE"] as const) {
      for (const [url, longStatus] of [
        [`/v1/check-ins/${segment}`, method === "GET" ? 414 : 404],
        [`/v1/me/personas/${segment}/extra`, 414],
        [`/v1/me/personas/${segment}/`, 414],
        [`/v1/me%2Fpersonas/${segment}`, 404],
      ] as const) {
        const actual = await f.app.inject({ method, url, headers });
        // These pre-fix router outcomes were verified independently. In particular, enabled DELETE
        // has a router tree unlike ordinary composition, so comparing their malformed URLs is invalid.
        const status = segment.length > 1000 ? longStatus : 400;
        assert.equal(actual.statusCode, status, "Persona correction must leave non-Persona router behavior unchanged");
        assert.equal(actual.json().code, status === 400 ? "FST_ERR_BAD_URL" : status === 414 ? "FST_ERR_MAX_PARAM_LENGTH" : undefined);
        assert.equal(actual.json().error, status === 404 ? "Not Found" : "Bad Request");
        assert.deepEqual(Object.keys(actual.json()).sort(), status === 404 ? ["error", "message", "statusCode"] : ["code", "error", "message", "statusCode"]);
      }
    }
    for (const method of ["POST", "PATCH", "OPTIONS", "HEAD"] as const) {
      const request = { method, url: `/v1/me/personas/${segment}`, headers };
      const actual = await f.app.inject(request);
      const baseline = await plain.inject(request);
      assert.equal(actual.statusCode, baseline.statusCode);
      assert.equal(actual.body, baseline.body, "unapproved methods must not acquire Persona handling");
    }
  }
  assert.deepEqual(f.calls, []);
});

test("Persona router raw absolute targets preserve path boundaries without dot-segment repair", async t => {
  let rawTarget = "", authCalls = 0;
  // inject normalizes absolute URLs itself. Rewrite only in this harness so the
  // actual Fastify router receives the original request-target bytes.
  const app = Fastify({ logger: false, rewriteUrl: () => rawTarget,
    frameworkErrors: buildPersonaFrameworkErrors({ verifyIdToken: async () => {
      authCalls += 1;
      return { kind: "verified", principal: { firebaseUid: "synthetic-owner" } };
    } }),
  });
  app.decorateRequest("authPrincipal", null);
  app.get("/v1/me/personas/:personaId", async () => assert.fail("rejected URL reached a route handler"));
  t.after(() => app.close());
  for (const [target, scoped] of [
    ["http://example.invalid/v1/me/personas/%", true],
    ["https://example.invalid/v1/me/person%61s/%E0%A4%A?private=synthetic-query", true],
    ["http://example.invalid/x/../v1/me/personas/%", false],
    ["http://example.invalid/v1/me%2Fpersonas/%", false],
    ["http://example.invalid/v1/me/personas/%#fragment", false],
  ] as const) {
    rawTarget = target;
    const before = authCalls;
    const response = await app.inject({ url: "/", headers });
    if (scoped) {
      assertFailure(response, 400, "REQUEST_INVALID");
      assert.equal(response.body.includes(target), false);
    } else {
      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "FST_ERR_BAD_URL");
    }
    assert.equal(authCalls - before, scoped ? 1 : 0);
  }
});

test("Persona Transport rejects exact-shape/type violations without AJV coercion or field removal", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const payload of [null, [], {}, { ...createBody, owner: "foreign" }, { ...createBody, displayName: 42 },
    { ...createBody, tone: ["neutral"] }, { ...createBody, responseLength: null }, { ...createBody, expectedStateRevision: "0" },
    { ...createBody, expectedStateRevision: false }, { ...createBody, formatStyle: { value: "plain" } }]) {
    assertFailure(await create(f.app, payload), 400, "REQUEST_INVALID");
  }
  for (const [method, url] of paths) {
    assertFailure(await f.app.inject({ method, url: url + "?owner=foreign", headers: createHeaders, ...(method === "GET" ? {} : { payload: createBody }) }), 400, "REQUEST_INVALID");
  }
  assertFailure(await f.app.inject({ method: "GET", url: "/v1/me/personas", headers, payload: { owner: "foreign" } }), 400, "REQUEST_INVALID");
  assertFailure(await f.app.inject({ method: "DELETE", url: `/v1/me/personas/${id}`, headers }), 400, "REQUEST_INVALID");
  assert.deepEqual(f.calls, []);
});

test("Persona Transport distinguishes invalid typed values and normalizes scalar names only in Application", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const change of [{ displayName: "  " }, { displayName: "😀".repeat(51) }, { displayName: "a\u200bb" }, { displayName: "a\ud800b" },
    { tone: "roleplay" }, { responseLength: "brief" }, { formatStyle: "markdown" }, { expectedStateRevision: -1 },
    { expectedStateRevision: 0.5 }, { expectedStateRevision: Number.MAX_SAFE_INTEGER + 1 }]) {
    assertFailure(await create(f.app, { ...createBody, ...change }), 422, "PERSONA_INVALID");
  }
  for (const expectedRevision of [0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertFailure(await f.app.inject({ method: "PUT", url: "/v1/me/persona-selection", headers,
      payload: { personaId: id, expectedRevision, expectedStateRevision: 0 } }), 422, "PERSONA_INVALID");
  }
  assert.deepEqual(f.calls, []);
  const saved = await create(f.app, { ...createBody, displayName: " \t" + "😀".repeat(50) + "\n " });
  assert.equal(saved.statusCode, 201, saved.body);
  assert.equal(saved.json().persona.displayName, "😀".repeat(50));
});

test("Persona Transport applies strict raw activation/path IDs and canonical create-only key syntax", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const personaId of [null, 42, "", "not-an-id", "A".repeat(64), id + "\n", " " + id, id.slice(1), id + "a"]) {
    assertFailure(await f.app.inject({ method: "PUT", url: "/v1/me/persona-selection", headers,
      payload: { personaId, expectedRevision: 1, expectedStateRevision: 0 } }), 400, "REQUEST_INVALID");
  }
  for (const value of ["not-an-id", "A".repeat(64), id + "\n"]) {
    assertFailure(await f.app.inject({ method: "GET", url: `/v1/me/personas/${encodeURIComponent(value)}`, headers }), 400, "REQUEST_INVALID");
  }
  for (const value of ["", key.toUpperCase(), key.replace("-4123-", "-5123-"), key + "\n", `${key}, ${key}`, " " + key]) {
    assertFailure(await create(f.app, createBody, { ...createHeaders, "idempotency-key": value }), 400, "IDEMPOTENCY_KEY_INVALID");
  }
  assertFailure(await f.app.inject({ method: "POST", url: "/v1/me/personas", headers, payload: createBody }), 400, "IDEMPOTENCY_KEY_INVALID");
  for (const [method, url] of paths.filter(([method]) => method !== "POST")) {
    const payload = method === "GET" ? undefined : method === "DELETE" ? { expectedRevision: 1, expectedStateRevision: 0 } :
      url.endsWith("persona-selection") ? { personaId: id, expectedRevision: 1, expectedStateRevision: 0 } : { ...fields, expectedRevision: 1, expectedStateRevision: 0 };
    assertFailure(await f.app.inject({ method, url, headers: createHeaders, ...(payload === undefined ? {} : { payload }) }), 400, "REQUEST_INVALID");
  }
  assert.deepEqual(f.calls, []);
  assertFailure(await f.app.inject({ method: "PUT", url: "/v1/me/persona-selection", headers,
    payload: { personaId: id, expectedRevision: 1, expectedStateRevision: 0 } }), 404, "PERSONA_UNAVAILABLE");
});

test("Persona Transport maps malformed/media/4096-byte boundaries locally, with safe parser output", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  const jsonHeaders = { ...createHeaders, "content-type": "application/json" };
  for (const payload of ["{", "", '{"displayName":', '"plain"']) {
    assertFailure(await f.app.inject({ method: "POST", url: "/v1/me/personas", headers: jsonHeaders, payload }), 400, "REQUEST_INVALID");
  }
  assertFailure(await f.app.inject({ method: "POST", url: "/v1/me/personas", headers: { ...createHeaders, "content-type": "application/octet-stream" }, payload: "private" }), 400, "REQUEST_INVALID");
  function padded(bytes: number): string {
    const base = { ...createBody, displayName: "Name" };
    const extra = bytes - Buffer.byteLength(JSON.stringify(base));
    const displayName = "\u3000".repeat(Math.floor(extra / 3)) + " ".repeat(extra % 3) + "Name";
    const payload = JSON.stringify({ ...base, displayName });
    assert.equal(Buffer.byteLength(payload), bytes); return payload;
  }
  assertFailure(await f.app.inject({ method: "POST", url: "/v1/me/personas", headers: jsonHeaders, payload: padded(4097) }), 400, "REQUEST_INVALID");
  assert.deepEqual(f.calls, []);
  const atLimit = await f.app.inject({ method: "POST", url: "/v1/me/personas", headers: jsonHeaders, payload: padded(4096) });
  assert.equal(atLimit.statusCode, 201, atLimit.body); assert.equal(atLimit.json().persona.displayName, "Name");
});

test("Persona six-operation HTTP chain preserves response shapes, 201/200 replay, revisions and bodyless repeat DELETE", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  const initial = await f.app.inject({ url: "/v1/me/personas", headers });
  assert.deepEqual(initial.json(), { personas: { items: [], stateRevision: 0 } });
  const first = await create(f.app); assert.equal(first.statusCode, 201, first.body);
  assert.deepEqual(Object.keys(first.json()).sort(), ["persona", "stateRevision"]);
  const persona = first.json().persona;
  assert.deepEqual(Object.keys(persona).sort(), ["createdAt", "displayName", "formatStyle", "personaId", "responseLength", "revision", "tone", "updatedAt"]);
  assert.equal(persona.displayName, "Calm"); assert.equal(persona.revision, 1);
  const replay = await create(f.app); assert.equal(replay.statusCode, 200); assert.deepEqual(replay.json(), first.json());
  assertFailure(await create(f.app, { ...createBody, tone: "warm" }), 409, "PERSONA_COMMAND_CONFLICT");
  const url = `/v1/me/personas/${persona.personaId}`;
  assert.deepEqual((await f.app.inject({ url, headers })).json(), first.json());
  const same = await f.app.inject({ method: "PUT", url, headers, payload: { ...fields, expectedRevision: 1, expectedStateRevision: 1 } });
  assert.deepEqual(same.json(), first.json()); assert.equal((await create(f.app)).statusCode, 200);
  const edited = await f.app.inject({ method: "PUT", url, headers, payload: { ...fields, tone: "warm", expectedRevision: 1, expectedStateRevision: 1 } });
  assert.equal(edited.statusCode, 200); assert.equal(edited.json().stateRevision, 2); assert.equal(edited.json().persona.revision, 2);
  assertFailure(await create(f.app), 412, "PERSONA_REVISION_PRECONDITION_FAILED");
  const active = await f.app.inject({ method: "PUT", url: "/v1/me/persona-selection", headers,
    payload: { personaId: persona.personaId, expectedRevision: 2, expectedStateRevision: 2 } });
  assert.equal(active.statusCode, 200); assert.equal(active.json().personas.activePersonaId, persona.personaId); assert.equal(active.json().personas.stateRevision, 3);
  const removed = await f.app.inject({ method: "DELETE", url, headers, payload: { expectedRevision: 2, expectedStateRevision: 3 } });
  assert.equal(removed.statusCode, 204); assert.equal(removed.body, ""); assert.equal(removed.headers["content-type"], undefined);
  const repeated = await f.app.inject({ method: "DELETE", url, headers, payload: { expectedRevision: 1, expectedStateRevision: 0 } });
  assert.equal(repeated.statusCode, 204); assert.equal(repeated.body, "");
  assert.deepEqual((await f.app.inject({ url: "/v1/me/personas", headers })).json(), { personas: { items: [], stateRevision: 4 } });
});

test("Persona Transport maps stable Application failures and hides unexpected exceptions", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const [failure, status, code] of [ ["onboarding_required", 409, "ONBOARDING_REQUIRED"], ["dependency_unavailable", 503, "SERVICE_UNAVAILABLE"],
    ["limit_reached", 409, "PERSONA_LIMIT_REACHED"], ["command_conflict", 409, "PERSONA_COMMAND_CONFLICT"],
    ["revision_precondition_failed", 412, "PERSONA_REVISION_PRECONDITION_FAILED"] ] as const) {
    f.control.failure = failure; assertFailure(await create(f.app), status, code);
  }
  f.control.failure = "unavailable";
  assertFailure(await f.app.inject({ url: `/v1/me/personas/${id}`, headers }), 404, "PERSONA_UNAVAILABLE");
  delete f.control.failure; f.control.throwUnexpected = true;
  const response = await create(f.app); assertFailure(response, 503, "SERVICE_UNAVAILABLE");
  assert.equal(response.body.includes("private vendor"), false);
});

test("Persona ordinary composition omits all six APIs and invalid requested isolation fails before any operation", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const url of ["/v1/me/personas", `/v1/me/personas/${id}`]) {
    assert.equal((await f.app.inject({ method: "HEAD", url, headers })).statusCode, 404, "only the six approved methods are registered");
  }
  const plain = await buildApp({ ...unused, identityVerifier: f.identityVerifier }); t.after(() => plain.close());
  for (const [method, url] of paths) {
    const response = await plain.inject({ method, url, headers, ...(method === "GET" ? {} : { payload: createBody }) });
    assert.equal(response.statusCode, 404, response.body);
  }
  for (const invalid of [{}, { ...environment, ENMORI_ENVIRONMENT: "controlled-demo" }, { ...environment, FIRESTORE_EMULATOR_HOST: undefined },
    { ...environment, GCLOUD_PROJECT: "real-project" }, { ...environment, FIREBASE_AUTH_EMULATOR_HOST: "remote.example:9099" },
    { ...environment, GOOGLE_APPLICATION_CREDENTIALS: "forbidden-credential-path" }]) {
    await assert.rejects(buildApp({ ...unused, identityVerifier: f.identityVerifier, isolatedSlices: { environment: invalid, personas: f.personas } }));
  }
  assert.deepEqual(f.calls, []);
});

test("Persona OpenAPI DTOs, headers, body/no-body rules, response statuses and scoped isolation match Transport", async () => {
  const api = JSON.parse(await readFile("api/openapi.json", "utf8"));
  for (const [name, schema] of Object.entries({ PersonaView: schemas.personaViewSchema, PersonaSet: schemas.personaSetSchema,
    PersonaEnvelope: schemas.personaEnvelopeSchema, PersonasEnvelope: schemas.personasEnvelopeSchema, CreatePersonaRequest: schemas.createPersonaBody,
    EditPersonaRequest: schemas.editPersonaBody, ActivatePersonaRequest: schemas.activatePersonaBody, DeletePersonaRequest: schemas.deletePersonaBody })) {
    assert.deepEqual(api.components.schemas[name], schema, name);
  }
  assert.deepEqual(api.components.parameters.PersonaIdempotencyKey.schema, schemas.personaCreateKeySchema);
  assert.equal(api.components.parameters.IdempotencyKey.schema.pattern, "^[A-Za-z0-9_-]{22,64}$");
  const operations = [ ["get", "/v1/me/personas", schemas.listPersonasSchema], ["get", "/v1/me/personas/{personaId}", schemas.getPersonaSchema],
    ["post", "/v1/me/personas", schemas.createPersonaSchema], ["put", "/v1/me/personas/{personaId}", schemas.editPersonaSchema],
    ["put", "/v1/me/persona-selection", schemas.activatePersonaSchema], ["delete", "/v1/me/personas/{personaId}", schemas.deletePersonaSchema] ] as const;
  for (const [method, path, transport] of operations) {
    const operation = api.paths[path][method];
    assert.equal(operation["x-enmori-environment"], "isolated-emulator");
    assert.deepEqual(Object.keys(operation.responses).sort(), [...Object.keys(transport.response), ...(method === "delete" ? ["204"] : [])].sort());
    if (method === "get") assert.equal(operation.requestBody, undefined);
    else { assert.equal(operation.requestBody.required, true); assert.match(operation.requestBody.description, /4096 UTF-8 bytes/); }
    if (method === "delete") assert.equal(operation.responses["204"].content, undefined);
  }
  const runtime = await readFile("backend/src/bootstrap/controlled-runtime.ts", "utf8");
  assert.equal(runtime.includes("isolatedSlices"), false, "controlled-demo must not request Persona composition");
});
