import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed, clock } from "./support/my-friends-fixture.js";
import { FirestoreFriendIgnoreRepository, cleanupDeletedAccountPreferences } from "../src/friend-recommendations/infrastructure/firestore-friend-ignore-repository.js";
import { preferenceCollection, preferenceKey } from "../src/friend-recommendations/infrastructure/recommendation-preference.js";
import { FirestoreFriendRecommendations } from "../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js";
import { FirestoreFriendRepository, friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { registerFriendIgnoreRoutes } from "../src/friend-recommendations/transport/friend-ignore-routes.js";
import type { Result } from "../src/shared/domain/result.js";
function value<T>(result: Result<T, unknown>): T {
  if (!result.ok) assert.fail(JSON.stringify(result));
  return result.value;
}
const name = "member_target_1";
function fixture() {
  const seed = myFriendsSeed(3);
  for (const id of ["owner", "target_1", "target_2", "target_3"]) {
    seed[`accounts/${id}`] = { ...seed[`accounts/${id}`], optionalProcessingConsent: "accepted", profileVisibility: "public",
      fieldPrivacy: { interests: "public", location: "private", participation: "private", mapSharedWithFriends: false } };
    seed[`account_interests/${id}`] = { interestTagIds: ["music"], revision: 1 };
    if (id !== "owner") delete seed[`friend_pairs/${friendPairKey("owner", id)}`];
  }
  seed["interest_tags/music"] = { displayName: "Music", lifecycleState: "active", revision: 1 };
  const store = new InMemoryFirestoreGateway(seed), repo = new FirestoreFriendIgnoreRepository(store, clock);
  return { store, repo, recommend: new FirestoreFriendRecommendations(store, clock) };
}
test("ignore persists independently of repository/session and filters before Home Top 2", async () => {
  const { store, repo, recommend } = fixture();
  const card = value(await recommend.recommend("owner", "home")).suggestions[0]!;
  const saved = value(await repo.set("owner", card.username, true, card.ignoreVersion));
  assert.equal(saved.ignored, true);
  assert.equal(value(await new FirestoreFriendIgnoreRepository(store, clock).read("owner", name)).version, saved.version);
  assert.equal(value(await recommend.recommend("owner", "home")).suggestions.length, 2);
  assert.equal(value(await recommend.recommend("owner", "all")).suggestions.some(row => row.username === name), false);
  assert.deepEqual(value(await repo.list("owner")).people, [saved]);
  assert.deepEqual(value(await repo.list("target_1")).people, []);
});
test("manual restore and Undo use the same operation; reignore rejects an old Undo version", async () => {
  const { repo, recommend } = fixture();
  const original = value(await repo.read("owner", name));
  const ignored = value(await repo.set("owner", name, true, original.version));
  const restored = value(await repo.set("owner", name, false, ignored.version));
  assert.notEqual(restored.version, ignored.version);
  assert.equal(value(await recommend.recommend("owner", "all")).suggestions.some(row => row.username === name), true);
  const newer = value(await repo.set("owner", name, true, restored.version));
  const stale = await repo.set("owner", name, false, ignored.version);
  assert.equal(!stale.ok && stale.failure.code, "FRIEND_IGNORE_PRECONDITION_FAILED");
  assert.deepEqual(value(await repo.read("owner", name)), newer);
});
test("unknown committed result is authoritatively read; replay cannot clobber the decision", async () => {
  const { store, repo } = fixture(), initial = value(await repo.read("owner", name));
  let loseResponse = true;
  const uncertain = new FirestoreFriendIgnoreRepository({ runTransaction: async work => {
    const result = await store.runTransaction(work);
    if (loseResponse) { loseResponse = false; throw new Error("lost after commit"); }
    return result;
  } }, clock);
  assert.equal((await uncertain.set("owner", name, true, initial.version)).ok, false);
  const read = value(await repo.read("owner", name)); assert.equal(read.ignored, true);
  assert.equal((await repo.set("owner", name, false, initial.version)).ok, false);
  assert.equal(value(await repo.set("owner", name, false, read.version)).ignored, false);
});
test("ignore does not alter exact Username lookup or friend requests", async () => {
  const { store, repo } = fixture();
  await repo.set("owner", name, true, value(await repo.read("owner", name)).version);
  const friends = new FirestoreFriendRepository(store, clock);
  assert.equal((await friends.lookup("owner", name, false)).ok, true);
  assert.equal((await friends.lookup("owner", name, true)).ok, true);
  assert.equal(value(await friends.inbox("target_1")).requests.length, 1);
  // Now temporarily ineligible for recommendations; preference remains, no stale identity in list.
  assert.deepEqual(value(await repo.list("owner")).people, []);
  assert.equal(store.read(`${preferenceCollection}/${preferenceKey("owner", "target_1")}`)?.ignored, true);
});
for (const reason of ["private", "blocked", "ineligible", "deleted", "consent", "reservation"] as const) {
  test(`current ${reason} blocks state/restore and management identity without erasing ignore`, async () => {
    const { store, repo } = fixture();
    const ignored = value(await repo.set("owner", name, true, value(await repo.read("owner", name)).version));
    await store.runTransaction(async tx => {
      if (reason === "private") tx.set("accounts/target_1", { ...store.read("accounts/target_1"), profileVisibility: "private" });
      if (reason === "consent") tx.set("accounts/target_1", { ...store.read("accounts/target_1"), optionalProcessingConsent: "rejected" });
      if (reason === "deleted") tx.delete!("accounts/target_1");
      if (reason === "ineligible") tx.set("friend_access/target_1", { eligibilityState: "temporarily-unavailable" });
      if (reason === "reservation") tx.set(`username_reservations/${name}`, { accountId: "target_2" });
      if (reason === "blocked") tx.set(`friend_pairs/${friendPairKey("owner", "target_1")}`, {
        accountIds: ["owner", "target_1"], friendship: false, blockedByAccountIds: ["target_1"], pending: null,
      });
    });
    assert.deepEqual(value(await repo.list("owner")).people, []);
    assert.equal((await repo.read("owner", name)).ok, false);
    assert.equal((await repo.set("owner", name, false, ignored.version)).ok, false);
    assert.equal(store.read(`${preferenceCollection}/${preferenceKey("owner", "target_1")}`)?.ignored, true);
  });
}
test("owner identity and target identity versions cannot be transplanted, including reclaimed Username", async () => {
  const { store, repo } = fixture(), before = value(await repo.read("owner", name));
  assert.equal((await repo.set("target_2", name, true, before.version)).ok, false);
  await store.runTransaction(async tx => {
    tx.set("accounts/replacement", { ...store.read("accounts/target_1") });
    tx.set("friend_access/replacement", { eligibilityState: "eligible" });
    tx.set(`username_reservations/${name}`, { accountId: "replacement" });
    tx.delete!("accounts/target_1");
  });
  assert.equal((await repo.set("owner", name, true, before.version)).ok, false);
});
test("temporary privacy restoration re-exposes only freshly read identity; restored target may have no ranking match", async () => {
  const { store, repo, recommend } = fixture();
  await repo.set("owner", name, true, value(await repo.read("owner", name)).version);
  const account = store.read("accounts/target_1")!;
  await store.runTransaction(async tx => tx.set("accounts/target_1", { ...account, profileVisibility: "private" }));
  assert.deepEqual(value(await repo.list("owner")).people, []);
  await store.runTransaction(async tx => {
    tx.set("accounts/target_1", { ...account, displayName: "Current name" });
    tx.set("account_interests/target_1", { interestTagIds: [], revision: 2 });
  });
  const person = value(await repo.list("owner")).people[0]!;
  assert.equal(person.displayName, "Current name");
  await repo.set("owner", name, false, person.version);
  assert.equal(value(await recommend.recommend("owner", "all")).suggestions.some(row => row.username === name), false);
});
test("deletion seam removes both directions including restored tombstones, only after permanent tombstone", async () => {
  const { store, repo } = fixture();
  await repo.set("owner", name, true, value(await repo.read("owner", name)).version);
  const incoming = value(await repo.set("target_2", "member_owner", true, value(await repo.read("target_2", "member_owner")).version));
  await repo.set("target_2", "member_owner", false, incoming.version);
  await assert.rejects(cleanupDeletedAccountPreferences(store, "owner"));
  await store.runTransaction(async tx => tx.set("friend_access/owner", { eligibilityState: "permanently-deleted" }));
  assert.deepEqual(await cleanupDeletedAccountPreferences(store, "owner"), { complete: true, removed: 2 });
  assert.equal(store.entries().some(([path]) => path.startsWith(`${preferenceCollection}/`)), false);
});
test("malformed preferences fail closed and cannot silently return a partial management list", async () => {
  const { store, repo, recommend } = fixture();
  await store.runTransaction(async tx => tx.set(`${preferenceCollection}/${preferenceKey("owner", "target_1")}`, {
    ownerAccountId: "owner", targetAccountId: "target_1", ignored: true, revision: 1, staleName: "Forbidden",
  }));
  assert.equal((await repo.list("owner")).ok, false);
  assert.equal((await recommend.recommend("owner", "home")).ok, false);
});
test("HTTP authenticates current viewer, rejects extra fields and exposes strict no-store errors/results", async t => {
  const { repo } = fixture();
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
  t.after(() => app.close());
  await registerFriendIgnoreRoutes(app, { verifyIdToken: async token =>
    token === "valid" ? { kind: "verified", principal: { firebaseUid: "owner" } } : { kind: "invalid" } }, repo);
  const path = `/v1/me/friend-recommendation-ignores/${name}`, headers = { authorization: "Bearer valid" };
  assert.equal((await app.inject({ method: "GET", url: path })).statusCode, 401);
  const current = await app.inject({ method: "GET", url: path, headers });
  assert.equal(current.statusCode, 200); assert.equal(current.headers["cache-control"], "no-store");
  const version = current.json().version;
  for (const payload of [{ ignored: true, expectedVersion: version, ownerAccountId: "other" },
    { ignored: "true", expectedVersion: version }, { ignored: true, expectedVersion: 0 }]) {
    assert.equal((await app.inject({ method: "PUT", url: path, headers, payload })).statusCode, 400);
  }
  assert.equal((await app.inject({ method: "PUT", url: path, headers, payload: { ignored: true, expectedVersion: version } })).statusCode, 200);
  const stale = await app.inject({ method: "PUT", url: path, headers, payload: { ignored: false, expectedVersion: version } });
  assert.equal(stale.statusCode, 412);
  assert.equal(stale.json().error.code, "FRIEND_IGNORE_PRECONDITION_FAILED");
  const list = await app.inject({ method: "GET", url: "/v1/me/friend-recommendation-ignores", headers });
  assert.equal(list.statusCode, 200); assert.equal(list.json().people.length, 1);
});
