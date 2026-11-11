import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { RenewableServiceOwner } from '../../src/ai-runtime/application/renewable-service-owner.js';
import { FirestoreServiceOwner } from '../../src/ai-runtime/infrastructure/firestore-service-owner.js';
import { SuspendInclusiveRuntimeClock,linuxUptimeMilliseconds } from '../../src/ai-runtime/infrastructure/suspend-inclusive-runtime-clock.js';
import { parseServiceOwnership } from '../../src/ai-runtime/domain/service-owner.js';
import type { ServiceOwnerAuthority, ServiceOwnerLease, ServiceOwnerResult } from '../../src/ai-runtime/ports/service-owner.js';
import type { RuntimeClock } from '../../src/ai-runtime/ports/runtime-clock.js';
import type { FirestoreGateway } from '../../src/shared/infrastructure/firebase/firestore-gateway.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';

const config={mode:'renewable_service_lease',serviceKey:'synthetic_azure',leaseDurationMs:120000,renewEveryMs:30000,safetyMarginMs:15000} as const;
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};
class Clock implements RuntimeClock {
  time=0;private sequence=0;readonly timers=new Map<number,{at:number;wake:()=>void}>();
  now(){return this.time;}
  at(at:number,wake:()=>void){const id=++this.sequence;this.timers.set(id,{at,wake});return()=>{this.timers.delete(id);};}
  jump(time:number){this.time=time;}
  async advance(time:number){this.time=time;for(let i=0;i<30;i++){
    const due=[...this.timers].filter(([,t])=>t.at<=time);if(!due.length){await flush();if(![...this.timers.values()].some(t=>t.at<=time))return;continue;}
    for(const [id,t] of due)if(this.timers.delete(id))t.wake();await flush();
  }throw Error('Timer loop');}
}
const deferred=<T>()=>{let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};};
function fixture(){
  const clock=new Clock(),processEpoch=randomUUID();let acquisitions=0,renewals=0;
  const lease=(version=1):ServiceOwnerLease=>({serviceKey:config.serviceKey,processEpoch,generation:10,
    leaseVersion:version,renewedAtMs:1000000+clock.time,leaseUntilMs:1120000+clock.time});
  const authority:ServiceOwnerAuthority={async acquire(){acquisitions++;return {kind:'confirmed',lease:lease()};},
    async renew(original){renewals++;return {kind:'confirmed',lease:lease(original.leaseVersion+1)};}};
  return {clock,processEpoch,lease,authority,owner:new RenewableServiceOwner(authority,clock,config,processEpoch),
    counts:()=>({acquisitions,renewals})};
}

test('definite ACK before 15s grants only submit+105s, not ACK+105s; expired owner never revives',async()=>{
  const f=fixture(),pending=deferred<ServiceOwnerResult>();f.authority.acquire=()=>pending.promise;
  let losses=0;void f.owner.whenLost.then(()=>{losses++;});
  const start=f.owner.start();await flush();const original=f.lease();f.clock.jump(14999);pending.resolve({kind:'confirmed',lease:original});
  assert.deepEqual(await start,{processEpoch:f.processEpoch,generation:10});
  f.clock.jump(104999);assert.equal(f.owner.current(),true);
  assert(1000000+f.clock.now()<original.leaseUntilMs-15000);
  f.clock.jump(105000);assert.equal(f.owner.current(),false);await flush();assert.equal(losses,1);
  f.clock.jump(105001);assert.equal(f.owner.current(),false);assert.equal(f.owner.lost,true);
  assert.equal(await f.owner.start(),await start);assert.equal(f.owner.current(),false);assert.equal(f.clock.timers.size,0);
});
test('acquisition ACK at 15s or later is unknown; no replacement attempt or restart loop',async()=>{
  const f=fixture(),pending=deferred<ServiceOwnerResult>();let calls=0,loss=false;
  f.authority.acquire=()=>{calls++;return pending.promise;};void f.owner.whenLost.then(()=>{loss=true;});
  const start=f.owner.start();await flush();await f.clock.advance(15000);assert.equal(await start,undefined);
  pending.resolve({kind:'confirmed',lease:f.lease()});await flush();assert.equal(f.owner.current(),false);
  assert.equal(await f.owner.start(),undefined);assert.equal(calls,1);assert.equal(loss,false);
});
test('unknown acquisition is never retried and leaves ordinary-only cloud-unavailable state',async()=>{
  const f=fixture();let calls=0;f.authority.acquire=async()=>{calls++;return {kind:'unknown'};};
  assert.equal(await f.owner.start(),undefined);assert.equal(await f.owner.start(),undefined);
  assert.equal(f.owner.current(),false);assert.equal(f.owner.lost,false);assert.equal(calls,1);assert.equal(f.clock.timers.size,0);
});
test('only definite occupied no-write observations may poll; 135s ends closed without process restart',async()=>{
  const f=fixture();let calls=0;f.authority.acquire=async()=>{calls++;return {kind:'occupied',remainingMs:120000};};
  const start=f.owner.start();await flush();for(const t of [30000,60000,90000,120000,135000])await f.clock.advance(t);
  assert.equal(await start,undefined);assert.equal(calls,5);assert.equal(f.owner.current(),false);assert.equal(f.owner.lost,false);
  assert.equal(f.clock.timers.size,0);await f.clock.advance(300000);assert.equal(calls,5);
});
test('an occupied lease can expire inside the 135s window without overlapping prior local capability',async()=>{
  const f=fixture();let calls=0;f.authority.acquire=async()=>{calls++;
    return f.clock.now()<120000?{kind:'occupied',remainingMs:120000-f.clock.now()}:{kind:'confirmed',lease:f.lease()};};
  const start=f.owner.start();await flush();for(const t of [30000,60000,90000,120000])await f.clock.advance(t);
  assert((await start)?.generation===10);assert.equal(calls,5);assert.equal(f.owner.current(),true);f.owner.stop();
});
test('renewal timeout retires synchronously; late success cannot reopen or reattempt',async()=>{
  const f=fixture(),pending=deferred<ServiceOwnerResult>();let renewals=0;
  f.authority.renew=()=>{renewals++;return pending.promise;};await f.owner.start();
  await f.clock.advance(30000);assert.equal(renewals,1);assert.equal(f.owner.current(),true);
  await f.clock.advance(45000);assert.equal(f.owner.current(),false);assert.equal(f.owner.lost,true);
  pending.resolve({kind:'confirmed',lease:f.lease(2)});await flush();await f.clock.advance(200000);
  assert.equal(f.owner.current(),false);assert.equal(renewals,1);assert.equal(f.clock.timers.size,0);
});
test('renewal ACK uses original submit deadline and cannot adopt another epoch/version',async()=>{
  for(const mismatch of ['none','epoch','version'] as const){
    const f=fixture(),pending=deferred<ServiceOwnerResult>();f.authority.renew=()=>pending.promise;
    await f.owner.start();await f.clock.advance(30000);const renewed=f.lease(2);f.clock.jump(44999);
    pending.resolve({kind:'confirmed',lease:{...renewed,...(mismatch==='epoch'?{processEpoch:randomUUID()}:mismatch==='version'?{leaseVersion:3}:{})}});
    await flush();assert.equal(f.owner.current(),mismatch==='none');
    if(mismatch==='none'){f.clock.jump(134999);assert.equal(f.owner.current(),true);f.clock.jump(135000);assert.equal(f.owner.current(),false);}
    assert.equal(f.owner.lost,true);
  }
});
test('shutdown before a late renewal ACK retires locally without owner-loss restart notification',async()=>{
  const f=fixture(),pending=deferred<ServiceOwnerResult>();let lost=false;
  void f.owner.whenLost.then(()=>{lost=true;});f.authority.renew=()=>pending.promise;
  await f.owner.start();await f.clock.advance(30000);f.owner.stop();pending.resolve({kind:'confirmed',lease:f.lease(2)});
  await flush();assert.equal(f.owner.current(),false);assert.equal(lost,false);assert.equal(f.clock.timers.size,0);
});

test('suspend-inclusive clock chooses greatest elapsed; missing/backward/divergent observations retire permanently',()=>{
  assert.equal(linuxUptimeMilliseconds('123.45 67.89\n'),123450);
  for(const invalid of ['', '123 4','nan 1.0','-1.0 0.0','1.2 3.4 extra'])assert.throws(()=>linuxUptimeMilliseconds(invalid));
  let value={elapsed:100000,monotonic:1000,wall:1000000};const clock=new SuspendInclusiveRuntimeClock(()=>({...value}));
  assert.equal(clock.now(),0);value.elapsed+=120000;assert.equal(clock.now(),120000); // suspended even if the other clocks did not advance
  value={...value,wall:value.wall+1001};assert.throws(()=>clock.now());value.wall-=1001;assert.throws(()=>clock.now());
  for(const field of ['elapsed','monotonic','wall'] as const){let v={elapsed:100,monotonic:100,wall:100};
    const c=new SuspendInclusiveRuntimeClock(()=>v);c.now();v={...v,[field]:99};assert.throws(()=>c.now());}
});
test('real Linux clock reads only local /proc, remains monotonic, and cancellation is idempotent',()=>{
  if(process.platform!=='linux')return;const c=new SuspendInclusiveRuntimeClock();const before=c.now();assert(c.now()>=before);
  const cancel=c.at(c.now()+30000,()=>assert.fail('cancelled timer'));cancel();cancel();
});
test('private configuration accepts only exact approved clock/lease tuple',()=>{
  assert.deepEqual(parseServiceOwnership(config),config);
  for(const bad of [{...config,extra:true},{...config,leaseDurationMs:180000},{...config,renewEveryMs:15000},
    {...config,safetyMarginMs:1000},{...config,serviceKey:'other/host'},{...config,mode:'manual'}])assert.equal(parseServiceOwnership(bad),undefined);
});

function storeFixture(){
  const epoch={processEpoch:randomUUID(),generation:5},fence={...epoch,cleanupGeneration:2};
  const record={schemaVersion:'openai_service_owner_v1',serviceKey:config.serviceKey,enabled:true,...epoch,leaseVersion:0,renewedAtMs:0,leaseUntilMs:0};
  const memory=new InMemoryFirestoreGateway({'ai_runtime_fence/current':fence,'ai_runtime_fence/service_owner':record,
    'ai_cloud_cost_budget/current':{unknownHold:'unchanged'}});
  let time=1000000,writeCount=0,dropAck=false,readTime=true;
  const gateway:FirestoreGateway={runTransaction:async(work,options)=>{
    assert.deepEqual(options,{maxAttempts:1});
    const result=await memory.runTransaction(tx=>work({...tx,getSnapshot:async path=>{
      const data=await tx.get(path);return data?{id:path.split('/').at(-1)!,data,createTime:{seconds:1,nanoseconds:0},
        ...(readTime?{readTime:{seconds:Math.floor(time/1000),nanoseconds:time%1000*1000000}}:{})}:undefined;
    },set:(path,data)=>{writeCount++;tx.set(path,data);}}));if(dropAck)throw Error('lost ACK');return result;
  }};
  return {memory,record,fence,gateway,owner:new FirestoreServiceOwner(gateway,config),setTime:(v:number)=>{time=v;},
    writes:()=>writeCount,loseAck:()=>{dropAck=true;},omitTime:()=>{readTime=false;}};
}
test('atomic acquisition advances only fence and approved owner; renewal preserves fence and all financial state',async()=>{
  const f=storeFixture(),id=randomUUID();const acquired=await f.owner.acquire(id,()=>true);assert.equal(acquired.kind,'confirmed');
  if(acquired.kind!=='confirmed')return;assert.deepEqual(f.memory.read('ai_runtime_fence/current'),{processEpoch:id,generation:6,cleanupGeneration:2});
  assert.equal(acquired.lease.leaseUntilMs,1120000);assert.equal(f.writes(),2);
  f.setTime(1030000);const renewed=await f.owner.renew(acquired.lease,()=>true);assert.equal(renewed.kind,'confirmed');
  assert.equal(f.writes(),3);assert.equal(f.memory.read('ai_runtime_fence/current')?.generation,6);
  assert.deepEqual(f.memory.read('ai_cloud_cost_budget/current'),{unknownHold:'unchanged'});
  assert.equal((await f.owner.renew(acquired.lease,()=>true)).kind,'unavailable');
});
test('occupied observations write nothing; expiration requires fresh Firestore time rather than local wall time',async()=>{
  const f=storeFixture();assert.equal((await f.owner.acquire(randomUUID(),()=>true)).kind,'confirmed');
  const next=new FirestoreServiceOwner(f.gateway,config);f.setTime(1119999);
  assert.deepEqual(await next.acquire(randomUUID(),()=>true),{kind:'occupied',remainingMs:1});assert.equal(f.writes(),2);
  f.setTime(1120000);assert.equal((await next.acquire(randomUUID(),()=>true)).kind,'confirmed');assert.equal(f.writes(),4);
});
test('missing/disabled/corrupt/mismatched owner and missing readTime never create or repair state',async()=>{
  for(const variation of ['missing','disabled','corrupt','identity','fence','readTime'] as const){
    const f=storeFixture();await f.memory.runTransaction(async tx=>{
      if(variation==='missing')tx.delete!('ai_runtime_fence/service_owner');
      else if(variation==='readTime')f.omitTime();
      else tx.set('ai_runtime_fence/service_owner',{...f.record,...(variation==='disabled'?{enabled:false}:variation==='corrupt'?{unexpected:true}:
        variation==='identity'?{serviceKey:'another_service'}:{generation:4})});
    });
    assert.equal((await f.owner.acquire(randomUUID(),()=>true)).kind,'unavailable',variation);assert.equal(f.writes(),0);
  }
});
test('lost acquisition/renewal acknowledgement can commit, but adapter returns unknown and never replays',async()=>{
  const f=storeFixture();f.loseAck();assert.equal((await f.owner.acquire(randomUUID(),()=>true)).kind,'unknown');
  assert.equal(f.memory.read('ai_runtime_fence/service_owner')?.leaseVersion,1);assert.equal(f.writes(),2);
  const g=storeFixture(),r=await g.owner.acquire(randomUUID(),()=>true);assert.equal(r.kind,'confirmed');if(r.kind!=='confirmed')return;
  g.setTime(1030000);g.loseAck();assert.equal((await g.owner.renew(r.lease,()=>true)).kind,'unknown');
  assert.equal(g.memory.read('ai_runtime_fence/service_owner')?.leaseVersion,2);assert.equal(g.memory.read('ai_runtime_fence/current')?.generation,6);
});
