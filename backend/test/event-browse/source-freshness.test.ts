import test from 'node:test';
import assert from 'node:assert/strict';
import { OnePaBrowseSource } from '../../src/event-browse/infrastructure/onepa-browse-source.js';
import { CombinedEventSource } from '../../src/event-browse/infrastructure/combined-event-source.js';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import { sourceEventId } from '../../src/event-browse/domain/source-event-id.js';
import type { BrowseSource, SourceFreshness } from '../../src/event-browse/ports/event-browse.js';
const start=Date.parse('2026-11-17T00:00:00Z'),signal=new AbortController().signal;
const iso=(n:number)=>new Date(n).toISOString();
const fresh=(n:number):SourceFreshness=>({acquiredAt:iso(n),expiresAt:iso(n+300000)});
const item={product:{ID:'PA-Event-34316958',Name:'Cooking workshop',Active:true,xp:{
  Private:0,Published:true,InvitationOnly:0,UsePassword:0,ProductType:'Event',Timezone:'8.0',Event:{Id:34316958},
  StartDate:'2026-11-28T11:00:00+00:00',EndDate:'2026-11-28T13:00:00+00:00'}},
  url:'https://www.onepa.gov.sg/events/synthetic-34316958'};
const empty={firstBatch:async()=>[],detail:async()=>undefined};

test('onePA re-projection preserves acquisition time, frozen expiry, and coverage',async()=>{
  let now=start,reads=0;
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{reads++;return {items:[item],complete:false};},()=>now,()=>now);
  await source.warm(signal);const first=await source.batch(iso(now),0,signal);
  now+=299999;const next=await source.batch(iso(now),0,signal);
  assert.equal(reads,1);assert.equal(next.items[0]?.content?.fetchedAt,iso(start));
  assert.deepEqual(next.sourceFreshness,fresh(start));assert.equal(next.sourceFreshness,first.sourceFreshness);
  assert.ok(Object.isFrozen(next.sourceFreshness));assert.equal(next.sourceCoverage?.[0]?.complete,false);
});

test('recommendation snapshot cannot re-age near-expiry provider data, including current() after an await',async()=>{
  let now=start;
  const onepa=new OnePaBrowseSource(()=>true,async()=>'',async()=>({items:[item],complete:true}),()=>now,()=>now);
  const combined=new CombinedEventSource(empty,onepa),projection=new ControlledSourceProjection(combined,()=>now);
  await onepa.warm(signal);now+=299000;
  const at=iso(now),snapshot=await projection.recommendationSnapshot(at,signal);
  assert.equal(snapshot.items.length,1);assert.equal(snapshot.current(),true);assert.equal(projection.ready(at),true);
  now+=1000;
  assert.equal(snapshot.current(),false);assert.equal(projection.ready(at),false);
  assert.equal(projection.peek(sourceEventId(snapshot.items[0]!.browseId),at),undefined);
});

test('array-only firstBatch path of a warming source retains source expiry for detail and social reads',async()=>{
  let now=start;
  const onepa=new OnePaBrowseSource(()=>true,async()=>'',async()=>({items:[item],complete:true}),()=>now,()=>now);
  const projection=new ControlledSourceProjection(new CombinedEventSource(empty,onepa),()=>now);
  await onepa.warm(signal);now+=299000;
  const at=iso(now),items=await projection.firstBatch(at,signal);
  assert.equal(items.length,1);assert.equal(projection.ready(at),true);
  now+=1000;assert.equal(projection.ready(at),false);assert.equal(projection.peek(sourceEventId(items[0]!.browseId),at),undefined);
});

test('combined source retains immutable lifetime after onePA exhausts and rejects replacement within a listing',async()=>{
  const sourceFreshness={...fresh(start)};let calls=0;
  const onepa={...empty,batch:async()=>{calls++;return {items:[],sourceFreshness};}};
  const combined=new CombinedEventSource({...empty,batch:async(_at,page)=>({items:[],...(page<2?{nextPage:page+1}:{})})},onepa);
  const first=await combined.batch(iso(start),0,signal);sourceFreshness.expiresAt=iso(start+999999);
  const next=await combined.batch(iso(start),1,signal);assert.equal(calls,1);
  assert.equal(next.sourceFreshness,first.sourceFreshness);assert.equal(next.sourceFreshness?.expiresAt,iso(start+300000));
  const swapped=new CombinedEventSource(empty,{...empty,batch:async(_at,page)=>({items:[],sourceFreshness:fresh(start+page*1000),...(page===0?{nextPage:1}:{})})});
  await swapped.batch(iso(start),0,signal);const second=await swapped.batch(iso(start),1,signal);
  assert.equal(second.sourceStatus[1]?.available,false);assert.equal(second.sourceFreshness,undefined);
});

test('known freshness missing or changing between pages fails before complete snapshot publication',async()=>{
  for(const variant of ['missing','changed']){
    const projection=new ControlledSourceProjection({...empty,status:()=>[],batch:async(_at,page)=>({items:[],
      ...(page===0?{sourceFreshness:fresh(start),nextPage:1}:variant==='changed'?{sourceFreshness:fresh(start+1)}:{})})},()=>start+10);
    await assert.rejects(projection.recommendationSnapshot(iso(start+10),signal));assert.equal(projection.ready(iso(start+10)),false);
  }
});

test('malformed, future or expired freshness cannot publish even a first Browse page',async()=>{
  for(const sourceFreshness of [null,{},fresh(start+1),fresh(start-300000),{...fresh(start),expiresAt:iso(start+300001)},
    {...fresh(start),extra:true},{acquiredAt:'invalid',expiresAt:iso(start+300000)}]){
    const projection=new ControlledSourceProjection({...empty,batch:async()=>({items:[],sourceFreshness})} as unknown as BrowseSource,()=>start);
    await assert.rejects(projection.batch!(iso(start),0,signal));assert.equal(projection.ready(iso(start)),false);
  }
});

test('warming firstBatch validates status and coverage before making rejected data ready',async()=>{
  for(const metadata of [
    {sourceStatus:[{provider:'onepa',available:true}],sourceCoverage:[{provider:'onepa',complete:'invalid'}]},
    {sourceStatus:[{provider:'onepa',available:'invalid'}]},
    {sourceStatus:[{provider:'onepa',available:false}],sourceCoverage:[{provider:'onepa',complete:false}]},
  ]){
    const projection=new ControlledSourceProjection({...empty,warm:async()=>{},batch:async()=>({items:[],sourceFreshness:fresh(start),...metadata})} as unknown as BrowseSource,()=>start);
    await assert.rejects(projection.firstBatch(iso(start),signal));assert.equal(projection.ready(iso(start)),false);
  }
});
