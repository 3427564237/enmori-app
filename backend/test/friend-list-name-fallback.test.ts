import assert from "node:assert/strict";
import test from "node:test";
import { FirestoreFriendRepository, friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { emptyRecommendationProfile } from "../src/recommendation-profile/domain/recommendation-profile.js";
import { ok, err } from "../src/shared/domain/result.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed, clock } from "./support/my-friends-fixture.js";

for (const visibility of ["public", "friends_only"] as const) {
  for (const nameState of ["null", "missing"] as const) {
    test(`${visibility} friend with ${nameState} name ${nameState === "null" ? "appears and is searchable without discovery opt-in" : "retains incomplete-Profile failure"}`, async () => {
      const seed = myFriendsSeed(1), target = { ...seed["accounts/target_1"]! };
      target.profileVisibility = visibility;
      if (nameState === "null") target.displayName = null;
      else delete target.displayName;
      seed["accounts/target_1"] = target;
      const store = new InMemoryFirestoreGateway(seed), repo = new FirestoreFriendRepository(store, clock);
      const before = store.entries();
      const expected = nameState === "missing" ? err("dependency_unavailable") : ok({ friends: [{ username: "member_target_1", displayName: "member_target_1" }], nextCursor: null });
      assert.deepEqual(await repo.listFriends("owner"), expected);
      assert.deepEqual(await repo.searchFriends("owner", { q: " MEMBER_TARGET " }), expected);
      assert.deepEqual(await repo.listFriends("owner"), expected, "fresh reads retain the fallback");
      assert.deepEqual(store.entries(), before, "reads must not fill stored names or alter friendship");
    });
  }
}

test("accepting a discoverable sender without a name shows both directions immediately", async () => {
  const seed = myFriendsSeed(1), pairPath = `friend_pairs/${friendPairKey("owner", "target_1")}`;
  delete seed[pairPath];
  for (const path of Object.keys(seed)) if (path.includes("/members/")) delete seed[path];
  seed["accounts/owner"] = { ...seed["accounts/owner"], displayName: null,
    recommendationProfile: { ...emptyRecommendationProfile, discoverable: true } };
  const store = new InMemoryFirestoreGateway(seed), repo = new FirestoreFriendRepository(store, clock);
  const sent = await repo.lookup("owner", "member_target_1", true);
  assert.equal(sent.ok && sent.value.relationshipState, "outgoing_request_pending");
  const inbox = await repo.inbox("target_1");
  assert(inbox.ok); assert.equal(inbox.value.requests.length, 1);
  assert.equal(inbox.value.requests[0]!.displayName, "member_owner");
  assert.deepEqual(await repo.act("target_1", inbox.value.requests[0]!.requestRef, "accept"), ok({ result: "accepted" }));
  assert.deepEqual(await repo.listFriends("target_1"), ok({ friends: [{ username: "member_owner", displayName: "member_owner" }], nextCursor: null }));
  assert.deepEqual(await repo.listFriends("owner"), ok({ friends: [{ username: "member_target_1", displayName: "Member target_1" }], nextCursor: null }));
  assert.equal(store.read("accounts/owner")!.displayName, null);
  assert.equal(Object.keys(store.read(pairPath)!.listRefs as object).length, 2);
});

test("fallback never bypasses private profiles, either block direction or target ineligibility", async () => {
  for (const protection of ["private", "owner-block", "target-block", "temporary-ineligible", "permanently-deleted"]) {
    const seed = myFriendsSeed(1), pairPath = `friend_pairs/${friendPairKey("owner", "target_1")}`;
    seed["accounts/target_1"] = { ...seed["accounts/target_1"], displayName: null,
      recommendationProfile: { ...emptyRecommendationProfile, discoverable: true } };
    if (protection === "private") seed["accounts/target_1"] = { ...seed["accounts/target_1"], profileVisibility: "private" };
    else if (protection.endsWith("-block")) seed[pairPath] = { ...seed[pairPath], blockedByAccountIds: [protection === "owner-block" ? "owner" : "target_1"] };
    else seed["friend_access/target_1"] = { eligibilityState: protection };
    const store = new InMemoryFirestoreGateway(seed), repo = new FirestoreFriendRepository(store, clock);
    const before = store.entries(), empty = ok({ friends: [], nextCursor: null });
    assert.deepEqual(await repo.listFriends("owner"), empty, protection);
    assert.deepEqual(await repo.searchFriends("owner", { q: "member_target" }), empty, protection);
    assert.deepEqual(store.entries(), before);
  }
});

test("a new actual name replaces the fallback; malformed names are not treated as unset", async () => {
  const seed = myFriendsSeed(1);
  seed["accounts/target_1"] = { ...seed["accounts/target_1"], displayName: null };
  const store = new InMemoryFirestoreGateway(seed), repo = new FirestoreFriendRepository(store, clock);
  const fallback = await repo.searchFriends("owner", { q: "member_target" });
  assert(fallback.ok); assert.equal(fallback.value.friends.length, 1);
  await store.runTransaction(async tx => tx.set("accounts/target_1", { ...store.read("accounts/target_1"), displayName: "Alice" }));
  assert.deepEqual(await repo.searchFriends("owner", { q: "member_target" }), ok({ friends: [], nextCursor: null }));
  assert.deepEqual(await repo.searchFriends("owner", { q: "alice" }), ok({ friends: [{ username: "member_target_1", displayName: "Alice" }], nextCursor: null }));
  await store.runTransaction(async tx => tx.set("accounts/target_1", { ...store.read("accounts/target_1"), displayName: 42 }));
  assert.deepEqual(await repo.listFriends("owner"), err("dependency_unavailable"));
  assert.deepEqual(await repo.searchFriends("owner", { q: "member_target" }), err("dependency_unavailable"));
});
