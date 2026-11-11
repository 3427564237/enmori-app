import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {requireControlledEmulatorEnvironment} from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import {FirebaseAdminFirestoreGateway,type FirestoreGateway} from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import {FirestoreServiceOwner} from '../src/ai-runtime/infrastructure/firestore-service-owner.js';
import {RenewableServiceOwner} from '../src/ai-runtime/application/renewable-service-owner.js';
import {FirestoreCloudConsentGateway} from '../src/account/infrastructure/firestore-cloud-consent-gateway.js';
import {createCloudConsentServices} from '../src/bootstrap/cloud-consent-services.js';
import {OPENAI_CLOUD_PROCESSING} from '../src/account/domain/cloud-ai-consent.js';
import {createAuthBindingDocumentId} from '../src/shared/infrastructure/firebase/firestore-records.js';
import type {RuntimeClock} from '../src/ai-runtime/ports/runtime-clock.js';
import {SuspendInclusiveRuntimeClock} from '../src/ai-runtime/infrastructure/suspend-inclusive-runtime-clock.js';

// Guard BEFORE SDK construction. No real Firebase project, provider, device or credential.
const env=requireControlledEmulatorEnvironment(process.env);
const app=initializeApp({projectId:env.projectId},`service-owner-${randomUUID()}`),db=getFirestore(app);
const raw=new FirebaseAdminFirestoreGateway(db);
after(async()=>{try{await db.terminate();}finally{await deleteApp(app);}});
const OWNER='ai_runtime_fence/service_owner',FENCE='ai_runtime_fence/current';
const deferred=<T>()=>{let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};};
async function fixture(){
  const saved=await db.getAll(db.doc(OWNER),db.doc(FENCE));
  const epoch={processEpoch:randomUUID(),generation:9};
  const config={mode:'renewable_service_lease',serviceKey:`sdk_${randomUUID().replaceAll('-','')}`,leaseDurationMs:120000,renewEveryMs:30000,safetyMarginMs:15000} as const;
  const record={schemaVersion:'openai_service_owner_v1',serviceKey:config.serviceKey,enabled:true,...epoch,leaseVersion:0,renewedAtMs:0,leaseUntilMs:0};
  await db.doc(FENCE).set({...epoch,cleanupGeneration:3});await db.doc(OWNER).set(record);
  return {epoch,config,record,authority:new FirestoreServiceOwner(raw,config),async close(){
    assert.equal((await db.doc(OWNER).get()).data()?.serviceKey,config.serviceKey);
    for(const old of saved){if(old.exists)await old.ref.set(old.data()!);else await old.ref.delete();}
  }};
}
test('SDK transaction projects fresh immutable readTime and atomically acquires/renews the exact pair',async()=>{
  const f=await fixture();try{
    const snapshot=await raw.runTransaction(tx=>tx.getSnapshot!(OWNER),{maxAttempts:1});
    assert(snapshot?.readTime);assert(Object.isFrozen(snapshot.readTime));
    assert(snapshot.readTime.seconds>=snapshot.createTime.seconds);
    const result=await f.authority.acquire(randomUUID(),()=>true);assert.equal(result.kind,'confirmed');if(result.kind!=='confirmed')return;
    const owner=(await db.doc(OWNER).get()).data()!,fence=(await db.doc(FENCE).get()).data()!;
    assert.equal(owner.leaseUntilMs-owner.renewedAtMs,120000);assert.equal(owner.leaseVersion,1);
    assert.deepEqual(fence,{processEpoch:result.lease.processEpoch,generation:10,cleanupGeneration:3});
    assert.equal(owner.processEpoch,fence.processEpoch);assert.equal(owner.generation,fence.generation);
    const renewal=await f.authority.renew(result.lease,()=>true);assert.equal(renewal.kind,'confirmed');
    assert.deepEqual((await db.doc(FENCE).get()).data(),fence);
    assert.equal((await db.doc(OWNER).get()).data()?.leaseVersion,2);
    assert.equal((await f.authority.renew(result.lease,()=>true)).kind,'unavailable');
  }finally{await f.close();}
});
test('two competing SDK processes permit at most one owner and never require a winner under contention',async()=>{
  const f=await fixture();try{
    const ids=[randomUUID(),randomUUID()];
    const results=await Promise.all(ids.map(id=>new FirestoreServiceOwner(raw,f.config).acquire(id,()=>true)));
    const winners=results.filter(r=>r.kind==='confirmed');assert(winners.length<=1);
    const stored=(await db.doc(OWNER).get()).data()!;
    if(winners[0]?.kind==='confirmed')assert.equal(stored.processEpoch,winners[0].lease.processEpoch);
    assert(results.every(r=>['confirmed','occupied','unknown'].includes(r.kind)));
    assert.equal((await new FirestoreServiceOwner(raw,f.config).acquire(randomUUID(),()=>true)).kind,'occupied');
  }finally{await f.close();}
});
test('lost SDK acquisition ACK persists its lease but grants no local capability or replay',async()=>{
  const f=await fixture();let writes=0;try{
    const lost:FirestoreGateway={runTransaction:async(work,options)=>{const result=await raw.runTransaction(work,options);writes++;throw Error('Synthetic lost ACK');}};
    const clock:RuntimeClock={now:()=>0,at:()=>()=>{}};
    const owner=new RenewableServiceOwner(new FirestoreServiceOwner(lost,f.config),clock,f.config,randomUUID());
    assert.equal(await owner.start(),undefined);assert.equal(owner.current(),false);assert.equal(owner.lost,false);
    assert.equal((await db.doc(OWNER).get()).data()?.leaseVersion,1);
    assert.equal(await owner.start(),undefined);assert.equal(writes,1);
    assert.equal((await f.authority.acquire(randomUUID(),()=>true)).kind,'occupied');
  }finally{await f.close();}
});
test('real SDK owner plus suspend-inclusive local clock closes before server expiry; lost renewal ACK changes only durable version',async()=>{
  const f=await fixture();let observation={elapsed:1000,monotonic:1000,wall:1000000};
  const elapsed=new SuspendInclusiveRuntimeClock(()=>({...observation}));
  const clock:RuntimeClock={now:()=>elapsed.now(),at:()=>()=>{}};
  const owner=new RenewableServiceOwner(f.authority,clock,f.config,randomUUID());
  try{
    const epoch=await owner.start();assert(epoch);assert.equal(owner.current(),true);
    const record=(await db.doc(OWNER).get()).data()!;
    const lost:FirestoreGateway={runTransaction:async(work,options)=>{await raw.runTransaction(work,options);throw Error('Synthetic renewal ACK loss');}};
    const renewal=new FirestoreServiceOwner(lost,f.config);
    const {schemaVersion:_schema,enabled:_enabled,...lease}=record;
    assert.equal((await renewal.renew(lease as unknown as import('../src/ai-runtime/ports/service-owner.js').ServiceOwnerLease,()=>true)).kind,'unknown');
    assert.equal((await db.doc(OWNER).get()).data()?.leaseVersion,2);
    assert.equal((await db.doc(FENCE).get()).data()?.generation,epoch.generation);
    observation.elapsed+=105000;assert.equal(owner.current(),false);assert.equal(owner.lost,true);
    assert.equal((await f.authority.acquire(randomUUID(),()=>true)).kind,'occupied');
    observation={...observation,wall:observation.wall+1001};assert.throws(()=>elapsed.now());
  }finally{owner.stop();await f.close();}
});
test('old Settings transaction suspended at its original fence cannot adopt or write after retirement',async()=>{
  const f=await fixture(),ready=deferred<void>(),resume=deferred<void>(),path=`accounts/${randomUUID()}`;let active=true;
  try{
    await db.doc(path).set({synthetic:true,revision:0});
    const old=new FirestoreCloudConsentGateway(raw,f.epoch,()=>active);
    const pending=old.runTransaction(async tx=>{await tx.get(path);ready.resolve();await resume.promise;tx.set(path,{synthetic:true,revision:1});});
    await ready.promise;active=false;
    const acquisition=f.authority.acquire(randomUUID(),()=>true);resume.resolve();
    await assert.rejects(pending);const acquired=await acquisition;
    assert(['confirmed','unknown'].includes(acquired.kind));assert.deepEqual((await db.doc(path).get()).data(),{synthetic:true,revision:0});
    await assert.rejects(old.runTransaction(async tx=>tx.set(path,{synthetic:true,revision:2})));
  }finally{active=false;resume.resolve();await db.doc(path).delete();await f.close();}
});
test('unknown committed Settings ACK remains fenced; new owner reads real withdrawal and old owner cannot resume',async()=>{
  const f=await fixture(),id=randomUUID(),uid=`sdk_owner_${randomUUID()}`,principal={firebaseUid:uid};
  const account=`accounts/${id}`,binding=`auth_bindings/${createAuthBindingDocumentId(uid)!}`;
  let active=true;try{
    await db.doc(binding).set({accountId:id});
    await db.doc(account).set({username:'synthetic_service_owner',optionalProcessingConsent:'accepted',checkInVisibility:'private',
      onboardingCompletedAt:new Date().toISOString(),purposeRevocationGeneration:0,
      cloudAiConsent:{state:'accepted',disclosureVersion:'openai_cloud_v1'},cloudAiConsentGeneration:0});
    const lost:FirestoreGateway={runTransaction:async(work,options)=>{await raw.runTransaction(work,options);throw Error('Synthetic Settings ACK loss');}};
    const old=createCloudConsentServices(lost,process.env,f.epoch,()=>active,undefined,OPENAI_CLOUD_PROCESSING);
    const result=await old.preferences.saveSettings({principal,checkInVisibility:'private',optionalProcessingConsent:'rejected',
      cloudAiConsent:{state:'declined',disclosureVersion:'openai_cloud_v1'},expectedRevision:0});
    assert.equal(result.ok,false);active=false;
    const acquired=await f.authority.acquire(randomUUID(),()=>true);assert.equal(acquired.kind,'confirmed');if(acquired.kind!=='confirmed')return;
    const fresh=createCloudConsentServices(raw,process.env,acquired.lease,()=>true,undefined,OPENAI_CLOUD_PROCESSING);
    const settings=await fresh.preferences.getSettings(principal);assert.equal(settings.ok,true);if(!settings.ok)return;
    assert.equal(settings.value.optionalProcessingConsent,'rejected');assert.equal(settings.value.cloudAiConsent?.state,'declined');
    const before=(await db.doc(account).get()).data();
    assert.equal((await old.preferences.saveSettings({principal,checkInVisibility:'private',optionalProcessingConsent:'accepted',
      expectedRevision:settings.value.revision})).ok,false);
    assert.deepEqual((await db.doc(account).get()).data(),before);
  }finally{active=false;await db.doc(binding).delete();await db.doc(account).delete();await f.close();}
});
