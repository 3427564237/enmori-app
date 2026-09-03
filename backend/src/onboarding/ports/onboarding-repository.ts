import type { IdempotencyKey } from "../../shared/domain/idempotency-key.js";
import type { DependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type { CanonicalUsername } from "../domain/username.js";
import type { InitialChoice } from "../domain/initial-choice.js";
import type { AccountProjection } from "../application/onboarding-model.js";

export type CompleteOnboardingRepositoryResult =
  | { readonly kind: "created"; readonly account: AccountProjection }
  | { readonly kind: "replayed"; readonly account: AccountProjection }
  | { readonly kind: "username_unavailable" }
  | { readonly kind: "onboarding_conflict" }
  | { readonly kind: "idempotency_conflict" }
  | DependencyUnavailable;

export type GetOnboardingRepositoryResult =
  | { readonly kind: "required" }
  | { readonly kind: "completed"; readonly account: AccountProjection }
  | DependencyUnavailable;

/**
 * R9 implementations must atomically create the Auth Binding, Username
 * Reservation, Product Account and committed onboarding idempotency result.
 * The raw key must be SHA-256 digested, scoped by principal and operation, and
 * compared with a request fingerprint. The committed safe result is retained
 * for the approved 24-hour window; the raw key is never logged or used as a
 * storage path.
 */
export interface OnboardingRepository {
  complete(command: {
    readonly firebaseUid: string;
    readonly canonicalUsername: CanonicalUsername;
    readonly initialChoice: InitialChoice;
    readonly idempotencyKey: IdempotencyKey;
  }): Promise<CompleteOnboardingRepositoryResult>;

  getStatus(firebaseUid: string): Promise<GetOnboardingRepositoryResult>;
}
