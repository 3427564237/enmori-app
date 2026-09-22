import type {
  InterestTagSummary,
  OwnInterestsProjection,
} from "../application/interest-model.js";
import type { DependencyUnavailable } from "../../shared/ports/dependency-failure.js";

export type InterestReadResult<T> =
  | { readonly kind: "found"; readonly value: T }
  | { readonly kind: "onboarding_required" }
  | DependencyUnavailable;

export type ReplaceOwnInterestsResult =
  | { readonly kind: "saved"; readonly value: OwnInterestsProjection }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "selection_invalid" }
  | { readonly kind: "revision_precondition_failed" }
  | DependencyUnavailable;

export interface InterestRepository {
  listActive(firebaseUid: string): Promise<InterestReadResult<readonly InterestTagSummary[]>>;

  getOwn(firebaseUid: string): Promise<InterestReadResult<OwnInterestsProjection>>;

  replaceOwn(input: {
    readonly firebaseUid: string;
    readonly interestTagIds: readonly string[];
    readonly expectedRevision: number;
  }): Promise<ReplaceOwnInterestsResult>;
}
