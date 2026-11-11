import assert from 'node:assert/strict';
import { beforeEach, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { FirestoreCatalogueWriter } from '../src/interests/infrastructure/firestore-catalogue-writer.js';
import { FirestoreInterestRepository } from '../src/interests/infrastructure/firestore-interest-repository.js';
import { VerifiedMvpInterestReferences } from '../src/interests/infrastructure/firestore-interest-reference-inventory.js';
import { FirebaseInterestAdmin } from '../src/interests/infrastructure/firebase-interest-admin.js';
import { ManageInterestTags } from '../src/interests/application/manage-interest-tags.js';
import { catalogueName } from '../src/interests/domain/catalogue-name.js';

import { FirestoreAdminRepository } from '../src/admin/infrastructure/firestore-admin-repository.js';
import { FirestoreOperationRecords, OPERATION_RETENTION_MS } from '../src/admin/infrastructure/firestore-operation-records.js';
const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, 'demo-enmori-rmvp01a-r10');
const firebase = initializeApp({ projectId: env.projectId }, 'admin-value-emulator');
const firestore = getFirestore(firebase), auth = getAuth(firebase);
const gateway = new FirebaseAdminFirestoreGateway(firestore);
const writer = new FirestoreCatalogueWriter(gateway, new VerifiedMvpInterestReferences());
const selections = new FirestoreInterestRepository(gateway);
async function reset() {
  requireControlledEmulatorEnvironment(process.env);
  for (const url of [`http://${env.authHost}/emulator/v1/projects/${env.projectId}/accounts`,
    `http://${env.firestoreHost}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`]) {
    assert.equal((await fetch(url, { method: 'DELETE' })).ok, true);
  }
}
beforeEach(async () => {
  await reset();
  await firestore.doc('interest_tags/music').create({ displayName: 'Music', lifecycleState: 'active', revision: 1 });
  await firestore.doc(`auth_bindings/${createAuthBindingDocumentId('owner')}`).create({ accountId: 'owner' });
  await firestore.doc('accounts/owner').create({ username: 'owner', optionalProcessingConsent: 'rejected', checkInVisibility: 'private', onboardingCompletedAt: '2026-11-05T00:00:00.000Z' });
});
after(async () => { await reset(); await deleteApp(firebase); });


function adminFixture(now=()=>Date.now()) {
  const audit=new FirestoreOperationRecords(gateway,now);
  return {audit,repo:new FirestoreAdminRepository(gateway,audit)};
}
async function category(repo:FirestoreAdminRepository,name='Arts'){
  const r=await repo.create('admin',name,catalogueName(name)!.comparisonKey);assert.equal(r.kind,'success');if(r.kind!=='success')throw Error('Fixture failed');return r.value;
}
test('emulator concurrent category name claims commit one category and exactly one audit',async()=>{
  const {repo,audit}=adminFixture();
  const r=await Promise.all([repo.create('a','Straße','strasse'),repo.create('b','STRASSE','strasse')]);
  assert.equal(r.filter(x=>x.kind==='success').length,1);assert.equal(r.filter(x=>x.kind==='name_conflict').length,1);
  assert.equal((await audit.read()).records.length,1);
  assert.equal((await firestore.collection('event_categories').get()).size,1);
});
test('emulator equal-revision concurrent category edits keep audit aligned with the committed winner',async()=>{
  const {repo,audit}=adminFixture(),c=await category(repo);
  const r=await Promise.all([repo.change('a',c.eventCategoryId,1,catalogueName('Sound')!),repo.change('b',c.eventCategoryId,1,catalogueName('Art')!)]);
  assert.equal(r.filter(x=>x.kind==='success').length,1);assert.equal(r.filter(x=>x.kind==='revision_precondition_failed').length,1);
  const history=(await audit.read()).records;assert.equal(history.length,2);
  assert.equal(history.filter(x=>x.beforeRevision===1&&x.afterRevision===2).length,1);
});
test('emulator assignment/deactivation serializes without creating a newly inactive reference',async()=>{
  const {repo,audit}=adminFixture(),c=await category(repo);
  const [assigned,disabled]=await Promise.all([repo.assign('a','event-one',0,c.eventCategoryId),repo.change('b',c.eventCategoryId,1,{lifecycleState:'inactive'})]);
  assert.equal(disabled.kind,'success');assert.ok(['success','state_conflict'].includes(assigned.kind));
  assert.equal((await repo.assign('a','event-two',0,c.eventCategoryId)).kind,'state_conflict');
  const history=(await audit.read()).records;
  assert.equal(history.filter(r=>r.targetType==='event_category_assignment').length,assigned.kind==='success'?1:0);
  if(assigned.kind==='success')assert.equal((await repo.readMany(['event-one'])).get('event-one')?.lifecycleState,'inactive');
});
test('emulator audit append failure aborts catalogue and reservation writes',async()=>{
  const store={runTransaction:<T>(work:(tx:import('../src/shared/infrastructure/firebase/firestore-gateway.js').FirestoreTransactionGateway)=>Promise<T>)=>gateway.runTransaction(tx=>work({
    get:tx.get.bind(tx),list:tx.list.bind(tx),set:tx.set.bind(tx),delete:tx.delete!.bind(tx),
    create:(path,data)=>{if(path.startsWith('admin_operation_records/'))throw Error('synthetic audit failure');tx.create(path,data);},
  }))};
  const audit=new FirestoreOperationRecords(store),repo=new FirestoreAdminRepository(store,audit);
  assert.equal((await repo.create('admin','Art','art')).kind,'unavailable');
  assert.equal((await firestore.collection('event_categories').get()).size,0);
  assert.equal((await firestore.collection('event_category_names').get()).size,0);
});
test('emulator real query pagination and expiry cleanup work without a new composite index',async()=>{
  let now=Date.parse('2026-11-11T00:00:00.000Z');const {repo,audit}=adminFixture(()=>now);
  for(let i=0;i<52;i++)await category(repo,`Category ${i}`);
  const first=await audit.read(),next=await audit.read(first.nextCursor);
  assert.equal(first.records.length,50);assert.equal(next.records.length,2);
  assert.equal(new Set([...first.records,...next.records].map(x=>x.recordId)).size,52);
  now+=OPERATION_RETENTION_MS;assert.equal((await audit.read()).records.length,0);
  await audit.cleanup();assert.equal(audit.healthy,true);
  assert.equal((await firestore.collection('admin_operation_records').get()).size,0);
  assert.equal((await firestore.collection('event_categories').get()).size,52);
});
test('emulator current Admin revocation and disabled state deny authority',async()=>{
  const user=await auth.createUser({uid:'admin-fixture'});await auth.setCustomUserClaims(user.uid,{enmoriAdmin:true});
  const authority=new FirebaseInterestAdmin(auth);assert.equal(await authority.currentAdmin(user.uid),'allowed');
  await auth.setCustomUserClaims(user.uid,{});assert.equal(await authority.currentAdmin(user.uid),'forbidden');
  await auth.setCustomUserClaims(user.uid,{enmoriAdmin:true});await auth.updateUser(user.uid,{disabled:true});assert.equal(await authority.currentAdmin(user.uid),'forbidden');
});
