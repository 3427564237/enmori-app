import test from 'node:test';
import assert from 'node:assert/strict';
import { FirestoreFriendActivity } from '../src/friend-activity/infrastructure/firestore-friend-activity.js';
import { socialEventSource } from '../src/bootstrap/social-event-source.js';
import { createControlledEventBrowse } from '../src/bootstrap/controlled-event-browse.js';
import { FirestoreFriendRecommendations } from '../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js';
import { browseId } from '../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../src/event-browse/domain/source-event-id.js';
import { firestoreSocialAuthority } from '../src/friends/infrastructure/social-authority.js';
import { participationKey } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { friendPairKey } from '../src/friends/infrastructure/firestore-friend-repository.js';
import type { FirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { InMemoryFirestoreGateway } from './support/in-memory-firestore-gateway.js';
import { myFriendsSeed,clock,instant } from './support/my-friends-fixture.js';

const eventId='tm_event_'+'a'.repeat(64);
function fixture(event=eventId){
  const seed=myFriendsSeed(1);
  for(const id of ['owner','target_1'])seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:'accepted',
    fieldPrivacy:{interests:'private',location:'private',participation:'friends_only',mapSharedWithFriends:false}};
  seed['check_ins/check1']={ownerAccountId:'target_1',createdAt:instant,checkInVisibility:'friends_only',note:'Synthetic authorized note'};
  const key=participationKey('target_1',event);
  seed[`event_participations/${key}`]={accountId:'target_1',eventId:event,status:'interested',selectedAt:instant};
  return new InMemoryFirestoreGateway(seed);
}
const occurrence={browseId:'synthetic',title:'Synthetic current Event',startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/synthetic'};

test('concurrent Home recommendation and Activity share one public-source flight and generation',async()=>{
  const item={...occurrence,browseId:browseId('synthetic-shared')!},event=sourceEventId(item.browseId),db=fixture(event);
  const entered=Promise.withResolvers<void>(),release=Promise.withResolvers<void>(),bothPrepared=Promise.withResolvers<void>();
  let batches=0,prepares=0;
  const control=createControlledEventBrowse({projectionCache:true,running:()=>true,track:work=>work(),source:{
    firstBatch:async()=>{throw Error('snapshot must use bounded batch');},detail:async()=>undefined,
    batch:async()=>{batches++;entered.resolve();await release.promise;return {items:[item]};},
  }});control.enable();
  const shared=socialEventSource(control.peek,control.projectionReady,asOf=>{
    prepares++;if(prepares===2)bothPrepared.resolve();
    return control.source.recommendationSnapshot!(asOf,new AbortController().signal);
  });
  const recommendation=new FirestoreFriendRecommendations(db,clock,firestoreSocialAuthority,shared.recommendations).recommend('owner','home');
  const activity=new FirestoreFriendActivity(db,clock,firestoreSocialAuthority,shared.activity).read('owner','home','all');
  await entered.promise;await bothPrepared.promise;assert.equal(batches,1);release.resolve();
  const [recommended,feed]=await Promise.all([recommendation,activity]);
  assert.ok(recommended.ok);assert.ok(feed.ok);assert.equal(batches,1);assert.equal(control.projectionReady(instant),true);
  if(feed.ok)assert.equal(feed.value.activities.find(x=>x.type==='event_interested')?.event?.eventId,event);
  control.disable();
});

test('cold Activity prepares the existing public source outside transactions before current authorized display',async()=>{
  const db=fixture();let transactions=0,prepares=0,ready=false;
  const entered=Promise.withResolvers<void>(),release=Promise.withResolvers<void>();
  const store:FirestoreGateway={runTransaction:work=>db.runTransaction(async tx=>{transactions++;try{return await work(tx);}finally{transactions--;}})};
  const source=socialEventSource(()=>ready?occurrence:undefined,()=>ready,async asOf=>{
    assert.equal(transactions,0);assert.equal(asOf,instant);prepares++;entered.resolve();await release.promise;ready=true;
    return {current:()=>ready};
  });
  const work=new FirestoreFriendActivity(store,clock,firestoreSocialAuthority,source.activity).read('owner','all','all');
  const admitted=await Promise.race([entered.promise.then(()=>true),work.then(()=>false)]);
  assert.equal(admitted,true);assert.equal(transactions,0);release.resolve();
  const result=await work;assert.ok(result.ok);if(!result.ok)return;
  assert.equal(prepares,1);assert.deepEqual(result.value.activities.map(x=>x.type),['check_in_created','event_interested']);
  assert.equal(result.value.activities[1]?.event?.title,occurrence.title);
});

test('Check-in category does not prepare or require the Event source',async()=>{
  const db=fixture();let prepares=0;
  const source=socialEventSource(()=>undefined,()=>false,async()=>{prepares++;throw Error('Synthetic source unavailable');});
  const result=await new FirestoreFriendActivity(db,clock,firestoreSocialAuthority,source.activity).read('owner','all','check_in_created');
  assert.ok(result.ok);if(result.ok)assert.equal(result.value.activities[0]?.checkIn?.note,'Synthetic authorized note');
  assert.equal(prepares,0);
});

test('missing viewer or declined viewer consent never prepares public source or scans friends',async()=>{
  for(const missing of [false,true]){
    const db=fixture();await db.runTransaction(async tx=>{
      if(missing)tx.delete!('accounts/owner');else tx.set('accounts/owner',{...db.read('accounts/owner'),optionalProcessingConsent:'rejected'});
    });
    let prepares=0;
    const store:FirestoreGateway={runTransaction:work=>db.runTransaction(tx=>work({...tx,listPage:async()=>{throw Error('must not scan friends');}}))};
    const source=socialEventSource(()=>undefined,()=>false,async()=>{prepares++;});
    const result=await new FirestoreFriendActivity(store,clock,firestoreSocialAuthority,source.activity).read('owner','all','all');
    assert.equal(prepares,0);assert.equal(result.ok,!missing);if(result.ok)assert.deepEqual(result.value.activities,[]);
  }
});

for(const revoke of ['viewer','source-consent','profile','participation','friendship','block']){
  test(`Activity rechecks ${revoke} authorization after public source preparation`,async()=>{
    const db=fixture();let prepares=0;
    const source=socialEventSource(()=>occurrence,()=>true,async()=>{
      prepares++;
      await db.runTransaction(async tx=>{
        const target=db.read('accounts/target_1')!;
        if(revoke==='viewer')tx.set('accounts/owner',{...db.read('accounts/owner'),optionalProcessingConsent:'rejected'});
        if(revoke==='source-consent')tx.set('accounts/target_1',{...target,optionalProcessingConsent:'rejected'});
        if(revoke==='profile')tx.set('accounts/target_1',{...target,profileVisibility:'private'});
        if(revoke==='participation')tx.set('accounts/target_1',{...target,fieldPrivacy:{interests:'private',location:'private',participation:'private',mapSharedWithFriends:false}});
        const path=`friend_pairs/${friendPairKey('owner','target_1')}`;
        if(revoke==='friendship'||revoke==='block')tx.set(path,{accountIds:['owner','target_1'],friendship:false,pending:null,blockedByAccountIds:revoke==='block'?['owner']:[]});
      });
    });
    const result=await new FirestoreFriendActivity(db,clock,firestoreSocialAuthority,source.activity).read('owner','all','event_interested');
    assert.equal(prepares,1);assert.ok(result.ok);if(result.ok)assert.deepEqual(result.value.activities,[]);
  });
}

for(const reason of ['prepare','missing-title','generation']){
  test(`Activity fails closed on ${reason} failure without a Check-in-only fallback`,async()=>{
    const db=fixture();
    const source=socialEventSource(()=>reason==='missing-title'?undefined:occurrence,()=>true,async()=>{
      if(reason==='prepare')throw Error('Synthetic source failure');return {current:()=>reason!=='generation'};
    });
    const result=await new FirestoreFriendActivity(db,clock,firestoreSocialAuthority,source.activity).read('owner','all','all');
    assert.equal(!result.ok&&result.failure.code,'SERVICE_UNAVAILABLE');
  });
}
