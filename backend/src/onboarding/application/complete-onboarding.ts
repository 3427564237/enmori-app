import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { createAuthoritativeValues } from "../../shared/application/authoritative-values.js";
import { validateIdempotencyKey } from "../../shared/domain/idempotency-key.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { OpaqueIdGenerator } from "../../shared/ports/opaque-id-generator.js";
import { deriveInitialChoice } from "../domain/initial-choice.js";
import { canonicalizeUsername } from "../domain/username.js";
import type { OnboardingRepository } from "../ports/onboarding-repository.js";
import type { AccountProjection } from "./onboarding-model.js";

export interface CompleteOnboardingOutput {
  readonly disposition: "created" | "replayed";
  readonly account: AccountProjection;
}

export class CompleteOnboarding {
  public constructor(
    private readonly repository: OnboardingRepository,
    private readonly clock: Clock,
    private readonly accountIdGenerator: OpaqueIdGenerator,
  ) {}

  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly username: string;
    readonly initialChoice: unknown;
    readonly idempotencyKey: string;
  }): Promise<Result<CompleteOnboardingOutput, AppFailure>> {
    const username = canonicalizeUsername(input.username);
    if (!username.ok) return username;

    const choice = deriveInitialChoice(input.initialChoice);
    if (!choice.ok) return choice;

    const key = validateIdempotencyKey(input.idempotencyKey);
    if (!key.ok) return key;

    const authoritative = createAuthoritativeValues(
      this.clock,
      this.accountIdGenerator,
    );
    if (!authoritative.ok) return authoritative;

    const result = await this.repository.complete({
      firebaseUid: input.principal.firebaseUid,
      accountId: authoritative.value.opaqueId,
      canonicalUsername: username.value,
      optionalProcessingConsent: choice.value.optionalProcessingConsent,
      checkInVisibility: choice.value.checkInVisibility,
      onboardingCompletedAt: authoritative.value.occurredAt,
      idempotencyKey: key.value,
      idempotencyExpiresAt: authoritative.value.idempotencyExpiresAt,
    });

    switch (result.kind) {
      case "created":
      case "replayed":
        return ok({
          disposition: result.kind,
          account: result.account,
        });
      case "username_unavailable":
        return err(appFailure("USERNAME_UNAVAILABLE"));
      case "onboarding_conflict":
        return err(appFailure("ONBOARDING_CONFLICT"));
      case "idempotency_conflict":
        return err(appFailure("IDEMPOTENCY_CONFLICT"));
      case "dependency_unavailable":
        return err(appFailure("SERVICE_UNAVAILABLE"));
    }
  }
}
