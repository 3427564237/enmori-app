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

export interface CheckInCreationCandidate {
  readonly checkInId: string;
  readonly createdAt: string;
  readonly idempotencyExpiresAt: string;
}

export interface CreateCheckInCommand {
  readonly firebaseUid: string;
  readonly note: NormalizedNote;
  readonly idempotencyKey: IdempotencyKey;
  readonly currentInstant?: string;
  readonly creation?: CheckInCreationCandidate;
}

/**
 * R9 implementations resolve the internal AccountId, assign opaque identity
 * and server UTC time, and atomically commit the Check-in and 24-hour
 * idempotency result using the Application-supplied Clock/ID Port values.
 * Infrastructure checks committed-result validity using the independently
 * supplied current instant before it requires the optional creation candidate.
 * ID failure can therefore recover an active exact retry, while Clock failure
 * or expiry fails closed. The request fingerprint is based only on the
 * normalized Note, never on generated ID/time values. Missing and non-owned
 * reads must return the same not_found_or_not_owned result and must not expose
 * ownerAccountId.
 */
export interface CheckInRepository {
  create(command: CreateCheckInCommand): Promise<CreateCheckInRepositoryResult>;

  findOwned(query: {
    readonly firebaseUid: string;
    readonly checkInId: string;
  }): Promise<FindOwnedCheckInRepositoryResult>;
}
