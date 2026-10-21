import assert from 'node:assert/strict';
import test from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { requireRemoteGroupEnvironment } from '../src/shared/infrastructure/firebase/feature-environment.js';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { requireFeatureContextFirestore } from '../src/ai-conversation/infrastructure/isolated-context-firestore.js';
const real = {ENMORI_REMOTE_GROUP:'true',ENMORI_ENVIRONMENT:'controlled-demo',ENMORI_FIREBASE_PROJECT_ID:'enmori-rmvp-controlled'};
test('remote entry is explicit and original isolated entry still rejects real identity',()=>{
  assert.doesNotThrow(()=>requireRemoteGroupEnvironment(real));
  assert.throws(()=>requireRemoteGroupEnvironment({...real,ENMORI_REMOTE_GROUP:'false'}));
  assert.throws(()=>requireRemoteGroupEnvironment({...real,ENMORI_FIREBASE_PROJECT_ID:'other-project'}));
  assert.throws(()=>requireControlledEmulatorEnvironment(real));
  for(const name of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST']){
    assert.throws(()=>requireRemoteGroupEnvironment({...real,[name]:'127.0.0.1:9099'}));
    const saved=process.env[name];process.env[name]='127.0.0.1:9099';
    try{assert.throws(()=>requireRemoteGroupEnvironment(real));}finally{if(saved===undefined)delete process.env[name];else process.env[name]=saved;}
  }
});
test('real SDK binding rejects local or other-project Firestore despite clean config',()=>{
  const db=(projectId:string,_settings:object)=>({projectId,_settings}) as unknown as Firestore;
  assert.doesNotThrow(()=>requireFeatureContextFirestore(db('enmori-rmvp-controlled',{}),real));
  for(const settings of [{ssl:false},{host:'127.0.0.1'},{servicePath:'127.0.0.1'},{port:8088}])
    assert.throws(()=>requireFeatureContextFirestore(db('enmori-rmvp-controlled',settings),real));
  assert.throws(()=>requireFeatureContextFirestore(db('demo-local',{}),real));
});
