import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeUsername } from "../src/onboarding/domain/username.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";
import {
  FailingFirestoreGateway,
  InMemoryFirestoreGateway,
} from "./support/in-memory-firestore-gateway.js";

const FIREBASE_UID = "controlled-firebase-uid-001";
const AUTH_BINDING_PATH =
  "auth_bindings/uid_Y29udHJvbGxlZC1maXJlYmFzZS11aWQtMDAx";

function command(overrides: Readonly<Record<string, unknown>> = {}) {
  const username = canonicalizeUsername("member_001");
  const key = validateIdempotencyKey("ControlledKey_1234567890");
  assert.equal(username.ok, true);
  assert.equal(key.ok, true);
  if (!username.ok || !key.ok) throw new Error("controlled fixture invalid");

  return {
    firebaseUid: FIREBASE_UID,
    canonicalUsername: username.value,
    optionalProcessingConsent: "accepted" as const,
    checkInVisibility: "public" as const,
    idempotencyKey: key.value,
    creation: {
      accountId: "controlled-account-001",
      onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T00:00:00.000Z",
    },
    ...overrides,
  };
}

test("onboarding atomically writes the four approved record groups", async () => {
  const gateway = new InMemoryFirestoreGateway();
  const repository = new FirestoreOnboardingRepository(gateway);
  const result = await repository.complete(command());

  assert.deepEqual(result, {
    kind: "created",
    account: {
      username: "member_001",
      optionalProcessingConsent: "accepted",
      checkInVisibility: "public",
      onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
    },
  });
  assert.deepEqual(gateway.read(AUTH_BINDING_PATH), {
    accountId: "controlled-account-001",
  });
  assert.deepEqual(gateway.read("username_reservations/member_001"), {
    accountId: "controlled-account-001",
  });
  assert.deepEqual(gateway.read("accounts/controlled-account-001"), result.account);
  assert.equal(gateway.entries().length, 4);

  const serialized = JSON.stringify(gateway.entries());
  assert.equal(serialized.includes("ControlledKey_1234567890"), false);
});

test("onboarding exact retry returns the original projection and ignores new generated values", async () => {
  const gateway = new InMemoryFirestoreGateway();
  const repository = new FirestoreOnboardingRepository(gateway);
  await repository.complete(command());

  const result = await repository.complete(
    command({
      creation: {
        accountId: "controlled-account-002",
        onboardingCompletedAt: "2026-09-05T01:00:00.000Z",
        idempotencyExpiresAt: "2026-09-06T01:00:00.000Z",
      },
    }),
  );

  assert.equal(result.kind, "replayed");
  assert.equal(gateway.read("accounts/controlled-account-002"), undefined);
  assert.equal(gateway.entries().length, 4);
});

test("onboarding reused key with different member input creates nothing", async () => {
  const gateway = new InMemoryFirestoreGateway();
  const repository = new FirestoreOnboardingRepository(gateway);
  await repository.complete(command());

  const result = await repository.complete(
    command({
      optionalProcessingConsent: "rejected",
      checkInVisibility: "private",
      creation: {
        accountId: "controlled-account-002",
        onboardingCompletedAt: "2026-09-05T01:00:00.000Z",
        idempotencyExpiresAt: "2026-09-06T01:00:00.000Z",
      },
    }),
  );

  assert.deepEqual(result, { kind: "idempotency_conflict" });
  assert.equal(gateway.read("accounts/controlled-account-002"), undefined);
  assert.equal(gateway.entries().length, 4);
});

test("onboarding username reservation conflict creates nothing", async () => {
  const gateway = new InMemoryFirestoreGateway({
    "username_reservations/member_001": { accountId: "existing-account" },
  });
  const repository = new FirestoreOnboardingRepository(gateway);

  assert.deepEqual(await repository.complete(command()), {
    kind: "username_unavailable",
  });
  assert.deepEqual(gateway.entries(), [
    ["username_reservations/member_001", { accountId: "existing-account" }],
  ]);
});

test("onboarding rejects a non-24-hour expiry without writing", async () => {
  const gateway = new InMemoryFirestoreGateway();
  const repository = new FirestoreOnboardingRepository(gateway);

  assert.deepEqual(
    await repository.complete(
      command({
        creation: {
          accountId: "controlled-account-001",
          onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
          idempotencyExpiresAt: "2026-09-05T23:59:59.999Z",
        },
      }),
    ),
    { kind: "dependency_unavailable" },
  );
  assert.equal(gateway.entries().length, 0);
});

test("onboarding exact retry is recoverable without a fresh creation candidate", async () => {
  const gateway = new InMemoryFirestoreGateway();
  const repository = new FirestoreOnboardingRepository(gateway);
  const original = command();
  await repository.complete(original);

  const { creation: _creation, ...retry } = original;
  const result = await repository.complete(retry);

  assert.equal(result.kind, "replayed");
  assert.equal(gateway.entries().length, 4);
});

test("onboarding contains Firestore failures at the stable port boundary", async () => {
  const repository = new FirestoreOnboardingRepository(
    new FailingFirestoreGateway(),
  );
  assert.deepEqual(await repository.complete(command()), {
    kind: "dependency_unavailable",
  });
});

test("onboarding status distinguishes missing and valid completed accounts", async () => {
  const missing = new FirestoreOnboardingRepository(
    new InMemoryFirestoreGateway(),
  );
  assert.deepEqual(
    await missing.getStatus(FIREBASE_UID),
    { kind: "required" },
  );

  const completed = new FirestoreOnboardingRepository(
    new InMemoryFirestoreGateway({
      [AUTH_BINDING_PATH]: {
        accountId: "controlled-account-001",
      },
      "accounts/controlled-account-001": {
        username: "member_001",
        optionalProcessingConsent: "rejected",
        checkInVisibility: "private",
        onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
      },
    }),
  );
  assert.deepEqual(
    await completed.getStatus(FIREBASE_UID),
    {
      kind: "completed",
      account: {
        username: "member_001",
        optionalProcessingConsent: "rejected",
        checkInVisibility: "private",
        onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
      },
    },
  );
});

test("onboarding status fails closed for a non-canonical stored Username", async () => {
  const repository = new FirestoreOnboardingRepository(
    new InMemoryFirestoreGateway({
      [AUTH_BINDING_PATH]: {
        accountId: "controlled-account-001",
      },
      "accounts/controlled-account-001": {
        username: "INVALID USERNAME",
        optionalProcessingConsent: "accepted",
        checkInVisibility: "public",
        onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
      },
    }),
  );

  assert.deepEqual(
    await repository.getStatus(FIREBASE_UID),
    { kind: "dependency_unavailable" },
  );
});

test("onboarding uses one encoded Auth Binding path for create and lookup", async () => {
  const firebaseUid = "firebase/user.__name__.用户";
  const expectedPath =
    "auth_bindings/uid_ZmlyZWJhc2UvdXNlci5fX25hbWVfXy7nlKjmiLc";
  const gateway = new InMemoryFirestoreGateway();
  const repository = new FirestoreOnboardingRepository(gateway);

  const created = await repository.complete(command({ firebaseUid }));
  const status = await repository.getStatus(firebaseUid);

  assert.equal(created.kind, "created");
  assert.equal(status.kind, "completed");
  assert.deepEqual(gateway.read(expectedPath), {
    accountId: "controlled-account-001",
  });
  assert.equal(
    gateway.entries().some(([path]) => path.includes(firebaseUid)),
    false,
  );
  const publicResults = JSON.stringify([created, status]);
  assert.equal(publicResults.includes(firebaseUid), false);
  assert.equal(
    publicResults.includes(expectedPath.slice("auth_bindings/".length)),
    false,
  );
});
