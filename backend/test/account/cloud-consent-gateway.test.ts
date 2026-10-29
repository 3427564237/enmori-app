import assert from 'node:assert/strict';
import test from 'node:test';
import { FirestoreCloudConsentGateway } from '../../src/account/infrastructure/firestore-cloud-consent-gateway.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import type { FirestoreGateway } from '../../src/shared/infrastructure/firebase/firestore-gateway.js';
const epoch={processEpoch:'11111111-1111-4111-8111-111111111111',generation:1};
const path='ai_runtime_fence/current';
test('cloud consent transaction checks exact epoch and host, remains single-attempt, and does no writes on refusal',async()=>{
 for(const stored of [undefined,{...epoch,cleanupGeneration:0},{...epoch,generation:2,cleanupGeneration:0},{...epoch,cleanupGeneration:-1},{...epoch,cleanupGeneration:0,extra:true}]){
  const raw=new InMemoryFirestoreGateway(stored?{[path]:stored}:{});let attempts:unknown;
  const wrapped:FirestoreGateway={runTransaction:(work,options)=>{attempts=options;return raw.runTransaction(work);}};
  const owned=new FirestoreCloudConsentGateway(wrapped,epoch,()=>true);
  const action=()=>owned.runTransaction(async tx=>{tx.set('accounts/synthetic',{saved:true});});
  if(stored&&Object.keys(stored).length===3&&stored.generation===1&&stored.cleanupGeneration===0) await action();
  else {await assert.rejects(action);assert.equal(raw.read('accounts/synthetic'),undefined);}
  assert.deepEqual(attempts,{maxAttempts:1});
 }
 const raw=new InMemoryFirestoreGateway({[path]:{...epoch,cleanupGeneration:0}});let owns=true;
 const owned=new FirestoreCloudConsentGateway(raw,epoch,()=>owns);
 await assert.rejects(()=>owned.runTransaction(async tx=>{tx.set('accounts/synthetic',{saved:true});owns=false;}));
 assert.equal(raw.read('accounts/synthetic'),undefined);
});
test('epoch input is immutable and delayed old work cannot adopt a restarted epoch',async()=>{
 const raw=new InMemoryFirestoreGateway({[path]:{...epoch,generation:2,cleanupGeneration:0}}),mutable={...epoch};
 const old=new FirestoreCloudConsentGateway(raw,mutable,()=>true);mutable.generation=2;
 await assert.rejects(()=>old.runTransaction(async tx=>{tx.set('accounts/synthetic',{saved:true});}));
 assert.equal(raw.read('accounts/synthetic'),undefined);
});
