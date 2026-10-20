import assert from "node:assert/strict";
import test from "node:test";
import { FirestoreSocialRepository } from "../src/friends/infrastructure/firestore-social-repository.js";
import { FirestoreFriendRepository,friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { AesGcmHistoryCursorCodec } from "../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import type { CheckInHistoryFirestoreGateway } from "../src/check-ins/ports/check-in-history-firestore-gateway.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed,clock } from "./support/my-friends-fixture.js";
import { ok } from "../src/shared/domain/result.js";
import Fastify from "fastify";
import { SocialProfiles } from "../src/friends/application/social-profile.js";
import { registerSocialRoutes } from "../src/friends/transport/social-routes.js";
const date="2026-10-07",timeZone="Asia/Singapore",username="member_target_1";
export function socialFixture(){
  const seed=myFriendsSeed(1);
  seed["accounts/target_1"]={...seed["accounts/target_1"],
    profileDetails:{bio:"A biography",affiliationType:"school",affiliationName:"A school",region:"A region"},
    fieldPrivacy:{interests:"friends_only",location:"friends_only",participation:"private",mapSharedWithFriends:true}};
  seed["account_interests/target_1"]={interestTagIds:["music"],revision:1};
  seed["interest_tags/music"]={displayName:"Music",lifecycleState:"active",revision:1};
  seed["check_ins/visible"]={ownerAccountId:"target_1",note:"Visible note",createdAt:"2026-10-07T01:00:00.000Z",
    checkInVisibility:"friends_only",location:{latitude:1.3521,longitude:103.8198}};
  seed["check_ins/private"]={...seed["check_ins/visible"],note:"Private note",checkInVisibility:"private"};
  seed["check_ins/legacy"]={ownerAccountId:"target_1",note:"Legacy",createdAt:"2026-10-07T01:00:00.000Z"};
  const store=new InMemoryFirestoreGateway(seed);
  const history:CheckInHistoryFirestoreGateway={runTransaction:work=>store.runTransaction(tx=>work({
    get:path=>tx.get(path),
    listCheckInHistoryPage:async input=>(await tx.list("check_ins"))
      .filter(row=>row.data.ownerAccountId===input.ownerAccountId&&typeof row.data.createdAt==="string"&&
        row.data.createdAt>=input.startUtc&&(input.endUtc===null||row.data.createdAt<input.endUtc))
      .sort((a,b)=>String(b.data.createdAt).localeCompare(String(a.data.createdAt))||b.id.localeCompare(a.id))
      .filter(row=>!input.after||String(row.data.createdAt)<input.after.createdAt||
        (row.data.createdAt===input.after.createdAt&&row.id<input.after.checkInId)).slice(0,input.limit),
  }))};
  const repo=new FirestoreSocialRepository(store,history,new AesGcmHistoryCursorCodec(Buffer.alloc(32,7)),clock);
  return {store,repo};
}
test("profile, records, calendar and map share authoritative privacy with legacy private defaults",async()=>{
  const {repo}=socialFixture();
  const profile=await repo.profile("owner",username);assert.equal(profile.ok,true);
  if(profile.ok){assert.equal(profile.value.relationship,"friend");assert.equal(profile.value.mapAvailable,true);
    assert.deepEqual(profile.value.interests,[{interestTagId:"music",displayName:"Music"}]);}
  const records=await repo.records("owner",username,{date,timeZone});assert.equal(records.ok,true);
  if(records.ok)assert.deepEqual(records.value.checkIns.map(x=>x.checkInId),["visible"]);
  const month=await repo.month("owner",username,{month:"2026-10",timeZone});assert.equal(month.ok,true);
  if(month.ok){assert.equal(month.value.days.find(x=>x.date===date)?.count,1);assert.equal(month.value.points.length,1);}
  const own=await repo.records("target_1",username,{date,timeZone});assert.equal(own.ok&&own.value.checkIns.length,3);
});
test("closing map sharing removes exact points from every new view while preserving visible records",async()=>{
  const {store,repo}=socialFixture();
  await store.runTransaction(async tx=>{const account=store.read("accounts/target_1")!;
    tx.set("accounts/target_1",{...account,fieldPrivacy:{...account.fieldPrivacy as object,mapSharedWithFriends:false}});});
  const records=await repo.records("owner",username,{date,timeZone});
  assert.equal(records.ok,true);if(records.ok)assert.equal(records.value.checkIns[0]?.location,undefined);
  const month=await repo.month("owner",username,{month:"2026-10",timeZone});
  assert.equal(month.ok,true);if(month.ok){assert.equal(month.value.points.length,0);assert.equal(month.value.days.find(x=>x.date===date)?.count,1);}
});
test("private field settings clear region/interests/points without hiding otherwise permitted profile",async()=>{
  const {store,repo}=socialFixture();
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),fieldPrivacy:{
    interests:"private",location:"private",participation:"private",mapSharedWithFriends:true}}));
  const profile=await repo.profile("owner",username);assert.equal(profile.ok,true);
  if(profile.ok){assert.equal(profile.value.details.region,null);assert.deepEqual(profile.value.interests,[]);
    assert.equal(profile.value.mapAvailable,false);assert.equal(profile.value.participationAvailable,false);}
});
test("friendship removal atomically removes both list pointers and every friend-only view",async()=>{
  const {store,repo}=socialFixture();
  assert.deepEqual(await repo.remove("owner",username,0),ok(undefined));
  assert.equal(store.entries().filter(([path])=>path.includes("/members/")).length,0);
  for(const outcome of [
    await repo.profile("owner",username),
    await repo.records("owner",username,{date,timeZone}),
    await repo.month("owner",username,{month:"2026-10",timeZone}),
    await repo.profile("target_1","member_owner"),
  ])assert.equal(!outcome.ok&&outcome.failure.code,"ADD_FRIEND_TARGET_UNAVAILABLE");
  const publicAccount={...store.read("accounts/target_1"),profileVisibility:"public"};
  await store.runTransaction(async tx=>tx.set("accounts/target_1",publicAccount));
  const view=await repo.records("owner",username,{date,timeZone});
  assert.equal(view.ok,true);if(view.ok)assert.deepEqual(view.value.checkIns,[]);
});
test("Special Care is private, revision protected and returns no hidden target fields",async()=>{
  const {store,repo}=socialFixture();
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),profileVisibility:"private"}));
  assert.deepEqual(await repo.care("owner",username,{specialCare:true,expectedRevision:0}),ok({specialCare:true,friendshipRevision:1}));
  const peer=await repo.profile("target_1","member_owner");assert.equal(peer.ok,true);
  if(peer.ok){assert.equal(peer.value.specialCare,false);assert.equal(peer.value.friendshipRevision,0);}
  const stale=await repo.care("owner",username,{specialCare:false,expectedRevision:0});
  assert.equal(!stale.ok&&stale.failure.code,"FRIEND_REVISION_PRECONDITION_FAILED");
});
test("old friendship command cannot affect a newly accepted relationship",async()=>{
  const {store,repo}=socialFixture();
  await repo.remove("owner",username,0);
  const requests=new FirestoreFriendRepository(store,clock);
  assert.equal((await requests.lookup("owner",username,true)).ok,true);
  const inbox=await requests.inbox("target_1");assert.equal(inbox.ok,true);if(!inbox.ok)return;
  assert.equal((await requests.act("target_1",inbox.value.requests[0]!.requestRef,"accept")).ok,true);
  const stale=await repo.remove("owner",username,0);
  assert.equal(!stale.ok&&stale.failure.code,"FRIEND_REVISION_PRECONDITION_FAILED");
  assert.equal(store.read(`friend_pairs/${friendPairKey("owner","target_1")}`)?.friendship,true);
});
test("cursor is bound to viewer, target, date and current authorization; a revoke is not bypassed",async()=>{
  const {store,repo}=socialFixture();
  await store.runTransaction(async tx=>{
    for(let n=0;n<23;n++)tx.set(`check_ins/row_${String(n).padStart(2,"0")}`,{
      ownerAccountId:"target_1",note:"Shared",createdAt:"2026-10-07T02:00:00.000Z",checkInVisibility:"friends_only"});
  });
  const first=await repo.records("owner",username,{date,timeZone});assert.equal(first.ok,true);
  if(!first.ok||!first.value.nextCursor)return assert.fail("expected continuation");
  const cursor=first.value.nextCursor;
  const foreign=await repo.records("target_1",username,{date,timeZone,cursor});
  assert.equal(!foreign.ok&&foreign.failure.code,"REQUEST_INVALID");
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),profileVisibility:"private"}));
  const revoked=await repo.records("owner",username,{date,timeZone,cursor});
  assert.equal(!revoked.ok&&revoked.failure.code,"ADD_FRIEND_TARGET_UNAVAILABLE");
});
test("either-direction block, absent identity and legacy missing privacy cannot expose another account",async()=>{
  for(const blocked of ["owner","target_1"]){
    const {store,repo}=socialFixture(),path=`friend_pairs/${friendPairKey("owner","target_1")}`;
    await store.runTransaction(async tx=>tx.set(path,{...store.read(path),blockedByAccountIds:[blocked]}));
    const result=await repo.profile("owner",username);
    assert.equal(!result.ok&&result.failure.code,"ADD_FRIEND_TARGET_UNAVAILABLE");
  }
  const {store,repo}=socialFixture();
  const missing=await repo.profile("missing",username);
  assert.equal(!missing.ok&&missing.failure.code,"ONBOARDING_REQUIRED");
  await store.runTransaction(async tx=>{const value={...store.read("accounts/target_1")};delete value.fieldPrivacy;tx.set("accounts/target_1",value);});
  const profile=await repo.profile("owner",username);assert.equal(profile.ok,true);
  if(profile.ok){assert.deepEqual(profile.value.interests,[]);assert.equal(profile.value.mapAvailable,false);}
});
test("invalid civil month is a client error and revision exhaustion writes nothing",async()=>{
  const {store,repo}=socialFixture();
  const invalid=await repo.month("owner",username,{month:"2026-13",timeZone});
  assert.equal(!invalid.ok&&invalid.failure.code,"REQUEST_INVALID");
  const path=`friend_pairs/${friendPairKey("owner","target_1")}`;
  await store.runTransaction(async tx=>tx.set(path,{...store.read(path),revisions:{owner:Number.MAX_SAFE_INTEGER-1}}));
  const before=store.entries();
  for(const outcome of [await repo.care("owner",username,{specialCare:true,expectedRevision:Number.MAX_SAFE_INTEGER-1}),
    await repo.remove("owner",username,Number.MAX_SAFE_INTEGER-1)])assert.equal(!outcome.ok&&outcome.failure.code,"SERVICE_UNAVAILABLE");
  assert.deepEqual(store.entries(),before);
});
test("HTTP boundary requires principal, rejects owner injection and returns only authorized noncached fields",async t=>{
  const {store,repo}=socialFixture(),app=Fastify({logger:false,ajv:{customOptions:{removeAdditional:false}}});
  await registerSocialRoutes(app,{verifyIdToken:async token=>token==="owner-token"?
    {kind:"verified",principal:{firebaseUid:"owner"}}:{kind:"invalid"}},new SocialProfiles(repo));
  t.after(()=>app.close());
  const headers={authorization:"Bearer owner-token"};
  assert.equal((await app.inject({url:`/v1/people/${username}`})).statusCode,401);
  assert.equal((await app.inject({url:`/v1/people/${username}?ownerAccountId=target_1`,headers})).statusCode,400);
  const profile=await app.inject({url:`/v1/people/${username}`,headers});
  assert.equal(profile.statusCode,200);assert.equal(profile.headers["cache-control"],"no-store");
  assert.equal(profile.json().username,username);assert.equal(profile.body.includes("ownerAccountId"),false);
  const url=`/v1/people/${username}/check-ins?date=${date}&timeZone=${encodeURIComponent(timeZone)}`;
  const records=await app.inject({url,headers});assert.equal(records.statusCode,200);
  assert.deepEqual(records.json().checkIns.map((x:{checkInId:string})=>x.checkInId),["visible"]);
  const injected=await app.inject({url:`/v1/me/friends/${username}/special-care`,method:"PUT",headers,
    payload:{specialCare:true,expectedRevision:0,ownerAccountId:"target_1"}});
  assert.equal(injected.statusCode,400);
  const care=await app.inject({url:`/v1/me/friends/${username}/special-care`,method:"PUT",headers,payload:{specialCare:true,expectedRevision:0}});
  assert.equal(care.statusCode,200);assert.deepEqual(care.json(),{specialCare:true,friendshipRevision:1});
  const stale=await app.inject({url:`/v1/me/friends/${username}`,method:"DELETE",headers,payload:{expectedRevision:0}});
  assert.equal(stale.statusCode,412);
  const removed=await app.inject({url:`/v1/me/friends/${username}`,method:"DELETE",headers,payload:{expectedRevision:1}});
  assert.equal(removed.statusCode,200);assert.deepEqual(removed.json(),{removed:true});
  assert.equal((await app.inject({url,headers})).statusCode,404);
  assert.equal(store.entries().filter(([path])=>path.includes("/members/")).length,0);
});
