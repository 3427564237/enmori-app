import type { IdempotencyKey } from "../../shared/domain/idempotency-key.js";
import type { DependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type { CanonicalUsername } from "../domain/username.js";
import type {
  AccountProjection,
} from "../application/onboarding-model.js";
import type {
  CheckInVisibility,
  OptionalProcessingConsent,
} from "../domain/initial-choice.js";

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

export interface OnboardingCreationCandidate {
  readonly accountId: string;
  readonly onboardingCompletedAt: string;
  readonly idempotencyExpiresAt: string;
}

export interface CompleteOnboardingCommand {
  readonly firebaseUid: string;
  readonly canonicalUsername: CanonicalUsername;
  readonly optionalProcessingConsent: OptionalProcessingConsent;
  readonly checkInVisibility: CheckInVisibility;
  readonly idempotencyKey: IdempotencyKey;
  readonly currentInstant?: string;
  readonly creation?: OnboardingCreationCandidate;
}

/**
 * R9 implementations must atomically create the Auth Binding, Username
 * Reservation, Product Account and committed onboarding idempotency result.
 * The raw key must be SHA-256 digested, scoped by principal and operation, and
 * compared with a request fingerprint derived only from the approved member
 * input. Generated AccountId and time values are not part of that fingerprint.
 * Application supplies the already-derived consent/visibility projection and
 * an authoritative current instant independently from the optional creation
 * candidate. Infrastructure checks the committed result's 24-hour validity
 * before replay, so ID generation failure can still recover an active exact
 * retry while Clock failure or expiry fails closed. The raw key is never
 * logged or used as a storage path.
 */
export interface OnboardingRepository {
  complete(
    command: CompleteOnboardingCommand,
  ): Promise<CompleteOnboardingRepositoryResult>;

  getStatus(firebaseUid: string): Promise<GetOnboardingRepositoryResult>;
}
