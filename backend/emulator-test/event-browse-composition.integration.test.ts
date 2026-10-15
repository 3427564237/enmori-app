import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { buildApp } from "../src/bootstrap/build-app.js";
import { GetOnboarding } from "../src/onboarding/application/get-onboarding.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err } from "../src/shared/domain/result.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { browseId } from "../src/event-browse/domain/browse-values.js";

const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, "demo-enmori-rmvp01a-r10");
const firebase = initializeApp({ projectId: env.projectId }, "event-browse-isolated-gate");
const auth = getAuth(firebase), firestore = getFirestore(firebase);
const suffix = randomUUID(), uid = `event-owner-${suffix}`, newcomer = `event-new-${suffix}`, accountId = `event-account-${suffix}`;
const binding = firestore.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`), accountRef = firestore.doc(`accounts/${accountId}`);
const asOf = "2026-10-15T02:00:00.000Z";
const account = { username: "event_fixture", optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: asOf };
const item = { browseId: browseId("synthetic-occurrence")!, title: "Synthetic activity", startAt: "2026-10-16T02:00:00.000000001Z", externalSourceUrl: "https://ticketmaster.sg/activity/synthetic" };
const paths = ["/v1/event-browse", `/v1/event-browse/${item.browseId}`];
const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
let calls = 0, ownerToken = "", newcomerToken = "", failSource = false;
const source = {
  async firstBatch() { calls++; if (failSource) throw new Error("private-provider-diagnostic"); return [item]; },
  async detail() { calls++; return item; },
};
let app: Awaited<ReturnType<typeof buildApp>> | undefined;
before(async () => {
  const password = `${randomUUID()}Aa1!`;
  async function signIn(id: string) {
    const email = `${id}@example.invalid`;
    await auth.createUser({ uid: id, email, password });
    const response = await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.ok, true); return (await response.json() as { idToken: string }).idToken;
  }
  ownerToken = await signIn(uid); newcomerToken = await signIn(newcomer);
  await binding.set({ accountId }); await accountRef.set(account);
  app = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth), getOnboarding: new GetOnboarding(new FirestoreOnboardingRepository(new FirebaseAdminFirestoreGateway(firestore))),
    completeOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable, getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable,
    isolatedSlices: { environment: process.env, eventBrowse: { source, now: () => new Date(asOf) } } });
});
after(async () => {
  await app?.close();
  await binding.delete(); await accountRef.delete();
  assert.equal((await binding.get()).exists, false); assert.equal((await accountRef.get()).exists, false);
  await auth.deleteUsers([uid, newcomer]);
  const users = await auth.getUsers([{ uid }, { uid: newcomer }]); assert.equal(users.users.length, 0);
  await firestore.terminate(); await deleteApp(firebase);
  console.info("EVENT_BROWSE_OWN_FIXTURES_AND_SDK_TEARDOWN_PASS");
});

test("actual Auth rejects missing, invalid and disabled identity before synthetic source", async () => {
  const beforeCalls = calls;
  for (const url of paths) {
    assert.equal((await app!.inject({ url })).statusCode, 401);
    assert.equal((await app!.inject({ url, headers: { authorization: "Bearer invalid" } })).statusCode, 401);
  }
  await auth.updateUser(uid, { disabled: true });
  try { for (const url of paths) assert.equal((await app!.inject({ url, headers: { authorization: `Bearer ${ownerToken}` } })).statusCode, 403); }
  finally { await auth.updateUser(uid, { disabled: false }); }
  assert.equal(calls, beforeCalls);
});

test("actual UID-to-Account read excludes incomplete owner even with forged owner header", async () => {
  const beforeCalls = calls;
  for (const url of paths) {
    const r = await app!.inject({ url, headers: { authorization: `Bearer ${newcomerToken}`, "x-owner-id": uid } });
    assert.equal(r.statusCode, 409); assert.equal(r.json().error.code, "ONBOARDING_REQUIRED"); assert.equal(r.headers["cache-control"], "no-store");
  }
  assert.equal(calls, beforeCalls);
});

test("actual completed Account permits both synthetic reads without consent expansion or persistence mutation", async () => {
  const beforeAccount = await accountRef.get(), beforeBinding = await binding.get(), beforeCalls = calls;
  const beforeCollections = (await firestore.listCollections()).map(c => c.id).sort();
  const responses = [];
  for (const url of paths) {
    const r = await app!.inject({ url, headers: { authorization: `Bearer ${ownerToken}` } }); responses.push(r);
    assert.equal(r.statusCode, 200); assert.equal(r.headers["cache-control"], "no-store");
  }
  assert.deepEqual(responses[0]!.json(), { asOf, scope: "ticketmaster_sg_first_batch_v1", items: [{ browseId: item.browseId, title: item.title, startAt: item.startAt }] });
  assert.deepEqual(responses[1]!.json(), item); assert.equal(calls - beforeCalls, 2);
  const afterAccount = await accountRef.get(), afterBinding = await binding.get();
  assert.deepEqual(afterAccount.data(), beforeAccount.data()); assert.ok(afterAccount.updateTime!.isEqual(beforeAccount.updateTime!));
  assert.deepEqual(afterBinding.data(), beforeBinding.data()); assert.ok(afterBinding.updateTime!.isEqual(beforeBinding.updateTime!));
  assert.deepEqual((await firestore.listCollections()).map(c => c.id).sort(), beforeCollections);
});

test("current missing/corrupt Account fails closed on actual Firestore reread", async () => {
  const beforeCalls = calls;
  try {
    await accountRef.set({ ...account, username: "INVALID" });
    assert.equal((await app!.inject({ url: paths[0]!, headers: { authorization: `Bearer ${ownerToken}` } })).statusCode, 503);
    await accountRef.delete();
    assert.equal((await app!.inject({ url: paths[1]!, headers: { authorization: `Bearer ${ownerToken}` } })).statusCode, 503);
    assert.equal(calls, beforeCalls);
  } finally { await accountRef.set(account); }
});

test("actual authority plus source failure yields sanitized no-store 503, not fabricated empty result", async () => {
  failSource = true;
  try {
    const r = await app!.inject({ url: paths[0]!, headers: { authorization: `Bearer ${ownerToken}` } });
    assert.equal(r.statusCode, 503); assert.equal(r.json().error.code, "SERVICE_UNAVAILABLE"); assert.equal(r.headers["cache-control"], "no-store");
    assert.equal(r.body.includes("private-provider"), false);
  } finally { failSource = false; }
});
