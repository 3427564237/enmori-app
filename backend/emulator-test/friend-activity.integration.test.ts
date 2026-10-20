import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import Fastify from "fastify";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirestoreFriendActivity } from "../src/friend-activity/infrastructure/firestore-friend-activity.js";
import { registerFriendActivity } from "../src/friend-activity/transport/friend-activity-route.js";
import { firestoreSocialAuthority } from "../src/friends/infrastructure/social-authority.js";
import { friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { ok } from "../src/shared/domain/result.js";

const environment=requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId,"demo-enmori-rmvp01a-r10");
test("isolated actual Auth/HTTP/Firestore friend activity display and fresh revocation",async t=>{
  const app=initializeApp({projectId:environment.projectId},`activity-${randomUUID()}`);
  const auth=getAuth(app),db=getFirestore(app),owned=new Set<string>(),users:string[]=[];
  const nonce=randomUUID().replaceAll("-",""),a=`fa_a_${nonce}`,b=`fa_b_${nonce}`;
  const time="2026-10-20T00:00:00.000Z",clock={now:()=>ok(new Date(time))};
  const http=Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
  const seed=async(path:string,data:Record<string,unknown>)=>{owned.add(path);await db.doc(path).create(data);};
  const signIn=async(uid:string)=>{
    const token=await auth.createCustomToken(uid);
    const response=await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=controlled-emulator-key`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,returnSecureToken:true})});
    assert.equal(response.status,200);const body=await response.json() as {idToken:string};
    return {authorization:`Bearer ${body.idToken}`};
  };
  try{
    for(const [index,id] of [a,b].entries()){
      users.push(id);await auth.createUser({uid:id});
      const name=`fa_${nonce.slice(0,12)}${index}`;
      await seed(`accounts/${id}`,{username:name,displayName:"Synthetic friend",profileVisibility:"friends_only",profileRevision:1,
        optionalProcessingConsent:"accepted",checkInVisibility:"private",onboardingCompletedAt:time});
      await seed(`auth_bindings/${createAuthBindingDocumentId(id)}`,{accountId:id});
      await seed(`friend_access/${id}`,{eligibilityState:"eligible"});
      await seed(`username_reservations/${name}`,{accountId:id});
    }
    const key=friendPairKey(a,b),record=`check_ins/fa_record_${nonce}`;
    await seed(`friend_pairs/${key}`,{accountIds:[a,b].sort(),friendship:true,blockedByAccountIds:[],pending:null});
    await seed(`friend_lists/${a}/members/fa_${nonce}`,{pairKey:key});
    await seed(record,{ownerAccountId:b,note:"Synthetic shared note",mood:"Calm",createdAt:time,checkInVisibility:"friends_only",location:{latitude:1,longitude:2}});
    const gateway=new FirebaseAdminFirestoreGateway(db);
    await registerFriendActivity(http,new FirebaseIdentityVerifier(auth),new FirestoreFriendActivity(gateway,clock,firestoreSocialAuthority));
    const headers=await signIn(a),url="/v1/me/friends/activity?view=all&category=check_in_created";
    await t.test("authorized other-user display and Home share exact current source, no location",async()=>{
      const all=await http.inject({url,headers}),home=await http.inject({url:url.replace("view=all","view=home"),headers});
      assert.equal(all.statusCode,200,all.body);assert.equal(all.headers["cache-control"],"no-store");
      assert.deepEqual(all.json(),home.json());assert.deepEqual(all.json().activities[0].checkIn,{note:"Synthetic shared note",mood:"Calm"});
      assert.equal(all.body.includes("location"),false);
      assert.deepEqual((await http.inject({url,headers:await signIn(b)})).json().activities,[]);
    });
    await t.test("separate SDK edit and independent fresh Auth read returns new authorized display",async()=>{
      await db.doc(record).update({note:"Synthetic changed note",mood:"Hopeful"});
      const read=await http.inject({url,headers:await signIn(a)});assert.equal(read.statusCode,200);
      assert.deepEqual(read.json().activities[0].checkIn,{note:"Synthetic changed note",mood:"Hopeful"});
    });
    await t.test("record privacy and removal invalidate old source identity",async()=>{
      await db.doc(record).update({checkInVisibility:"private"});assert.deepEqual((await http.inject({url,headers})).json().activities,[]);
      await db.doc(record).update({checkInVisibility:"friends_only"});
      await db.doc(record).delete();assert.deepEqual((await http.inject({url,headers})).json().activities,[]);
      await db.doc(record).create({ownerAccountId:b,note:"Synthetic restored fixture",createdAt:time,checkInVisibility:"friends_only"});
    });
    await t.test("withdrawal and current relationship revoke without erasing persisted Check-in",async()=>{
      await db.doc(`accounts/${b}`).update({optionalProcessingConsent:"rejected"});
      assert.deepEqual((await http.inject({url,headers})).json().activities,[]);
      await db.doc(`accounts/${b}`).update({optionalProcessingConsent:"accepted"});
      await db.doc(`friend_pairs/${key}`).update({friendship:false});
      assert.deepEqual((await http.inject({url,headers})).json().activities,[]);
      assert.equal((await db.doc(record).get()).exists,true);
    });
    await t.test("invalid identity and unapproved query fail before source display",async()=>{
      assert.equal((await http.inject({url})).statusCode,401);
      assert.equal((await http.inject({url:`${url}&ownerAccountId=${b}`,headers})).statusCode,400);
    });
  }finally{
    await http.close();for(const path of owned)await db.doc(path).delete();for(const uid of users)await auth.deleteUser(uid);
    for(const path of owned)assert.equal((await db.doc(path).get()).exists,false);
    for(const uid of users)await assert.rejects(auth.getUser(uid),{code:"auth/user-not-found"});
    console.log(`Owned cleanup: ${owned.size} documents and ${users.length} Auth users absent`);
    await deleteApp(app);
  }
});
