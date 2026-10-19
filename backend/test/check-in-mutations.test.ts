import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildApp } from '../src/bootstrap/build-app.js';
import { EditCheckIn } from '../src/check-ins/application/edit-check-in.js';
import { GetCheckIn } from '../src/check-ins/application/get-check-in.js';
import { FirestoreCheckInMutations } from '../src/check-ins/infrastructure/firestore-check-in-mutations.js';
import { FirestoreCheckInRepository } from '../src/check-ins/infrastructure/firestore-check-in-repository.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { appFailure } from '../src/shared/application/app-failure.js';
import { err } from '../src/shared/domain/result.js';
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from './support/in-memory-firestore-gateway.js';
import { updateCheckInSchema, deleteCheckInSchema } from '../src/check-ins/transport/mutation-routes.js';
const principal = {firebaseUid:'uid'};
const instant='2026-10-19T01:00:00.000Z';
function fixture() {
 const store=new InMemoryFirestoreGateway({
  [`auth_bindings/${createAuthBindingDocumentId('uid')}`]:{accountId:'a'},
  [`auth_bindings/${createAuthBindingDocumentId('other')}`]:{accountId:'b'},
  'accounts/a':{username:'member_a',optionalProcessingConsent:'rejected',checkInVisibility:'private',onboardingCompletedAt:instant},
  'accounts/b':{username:'member_b',optionalProcessingConsent:'accepted',checkInVisibility:'public',onboardingCompletedAt:instant},
  'check_ins/moment':{ownerAccountId:'a',note:'original',createdAt:instant,weather:{status:'historical'},location:{latitude:1.2345,longitude:103.4567}}
 });
 return {store, edits:new EditCheckIn(new FirestoreCheckInMutations(store)), read:new GetCheckIn(new FirestoreCheckInRepository(store))};
}
test('legacy edit persists version, visibility and note without changing historical facts; stale writes and deletes cannot overwrite',async()=>{
 const {store,edits,read}=fixture();
 const update={principal,checkInId:'moment',expectedRevision:1,note:' corrected ',checkInVisibility:'friends_only'};
 const result=await edits.update(update);assert.equal(result.ok,true);
 assert.deepEqual(store.read('check_ins/moment'),{ownerAccountId:'a',note:'corrected',createdAt:instant,checkInVisibility:'friends_only',revision:2,weather:{status:'historical'},location:{latitude:1.2345,longitude:103.4567}});
 assert.deepEqual(await read.execute({principal,checkInId:'moment'}),result);
 assert.deepEqual(await edits.update(update),err(appFailure('CHECKIN_REVISION_PRECONDITION_FAILED')));
 assert.deepEqual(await edits.remove(update),err(appFailure('CHECKIN_REVISION_PRECONDITION_FAILED')));
 assert.equal((await edits.remove({...update,expectedRevision:2})).ok,true);
 assert.equal(store.read('check_ins/moment'),undefined);
 assert.deepEqual(await read.execute({principal,checkInId:'moment'}),err(appFailure('CHECKIN_UNAVAILABLE')));
});
test('ownership and missing ID are indistinguishable; invalid edits and provider failure leave records unchanged',async()=>{
 const {store,edits}=fixture(), before=store.entries();
 const input={principal:{firebaseUid:'other'},checkInId:'moment',expectedRevision:1,note:'intrusion',checkInVisibility:'public'};
 for(const checkInId of ['moment','missing']) {
  assert.deepEqual(await edits.update({...input,checkInId}),err(appFailure('CHECKIN_UNAVAILABLE')));
  assert.deepEqual(await edits.remove({...input,checkInId}),err(appFailure('CHECKIN_UNAVAILABLE')));
 }
 for(const patch of [{note:''},{expectedRevision:0},{expectedRevision:1.5},{checkInVisibility:'everyone'}]) assert.deepEqual(await edits.update({...input,principal,...patch}),err(appFailure('CHECKIN_INVALID')));
 assert.deepEqual(store.entries(),before);
 assert.deepEqual(await new EditCheckIn(new FirestoreCheckInMutations(new FailingFirestoreGateway())).remove({...input,principal}),err(appFailure('SERVICE_UNAVAILABLE')));
});
test('authenticated API rejects foreign identities and unknown fields, returns version conflict, and deletion is read back',async t=>{
 const {edits,read}=fixture(); const unused={execute:async()=>err(appFailure('SERVICE_UNAVAILABLE'))};
 const app=await buildApp({identityVerifier:{verifyIdToken:async()=>({kind:'verified',principal})},editCheckIn:edits,getCheckIn:read,
 completeOnboarding:unused,getOnboarding:unused,createCheckIn:unused,getInterestTags:unused,getOwnInterests:unused,replaceOwnInterests:unused});t.after(()=>app.close());
 const url='/v1/check-ins/moment',headers={authorization:'Bearer synthetic'},payload={note:'edited',checkInVisibility:'private',expectedRevision:1};
 assert.equal((await app.inject({method:'PUT',url,payload})).statusCode,401);
 assert.equal((await app.inject({method:'PUT',url,headers,payload:{...payload,ownerAccountId:'b'}})).statusCode,400);
 assert.equal((await app.inject({method:'PUT',url,headers,payload})).json().checkIn.revision,2);
 assert.equal((await app.inject({method:'PUT',url,headers,payload})).statusCode,412);
 assert.equal((await app.inject({url,headers})).json().checkIn.note,'edited');
 assert.deepEqual((await app.inject({method:'DELETE',url,headers,payload:{expectedRevision:2}})).json(),{deleted:true});
 assert.equal((await app.inject({url,headers})).statusCode,404);
 const contract=JSON.parse(await readFile('api/openapi.json','utf8'));
 assert.deepEqual(contract.paths['/v1/check-ins/{checkInId}'].put.requestBody.content['application/json'].schema,updateCheckInSchema.body);
 assert.deepEqual(contract.paths['/v1/check-ins/{checkInId}'].delete.requestBody.content['application/json'].schema,deleteCheckInSchema.body);
});

test('Mood-only and Activity fields survive edit/read; removing the only content is invalid',async()=>{
 const {store,edits,read}=fixture();
 const input={principal,checkInId:'moment',expectedRevision:1,note:'',mood:'Calm',activity:'Study',checkInVisibility:'public'};
 const saved=await edits.update(input);assert.equal(saved.ok,true);
 assert.equal(store.read('check_ins/moment')!.mood,'Calm');
 const retrieved=await read.execute({principal,checkInId:'moment'});assert.equal(retrieved.ok,true);
 if(retrieved.ok)assert.deepEqual({note:retrieved.value.note,mood:retrieved.value.mood,activity:retrieved.value.activity},{note:'',mood:'Calm',activity:'Study'});
 assert.deepEqual(await edits.update({...input,expectedRevision:2,mood:null}),err(appFailure('CHECKIN_INVALID')));
 assert.equal((await edits.update({...input,expectedRevision:2,note:'Now a note',mood:null,activity:null})).ok,true);
 const result=await read.execute({principal,checkInId:'moment'});if(result.ok){assert.equal(result.value.mood,undefined);assert.equal(result.value.activity,undefined);}
});
