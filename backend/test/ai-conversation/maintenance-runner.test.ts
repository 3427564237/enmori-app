import assert from "node:assert/strict";
import { test } from "node:test";
import { startConversationMaintenance, type MaintenanceSchedule } from "../../src/bootstrap/conversation-maintenance-runner.js";
import type { ConversationMaintenance, MaintenanceResult } from "../../src/ai-conversation/ports/conversation-maintenance.js";
const epoch={processEpoch:"7d252541-5732-42d0-a6d2-5739a6c97eb1",generation:1};
const pass:MaintenanceResult={complete:true,inspected:1,changed:0,failures:0,expiredOrInvalidCheckpoint:false};
function fixture(){let tick=()=>{},cancelled=0;const intervals:number[]=[];
  const timers:MaintenanceSchedule={every:(ms,fn)=>{intervals.push(ms);tick=fn;return ()=>{cancelled++;};}};
  return {timers,intervals,tick:()=>tick(),cancelled:()=>cancelled};}
test("maintenance startup and hourly cycle retain separate source/expiry aggregate results",async()=>{
  const calls:string[]=[],reports:unknown[]=[],f=fixture();
  const maintenance:ConversationMaintenance={expirySweep:async e=>{assert.equal(e,epoch);calls.push("expiry");return pass;},
    sourceSweep:async()=>{calls.push("source");return {...pass,complete:false,failures:1};}};
  const runner=startConversationMaintenance(maintenance,epoch,(phase,result)=>reports.push({phase,result}),f.timers);
  await runner.settled();assert.deepEqual(calls,["expiry","source"]);assert.deepEqual(f.intervals,[3600000]);
  f.tick();await runner.settled();assert.deepEqual(calls,["expiry","source","expiry","source"]);assert.equal(reports.length,4);
  await runner.stop();assert.equal(f.cancelled(),1);f.tick();assert.equal(calls.length,4);
});
test("maintenance overlapping timer skips extra execution and stop awaits actual in-flight settlement",async()=>{
  let release!:(value:MaintenanceResult)=>void,expiry=0,source=0,stopped=false;const f=fixture();
  const maintenance:ConversationMaintenance={expirySweep:()=>{expiry++;return new Promise(resolve=>{release=resolve;});},
    sourceSweep:async()=>{source++;return pass;}};
  const runner=startConversationMaintenance(maintenance,epoch,()=>{},f.timers);
  f.tick();f.tick();assert.equal(expiry,1);const stopping=runner.stop().then(()=>{stopped=true;});
  await Promise.resolve();assert.equal(stopped,false);release(pass);await stopping;assert.equal(stopped,true);assert.equal(source,0);
});
test("maintenance dependency exception reports only fixed aggregates and source sweep still proceeds",async()=>{
  const f=fixture(),reports:unknown[]=[];let source=0;
  const maintenance:ConversationMaintenance={expirySweep:async()=>{throw new Error("private raw error");},sourceSweep:async()=>{source++;return pass;}};
  const runner=startConversationMaintenance(maintenance,epoch,(phase,result)=>{reports.push({phase,result});if(phase==="source")throw new Error("logger unavailable");},f.timers);
  await runner.settled();assert.equal(source,1);assert.equal(JSON.stringify(reports).includes("private"),false);
  assert.deepEqual(reports[0],{phase:"expiry",result:{complete:false,inspected:0,changed:0,failures:1,expiredOrInvalidCheckpoint:false}});
  await runner.stop();
});
