import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, after, test } from "node:test";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { buildApp } from "../src/bootstrap/build-app.js";
import { RecommendEvents } from "../src/event-recommendations/application/recommend-events.js";
import { FirebaseAdminEventReadGateway } from "../src/event-recommendations/infrastructure/event-read-gateway.js";
import { FirestoreEventRecommendationRepository } from "../src/event-recommendations/infrastructure/firestore-event-recommendation-repository.js";
import {
  initializeApprovedS2Demo,
  loadApprovedS2DemoManifest,
} from "../src/event-recommendations/infrastructure/s2-demo-initializer.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { ok, err } from "../src/shared/domain/result.js";
import { eventRepositoryContract, eventTestRecords, EVENT_TEST_UID, EVENT_AS_OF,
  type FixtureDocuments } from "../test/support/event-repository-contract.js";

const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
let firebaseApp: App;
let firestore: Firestore;
let auth: Auth;
const password = `${randomUUID()}Aa1!`;

before(() => {
  firebaseApp = initializeApp({ projectId: environment.projectId }, `s2-shi-event-${process.pid}`);
  firestore = getFirestore(firebaseApp); auth = getAuth(firebaseApp);
});
beforeEach(async () => { await reset(); });
after(async () => { await reset(); await deleteApp(firebaseApp); });

async function reset(): Promise<void> {
  // Guard runs before every destructive reset, never a real/demo data project.
  requireControlledEmulatorEnvironment(process.env);
  for (const url of [
    `http://${environment.authHost}/emulator/v1/projects/${environment.projectId}/accounts`,
    `http://${environment.firestoreHost}/emulator/v1/projects/${environment.projectId}/databases/(default)/documents`,
  ]) assert.equal((await fetch(url, { method: "DELETE" })).ok, true);
}
async function seed(documents = eventTestRecords()): Promise<void> {
  const batch = firestore.batch();
  for (const [path, data] of Object.entries(documents)) batch.create(firestore.doc(path), data);
  await batch.commit();
}
async function dump(): Promise<FixtureDocuments> {
  const result: FixtureDocuments = {};
  for (const collection of await firestore.listCollections()) {
    for (const document of (await collection.get()).docs) result[document.ref.path] = document.data();
  }
  return result;
}
function repository() {
  return new FirestoreEventRecommendationRepository(new FirebaseAdminEventReadGateway(firestore));
}
eventRepositoryContract("real Auth/Firestore Emulator Port contract", async (documents) => {
  // A contract can create multiple independent fixtures within one test.
  await reset(); await seed(documents);
  return { repository: repository(), change: async (path, data) => { await firestore.doc(path).set(data); }, dump };
});
async function tokenFor(uid = EVENT_TEST_UID): Promise<string> {
  const email = `${uid}@example.invalid`;
  await auth.createUser({ uid, email, password, emailVerified: true });
  const response = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(response.ok, true);
  const body = await response.json() as { idToken: string };
  assert.equal(typeof body.idToken, "string"); return body.idToken;
}
async function eventApp(clock = { now: () => ok(new Date(EVENT_AS_OF)) }) {
  return buildApp({
    identityVerifier: new FirebaseIdentityVerifier(auth),
    recommendEvents: new RecommendEvents(repository(), clock),
    completeOnboarding: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    getOnboarding: { execute: async () => ok({ status: "required" as const }) },
    createCheckIn: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    getCheckIn: { execute: async () => err(appFailure("CHECKIN_UNAVAILABLE")) },
  });
}

test("real Auth + persisted API returns Home/All and isolates own selection", async () => {
  await seed();
  const token = await tokenFor();
  const other = "s2-shi-other";
  const otherToken = await tokenFor(other);
  await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(other)!}`).create({ accountId: "unrelated" });
  await firestore.doc("accounts/unrelated").set(eventTestRecords()["accounts/s2-account"]!);
  const app = await eventApp();
  try {
    const home = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=home", headers: { authorization: `Bearer ${token}` } });
    const all = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=all", headers: { authorization: `Bearer ${token}` } });
    assert.equal(home.statusCode, 200); assert.equal(all.statusCode, 200);
    assert.deepEqual(home.json().items.map((event: { eventId: string }) => event.eventId), ["ev_score2", "ev_early"]);
    assert.equal(all.json().items.length, 4);
    assert.equal(all.json().items[0].reasonCode, "interest_match");
    await firestore.doc("account_interests/unrelated").set({ interestTagIds: [], revision: 100 });
    const ownOther = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=all", headers: { authorization: `Bearer ${otherToken}` } });
    assert.equal(ownOther.statusCode, 200); assert.deepEqual(ownOther.json().items, []);
    const query = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=home&view=home", headers: { authorization: `Bearer ${token}` } });
    assert.equal(query.statusCode, 400); assert.equal(query.json().error.code, "REQUEST_INVALID");
  } finally { await app.close(); }
});
test("real persisted API rereads inputs and recaptures independent asOf", async () => {
  await seed(); const token = await tokenFor(); let now = new Date(EVENT_AS_OF);
  const app = await eventApp({ now: () => ok(now) });
  try {
    const request = () => app.inject({ method: "GET", url: "/v1/recommendations/events?view=all", headers: { authorization: `Bearer ${token}` } });
    assert.equal((await request()).json().items.length, 4);
    now = new Date("2026-09-16T00:00:00Z");
    const next = await request(); assert.equal(next.statusCode, 200);
    assert.deepEqual(next.json().items, []); assert.equal(next.json().asOf, now.toISOString());
    now = new Date(EVENT_AS_OF);
    await firestore.doc("account_interests/s2-account").set({ interestTagIds: [], revision: 2 });
    assert.deepEqual((await request()).json().items, []);
  } finally { await app.close(); }
});
test("real Event API missing/malformed/expired/disabled/revoked identity fails closed", async () => {
  await seed(); const token = await tokenFor(); const app = await eventApp();
  const encode = (data: object) => Buffer.from(JSON.stringify(data)).toString("base64url");
  const seconds = Math.floor(Date.now() / 1000);
  const expired = `${encode({ alg: "none", typ: "JWT" })}.${encode({ aud: environment.projectId,
    iss: `https://securetoken.google.com/${environment.projectId}`, sub: EVENT_TEST_UID,
    user_id: EVENT_TEST_UID, auth_time: seconds - 7200, iat: seconds - 7200, exp: seconds - 3600,
    firebase: { identities: {}, sign_in_provider: "password" } })}.`;
  try {
    for (const credential of [undefined, "not-a-token", expired]) {
      const response = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=bad",
        ...(credential === undefined ? {} : { headers: { authorization: `Bearer ${credential}` } }) });
      assert.equal(response.statusCode, 401); assert.equal(response.json().error.code, "AUTH_REQUIRED");
    }
    await auth.updateUser(EVENT_TEST_UID, { disabled: true });
    const disabled = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=all", headers: { authorization: `Bearer ${token}` } });
    assert.equal(disabled.statusCode, 403);
    const revokedToken = await tokenFor("s2-shi-revoked");
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await auth.revokeRefreshTokens("s2-shi-revoked");
    const revoked = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=all", headers: { authorization: `Bearer ${revokedToken}` } });
    assert.equal(revoked.statusCode, 403); assert.equal(revoked.json().error.code, "AUTH_FORBIDDEN");
  } finally { await app.close(); }
});

test("approved initializer is create-only, atomic and race safe in the isolated Emulator", async () => {
  await seed();
  requireControlledEmulatorEnvironment(process.env);
  assert.equal(firebaseApp.options.projectId, environment.projectId);
  const original = await dump();
  const manifest = await loadApprovedS2DemoManifest();
  const gateway = new FirebaseAdminFirestoreGateway(firestore);
  const results = await Promise.all([
    initializeApprovedS2Demo(gateway, manifest),
    initializeApprovedS2Demo(gateway, manifest),
  ]);
  assert.deepEqual(results.sort(), ["created", "unchanged"]);
  assert.equal(await initializeApprovedS2Demo(gateway, manifest), "unchanged");
  for (const [path, data] of Object.entries(original)) assert.deepEqual((await dump())[path], data);
  await firestore.doc(manifest.documents[0]!.path).set({ ...manifest.documents[0]!.data,
    displayName: "Do not overwrite" });
  await firestore.doc(manifest.documents[1]!.path).delete();
  const beforeConflictingRun = await dump();
  assert.equal(await initializeApprovedS2Demo(gateway, manifest), "conflict");
  assert.deepEqual(await dump(), beforeConflictingRun,
    "conflict must write nothing, including otherwise absent targets");
});
