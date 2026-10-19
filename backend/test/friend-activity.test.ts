import test from "node:test";
import assert from "node:assert/strict";
import { rankActivity,type ActivityCandidate } from "../src/friend-activity/domain/rank-activity.js";
import { FirestoreFriendActivity } from "../src/friend-activity/infrastructure/firestore-friend-activity.js";
import { FirestoreFriendSummary } from "../src/friends/infrastructure/firestore-friend-summary.js";
import { AuthorizedParticipation } from "../src/friends/infrastructure/authorized-participation.js";
import { FirestoreFriendRepository,friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { myFriendsSeed,clock,instant } from "./support/my-friends-fixture.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { registerSocialModule } from "../src/friends/transport/register-social-module.js";
import { AesGcmHistoryCursorCodec } from "../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { ok } from "../src/shared/domain/result.js";
import Fastify from "fastify";
const asOf=Date.parse(instant);
const candidate=(id:string,hours:number,type:ActivityCandidate["type"]="check_in_created",specialCare=false):ActivityCandidate=>({
  sourceRecordId:id,type,specialCare,occurredAt:new Date(asOf-hours*3600000).toISOString()});
test("Q03 inclusive 168h window, recency boundaries, Special Care weighting and canonical pair tie-break",()=>{
  const rows=[candidate("old",168),candidate("outside",168.00001),candidate("future",-1),candidate("72",72),candidate("24",24),
    candidate("a",0),candidate("b",0,"event_interested"),candidate("care",72,"event_going",true)];
  assert.deepEqual(rankActivity(rows,asOf).map(x=>x.sourceRecordId),["care","a","b","24","72","old"]);
});
function fixture(){
  const seed=myFriendsSeed(1);
  for(const id of ["owner","target_1"])seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:"accepted"};
  for(const [id,visibility,time]of [["shared","friends_only",instant],["hidden","private",instant],["old","public","2026-09-01T00:00:00.000Z"]]){
    seed[`check_ins/${id}`]={ownerAccountId:"target_1",createdAt:time,checkInVisibility:visibility,note:"MUST_NOT_REACH_RANKER",location:{latitude:1,longitude:2}};
  }
  const store=new InMemoryFirestoreGateway(seed);return {store,repo:new FirestoreFriendActivity(store,clock)};
}
test("metadata-only source filters private/stale rows before rank and Home is unified Top2",async()=>{
  const {repo}=fixture(),all=await repo.read("owner","all","all"),home=await repo.read("owner","home","all");
  assert.equal(all.ok,true);if(!all.ok)return;
  assert.deepEqual(home,ok({activities:all.value.activities.slice(0,2)}));
  assert.deepEqual(all.value.activities.map(x=>x.sourceRecordId),["shared"]);
  assert.equal(JSON.stringify(all).includes("MUST_NOT_REACH_RANKER"),false);
  assert.equal(JSON.stringify(all).includes("specialCare"),false);
});
test("relationship/profile tightening revokes current activity even when source still exists",async()=>{
  const {store,repo}=fixture();
  await store.runTransaction(async tx=>{
    const {listRefs:_old,...pair}=store.read(`friend_pairs/${friendPairKey("owner","target_1")}`)!;
    tx.set(`friend_pairs/${friendPairKey("owner","target_1")}`,{...pair,friendship:false});
  });
  assert.deepEqual(await repo.read("owner","all","all"),ok({activities:[]}));
});
test("withdrawn Activity source and viewer consent remove new ranking without touching manual relationships",async()=>{
  const {store,repo}=fixture();
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),optionalProcessingConsent:"rejected"}));
  assert.deepEqual(await repo.read("owner","home","all"),ok({activities:[]}));
  await store.runTransaction(async tx=>tx.set("accounts/owner",{...store.read("accounts/owner"),optionalProcessingConsent:"rejected"}));
  const denied=new FirestoreFriendActivity({runTransaction:work=>store.runTransaction(tx=>work({...tx,listPage:async()=>{throw new Error("must not scan relationships");}}))},clock);
  assert.deepEqual(await denied.read("owner","all","all"),ok({activities:[]}));
  assert.equal(store.read(`friend_pairs/${friendPairKey("owner","target_1")}`)?.friendship,true);
});
test("missing permitted event producer fails All; independent Check-in category still works",async()=>{
  const {store,repo}=fixture();
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),fieldPrivacy:{
    interests:"private",location:"private",participation:"friends_only",mapSharedWithFriends:false}}));
  const absent=await repo.read("owner","all","all");assert.equal(!absent.ok&&absent.failure.code,"SERVICE_UNAVAILABLE");
  assert.equal((await repo.read("owner","all","check_in_created")).ok,true);
  let calls=0;const wired=new FirestoreFriendActivity(store,clock,{read:async(_tx,viewer,owner,_asOf,purpose)=>{
    calls++;assert.equal(viewer,"owner");assert.equal(owner,"target_1");assert.equal(purpose,"friends_activity_v1");
    return [{type:"event_going",sourceRecordId:"participation",occurredAt:instant}];}});
  const result=await wired.read("owner","all","all");assert.equal(result.ok,true);
  if(result.ok)assert.deepEqual(result.value.activities.map(x=>x.sourceRecordId),["participation","shared"]);assert.equal(calls,1);
});
test("participation callback receives current identities only after field authorization",async()=>{
  const {store}=fixture(),port=new AuthorizedParticipation(store);let calls=0;
  assert.equal((await port.read({firebaseUid:"owner"},"member_target_1",async()=>{calls++;return [];})).ok,false);assert.equal(calls,0);
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),fieldPrivacy:{
    interests:"private",location:"private",participation:"friends_only",mapSharedWithFriends:false}}));
  assert.deepEqual(await port.read({firebaseUid:"owner"},"member_target_1",async(_tx,viewer,owner)=>[viewer,owner]),ok(["owner","target_1"]));
});
test("pending-only badge follows accept and never counts an accepted friendship as a notification",async()=>{
  const seed=myFriendsSeed(1),key=friendPairKey("owner","target_1");
  seed[`friend_pairs/${key}`]={accountIds:["owner","target_1"],blockedByAccountIds:[],friendship:false,pending:null};
  const store=new InMemoryFirestoreGateway(seed),requests=new FirestoreFriendRepository(store,clock),summary=new FirestoreFriendSummary(store,clock);
  assert.deepEqual(await summary.pendingCount("target_1"),ok({pendingRequestCount:0}));
  assert.equal((await requests.lookup("owner","member_target_1",true)).ok,true);
  assert.deepEqual(await summary.pendingCount("target_1"),ok({pendingRequestCount:1}));
  const inbox=await requests.inbox("target_1");if(!inbox.ok)return assert.fail("inbox expected");
  assert.equal((await requests.act("target_1",inbox.value.requests[0]!.requestRef,"accept")).ok,true);
  assert.deepEqual(await summary.pendingCount("target_1"),ok({pendingRequestCount:0}));
});
test("composed routes use strict schemas, verified actor and no-store without runtime or provider",async()=>{
  const {store}=fixture(),app=Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
  await registerSocialModule(app,{identity:{verifyIdToken:async token=>token==="valid"?{kind:"verified",principal:{firebaseUid:"owner"}}:{kind:"invalid"}},
    store,history:{runTransaction:async()=>{throw new Error("not called");}},cursor:new AesGcmHistoryCursorCodec(Buffer.alloc(32,5)),clock,weather:{current:async()=>undefined}});
  try{
    const response=await app.inject({method:"GET",url:"/v1/me/friends/activity?view=home&category=all",headers:{authorization:"Bearer valid"}});
    assert.equal(response.statusCode,200,response.body);assert.equal(response.headers["cache-control"],"no-store");
    assert.equal((await app.inject({method:"GET",url:"/v1/me/friends/activity?view=home&category=mood",headers:{authorization:"Bearer valid"}})).statusCode,400);
    assert.equal((await app.inject({method:"GET",url:"/v1/me/friends/activity?view=home&category=all"})).statusCode,401);
  }finally{await app.close();}
});
