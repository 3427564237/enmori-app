import assert from 'node:assert/strict';
import test from 'node:test';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import type { BrowseOccurrence } from '../../src/event-browse/ports/event-browse.js';

const at='2026-10-26T00:00:00.000Z';
const item:BrowseOccurrence={browseId:'tm_c3ludGhldGlj',title:'Synthetic only',
  startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/synthetic'};
const signal=()=>new AbortController().signal;
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const wait=(ms:number,abort:AbortSignal)=>new Promise<void>((resolve,reject)=>{
  const cancel=()=>{clearTimeout(timer);reject(Error('Synthetic abort'));};
  const timer=setTimeout(()=>{abort.removeEventListener('abort',cancel);resolve();},ms);
  abort.addEventListener('abort',cancel,{once:true});if(abort.aborted)cancel();
});
function deferred<T>(){
  let resolve!:(value:T)=>void;
  const promise=new Promise<T>(done=>{resolve=done;});
  return {promise,resolve};
}

test('the ten-second aggregate budget includes six seconds joining browse plus traversal',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let first=0,batches=0,stopped=false;
  const source=new ControlledSourceProjection({
    firstBatch:async(_at,abort)=>{first++;await wait(6000,abort);return [item];},
    batch:async(_at,page,abort)=>{batches++;assert.equal(page,0);try{await wait(6000,abort);}catch(e){stopped=true;throw e;}return {items:[item]};},
    detail:async()=>undefined,
  });
  const browse=source.firstBatch(at,signal());
  let settled=false,rejected=false;
  const read=source.recommendationSnapshot(at,signal()).then(()=>{settled=true;},()=>{settled=true;rejected=true;});
  t.mock.timers.tick(6000);await flush();await browse;
  assert.equal(first,1);assert.equal(batches,1);
  t.mock.timers.tick(3999);await flush();assert.equal(settled,false);
  t.mock.timers.tick(1);await flush();await read;
  assert.equal(rejected,true);assert.equal(stopped,true);assert.equal(source.ready(at),false);
});

test('cancelling a waiter releases it promptly without cancelling the browse owner',async()=>{
  const pending=deferred<readonly BrowseOccurrence[]>(),owner=new AbortController(),waiter=new AbortController();
  let batches=0;
  const source=new ControlledSourceProjection({firstBatch:async()=>pending.promise,
    batch:async()=>{batches++;return {items:[item]};},detail:async()=>undefined});
  const browse=source.firstBatch(at,owner.signal);
  const joined=assert.rejects(source.recommendationSnapshot(at,waiter.signal));
  waiter.abort();await joined;
  assert.equal(owner.signal.aborted,false);assert.equal(batches,0);
  pending.resolve([item]);await browse;
  assert.equal((await source.recommendationSnapshot(at,signal())).items.length,1);
});

test('deadline releases a waiter even when the shared owner never settles in time',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const pending=deferred<readonly BrowseOccurrence[]>();let batches=0;
  const source=new ControlledSourceProjection({firstBatch:async()=>pending.promise,
    batch:async()=>{batches++;return {items:[item]};},detail:async()=>undefined});
  const browse=source.firstBatch(at,signal());
  const joined=assert.rejects(source.recommendationSnapshot(at,signal()));
  t.mock.timers.tick(10000);await flush();await joined;
  assert.equal(batches,0);pending.resolve([item]);await browse;
});

test('late abort-insensitive traversal cannot publish after timeout and a fresh read can recover',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const pending=deferred<{items:readonly BrowseOccurrence[]}>();let batches=0;
  const source=new ControlledSourceProjection({firstBatch:async()=>[item],
    batch:async()=>++batches===1?pending.promise:{items:[item]},detail:async()=>undefined});
  const timed=assert.rejects(source.recommendationSnapshot(at,signal()));
  t.mock.timers.tick(10000);await flush();await timed;
  assert.equal(source.ready(at),false);
  const fresh=await source.recommendationSnapshot(at,signal());assert.equal(fresh.current(),true);
  pending.resolve({items:[{...item,title:'Retired'}]});await flush();
  assert.equal(fresh.current(),true);assert.equal(fresh.items[0]?.title,item.title);
  t.mock.timers.tick(10000);await flush();assert.equal(fresh.current(),true);
});

test('clearing the source while joining rejects the old waiter without a new traversal',async()=>{
  const pending=deferred<readonly BrowseOccurrence[]>();let batches=0;
  const source=new ControlledSourceProjection({firstBatch:async()=>pending.promise,
    batch:async()=>{batches++;return {items:[item]};},detail:async()=>undefined});
  const browse=source.firstBatch(at,signal()),oldBrowse=assert.rejects(browse);
  const joined=assert.rejects(source.recommendationSnapshot(at,signal()));
  source.clear();pending.resolve([item]);await oldBrowse;await joined;assert.equal(batches,0);
});

test('multi-provider snapshot allows the ninety-second provider outcome before ranking',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let calls=0,settled=false;
  const source=new ControlledSourceProjection({
    status:()=>[{provider:'ticketmaster',available:true},{provider:'onepa',available:false}],
    firstBatch:async()=>[item],detail:async()=>undefined,
    batch:async(_at,page,abort)=>{calls++;assert.equal(page,0);await wait(90000,abort);return {items:[item]};},
  });
  const read=source.recommendationSnapshot(at,signal());
  void read.then(()=>{settled=true;},()=>{settled=true;});
  t.mock.timers.tick(45000);await flush();assert.equal(settled,false);
  t.mock.timers.tick(45000);await flush();
  const result=await read;
  assert.equal(result.current(),true);assert.deepEqual(result.items,[item]);assert.equal(calls,1);
});

test('multi-provider snapshot still fails closed at its 110-second total deadline',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const pending=deferred<{items:readonly BrowseOccurrence[]}>();let settled=false,calls=0;
  const source=new ControlledSourceProjection({
    status:()=>[{provider:'ticketmaster',available:true}],
    firstBatch:async()=>[item],detail:async()=>undefined,
    batch:async()=>{calls++;return pending.promise;},
  });
  const read=source.recommendationSnapshot(at,signal());
  const rejected=assert.rejects(read);void rejected.then(()=>{settled=true;});
  t.mock.timers.tick(109999);await flush();assert.equal(settled,false);
  t.mock.timers.tick(1);await flush();await rejected;
  pending.resolve({items:[item]});await flush();
  assert.equal(source.ready(at),false);assert.equal(calls,1);
});
