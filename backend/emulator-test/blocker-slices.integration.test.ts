import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beforeEach, after, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirestoreFriendRepository,friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { FriendRequests } from "../src/friends/application/friend-requests.js";
import { FirestoreEventDetailRepository } from "../src/event-detail/infrastructure/firestore-event-detail-repository.js";
import { GetEventDetail } from "../src/event-detail/application/get-event-detail.js";
import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { FirestoreAccountPreferencesRepository } from "../src/account/infrastructure/firestore-account-preferences-repository.js";
import { CreateCheckIn } from "../src/check-ins/application/create-check-in.js";
import { GetCheckIn } from "../src/check-ins/application/get-check-in.js";
import { OwnAccountPreferences } from "../src/account/application/own-account-preferences.js";
import { CryptoOpaqueIdGenerator } from "../src/shared/infrastructure/crypto-opaque-id-generator.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { ok,err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { myFriendsSeed, measuredGateway, entryRef } from "../test/support/my-friends-fixture.js";
import type { FirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { Buffer } from "node:buffer";
import { emptyRecommendationProfile } from "../src/recommendation-profile/domain/recommendation-profile.js";

const env=requireControlledEmulatorEnvironment(process.env);assert.equal(env.projectId,"demo-enmori-rmvp01a-r10");
const firebase=initializeApp({projectId:env.projectId},"s3-blocker-emulator"),auth=getAuth(firebase),firestore=getFirestore(firebase),gateway=new FirebaseAdminFirestoreGateway(firestore);
const instant="2026-10-05T00:00:00.000Z",url="https://example.invalid/synthetic-event";
let now=new Date(instant);const clock={now:()=>ok(new Date(now))};
const friends=new FirestoreFriendRepository(gateway,clock);
const tokens:Record<string,string>={};
async function reset() { requireControlledEmulatorEnvironment(process.env);for(const u of [`http://${env.authHost}/emulator/v1/projects/${env.projectId}/accounts`,`http://${env.firestoreHost}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`]) assert.equal((await fetch(u,{method:"DELETE"})).ok,true); }
beforeEach(async()=>{
 await reset();now=new Date(instant);const password=`${randomUUID()}Aa1!`;
 for(const id of ["a","b","c"]) {
  const email=`s3-blocker-${id}@example.invalid`;await auth.createUser({uid:id,email,password});
  await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(id)}`).create({accountId:id});
  await firestore.doc(`accounts/${id}`).create({username:`member_${id}`,displayName:`Member ${id}`,profileVisibility:"private",profileRevision:1,optionalProcessingConsent:"rejected",checkInVisibility:"private",onboardingCompletedAt:instant});
  await firestore.doc(`username_reservations/member_${id}`).create({accountId:id});await firestore.doc(`friend_access/${id}`).create({eligibilityState:"eligible"});
  await firestore.doc(`friend_lists/${id}`).create({initialized:true});
  const response=await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(response.ok,true);tokens[id]=(await response.json() as {idToken:string}).idToken;
 }
 await firestore.doc(`friend_pairs/${friendPairKey("a","b")}`).create({accountIds:["a","b"],blockedByAccountIds:[],friendship:false,pending:null});
});
after(async()=>{await reset();await deleteApp(firebase);});
async function ref() {const result=await friends.inbox("b");if(!result.ok) assert.fail();return result.value.requests[0]!.requestRef;}
async function pair() {return (await firestore.doc(`friend_pairs/${friendPairKey("a","b")}`).get()).data()!;}
const unavailable={execute:async()=>err(appFailure("SERVICE_UNAVAILABLE"))};
async function app() {const checkins=new FirestoreCheckInRepository(gateway);return buildApp({identityVerifier:new FirebaseIdentityVerifier(auth),completeOnboarding:unavailable,getOnboarding:unavailable,getInterestTags:unavailable,getOwnInterests:unavailable,replaceOwnInterests:unavailable,createCheckIn:new CreateCheckIn(checkins,clock,new CryptoOpaqueIdGenerator()),getCheckIn:new GetCheckIn(checkins),accountPreferences:new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway)),isolatedSlices:{environment:process.env,friends:new FriendRequests(friends,clock),eventDetail:new GetEventDetail(new FirestoreEventDetailRepository(gateway,clock,[url]))}});}

test("Emulator concurrent same/opposite sends produce one pending and one inbox reference",async()=>{
 const outcomes=await Promise.all([friends.lookup("a","member_b",true),friends.lookup("a","member_b",true),friends.lookup("b","member_a",true)]);assert.equal(outcomes.every(r=>r.ok),true);
 const state=await pair();assert.equal(state.friendship,false);assert.notEqual(state.pending,null);
 const refs=await firestore.collection(`friend_inboxes/${state.pending.recipientAccountId}/requests`).get();assert.equal(refs.size,1);assert.equal(refs.docs[0]!.id,state.pending.requestRef);
});
test("Emulator accept/decline race has one winner and stale references cannot consume replacement",async()=>{
 await friends.lookup("a","member_b",true);const old=await ref();
 const outcomes=await Promise.all([friends.act("b",old,"decline"),friends.act("b",old,"accept")]);assert.equal(outcomes.filter(r=>r.ok).length,1);assert.equal((await pair()).pending,null);
 if(!(await pair()).friendship) {await friends.lookup("a","member_b",true);const fresh=await ref();assert.notEqual(old,fresh);assert.deepEqual(await friends.act("b",old,"accept"),err("request_unavailable"));assert.equal(await ref(),fresh);}
});
for(const kind of ["block","delete"] as const) test(`Emulator ${kind}/accept race preserves the committed transition boundary`,async()=>{
 await friends.lookup("a","member_b",true);const requestRef=await ref();
 const [accepted]=await Promise.all([friends.act("b",requestRef,"accept"),friends.setFixtureProtection("a","b",kind==="block" ? {blockedByAccountIds:["a"]} : {permanentlyDeletedAccountId:"a"})]);
 const state=await pair();assert.equal(state.pending,null);assert.equal(state.friendship,accepted.ok);assert.equal((await firestore.collection("friend_inboxes/b/requests").get()).size,0);assert.equal((await friends.lookup("b","member_a",false)).ok,false);
 for (const id of ["a", "b"]) assert.equal((await firestore.collection(`friend_lists/${id}/members`).get()).size, kind === "block" && accepted.ok ? 1 : 0);
});

test("Emulator My Friends acceptance atomically creates both pointers, fresh privacy and eligibility apply on each page", async () => {
 await friends.lookup("a", "member_b", true); const requestRef = await ref();
 assert.deepEqual(await friends.act("b", requestRef, "accept"), ok({result:"accepted"}));
 const state = await pair(); assert.notEqual(state.listRefs.a, state.listRefs.b);
 for (const id of ["a", "b"]) {
  const rows = await firestore.collection(`friend_lists/${id}/members`).get(); assert.equal(rows.size,1);
  assert.equal(rows.docs[0]!.id,state.listRefs[id]); assert.deepEqual(rows.docs[0]!.data(),{pairKey:friendPairKey("a","b")});
 }
 assert.deepEqual(await friends.act("b",requestRef,"accept"),err("request_unavailable"));
 assert.deepEqual(await friends.listFriends("a"),ok({friends:[],nextCursor:null}));
 await firestore.doc("accounts/b").update({profileVisibility:"friends_only"});
 const api = await app(); try {
  const reply = await api.inject({url:"/v1/me/friends",headers:{authorization:`Bearer ${tokens.a}`}});
  assert.equal(reply.statusCode,200); assert.deepEqual(reply.json(),{friends:[{username:"member_b",displayName:"Member b"}],nextCursor:null});
 } finally {await api.close();}
 for (const blocked of ["a","b"]) {
  await friends.setFixtureProtection("a","b",{blockedByAccountIds:[blocked]});
  assert.deepEqual(await friends.listFriends("a"),ok({friends:[],nextCursor:null}));
  await friends.setFixtureProtection("a","b",{blockedByAccountIds:[]});
 }
 await firestore.doc("accounts/b").update({displayName:null});
 assert.deepEqual(await friends.listFriends("a"),ok({friends:[{username:"member_b",displayName:"member_b"}],nextCursor:null}));
 await friends.setFixtureProtection("a","b",{permanentlyDeletedAccountId:"b"});
 for (const id of ["a","b"]) assert.equal((await firestore.collection(`friend_lists/${id}/members`).get()).size,0);
 assert.equal((await pair()).listRefs,undefined); assert.equal((await pair()).friendship,true);
});

test("Emulator HTTP acceptance shows an unnamed sender in both lists and searches, while privacy still hides the row", async () => {
 await firestore.doc("accounts/a").update({profileVisibility:"friends_only",displayName:null,recommendationProfile:{...emptyRecommendationProfile,discoverable:true}});
 await firestore.doc("accounts/b").update({profileVisibility:"friends_only"});
 const api = await app();
 try {
  const sender={authorization:`Bearer ${tokens.a}`},recipient={authorization:`Bearer ${tokens.b}`};
  assert.equal((await api.inject({method:"POST",url:"/v1/friend-requests",headers:sender,payload:{username:"member_b"}})).statusCode,200);
  const inbox=await api.inject({url:"/v1/me/friend-requests",headers:recipient});
  assert.equal(inbox.statusCode,200);assert.equal(inbox.json().requests[0].displayName,"member_a");
  assert.equal((await api.inject({method:"POST",url:`/v1/friend-requests/${inbox.json().requests[0].requestRef}/accept`,headers:recipient})).statusCode,200);
  for (const [headers,expected] of [[sender,{username:"member_b",displayName:"Member b"}],[recipient,{username:"member_a",displayName:"member_a"}]] as const) {
   const reply=await api.inject({url:"/v1/me/friends",headers});assert.equal(reply.statusCode,200);
   assert.deepEqual(reply.json(),{friends:[expected],nextCursor:null});
  }
  const matched=await api.inject({url:"/v1/me/friends/search?q=MEMBER_A",headers:recipient});assert.equal(matched.statusCode,200);
  assert.deepEqual(matched.json(),{friends:[{username:"member_a",displayName:"member_a"}],nextCursor:null});
  assert.equal((await firestore.doc("accounts/a").get()).data()!.displayName,null);
  await firestore.doc("accounts/a").update({profileVisibility:"private"});
  for(const url of ["/v1/me/friends","/v1/me/friends/search?q=member_a"]){
   const hidden=await api.inject({url,headers:recipient});assert.equal(hidden.statusCode,200);assert.deepEqual(hidden.json(),{friends:[],nextCursor:null});
  }
 } finally {await api.close();}
});

test("Emulator failed transaction commits neither acceptance nor either pointer", async () => {
 await friends.lookup("a","member_b",true); const requestRef = await ref();
 const failing: FirestoreGateway = {runTransaction: work => gateway.runTransaction(async tx => {
  await work(tx); throw new Error("synthetic non-retryable commit abort");
 })};
 const rejected = new FirestoreFriendRepository(failing,clock);
 assert.deepEqual(await rejected.act("b",requestRef,"accept"),err("dependency_unavailable"));
 assert.equal((await pair()).friendship,false); assert.equal((await pair()).pending.requestRef,requestRef);
 for (const id of ["a","b"]) assert.equal((await firestore.collection(`friend_lists/${id}/members`).get()).size,0);
 assert.equal((await firestore.collection("friend_inboxes/b/requests").get()).size,1);
});

test("Emulator racing Profile visibility and requester eligibility changes are reread on a fresh list", async () => {
 await friends.lookup("a","member_b",true); assert.equal((await friends.act("b",await ref(),"accept")).ok,true);
 await firestore.doc("accounts/b").update({profileVisibility:"public"});
 const [racingPage] = await Promise.all([friends.listFriends("a"),firestore.doc("accounts/b").update({profileVisibility:"private"})]);
 if (!racingPage.ok) assert.fail();
 assert.ok(racingPage.value.friends.length === 0 || racingPage.value.friends.length === 1);
 assert.deepEqual(await friends.listFriends("a"),ok({friends:[],nextCursor:null}));
 await firestore.doc("accounts/b").update({profileVisibility:"friends_only"});
 const [racingOwner] = await Promise.all([friends.listFriends("a"),firestore.doc("friend_access/a").update({eligibilityState:"temporary-ineligible"})]);
 assert.ok(racingOwner.ok || racingOwner.failure === "forbidden");
 const measured = measuredGateway(gateway), fresh = new FirestoreFriendRepository(measured.gateway,clock);
 assert.deepEqual(await fresh.listFriends("a"),err("forbidden"));
 assert.equal(measured.attempts[0]!.queries,0);
 assert.equal(measured.attempts[0]!.paths.some(path=>path.startsWith("friend_pairs/")),false);
});

test("Emulator My Friends ordering and 106-read ceiling hold per SDK transaction attempt including retry", async () => {
 const batch = firestore.batch(); for (const [path,data] of Object.entries(myFriendsSeed(42))) batch.set(firestore.doc(path),data); await batch.commit();
 let first = true;
 const retrying: FirestoreGateway = {runTransaction: work => gateway.runTransaction(async tx => {
  const result = await work(tx);
  if (first) {first=false; throw Object.assign(new Error("synthetic ABORTED to exercise SDK retry"),{code:10});}
  return result;
 })};
 const measured = measuredGateway(retrying), repo = new FirestoreFriendRepository(measured.gateway,clock);
 const cursor = Buffer.from(entryRef(1)).toString("base64url");
 const page = await repo.listFriends("owner",cursor); if (!page.ok) assert.fail();
 assert.deepEqual(page.value.friends.map(row=>row.username),Array.from({length:20},(_,i)=>`member_target_${i+2}`));
 assert.equal(page.value.nextCursor,Buffer.from(entryRef(21)).toString("base64url"));
 assert.equal(measured.attempts.length,2);
 for (const attempt of measured.attempts) {
  assert.equal(attempt.queries,1); assert.equal(attempt.scanned,21); assert.equal(attempt.paths.length+attempt.scanned,106);
  assert.equal(attempt.paths.some(path=>path.includes("target_22")),false);
 }
 console.log(JSON.stringify({case:"my-friends-read-bound",transactionAttempts:measured.attempts.length,readsPerAttempt:measured.attempts.map(attempt=>attempt.paths.length+attempt.scanned),retry:"injected-ABORTED"}));
 const protect = firestore.batch(); for(let n=1;n<=20;n++) protect.update(firestore.doc(`accounts/target_${n}`),{profileVisibility:"private"}); await protect.commit();
 assert.deepEqual(await friends.listFriends("owner"),ok({friends:[],nextCursor:Buffer.from(entryRef(20)).toString("base64url")}));
 assert.deepEqual(await friends.listFriends("owner",Buffer.from(entryRef(1001)).toString("base64url")),err("invalid_input"));
 await firestore.doc(`friend_lists/owner/members/${entryRef(1)}`).delete();
 assert.deepEqual(await friends.listFriends("owner",cursor),err("invalid_input"));
 await firestore.doc("friend_lists/owner").delete();
 assert.deepEqual(await friends.listFriends("owner"),err("dependency_unavailable"));
});
test("Emulator exact expiry and temporarily unavailable recipient never create false friendship",async()=>{
 await friends.lookup("a","member_b",true);const requestRef=await ref();now=new Date("2026-11-04T00:00:00.000Z");
 assert.deepEqual(await friends.inbox("b"),ok({requests:[],nextCursor:null}));assert.deepEqual(await friends.act("b",requestRef,"accept"),err("request_unavailable"));assert.equal((await pair()).friendship,false);
 now=new Date(instant);await friends.lookup("a","member_b",true);const fresh=await ref();await friends.setFixtureProtection("a","b",{temporaryAccountId:"b"});assert.deepEqual(await friends.act("b",fresh,"accept"),err("forbidden"));assert.notEqual((await pair()).pending,null);
});
test("Emulator authenticated Friend HTTP chain protects identity and supports accept/re-read",async()=>{
 const api=await app();try{
  const headers={authorization:`Bearer ${tokens.a}`};
  assert.equal((await api.inject({method:"POST",url:"/v1/friend-requests",headers,payload:{username:"member_b"}})).statusCode,200);
  const inbox=await api.inject({url:"/v1/me/friend-requests",headers:{authorization:`Bearer ${tokens.b}`}});const requestRef=inbox.json().requests[0].requestRef;
  assert.equal((await api.inject({method:"POST",url:`/v1/friend-requests/${requestRef}/accept`,headers:{authorization:`Bearer ${tokens.c}`}})).statusCode,404);
  assert.equal((await api.inject({method:"POST",url:`/v1/friend-requests/${requestRef}/accept`,headers:{authorization:`Bearer ${tokens.b}`}})).statusCode,200);
  const fresh=await api.inject({method:"POST",url:"/v1/friends/lookup",headers,payload:{username:"member_b"}});assert.equal(fresh.json().target.relationshipState,"already_friends");
 }finally{await api.close();}
});
test("Emulator Check-in snapshots Settings in the same transaction and retains old/replayed/legacy values",async()=>{
 const api=await app();try{
  const headers={authorization:`Bearer ${tokens.a}`};let revision=0;const originalRecords:Record<string,string>={};
  for(const visibility of ["friends_only","public","private"]) {
   const setting=await api.inject({method:"PUT",url:"/v1/me/settings",headers,payload:{checkInVisibility:visibility,optionalProcessingConsent:"rejected",expectedRevision:revision++}});assert.equal(setting.statusCode,200);
   const key=randomUUID(),body={note:`Synthetic ${visibility}`};const commandHeaders={...headers,"idempotency-key":key};
   const created=await api.inject({method:"POST",url:"/v1/check-ins",headers:commandHeaders,payload:body});assert.equal(created.statusCode,201);const checkin=created.json().checkIn;assert.equal(checkin.checkInVisibility,visibility);originalRecords[checkin.checkInId]=visibility;
   await firestore.doc("accounts/a").update({checkInVisibility:visibility==="private" ? "public" : "private"});
   const replay=await api.inject({method:"POST",url:"/v1/check-ins",headers:commandHeaders,payload:body});assert.equal(replay.statusCode,200);assert.deepEqual(replay.json(),created.json());
  }
  for(const [id,visibility] of Object.entries(originalRecords)) {const read=await api.inject({url:`/v1/check-ins/${id}`,headers});assert.equal(read.json().checkIn.checkInVisibility,visibility);assert.equal((await firestore.doc(`check_ins/${id}`).get()).data()!.checkInVisibility,visibility);}
  await firestore.doc("check_ins/legacy").create({ownerAccountId:"a",note:"Legacy",createdAt:instant});const legacy=await api.inject({url:"/v1/check-ins/legacy",headers});assert.equal(Object.hasOwn(legacy.json().checkIn,"checkInVisibility"),false);
  const extra=await api.inject({method:"POST",url:"/v1/check-ins",headers:{...headers,"idempotency-key":randomUUID()},payload:{note:"Extra",checkInVisibility:"public"}});assert.equal(extra.statusCode,400);
 }finally{await api.close();}
});
test("Emulator overlapping Settings/save takes one consistent value, leaves each old snapshot stable",async()=>{
 const preferences=new FirestoreAccountPreferencesRepository(gateway),checkins=new CreateCheckIn(new FirestoreCheckInRepository(gateway),clock,new CryptoOpaqueIdGenerator());
 const [setting,created]=await Promise.all([preferences.saveSettings("a",{checkInVisibility:"friends_only",optionalProcessingConsent:"rejected",expectedRevision:0}),checkins.execute({principal:{firebaseUid:"a"},note:"Race",idempotencyKey:randomUUID()})]);
 assert.equal(setting.kind,"saved");assert.equal(created.ok,true);if(!created.ok)assert.fail();assert.ok(["private","friends_only"].includes(created.value.checkIn.checkInVisibility!));const stored=(await firestore.doc(`check_ins/${created.value.checkIn.checkInId}`).get()).data()!;assert.equal(stored.checkInVisibility,created.value.checkIn.checkInVisibility);
});
test("Emulator Detail uses isolated separate records, rejects expired/unsafe data and no recommendation mutation",async()=>{
 const record={title:"Synthetic Detail",startAt:"2026-10-06T00:00:00.000000001Z",externalSourceUrl:url,available:true,validUntil:"2026-10-07T00:00:00.000Z"};
 await firestore.doc("event_details/ev").create(record);const api=await app();try{
  const headers={authorization:`Bearer ${tokens.a}`};const read=await api.inject({url:"/v1/events/ev",headers});assert.equal(read.statusCode,200);assert.equal(read.json().event.startAt,record.startAt);assert.equal(Object.hasOwn(read.json().event,"endAt"),false);assert.equal((await firestore.collection("events").get()).size,0);
  await firestore.doc("event_details/ev").update({externalSourceUrl:"https://example.invalid/unsafe"});assert.equal((await api.inject({url:"/v1/events/ev",headers})).statusCode,404);
  await firestore.doc("event_details/ev").set({...record,validUntil:instant});assert.equal((await api.inject({url:"/v1/events/ev",headers})).statusCode,404);
  await auth.updateUser("a",{disabled:true});assert.equal((await api.inject({url:"/v1/events/ev",headers})).statusCode,403);
 }finally{await api.close();}
});


test("Emulator FS03 search covers 0/20/21, empty continuations, actual 106 gets and SDK retry", async () => {
 const {encodeFriendSearchCursor}=await import("../src/friends/domain/friend-search.js");
 for(const count of [0,20,21,42]){
  await reset();const batch=firestore.batch();for(const [path,data] of Object.entries(myFriendsSeed(count)))batch.set(firestore.doc(path),data);await batch.commit();
  const result=await friends.searchFriends("owner",{q:"member"});if(!result.ok)assert.fail();
  assert.equal(result.value.friends.length,Math.min(count,20));assert.equal(result.value.nextCursor,count>20?encodeFriendSearchCursor("member",entryRef(20)):null);
 }
 const q="target_42";let page=await friends.searchFriends("owner",{q});if(!page.ok)assert.fail();
 assert.deepEqual(page.value,{friends:[],nextCursor:encodeFriendSearchCursor(q,entryRef(20))});
 let first=true;const retrying:FirestoreGateway={runTransaction:work=>gateway.runTransaction(async tx=>{const result=await work(tx);if(first){first=false;throw Object.assign(new Error("synthetic ABORTED"),{code:10});}return result;})};
 const measured=measuredGateway(retrying),repo=new FirestoreFriendRepository(measured.gateway,clock);
 page=await repo.searchFriends("owner",{q,cursor:page.value.nextCursor});if(!page.ok)assert.fail();
 assert.deepEqual(page.value,{friends:[],nextCursor:encodeFriendSearchCursor(q,entryRef(40))});
 assert.equal(measured.attempts.length,2);
 for(const attempt of measured.attempts){assert.equal(attempt.queries,1);assert.equal(attempt.scanned,21);assert.equal(attempt.paths.length+attempt.scanned,106);assert.equal(attempt.paths.some(p=>p.includes("target_41")),false);}
 console.log(JSON.stringify({case:"friend-search-read-bound",transactionAttempts:measured.attempts.length,readsPerAttempt:measured.attempts.map(a=>a.paths.length+a.scanned),retry:"injected-ABORTED"}));
 page=await friends.searchFriends("owner",{q,cursor:page.value.nextCursor});if(!page.ok)assert.fail();assert.deepEqual(page.value,{friends:[{username:"member_target_42",displayName:"Member target_42"}],nextCursor:null});
 const before=(await firestore.collection("friend_pairs").get()).docs.map(d=>d.data());
 const aborting:FirestoreGateway={runTransaction:work=>gateway.runTransaction(async tx=>{await work(tx);throw new Error("synthetic nonretryable abort");})};
 assert.deepEqual(await new FirestoreFriendRepository(aborting,clock).searchFriends("owner",{q:"member"}),err("dependency_unavailable"));
 assert.deepEqual((await firestore.collection("friend_pairs").get()).docs.map(d=>d.data()),before);
 await firestore.doc("friend_access/target_1").delete();assert.deepEqual(await friends.searchFriends("owner",{q:"no match"}),err("dependency_unavailable"));
});

test("Emulator FS04 current authorization and concurrent rename/privacy/blocks/eligibility remain coherent",async()=>{
 await friends.lookup("a","member_b",true);assert.equal((await friends.act("b",await ref(),"accept")).ok,true);
 await firestore.doc("accounts/b").update({profileVisibility:"friends_only",displayName:"Alice"});
 const api=await app();try{
  const response=await api.inject({url:"/v1/me/friends/search?q=ALICE",headers:{authorization:`Bearer ${tokens.a}`}});
  assert.equal(response.statusCode,200);assert.deepEqual(response.json(),{friends:[{username:"member_b",displayName:"Alice"}],nextCursor:null});
 }finally{await api.close();}
 for(const kind of ["rename","privacy","block-owner","block-target","eligibility"]){
  await firestore.doc("accounts/b").update({profileVisibility:"friends_only",displayName:"Alice"});
  await firestore.doc("friend_access/b").set({eligibilityState:"eligible"});
  await friends.setFixtureProtection("a","b",{blockedByAccountIds:[]});
  const mutation=kind==="rename"?()=>firestore.doc("accounts/b").update({displayName:"Bob"}):kind==="privacy"?()=>firestore.doc("accounts/b").update({profileVisibility:"private"}):kind==="eligibility"?()=>firestore.doc("friend_access/b").set({eligibilityState:"temporary-ineligible"}):()=>friends.setFixtureProtection("a","b",{blockedByAccountIds:[kind==="block-owner"?"a":"b"]});
  const [racing]=await Promise.all([friends.searchFriends("a",{q:"alice"}),mutation()]);
  if(!racing.ok)assert.fail();assert.ok(racing.value.friends.length<=1);if(racing.value.friends.length)assert.equal(racing.value.friends[0]!.displayName,"Alice");
  assert.deepEqual(await friends.searchFriends("a",{q:"alice"}),ok({friends:[],nextCursor:null}));
 }
 await firestore.doc("friend_access/a").set({eligibilityState:"temporary-ineligible"});
 const measured=measuredGateway(gateway),repo=new FirestoreFriendRepository(measured.gateway,clock);
 assert.deepEqual(await repo.searchFriends("a",{}),err("forbidden"));assert.equal(measured.attempts[0]!.queries,0);
});
