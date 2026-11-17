import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { createControlledEventBrowse } from '../src/bootstrap/controlled-event-browse.js';
import { closeControlledRuntime } from '../src/bootstrap/retained-core-runtime.js';

test('runtime shutdown revokes public warmup before a delayed AI drain and preserves drainage order',async()=>{
  const ai=Promise.withResolvers<void>(),source=Promise.withResolvers<void>();let tick=()=>{},reads=0,seen:AbortSignal|undefined;
  const order:string[]=[];
  const gate=createControlledEventBrowse({source:{firstBatch:async()=>[],detail:async()=>undefined,
    warm:async signal=>{reads++;seen=signal;await source.promise;}},running:()=>true,track:work=>work(),
    warmSchedule:(_ms,callback)=>{tick=callback;return()=>{order.push('timer-stopped');};}});
  gate.enable();gate.startWarmup();assert.equal(reads,1);
  const firebaseApp=initializeApp({projectId:'synthetic-warm-shutdown'},'synthetic-warm-shutdown');
  const closing=closeControlledRuntime({eventBrowseControl:gate,firebaseApp,
    stopAi:async()=>{order.push('ai-draining');await ai.promise;order.push('ai-drained');},
    stopEvents:async()=>{order.push('events-draining');await gate.warmupSettled();order.push('events-drained');},
    app:{close:async()=>{order.push('app-closed');}}} as unknown as Parameters<typeof closeControlledRuntime>[0]);
  assert.equal(seen?.aborted,true);tick();assert.equal(reads,1);
  assert.deepEqual(order,['timer-stopped','ai-draining']);source.resolve();await gate.warmupSettled();
  tick();assert.equal(reads,1);ai.resolve();await closing;
  assert.deepEqual(order,['timer-stopped','ai-draining','ai-drained','events-draining','events-drained','app-closed']);
});
