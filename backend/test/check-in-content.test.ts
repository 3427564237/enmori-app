import assert from 'node:assert/strict';
import test from 'node:test';
import { CreateCheckIn } from '../src/check-ins/application/create-check-in.js';
import { GetCheckIn } from '../src/check-ins/application/get-check-in.js';
import { FirestoreCheckInRepository } from '../src/check-ins/infrastructure/firestore-check-in-repository.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { InMemoryFirestoreGateway } from './support/in-memory-firestore-gateway.js';
import { normalizeCheckInContent } from '../src/check-ins/domain/content.js';
import { SystemClock } from '../src/shared/infrastructure/system-clock.js';
import { CryptoOpaqueIdGenerator } from '../src/shared/infrastructure/crypto-opaque-id-generator.js';

test('Note or Mood required; display labels bounded and not executable authority',()=>{
 assert.equal(normalizeCheckInContent('',null,'Study').ok,false);
 assert.equal(normalizeCheckInContent('', 'Calm').ok,true);
 assert.equal(normalizeCheckInContent('note',null).ok,true);
 for(const label of ['a'.repeat(51),'a\nb','a\u202eb'])assert.equal(normalizeCheckInContent('note',label).ok,false);
});
test('create Mood-only with explicit visibility, read back and replay; changing Mood under same key conflicts',async()=>{
 const uid='fixture',principal={firebaseUid:uid};
 const store=new InMemoryFirestoreGateway({[`auth_bindings/${createAuthBindingDocumentId(uid)}`]:{accountId:'owner'},'accounts/owner':{username:'member_a',optionalProcessingConsent:'rejected',checkInVisibility:'private',onboardingCompletedAt:'2026-10-19T01:00:00.000Z'}});
 const repository=new FirestoreCheckInRepository(store),create=new CreateCheckIn(repository,new SystemClock(),new CryptoOpaqueIdGenerator());
 const input={principal,note:'',mood:'Happy',activity:'Social',checkInVisibility:'friends_only' as const,idempotencyKey:'A'.repeat(24)};
 const result=await create.execute(input);assert.equal(result.ok,true);
 if(!result.ok) return;
 assert.equal(result.value.checkIn.mood,'Happy');assert.equal(result.value.checkIn.checkInVisibility,'friends_only');
 const read=await new GetCheckIn(repository).execute({principal,checkInId:result.value.checkIn.checkInId});assert.equal(read.ok,true);if(read.ok)assert.deepEqual(read.value,result.value.checkIn);
 const replay=await create.execute(input);assert.equal(replay.ok,true);if(replay.ok)assert.equal(replay.value.disposition,'replayed');
 const conflict=await create.execute({...input,mood:'Calm'});assert.equal(conflict.ok,false);if(!conflict.ok)assert.equal(conflict.failure.code,'IDEMPOTENCY_CONFLICT');
});
