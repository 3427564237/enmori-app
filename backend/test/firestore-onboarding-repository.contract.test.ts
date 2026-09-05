import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeUsername } from "../src/onboarding/domain/username.js";
import { FirestoreOnboardingRepository } from "../src/onboarding/infrastructure/firestore-onboarding-repository.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";
import {
  FailingFirestoreGateway,
  InMemoryFirestoreGateway,
} from "./support/in-memory-firestore-gateway.js";

function command(overrides: Readonly<Record<string, unknown>> = {}) {
  const username = canonicalizeUsername("member_001");
  const key = validateIdempotencyKey("ControlledKey_1234567890");
  assert.equal(username.ok, true);
  assert.equal(key.ok, true);
  if (!username.ok || !key.ok) throw new Error("controlled fixture invalid");

  return {
    firebaseUid: "controlled-firebase-uid-001",
    accountId: "controlled-account-001",
    canonicalUsername: username.value,
    optionalProcessingConsent: "accepted" as const,
    checkInVisibility: "public" as const,
    onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
    idempotencyKey: key.value,
    idempotencyExpiresAt: "2026-09-06T00:00:00.000Z",
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
  assert.deepEqual(gateway.read("auth_bindings/controlled-firebase-uid-001"), {
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
      accountId: "controlled-account-002",
      onboardingCompletedAt: "2026-09-05T01:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T01:00:00.000Z",
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
      accountId: "controlled-account-002",
      optionalProcessingConsent: "rejected",
      checkInVisibility: "private",
      onboardingCompletedAt: "2026-09-05T01:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T01:00:00.000Z",
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
      command({ idempotencyExpiresAt: "2026-09-05T23:59:59.999Z" }),
    ),
    { kind: "dependency_unavailable" },
  );
  assert.equal(gateway.entries().length, 0);
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
    await missing.getStatus("controlled-firebase-uid-001"),
    { kind: "required" },
  );

  const completed = new FirestoreOnboardingRepository(
    new InMemoryFirestoreGateway({
      "auth_bindings/controlled-firebase-uid-001": {
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
    await completed.getStatus("controlled-firebase-uid-001"),
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
      "auth_bindings/controlled-firebase-uid-001": {
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
    await repository.getStatus("controlled-firebase-uid-001"),
    { kind: "dependency_unavailable" },
  );
});
