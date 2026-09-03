import type { IdempotencyKey } from "../../shared/domain/idempotency-key.js";
import type { DependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type { NormalizedNote } from "../domain/note.js";
import type { CheckInProjection } from "../application/check-in-model.js";

export type CreateCheckInRepositoryResult =
  | { readonly kind: "created"; readonly checkIn: CheckInProjection }
  | { readonly kind: "replayed"; readonly checkIn: CheckInProjection }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "idempotency_conflict" }
  | DependencyUnavailable;

export type FindOwnedCheckInRepositoryResult =
  | { readonly kind: "found"; readonly checkIn: CheckInProjection }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "not_found_or_not_owned" }
  | DependencyUnavailable;

/**
 * R9 implementations resolve the internal AccountId, assign opaque identity
 * and server UTC time, and atomically commit the Check-in and 24-hour
 * idempotency result using the Application-supplied Clock/ID Port values. The
 * request fingerprint is based only on the normalized Note, never on generated
 * ID/time values. Missing and non-owned reads must return the same
 * not_found_or_not_owned result and must not expose ownerAccountId.
 */
export interface CheckInRepository {
  create(command: {
    readonly firebaseUid: string;
    readonly checkInId: string;
    readonly note: NormalizedNote;
    readonly createdAt: string;
    readonly idempotencyKey: IdempotencyKey;
    readonly idempotencyExpiresAt: string;
  }): Promise<CreateCheckInRepositoryResult>;

  findOwned(query: {
    readonly firebaseUid: string;
    readonly checkInId: string;
  }): Promise<FindOwnedCheckInRepositoryResult>;
}
