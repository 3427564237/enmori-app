import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FirestoreFriendActivity } from "../src/friend-activity/infrastructure/firestore-friend-activity.js";
import type { EventActivitySource } from "../src/friend-activity/ports/friend-activity.js";
import { firestoreSocialAuthority } from "../src/friends/infrastructure/social-authority.js";
import { friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { activityItemSchema } from "../src/friend-activity/transport/friend-activity-route.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed, clock, instant } from "./support/my-friends-fixture.js";
import type { FirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { ok } from "../src/shared/domain/result.js";

function fixture(events?: EventActivitySource) {
  const seed = myFriendsSeed(1);
  for (const id of ["owner", "target_1"]) seed[`accounts/${id}`] = {...seed[`accounts/${id}`], optionalProcessingConsent:"accepted"};
  for (const [id, visibility] of [["a","friends_only"],["b","public"],["c","public"],["private","private"]]) {
    seed[`check_ins/${id}`]={ownerAccountId:"target_1",createdAt:instant,checkInVisibility:visibility,
      note:`Approved ${id}`,mood:"Calm",activity:"NOT_A_FEED_FIELD",location:{latitude:1,longitude:2},weather:{private:true}};
  }
  const store = new InMemoryFirestoreGateway(seed), reads:string[]=[];
  const gateway:FirestoreGateway={runTransaction:work=>store.runTransaction(tx=>work({...tx,get:async path=>{reads.push(path);return tx.get(path);}}))};
  const repo = new FirestoreFriendActivity(gateway,clock,firestoreSocialAuthority,events);
  return {store,repo,reads, async update(path:string, fields:Record<string,unknown>){
    await store.runTransaction(async tx=>tx.set(path,{...store.read(path),...fields}));
  }};
}
test("Home reads only two ranked authorized bodies; See All keeps the same order and minimal fields",async()=>{
  const f=fixture(), home=await f.repo.read("owner","home","all");assert.ok(home.ok);if(!home.ok)return;
  assert.deepEqual(f.reads.filter(p=>p.startsWith("check_ins/")),["check_ins/a","check_ins/b"]);
  assert.deepEqual(home.value.activities[0]?.checkIn,{note:"Approved a",mood:"Calm"});
  const all=await f.repo.read("owner","all","all");assert.ok(all.ok);if(!all.ok)return;
  assert.deepEqual(home.value.activities,all.value.activities.slice(0,2));
  assert.deepEqual(all.value.activities.map(x=>x.sourceRecordId),["a","b","c"]);
  for(const key of ["location","weather","activity","specialCare","ownerAccountId"])
    assert.equal(JSON.stringify(all.value.activities[0]).includes(`"${key}":`),false);
});
test("changing mood/note changes display only, never candidate order or participation score",async()=>{
  const f=fixture(), before=await f.repo.read("owner","all","all");assert.ok(before.ok);if(!before.ok)return;
  await f.update("check_ins/c",{note:"ZZZZ a very different note",mood:"Excited"});
  const after=await f.repo.read("owner","all","all");assert.ok(after.ok);if(!after.ok)return;
  assert.deepEqual(after.value.activities.map(x=>[x.sourceRecordId,x.occurredAt]),before.value.activities.map(x=>[x.sourceRecordId,x.occurredAt]));
  assert.equal(after.value.activities.at(-1)?.checkIn?.mood,"Excited");
});
for(const revoke of ["record","deleted","consent","viewerConsent","profile","relationship","block","eligibility"]) {
  test(`fresh summary/detail-source read rejects ${revoke} revocation without cached content`,async()=>{
    const f=fixture();assert.ok((await f.repo.read("owner","all","all")).ok);
    switch(revoke){
      case "record":for(const id of ["a","b","c"])await f.update(`check_ins/${id}`,{checkInVisibility:"private"});break;
      case "deleted":await f.store.runTransaction(async tx=>{for(const id of ["a","b","c"])tx.delete!(`check_ins/${id}`);});break;
      case "consent":await f.update("accounts/target_1",{optionalProcessingConsent:"rejected"});break;
      case "viewerConsent":await f.update("accounts/owner",{optionalProcessingConsent:"rejected"});break;
      case "profile":await f.update("accounts/target_1",{profileVisibility:"private"});break;
      case "eligibility":await f.update("friend_access/target_1",{eligibilityState:"permanently-deleted"});break;
      case "relationship":await f.store.runTransaction(async tx=>tx.set(`friend_pairs/${friendPairKey("owner","target_1")}`,{accountIds:["owner","target_1"],friendship:false,blockedByAccountIds:[],pending:null}));break;
      case "block":await f.update(`friend_pairs/${friendPairKey("owner","target_1")}`,{blockedByAccountIds:["target_1"]});break;
    }
    f.reads.length=0;
    assert.deepEqual(await f.repo.read("owner","all","all"),ok({activities:[]}));
    assert.equal(f.reads.some(p=>p.startsWith("check_ins/")),false);
  });
}
test("malformed selected content is unavailable; malformed private content is never loaded",async()=>{
  const f=fixture();await f.update("check_ins/private",{note:{private:"bad"}});
  assert.ok((await f.repo.read("owner","home","all")).ok);
  await f.update("check_ins/a",{mood:123});const result=await f.repo.read("owner","home","all");
  assert.equal(!result.ok&&result.failure.code,"SERVICE_UNAVAILABLE");
});
test("Event metadata/title callbacks run only under current participation authority; source disable removes titles",async()=>{
  let displays=0, reads=0, available=true;
  const events:EventActivitySource={read:async(_tx,viewer,owner,_now,purpose)=>{
    reads++;assert.equal(viewer,"owner");assert.equal(owner,"target_1");assert.equal(purpose,"friends_activity_v1");
    return [{type:"event_going",sourceRecordId:"participation1",occurredAt:instant}];
  },display:async(_tx,viewer,owner,source)=>{
    displays++;assert.equal(viewer,"owner");assert.equal(owner,"target_1");assert.deepEqual(Object.keys(source).sort(),["occurredAt","sourceRecordId","type"]);
    return available?{eventId:"event1",title:"Current Event"}:undefined;
  }};
  const f=fixture(events);await f.update("accounts/target_1",{fieldPrivacy:{participation:"friends_only",location:"private",interests:"private",mapSharedWithFriends:false}});
  let result=await f.repo.read("owner","home","all");assert.ok(result.ok);if(!result.ok)return;
  assert.deepEqual(result.value.activities[0]?.event,{eventId:"event1",title:"Current Event"});
  available=false;result=await f.repo.read("owner","all","event_going");assert.deepEqual(result,ok({activities:[]}));
  const counts=[reads,displays];await f.update("accounts/target_1",{fieldPrivacy:{participation:"private",location:"private",interests:"private",mapSharedWithFriends:false}});
  assert.deepEqual(await f.repo.read("owner","all","event_going"),ok({activities:[]}));assert.deepEqual([reads,displays],counts);
});
test("API contract matches conditional display schema exactly; no additional sensitive field",()=>{
  const api=JSON.parse(readFileSync("api/openapi.json","utf8"));
  assert.deepEqual(api.paths["/v1/me/friends/activity"].get.responses["200"].content["application/json"].schema.properties.activities.items,activityItemSchema);
});
test("new cross-feature adapters depend on the public authority port, not private Friends infrastructure",()=>{
  for(const path of ["friend-recommendations/infrastructure/firestore-friend-ignore-repository.ts","friend-recommendations/infrastructure/firestore-friend-recommendations.ts","friend-recommendations/infrastructure/recommendation-preference.ts","friend-activity/infrastructure/firestore-friend-activity.ts"])
    assert.equal(readFileSync(`backend/src/${path}`,"utf8").includes('friends/infrastructure/'),false);
  assert.equal(readFileSync("lib/features/friends/data/backend_social_repository.dart","utf8").includes('check_in/data/'),false);
});
