import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { FirestoreCheckInHistoryRepository } from "../src/check-ins/infrastructure/firestore-check-in-history-repository.js";
import { FirebaseAdminCheckInHistoryGateway } from "../src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { ListOwnCheckInsForDate } from "../src/check-ins/application/check-in-history.js";
import { createHistoryCursorCodec } from "../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { FirestoreInterestRepository } from "../src/interests/infrastructure/firestore-interest-repository.js";
import { normalizeNote } from "../src/check-ins/domain/note.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { canonicalizeUsername } from "../src/onboarding/domain/username.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { CompleteOnboarding } from "../src/onboarding/application/complete-onboarding.js";
import { GetOnboarding } from "../src/onboarding/application/get-onboarding.js";
import { CreateCheckIn } from "../src/check-ins/application/create-check-in.js";
import { GetCheckIn } from "../src/check-ins/application/get-check-in.js";
import { GetInterestTags } from "../src/interests/application/get-interest-tags.js";
import { GetOwnInterests } from "../src/interests/application/get-own-interests.js";
import { ReplaceOwnInterests } from "../src/interests/application/replace-own-interests.js";
import { SystemClock } from "../src/shared/infrastructure/system-clock.js";
import { CryptoOpaqueIdGenerator } from "../src/shared/infrastructure/crypto-opaque-id-generator.js";

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
let interests: FirestoreInterestRepository;

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
  interests = new FirestoreInterestRepository(gateway);
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
    currentInstant: "2026-09-05T00:00:00.000Z",
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
    currentInstant: "2026-09-05T01:00:00.000Z",
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
  assert.equal(process.env.METADATA_SERVER_DETECTION, "none");
  const controlledProfile = process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
  assert.notEqual(controlledProfile, undefined);
  for (const name of ["APPDATA", "HOME", "USERPROFILE", "XDG_CONFIG_HOME"]) {
    assert.equal(process.env[name], controlledProfile);
  }
  for (const name of [
    "CLOUDSDK_CONFIG",
    "ENMORI_R10_CREDENTIAL_PROBE",
    "FIREBASE_CONFIG",
    "FIREBASE_TOKEN",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ]) {
    assert.equal(process.env[name], undefined);
  }
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

test("S3-04 history audit 2026-10-08 covers the complete synthetic Check-in dataset", async () => {
  const dataset = [
    { id: "s3-04-history-audit-001", createdAt: "2026-10-07T23:59:59.000Z" },
    { id: "s3-04-history-audit-002", createdAt: "2026-10-08T00:00:00.001Z" },
    { id: "s3-04-history-audit-003", createdAt: "2026-10-08T12:34:56.789Z" },
    { id: "s3-04-history-audit-004", createdAt: "2026-10-08T23:59:59.999Z" },
    { id: "s3-04-history-audit-005", createdAt: "2026-10-09T00:00:00.000Z" },
  ] as const;
  for (const [index, item] of dataset.entries()) {
    await firestore.doc(`check_ins/${item.id}`).create({
      ownerAccountId: "s3-04-history-audit-account",
      note: `Synthetic audit fixture ${index + 1}`,
      createdAt: item.createdAt,
    });
  }

  const expectedCount = dataset.length;
  const counts = {
    total: 0,
    string: 0,
    canonicalFixedMillisecondUtc: 0,
    otherStringFormat: 0,
    nonString: 0,
    years: {} as Record<string, number>,
  };
  let pages = 0;
  let afterId: string | undefined;
  const pageSize = 2;
  while (true) {
    let query = firestore.collection("check_ins")
      .orderBy("__name__")
      .limit(pageSize);
    if (afterId !== undefined) query = query.startAfter(afterId);
    const page = await query.get();
    if (page.empty) break;
    pages += 1;
    for (const document of page.docs) {
      counts.total += 1;
      const value: unknown = document.get("createdAt");
      if (typeof value !== "string") {
        counts.nonString += 1;
        continue;
      }
      counts.string += 1;
      const canonical = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString() === value;
      if (canonical) {
        counts.canonicalFixedMillisecondUtc += 1;
        const year = value.slice(0, 4);
        counts.years[year] = (counts.years[year] ?? 0) + 1;
      } else {
        counts.otherStringFormat += 1;
      }
    }
    afterId = page.docs.at(-1)!.id;
  }

  assert.equal(counts.total, expectedCount);
  assert.equal(counts.string, expectedCount);
  assert.equal(counts.canonicalFixedMillisecondUtc, expectedCount);
  assert.equal(counts.otherStringFormat, 0);
  assert.equal(counts.nonString, 0);
  assert.equal(pages, 3);
  console.log(JSON.stringify({
    audit: "S3-04-history-createdAt-compatibility",
    dataset: "S3-04-history-audit-2026-10-08",
    scope: "demo-enmori-rmvp01a-r10 isolated Auth/Firestore Emulator only",
    counts,
    pages,
    pageSize,
    coverage: `${counts.total}/${expectedCount}`,
    passed: true,
  }));
});

test("History API pages the isolated synthetic owner data through Auth and Firestore Emulator", async () => {
  const token = await createControlledUser({ uid: FIREBASE_UID, email: "history.member@example.invalid" });
  await onboarding.complete(onboardingCommand());
  const syntheticRows = Array.from({ length: 21 }, (_, index) => ({
    id: `history-synthetic-${String(index + 1).padStart(3, "0")}`,
    createdAt: `2026-09-05T01:${String(index).padStart(2, "0")}:00.000Z`,
    note: `Synthetic history item ${index + 1}`,
  }));
  for (const row of syntheticRows) {
    await firestore.doc(`check_ins/${row.id}`).create({ ownerAccountId: "controlled-account-001", note: row.note, createdAt: row.createdAt, checkInVisibility: "private" });
  }

  const clock = new SystemClock();
  const ids = new CryptoOpaqueIdGenerator();
  const checkInRepository = new FirestoreCheckInRepository(new FirebaseAdminFirestoreGateway(firestore));
  const app = await buildApp({
    identityVerifier: new FirebaseIdentityVerifier(auth),
    completeOnboarding: new CompleteOnboarding(onboarding, clock, ids),
    getOnboarding: new GetOnboarding(onboarding),
    createCheckIn: new CreateCheckIn(checkInRepository, clock, ids),
    getCheckIn: new GetCheckIn(checkInRepository),
    getInterestTags: new GetInterestTags(interests),
    getOwnInterests: new GetOwnInterests(interests),
    replaceOwnInterests: new ReplaceOwnInterests(interests),
    listOwnCheckInsForDate: new ListOwnCheckInsForDate(
      new FirestoreCheckInHistoryRepository(new FirebaseAdminCheckInHistoryGateway(firestore)),
      createHistoryCursorCodec(),
      clock,
    ),
  });
  try {
    const first = await app.inject({ method: "GET", url: "/v1/me/check-ins?date=2026-09-05&timeZone=UTC", headers: { authorization: `Bearer ${token}` } });
    assert.equal(first.statusCode, 200);
    assert.equal(first.headers["cache-control"], "no-store");
    const firstBody = first.json() as { checkIns: Array<{ checkInId: string }>; nextCursor: string | null };
    assert.equal(firstBody.checkIns.length, 20);
    assert.notEqual(firstBody.nextCursor, null);
    const second = await app.inject({ method: "GET", url: `/v1/me/check-ins?date=2026-09-05&timeZone=UTC&cursor=${encodeURIComponent(firstBody.nextCursor!)}`, headers: { authorization: `Bearer ${token}` } });
    assert.equal(second.statusCode, 200);
    const secondBody = second.json() as { checkIns: Array<{ checkInId: string }>; nextCursor: string | null };
    assert.equal(secondBody.checkIns.length, 1);
    assert.equal(secondBody.nextCursor, null);
    assert.equal(new Set([...firstBody.checkIns, ...secondBody.checkIns].map(row => row.checkInId)).size, 21);
  } finally {
    await app.close();
  }
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
  const decoded = await auth.verifyIdToken(adminClaimToken, true);
  assert.equal(decoded.admin, true);
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
      checkInVisibility: "public",
    },
  );
  assert.equal((await firestore.collection("check_ins").get()).size, 1);
});

test("Firestore Emulator saves and later reads an account-isolated Interest selection", async () => {
  await onboarding.complete(onboardingCommand());
  await onboarding.complete(
    onboardingCommand({
      firebaseUid: OTHER_FIREBASE_UID,
      accountId: "controlled-account-002",
      username: "member_002",
      idempotencyKey: "ControlledR10OnboardingKey02",
    }),
  );
  await firestore.doc("interest_tags/tag-art").create({
    displayName: "Art",
    lifecycleState: "active",
    revision: 1,
  });
  await firestore.doc("interest_tags/tag-legacy").create({
    displayName: "Legacy",
    lifecycleState: "inactive",
    revision: 2,
  });

  const saved = await interests.replaceOwn({
    firebaseUid: FIREBASE_UID,
    interestTagIds: ["tag-art"],
    expectedRevision: 0,
  });
  const laterRead = await interests.getOwn(FIREBASE_UID);
  const otherRead = await interests.getOwn(OTHER_FIREBASE_UID);

  assert.equal(saved.kind, "saved");
  assert.deepEqual(laterRead, saved.kind === "saved"
    ? { kind: "found", value: saved.value }
    : undefined);
  assert.deepEqual(otherRead, {
    kind: "found",
    value: { interestTags: [], revision: 0 },
  });
  assert.deepEqual(
    (await firestore.doc("account_interests/controlled-account-001").get()).data(),
    { interestTagIds: ["tag-art"], revision: 1 },
  );
  assert.equal(
    (await firestore.doc("account_interests/controlled-account-002").get()).exists,
    false,
  );
});

test("Firestore Emulator prevents two stale-revision updates from overwriting", async () => {
  await onboarding.complete(onboardingCommand());
  for (const [id, displayName] of [["tag-art", "Art"], ["tag-books", "Books"]]) {
    await firestore.doc(`interest_tags/${id}`).create({
      displayName,
      lifecycleState: "active",
      revision: 1,
    });
  }
  const initial = await interests.replaceOwn({
    firebaseUid: FIREBASE_UID,
    interestTagIds: [],
    expectedRevision: 0,
  });
  assert.equal(initial.kind, "saved");

  const results = await Promise.all([
    interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: ["tag-art"],
      expectedRevision: 1,
    }),
    interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: ["tag-books"],
      expectedRevision: 1,
    }),
  ]);
  assert.deepEqual(
    results.map((result) => result.kind).sort(),
    ["revision_precondition_failed", "saved"],
  );
  const persisted = await interests.getOwn(FIREBASE_UID);
  assert.equal(persisted.kind, "found");
  if (persisted.kind !== "found") throw new Error("persisted selection missing");
  assert.equal(persisted.value.revision, 2);
  assert.equal(persisted.value.interestTags.length, 1);
});

test("Firestore Emulator enforces Inactive assignment against current persisted state", async () => {
  await onboarding.complete(onboardingCommand());
  await firestore.doc("interest_tags/tag-legacy").create({
    displayName: "Legacy",
    lifecycleState: "active",
    revision: 1,
  });
  assert.equal(
    (await interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: ["tag-legacy"],
      expectedRevision: 0,
    })).kind,
    "saved",
  );
  await firestore.doc("interest_tags/tag-legacy").update({
    lifecycleState: "inactive",
    revision: 2,
  });
  assert.equal(
    (await interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: ["tag-legacy"],
      expectedRevision: 1,
    })).kind,
    "saved",
  );
  assert.equal(
    (await interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: [],
      expectedRevision: 2,
    })).kind,
    "saved",
  );
  assert.equal(
    (await interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: ["tag-legacy"],
      expectedRevision: 3,
    })).kind,
    "selection_invalid",
  );
});

test("Firestore Emulator serializes a concurrent Tag deactivation and new assignment", async () => {
  await onboarding.complete(onboardingCommand());
  const tagReference = firestore.doc("interest_tags/tag-race");
  await tagReference.create({
    displayName: "Race",
    lifecycleState: "active",
    revision: 1,
  });

  const [replacement] = await Promise.all([
    interests.replaceOwn({
      firebaseUid: FIREBASE_UID,
      interestTagIds: ["tag-race"],
      expectedRevision: 0,
    }),
    firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(tagReference);
      assert.equal(snapshot.data()?.lifecycleState, "active");
      transaction.update(tagReference, {
        lifecycleState: "inactive",
        revision: 2,
      });
    }),
  ]);

  assert.equal(
    replacement.kind === "saved" || replacement.kind === "selection_invalid",
    true,
  );
  const persisted = await interests.getOwn(FIREBASE_UID);
  assert.equal(persisted.kind, "found");
  if (persisted.kind !== "found") throw new Error("persisted selection missing");
  if (replacement.kind === "saved") {
    assert.deepEqual(
      persisted.value.interestTags.map((tag) => [tag.interestTagId, tag.lifecycleState]),
      [["tag-race", "inactive"]],
    );
  } else {
    assert.deepEqual(persisted.value, { interestTags: [], revision: 0 });
  }
});
