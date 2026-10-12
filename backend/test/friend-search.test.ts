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
import { friendSearchKey, encodeFriendSearchCursor, decodeFriendSearchCursor } from "../src/friends/domain/friend-search.js";
import { canonicalizeUsername } from "../src/onboarding/domain/username.js";

for (const [input, expected] of [[" ALICE ","alice"],["Jose\u0301","josé"],["SS","ss"],["ß","ß"],["\u00a0É\u00a0","é"],["😀".repeat(50),"😀".repeat(50)]]) test(`FS01 accepted normalization ${JSON.stringify(input)}`, () => {
  assert.equal(friendSearchKey(input), expected);
});
for (const value of [undefined,null,1,[],{},"","   ","a".repeat(51),"İ".repeat(26),"\ud800","\udfff","\nAlice","Alice\t","\u200bAlice","\ufeffAlice","Alice\u2028","Alice\u2029"]) test(`FS01 rejects invalid query ${JSON.stringify(value)}`, () => {
  assert.equal(friendSearchKey(value), undefined);
});
test("Q18 Username exact ASCII behavior is unchanged", () => {
  assert.deepEqual(canonicalizeUsername("ALICE"), ok("alice"));
  assert.equal(canonicalizeUsername("José").ok,false);
});
test("FS02 cursor enforces canonical bytes, envelope, query and UUID-v4", () => {
  const good=encodeFriendSearchCursor("josé",entryRef(1));
  assert.equal(decodeFriendSearchCursor(good,"josé"),entryRef(1));
  const enc=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const invalid=["",good+"=","a".repeat(513),good+"\n",cursor(1),
    enc({q:"josé",v:1,after:entryRef(1)}),enc({v:1,q:"josé",after:entryRef(1),extra:true}),
    enc({v:"1",q:"josé",after:entryRef(1)}),enc({v:1,q:"other",after:entryRef(1)}),
    enc({v:1,q:"josé",after:"aaaaaaaa-AAAA-4aaa-8aaa-aaaaaaaaaaaa"}),enc({v:1,q:"josé",after:entryRef(1)+"\n"}),
    enc({v:1,q:"josé",after:entryRef(1).replace("-4111-","-1111-")}),
    enc({v:1,q:"josé",after:entryRef(1).replace("-8111-","-7111-")}),
    Buffer.from(' {"v":1,"q":"josé","after":"'+entryRef(1)+'"}').toString("base64url"),
    Buffer.from([0xff,0xfe]).toString("base64url")];
  // entryRef(1) has no letters: use a genuinely mixed-case UUID rejection separately.
  for(const value of invalid) assert.equal(decodeFriendSearchCursor(value,"josé"),undefined,value);
});
test("FS01 matches only authorized DisplayName and returns its original value without writes", async()=>{
  const f=fixture(5), names=["ALICE","José","Straße","İ".repeat(50),"Other"];
  await f.store.runTransaction(async tx=>{for(let n=1;n<=5;n++)tx.set(`accounts/target_${n}`,{...account(`target_${n}`),displayName:names[n-1]});});
  const before=f.store.entries();
  for(const [q,expected] of [["ali",["ALICE"]],["Jose\u0301",["José"]],["Jose",[]],["SS",[]],["ß",["Straße"]],["member_target",[]],["i\u0307",[names[3]]]] as const){
    const result=await f.repo.searchFriends("owner",{q});if(!result.ok)assert.fail();
    assert.deepEqual(result.value.friends.map(r=>r.displayName),expected);
  }
  assert.deepEqual(f.store.entries(),before);
});
test("FS03 bounded empty continuation reaches later names; 106 gets, no lookahead expansion",async()=>{
  const f=fixture(42), q="target_42";
  let result=await f.repo.searchFriends("owner",{q});if(!result.ok)assert.fail();
  assert.deepEqual(result.value,{friends:[],nextCursor:encodeFriendSearchCursor(q,entryRef(20))});
  result=await f.repo.searchFriends("owner",{q,cursor:result.value.nextCursor});if(!result.ok)assert.fail();
  assert.deepEqual(result.value,{friends:[],nextCursor:encodeFriendSearchCursor(q,entryRef(40))});
  result=await f.repo.searchFriends("owner",{q,cursor:result.value.nextCursor});if(!result.ok)assert.fail();
  assert.deepEqual(result.value,{friends:[{username:"member_target_42",displayName:"Member target_42"}],nextCursor:null});
  assert.equal(f.attempts[1]!.paths.length+f.attempts[1]!.scanned,106);
  assert.equal(f.attempts[1]!.queries,1);assert.equal(f.attempts[1]!.paths.some(p=>p.includes("target_41")),false);
  for(const count of [0,20,21]){const g=fixture(count);const r=await g.repo.searchFriends("owner",{q:"member"});if(!r.ok)assert.fail();assert.equal(r.value.friends.length,Math.min(count,20));assert.equal(r.value.nextCursor,count===21?encodeFriendSearchCursor("member",entryRef(20)):null);}
});
test("FS04 requester authorization precedes invalid input, target scanning and failures",async()=>{
  const f=fixture();
  assert.deepEqual(await f.repo.searchFriends("missing",{}),err("onboarding_required"));
  await f.store.runTransaction(async tx=>tx.set("friend_access/owner",{eligibilityState:"temporary-ineligible"}));
  assert.deepEqual(await f.repo.searchFriends("owner",{q:[],cursor:"bad"}),err("forbidden"));
  assert.ok(f.attempts.every(a=>a.queries===0&&a.paths.every(p=>!p.startsWith("friend_pairs/"))));
});
test("FS02 unknown fields, stale/foreign cursor and changed normalized query reject",async()=>{
  const f=fixture();
  for(const input of [{},{q:[]},{q:"member",pageSize:20},{q:"member",accountId:"owner"},{q:"member",cursor:undefined},{q:"member",cursor:encodeFriendSearchCursor("different",entryRef(1))},{q:"member",cursor:encodeFriendSearchCursor("member",entryRef(1001))}])assert.deepEqual(await f.repo.searchFriends("owner",input),err("invalid_input"));
  await f.store.runTransaction(async tx=>tx.delete!(`friend_lists/owner/members/${entryRef(1)}`));
  assert.deepEqual(await f.repo.searchFriends("owner",{q:"member",cursor:encodeFriendSearchCursor("member",entryRef(1))}),err("invalid_input"));
});
test("FS04 all scanned authority checked even for nonmatches; known denials omit",async()=>{
  for(const path of ["friend_access/target_1","accounts/target_1","username_reservations/member_target_1",`friend_pairs/${friendPairKey("owner","target_1")}`]){
    const f=fixture();await f.store.runTransaction(async tx=>tx.delete!(path));assert.deepEqual(await f.repo.searchFriends("owner",{q:"no match"}),err("dependency_unavailable"));
  }
  for(const block of ["owner","target_1"]){const f=fixture();await f.repo.setFixtureProtection("owner","target_1",{blockedByAccountIds:[block]});assert.deepEqual(await f.repo.searchFriends("owner",{q:"member"}),ok({friends:[],nextCursor:null}));}
  for(const change of [{profileVisibility:"private"},{displayName:null}]){const f=fixture();await f.store.runTransaction(async tx=>tx.set("accounts/target_1",{...account("target_1"),...change}));assert.deepEqual(await f.repo.searchFriends("owner",{q:"member"}),ok({friends:[],nextCursor:null}));}
  const f=fixture();await f.repo.setFixtureProtection("owner","target_1",{temporaryAccountId:"target_1"});assert.deepEqual(await f.repo.searchFriends("owner",{q:"member"}),ok({friends:[],nextCursor:null}));
});
test("FS02 search HTTP authorization, raw query validation and normative response agree", async () => {
  const f = fixture(); const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
  const deps = { identityVerifier: { verifyIdToken: async (token: string) => ({ kind: "verified" as const, principal: { firebaseUid: token } }) }, completeOnboarding: unavailable, getOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable, getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable };
  const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: "/tmp/my-friends-test", HOME: "/tmp/my-friends-test", USERPROFILE: "/tmp/my-friends-test", APPDATA: "/tmp/my-friends-test", XDG_CONFIG_HOME: "/tmp/my-friends-test", GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };
  const plain = await buildApp(deps), app = await buildApp({ ...deps, isolatedSlices: { environment, friends: new FriendRequests(f.repo, clock) } });
  try {
    assert.equal((await plain.inject({ url: "/v1/me/friends/search" })).statusCode, 404);
    assert.equal((await app.inject({ url: "/v1/me/friends/search" })).statusCode, 401);
    const headers = { authorization: "Bearer owner" };
    for (const query of ["", "q=", "q=Alice&q=Bob", "q=a&owner=target_1", "q=a&pageSize=20", "q=a&cursor=", "q=a&cursor=bad", "q=%0Aalice", "q=%ED%A0%80", "q=%C3%28", "q=%ZZ", "q=a&cursor=x&cursor=y"]) {
      const reply = await app.inject({ url: `/v1/me/friends/search?${query}`, headers }); assert.equal(reply.statusCode, 400, query); assert.equal(reply.json().error.code, "REQUEST_INVALID");
    }
    assert.equal((await app.inject({url:"/v1/me/friends/search?q=",headers:{authorization:"Bearer missing"}})).json().error.code,"ONBOARDING_REQUIRED");
    const reply = await app.inject({ url: "/v1/me/friends/search?q=MEMBER", headers }); assert.equal(reply.statusCode, 200);
    assert.deepEqual(reply.json(), { friends: [{ username: "member_target_1", displayName: "Member target_1" }], nextCursor: null });
    const api = JSON.parse(await readFile("api/openapi.json", "utf8")); assert.deepEqual(api.components.schemas.MyFriendsPage, myFriendsSchema);
    assert.equal(api.paths["/v1/me/friends/search"].get["x-enmori-environment"], "isolated-emulator");
  } finally { await plain.close(); await app.close(); }
});
