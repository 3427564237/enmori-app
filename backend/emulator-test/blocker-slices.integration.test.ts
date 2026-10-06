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
