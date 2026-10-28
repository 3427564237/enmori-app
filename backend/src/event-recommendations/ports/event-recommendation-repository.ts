import type { EventPresentation } from "../../event-detail/domain/event-content.js";
import type { EventScoringInput } from "../domain/rank-events.js";
import type { DependencyUnavailable } from "../../shared/ports/dependency-failure.js";

export interface InterestMatchingProjection {
  readonly interestTagId: string;
  readonly displayName: string;
  readonly lifecycleState: "active" | "inactive";
}

export interface EventRecommendationSources {
  readonly formulaVersion?: "event_recommendation_v2" | "event_recommendation_v3";
  readonly selectedInterestTagIds: readonly string[];
  readonly interestTags: readonly InterestMatchingProjection[];
  readonly events: readonly {
    readonly scoring: EventScoringInput;
    readonly presentation: EventPresentation & {
      readonly title: string;
      readonly startAt: string;
      readonly endAt?: string;
    };
  }[];
}

export type EventRecommendationReadResult =
  | { readonly kind: "ready"; readonly sources: EventRecommendationSources }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "forbidden" }
  | DependencyUnavailable;

/**
 * Resolve the existing UID/account binding and valid completed account FIRST.
 * Only then construct a current, purpose-authorized Q17 projection of that
 * account's selected interests, current catalogue and Event records. Missing
 * own selection is empty, not another user's selection or dependency failure.
 * Validate source UTC instants and presentation consistency at the adapter
 * boundary; preserve precision as epoch nanoseconds. Catalogue projections
 * have unique identities and valid current Q12 display labels. Invalid records do not
 * become candidates. One Event identity has one consistent presentation.
 * Do not copy Check-ins, Category, location, popularity, credentials, vendor
 * objects or unrelated account fields. Normalize vendor failures here.
 * No write, cache, recommendation-history or initialization capability exists
 * on this read Port. Its types do not approve public or Firestore field names.
 */
export interface EventRecommendationRepository {
  readForRequester(query: {
    readonly firebaseUid: string;
    readonly asOf: string;
    readonly activityAreaCode?: string;
  }): Promise<EventRecommendationReadResult>;
}
