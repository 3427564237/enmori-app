import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import {
  emptyRecommendationProfile,
  civilAge,
  parseRecommendationProfile,
} from "../src/recommendation-profile/domain/recommendation-profile.js";
import { FirestoreRecommendationProfiles } from "../src/recommendation-profile/infrastructure/firestore-recommendation-profile.js";
import { registerRecommendationProfiles } from "../src/recommendation-profile/transport/register-routes.js";
import { locateArea } from "../src/recommendation-profile/infrastructure/region-geometry.js";
import { rankEvents } from "../src/event-recommendations/domain/rank-events.js";
import { rankAuthorizedFriendCandidates } from "../src/friend-recommendations/domain/friend-ranking.js";
import { FirestoreFriendRecommendations } from "../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js";
import { firestoreSocialAuthority } from "../src/friends/infrastructure/social-authority.js";
import {
  friendPairKey,
  FirestoreFriendRepository,
} from "../src/friends/infrastructure/firestore-friend-repository.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed, clock } from "./support/my-friends-fixture.js";
import { areas } from "../src/recommendation-profile/domain/areas.js";
const tampines = areas.find((a) => a.name === "Tampines")!.code;
function setup() {
  const seed = myFriendsSeed(1);
  for (const id of ["owner", "target_1"]) {
    seed["accounts/" + id] = {
      ...seed["accounts/" + id],
      profileVisibility: "private",
      displayName: null,
      optionalProcessingConsent: "accepted",
      fieldPrivacy: {
        interests: "private",
        location: "private",
        participation: "private",
        mapSharedWithFriends: false,
      },
      recommendationProfile: {
        ...emptyRecommendationProfile,
        discoverable: true,
        matchRegion: true,
        matchAge: true,
        homeAreaCode: tampines,
        birthDate: "2000-02-29",
      },
    };
  }
  delete seed["friend_pairs/" + friendPairKey("owner", "target_1")];
  const store = new InMemoryFirestoreGateway(seed);
  return {
    store,
    profiles: new FirestoreRecommendationProfiles(store, clock),
    friends: new FirestoreFriendRecommendations(
      store,
      clock,
      firestoreSocialAuthority,
      undefined,
      true,
    ),
  };
}
test("private DOB calendar boundaries, leap day, future date and strict profile shape", () => {
  assert.equal(civilAge(null, "2026-10-28"), undefined);
  assert.equal(civilAge("2000-02-29", "2025-02-28"), 24);
  assert.equal(civilAge("2000-02-29", "2025-03-01"), 25);
  assert.equal(civilAge("2000-02-30", "2025-03-01"), undefined);
  assert.equal(civilAge("2026-10-29", "2026-10-28"), undefined);
  assert.equal(
    parseRecommendationProfile({
      ...emptyRecommendationProfile,
      homeAreaCode: "淡滨尼",
    }),
    undefined,
  );
  assert.equal(
    parseRecommendationProfile({
      ...emptyRecommendationProfile,
      discoverable: "true",
    }),
    undefined,
  );
  assert.equal(
    parseRecommendationProfile({
      ...emptyRecommendationProfile,
      coordinates: [1, 2],
    }),
    undefined,
  );
});
test("official area geometry identifies Pasir Ris and rejects outside Singapore", () => {
  assert.equal(
    locateArea(1.3759584, 103.9360385),
    areas.find((a) => a.name === "Pasir Ris")!.code,
  );
  assert.equal(locateArea(51.5, -0.1), undefined);
  assert.equal(locateArea(NaN, 103), undefined);
});
test("revision checked owner save preserves profile and rejects future birth, stale writes; deletion rereads", async () => {
  const { store, profiles } = setup(),
    before = store.read("accounts/owner")!;
  const { revision, ...values } = emptyRecommendationProfile;
  const saved = await profiles.save("owner", {
    ...values,
    birthDate: "2004-02-29",
    expectedRevision: 0,
  });
  assert.ok(saved.ok);
  assert.equal(saved.value.revision, 1);
  assert.equal(
    store.read("accounts/owner")!.profileVisibility,
    before.profileVisibility,
  );
  assert.equal(
    (await profiles.save("owner", { ...values, expectedRevision: 0 })).ok,
    false,
  );
  const bad = await profiles.save("owner", {
    ...values,
    birthDate: "2099-01-01",
    expectedRevision: 1,
  });
  assert.ok(!bad.ok);
  const deleted = await profiles.save("owner", {
    ...values,
    expectedRevision: 1,
  });
  assert.ok(deleted.ok);
  assert.equal(deleted.value.birthDate, null);
  assert.deepEqual(await profiles.read("owner"), deleted);
});
test("two opted-in private accounts match both ways, card excludes DOB; withdrawal and blocks remove access", async () => {
  const { store, profiles, friends } = setup();
  const forward = await friends.recommend("owner", "home"),
    reverse = await friends.recommend("target_1", "home");
  assert.ok(forward.ok && reverse.ok);
  assert.equal(forward.value.suggestions.length, 1);
  assert.equal(reverse.value.suggestions.length, 1);
  assert.equal(
    forward.value.suggestions[0]!.reason,
    "Same area · Similar age range",
  );
  const card = await profiles.card("owner", "member_target_1");
  assert.ok(card.ok);
  assert.deepEqual(Object.keys(card.value).sort(), ["displayName", "username"]);
  const manual = new FirestoreFriendRepository(store, clock);
  assert.ok((await manual.lookup("owner", "member_target_1", false)).ok);
  await store.runTransaction(async (tx) =>
    tx.set("accounts/target_1", {
      ...store.read("accounts/target_1"),
      recommendationProfile: { ...emptyRecommendationProfile },
    }),
  );
  assert.equal((await profiles.card("owner", "member_target_1")).ok, false);
  const withdrawn = await friends.recommend("owner", "home");
  assert.ok(withdrawn.ok);
  assert.deepEqual(withdrawn.value.suggestions, []);
});
test("age alone never makes a candidate, missing grants have zero influence, shared region does not double count", () => {
  const own = {
    authorizedInterestTagIds: [],
    authorizedInterestedEventIds: [],
    authorizedGoingEventIds: [],
    authorizedAge: 25,
  };
  assert.deepEqual(
    rankAuthorizedFriendCandidates(
      own,
      [{ ...own, candidateAccountId: "other" }],
      "v3",
    ),
    [],
  );
  const result = rankAuthorizedFriendCandidates(
    { ...own, authorizedRegion: "A", authorizedBroadRegion: "R" },
    [
      {
        ...own,
        candidateAccountId: "other",
        authorizedRegion: "A",
        authorizedBroadRegion: "R",
      },
    ],
    "v3",
  );
  assert.equal(result[0]!.score, 3);
  const events = rankEvents({
    formulaVersion: "event_recommendation_v3",
    asOf: 0n,
    activeSelectedInterestTagIds: ["music"],
    events: [
      {
        eventId: "a",
        startInstant: 1n,
        active: true,
        published: true,
        interestTagIds: ["music"],
        visibleFriendCount: 20,
        sameArea: true,
        sameRegion: true,
        targetAgeMatch: true,
      },
    ],
  });
  assert.equal(events[0]!.score, 17);
  assert.ok(!events[0]!.reasons!.some((r) => r.code === "same_region"));
});
test("HTTP profile rejects coercion/extra data and serializes owner-only no-store revisioned read", async () => {
  const { profiles } = setup(),
    app = Fastify({
      logger: false,
      ajv: { customOptions: { removeAdditional: false } },
    });
  await registerRecommendationProfiles(
    app,
    {
      verifyIdToken: async (token) =>
        token === "synthetic"
          ? { kind: "verified", principal: { firebaseUid: "owner" } }
          : { kind: "invalid" },
    },
    profiles,
  );
  try {
    const read = await app.inject({
      url: "/v1/me/recommendation-profile",
      headers: { authorization: "Bearer synthetic" },
    });
    assert.equal(read.statusCode, 200);
    assert.equal(read.headers["cache-control"], "no-store");
    const { revision, ...values } = emptyRecommendationProfile;
    for (const invalid of [
      { ...values, discoverable: "true", expectedRevision: 0 },
      { ...values, coordinates: [1, 2], expectedRevision: 0 },
    ])
      assert.equal(
        (
          await app.inject({
            method: "PUT",
            url: "/v1/me/recommendation-profile",
            headers: { authorization: "Bearer synthetic" },
            payload: invalid,
          })
        ).statusCode,
        400,
      );
    assert.equal(
      (await app.inject({ url: "/v1/me/recommendation-profile" })).statusCode,
      401,
    );
  } finally {
    await app.close();
  }
});

test('old clients never receive private full-profile candidates after opting into minimal discovery',async()=>{
 const {friends}=setup();
 const modern=await friends.recommend('owner','home');assert.ok(modern.ok);assert.equal(modern.value.suggestions.length,1);
 const legacy=await friends.recommend('owner','home',true);assert.ok(legacy.ok);assert.equal(legacy.value.suggestions.length,0);
});
