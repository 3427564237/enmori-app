import assert from "node:assert/strict";
import test from "node:test";
import { CompleteOnboarding } from "../../src/onboarding/application/complete-onboarding.js";
import { GetOnboarding } from "../../src/onboarding/application/get-onboarding.js";
import { ok } from "../../src/shared/domain/result.js";
import type {
  CompleteOnboardingRepositoryResult,
  GetOnboardingRepositoryResult,
  OnboardingRepository,
} from "../../src/onboarding/ports/onboarding-repository.js";

const account = {
  username: "alex_7",
  optionalProcessingConsent: "accepted",
  checkInVisibility: "public",
  onboardingCompletedAt: "2026-09-03T03:15:00Z",
} as const;

const clock = {
  now: () => ok(new Date("2026-09-03T03:15:00Z")),
};
const accountIds = {
  generate: () => ok("acct_01"),
};

class FakeOnboardingRepository implements OnboardingRepository {
  public completeResult: CompleteOnboardingRepositoryResult = {
    kind: "created",
    account,
  };
  public statusResult: GetOnboardingRepositoryResult = { kind: "required" };
  public commands: unknown[] = [];

  public async complete(
    command: Parameters<OnboardingRepository["complete"]>[0],
  ): Promise<CompleteOnboardingRepositoryResult> {
    this.commands.push(command);
    return this.completeResult;
  }

  public async getStatus(): Promise<GetOnboardingRepositoryResult> {
    return this.statusResult;
  }
}

test("canonicalizes and creates onboarding through the Port", async () => {
  const repository = new FakeOnboardingRepository();
  const result = await new CompleteOnboarding(
    repository,
    clock,
    accountIds,
  ).execute({
    principal: { firebaseUid: "firebase-1" },
    username: " ALEX_7 ",
    initialChoice: "accept",
    idempotencyKey: "A".repeat(22),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(repository.commands, [
    {
      firebaseUid: "firebase-1",
      accountId: "acct_01",
      canonicalUsername: "alex_7",
      optionalProcessingConsent: "accepted",
      checkInVisibility: "public",
      onboardingCompletedAt: "2026-09-03T03:15:00.000Z",
      idempotencyKey: "A".repeat(22),
      idempotencyExpiresAt: "2026-09-04T03:15:00.000Z",
    },
  ]);
});

test("does not call the repository for invalid input", async () => {
  const repository = new FakeOnboardingRepository();
  const result = await new CompleteOnboarding(
    repository,
    clock,
    accountIds,
  ).execute({
    principal: { firebaseUid: "firebase-1" },
    username: "invalid__name",
    initialChoice: "accept",
    idempotencyKey: "A".repeat(22),
  });
  assert.equal(result.ok, false);
  assert.equal(repository.commands.length, 0);
});

test("maps onboarding repository outcomes to stable failures", async () => {
  const expected = {
    username_unavailable: "USERNAME_UNAVAILABLE",
    onboarding_conflict: "ONBOARDING_CONFLICT",
    idempotency_conflict: "IDEMPOTENCY_CONFLICT",
    dependency_unavailable: "SERVICE_UNAVAILABLE",
  } as const;
  for (const [kind, code] of Object.entries(expected)) {
    const repository = new FakeOnboardingRepository();
    repository.completeResult = {
      kind,
    } as CompleteOnboardingRepositoryResult;
    const result = await new CompleteOnboarding(
      repository,
      clock,
      accountIds,
    ).execute({
      principal: { firebaseUid: "firebase-1" },
      username: "alex_7",
      initialChoice: "accept",
      idempotencyKey: "A".repeat(22),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.failure.code, code);
  }
});

test("returns required and completed onboarding status", async () => {
  const repository = new FakeOnboardingRepository();
  const useCase = new GetOnboarding(repository);
  assert.deepEqual(await useCase.execute({ firebaseUid: "firebase-1" }), {
    ok: true,
    value: { status: "required" },
  });
  repository.statusResult = { kind: "completed", account };
  assert.deepEqual(await useCase.execute({ firebaseUid: "firebase-1" }), {
    ok: true,
    value: { status: "completed", account },
  });
});
