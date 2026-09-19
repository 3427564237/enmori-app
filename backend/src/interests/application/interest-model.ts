export type InterestLifecycleState = "active" | "inactive";

export interface InterestTagSummary {
  readonly interestTagId: string;
  readonly displayName: string;
}

export interface SelectedInterestTag extends InterestTagSummary {
  readonly lifecycleState: InterestLifecycleState;
}

export interface OwnInterestsProjection {
  readonly interestTags: readonly SelectedInterestTag[];
  readonly revision: number;
}
