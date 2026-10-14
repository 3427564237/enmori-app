import assert from "node:assert/strict";
import test from "node:test";
import { nextPurposeRevocationGeneration } from "../src/account/domain/purpose-revocation-generation.js";
import { FirestoreAccountPreferencesRepository } from "../src/account/infrastructure/firestore-account-preferences-repository.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { canonicalizeUsername } from "../src/onboarding/domain/username.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";

const environment = { ENMORI_ENVIRONMENT: "test", GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:29099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:28080",
  ENMORI_CONTROLLED_PROFILE_DIRECTORY: "/tmp/isolated-ai-producer-unit", HOME: "/tmp/isolated-ai-producer-unit",
  APPDATA: "/tmp/isolated-ai-producer-unit", USERPROFILE: "/tmp/isolated-ai-producer-unit", XDG_CONFIG_HOME: "/tmp/isolated-ai-producer-unit" };
const base = { username: "producer_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
  onboardingCompletedAt: "2026-10-13T00:00:00.000Z" };
function fixture(generation: unknown) {
  const store = new InMemoryFirestoreGateway({ [`auth_bindings/${createAuthBindingDocumentId("producer-uid")!}`]: { accountId: "producer-owner" },
    "accounts/producer-owner": { ...base, ...(generation === undefined ? {} : { purposeRevocationGeneration: generation }) },
    "accounts/peer": { ...base, purposeRevocationGeneration: 7 } });
  return { store, repo: new FirestoreAccountPreferencesRepository(store, environment) };
}
const settings = (consent: "accepted" | "rejected", expectedRevision: number) => ({ optionalProcessingConsent: consent, checkInVisibility: "public" as const, expectedRevision });

test("isolated producer constructors reject ordinary or unguarded environments", () => {
  for (const bad of [{}, { ...environment, ENMORI_ENVIRONMENT: "demo" }, { ...environment, GCLOUD_PROJECT: "real-project" },
    { ...environment, HOME: "/home/real" }, { ...environment, FIRESTORE_EMULATOR_HOST: "example.org:8080" }, { ...environment, GOOGLE_APPLICATION_CREDENTIALS: "forbidden" }]) {
    assert.throws(() => new FirestoreAccountPreferencesRepository(new InMemoryFirestoreGateway(), bad));
    assert.throws(() => new FirestoreOnboardingRepository(new InMemoryFirestoreGateway(), bad));
  }
});

test("withdrawal is atomic with settings revision, regrant and visibility preserve generation", async () => {
  const { store, repo } = fixture(0);
  assert.equal((await repo.saveSettings("producer-uid", settings("rejected", 0))).kind, "saved");
  assert.equal(store.read("accounts/producer-owner")!.purposeRevocationGeneration, 1);
  const denied = store.entries();
  assert.equal((await repo.saveSettings("producer-uid", settings("accepted", 0))).kind, "revision_precondition_failed");
  assert.deepEqual(store.entries(), denied);
  assert.equal((await repo.saveSettings("producer-uid", settings("accepted", 1))).kind, "saved");
  assert.equal((await repo.saveSettings("producer-uid", settings("accepted", 2))).kind, "saved");
  assert.equal(store.read("accounts/producer-owner")!.purposeRevocationGeneration, 1);
  assert.equal((await repo.saveSettings("producer-uid", settings("rejected", 3))).kind, "saved");
  assert.equal(store.read("accounts/producer-owner")!.purposeRevocationGeneration, 2);
  assert.equal(store.read("accounts/peer")!.purposeRevocationGeneration, 7);
  const result = await repo.getSettings("producer-uid");
  assert.equal(result.kind, "found");
  assert.equal(JSON.stringify(result).includes("purposeRevocationGeneration"), false);
});

test("Profile replacement preserves the generation and independent Settings values", async () => {
  const { store, repo } = fixture(13);
  assert.equal((await repo.saveProfile("producer-uid", { displayName: "Owner", profileVisibility: "public", expectedRevision: 0 })).kind, "saved");
  assert.equal(store.read("accounts/producer-owner")!.purposeRevocationGeneration, 13);
  assert.equal(store.read("accounts/producer-owner")!.optionalProcessingConsent, "accepted");
});

test("missing or corrupt generation never defaults to zero or writes either resource", async () => {
  for (const generation of [undefined, null, -1, 0.5, "0", Number.MAX_SAFE_INTEGER + 1]) {
    const { store, repo } = fixture(generation); const before = store.entries();
    assert.equal((await repo.saveSettings("producer-uid", settings("rejected", 0))).kind, "dependency_unavailable");
    assert.equal((await repo.saveProfile("producer-uid", { displayName: null, profileVisibility: "private", expectedRevision: 0 })).kind, "dependency_unavailable");
    assert.deepEqual(store.entries(), before);
  }
});

test("overflow rejects withdrawal without advancing settings or mutating content", async () => {
  const { store, repo } = fixture(Number.MAX_SAFE_INTEGER); const before = store.entries();
  assert.equal((await repo.saveSettings("producer-uid", settings("rejected", 0))).kind, "dependency_unavailable");
  assert.deepEqual(store.entries(), before);
  assert.equal(nextPurposeRevocationGeneration(Number.MAX_SAFE_INTEGER, "accepted", "accepted"), Number.MAX_SAFE_INTEGER);
});

test("ordinary constructor neither adds a new field nor migrates legacy records", async () => {
  const { store } = fixture(undefined); const repo = new FirestoreAccountPreferencesRepository(store);
  assert.equal((await repo.saveSettings("producer-uid", settings("rejected", 0))).kind, "saved");
  assert.equal(Object.hasOwn(store.read("accounts/producer-owner")!, "purposeRevocationGeneration"), false);
});

test("legacy writer cannot bypass revocation history on an opted-in Account", async () => {
  const { store } = fixture(4), repo = new FirestoreAccountPreferencesRepository(store);
  const before = store.entries();
  assert.equal((await repo.saveSettings("producer-uid", settings("rejected", 0))).kind, "dependency_unavailable");
  assert.deepEqual(store.entries(), before);
  assert.equal((await repo.saveProfile("producer-uid", {displayName: "Owner", profileVisibility: "private", expectedRevision: 0})).kind, "saved");
  assert.equal(store.read("accounts/producer-owner")!.purposeRevocationGeneration, 4);
});

test("fresh isolated onboarding initializes zero without adding it to wire or replay projection", async () => {
  const username = canonicalizeUsername("new_producer"), key = validateIdempotencyKey("IsolatedProducerKey_1234567890");
  assert.ok(username.ok && key.ok);
  const store = new InMemoryFirestoreGateway(), repo = new FirestoreOnboardingRepository(store, environment);
  const command = { firebaseUid: "new-producer-uid", canonicalUsername: username.value, optionalProcessingConsent: "accepted" as const,
    checkInVisibility: "private" as const, idempotencyKey: key.value, currentInstant: "2026-10-13T00:00:00.000Z",
    creation: { accountId: "new-producer-owner", onboardingCompletedAt: "2026-10-13T00:00:00.000Z", idempotencyExpiresAt: "2026-10-14T00:00:00.000Z" } };
  const created = await repo.complete(command); assert.equal(created.kind, "created");
  assert.equal(store.read("accounts/new-producer-owner")!.purposeRevocationGeneration, 0);
  assert.equal(JSON.stringify(created).includes("purposeRevocationGeneration"), false);
  await store.runTransaction(async tx => { tx.set("accounts/new-producer-owner", { ...store.read("accounts/new-producer-owner")!, purposeRevocationGeneration: 9 }); });
  assert.equal((await repo.complete(command)).kind, "replayed");
  assert.equal(store.read("accounts/new-producer-owner")!.purposeRevocationGeneration, 9);
});
