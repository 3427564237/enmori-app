import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FirestoreFriendRepository, friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { FriendRequests } from "../src/friends/application/friend-requests.js";
import { ok, err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { myFriendsSchema } from "../src/transport/register-isolated-slices.js";
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed, clock, entryRef, measuredGateway, account } from "./support/my-friends-fixture.js";

const cursor = (n: number) => Buffer.from(entryRef(n)).toString("base64url");
function fixture(count = 1) {
  const store = new InMemoryFirestoreGateway(myFriendsSeed(count)), measured = measuredGateway(store);
  return { store, ...measured, repo: new FirestoreFriendRepository(measured.gateway, clock) };
}
test("My Friends projects only current accepted public/friends-only actual names; reads do not mutate", async () => {
  const f = fixture(4);
  await f.store.runTransaction(async tx => {
    tx.set("accounts/target_1", { ...account("target_1"), profileVisibility: "public" });
    tx.set("accounts/target_3", { ...account("target_3"), profileVisibility: "private" });
    tx.set("accounts/target_4", { ...account("target_4"), displayName: null });
  });
  const before = f.store.entries();
  assert.deepEqual(await f.repo.listFriends("owner"), ok({ friends: [1, 2].map(n => ({ username: `member_target_${n}`, displayName: `Member target_${n}` })), nextCursor: null }));
  assert.deepEqual(f.store.entries(), before);
});
test("requester denial and missing authority precede any target read", async () => {
  for (const access of [undefined, { eligibilityState: "unknown" }, { eligibilityState: "temporary-ineligible" }, { eligibilityState: "permanently-deleted" }]) {
    const f = fixture();
    await f.store.runTransaction(async tx => access === undefined ? tx.delete!("friend_access/owner") : tx.set("friend_access/owner", access));
    assert.deepEqual(await f.repo.listFriends("owner"), err(access?.eligibilityState === "temporary-ineligible" || access?.eligibilityState === "permanently-deleted" ? "forbidden" : "dependency_unavailable"));
    assert.equal(f.attempts[0]!.queries, 0);
    assert.equal(f.attempts[0]!.paths.some(path => path.includes("target_") || path.startsWith("friend_pairs/")), false);
  }
});
test("either-direction block and valid ineligibility hide rows, missing/malformed authority fails page", async () => {
  for (const blocked of ["owner", "target_1"]) {
    const f = fixture(); await f.repo.setFixtureProtection("owner", "target_1", { blockedByAccountIds: [blocked] });
    assert.deepEqual(await f.repo.listFriends("owner"), ok({ friends: [], nextCursor: null }));
    await f.repo.setFixtureProtection("owner", "target_1", { blockedByAccountIds: [] });
    assert.equal((await f.repo.listFriends("owner")).ok, true);
  }
  for (const state of ["temporary-ineligible", "permanently-deleted", "invalid"]) {
    const f = fixture(); await f.store.runTransaction(async tx => tx.set("friend_access/target_1", { eligibilityState: state }));
    assert.deepEqual(await f.repo.listFriends("owner"), state === "invalid" ? err("dependency_unavailable") : ok({ friends: [], nextCursor: null }));
  }
  for (const path of ["friend_access/target_1", "accounts/target_1", "username_reservations/member_target_1", `friend_pairs/${friendPairKey("owner", "target_1")}`]) {
    const f = fixture(); await f.store.runTransaction(async tx => tx.delete!(path));
    assert.deepEqual(await f.repo.listFriends("owner"), err("dependency_unavailable"));
  }
});
test("initialized empty differs from absent or malformed index; corrupt rows fail closed", async () => {
  const empty = fixture(0); assert.deepEqual(await empty.repo.listFriends("owner"), ok({ friends: [], nextCursor: null }));
  for (const root of [undefined, { initialized: false }, { initialized: true, extra: true }]) {
    const f = fixture(0); await f.store.runTransaction(async tx => root === undefined ? tx.delete!("friend_lists/owner") : tx.set("friend_lists/owner", root));
    assert.deepEqual(await f.repo.listFriends("owner"), err("dependency_unavailable"));
  }
  for (const mutation of ["pointer", "references", "membership", "friendship", "profile", "reservation"]) {
    const f = fixture(); const key = `friend_pairs/${friendPairKey("owner", "target_1")}`;
    await f.store.runTransaction(async tx => {
      if (mutation === "pointer") tx.set(`friend_lists/owner/members/${entryRef(1)}`, { pairKey: "invalid" });
      if (mutation === "references") tx.set(key, { ...f.store.read(key), listRefs: { owner: entryRef(5), target_1: entryRef(1001) } });
      if (mutation === "membership") tx.set(key, { ...f.store.read(key), accountIds: ["another", "target_1"] });
      if (mutation === "friendship") tx.set(key, { ...f.store.read(key), friendship: false });
      if (mutation === "profile") tx.set("accounts/target_1", { ...account("target_1"), profileVisibility: "unknown" });
      if (mutation === "reservation") tx.set("username_reservations/member_target_1", { accountId: "another" });
    });
    assert.deepEqual(await f.repo.listFriends("owner"), err("dependency_unavailable"), mutation);
  }
});
test("bounded independent pages use last scanned pointer, never scan to fill, and reach 106 reads with cursor", async () => {
  const f = fixture(42);
  const first = await f.repo.listFriends("owner"); if (!first.ok) assert.fail();
  assert.equal(first.value.friends.length, 20); assert.equal(first.value.nextCursor, cursor(20));
  const next = await f.repo.listFriends("owner", cursor(1)); if (!next.ok) assert.fail();
  assert.equal(next.value.friends[0]!.username, "member_target_2"); assert.equal(next.value.nextCursor, cursor(21));
  assert.equal(f.attempts[1]!.paths.length + f.attempts[1]!.scanned, 106);
  assert.equal(f.attempts[1]!.queries, 1); assert.equal(f.attempts[1]!.paths.some(path => path.includes("target_22")), false);
  await f.store.runTransaction(async tx => { for (let n = 1; n <= 20; n++) tx.set(`accounts/target_${n}`, { ...account(`target_${n}`), profileVisibility: "private" }); });
  assert.deepEqual(await f.repo.listFriends("owner"), ok({ friends: [], nextCursor: cursor(20) }));
  for (const count of [0, 20, 21]) {
    const f = fixture(count); const result = await f.repo.listFriends("owner"); if (!result.ok) assert.fail();
    assert.equal(result.value.friends.length, Math.min(20, count)); assert.equal(result.value.nextCursor, count === 21 ? cursor(20) : null);
  }
});
test("canonical owner-local cursors reject malformed, foreign and removed references uniformly", async () => {
  const f = fixture();
  for (const bad of ["", "bad", cursor(1) + "=", cursor(1001), cursor(100), Buffer.from("../owner").toString("base64url")]) {
    assert.deepEqual(await f.repo.listFriends("owner", bad), err("invalid_input"));
  }
  await f.store.runTransaction(async tx => tx.delete!(`friend_lists/owner/members/${entryRef(1)}`));
  assert.deepEqual(await f.repo.listFriends("owner", cursor(1)), err("invalid_input"));
  assert.deepEqual(await new FirestoreFriendRepository(new FailingFirestoreGateway(), clock).listFriends("owner"), err("dependency_unavailable"));
});
test("accept atomically creates two independent references; missing initialization rolls back; delete removes references only", async () => {
  const f = fixture(0); const seed = myFriendsSeed(1); const key = `friend_pairs/${friendPairKey("owner", "target_1")}`;
  await f.store.runTransaction(async tx => {
    for (const [path, data] of Object.entries(seed)) if (!path.includes("/members/") && !path.startsWith("friend_pairs/")) tx.set(path, data);
    tx.set(key, { accountIds: ["owner", "target_1"], blockedByAccountIds: [], friendship: false, pending: null });
    tx.delete!("friend_lists/target_1");
  });
  await f.repo.lookup("owner", "member_target_1", true);
  const inbox = await f.repo.inbox("target_1"); if (!inbox.ok) assert.fail(); const ref = inbox.value.requests[0]!.requestRef;
  const before = f.store.entries(); assert.deepEqual(await f.repo.act("target_1", ref, "accept"), err("dependency_unavailable")); assert.deepEqual(f.store.entries(), before);
  await f.store.runTransaction(async tx => tx.set("friend_lists/target_1", { initialized: true }));
  assert.deepEqual(await f.repo.act("target_1", ref, "accept"), ok({ result: "accepted" }));
  const refs = f.store.read(key)!.listRefs as Record<string, string>;
  assert.notEqual(refs.owner, refs.target_1); assert.notEqual(refs.owner, ref);
  assert.equal(f.store.entries().filter(([path]) => path.includes("/members/")).length, 2);
  assert.deepEqual(await f.repo.act("target_1", ref, "accept"), err("request_unavailable"));
  await f.repo.setFixtureProtection("owner", "target_1", { temporaryAccountId: "target_1" });
  assert.equal(f.store.entries().filter(([path]) => path.includes("/members/")).length, 2);
  await f.repo.setFixtureProtection("owner", "target_1", { permanentlyDeletedAccountId: "target_1" });
  assert.equal(f.store.entries().filter(([path]) => path.includes("/members/")).length, 0);
  assert.equal(f.store.read(key)!.friendship, true); assert.equal(f.store.read(key)!.listRefs, undefined);
});
test("My Friends HTTP is isolated-only, authenticated, strictly minimized and aligned with OpenAPI", async () => {
  const f = fixture(); const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
  const deps = { identityVerifier: { verifyIdToken: async (token: string) => ({ kind: "verified" as const, principal: { firebaseUid: token } }) }, completeOnboarding: unavailable, getOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable, getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable };
  const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: "/tmp/my-friends-test", HOME: "/tmp/my-friends-test", USERPROFILE: "/tmp/my-friends-test", APPDATA: "/tmp/my-friends-test", XDG_CONFIG_HOME: "/tmp/my-friends-test", GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };
  const plain = await buildApp(deps), app = await buildApp({ ...deps, isolatedSlices: { environment, friends: new FriendRequests(f.repo, clock) } });
  try {
    assert.equal((await plain.inject({ url: "/v1/me/friends" })).statusCode, 404);
    assert.equal((await app.inject({ url: "/v1/me/friends" })).statusCode, 401);
    const headers = { authorization: "Bearer owner" };
    for (const query of ["owner=target_1", "limit=20", "search=a", "cursor=", "cursor=bad", `cursor=${cursor(1)}&cursor=${cursor(1)}`, `cursor=${cursor(1001)}`]) {
      const reply = await app.inject({ url: `/v1/me/friends?${query}`, headers }); assert.equal(reply.statusCode, 400, query); assert.equal(reply.json().error.code, "REQUEST_INVALID");
    }
    const reply = await app.inject({ url: "/v1/me/friends", headers }); assert.equal(reply.statusCode, 200);
    assert.deepEqual(reply.json(), { friends: [{ username: "member_target_1", displayName: "Member target_1" }], nextCursor: null });
    const api = JSON.parse(await readFile("api/openapi.json", "utf8")); assert.deepEqual(api.components.schemas.MyFriendsPage, myFriendsSchema);
    assert.equal(api.paths["/v1/me/friends"].get["x-enmori-environment"], "isolated-emulator");
  } finally { await plain.close(); await app.close(); }
});
