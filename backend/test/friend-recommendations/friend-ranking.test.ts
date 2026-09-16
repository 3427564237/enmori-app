import assert from "node:assert/strict";
import test from "node:test";
import {
  FRIEND_RECOMMENDATION_FORMULA_VERSION,
  rankAuthorizedFriendCandidates,
  rankAuthorizedFriendHomeTop2,
  type AuthorizedFriendRankingCandidateProjection,
  type AuthorizedFriendRankingProjection,
} from "../../src/friend-recommendations/domain/friend-ranking.js";

const requester: AuthorizedFriendRankingProjection = {
  authorizedInterestTagIds: ["interest_a", "interest_b", "interest_a"],
  authorizedInterestedEventIds: ["event_a", "event_shared_state"],
  authorizedGoingEventIds: ["event_b", "event_shared_state"],
};

function candidate(
  candidateAccountId: string,
  overrides: Partial<AuthorizedFriendRankingCandidateProjection> = {},
): AuthorizedFriendRankingCandidateProjection {
  return {
    candidateAccountId,
    authorizedInterestTagIds: [],
    authorizedInterestedEventIds: [],
    authorizedGoingEventIds: [],
    ...overrides,
  };
}

test("computes the approved v1 score and deduplicates authorized references", () => {
  const result = rankAuthorizedFriendCandidates(requester, [
    candidate("candidate_a", {
      authorizedInterestTagIds: ["interest_a", "interest_a", "interest_b"],
      authorizedInterestedEventIds: ["event_a", "event_shared_state"],
      authorizedGoingEventIds: [
        "event_a",
        "event_b",
        "event_shared_state",
      ],
    }),
  ]);

  assert.deepEqual(result, [
    {
      candidateAccountId: "candidate_a",
      score: 7,
      factors: {
        shared_interest: { matchedCount: 2, points: 4 },
        common_event: { matchedCount: 3, points: 3 },
      },
      formulaVersion: FRIEND_RECOMMENDATION_FORMULA_VERSION,
    },
  ]);
});

test("applies every approved tie-break with canonical opaque-ID ordering", () => {
  const result = rankAuthorizedFriendCandidates(requester, [
    candidate("candidate_shared_one", {
      authorizedInterestTagIds: ["interest_a"],
      authorizedInterestedEventIds: ["event_a", "event_b"],
    }),
    candidate("candidate_Z", {
      authorizedInterestTagIds: ["interest_a"],
      authorizedInterestedEventIds: ["event_a"],
    }),
    candidate("candidate_A", {
      authorizedInterestTagIds: ["interest_a"],
      authorizedInterestedEventIds: ["event_a"],
    }),
    candidate("candidate_shared_two", {
      authorizedInterestTagIds: ["interest_a", "interest_b"],
    }),
  ]);

  assert.deepEqual(
    result.map((entry) => entry.candidateAccountId),
    [
      "candidate_shared_two",
      "candidate_shared_one",
      "candidate_A",
      "candidate_Z",
    ],
  );
});

test("selects Home Top 2 only after ranking the complete candidate set", () => {
  const result = rankAuthorizedFriendHomeTop2(requester, [
    candidate("candidate_low", {
      authorizedInterestedEventIds: ["event_a"],
    }),
    candidate("candidate_high", {
      authorizedInterestTagIds: ["interest_a", "interest_b"],
      authorizedInterestedEventIds: ["event_a"],
    }),
    candidate("candidate_middle", {
      authorizedInterestTagIds: ["interest_a"],
    }),
  ]);

  assert.deepEqual(
    result.map((entry) => entry.candidateAccountId),
    ["candidate_high", "candidate_middle"],
  );
});

test("returns an empty result for empty input and excludes zero-factor candidates", () => {
  assert.deepEqual(rankAuthorizedFriendCandidates(requester, []), []);
  assert.deepEqual(
    rankAuthorizedFriendCandidates(requester, [
      candidate("candidate_zero", {
        authorizedInterestTagIds: ["interest_other"],
        authorizedInterestedEventIds: ["event_other"],
      }),
    ]),
    [],
  );
});

test("fails closed when the candidate input repeats an opaque identity", () => {
  const duplicate = candidate("candidate_duplicate", {
    authorizedInterestTagIds: ["interest_a"],
  });

  assert.deepEqual(
    rankAuthorizedFriendCandidates(requester, [duplicate, duplicate]),
    [],
  );
});

test("prohibited contextual fields cannot influence or escape the ranking boundary", () => {
  const allowed = candidate("candidate_private", {
    authorizedInterestTagIds: ["interest_a"],
  });
  const inputWithProhibitedContext = {
    ...allowed,
    specialCare: true,
    approximateLocation: "private-place",
    mood: "private-mood",
    profile: { campus: "private-campus" },
  };

  const baseline = rankAuthorizedFriendCandidates(requester, [allowed]);
  const result = rankAuthorizedFriendCandidates(requester, [
    inputWithProhibitedContext,
  ]);

  assert.deepEqual(result, baseline);
  assert.deepEqual(Object.keys(result[0] ?? {}).sort(), [
    "candidateAccountId",
    "factors",
    "formulaVersion",
    "score",
  ]);
});

test("does not mutate caller-owned projections", () => {
  const mutableRequester = {
    authorizedInterestTagIds: ["interest_b", "interest_a"],
    authorizedInterestedEventIds: ["event_b", "event_a"],
    authorizedGoingEventIds: ["event_a"],
  };
  const mutableCandidates = [
    candidate("candidate_b", {
      authorizedInterestTagIds: ["interest_a"],
    }),
    candidate("candidate_a", {
      authorizedInterestTagIds: ["interest_b"],
    }),
  ];
  const before = structuredClone({ mutableRequester, mutableCandidates });

  rankAuthorizedFriendCandidates(mutableRequester, mutableCandidates);

  assert.deepEqual({ mutableRequester, mutableCandidates }, before);
});
