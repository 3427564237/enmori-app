import { CloudConsentFence } from "../../src/account/application/cloud-consent-fence.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { OwnAccountPreferences } from '../../src/account/application/own-account-preferences.js';
import { FirestoreAccountPreferencesRepository } from '../../src/account/infrastructure/firestore-account-preferences-repository.js';
import { FirestoreCloudAiConsentAuthority } from '../../src/account/infrastructure/firestore-cloud-ai-consent-authority.js';
import { parseCloudAiConsent, hasCloudAiConsent, OPENAI_CLOUD_PROCESSING, GROQ_CLOUD_PROCESSING } from '../../src/account/domain/cloud-ai-consent.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import { createAuthBindingDocumentId } from '../../src/shared/infrastructure/firebase/firestore-records.js';
const profile='/tmp/enmori-cloud-consent-unit';
const environment={ENMORI_ENVIRONMENT:'test',ENMORI_CONTROLLED_PROFILE_DIRECTORY:profile,HOME:profile,APPDATA:profile,USERPROFILE:profile,XDG_CONFIG_HOME:profile,GCLOUD_PROJECT:'demo-enmori-cloud-consent',GOOGLE_CLOUD_PROJECT:'demo-enmori-cloud-consent',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:19099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:18180'};
const principal={firebaseUid:'synthetic-cloud-owner'};
const grant={state:'accepted',disclosureVersion:'groq_cloud_v1'} as const;
function fixture(extra: Record<string, unknown> = {}) {
  const store=new InMemoryFirestoreGateway({[`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`]:{accountId:'owner'},
    'accounts/owner':{username:'member_a',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:'2026-10-05T00:00:00.000Z',purposeRevocationGeneration:3,...extra}});
  const repo=new FirestoreAccountPreferencesRepository(store,environment);
  return {store,repo,use:new OwnAccountPreferences(repo),authority:new FirestoreCloudAiConsentAuthority(store,new CloudConsentFence())};
}
const change={principal,checkInVisibility:'private',optionalProcessingConsent:'accepted',expectedRevision:0};
test('legacy consent never authorizes cloud; grant is explicit, revisioned and owner-bound',async()=>{
 const f=fixture(); assert.deepEqual(await f.authority.read(principal,'owner',()=>true),{kind:'denied'});
 assert.equal((await f.use.saveSettings({...change,cloudAiConsent:grant})).ok,true);
 const observed=await f.authority.read(principal,'owner',()=>true);assert.equal(observed.kind,'authorized');if(observed.kind==='authorized'){assert.equal(observed.generation,1);assert.equal(observed.purposeGeneration,3);observed.release();}
 assert.deepEqual(await f.authority.read(principal,'another-owner',()=>true),{kind:'denied'});
 assert.deepEqual(await f.authority.read(principal,'owner',()=>false),{kind:'terminated'});
 const before=f.store.entries();assert.equal((await f.use.saveSettings({...change,cloudAiConsent:{...grant,state:'declined'}})).ok,false);assert.deepEqual(f.store.entries(),before);
});
test('omission preserves grant; revoke either permission fences the old generation without duplicate increment',async()=>{
 const f=fixture();await f.use.saveSettings({...change,cloudAiConsent:grant});
 assert.equal((await f.use.saveSettings({...change,expectedRevision:1})).ok,true);
 assert.deepEqual(f.store.read('accounts/owner')?.cloudAiConsent,grant);
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,3);
 assert.equal((await f.use.saveSettings({...change,expectedRevision:2,optionalProcessingConsent:'rejected',cloudAiConsent:{...grant,state:'declined'}})).ok,true);
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,4);
 assert.deepEqual(await f.authority.read(principal,'owner',()=>true),{kind:'denied'});
});
test('malformed, unknown-version and local-rejected acceptance fail without writes',async()=>{
 for(const cloudAiConsent of [null,{},'accepted',{...grant,disclosureVersion:'other'},{...grant,provider:'other'},{...grant,state:'unknown'}]){
  assert.equal(parseCloudAiConsent(cloudAiConsent),undefined);const f=fixture(),before=f.store.entries();
  assert.equal((await f.use.saveSettings({...change,cloudAiConsent})).ok,false);assert.deepEqual(f.store.entries(),before);
 }
 const f=fixture();assert.equal((await f.use.saveSettings({...change,cloudAiConsent:grant,optionalProcessingConsent:'rejected'})).ok,false);
 const corrupt=fixture({cloudAiConsent:{...grant,disclosureVersion:'other'}});assert.equal((await corrupt.repo.getSettings(principal.firebaseUid)).kind,'dependency_unavailable');
 assert.deepEqual(await corrupt.authority.read(principal,'owner',()=>true),{kind:'unavailable'});
});
test('ordinary legacy writer cannot alter cloud authority and overflow cannot reset generation',async()=>{
 const f=fixture();const old=new FirestoreAccountPreferencesRepository(f.store);
 assert.equal((await old.saveSettings(principal.firebaseUid,{checkInVisibility:'private',optionalProcessingConsent:'accepted',expectedRevision:0,cloudAiConsent:grant})).kind,'dependency_unavailable');
 const full=fixture({cloudAiConsentGeneration:Number.MAX_SAFE_INTEGER});assert.equal((await full.use.saveSettings({...change,cloudAiConsent:grant})).ok,false);
});

test('same consent with reordered Firestore keys does not revoke a live generation',async()=>{
 const f=fixture({cloudAiConsent:{disclosureVersion:'groq_cloud_v1',state:'accepted'},cloudAiConsentGeneration:7});
 assert.equal((await f.use.saveSettings({...change,cloudAiConsent:grant})).ok,true);
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,3);
});

test('single-host Settings save revokes pending dispatch synchronously before database I/O and never restores its lease',async()=>{
 const f=fixture({cloudAiConsent:grant,cloudAiConsentGeneration:1}),fence=new CloudConsentFence();
 const authority=new FirestoreCloudAiConsentAuthority(f.store,fence);
 const lease=await authority.read(principal,'owner',()=>true);assert.equal(lease.kind,'authorized');if(lease.kind!=='authorized')throw Error();
 assert.equal(lease.current(),true);
 const finish=fence.saving(principal,0);assert.equal(lease.current(),false);
 assert.equal((await authority.read(principal,'owner',()=>true)).kind,'terminated');
 finish(1);assert.equal(lease.current(),false);lease.release();
 const next=await authority.read(principal,'owner',()=>true);assert.equal(next.kind,'authorized');if(next.kind==='authorized'){assert.equal(next.current(),true);next.release();}
});

test('cloud-only withdrawal preserves local generation; reaccept increments cloud generation again',async()=>{
 const f=fixture({cloudAiConsent:grant,cloudAiConsentGeneration:2});
 await f.use.saveSettings({...change,cloudAiConsent:{...grant,state:'declined'}});
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,3);
 assert.equal(f.store.read('accounts/owner')?.cloudAiConsentGeneration,3);
 await f.use.saveSettings({...change,expectedRevision:1,cloudAiConsent:grant});
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,3);
 assert.equal(f.store.read('accounts/owner')?.cloudAiConsentGeneration,4);
});

test('unknown Settings write blocks new leases until a confirmed one-attempt revision write wins',async()=>{
 const fence=new CloudConsentFence(),old=fence.read(principal),finish=fence.saving(principal,0);
 finish(undefined);assert.equal(old.current(),false);old.release();
 const denied=fence.read(principal);assert.equal(denied.current(),false);denied.release();
 const stale=fence.saving(principal,0);stale(false);
 const stillDenied=fence.read(principal);assert.equal(stillDenied.current(),false);stillDenied.release();
 const barrier=fence.saving(principal,0);barrier(1);
 const fresh=fence.read(principal);assert.equal(fresh.current(),true);fresh.release();
});

test('older delayed success acknowledgment cannot clear a later unknown revision',()=>{
 const fence=new CloudConsentFence();
 const earlier=fence.saving(principal,0),later=fence.saving(principal,1);
 later(undefined);earlier(1);
 const denied=fence.read(principal);assert.equal(denied.current(),false);denied.release();
 const barrier=fence.saving(principal,1);barrier(2);
 const allowed=fence.read(principal);assert.equal(allowed.current(),true);allowed.release();
});
test('late unknown acknowledgment cannot undo a proven newer revision barrier',()=>{
 const fence=new CloudConsentFence(),old=fence.saving(principal,3),next=fence.saving(principal,4);
 next(5);old(undefined);
 const fresh=fence.read(principal);assert.equal(fresh.current(),true);fresh.release();
});
test('abort while authority transaction is pending releases the lease and cannot return a grant',async()=>{
 const f=fixture({cloudAiConsent:grant,cloudAiConsentGeneration:1}),fence=new CloudConsentFence(),abort=new AbortController();
 let resolve!:()=>void;const gate=new Promise<void>(r=>{resolve=r;});
 const authority=new FirestoreCloudAiConsentAuthority({runTransaction:async(work,options)=>{await gate;return f.store.runTransaction(work);}},fence);
 const reading=authority.read(principal,'owner',()=>true,abort.signal);abort.abort();resolve();
 assert.equal((await reading).kind,'terminated');
 const fresh=await new FirestoreCloudAiConsentAuthority(f.store,fence).read(principal,'owner',()=>true);assert.equal(fresh.kind,'authorized');if(fresh.kind==='authorized')fresh.release();
});

test('cloud factory keeps ordinary profile and Settings reads independent of unavailable AI epoch',async()=>{
 const {createCloudConsentServices}=await import('../../src/bootstrap/cloud-consent-services.js');
 const f=fixture(),services=createCloudConsentServices(f.store,environment,{processEpoch:'11111111-1111-4111-8111-111111111111',generation:1},()=>false);
 assert.equal((await services.preferences.getProfile(principal)).ok,true);
 assert.equal((await services.preferences.getSettings(principal)).ok,true);
 assert.equal((await services.preferences.saveProfile({principal,displayName:'Synthetic',profileVisibility:'private',expectedRevision:0})).ok,true);
 assert.equal((await services.preferences.saveSettings({...change,cloudAiConsent:grant})).ok,false);
});


test('OpenAI acceptance is distinct from Groq, local consent and legacy missing grants',async()=>{
 for(const cloudAiConsent of [undefined,grant,{state:'declined',disclosureVersion:'openai_cloud_v1'},{state:'accepted',disclosureVersion:'openai_cloud_v1'}]){
  const f=fixture({...cloudAiConsent?{cloudAiConsent,cloudAiConsentGeneration:1}:{}});
  const authority=new FirestoreCloudAiConsentAuthority(f.store,new CloudConsentFence(),()=>true,OPENAI_CLOUD_PROCESSING);
  const observed=await authority.read(principal,'owner',()=>true);
  assert.equal(observed.kind,cloudAiConsent?.state==='accepted'&&cloudAiConsent.disclosureVersion==='openai_cloud_v1'?'authorized':'denied');
  if(observed.kind==='authorized')observed.release();
 }
 assert.equal(hasCloudAiConsent(grant,'accepted',OPENAI_CLOUD_PROCESSING),false);
 assert.equal(hasCloudAiConsent({state:'accepted',disclosureVersion:'openai_cloud_v1'},'accepted',GROQ_CLOUD_PROCESSING),false);
});

test('processor change and OpenAI withdrawal increment only cloud generation; omission never migrates Groq',async()=>{
 const f=fixture({cloudAiConsent:grant,cloudAiConsentGeneration:7});
 await f.use.saveSettings(change);assert.deepEqual(f.store.read('accounts/owner')?.cloudAiConsent,grant);
 const accepted={state:'accepted',disclosureVersion:'openai_cloud_v1'};
 assert.equal((await f.use.saveSettings({...change,expectedRevision:1,cloudAiConsent:accepted})).ok,true);
 assert.deepEqual(f.store.read('accounts/owner')?.cloudAiConsent,accepted);
 assert.equal(f.store.read('accounts/owner')?.cloudAiConsentGeneration,8);
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,3);
 assert.equal((await f.use.saveSettings({...change,expectedRevision:2,cloudAiConsent:{...accepted,state:'declined'}})).ok,true);
 assert.equal(f.store.read('accounts/owner')?.cloudAiConsentGeneration,9);
 assert.equal(f.store.read('accounts/owner')?.purposeRevocationGeneration,3);
 const authority=new FirestoreCloudAiConsentAuthority(f.store,new CloudConsentFence(),()=>true,OPENAI_CLOUD_PROCESSING);
 assert.deepEqual(await authority.read(principal,'owner',()=>true),{kind:'denied'});
});
