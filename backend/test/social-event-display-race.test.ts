import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { createControlledEventBrowse } from '../src/bootstrap/controlled-event-browse.js';
import { socialEventSource } from '../src/bootstrap/social-event-source.js';
import { sourceEventId } from '../src/event-browse/domain/source-event-id.js';
import { browseId } from '../src/event-browse/domain/browse-values.js';
import { participationKey } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { InMemoryFirestoreGateway } from './support/in-memory-firestore-gateway.js';
import { myFriendsSeed } from './support/my-friends-fixture.js';
import { FirestoreFriendActivity } from '../src/friend-activity/infrastructure/firestore-friend-activity.js';
import { firestoreSocialAuthority } from '../src/friends/infrastructure/social-authority.js';
import { registerFriendActivity } from '../src/friend-activity/transport/friend-activity-route.js';
import { ok } from '../src/shared/domain/result.js';
import type { FirestoreGateway, FirestoreTransactionGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';

const at='2026-10-22T00:00:00.000Z',signal=()=>new AbortController().signal;
const occurrence=(id:string)=>({browseId:browseId(id)!,title:id,startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/synthetic'});
async function fixture(){
  let replace=false;
  const gate=createControlledEventBrowse({projectionCache:true,running:()=>true,track:work=>work(),source:{
    firstBatch:async()=>[occurrence('first')],batch:async(_asOf,page)=>({items:[occurrence(page===0?'first':replace?'replacement':'later')]}),detail:async()=>undefined,
  }});
  gate.enable();await gate.source.batch!(at,0,signal());await gate.source.batch!(at,1,signal());
  const event=sourceEventId(browseId('later')!),key=participationKey('target_1',event),path=`event_participations/${key}`;
  const seed=myFriendsSeed(1);
  for(const id of ['owner','target_1'])seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:'accepted',fieldPrivacy:{interests:'private',location:'private',mapSharedWithFriends:false,participation:'public'}};
  seed[path]={accountId:'target_1',eventId:event,status:'interested',selectedAt:at};
  const db=new InMemoryFirestoreGateway(seed),entered=Promise.withResolvers<void>(),release=Promise.withResolvers<void>();
  const source=socialEventSource(gate.peek,gate.projectionReady);
  const wrap=(tx:FirestoreTransactionGateway):FirestoreTransactionGateway=>({...tx,get:async p=>{
    if(p===path){entered.resolve();await release.promise;}
    return tx.get(p);
  }});
  return {gate,event,key,path,db,source,entered,release,wrap,replace:()=>{replace=true;},metadata:{type:'event_interested' as const,sourceRecordId:key,occurredAt:at}};
}

for(const invalidate of ['none','disable','page-zero','page-one'] as const){
  test(`held participation display validates current canonical title after await: ${invalidate}`,async()=>{
    const f=await fixture();
    const display=f.db.runTransaction(tx=>f.source.activity.display(f.wrap(tx),'owner','target_1',f.metadata,at,'friends_activity_v1'));
    const completion=invalidate==='none'?undefined:assert.rejects(display,/source unavailable/);
    await f.entered.promise;
    if(invalidate==='disable')f.gate.disable();
    if(invalidate==='page-zero')await f.gate.source.batch!(at,0,signal());
    if(invalidate==='page-one'){f.replace();await f.gate.source.batch!(at,1,signal());assert.equal(f.gate.projectionReady(at),true);}
    f.release.resolve();
    if(completion)await completion;else assert.deepEqual(await display,{eventId:f.event,title:'later'});
    assert.equal(f.gate.observation().pending,0);f.gate.disable();
  });
}

for(const removal of ['privacy','deleted','cancelled','changed-selection'] as const){
  test(`real ${removal} remains omission rather than a source failure`,async()=>{
    const f=await fixture();
    if(removal==='privacy'){
      await f.db.runTransaction(async tx=>tx.set('accounts/target_1',{...await tx.get('accounts/target_1'),fieldPrivacy:{participation:'private'}}));
      f.gate.disable();assert.equal(await f.db.runTransaction(tx=>f.source.activity.display(tx,'owner','target_1',f.metadata,at,'friends_activity_v1')),undefined);return;
    }
    // The gateway reads a transaction snapshot. Admit the removed/stale row
    // before starting that snapshot; external commits cannot change it mid-read.
    await f.db.runTransaction(async tx=>{
      if(removal==='deleted')tx.delete!(f.path);
      else tx.set(f.path,{...await tx.get(f.path),...(removal==='cancelled'?{status:'none'}:{selectedAt:'2026-10-22T00:00:01.000Z'})});
    });
    const display=f.db.runTransaction(tx=>f.source.activity.display(f.wrap(tx),'owner','target_1',f.metadata,at,'friends_activity_v1'));
    await f.entered.promise;f.gate.disable();
    f.release.resolve();assert.equal(await display,undefined);
  });
}

for(const invalidate of ['none','disable','page-zero','page-one'] as const){
  test(`actual Friend Activity HTTP preserves canonical later-page content or reports source loss: ${invalidate}`,async t=>{
    const f=await fixture();
    const gateway:FirestoreGateway={runTransaction:work=>f.db.runTransaction(tx=>work(f.wrap(tx)))};
    const app=Fastify();t.after(()=>app.close());
    await registerFriendActivity(app,{verifyIdToken:async()=>({kind:'verified',principal:{firebaseUid:'owner'}})},new FirestoreFriendActivity(gateway,{now:()=>ok(new Date(at))},firestoreSocialAuthority,f.source.activity));
    const pending=app.inject({url:'/v1/me/friends/activity?view=home&category=event_interested',headers:{authorization:'Bearer synthetic'}});
    // LightMyRequest starts on promise observation, not construction alone.
    const response=Promise.resolve(pending);
    await Promise.race([f.entered.promise,response.then(r=>{throw new Error(`Harness ended before held read: ${r.statusCode}`);})]);
    if(invalidate==='disable')f.gate.disable();
    if(invalidate==='page-zero')await f.gate.source.batch!(at,0,signal());
    if(invalidate==='page-one'){f.replace();await f.gate.source.batch!(at,1,signal());}
    f.release.resolve();const result=await response;
    if(invalidate==='none'){
      assert.equal(result.statusCode,200,result.body);
      assert.equal(result.json().activities.length,1);
      assert.deepEqual(result.json().activities[0].event,{eventId:f.event,title:'later'});
      assert.equal(result.json().activities[0].occurredAt,at);
    }else{
      assert.equal(result.statusCode,503);assert.equal(result.json().error.code,'SERVICE_UNAVAILABLE');
    }
    assert.equal(result.headers['cache-control'],'no-store');assert.equal(f.gate.observation().pending,0);f.gate.disable();
  });
}
