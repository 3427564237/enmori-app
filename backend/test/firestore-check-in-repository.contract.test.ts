import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNote } from "../src/check-ins/domain/note.js";
import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { validateIdempotencyKey } from "../src/shared/domain/idempotency-key.js";
import {
  FailingFirestoreGateway,
  InMemoryFirestoreGateway,
} from "./support/in-memory-firestore-gateway.js";

const FIREBASE_UID = "controlled-firebase-uid-001";
const AUTH_BINDING_PATH =
  "auth_bindings/uid_Y29udHJvbGxlZC1maXJlYmFzZS11aWQtMDAx";

const ACCOUNT_SEED = {
  [AUTH_BINDING_PATH]: {
    accountId: "controlled-account-001",
  },
  "accounts/controlled-account-001": {
    username: "member_001",
    optionalProcessingConsent: "accepted",
    checkInVisibility: "public",
    onboardingCompletedAt: "2026-09-05T00:00:00.000Z",
  },
} as const;

function command(noteInput = "A controlled check-in") {
  const note = normalizeNote(noteInput);
  const key = validateIdempotencyKey("ControlledKey_0987654321");
  assert.equal(note.ok, true);
  assert.equal(key.ok, true);
  if (!note.ok || !key.ok) throw new Error("controlled fixture invalid");

  return {
    firebaseUid: FIREBASE_UID,
    note: note.value,
    idempotencyKey: key.value,
    currentInstant: "2026-09-05T02:00:00.000Z",
    creation: {
      checkInId: "controlled-check-in-001",
      createdAt: "2026-09-05T02:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T02:00:00.000Z",
    },
  };
}

test("check-in create atomically writes the approved record and idempotency result", async () => {
  const gateway = new InMemoryFirestoreGateway(ACCOUNT_SEED);
  const repository = new FirestoreCheckInRepository(gateway);
  const result = await repository.create(command());

  assert.deepEqual(result, {
    kind: "created",
    checkIn: {
      checkInId: "controlled-check-in-001",
      note: "A controlled check-in",
      createdAt: "2026-09-05T02:00:00.000Z",
      checkInVisibility: "public",
    },
  });
  assert.deepEqual(gateway.read("check_ins/controlled-check-in-001"), {
    ownerAccountId: "controlled-account-001",
    note: "A controlled check-in",
    createdAt: "2026-09-05T02:00:00.000Z",
    checkInVisibility: "public",
  });
  assert.equal(gateway.entries().length, 4);
  assert.equal(
    JSON.stringify(gateway.entries()).includes("ControlledKey_0987654321"),
    false,
  );
});

test("check-in exact retry returns the committed projection without a duplicate", async () => {
  const gateway = new InMemoryFirestoreGateway(ACCOUNT_SEED);
  const repository = new FirestoreCheckInRepository(gateway);
  await repository.create(command());

  const retry = command();
  const result = await repository.create({
    ...retry,
    creation: {
      checkInId: "controlled-check-in-002",
      createdAt: "2026-09-05T03:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T03:00:00.000Z",
    },
    currentInstant: "2026-09-05T03:00:00.000Z",
  });

  assert.equal(result.kind, "replayed");
  assert.equal(gateway.read("check_ins/controlled-check-in-002"), undefined);
  assert.equal(gateway.entries().length, 4);
});

test("check-in reused key with different Note creates nothing", async () => {
  const gateway = new InMemoryFirestoreGateway(ACCOUNT_SEED);
  const repository = new FirestoreCheckInRepository(gateway);
  await repository.create(command());

  const changed = command("Different controlled check-in");
  const result = await repository.create({
    ...changed,
    creation: {
      checkInId: "controlled-check-in-002",
      createdAt: "2026-09-05T03:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T03:00:00.000Z",
    },
    currentInstant: "2026-09-05T03:00:00.000Z",
  });

  assert.deepEqual(result, { kind: "idempotency_conflict" });
  assert.equal(gateway.read("check_ins/controlled-check-in-002"), undefined);
  assert.equal(gateway.entries().length, 4);
});

test("check-in exact retry is recoverable without a fresh creation candidate", async () => {
  const gateway = new InMemoryFirestoreGateway(ACCOUNT_SEED);
  const repository = new FirestoreCheckInRepository(gateway);
  const original = command();
  await repository.create(original);

  const { creation: _creation, ...retry } = original;
  retry.currentInstant = "2026-09-06T01:59:59.999Z";
  const result = await repository.create(retry);

  assert.equal(result.kind, "replayed");
  assert.equal(gateway.entries().length, 4);
});

test("check-in does not replay at the exact expiry without a fresh creation candidate", async () => {
  const gateway = new InMemoryFirestoreGateway(ACCOUNT_SEED);
  const repository = new FirestoreCheckInRepository(gateway);
  const original = command();
  await repository.create(original);

  const { creation: _creation, ...retry } = original;
  const result = await repository.create({
    ...retry,
    currentInstant: "2026-09-06T02:00:00.000Z",
  });

  assert.deepEqual(result, { kind: "dependency_unavailable" });
  assert.equal(gateway.entries().length, 4);
});

test("check-in does not replay outside the window or with unknown time", async () => {
  const gateway = new InMemoryFirestoreGateway(ACCOUNT_SEED);
  const repository = new FirestoreCheckInRepository(gateway);
  const original = command();
  await repository.create(original);

  const { creation: _creation, currentInstant: _instant, ...retry } = original;
  assert.deepEqual(
    await repository.create({
      ...retry,
      currentInstant: "2026-09-06T02:00:00.001Z",
    }),
    { kind: "dependency_unavailable" },
  );
  assert.deepEqual(await repository.create(retry), {
    kind: "dependency_unavailable",
  });
  assert.equal(gateway.entries().length, 4);
});

test("owned read returns one safe projection and hides non-owned records", async () => {
  const gateway = new InMemoryFirestoreGateway({
    ...ACCOUNT_SEED,
    "check_ins/owned-check-in": {
      ownerAccountId: "controlled-account-001",
      note: "Owned controlled data",
      createdAt: "2026-09-05T04:00:00.000Z",
    },
    "check_ins/other-check-in": {
      ownerAccountId: "other-account",
      note: "Other controlled data",
      createdAt: "2026-09-05T04:00:00.000Z",
    },
  });
  const repository = new FirestoreCheckInRepository(gateway);

  assert.deepEqual(
    await repository.findOwned({
      firebaseUid: FIREBASE_UID,
      checkInId: "owned-check-in",
    }),
    {
      kind: "found",
      checkIn: {
        checkInId: "owned-check-in",
        note: "Owned controlled data",
        createdAt: "2026-09-05T04:00:00.000Z",
      },
    },
  );
  const absent = await repository.findOwned({
    firebaseUid: FIREBASE_UID,
    checkInId: "absent-check-in",
  });
  const nonOwned = await repository.findOwned({
    firebaseUid: FIREBASE_UID,
    checkInId: "other-check-in",
  });
  assert.deepEqual(absent, { kind: "not_found_or_not_owned" });
  assert.deepEqual(nonOwned, absent);
});

test("check-in requires completed onboarding and contains provider failures", async () => {
  const missing = new FirestoreCheckInRepository(
    new InMemoryFirestoreGateway(),
  );
  assert.deepEqual(await missing.create(command()), {
    kind: "onboarding_required",
  });

  const failing = new FirestoreCheckInRepository(
    new FailingFirestoreGateway(),
  );
  assert.deepEqual(await failing.create(command()), {
    kind: "dependency_unavailable",
  });
});

test("owned read fails closed for an invalid stored Note", async () => {
  const repository = new FirestoreCheckInRepository(
    new InMemoryFirestoreGateway({
      ...ACCOUNT_SEED,
      "check_ins/controlled-check-in-001": {
        ownerAccountId: "controlled-account-001",
        note: "",
        createdAt: "2026-09-05T04:00:00.000Z",
      },
    }),
  );

  assert.deepEqual(
    await repository.findOwned({
      firebaseUid: FIREBASE_UID,
      checkInId: "controlled-check-in-001",
    }),
    { kind: "dependency_unavailable" },
  );
});

for (const visibility of ["private", "friends_only", "public"] as const) {
  test(`snapshot ${visibility} survives later Settings edits, read and replay`, async () => {
    const gateway = new InMemoryFirestoreGateway({ ...ACCOUNT_SEED,
      "accounts/controlled-account-001": { ...ACCOUNT_SEED["accounts/controlled-account-001"], checkInVisibility: visibility } });
    const repo = new FirestoreCheckInRepository(gateway);
    const created = await repo.create(command());
    assert.equal(created.kind, "created");
    await gateway.runTransaction(async tx => { tx.set("accounts/controlled-account-001", { ...ACCOUNT_SEED["accounts/controlled-account-001"], checkInVisibility: visibility === "private" ? "public" : "private" }); });
    const replay = await repo.create(command());
    assert.equal(replay.kind, "replayed");
    if (replay.kind === "replayed") assert.equal(replay.checkIn.checkInVisibility, visibility);
    const read = await repo.findOwned({ firebaseUid: FIREBASE_UID, checkInId: "controlled-check-in-001" });
    if (read.kind !== "found") assert.fail("owned read failed");
    assert.equal(read.checkIn.checkInVisibility, visibility);
  });
}
test("invalid present Check-in visibility fails closed without rewriting legacy data", async () => {
  for (const visibility of [null, "unknown", 0]) {
    const gateway = new InMemoryFirestoreGateway({ ...ACCOUNT_SEED, "check_ins/bad": { ownerAccountId: "controlled-account-001", note: "Legacy", createdAt: "2026-09-05T04:00:00.000Z", checkInVisibility: visibility } });
    const before = gateway.entries();
    assert.deepEqual(await new FirestoreCheckInRepository(gateway).findOwned({ firebaseUid: FIREBASE_UID, checkInId: "bad" }), { kind: "dependency_unavailable" });
    assert.deepEqual(gateway.entries(), before);
  }
});
