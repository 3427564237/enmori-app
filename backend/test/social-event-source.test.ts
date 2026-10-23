import test from 'node:test';
import assert from 'node:assert/strict';
import { socialEventSource } from '../src/bootstrap/social-event-source.js';
import { participationKey } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { InMemoryFirestoreGateway } from './support/in-memory-firestore-gateway.js';
const event='tm_event_'+'a'.repeat(64),at='2026-10-21T00:00:00.000Z',key=participationKey('owner',event);
function fixture(){return new InMemoryFirestoreGateway({
 'accounts/owner':{optionalProcessingConsent:'accepted',fieldPrivacy:{participation:'public'}},
 'friend_access/owner':{eligibilityState:'eligible'},
 [`event_participations/${key}`]:{accountId:'owner',eventId:event,status:'interested',selectedAt:at},
});}
test('producer uses actual selection time and rechecks revocation before title display',async()=>{
 const db=fixture(),source=socialEventSource(()=>({browseId:'b',title:'Current title',startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg'}),()=>true);
 const rows=await db.runTransaction(tx=>source.activity.read(tx,'viewer','owner',at,'friends_activity_v1'));
 assert.equal(rows?.[0]?.occurredAt,at);
 await db.runTransaction(async tx=>tx.set('accounts/owner',{optionalProcessingConsent:'accepted',fieldPrivacy:{participation:'private'}}));
 const result=await db.runTransaction(tx=>source.activity.display(tx,'viewer','owner',rows![0]!,at,'friends_activity_v1'));
 assert.equal(result,undefined);
});
test('cold source is unavailable and old rows do not borrow preference update timestamps',async()=>{
 const db=fixture(),cold=socialEventSource(()=>undefined,()=>false);
 await assert.rejects(db.runTransaction(tx=>cold.activity.read(tx,'viewer','owner',at,'friends_activity_v1')));
 await db.runTransaction(async tx=>tx.set(`event_participations/${key}`,{accountId:'owner',eventId:event,status:'going',updatedAt:at}));
 const source=socialEventSource(()=>({browseId:'b',title:'Current',startAt:at,externalSourceUrl:'https://ticketmaster.sg'}),()=>true);
 assert.deepEqual(await db.runTransaction(tx=>source.activity.read(tx,'viewer','owner',at,'friends_activity_v1')),[]);
});

test('a recent authorized selection with unobserved title is unavailable, not a successful empty feed',async()=>{
 const db=fixture(),source=socialEventSource(()=>undefined,()=>true);
 await assert.rejects(db.runTransaction(tx=>source.activity.read(tx,'viewer','owner',at,'friends_activity_v1')));
 // Historical selections outside the retained seven-day feed do not demand a source fetch.
 await db.runTransaction(async tx=>tx.set(`event_participations/${key}`,{accountId:'owner',eventId:event,status:'interested',selectedAt:'2026-10-01T00:00:00.000Z'}));
 assert.deepEqual(await db.runTransaction(tx=>source.activity.read(tx,'viewer','owner',at,'friends_activity_v1')),[]);
});
