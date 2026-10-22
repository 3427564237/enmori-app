import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { sourceEventId } from '../src/event-browse/domain/source-event-id.js';
import { browseId } from '../src/event-browse/domain/browse-values.js';
import { socialEventSource } from '../src/bootstrap/social-event-source.js';
import { participationKey } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { registerSocialModule } from '../src/bootstrap/register-social-module.js';
import { FirestoreFriendActivity } from '../src/friend-activity/infrastructure/firestore-friend-activity.js';
import { firestoreSocialAuthority } from '../src/friends/infrastructure/social-authority.js';
import { InMemoryFirestoreGateway } from './support/in-memory-firestore-gateway.js';
import { myFriendsSeed, clock, instant } from './support/my-friends-fixture.js';
import { AesGcmHistoryCursorCodec } from '../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js';

for (const status of ['interested','going'] as const) {
  test(`actual canonical source -> participation -> Friend Activity HTTP retains ${status} ID/title/time and revokes`, async () => {
    const locator = browseId('synthetic-canonical-occurrence')!, eventId = sourceEventId(locator);
    const seed = myFriendsSeed(1);
    for (const id of ['owner','target_1']) seed[`accounts/${id}`] = {...seed[`accounts/${id}`], optionalProcessingConsent:'accepted'};
    seed['accounts/target_1'] = {...seed['accounts/target_1'],fieldPrivacy:{participation:'friends_only',location:'private',interests:'private',mapSharedWithFriends:false}};
    const key = participationKey('target_1',eventId);
    seed[`event_participations/${key}`] = {accountId:'target_1',eventId,status,selectedAt:instant,updatedAt:'2026-10-08T00:00:00.000Z'};
    const store = new InMemoryFirestoreGateway(seed);
    const source = socialEventSource(id => id === eventId ? {browseId:locator,title:'Actual mapped title',startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg'} : undefined,() => true);
    const app = Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
    await registerSocialModule(app,{identity:{verifyIdToken:async()=>({kind:'verified',principal:{firebaseUid:'owner'}})},
      store,history:{runTransaction:async()=>{throw new Error('not called');}},cursor:new AesGcmHistoryCursorCodec(Buffer.alloc(32,5)),clock,
      weather:{current:async()=>undefined},activityEvents:source.activity});
    try {
      for (const view of ['home','all']) {
        const response = await app.inject({method:'GET',url:`/v1/me/friends/activity?view=${view}&category=event_${status}`,headers:{authorization:'Bearer synthetic'}});
        assert.equal(response.statusCode,200,response.body);
        assert.equal(response.headers['cache-control'],'no-store');
        assert.deepEqual(response.json().activities[0]?.event,{eventId,title:'Actual mapped title'});
        assert.equal(response.json().activities[0]?.occurredAt,instant);
      }
      await store.runTransaction(async tx=>tx.set('accounts/target_1',{...seed['accounts/target_1'],fieldPrivacy:{participation:'private',location:'private',interests:'private',mapSharedWithFriends:false}}));
      const revoked = await app.inject({method:'GET',url:'/v1/me/friends/activity?view=all&category=all',headers:{authorization:'Bearer synthetic'}});
      assert.equal(revoked.statusCode,200);
      assert.deepEqual(revoked.json(),{activities:[]});
    } finally { await app.close(); }
  });
}
for (const eventId of ['tm_opaque','tm_event_'+'A'.repeat(64),'tm_event_'+'a'.repeat(63),'tm_event_'+'a'.repeat(64)+'\n']) {
  test(`malformed/opaque source ID remains rejected: ${JSON.stringify(eventId)}`, async()=>{
    const seed=myFriendsSeed(1);
    for(const id of ['owner','target_1']) seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:'accepted'};
    seed['accounts/target_1']={...seed['accounts/target_1'],fieldPrivacy:{participation:'friends_only',location:'private',interests:'private',mapSharedWithFriends:false}};
    const repo=new FirestoreFriendActivity(new InMemoryFirestoreGateway(seed),clock,firestoreSocialAuthority,{
      read:async()=>[{type:'event_going',sourceRecordId:'row',occurredAt:instant}],
      display:async()=>({eventId,title:'Title'})});
    const result=await repo.read('owner','all','event_going');
    assert.equal(!result.ok&&result.failure.code,'SERVICE_UNAVAILABLE');
  });
}
