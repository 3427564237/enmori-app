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

test("breaks equal scores by shared interests, then equal factors by opaque ID", () => {
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

test("repeating an identical candidate projection preserves one ranked result", () => {
  const duplicate = candidate("candidate_duplicate", {
    authorizedInterestTagIds: ["interest_a"],
  });

  assert.deepEqual(
    rankAuthorizedFriendCandidates(requester, [duplicate, duplicate]),
    rankAuthorizedFriendCandidates(requester, [duplicate]),
  );
});

test("candidate deduplication compares sets rather than array order or Event state", () => {
  const original = candidate("candidate_a", {
    authorizedInterestTagIds: ["interest_a", "interest_b"],
    authorizedInterestedEventIds: ["event_a"],
    authorizedGoingEventIds: ["event_b"],
  });
  const equivalent = candidate("candidate_a", {
    authorizedInterestTagIds: ["interest_b", "interest_a", "interest_a"],
    authorizedInterestedEventIds: ["event_b", "event_a", "event_b"],
  });
  for (const inputs of [[original, equivalent], [equivalent, original]]) {
    assert.deepEqual(
      rankAuthorizedFriendCandidates(requester, inputs),
      rankAuthorizedFriendCandidates(requester, [original]),
    );
  }
});

test("conflicting projections for one identity cannot be merged or selected by arrival order", () => {
  const original = candidate("candidate_conflict", {
    authorizedInterestTagIds: ["interest_a"],
    authorizedInterestedEventIds: ["event_a"],
  });
  const unaffected = candidate("candidate_valid", {
    authorizedInterestTagIds: ["interest_b"],
  });
  const conflicts = [
    { ...original, authorizedInterestTagIds: ["interest_b"] },
    { ...original, authorizedInterestedEventIds: ["event_b"] },
    { ...original, authorizedInterestTagIds: ["interest_a", "interest_b"] },
    { ...original, authorizedInterestTagIds: [], authorizedInterestedEventIds: [] },
  ];
  for (const conflict of conflicts) {
    for (const inputs of [
      [original, conflict, original, unaffected],
      [conflict, original, unaffected, conflict],
    ]) {
      assert.deepEqual(
        rankAuthorizedFriendCandidates(requester, inputs),
        rankAuthorizedFriendCandidates(requester, [unaffected]),
      );
    }
  }
});

test("empty requester factors produce no fallback even with nonempty candidates", () => {
  const empty = candidate("unused_identity");
  const inputs = [candidate("candidate_a", requester)];
  assert.deepEqual(rankAuthorizedFriendCandidates(empty, inputs), []);
  assert.deepEqual(rankAuthorizedFriendHomeTop2(empty, inputs), []);
});

test("a single positive factor qualifies and Home can contain zero or one result", () => {
  for (const positive of [
    candidate("interest_only", { authorizedInterestTagIds: ["interest_a"] }),
    candidate("event_only", { authorizedGoingEventIds: ["event_a"] }),
  ]) {
    const result = rankAuthorizedFriendHomeTop2(requester, [candidate("zero"), positive]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.candidateAccountId, positive.candidateAccountId);
  }
  assert.deepEqual(rankAuthorizedFriendHomeTop2(requester, []), []);
});

test("all Interested/Going combinations count one common Event and expose no state", () => {
  const states = ["authorizedInterestedEventIds", "authorizedGoingEventIds"] as const;
  for (const requesterState of states) {
    for (const candidateState of states) {
      const left = { ...candidate("unused"), [requesterState]: ["event_a", "event_a"] };
      const right = { ...candidate("candidate_a"), [candidateState]: ["event_a"] };
      assert.deepEqual(rankAuthorizedFriendCandidates(left, [right]), [{
        candidateAccountId: "candidate_a",
        score: 1,
        factors: {
          shared_interest: { matchedCount: 0, points: 0 },
          common_event: { matchedCount: 1, points: 1 },
        },
        formulaVersion: "friend_recommendation_v1",
      }]);
    }
  }
});

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [[]];
  return items.flatMap((item, index) =>
    permutations(items.filter((_, other) => other !== index))
      .map((rest) => [item, ...rest]));
}

test("full order and Top 2 are invariant under candidate permutations and repeated calls", () => {
  const inputs = ["candidate_a", "candidate_Z", "candidate_A"].map((id) =>
    candidate(id, { authorizedInterestTagIds: ["interest_a"] }));
  const expected = ["candidate_A", "candidate_Z", "candidate_a"];
  for (const order of permutations(inputs)) {
    for (let run = 0; run < 2; run += 1) {
      assert.deepEqual(rankAuthorizedFriendCandidates(requester, order)
        .map((entry) => entry.candidateAccountId), expected);
      assert.deepEqual(rankAuthorizedFriendHomeTop2(requester, order)
        .map((entry) => entry.candidateAccountId), expected.slice(0, 2));
    }
  }
});

test("removing an authorized reference affects a fresh computation without cached factors", () => {
  const before = rankAuthorizedFriendCandidates(requester, [candidate("candidate_a", requester)]);
  assert.equal(before[0]?.score, 7);
  assert.deepEqual(rankAuthorizedFriendCandidates(requester, [candidate("candidate_a")]), []);
  assert.equal(before[0]?.score, 7);
});

test("prohibited data is not read from either input, even when it is available", () => {
  const left = { ...requester };
  const right = candidate("candidate_a", requester);
  for (const input of [left, right]) {
    for (const key of [
      "note", "mood", "activity", "weather", "approximateLocation", "footprint",
      "calendar", "persona", "aiConversations", "demographics", "specialCare",
      "profile", "mutualFriendCount",
    ]) {
      Object.defineProperty(input, key, {
        enumerable: true,
        get() { throw new Error("Prohibited input was read"); },
      });
    }
  }
  assert.equal(rankAuthorizedFriendCandidates(left, [right])[0]?.score, 7);
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
