import assert from 'node:assert/strict';
import test from 'node:test';
import * as firestoreSdk from 'firebase-admin/firestore';
import { InMemoryFirestoreGateway } from '../backend/dist/test/support/in-memory-firestore-gateway.js';
import { createAuthBindingDocumentId } from '../backend/dist/src/shared/infrastructure/firebase/firestore-records.js';

// Actual remote composition and Fastify routing; only external dependencies are
// faked. No listener, real identity, credential, database or model is accessed.
test('full Backend starts and serves owner-isolated profiles/settings without any AI provider',async t=>{
 const base={username:'synthetic_a',checkInVisibility:'private',optionalProcessingConsent:'accepted',purposeRevocationGeneration:0,onboardingCompletedAt:'2026-10-28T00:00:00.000Z'};
 const store=new InMemoryFirestoreGateway({
  [`auth_bindings/${createAuthBindingDocumentId('owner-a')}`]:{accountId:'account-a'},
  [`auth_bindings/${createAuthBindingDocumentId('owner-b')}`]:{accountId:'account-b'},
  'accounts/account-a':base,'accounts/account-b':{...base,username:'synthetic_b'},
 });
 let modelConstructions=0,networkCalls=0,deleted=0;
 t.mock.method(globalThis,'fetch',async()=>{networkCalls++;throw Error('External network forbidden');});
 const mock=(specifier,exports)=>t.mock.module(specifier,{exports});
 mock('firebase-admin/app',{initializeApp:()=>({}),deleteApp:async()=>{deleted++;},applicationDefault:()=>{throw Error('Credential discovery forbidden');}});
 mock('firebase-admin/auth',{getAuth:()=>({verifyIdToken:async(token,revoked)=>{
  assert.equal(revoked,true);
  if(!['owner-a','owner-b'].includes(token))throw {code:'auth/invalid-id-token'};
  return {uid:token};
 }})});
 mock('firebase-admin/firestore',{...firestoreSdk,getFirestore:()=>({})});
 mock(new URL('../backend/dist/src/shared/infrastructure/firebase/firestore-gateway.js',import.meta.url),{FirebaseAdminFirestoreGateway:class {runTransaction(work){return store.runTransaction(work);}}});
 mock(new URL('../backend/dist/src/ai-runtime/infrastructure/local-model-lane.js',import.meta.url),{LocalModelLane:class{constructor(){modelConstructions++;throw Error('Model construction forbidden');}}});
 const {createRemoteGroupRuntime,closeControlledRuntime}=await import('../backend/dist/src/bootstrap/retained-core-runtime.js');
 const runtime=await createRemoteGroupRuntime({ENMORI_REMOTE_GROUP:'true',ENMORI_ENVIRONMENT:'controlled-demo',ENMORI_FIREBASE_PROJECT_ID:'enmori-rmvp-controlled'});
 try {
  assert.deepEqual(runtime.aiStatus(),{configured:false,available:false,maintenanceHealthy:true,pending:false,outcomeUnknown:false});
  for(const url of ['/v1/me/profile','/v1/me/settings','/v1/me/onboarding','/v1/me/friends','/v1/me/friends/summary','/v1/me/personas','/v1/event-browse','/v1/recommendations/friends?view=home','/v1/me/check-ins/calendar?month=2026-10&timeZone=Asia%2FSingapore']){
   const response=await runtime.app.inject({url});assert.equal(response.statusCode,401,url);
  }
  const headers={authorization:'Bearer owner-a'};
  const first=await runtime.app.inject({url:'/v1/me/profile',headers});assert.equal(first.statusCode,200);assert.equal(first.json().profile.username,'synthetic_a');
  const save=await runtime.app.inject({method:'PUT',url:'/v1/me/profile',headers,payload:{displayName:'Backend only',profileVisibility:'private',expectedRevision:0}});assert.equal(save.statusCode,200);
  const stale=await runtime.app.inject({method:'PUT',url:'/v1/me/profile',headers,payload:{displayName:'Stale',profileVisibility:'public',expectedRevision:0}});assert.equal(stale.statusCode,412);
  const other=await runtime.app.inject({url:'/v1/me/profile',headers:{authorization:'Bearer owner-b'}});assert.equal(other.statusCode,200);assert.equal(other.json().profile.displayName,null);
  const settings=await runtime.app.inject({method:'PUT',url:'/v1/me/settings',headers,payload:{checkInVisibility:'private',optionalProcessingConsent:'rejected',expectedRevision:0}});assert.equal(settings.statusCode,200);
  assert.equal(store.read('accounts/account-a').purposeRevocationGeneration,1);
  assert.equal(store.read('accounts/account-b').purposeRevocationGeneration,0);
  assert.equal((await runtime.app.inject({url:'/v1/me/profile',headers:{authorization:'Bearer invalid'}})).statusCode,401);
  assert.equal(runtime.app.hasRoute({method:'POST',url:'/v1/me/ai/operations'}),false);
  assert.equal(modelConstructions,0);assert.equal(networkCalls,0);
 } finally {await closeControlledRuntime(runtime);}
 assert.equal(deleted,1);assert.equal(networkCalls,0);
});
