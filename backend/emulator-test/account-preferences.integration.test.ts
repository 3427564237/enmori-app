import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirestoreAccountPreferencesRepository } from "../src/account/infrastructure/firestore-account-preferences-repository.js";
import { OwnAccountPreferences } from "../src/account/application/own-account-preferences.js";
import { emptyProfileDetails } from "../src/account/domain/profile-details.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err } from "../src/shared/domain/result.js";

const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, "demo-enmori-rmvp01a-r10");
const firebase = initializeApp({ projectId: env.projectId }, "s3-account-emulator");
const auth = getAuth(firebase), firestore = getFirestore(firebase);
const repository = new FirestoreAccountPreferencesRepository(new FirebaseAdminFirestoreGateway(firestore));
const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
const password = `${randomUUID()}Aa1!`;
const tokens: string[] = [];
const base = { username: "member_a", optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: "2026-10-05T00:00:00.000Z" };
before(async () => {
  requireControlledEmulatorEnvironment(process.env);
  for (const url of [`http://${env.authHost}/emulator/v1/projects/${env.projectId}/accounts`,
    `http://${env.firestoreHost}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`]) {
    assert.equal((await fetch(url, { method: "DELETE" })).ok, true);
  }
  for (const suffix of ["a", "b"]) {
    const uid = `s3-account-${suffix}`, email = `${uid}@example.invalid`;
    await auth.createUser({ uid, email, password });
    await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`).set({ accountId: `owner-${suffix}` });
    await firestore.doc(`accounts/owner-${suffix}`).set({ ...base, username: `member_${suffix}` });
    const response = await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.ok, true); const body = await response.json() as { idToken: string }; tokens.push(body.idToken);
  }
});
after(async () => { await deleteApp(firebase); });

test("real transaction races commit once, preserve independent resources and isolate another Account", async () => {
  const app = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth), accountPreferences: new OwnAccountPreferences(repository),
    completeOnboarding: unavailable, getOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable,
    getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable });
  try {
    const headers = { authorization: `Bearer ${tokens[0]!}` };
    const write = (path: string, payload: object) => app.inject({ method: "PUT", url: path, headers, payload });
    const races = await Promise.all(["Alex", "Blair"].map((displayName) => write("/v1/me/profile", { displayName, profileVisibility: "public", expectedRevision: 0 })));
    assert.deepEqual(races.map((r) => r.statusCode).sort(), [200, 412]);
    const [profile, settings] = await Promise.all([
      write("/v1/me/profile", { displayName: "Canonical", profileVisibility: "friends_only", expectedRevision: 1 }),
      write("/v1/me/settings", { checkInVisibility: "friends_only", optionalProcessingConsent: "accepted", expectedRevision: 0 }),
    ]);
    assert.equal(profile.statusCode, 200); assert.equal(settings.statusCode, 200);
    const stored = (await firestore.doc("accounts/owner-a").get()).data()!;
    assert.deepEqual(stored, { ...base, displayName: "Canonical", profileVisibility: "friends_only", profileRevision: 2,
      checkInVisibility: "friends_only", optionalProcessingConsent: "accepted", settingsRevision: 1 });
    const before = JSON.stringify(stored);
    assert.equal((await write("/v1/me/settings", { checkInVisibility: "private", optionalProcessingConsent: "rejected", expectedRevision: 0 })).statusCode, 412);
    assert.equal(JSON.stringify((await firestore.doc("accounts/owner-a").get()).data()), before);
    const other = await app.inject({ url: "/v1/me/profile", headers: { authorization: `Bearer ${tokens[1]!}` } });
    assert.deepEqual(other.json(), { profile: { username: "member_b", displayName: null, profileVisibility: "private", revision: 0, details: emptyProfileDetails } });
    assert.deepEqual((await firestore.doc("accounts/owner-b").get()).data(), { ...base, username: "member_b" });
    const identity = { displayName: "Canonical", profileVisibility: "friends_only" };
    const location = "Previously stored region";
    const detailFields = { bio: "New bio", affiliationType: "school", affiliationName: "Example" };
    assert.equal((await write("/v1/me/profile", { ...identity, details: { ...detailFields, region: location }, expectedRevision: 2 })).statusCode, 200);
    const edits = await Promise.all(["First", "Second"].map(bio => write("/v1/me/profile", {
      ...identity, expectedRevision: 3, details: { ...detailFields, bio },
    })));
    assert.deepEqual(edits.map(r => r.statusCode).sort(), [200, 412]);
    assert.equal(edits.find(r => r.statusCode === 200)!.json().profile.details.region, location);
    const current = (await firestore.doc("accounts/owner-a").get()).data()!;
    assert.equal(current.profileDetails.region, location);
    assert.equal(current.settingsRevision, stored.settingsRevision);
    const clear = await write("/v1/me/profile", { ...identity, details: { ...detailFields, region: null }, expectedRevision: 4 });
    assert.equal(clear.statusCode, 200);
    assert.equal((await firestore.doc("accounts/owner-a").get()).get("profileDetails.region"), null);
    assert.equal((await app.inject({ url: "/v1/me/settings" })).statusCode, 401);
    await auth.updateUser("s3-account-b", { disabled: true });
    assert.equal((await app.inject({ url: "/v1/me/profile", headers: { authorization: `Bearer ${tokens[1]!}` } })).statusCode, 403);
  } finally { await app.close(); }
});
