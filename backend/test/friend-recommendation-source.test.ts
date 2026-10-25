import { firestoreSocialAuthority } from "../src/friends/infrastructure/social-authority.js";
import test from "node:test";
import assert from "node:assert/strict";
import { FirestoreFriendRecommendations } from "../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed,clock } from "./support/my-friends-fixture.js";
import { friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { ok } from "../src/shared/domain/result.js";
import type { FirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { FriendEventProjection } from "../src/friend-recommendations/ports/friend-event-projection.js";
function fixture(){
  const seed=myFriendsSeed(4);
  for(const id of ["owner","target_1","target_2","target_3","target_4"]){
    seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:"accepted",profileVisibility:"public",fieldPrivacy:{interests:"public",location:"private",participation:"private",mapSharedWithFriends:false}};
    seed[`account_interests/${id}`]={interestTagIds:id==="target_2"?["music","art"]:["music"],revision:1};
    if(id!=="owner")delete seed[`friend_pairs/${friendPairKey("owner",id)}`];
  }
  seed["account_interests/owner"]={interestTagIds:["music","art"],revision:1};
  seed["interest_tags/music"]={displayName:"Music",lifecycleState:"active",revision:1};
  seed["interest_tags/art"]={displayName:"Art",lifecycleState:"active",revision:1};
  const store=new InMemoryFirestoreGateway(seed);return {store,repo:new FirestoreFriendRecommendations(store,clock, firestoreSocialAuthority)};
}
test("producer orders whole authorized candidate pool before Home Top 2 and exposes no IDs/scores/history",async()=>{
  const {store,repo}=fixture(),before=store.entries();
  const all=await repo.recommend("owner","all"),home=await repo.recommend("owner","home");
  assert.equal(all.ok,true);assert.equal(home.ok,true);if(!all.ok||!home.ok)return;
  assert.deepEqual(all.value.suggestions.map(c=>c.username),["member_target_2","member_target_1","member_target_3","member_target_4"]);
  assert.deepEqual(home.value.suggestions,all.value.suggestions.slice(0,2));
  for(const row of all.value.suggestions)assert.deepEqual(Object.keys(row).sort(),["commonEventCount","displayName","ignoreVersion","reason","sharedInterests","username"]);
  assert.deepEqual(store.entries(),before);
});
test("withdrawn recommendation consent stops before candidate reads and excludes a withdrawn target",async()=>{
  const {store,repo}=fixture();
  await store.runTransaction(async tx=>tx.set("accounts/target_2",{...store.read("accounts/target_2"),optionalProcessingConsent:"rejected"}));
  const filtered=await repo.recommend("owner","all");assert.equal(filtered.ok,true);
  if(filtered.ok)assert.equal(filtered.value.suggestions.some(row=>row.username==="member_target_2"),false);
  await store.runTransaction(async tx=>tx.set("accounts/owner",{...store.read("accounts/owner"),optionalProcessingConsent:"rejected"}));
  const denied=new FirestoreFriendRecommendations({runTransaction:work=>store.runTransaction(tx=>work({...tx,listDiscoverableAccountPage:async()=>{throw new Error("must not construct candidates");}}))},clock, firestoreSocialAuthority);
  assert.deepEqual(await denied.recommend("owner","home"),ok({suggestions:[]}));
});
test("private, ineligible, current friends, blocks and valid pending requests never enter ranking",async()=>{
  for(const reason of ["private","ineligible","friend","block","pending"]){
    const {store,repo}=fixture();
    await store.runTransaction(async tx=>{
      if(reason==="private")tx.set("accounts/target_2",{...store.read("accounts/target_2"),profileVisibility:"private"});
      if(reason==="ineligible")tx.set("friend_access/target_2",{eligibilityState:"permanently-deleted"});
      if(["friend","block","pending"].includes(reason))tx.set(`friend_pairs/${friendPairKey("owner","target_2")}`,{
        accountIds:["owner","target_2"],friendship:reason==="friend",blockedByAccountIds:reason==="block"?["target_2"]:[],
        pending:reason!=="pending"?null:{requestRef:"11111111-1111-4111-8111-111111111111",senderAccountId:"owner",recipientAccountId:"target_2",
          createdAt:"2026-10-01T00:00:00.000Z",expiresAt:"2026-10-31T00:00:00.000Z"}});
    });
    const result=await repo.recommend("owner","all");assert.equal(result.ok,true,reason);
    if(result.ok)assert.equal(result.value.suggestions.some(c=>c.username==="member_target_2"),false,reason);
  }
});
test("private candidate interests produce no match; missing permitted Events producer is unavailable, not false zero",async()=>{
  const {store,repo}=fixture();
  await store.runTransaction(async tx=>{for(const id of [1,2,3,4])tx.set(`accounts/target_${id}`,{...store.read(`accounts/target_${id}`),
    fieldPrivacy:{interests:"private",location:"private",participation:"private",mapSharedWithFriends:false}});});
  assert.deepEqual(await repo.recommend("owner","home"),{ok:true,value:{suggestions:[]}});
  await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),
    fieldPrivacy:{interests:"private",location:"private",participation:"public",mapSharedWithFriends:false}}));
  const missing=await repo.recommend("owner","home");assert.equal(!missing.ok&&missing.failure.code,"SERVICE_UNAVAILABLE");
  const purposeCalls:string[]=[];
  const withEvents=new FirestoreFriendRecommendations(store,clock, firestoreSocialAuthority,{read:async(_reader,viewer,subject,purpose)=>{
    purposeCalls.push(`${viewer}:${subject}:${purpose}`);return {interestedEventIds:["event-a"],goingEventIds:["event-a"]};
  }});
  const result=await withEvents.recommend("owner","home");assert.equal(result.ok,true);
  if(result.ok){assert.equal(result.value.suggestions.length,1);assert.equal(result.value.suggestions[0]?.commonEventCount,1);}
  assert.deepEqual(purposeCalls,["owner:owner:friend_recommendation_v1","owner:target_1:friend_recommendation_v1"]);
});

test("cold/expired/pending public source is awaited outside transactions before current full ranking",async()=>{
  for(const state of ["cold","expired","pending"]){
    const {store}=fixture();
    await store.runTransaction(async tx=>tx.set("accounts/target_1",{...store.read("accounts/target_1"),fieldPrivacy:{interests:"public",location:"private",participation:"public",mapSharedWithFriends:false}}));
    let transactions=0,prepares=0,ready=false,tick=0,release!:()=>void,entered!:()=>void;
    const waiting=new Promise<void>(resolve=>{release=resolve;}),prepared=new Promise<void>(resolve=>{entered=resolve;}),reads:string[]=[];
    const guarded:FirestoreGateway={runTransaction:work=>store.runTransaction(async tx=>{transactions++;try{return await work(tx);}finally{transactions--;}})};
    const events:FriendEventProjection={prepare:async asOf=>{
      assert.equal(transactions,0,state);assert.equal(asOf,"2026-10-07T00:00:00.000Z");prepares++;entered();await waiting;ready=true;
    },read:async(_tx,viewer,subject,purpose,asOf)=>{
      assert.equal(ready,true,state);assert.equal(transactions,1);assert.equal(purpose,"friend_recommendation_v1");
      assert.equal(asOf,"2026-10-07T00:00:01.000Z");reads.push(`${viewer}:${subject}`);return {interestedEventIds:["event-a"],goingEventIds:["event-a"]};
    }};
    const producer=new FirestoreFriendRecommendations(guarded,{now:()=>ok(new Date(Date.parse("2026-10-07T00:00:00.000Z")+tick++*1000))},firestoreSocialAuthority,events);
    const result=producer.recommend("owner","all");await prepared;assert.deepEqual(reads,[]);assert.equal(prepares,1);release();
    const actual=await result;assert.equal(actual.ok,true);if(!actual.ok)continue;
    assert.deepEqual(actual.value.suggestions.map(s=>s.username),["member_target_2","member_target_1","member_target_3","member_target_4"]);
    assert.equal(actual.value.suggestions.find(s=>s.username==="member_target_1")?.commonEventCount,1);
    assert.deepEqual(reads,["owner:owner","owner:target_1"]);assert.equal(prepares,1);
  }
});

test("missing owner/withdrawn consent skips public preparation and candidate construction",async()=>{
  for(const absent of [false,true]){
    const {store}=fixture();await store.runTransaction(async tx=>tx.set("accounts/owner",{...store.read("accounts/owner"),optionalProcessingConsent:"rejected"}));
    if(absent)await store.runTransaction(async tx=>tx.delete!(`accounts/owner`));
    let prepares=0;
    const guarded:FirestoreGateway={runTransaction:work=>store.runTransaction(tx=>work({...tx,listDiscoverableAccountPage:async()=>{throw Error("candidate read must not start");}}))};
    const producer=new FirestoreFriendRecommendations(guarded,clock,firestoreSocialAuthority,{prepare:async()=>{prepares++;},read:async()=>{throw Error("personal event read must not start");}});
    const result=await producer.recommend("owner","home");assert.equal(prepares,0);assert.equal(result.ok,!absent);
    if(result.ok)assert.deepEqual(result.value.suggestions,[]);
  }
});

test("source preparation failure remains unavailable and cannot silently produce interest-only scores",async()=>{
  const {store}=fixture();let candidates=0,reads=0,prepares=0;
  const guarded:FirestoreGateway={runTransaction:work=>store.runTransaction(tx=>work({...tx,listDiscoverableAccountPage:async()=>{candidates++;return [];}}))};
  const producer=new FirestoreFriendRecommendations(guarded,clock,firestoreSocialAuthority,{prepare:async()=>{prepares++;throw Error("public provider unavailable");},read:async()=>{reads++;return {interestedEventIds:[],goingEventIds:[]};}});
  const result=await producer.recommend("owner","home");assert.equal(!result.ok&&result.failure.code,"SERVICE_UNAVAILABLE");
  assert.equal(prepares,1);assert.equal(candidates,0);assert.equal(reads,0);
});

test("consent revoked during source preparation is reread before constructing or ranking candidates",async()=>{
  const {store}=fixture();let candidates=0,reads=0;
  const guarded:FirestoreGateway={runTransaction:work=>store.runTransaction(tx=>work({...tx,listDiscoverableAccountPage:async()=>{candidates++;return [];}}))};
  const producer=new FirestoreFriendRecommendations(guarded,clock,firestoreSocialAuthority,{prepare:async()=>{
    await store.runTransaction(async tx=>tx.set("accounts/owner",{...store.read("accounts/owner"),optionalProcessingConsent:"rejected"}));
  },read:async()=>{reads++;return {interestedEventIds:[],goingEventIds:[]};}});
  assert.deepEqual(await producer.recommend("owner","home"),ok({suggestions:[]}));assert.equal(candidates,0);assert.equal(reads,0);
});
