export const FRIEND_RECOMMENDATION_FORMULA_VERSION =
  "friend_recommendation_v1" as const;

/**
 * Trusted, request-local projection supplied after upstream authorization and
 * source validation. Interest IDs must already be valid/active. Event IDs must
 * already be authorized for this requester and purpose. These types do not
 * establish those facts and must never be populated directly from client data.
 */
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

interface CandidateFactors {
  readonly interests: ReadonlySet<string>;
  readonly events: ReadonlySet<string>;
}

function sameIds(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && intersectionSize(left, right) === left.size;
}

function uniqueCandidateFactors(
  candidates: readonly AuthorizedFriendRankingCandidateProjection[],
): ReadonlyMap<string, CandidateFactors | null> {
  const unique = new Map<string, CandidateFactors | null>();
  for (const candidate of candidates) {
    const id = candidate.candidateAccountId;
    const previous = unique.get(id);
    // A conflicting identity stays excluded, even if another copy follows it.
    if (previous === null) continue;

    const current: CandidateFactors = {
      interests: distinctIds(candidate.authorizedInterestTagIds),
      events: authorizedEventIds(candidate),
    };
    if (previous === undefined) {
      unique.set(id, current);
    } else if (!sameIds(previous.interests, current.interests) ||
      !sameIds(previous.events, current.events)) {
      // Do not synthesize a larger projection or trust an arbitrary first/last
      // record when upstream supplies inconsistent source data for one ID.
      unique.set(id, null);
    }
  }
  return unique;
}

/**
 * Ranks already-eligible, purpose-authorized projections only.
 *
 * Account eligibility, discoverability, self/friend/pending exclusions and data
 * reads remain upstream responsibilities. Repeated equivalent projections are
 * scored once. Conflicting projections for one identity fail closed. This is an
 * internal computation result, not a public response or persisted history.
 */
export function rankAuthorizedFriendCandidates(
  requester: AuthorizedFriendRankingProjection,
  candidates: readonly AuthorizedFriendRankingCandidateProjection[],
): readonly RankedFriendCandidate[] {
  const requesterInterests = distinctIds(requester.authorizedInterestTagIds);
  const requesterEvents = authorizedEventIds(requester);
  const ranked: RankedFriendCandidate[] = [];
  for (const [candidateAccountId, factors] of uniqueCandidateFactors(candidates)) {
    if (factors === null) continue;

    const sharedInterestCount = intersectionSize(
      requesterInterests,
      factors.interests,
    );
    const commonEventCount = intersectionSize(
      requesterEvents,
      factors.events,
    );

    if (sharedInterestCount === 0 && commonEventCount === 0) continue;

    const sharedInterestPoints = sharedInterestCount * 2;
    const commonEventPoints = commonEventCount;
    ranked.push({
      candidateAccountId,
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
