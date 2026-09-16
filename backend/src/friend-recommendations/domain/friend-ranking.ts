export const FRIEND_RECOMMENDATION_FORMULA_VERSION =
  "friend_recommendation_v1" as const;

export interface AuthorizedFriendRankingProjection {
  readonly authorizedInterestTagIds: readonly string[];
  readonly authorizedInterestedEventIds: readonly string[];
  readonly authorizedGoingEventIds: readonly string[];
}

export interface AuthorizedFriendRankingCandidateProjection
  extends AuthorizedFriendRankingProjection {
  readonly candidateAccountId: string;
}

export interface FriendRankingFactor {
  readonly matchedCount: number;
  readonly points: number;
}

export interface RankedFriendCandidate {
  readonly candidateAccountId: string;
  readonly score: number;
  readonly factors: {
    readonly shared_interest: FriendRankingFactor;
    readonly common_event: FriendRankingFactor;
  };
  readonly formulaVersion: typeof FRIEND_RECOMMENDATION_FORMULA_VERSION;
}

const HOME_RESULT_LIMIT = 2;

/** Case-sensitive and locale-independent opaque-identity comparison. */
function compareOpaqueId(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function distinctIds(ids: readonly string[]): ReadonlySet<string> {
  return new Set(ids);
}

function intersectionSize(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): number {
  let count = 0;
  for (const id of left) {
    if (right.has(id)) count += 1;
  }
  return count;
}

function authorizedEventIds(
  projection: AuthorizedFriendRankingProjection,
): ReadonlySet<string> {
  return new Set([
    ...projection.authorizedInterestedEventIds,
    ...projection.authorizedGoingEventIds,
  ]);
}

/**
 * Ranks already-eligible, purpose-authorized projections only.
 *
 * Account eligibility, discoverability, self/friend/pending exclusions and data
 * reads remain upstream responsibilities. Duplicate candidate identities fail
 * closed and do not enter the ranked result.
 */
export function rankAuthorizedFriendCandidates(
  requester: AuthorizedFriendRankingProjection,
  candidates: readonly AuthorizedFriendRankingCandidateProjection[],
): readonly RankedFriendCandidate[] {
  const requesterInterests = distinctIds(requester.authorizedInterestTagIds);
  const requesterEvents = authorizedEventIds(requester);
  const candidateIdentityCounts = new Map<string, number>();

  for (const candidate of candidates) {
    candidateIdentityCounts.set(
      candidate.candidateAccountId,
      (candidateIdentityCounts.get(candidate.candidateAccountId) ?? 0) + 1,
    );
  }

  const ranked: RankedFriendCandidate[] = [];
  for (const candidate of candidates) {
    if (candidateIdentityCounts.get(candidate.candidateAccountId) !== 1) {
      continue;
    }

    const candidateInterests = distinctIds(
      candidate.authorizedInterestTagIds,
    );
    const candidateEvents = authorizedEventIds(candidate);
    const sharedInterestCount = intersectionSize(
      requesterInterests,
      candidateInterests,
    );
    const commonEventCount = intersectionSize(
      requesterEvents,
      candidateEvents,
    );

    if (sharedInterestCount === 0 && commonEventCount === 0) continue;

    const sharedInterestPoints = sharedInterestCount * 2;
    const commonEventPoints = commonEventCount;
    ranked.push({
      candidateAccountId: candidate.candidateAccountId,
      score: sharedInterestPoints + commonEventPoints,
      factors: {
        shared_interest: {
          matchedCount: sharedInterestCount,
          points: sharedInterestPoints,
        },
        common_event: {
          matchedCount: commonEventCount,
          points: commonEventPoints,
        },
      },
      formulaVersion: FRIEND_RECOMMENDATION_FORMULA_VERSION,
    });
  }

  return ranked.sort(
    (left, right) =>
      right.score - left.score ||
      right.factors.shared_interest.matchedCount -
        left.factors.shared_interest.matchedCount ||
      right.factors.common_event.matchedCount -
        left.factors.common_event.matchedCount ||
      compareOpaqueId(left.candidateAccountId, right.candidateAccountId),
  );
}

/** Applies Home Top 2 only after the complete deterministic order exists. */
export function rankAuthorizedFriendHomeTop2(
  requester: AuthorizedFriendRankingProjection,
  candidates: readonly AuthorizedFriendRankingCandidateProjection[],
): readonly RankedFriendCandidate[] {
  return rankAuthorizedFriendCandidates(requester, candidates).slice(
    0,
    HOME_RESULT_LIMIT,
  );
}
