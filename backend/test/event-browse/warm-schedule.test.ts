import test from 'node:test';
import assert from 'node:assert/strict';
import { OnePaBrowseSource } from '../../src/event-browse/infrastructure/onepa-browse-source.js';
import { CombinedEventSource } from '../../src/event-browse/infrastructure/combined-event-source.js';
import { createControlledEventBrowse } from '../../src/bootstrap/controlled-event-browse.js';
import type { OnePaCatalogue } from '../../src/event-browse/infrastructure/onepa-public-catalogue.js';
const start=Date.parse('2026-11-17T00:00:00Z'),signal=new AbortController().signal,empty:OnePaCatalogue={items:[],complete:true};
function fixture(read:(signal:AbortSignal)=>Promise<OnePaCatalogue>){
  let elapsed=0;const timers:{due:number;tick:()=>void;cancelled:boolean}[]=[];
  const source=new OnePaBrowseSource(()=>true,async()=>'',read,()=>start+elapsed,()=>elapsed);
  const combined=new CombinedEventSource({firstBatch:async()=>{throw Error('Ticketmaster must not warm');},detail:async()=>undefined},source);
  const gate=createControlledEventBrowse({source:combined,running:()=>true,track:work=>work(),warmSchedule:(delay,tick)=>{
    const timer={due:elapsed+delay,tick,cancelled:false};timers.push(timer);return()=>{timer.cancelled=true;};}});
  gate.enable();return {source,gate,timers,at:(value:number)=>{elapsed=value;},fire:()=>{const t=timers.at(-1)!;assert.ok(!t.cancelled);t.tick();}};
}

test('late timer callbacks schedule from actual admission and never skip the next five-minute slot',async()=>{
  let reads=0;const f=fixture(async()=>{reads++;return empty;});
  f.gate.startWarmup();await f.gate.warmupSettled();assert.equal(reads,1);assert.equal(f.timers.at(-1)?.due,300000);
  f.at(300700);f.fire();await f.gate.warmupSettled();assert.equal(reads,2);assert.equal(f.timers.at(-1)?.due,600700);
  f.at(600701);f.fire();await f.gate.warmupSettled();assert.equal(reads,3);assert.equal(f.timers.at(-1)?.due,900701);f.gate.disable();
});

test('foreground dispatch before scheduled warmup keeps the remaining deadline instead of adding five minutes',async()=>{
  let reads=0;const f=fixture(async()=>{reads++;return empty;});
  f.at(290000);await f.source.batch(new Date(start+290000).toISOString(),0,signal);assert.equal(reads,1);
  f.at(300000);f.gate.startWarmup();await f.gate.warmupSettled();assert.equal(reads,1);assert.equal(f.timers.at(-1)?.due,590000);
  f.at(590000);f.fire();await f.gate.warmupSettled();assert.equal(reads,2);f.gate.disable();
});

test('an overdue cleanup remains owned; the next admitted cycle waits for its actual settlement',async()=>{
  const held=Promise.withResolvers<OnePaCatalogue>();let reads=0;
  const f=fixture(async()=>{reads++;return reads===1?held.promise:empty;});
  f.gate.startWarmup();await Promise.resolve();assert.equal(reads,1);
  f.at(300000);f.fire();assert.equal(reads,1);assert.equal(f.timers.length,1);
  f.at(400000);held.resolve(empty);await f.gate.warmupSettled();assert.equal(f.timers.at(-1)?.due,400000);
  f.fire();await f.gate.warmupSettled();assert.equal(reads,2);assert.equal(f.timers.at(-1)?.due,700000);f.gate.disable();
});
