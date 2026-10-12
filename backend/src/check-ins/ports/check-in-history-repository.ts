import type { CheckInProjection } from "../application/check-in-model.js";

export interface HistoryCursor {
  readonly version: 1;
  readonly ownerAccountId: string;
  readonly date: string;
  readonly timeZone: string;
  readonly startUtc: string;
  readonly endUtc: string | null;
  readonly lastCreatedAt: string;
  readonly lastCheckInId: string;
  readonly expiresAt: string;
}

export interface CheckInHistoryQuery {
  readonly firebaseUid: string;
  readonly date: string;
  readonly timeZone: string;
  readonly startUtc: string;
  readonly endUtc: string | null;
  readonly empty: boolean;
  readonly cursor?: HistoryCursor;
  readonly pageSize: 20;
}

export type CheckInHistoryRepositoryResult =
  | { readonly kind: "page"; readonly accountId: string; readonly rows: readonly CheckInProjection[] }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "invalid_cursor" }
  | { readonly kind: "dependency_unavailable" };

export interface CheckInHistoryRepository {
  listForDate(query: CheckInHistoryQuery): Promise<CheckInHistoryRepositoryResult>;
}
