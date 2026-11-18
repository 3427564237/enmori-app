import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/bootstrap/build-app.js";
import { CreateCheckIn } from "../src/check-ins/application/create-check-in.js";
import { GetCheckIn } from "../src/check-ins/application/get-check-in.js";
import { GetInterestTags } from "../src/interests/application/get-interest-tags.js";
import { GetOwnInterests } from "../src/interests/application/get-own-interests.js";
import { ReplaceOwnInterests } from "../src/interests/application/replace-own-interests.js";
import { FirestoreInterestRepository } from "../src/interests/infrastructure/firestore-interest-repository.js";
import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { CompleteOnboarding } from "../src/onboarding/application/complete-onboarding.js";
import { GetOnboarding } from "../src/onboarding/application/get-onboarding.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { CryptoOpaqueIdGenerator } from "../src/shared/infrastructure/crypto-opaque-id-generator.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { SystemClock } from "../src/shared/infrastructure/system-clock.js";

const environment = requireControlledEmulatorEnvironment(process.env);
const PASSWORD = `${randomUUID()}Aa1!`;
const fixtureRunTag = randomBytes(6).toString("hex");

function fixtureUid(role: string): string {
  return `r13-${fixtureRunTag}-${role}`;
}

function fixtureEmail(role: string): string {
  return `r13.${role}.${fixtureRunTag}@example.invalid`;
}

function fixtureUsername(role: string): string {
  return `r13${fixtureRunTag}${role}`;
}

function freshIdempotencyKey(): string {
  return randomBytes(24).toString("base64url");
}

function expiredIdentityToken(uid: string): string {
  const now = Math.floor(Date.now() / 1_000);
  const encode = (value: Readonly<Record<string, unknown>>) =>
    Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    aud: environment.projectId,
    auth_time: now - 7_200,
    exp: now - 3_600,
    firebase: { identities: {}, sign_in_provider: "password" },
    iat: now - 7_200,
    iss: `https://securetoken.google.com/${environment.projectId}`,
    sub: uid,
    user_id: uid,
  })}.`;
}

type JsonObject = Record<string, unknown>;
type ApiResult = { readonly response: Response; readonly body: JsonObject };

let firebaseApp: App;
let auth: Auth;
let firestore: Firestore;
let app: FastifyInstance;
let baseUrl: string;
let dependencies: {
  readonly identityVerifier: FirebaseIdentityVerifier;
  readonly completeOnboarding: CompleteOnboarding;
  readonly getOnboarding: GetOnboarding;
  readonly createCheckIn: CreateCheckIn;
  readonly getCheckIn: GetCheckIn;
  readonly getInterestTags: GetInterestTags;
  readonly getOwnInterests: GetOwnInterests;
  readonly replaceOwnInterests: ReplaceOwnInterests;
};

before(async () => {
  firebaseApp = initializeApp(
    { projectId: environment.projectId },
    `r13-emulator-${process.pid}`,
  );
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  const gateway = new FirebaseAdminFirestoreGateway(firestore);
  const onboardingRepository = new FirestoreOnboardingRepository(gateway);
  const checkInRepository = new FirestoreCheckInRepository(gateway);
  const interestRepository = new FirestoreInterestRepository(gateway);
  const clock = new SystemClock();
  dependencies = {
    identityVerifier: new FirebaseIdentityVerifier(auth),
    completeOnboarding: new CompleteOnboarding(
      onboardingRepository,
      clock,
      new CryptoOpaqueIdGenerator(),
    ),
    getOnboarding: new GetOnboarding(onboardingRepository),
    createCheckIn: new CreateCheckIn(
      checkInRepository,
      clock,
      new CryptoOpaqueIdGenerator(),
    ),
    getCheckIn: new GetCheckIn(checkInRepository),
    getInterestTags: new GetInterestTags(interestRepository),
    getOwnInterests: new GetOwnInterests(interestRepository),
    replaceOwnInterests: new ReplaceOwnInterests(interestRepository),
  };
  app = await buildApp(dependencies);
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("R13 Fastify server did not expose a TCP address");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await resetControlledEmulators();
});

after(async () => {
  await resetControlledEmulators();
  await app.close();
  await deleteApp(firebaseApp);
});

async function resetControlledEmulators(): Promise<void> {
  const authResponse = await fetch(
    `http://${environment.authHost}/emulator/v1/projects/${environment.projectId}/accounts`,
    { method: "DELETE" },
  );
  assert.equal(authResponse.ok, true, "Auth Emulator reset must succeed");

  const firestoreResponse = await fetch(
    `http://${environment.firestoreHost}/emulator/v1/projects/${environment.projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  assert.equal(
    firestoreResponse.ok,
    true,
    "Firestore Emulator reset must succeed",
  );
}

async function createControlledUser(input: {
  readonly uid: string;
  readonly email: string;
}): Promise<string> {
  await auth.createUser({
    uid: input.uid,
    email: input.email,
    password: PASSWORD,
    emailVerified: true,
  });
  const response = await fetch(
    `http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  assert.equal(response.ok, true, "controlled Auth Emulator sign-in must succeed");
  const payload = (await response.json()) as JsonObject;
  assert.equal(typeof payload.idToken, "string");
  return payload.idToken as string;
}

async function requestJson(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = (await response.json()) as JsonObject;
  return { response, body };
}

function authHeaders(
  token: string,
  idempotencyKey?: string,
): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(idempotencyKey === undefined
      ? {}
      : { "idempotency-key": idempotencyKey }),
  };
}

function errorCode(body: JsonObject): string {
  const error = body.error;
  assert.equal(typeof error, "object");
  assert.notEqual(error, null);
  const code = (error as JsonObject).code;
  assert.equal(typeof code, "string");
  return code as string;
}

function errorMessage(body: JsonObject): string {
  const error = body.error;
  assert.equal(typeof error, "object");
  assert.notEqual(error, null);
  const message = (error as JsonObject).message;
  assert.equal(typeof message, "string");
  return message as string;
}

function accountFrom(body: JsonObject): JsonObject {
  const account = body.account;
  assert.equal(typeof account, "object");
  assert.notEqual(account, null);
  return account as JsonObject;
}

function checkInFrom(body: JsonObject): JsonObject {
  const checkIn = body.checkIn;
  assert.equal(typeof checkIn, "object");
  assert.notEqual(checkIn, null);
  return checkIn as JsonObject;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test("R13 accept create, exact retry, changed-Note conflict and later owner read", async () => {
  const onboardingKey = freshIdempotencyKey();
  const checkInKey = freshIdempotencyKey();
  const token = await createControlledUser({
    uid: fixtureUid("accept-user"),
    email: fixtureEmail("accept"),
  });

  const onboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, onboardingKey),
    body: JSON.stringify({ username: fixtureUsername("accept"), initialChoice: "accept" }),
  });
  assert.equal(onboarding.response.status, 201);
  const account = accountFrom(onboarding.body);
  assert.equal(account.optionalProcessingConsent, "accepted");
  assert.equal(account.checkInVisibility, "private");
  assert.equal("accountId" in account, false);
  assert.equal("firebaseUid" in account, false);

  const checkIn = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(token, checkInKey),
    body: JSON.stringify({ note: "Controlled R13 owner note" }),
  });
  assert.equal(checkIn.response.status, 201);
  const created = checkInFrom(checkIn.body);
  assert.equal(created.note, "Controlled R13 owner note");
  assert.equal(typeof created.checkInId, "string");
  assert.equal(typeof created.createdAt, "string");

  const retry = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(token, checkInKey),
    body: JSON.stringify({ note: "Controlled R13 owner note" }),
  });
  assert.equal(retry.response.status, 200);
  assert.deepEqual(checkInFrom(retry.body), created);

  const changedNote = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(token, checkInKey),
    body: JSON.stringify({ note: "Changed controlled R13 owner note" }),
  });
  assert.equal(changedNote.response.status, 409);
  assert.equal(errorCode(changedNote.body), "IDEMPOTENCY_CONFLICT");
  assert.equal((await firestore.collection("check_ins").get()).size, 1);

  const laterRead = await requestJson(
    `/v1/check-ins/${String(created.checkInId)}`,
    { headers: authHeaders(token) },
  );
  assert.equal(laterRead.response.status, 200);
  assert.deepEqual(checkInFrom(laterRead.body), created);

  const stored = await firestore
    .doc(`check_ins/${String(created.checkInId)}`)
    .get();
  assert.deepEqual(Object.keys(stored.data() ?? {}).sort(), [
    "checkInVisibility",
    "createdAt",
    "note",
    "ownerAccountId",
  ]);
});

test("R13 reject path preserves onboarding exact-retry and conflict semantics", async () => {
  const onboardingKey = freshIdempotencyKey();
  const token = await createControlledUser({
    uid: fixtureUid("reject-user"),
    email: fixtureEmail("reject"),
  });

  const rejected = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, onboardingKey),
    body: JSON.stringify({ username: fixtureUsername("reject"), initialChoice: "reject" }),
  });
  assert.equal(rejected.response.status, 201);
  const rejectedAccount = accountFrom(rejected.body);
  assert.equal(rejectedAccount.optionalProcessingConsent, "rejected");
  assert.equal(rejectedAccount.checkInVisibility, "private");

  const exactRetry = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, onboardingKey),
    body: JSON.stringify({ username: fixtureUsername("reject"), initialChoice: "reject" }),
  });
  assert.equal(exactRetry.response.status, 200);
  assert.deepEqual(accountFrom(exactRetry.body), rejectedAccount);

  const changedInput = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, onboardingKey),
    body: JSON.stringify({ username: fixtureUsername("rejectchanged"), initialChoice: "reject" }),
  });
  assert.equal(changedInput.response.status, 409);
  assert.equal(errorCode(changedInput.body), "IDEMPOTENCY_CONFLICT");
  assert.equal(
    (await firestore.doc(`username_reservations/${fixtureUsername("rejectchanged")}`).get()).exists,
    false,
  );
});

test("R13 identity, validation, incomplete onboarding and privacy-safe negative paths fail closed", async () => {
  const ownerOnboardingKey = freshIdempotencyKey();
  const otherOnboardingKey = freshIdempotencyKey();
  const ownerCheckInKey = freshIdempotencyKey();
  const invalidUsernameKey = freshIdempotencyKey();
  const incompleteCheckInKey = freshIdempotencyKey();
  const ownerToken = await createControlledUser({
    uid: fixtureUid("owner-user"),
    email: fixtureEmail("owner"),
  });
  const otherToken = await createControlledUser({
    uid: fixtureUid("other-user"),
    email: fixtureEmail("other"),
  });
  const incompleteToken = await createControlledUser({
    uid: fixtureUid("incomplete-user"),
    email: fixtureEmail("incomplete"),
  });

  const ownerOnboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(ownerToken, ownerOnboardingKey),
    body: JSON.stringify({ username: fixtureUsername("owner"), initialChoice: "accept" }),
  });
  assert.equal(ownerOnboarding.response.status, 201);
  const otherOnboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(otherToken, otherOnboardingKey),
    body: JSON.stringify({ username: fixtureUsername("other"), initialChoice: "accept" }),
  });
  assert.equal(otherOnboarding.response.status, 201);
  const ownerCheckIn = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(ownerToken, ownerCheckInKey),
    body: JSON.stringify({ note: "Private owner note" }),
  });
  assert.equal(ownerCheckIn.response.status, 201);
  const ownerCheckInId = String(checkInFrom(ownerCheckIn.body).checkInId);

  const nonOwner = await requestJson(`/v1/check-ins/${ownerCheckInId}`, {
    headers: authHeaders(otherToken),
  });
  const missing = await requestJson("/v1/check-ins/r13-missing-check-in", {
    headers: authHeaders(otherToken),
  });
  assert.equal(nonOwner.response.status, 404);
  assert.equal(missing.response.status, 404);
  assert.equal(errorCode(nonOwner.body), "CHECKIN_UNAVAILABLE");
  assert.equal(errorCode(missing.body), "CHECKIN_UNAVAILABLE");
  assert.equal(errorMessage(nonOwner.body), errorMessage(missing.body));
  assert.equal(JSON.stringify(nonOwner.body).includes("Private owner note"), false);
  assert.equal(JSON.stringify(missing.body).includes("Private owner note"), false);

  const missingIdentity = await requestJson("/v1/me/onboarding");
  assert.equal(missingIdentity.response.status, 401);
  assert.equal(errorCode(missingIdentity.body), "AUTH_REQUIRED");
  const malformedIdentity = await requestJson("/v1/me/onboarding", {
    headers: { authorization: "Bearer malformed-token" },
  });
  assert.equal(malformedIdentity.response.status, 401);
  assert.equal(errorCode(malformedIdentity.body), "AUTH_REQUIRED");

  const invalidUsername = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(otherToken, invalidUsernameKey),
    body: JSON.stringify({ username: "Invalid Username", initialChoice: "accept" }),
  });
  assert.equal(invalidUsername.response.status, 400);
  assert.equal(errorCode(invalidUsername.body), "USERNAME_INVALID");

  const incompleteCreate = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(incompleteToken, incompleteCheckInKey),
    body: JSON.stringify({ note: "Must not persist" }),
  });
  assert.equal(incompleteCreate.response.status, 409);
  assert.equal(errorCode(incompleteCreate.body), "ONBOARDING_REQUIRED");
});

test("X-01 expired identity fails closed on a protected operation", async () => {
  const response = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(
      expiredIdentityToken(fixtureUid("expired-identity")),
      freshIdempotencyKey(),
    ),
    body: JSON.stringify({
      username: fixtureUsername("expired"),
      initialChoice: "accept",
    }),
  });

  assert.equal(response.response.status, 401);
  assert.equal(errorCode(response.body), "AUTH_REQUIRED");
  assert.equal(errorMessage(response.body), "Your session has expired. Sign in again.");
  assert.deepEqual(await firestore.listCollections(), []);
});

test("S2-01 real Auth, Fastify and Firestore flow saves ten Interests and reads them later", async () => {
  const token = await createControlledUser({
    uid: fixtureUid("interest-user"),
    email: fixtureEmail("interest"),
  });
  const onboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, freshIdempotencyKey()),
    body: JSON.stringify({
      username: fixtureUsername("interest"),
      initialChoice: "accept",
    }),
  });
  assert.equal(onboarding.response.status, 201);

  const ids = Array.from({ length: 10 }, (_, index) => `tag-${index}`);
  await Promise.all(
    ids.map((id, index) =>
      firestore.doc(`interest_tags/${id}`).create({
        displayName: `Interest ${index}`,
        lifecycleState: "active",
        revision: 1,
      }),
    ),
  );
  await firestore.doc("interest_tags/tag-inactive").create({
    displayName: "Inactive",
    lifecycleState: "inactive",
    revision: 1,
  });

  const catalogue = await requestJson("/v1/interest-tags", {
    headers: authHeaders(token),
  });
  const empty = await requestJson("/v1/me/interests", {
    headers: authHeaders(token),
  });
  const saved = await requestJson("/v1/me/interests", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ interestTagIds: ids, expectedRevision: 0 }),
  });
  const laterRead = await requestJson("/v1/me/interests", {
    headers: authHeaders(token),
  });
  const stale = await requestJson("/v1/me/interests", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ interestTagIds: [], expectedRevision: 0 }),
  });
  const newInactive = await requestJson("/v1/me/interests", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      interestTagIds: ["tag-inactive"],
      expectedRevision: 1,
    }),
  });

  assert.equal(catalogue.response.status, 200);
  assert.equal((catalogue.body.interestTags as unknown[]).length, 10);
  assert.deepEqual(empty.body, {
    interests: { interestTags: [], revision: 0 },
  });
  assert.equal(saved.response.status, 200);
  assert.deepEqual(laterRead.body, saved.body);
  assert.equal(stale.response.status, 412);
  assert.equal(errorCode(stale.body), "INTEREST_REVISION_PRECONDITION_FAILED");
  assert.equal(newInactive.response.status, 422);
  assert.equal(errorCode(newInactive.body), "INTEREST_SELECTION_INVALID");
  assert.doesNotMatch(JSON.stringify(saved.body), /accountId|firebaseUid|owner/i);
});

test("R13-T12 cancellation aborts the client response and exact retry reconciles the authoritative result", async () => {
  const onboardingKey = freshIdempotencyKey();
  const checkInKey = freshIdempotencyKey();
  const token = await createControlledUser({
    uid: fixtureUid("cancel-user"),
    email: fixtureEmail("cancel"),
  });
  const onboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, onboardingKey),
    body: JSON.stringify({ username: fixtureUsername("cancel"), initialChoice: "accept" }),
  });
  assert.equal(onboarding.response.status, 201);

  const delayedApp = await buildApp({
    ...dependencies,
    createCheckIn: {
      execute: async (
        input: Parameters<CreateCheckIn["execute"]>[0],
      ) => {
        await delay(250);
        return dependencies.createCheckIn.execute(input);
      },
    },
  });
  await delayedApp.listen({ host: "127.0.0.1", port: 0 });
  const address = delayedApp.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("R13 delayed Fastify server did not expose a TCP address");
  }
  const controller = new AbortController();
  const cancelledRequest = fetch(`http://127.0.0.1:${address.port}/v1/check-ins`, {
    method: "POST",
    headers: authHeaders(token, checkInKey),
    body: JSON.stringify({ note: "Cancelled client request" }),
    signal: controller.signal,
  });
  await delay(30);
  controller.abort();
  await assert.rejects(
    cancelledRequest,
    (error: unknown) => error instanceof Error && error.name === "AbortError",
  );
  await delay(400);
  await delayedApp.close();

  const retry = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(token, checkInKey),
    body: JSON.stringify({ note: "Cancelled client request" }),
  });
  assert.ok(retry.response.status === 200 || retry.response.status === 201);
  const reconciled = checkInFrom(retry.body);
  const laterRead = await requestJson(
    `/v1/check-ins/${String(reconciled.checkInId)}`,
    { headers: authHeaders(token) },
  );
  assert.equal(laterRead.response.status, 200);
  assert.deepEqual(checkInFrom(laterRead.body), reconciled);
});
