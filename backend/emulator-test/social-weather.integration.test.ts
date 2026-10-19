import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { initializeApp,deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import Fastify from "fastify";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId,createIdempotencyIdentity } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirebaseAdminCheckInHistoryGateway } from "../src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { AesGcmHistoryCursorCodec } from "../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { CreateCheckIn } from "../src/check-ins/application/create-check-in.js";
import { FirestoreFriendRepository,friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { FirestoreSocialRepository } from "../src/friends/infrastructure/firestore-social-repository.js";
import { registerSocialModule } from "../src/friends/transport/register-social-module.js";
import { ok } from "../src/shared/domain/result.js";
const environment=requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId,"demo-enmori-rmvp01a-r10");
test("actual isolated SDK: competing weather saves, current privacy, precise point read and bidirectional removal",async t=>{
  const app=initializeApp({projectId:environment.projectId},`social-weather-${randomUUID()}`),auth=getAuth(app),store=getFirestore(app);
  const owned=new Set<string>(),users:string[]=[],gateway=new FirebaseAdminFirestoreGateway(store),server=Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
  const instant="2026-10-20T00:00:00.000Z",clock={now:()=>ok(new Date(instant))},nonce=randomUUID().replaceAll("-",""),
    owner=`sw_o_${nonce}`,target=`sw_t_${nonce}`,username=`sw_${nonce.slice(0,15)}`,othername=`sw_${nonce.slice(0,14)}z`;
  const pairPath=`friend_pairs/${friendPairKey(owner,target)}`;owned.add(pairPath);
  const seed=async(path:string,data:Record<string,unknown>)=>{owned.add(path);await store.doc(path).create(data);};
  try{
    for(const [id,name]of [[owner,username],[target,othername]]){
      users.push(id!);await auth.createUser({uid:id!});
      await seed(`auth_bindings/${createAuthBindingDocumentId(id!)}`,{accountId:id});
      await seed(`accounts/${id}`,{username:name,displayName:name,profileVisibility:"friends_only",profileRevision:1,
        optionalProcessingConsent:"rejected",checkInVisibility:"private",onboardingCompletedAt:instant,
        fieldPrivacy:{interests:"private",location:"friends_only",participation:"private",mapSharedWithFriends:true}});
      await seed(`friend_access/${id}`,{eligibilityState:"eligible"});await seed(`friend_lists/${id}`,{initialized:true});
      await seed(`username_reservations/${name}`,{accountId:id});
    }
    const custom=await auth.createCustomToken(owner),signed=await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=controlled-emulator-key`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:custom,returnSecureToken:true})});
    assert.equal(signed.ok,true);const token=(await signed.json() as {idToken:string}).idToken;assert.equal(typeof token,"string");
    const history=new FirebaseAdminCheckInHistoryGateway(store),cursor=new AesGcmHistoryCursorCodec(Buffer.alloc(32,17)),social=new FirestoreSocialRepository(gateway,history,cursor,clock);
    await registerSocialModule(server,{identity:new FirebaseIdentityVerifier(auth),store:gateway,history,cursor,clock,weather:{current:async()=>undefined}});
    await t.test("fresh accounts send/accept without seeded pair",async()=>{
      const requests=new FirestoreFriendRepository(gateway,clock);
      assert.equal((await requests.lookup(owner,othername,true)).ok,true);
      const inbox=await requests.inbox(target);if(!inbox.ok)return assert.fail("expected inbox");
      assert.equal(inbox.value.requests.length,1);const ref=inbox.value.requests[0]!.requestRef;
      owned.add(`friend_inboxes/${target}/requests/${ref}`);
      assert.equal((await requests.act(target,ref,"accept")).ok,true);
    });
    let calls=0,release!:(value:undefined)=>void,entered!:()=>void;
    const ready=new Promise<void>(resolve=>{entered=resolve;}),pending=new Promise<undefined>(resolve=>{release=resolve;});
    const weather={current:async()=>{calls++;entered();await pending;return {projectionVersion:"weather_projection_v1" as const,source:"open_meteo" as const,
      observedAt:instant,temperatureCelsius:27.2,condition:"clear" as const};}};
    const repo=new FirestoreCheckInRepository(gateway,weather,clock);let number=0;
    const create=new CreateCheckIn(repo,clock,{generate:()=>{const id=`sw_${nonce}_${++number}`;owned.add(`check_ins/${id}`);return ok(id);}});
    const key=`SW_${nonce}`;owned.add(`idempotency/${createIdempotencyIdentity({scope:target,operation:"create_check_in",rawKey:key}).documentId}`);
    const input={principal:{firebaseUid:target},note:"Synthetic location fixture",idempotencyKey:key,checkInVisibility:"friends_only" as const,
      location:{latitude:1.3521,longitude:103.8198},weatherRequest:{position:{latitude:1.4,longitude:103.8},expectedSettingsRevision:0}};
    let savedId="";
    await t.test("concurrent same-key transactions issue at most one provider call and commit one record",async()=>{
      const first=create.execute(input);await ready;
      const second=await create.execute(input);release(undefined);const initial=await first;
      assert.equal(initial.ok,true);assert.equal(second.ok,true);assert.equal(calls,1);
      if(!initial.ok||!second.ok)return;
      assert.equal(initial.value.checkIn.checkInId,second.value.checkIn.checkInId);savedId=second.value.checkIn.checkInId;
      assert.equal((await store.collection("check_ins").where("ownerAccountId","==",target).get()).size,1);
    });
    await t.test("actual Auth/HTTP profile, metadata activity and exact-point authorization",async()=>{
      for(const id of [owner,target])await store.doc(`accounts/${id}`).update({optionalProcessingConsent:"accepted"});
      for(const path of [`/v1/people/${othername}`,`/v1/people/${othername}/check-ins/${savedId}`,"/v1/me/friends/activity?view=all&category=check_in_created"]){
        const response=await server.inject({method:"GET",url:path,headers:{authorization:`Bearer ${token}`}});
        assert.equal(response.statusCode,200,response.body);assert.equal(response.headers["cache-control"],"no-store");
        if(path.includes("/activity?"))assert.equal(response.json().activities.length,1);
      }
      const read=await social.record(owner,othername,savedId);assert.equal(read.ok&&read.value.location?.latitude,1.3521);
      await store.doc(`accounts/${target}`).update({"fieldPrivacy.mapSharedWithFriends":false});
      const hidden=await social.record(owner,othername,savedId);assert.equal(hidden.ok,true);if(hidden.ok)assert.equal(hidden.value.location,undefined);
    });
    await t.test("private Special Care and atomic bidirectional removal revoke old record and list",async()=>{
      const before=await social.profile(owner,othername);if(!before.ok)return assert.fail("profile expected");
      const care=await social.care(owner,othername,{specialCare:true,expectedRevision:before.value.friendshipRevision});assert.equal(care.ok,true);
      if(!care.ok)return;
      const peer=await social.profile(target,username);assert.equal(peer.ok&&peer.value.specialCare,false);
      const pair=(await store.doc(pairPath).get()).data()!;for(const [id,ref]of Object.entries(pair.listRefs))owned.add(`friend_lists/${id}/members/${ref}`);
      assert.equal((await social.remove(owner,othername,care.value.friendshipRevision)).ok,true);
      assert.equal((await social.record(owner,othername,savedId)).ok,false);
      assert.equal((await store.collection(`friend_lists/${owner}/members`).get()).empty,true);
      assert.equal((await store.collection(`friend_lists/${target}/members`).get()).empty,true);
    });
  }finally{
    await server.close();
    const pair=(await store.doc(pairPath).get()).data();
    if(pair?.listRefs)for(const [id,ref]of Object.entries(pair.listRefs)){
      assert.ok(id===owner||id===target);owned.add(`friend_lists/${id}/members/${ref}`);
    }
    if(pair?.pending?.requestRef)owned.add(`friend_inboxes/${pair.pending.recipientAccountId}/requests/${pair.pending.requestRef}`);
    for(const path of owned)await store.doc(path).delete();
    for(const uid of users)await auth.deleteUser(uid);
    assert.equal((await Promise.all([...owned].map(path=>store.doc(path).get()))).some(doc=>doc.exists),false);
    await deleteApp(app);console.log(`owned cleanup confirmed: ${owned.size} documents, ${users.length} Auth users`);
  }
});
