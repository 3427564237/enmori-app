import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { FirestoreAccountPreferencesRepository } from "../src/account/infrastructure/firestore-account-preferences-repository.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId, createIdempotencyIdentity } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { canonicalizeUsername } from "../src/onboarding/domain/username.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";

const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, "demo-enmori-rmvp01a-r10");
const suffix = randomUUID(), uid = `ai-producer-${suffix}`, accountId = randomUUID();
const username = canonicalizeUsername(`ai_${suffix.replaceAll("-", "").slice(0, 12)}`), key = validateIdempotencyKey(`ProducerKey_${suffix}`);
assert.ok(username.ok && key.ok);
const firebase = initializeApp({ projectId: env.projectId }, `ai-producer-${suffix}`);
const firestore = getFirestore(firebase), auth = getAuth(firebase), gateway = new FirebaseAdminFirestoreGateway(firestore);
const onboarding = new FirestoreOnboardingRepository(gateway, process.env);
const repository = new FirestoreAccountPreferencesRepository(gateway, process.env);
const binding = `auth_bindings/${createAuthBindingDocumentId(uid)!}`, account = `accounts/${accountId}`;
const operation = `idempotency/${createIdempotencyIdentity({scope: uid, operation: "complete_onboarding", rawKey: key.value}).documentId}`;
const ownedPaths = [binding, account, `username_reservations/${username.value}`, operation];
let token: string;
const command = { firebaseUid: uid, canonicalUsername: username.value, optionalProcessingConsent: "accepted" as const,
  checkInVisibility: "private" as const, idempotencyKey: key.value, currentInstant: "2026-10-13T00:00:00.000Z",
  creation: { accountId, onboardingCompletedAt: "2026-10-13T00:00:00.000Z", idempotencyExpiresAt: "2026-10-14T00:00:00.000Z" } };

before(async () => {
  for (const path of ownedPaths) assert.equal((await firestore.doc(path).get()).exists, false);
  const password = `Synthetic_${randomUUID()}`;
  await auth.createUser({ uid, email: `${uid}@example.invalid`, password });
  const response = await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
    method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({email: `${uid}@example.invalid`, password, returnSecureToken: true}) });
  assert.equal(response.status, 200);
  token = (await response.json() as {idToken: string}).idToken;
});
after(async () => {
  try {
    for (const path of ownedPaths) await firestore.doc(path).delete();
    for (const path of ownedPaths) assert.equal((await firestore.doc(path).get()).exists, false);
    await auth.deleteUser(uid);
    await assert.rejects(auth.getUser(uid), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found");
    token = "";
  } finally { await firestore.terminate(); await deleteApp(firebase); }
});

test("isolated real Auth and onboarding initialize the Account generation atomically", async () => {
  const verified = await new FirebaseIdentityVerifier(auth).verifyIdToken(token);
  assert.equal(verified.kind, "verified");
  assert.equal((await onboarding.complete(command)).kind, "created");
  const stored = (await firestore.doc(account).get()).data()!;
  assert.equal(stored.purposeRevocationGeneration, 0);
  assert.equal(JSON.stringify(await repository.getSettings(uid)).includes("purposeRevocationGeneration"), false);
});

test("real concurrent withdrawal commits one settings revision and one revocation", async () => {
  const change = {optionalProcessingConsent: "rejected" as const, checkInVisibility: "private" as const, expectedRevision: 0};
  const results = await Promise.all([repository.saveSettings(uid, change), repository.saveSettings(uid, change)]);
  assert.deepEqual(results.map(r => r.kind).sort(), ["revision_precondition_failed", "saved"]);
  const stored = (await firestore.doc(account).get()).data()!;
  assert.equal(stored.purposeRevocationGeneration, 1); assert.equal(stored.settingsRevision, 1);
  assert.equal(stored.optionalProcessingConsent, "rejected");
});

test("real regrant and Profile replacement preserve withdrawal history; stale save is read-only", async () => {
  assert.equal((await repository.saveSettings(uid, {optionalProcessingConsent: "accepted", checkInVisibility: "public", expectedRevision: 1})).kind, "saved");
  assert.equal((await repository.saveProfile(uid, {displayName: "Synthetic owner", profileVisibility: "private", expectedRevision: 0})).kind, "saved");
  const before = (await firestore.doc(account).get()).data()!;
  assert.equal(before.purposeRevocationGeneration, 1);
  assert.equal((await repository.saveSettings(uid, {optionalProcessingConsent: "rejected", checkInVisibility: "private", expectedRevision: 1})).kind, "revision_precondition_failed");
  assert.deepEqual((await firestore.doc(account).get()).data(), before);
  assert.equal((await onboarding.complete(command)).kind, "replayed");
  assert.equal((await firestore.doc(account).get()).data()!.purposeRevocationGeneration, 1);
});
