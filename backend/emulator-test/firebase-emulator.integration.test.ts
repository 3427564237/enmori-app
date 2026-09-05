import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { normalizeNote } from "../src/check-ins/domain/note.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { canonicalizeUsername } from "../src/onboarding/domain/username.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";

const environment = requireControlledEmulatorEnvironment(process.env);
const FIREBASE_UID = "controlled-r10-member-001";
const OTHER_FIREBASE_UID = "controlled-r10-member-002";
const AUTH_BINDING_ID =
  "uid_Y29udHJvbGxlZC1yMTAtbWVtYmVyLTAwMQ";
const PASSWORD = `${randomUUID()}Aa1!`;

let app: App;
let auth: Auth;
let firestore: Firestore;
let onboarding: FirestoreOnboardingRepository;
let checkIns: FirestoreCheckInRepository;

before(() => {
  app = initializeApp(
    { projectId: environment.projectId },
    `r10-emulator-${process.pid}`,
  );
  auth = getAuth(app);
  firestore = getFirestore(app);
  const gateway = new FirebaseAdminFirestoreGateway(firestore);
  onboarding = new FirestoreOnboardingRepository(gateway);
  checkIns = new FirestoreCheckInRepository(gateway);
});

beforeEach(async () => {
  await resetControlledEmulators();
});

after(async () => {
  await resetControlledEmulators();
  await deleteApp(app);
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
  return signInWithPassword(input.email);
}

async function signInWithPassword(email: string): Promise<string> {
  const response = await fetch(
    `http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  assert.equal(response.ok, true, "controlled Auth Emulator sign-in must succeed");
  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("idToken" in payload)
  ) {
    throw new Error("controlled Auth Emulator response omitted the ID token");
  }
  const token = payload.idToken;
  assert.equal(typeof token, "string");
  return token as string;
}

function createExpiredEmulatorToken(uid: string): string {
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

function onboardingCommand(input: {
  readonly firebaseUid?: string;
  readonly accountId?: string;
  readonly username?: string;
  readonly idempotencyKey?: string;
} = {}) {
  const username = canonicalizeUsername(input.username ?? "member_001");
  const key = validateIdempotencyKey(
    input.idempotencyKey ?? "ControlledR10OnboardingKey01",
  );
  assert.equal(username.ok, true);
  assert.equal(key.ok, true);
  if (!username.ok || !key.ok) throw new Error("controlled fixture invalid");
  return {
    firebaseUid: input.firebaseUid ?? FIREBASE_UID,
    canonicalUsername: username.value,
    optionalProcessingConsent: "accepted" as const,
    checkInVisibility: "public" as const,
    idempotencyKey: key.value,
    creation: {
      accountId: input.accountId ?? "controlled-account-001",
      onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T00:00:00.000Z",
    },
  };
}

function checkInCommand() {
  const note = normalizeNote("Controlled R10 persisted note");
  const key = validateIdempotencyKey("ControlledR10CheckInKey001");
  assert.equal(note.ok, true);
  assert.equal(key.ok, true);
  if (!note.ok || !key.ok) throw new Error("controlled fixture invalid");
  return {
    firebaseUid: FIREBASE_UID,
    note: note.value,
    idempotencyKey: key.value,
    creation: {
      checkInId: "controlled-check-in-001",
      createdAt: "2026-09-05T01:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T01:00:00.000Z",
    },
  };
}

test("test mode uses loopback-only Auth and Firestore demo resources", () => {
  assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
  assert.equal(environment.authHost, "127.0.0.1:9099");
  assert.equal(environment.firestoreHost, "127.0.0.1:8080");
});

test("fixture reset clears Auth and Firestore Emulator state", async () => {
  await auth.createUser({
    uid: FIREBASE_UID,
    email: "reset.member@example.invalid",
    password: PASSWORD,
  });
  await firestore.doc("accounts/reset-proof").create({ controlled: true });

  await resetControlledEmulators();

  await assert.rejects(auth.getUser(FIREBASE_UID), { code: "auth/user-not-found" });
  assert.equal((await firestore.doc("accounts/reset-proof").get()).exists, false);
});

test("Auth Emulator verifies ordinary and Admin-claimed principals without promoting claims", async () => {
  const verifier = new FirebaseIdentityVerifier(auth);
  const ordinaryToken = await createControlledUser({
    uid: FIREBASE_UID,
    email: "ordinary.member@example.invalid",
  });
  assert.deepEqual(await verifier.verifyIdToken(ordinaryToken), {
    kind: "verified",
    principal: { firebaseUid: FIREBASE_UID },
  });

  await auth.setCustomUserClaims(FIREBASE_UID, { admin: true });
  const adminClaimToken = await signInWithPassword(
    "ordinary.member@example.invalid",
  );
  assert.deepEqual(await verifier.verifyIdToken(adminClaimToken), {
    kind: "verified",
    principal: { firebaseUid: FIREBASE_UID },
  });
});

test("Auth Emulator fails closed for malformed, expired, disabled and revoked identity", async () => {
  const verifier = new FirebaseIdentityVerifier(auth);
  assert.deepEqual(await verifier.verifyIdToken(""), { kind: "invalid" });
  assert.deepEqual(await verifier.verifyIdToken("not-a-token"), {
    kind: "invalid",
  });
  assert.deepEqual(
    await verifier.verifyIdToken(createExpiredEmulatorToken(FIREBASE_UID)),
    { kind: "invalid" },
  );

  const disabledToken = await createControlledUser({
    uid: FIREBASE_UID,
    email: "disabled.member@example.invalid",
  });
  await auth.updateUser(FIREBASE_UID, { disabled: true });
  assert.deepEqual(await verifier.verifyIdToken(disabledToken), {
    kind: "forbidden",
  });

  const revokedToken = await createControlledUser({
    uid: OTHER_FIREBASE_UID,
    email: "revoked.member@example.invalid",
  });
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  await auth.revokeRefreshTokens(OTHER_FIREBASE_UID);
  assert.deepEqual(await verifier.verifyIdToken(revokedToken), {
    kind: "forbidden",
  });
});

test("Firestore Emulator atomically persists only the approved onboarding records", async () => {
  const result = await onboarding.complete(onboardingCommand());
  assert.equal(result.kind, "created");

  const binding = await firestore.doc(`auth_bindings/${AUTH_BINDING_ID}`).get();
  const account = await firestore.doc("accounts/controlled-account-001").get();
  const reservation = await firestore.doc("username_reservations/member_001").get();
  const idempotency = await firestore.collection("idempotency").get();

  assert.deepEqual(binding.data(), { accountId: "controlled-account-001" });
  assert.deepEqual(account.data(), {
    username: "member_001",
    optionalProcessingConsent: "accepted",
    checkInVisibility: "public",
    onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
  });
  assert.deepEqual(reservation.data(), { accountId: "controlled-account-001" });
  assert.equal(idempotency.size, 1);
  assert.deepEqual(Object.keys(idempotency.docs[0]?.data() ?? {}).sort(), [
    "committedResponseReference",
    "expiresAt",
    "keyDigest",
    "operation",
    "requestFingerprint",
    "scope",
  ]);
});

test("Firestore Emulator preserves atomic exact retry under concurrent onboarding", async () => {
  const results = await Promise.all([
    onboarding.complete(onboardingCommand()),
    onboarding.complete(onboardingCommand()),
  ]);
  assert.deepEqual(
    results.map((result) => result.kind).sort(),
    ["created", "replayed"],
  );
  assert.equal((await firestore.collection("accounts").get()).size, 1);
  assert.equal((await firestore.collection("auth_bindings").get()).size, 1);
  assert.equal((await firestore.collection("username_reservations").get()).size, 1);
  assert.equal((await firestore.collection("idempotency").get()).size, 1);
});

test("Firestore Emulator creates and privately reads the approved Check-in record", async () => {
  await onboarding.complete(onboardingCommand());
  await onboarding.complete(
    onboardingCommand({
      firebaseUid: OTHER_FIREBASE_UID,
      accountId: "controlled-account-002",
      username: "member_002",
      idempotencyKey: "ControlledR10OnboardingKey02",
    }),
  );

  const command = checkInCommand();
  const created = await checkIns.create(command);
  const replayed = await checkIns.create(command);
  const owned = await checkIns.findOwned({
    firebaseUid: FIREBASE_UID,
    checkInId: command.creation.checkInId,
  });
  const nonOwned = await checkIns.findOwned({
    firebaseUid: OTHER_FIREBASE_UID,
    checkInId: command.creation.checkInId,
  });
  const missing = await checkIns.findOwned({
    firebaseUid: OTHER_FIREBASE_UID,
    checkInId: "controlled-missing-check-in",
  });

  assert.equal(created.kind, "created");
  assert.equal(replayed.kind, "replayed");
  assert.equal(owned.kind, "found");
  assert.deepEqual(nonOwned, missing);
  assert.deepEqual(
    (await firestore.doc("check_ins/controlled-check-in-001").get()).data(),
    {
      ownerAccountId: "controlled-account-001",
      note: "Controlled R10 persisted note",
      createdAt: "2026-09-05T01:00:00.000Z",
    },
  );
  assert.equal((await firestore.collection("check_ins").get()).size, 1);
});
