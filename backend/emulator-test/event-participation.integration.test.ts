import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { initializeApp,deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { FirebaseIdentityVerifier } from '../src/shared/infrastructure/firebase/firebase-identity-verifier.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { ok } from '../src/shared/domain/result.js';
import { createIsolatedEventParticipation } from '../src/bootstrap/event-participation.js';
import { sourceEventId } from '../src/bootstrap/controlled-event-recommendations.js';
import { participationKey } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { registerParticipationRoutes } from '../src/event-participation/transport/register-routes.js';
import { friendPairKey } from '../src/friends/infrastructure/firestore-friend-repository.js';

const env=requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId,'demo-enmori-rmvp01a-r10');
assert.equal(env.authHost,'127.0.0.1:19099');assert.equal(env.firestoreHost,'127.0.0.1:18080');
const firebase=initializeApp({projectId:env.projectId},'shi-ep1-isolated'),auth=getAuth(firebase),db=getFirestore(firebase);
const at='2026-10-20T00:00:00.000Z',event=sourceEventId('tm_YQ');
let sourceAvailable=true;
const options={environment:process.env,firestore:new FirebaseAdminFirestoreGateway(db),clock:{now:()=>ok(new Date(at))},
  source:{firstBatch:async()=>sourceAvailable?[{browseId:'tm_YQ',title:'Synthetic source',startAt:'2027-01-01T00:00:00Z',externalSourceUrl:'https://www.ticketmaster.sg/event/a'}]:[],detail:async()=>undefined},cursorKey:Buffer.alloc(32,9)};
const {repository,operations}=createIsolatedEventParticipation(options);
const app=Fastify({logger:false,routerOptions:{maxParamLength:174},ajv:{customOptions:{removeAdditional:false}}});
const tokens:string[]=[];
const account=(username:string,privacy='public')=>({username,optionalProcessingConsent:'rejected',checkInVisibility:'private',onboardingCompletedAt:at,
  fieldPrivacy:{interests:'private',location:'private',participation:privacy,mapSharedWithFriends:false}});
async function reset(){
  requireControlledEmulatorEnvironment(process.env);
  for(const url of [`http://${env.authHost}/emulator/v1/projects/${env.projectId}/accounts`,`http://${env.firestoreHost}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`])assert.equal((await fetch(url,{method:'DELETE'})).ok,true);
}
before(async()=>{
  await reset();
  for(let i=0;i<2;i++){
    const uid=`shi-ep1-${i}`,email=`${uid}@example.invalid`,password=`${randomUUID()}Aa1!`;
    await auth.createUser({uid,email,password});
    await db.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`).set({accountId:`ep1-${i}`});
    await db.doc(`accounts/ep1-${i}`).set(account(`ep1_member_${i}`));
    await db.doc(`friend_access/ep1-${i}`).set({eligibilityState:'eligible'});
    const response=await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-emulator-only`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    assert.equal(response.ok,true);tokens.push((await response.json()as{ idToken:string }).idToken);
  }
  await registerParticipationRoutes(app,new FirebaseIdentityVerifier(auth),operations);
});
after(async()=>{await app.close();try{await reset();assert.equal((await db.collection('event_participations').get()).size,0);}finally{await deleteApp(firebase);}});
const headers=(i=0)=>({authorization:`Bearer ${tokens[i]!}`});

test('actual Auth and Firestore compare-and-set race, independent readback and owner isolation',async()=>{
  const url=`/v1/events/${event}/participation`;
  const race=await Promise.all(['interested','going'].map(status=>app.inject({method:'PUT',url,headers:headers(),payload:{status,ignored:false,expectedRevision:0}})));
  assert.deepEqual(race.map(r=>r.statusCode).sort(),[200,412]);
  const stored=(await app.inject({url,headers:headers()})).json().participation;assert.equal(stored.revision,1);
  const again=createIsolatedEventParticipation(options).repository,read=await again.read('shi-ep1-0',event);assert.ok(read.ok);if(read.ok)assert.deepEqual(read.value,stored);
  const other=(await app.inject({url,headers:headers(1)})).json().participation;assert.equal(other.revision,0);assert.equal(other.status,'none');
  const raw=(await db.doc(`event_participations/${participationKey('ep1-0',event)}`).get()).data()!;
  assert.deepEqual(Object.keys(raw).sort(),['accountId','eventId','ignored','revision','status','updatedAt']);
});
test('actual expired-source cancellation and restore preserve tombstone across new Repository',async()=>{
  const before=await repository.read('shi-ep1-0',event);assert.ok(before.ok);if(!before.ok)return;
  const ignored=await repository.save('shi-ep1-0',event,{status:before.value.status,ignored:true,expectedRevision:before.value.revision});assert.ok(ignored.ok);if(!ignored.ok)return;
  sourceAvailable=false;
  const cancelled=await repository.save('shi-ep1-0',event,{status:'none',ignored:true,expectedRevision:ignored.value.revision});assert.ok(cancelled.ok);if(!cancelled.ok)return;
  const restored=await repository.save('shi-ep1-0',event,{status:'none',ignored:false,expectedRevision:cancelled.value.revision});assert.ok(restored.ok);if(!restored.ok)return;
  const forbidden=await repository.save('shi-ep1-0',event,{status:'going',ignored:false,expectedRevision:restored.value.revision});assert.equal(forbidden.ok,false);
  const reread=await createIsolatedEventParticipation(options).repository.read('shi-ep1-0',event);assert.ok(reread.ok);if(reread.ok)assert.equal(reread.value.revision,restored.value.revision);
  sourceAvailable=true;
});
test('actual bounded indexed sparse pages, current privacy/friendship/block and minimized username callback',async()=>{
  const owner=await repository.read('shi-ep1-0',event);assert.ok(owner.ok);if(owner.ok)assert.ok((await repository.save('shi-ep1-0',event,{status:'going',ignored:false,expectedRevision:owner.value.revision})).ok);
  const ids=Array.from({length:23},(_,i)=>`ep1-candidate-${i}`).sort((a,b)=>participationKey(a,event)<participationKey(b,event)?-1:1);
  for(const [index,id]of ids.entries()){
    await db.doc(`accounts/${id}`).set(account(`ep1_candidate_${index}`,index<20?'private':'public'));
    await db.doc(`friend_access/${id}`).set({eligibilityState:'eligible'});
    await db.doc(`event_participations/${participationKey(id,event)}`).set({accountId:id,eventId:event,status:'going',ignored:false,revision:1,updatedAt:at});
  }
  const url=`/v1/events/${event}/participants?status=going&group=others`;
  const first=(await app.inject({url,headers:headers()})).json();assert.equal(first.items.length,0);assert.equal(first.visibleCount,3);assert.ok(first.nextCursor);
  const visible=ids[20]!,record=(await db.doc(`accounts/${visible}`).get()).data()!;
  await db.doc(`accounts/${visible}`).set({...record,fieldPrivacy:{...record.fieldPrivacy,participation:'friends_only'}});
  const second=(await app.inject({url:url+'&cursor='+first.nextCursor,headers:headers()})).json();assert.equal(second.visibleCount,2);assert.equal(second.items.length,2);
  for(const item of second.items)assert.deepEqual(Object.keys(item),['username']);
  const pairPath=`friend_pairs/${friendPairKey('ep1-0',visible)}`;
  await db.doc(pairPath).set({accountIds:['ep1-0',visible].sort(),friendship:true,blockedByAccountIds:[],pending:null});
  const friendUrl=`/v1/events/${event}/participants?status=going&group=friends`;
  const friends=(await app.inject({url:friendUrl,headers:headers()})).json();
  assert.deepEqual(friends.items,[]);assert.equal(friends.visibleCount,1);assert.ok(friends.nextCursor);
  const friendNext=(await app.inject({url:friendUrl+'&cursor='+friends.nextCursor,headers:headers()})).json();
  assert.deepEqual(friendNext.items,[{username:'ep1_candidate_20'}]);
  await db.doc(pairPath).update({blockedByAccountIds:['ep1-0']});
  const blocked=(await app.inject({url:friendUrl,headers:headers()})).json();assert.equal(blocked.visibleCount,0);
  const bad=await app.inject({url:url+'&cursor='+first.nextCursor,headers:headers(1)});assert.equal(bad.statusCode,400);
});
test('actual disabled identity fails before requests, no arbitrary identity fields',async()=>{
  await auth.updateUser('shi-ep1-1',{disabled:true});
  assert.equal((await app.inject({url:`/v1/events/${event}/participation`,headers:headers(1)})).statusCode,403);
  assert.equal((await app.inject({method:'PUT',url:`/v1/events/${event}/participation`,headers:headers(),payload:{status:'going',ignored:false,expectedRevision:0,accountId:'ep1-1'}})).statusCode,400);
});
