import assert from "node:assert/strict";
import test from "node:test";
import { CreateCheckIn } from "../../src/check-ins/application/create-check-in.js";
import { GetCheckIn } from "../../src/check-ins/application/get-check-in.js";
import { err, ok } from "../../src/shared/domain/result.js";
import { dependencyUnavailable } from "../../src/shared/ports/dependency-failure.js";
import type {
  CheckInRepository,
  CreateCheckInRepositoryResult,
  FindOwnedCheckInRepositoryResult,
} from "../../src/check-ins/ports/check-in-repository.js";

const checkIn = {
  checkInId: "chk_01",
  note: "saved note",
  createdAt: "2026-09-03T03:20:00Z",
} as const;

const clock = {
  now: () => ok(new Date("2026-09-03T03:20:00Z")),
};
const checkInIds = {
  generate: () => ok("chk_01"),
};

class FakeCheckInRepository implements CheckInRepository {
  public createResult: CreateCheckInRepositoryResult = {
    kind: "created",
    checkIn,
  };
  public findResult: FindOwnedCheckInRepositoryResult = {
    kind: "found",
    checkIn,
  };
  public commands: unknown[] = [];

  public async create(
    command: Parameters<CheckInRepository["create"]>[0],
  ): Promise<CreateCheckInRepositoryResult> {
    this.commands.push(command);
    return this.createResult;
  }

  public async findOwned(): Promise<FindOwnedCheckInRepositoryResult> {
    return this.findResult;
  }
}

test("normalizes Note before the atomic create Port", async () => {
  const repository = new FakeCheckInRepository();
  const result = await new CreateCheckIn(
    repository,
    clock,
    checkInIds,
  ).execute({
    principal: { firebaseUid: "firebase-1" },
    note: "  saved note\n",
    idempotencyKey: "A".repeat(22),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(repository.commands, [
    {
      firebaseUid: "firebase-1",
      note: "saved note",
      idempotencyKey: "A".repeat(22),
      creation: {
        checkInId: "chk_01",
        createdAt: "2026-09-03T03:20:00.000Z",
        idempotencyExpiresAt: "2026-09-04T03:20:00.000Z",
      },
    },
  ]);
});

test("recovers an exact Check-in retry when new Clock/ID values are unavailable", async () => {
  for (const unavailable of ["clock", "id"] as const) {
    const repository = new FakeCheckInRepository();
    repository.createResult = { kind: "replayed", checkIn };
    const useCase = new CreateCheckIn(
      repository,
      unavailable === "clock"
        ? { now: () => err(dependencyUnavailable) }
        : clock,
      unavailable === "id"
        ? { generate: () => err(dependencyUnavailable) }
        : checkInIds,
    );

    const result = await useCase.execute({
      principal: { firebaseUid: "firebase-1" },
      note: "saved note",
      idempotencyKey: "A".repeat(22),
    });

    assert.deepEqual(result, {
      ok: true,
      value: { disposition: "replayed", checkIn },
    });
    assert.deepEqual(repository.commands, [
      {
        firebaseUid: "firebase-1",
        note: "saved note",
        idempotencyKey: "A".repeat(22),
      },
    ]);
  }
});

test("maps create outcomes without claiming success", async () => {
  const expected = {
    onboarding_required: "ONBOARDING_REQUIRED",
    idempotency_conflict: "IDEMPOTENCY_CONFLICT",
    dependency_unavailable: "SERVICE_UNAVAILABLE",
  } as const;
  for (const [kind, code] of Object.entries(expected)) {
    const repository = new FakeCheckInRepository();
    repository.createResult = { kind } as CreateCheckInRepositoryResult;
    const result = await new CreateCheckIn(
      repository,
      clock,
      checkInIds,
    ).execute({
      principal: { firebaseUid: "firebase-1" },
      note: "saved note",
      idempotencyKey: "A".repeat(22),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.failure.code, code);
  }
});

test("makes missing and non-owned reads indistinguishable", async () => {
  const repository = new FakeCheckInRepository();
  repository.findResult = { kind: "not_found_or_not_owned" };
  const result = await new GetCheckIn(repository).execute({
    principal: { firebaseUid: "firebase-2" },
    checkInId: "chk_01",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "CHECKIN_UNAVAILABLE");
});
