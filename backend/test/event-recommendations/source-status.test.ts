import assert from 'node:assert/strict';
import test from 'node:test';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import type { BrowseSource } from '../../src/event-browse/ports/event-browse.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { createControlledEventBrowse } from '../../src/bootstrap/controlled-event-browse.js';
import { createControlledEventRecommendations } from '../../src/bootstrap/controlled-event-recommendations.js';
import { eventTestRecords, EVENT_TEST_UID } from '../support/event-repository-contract.js';
import { ok } from '../../src/shared/domain/result.js';

const asOf='2026-11-17T00:00:00Z';
const signal=new AbortController().signal;
const occurrence=(id:number)=>({browseId:browseId(`occurrence_${id}`)!,title:`Synthetic ${id}`,
  startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/example'});

test('controlled runtime gate and personalized composition retain the same status and invalidate together',async()=>{
  const sourceStatus=[{provider:'ticketmaster',available:true},{provider:'onepa',available:false}];
  const gate=createControlledEventBrowse({projectionCache:true,running:()=>true,track:work=>work(),
    source:{firstBatch:async()=>[],detail:async()=>undefined,batch:async()=>({items:[],sourceStatus})}});
  gate.enable();
  const records=eventTestRecords();
  const composed=createControlledEventRecommendations({source:gate.source,clock:{now:()=>ok(new Date(asOf))},
    gateway:{get:async path=>records[path],listEvents:async()=>[]},
    personalized:{read:async(_uid,_at,snapshot)=>({kind:'ready',sources:{formulaVersion:'event_recommendation_v3',
      ...(snapshot.sourceStatus===undefined?{}:{sourceStatus:snapshot.sourceStatus}),selectedInterestTagIds:[],interestTags:[],events:[]}})}});
  const result=await composed.recommendEvents.execute({principal:{firebaseUid:EVENT_TEST_UID},view:'home'});
  assert.ok(result.ok);assert.deepEqual(result.value.sourceStatus,sourceStatus);
  const snapshot=await gate.source.recommendationSnapshot!(asOf,signal);
  assert.deepEqual(snapshot.sourceStatus,sourceStatus);
  gate.disable();
  assert.equal(snapshot.current(),false);
  const disabled=await composed.recommendEvents.execute({principal:{firebaseUid:EVENT_TEST_UID},view:'home'});
  assert.equal(disabled.ok,false);
});

test('complete recommendation status is frozen with its candidates, never reread from global state',async()=>{
  const statuses=[{provider:'ticketmaster',available:true},{provider:'onepa',available:false}];
  let calls=0;
  const source=new ControlledSourceProjection({firstBatch:async()=>[],detail:async()=>undefined,
    status:()=>{throw Error('mutable global status must not be read');},
    batch:async(_at,page)=>{calls++;return{items:[occurrence(page)],sourceStatus:statuses,...(page===0?{nextPage:1}:{})};}});
  const snapshot=await source.recommendationSnapshot(asOf,signal);
  assert.equal(snapshot.items.length,2);
  assert.deepEqual(snapshot.sourceStatus,[{provider:'ticketmaster',available:true},{provider:'onepa',available:false}]);
  statuses[1]!.available=true;
  assert.equal(snapshot.sourceStatus?.[1]?.available,false);
  assert.equal(Object.isFrozen(snapshot.sourceStatus),true);
  assert.equal(Object.isFrozen(snapshot.sourceStatus?.[0]),true);
  const cached=await source.recommendationSnapshot(asOf,signal);
  assert.equal(calls,2);
  assert.equal(cached.sourceStatus,snapshot.sourceStatus);
  await source.batch!(asOf,0,signal);
  assert.equal(snapshot.current(),false);
  const refreshed=await source.recommendationSnapshot(asOf,signal);
  assert.equal(refreshed.sourceStatus?.[1]?.available,true);
});

test('missing per-page status remains unknown, even when mutable source status exists',async()=>{
  for(const missingPage of [0,1]){
    const source=new ControlledSourceProjection({firstBatch:async()=>[],detail:async()=>undefined,
      status:()=>[{provider:'onepa',available:true}],
      batch:async(_at,page)=>({items:[],...(page===missingPage?{}:{sourceStatus:[{provider:'onepa',available:true}]}),...(page===0?{nextPage:1}:{})})});
    assert.equal((await source.recommendationSnapshot(asOf,signal)).sourceStatus,undefined);
  }
});

test('a healthy provider lost on a later page does not publish partial recommendation candidates',async()=>{
  const source=new ControlledSourceProjection({firstBatch:async()=>[],detail:async()=>undefined,
    batch:async(_at,page)=>({items:[occurrence(page)],sourceStatus:[{provider:'ticketmaster',available:true},{provider:'onepa',available:page===0}],...(page===0?{nextPage:1}:{})})});
  await assert.rejects(source.recommendationSnapshot(asOf,signal));
  assert.equal(source.ready(asOf),false);
});

test('malformed or duplicate source status never becomes a ready snapshot',async()=>{
  for(const sourceStatus of [null,{},[{provider:'other',available:true}],
    [{provider:'onepa',available:1}],[{provider:'onepa'}],
    [{provider:'onepa',available:true},{provider:'onepa',available:false}],
    [{provider:'onepa',available:true,privateReason:'synthetic-secret'}]]){
    const source=new ControlledSourceProjection({firstBatch:async()=>[],detail:async()=>undefined,
      batch:async()=>({items:[],sourceStatus})} as unknown as BrowseSource);
    await assert.rejects(source.recommendationSnapshot(asOf,signal));
    assert.equal(source.ready(asOf),false);
  }
});
