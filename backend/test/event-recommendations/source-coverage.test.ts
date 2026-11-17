import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { CombinedEventSource } from '../../src/event-browse/infrastructure/combined-event-source.js';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import { EventBrowse } from '../../src/event-browse/application/event-browse.js';
import { registerEventBrowseRoutes } from '../../src/event-browse/transport/register-routes.js';
import { createControlledEventBrowse } from '../../src/bootstrap/controlled-event-browse.js';
import type { BrowseSource } from '../../src/event-browse/ports/event-browse.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../../src/event-browse/domain/source-event-id.js';
import { ok } from '../../src/shared/domain/result.js';

const asOf='2026-11-17T00:00:00Z',signal=new AbortController().signal;
const empty={firstBatch:async()=>[],detail:async()=>undefined};
const available=[{provider:'onepa',available:true}];

test('combined listing freezes coverage, retains it after onePA exhaustion, and refresh replaces it',async()=>{
  const sourceCoverage=[{provider:'onepa' as const,complete:false}];let reads=0;
  const source=new CombinedEventSource({...empty,batch:async(_at,page)=>({items:[],...(page<2?{nextPage:page+1}:{})})},
    {...empty,batch:async()=>{reads++;return{items:[],sourceCoverage};}});
  const first=await source.batch(asOf,0,signal);
  assert.deepEqual(first.sourceCoverage,[{provider:'onepa',complete:false}]);
  sourceCoverage[0]!.complete=true;
  for(const page of [1,2]){
    const next=await source.batch(asOf,page,signal);
    assert.equal(next.sourceCoverage,first.sourceCoverage);
    assert.equal(next.sourceCoverage?.[0]?.complete,false);
  }
  assert.equal(reads,1);assert.equal(Object.isFrozen(first.sourceCoverage),true);
  assert.equal(Object.isFrozen(first.sourceCoverage?.[0]),true);
  assert.equal((await source.batch(asOf,0,signal)).sourceCoverage?.[0]?.complete,true);
  assert.equal(reads,2);
});

test('combined listing rejects losing or inventing coverage on an actual subsequent provider page',async()=>{
  for(const missingPage of [0,1]){
    const onepa={...empty,batch:async(_at:string,page:number)=>({items:[],...(page===0?{nextPage:1}:{}),
      ...(page===missingPage?{}:{sourceCoverage:[{provider:'onepa' as const,complete:false}]})})};
    const source=new CombinedEventSource(empty,onepa);
    await source.batch(asOf,0,signal);
    const second=await source.batch(asOf,1,signal);
    assert.equal(second.sourceStatus[1]?.available,false);
    assert.equal(second.sourceCoverage,undefined);
  }
});

test('unavailable onePA has no coverage; two unavailable providers remain failure',async()=>{
  const failed={...empty,batch:async()=>{throw Error('unavailable');}};
  const result=await new CombinedEventSource(empty,failed).batch(asOf,0,signal);
  assert.equal(result.sourceCoverage,undefined);
  assert.deepEqual(result.sourceStatus,[{provider:'ticketmaster',available:true},{provider:'onepa',available:false}]);
  await assert.rejects(new CombinedEventSource(failed,failed).batch(asOf,0,signal));
});

test('complete snapshot and runtime gate capture coverage and retire it with candidates',async()=>{
  const sourceCoverage=[{provider:'onepa' as const,complete:false}];let reads=0;
  const gate=createControlledEventBrowse({projectionCache:true,running:()=>true,track:work=>work(),source:{...empty,
    status:()=>{throw Error('must not read mutable global metadata');},batch:async(_at,page)=>{
      reads++;return{items:[],sourceStatus:available,sourceCoverage,...(page===0?{nextPage:1}:{})};}}});
  gate.enable();
  const snapshot=await gate.source.recommendationSnapshot!(asOf,signal);
  assert.equal(reads,2);assert.equal(snapshot.sourceCoverage?.[0]?.complete,false);
  sourceCoverage[0]!.complete=true;
  assert.equal(snapshot.sourceCoverage?.[0]?.complete,false);
  assert.equal((await gate.source.recommendationSnapshot!(asOf,signal)).sourceCoverage,snapshot.sourceCoverage);
  await gate.source.batch!(asOf,0,signal);
  assert.equal(snapshot.current(),false);
  assert.equal((await gate.source.recommendationSnapshot!(asOf,signal)).sourceCoverage?.[0]?.complete,true);
  gate.disable();
});

test('all-page unknown coverage stays unknown; missing or changed coverage within a generation fails closed',async()=>{
  for(const missingPage of [0,1]){
    const source=new ControlledSourceProjection({...empty,batch:async(_at,page)=>({items:[],sourceStatus:available,
      ...(page===missingPage?{}:{sourceCoverage:[{provider:'onepa',complete:false}]}),...(page===0?{nextPage:1}:{})})});
    await assert.rejects(source.recommendationSnapshot(asOf,signal));
  }
  const unknown=new ControlledSourceProjection({...empty,batch:async(_at,page)=>({items:[],sourceStatus:available,...(page===0?{nextPage:1}:{})})});
  assert.equal((await unknown.recommendationSnapshot(asOf,signal)).sourceCoverage,undefined);
  const changed=new ControlledSourceProjection({...empty,batch:async(_at,page)=>({items:[],sourceStatus:available,
    sourceCoverage:[{provider:'onepa',complete:page!==0}],...(page===0?{nextPage:1}:{})})});
  await assert.rejects(changed.recommendationSnapshot(asOf,signal));assert.equal(changed.ready(asOf),false);
});

test('malformed or contradictory coverage never publishes a ready snapshot',async()=>{
  for(const sourceCoverage of [null,{},[{provider:'ticketmaster',complete:false}],[{provider:'onepa',complete:1}],
    [{provider:'onepa'}],[{provider:'onepa',complete:true},{provider:'onepa',complete:false}],
    [{provider:'onepa',complete:false,privateReason:'not-public'}]]){
    const source=new ControlledSourceProjection({...empty,batch:async()=>({items:[],sourceStatus:available,sourceCoverage})} as unknown as BrowseSource);
    await assert.rejects(source.recommendationSnapshot(asOf,signal));
  }
  for(const sourceStatus of [undefined,[{provider:'onepa',available:false}]]){
    const source=new ControlledSourceProjection({...empty,batch:async()=>({items:[],...(sourceStatus?{sourceStatus}:{}),sourceCoverage:[{provider:'onepa',complete:false}]})});
    await assert.rejects(source.recommendationSnapshot(asOf,signal));
  }
  const unknown=new ControlledSourceProjection({...empty,batch:async()=>({items:[],sourceCoverage:[]})});
  assert.equal((await unknown.recommendationSnapshot(asOf,signal)).sourceCoverage,undefined);
});

test('rejected first or later Browse coverage never publishes the rejected rows into shared caches',async()=>{
  const rows=[0,1].map(index=>({browseId:browseId('rejected_'+index)!,title:'Synthetic',
    startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/example'}));
  for(const failedPage of [0,1]){
    const source=new ControlledSourceProjection({...empty,batch:async(_at:string,page:number)=>({items:[rows[page]!],sourceStatus:available,
      sourceCoverage:page===failedPage?[{provider:'onepa',complete:'invalid'}]:[{provider:'onepa',complete:false}]})} as unknown as BrowseSource);
    if(failedPage===1)await source.batch!(asOf,0,signal);
    await assert.rejects(source.batch!(asOf,failedPage,signal));
    assert.equal(source.peek(sourceEventId(rows[failedPage]!.browseId),asOf),undefined);
    if(failedPage===0){
      assert.equal(source.ready(asOf),false);
      assert.deepEqual(await source.firstBatch(asOf,signal),[]);
    }else{
      assert.equal(source.peek(sourceEventId(rows[0]!.browseId),asOf)?.browseId,rows[0]!.browseId);
      assert.deepEqual(await source.firstBatch(asOf,signal),[rows[0]!]);
    }
  }
});

test('Browse emits coverage only inside the available onePA row and preserves old top-level keys',async()=>{
  for(const complete of [false,true]){
    const combined=new CombinedEventSource(empty,{...empty,batch:async()=>({items:[],sourceCoverage:[{provider:'onepa',complete}]})});
    const gate=createControlledEventBrowse({source:combined,projectionCache:true,running:()=>true,track:work=>work()});
    gate.enable();
    const source=gate.source;
    const app=Fastify();app.decorateRequest('authPrincipal',null);
    await registerEventBrowseRoutes(app,{verifyIdToken:async()=>({kind:'verified',principal:{firebaseUid:'synthetic'}})},
      new EventBrowse({verify:async()=>ok(undefined)},source,()=>new Date(asOf),true,{encode:()=>'',decode:()=>undefined}));
    try{
      const headers={authorization:'Bearer synthetic','x-enmori-contract-version':'3'};
      const response=await app.inject({url:'/v1/event-browse',headers});
      assert.equal(response.statusCode,200);
      assert.deepEqual(Object.keys(response.json()).sort(),['asOf','scope','sourceStatus','items'].sort());
      assert.deepEqual(response.json().sourceStatus,[{provider:'ticketmaster',available:true},{provider:'onepa',available:true,coverageComplete:complete}]);
      const legacy=await app.inject({url:'/v1/event-browse',headers:{authorization:'Bearer synthetic'}});
      assert.equal(legacy.statusCode,200);assert.equal(legacy.json().sourceStatus,undefined);
      assert.equal(legacy.json().sourceCoverage,undefined);
    }finally{await app.close();}
  }
});
