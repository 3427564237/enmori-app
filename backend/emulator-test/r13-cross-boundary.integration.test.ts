import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/bootstrap/build-app.js";
import { CreateCheckIn } from "../src/check-ins/application/create-check-in.js";
import { GetCheckIn } from "../src/check-ins/application/get-check-in.js";
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

test("R13-T01/T07/T11 create, exact retry and later owner read across the boundary", async () => {
  const token = await createControlledUser({
    uid: "r13-accept-user",
    email: "r13.accept@example.invalid",
  });

  const onboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, "R13AcceptOnboardingKey0001"),
    body: JSON.stringify({ username: "r13_member_001", initialChoice: "accept" }),
  });
  assert.equal(onboarding.response.status, 201);
  const account = accountFrom(onboarding.body);
  assert.equal(account.optionalProcessingConsent, "accepted");
  assert.equal(account.checkInVisibility, "public");
  assert.equal("accountId" in account, false);
  assert.equal("firebaseUid" in account, false);

  const checkIn = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(token, "R13AcceptCheckInKey0001"),
    body: JSON.stringify({ note: "Controlled R13 owner note" }),
  });
  assert.equal(checkIn.response.status, 201);
  const created = checkInFrom(checkIn.body);
  assert.equal(created.note, "Controlled R13 owner note");
  assert.equal(typeof created.checkInId, "string");
  assert.equal(typeof created.createdAt, "string");

  const retry = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(token, "R13AcceptCheckInKey0001"),
    body: JSON.stringify({ note: "Controlled R13 owner note" }),
  });
  assert.equal(retry.response.status, 200);
  assert.deepEqual(checkInFrom(retry.body), created);

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
    "createdAt",
    "note",
    "ownerAccountId",
  ]);
});

test("R13-T02/T10 reject path preserves privacy and idempotency conflict semantics", async () => {
  const token = await createControlledUser({
    uid: "r13-reject-user",
    email: "r13.reject@example.invalid",
  });
  const key = "R13RejectOnboardingKey0001";

  const rejected = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, key),
    body: JSON.stringify({ username: "r13_member_002", initialChoice: "reject" }),
  });
  assert.equal(rejected.response.status, 201);
  const rejectedAccount = accountFrom(rejected.body);
  assert.equal(rejectedAccount.optionalProcessingConsent, "rejected");
  assert.equal(rejectedAccount.checkInVisibility, "private");

  const exactRetry = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, key),
    body: JSON.stringify({ username: "r13_member_002", initialChoice: "reject" }),
  });
  assert.equal(exactRetry.response.status, 200);
  assert.deepEqual(accountFrom(exactRetry.body), rejectedAccount);

  const changedInput = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, key),
    body: JSON.stringify({ username: "r13_member_003", initialChoice: "reject" }),
  });
  assert.equal(changedInput.response.status, 409);
  assert.equal(errorCode(changedInput.body), "IDEMPOTENCY_CONFLICT");
  assert.equal(
    (await firestore.doc("username_reservations/r13_member_003").get()).exists,
    false,
  );
});

test("R13 identity, incomplete onboarding and privacy-safe negative paths fail closed", async () => {
  const ownerToken = await createControlledUser({
    uid: "r13-owner-user",
    email: "r13.owner@example.invalid",
  });
  const otherToken = await createControlledUser({
    uid: "r13-other-user",
    email: "r13.other@example.invalid",
  });
  const incompleteToken = await createControlledUser({
    uid: "r13-incomplete-user",
    email: "r13.incomplete@example.invalid",
  });

  const ownerOnboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(ownerToken, "R13OwnerOnboardingKey0001"),
    body: JSON.stringify({ username: "r13_owner_001", initialChoice: "accept" }),
  });
  assert.equal(ownerOnboarding.response.status, 201);
  const ownerCheckIn = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(ownerToken, "R13OwnerCheckInKey0001"),
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
    headers: authHeaders(otherToken, "R13InvalidUsernameKey0001"),
    body: JSON.stringify({ username: "Invalid Username", initialChoice: "accept" }),
  });
  assert.equal(invalidUsername.response.status, 400);
  assert.equal(errorCode(invalidUsername.body), "USERNAME_INVALID");

  const incompleteCreate = await requestJson("/v1/check-ins", {
    method: "POST",
    headers: authHeaders(incompleteToken, "R13IncompleteCheckInKey001"),
    body: JSON.stringify({ note: "Must not persist" }),
  });
  assert.equal(incompleteCreate.response.status, 403);
  assert.equal(errorCode(incompleteCreate.body), "ONBOARDING_REQUIRED");
});

test("R13-T12 cancellation aborts the client response and exact retry reconciles the authoritative result", async () => {
  const token = await createControlledUser({
    uid: "r13-cancel-user",
    email: "r13.cancel@example.invalid",
  });
  const onboarding = await requestJson("/v1/me/onboarding", {
    method: "PUT",
    headers: authHeaders(token, "R13CancelOnboardingKey0001"),
    body: JSON.stringify({ username: "r13_cancel_001", initialChoice: "accept" }),
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
    headers: authHeaders(token, "R13CancelCheckInKey0001"),
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
    headers: authHeaders(token, "R13CancelCheckInKey0001"),
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
