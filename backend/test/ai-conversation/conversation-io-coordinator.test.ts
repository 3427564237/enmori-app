import assert from "node:assert/strict";
import { test } from "node:test";
import { ConversationIoTracker, ConversationIoQuiescence } from "../../src/ai-conversation/infrastructure/conversation-io-coordinator.js";
import { TrackedAsyncConversationStore } from "../../src/ai-conversation/infrastructure/tracked-async-conversation-store.js";
import type { AsyncConversationStore, AsyncEffectContext, AsyncConversationIdentity, AsyncOperation } from "../../src/ai-conversation/ports/async-conversation.js";
import type { AsyncAcknowledgedConversationPair } from "../../src/ai-conversation/ports/application-conversation-operations.js";
import type { RealConversationStore } from "../../src/ai-conversation/ports/real-conversation-store.js";

function deferred<T>() { let resolve!: (value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve}; }
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
function fixture() {
  const io=new ConversationIoTracker();let leaseCurrent=true,released=0,acquisitions=0;const modes:string[]=[];
  const registry={acquireTargetLease:async(ownerAccountId:string,conversationId:string,mode:"closed"|"idle")=>{
    acquisitions++;modes.push(mode);return {kind:"acquired" as const,lease:{ownerAccountId,conversationId,mode,
      current:()=>leaseCurrent,release:()=>{released++;leaseCurrent=false;}}};}};
  const q=new ConversationIoQuiescence(registry,io);
  return {io,q,modes,invalidate:()=>{leaseCurrent=false;},state:()=>({released,acquisitions})};
}
test("closed registry alone does not run cleanup while actual initialization promise is pending",async()=>{
  const f=fixture(),pending=deferred<void>();const issued=f.io.run("o","c","a",()=>pending.promise);let ran=0;
  const cleanup=f.q.withTargetClosed("o","c",async()=>++ran);await turn();assert.equal(ran,0);
  await assert.rejects(f.io.run("o","c","b",async()=>{throw new Error("must not dispatch");}));
  pending.resolve();await issued;assert.deepEqual(await cleanup,{kind:"settled",value:1});assert.deepEqual(f.state(),{released:1,acquisitions:1});
  assert.equal(f.io.idle("o","c"),true);
});
test("idle mode drains actual I/O without converting the lease into a Cancel",async()=>{
  const f=fixture(),pending=deferred<void>();const io=f.io.run("o","c","a",()=>pending.promise);
  const work=f.q.withTargetIdle("o","c",async()=>7);await turn();assert.deepEqual(f.modes,["idle"]);
  assert.equal(f.io.idle("o","c"),false);pending.resolve();await io;assert.deepEqual(await work,{kind:"settled",value:7});
});
test("unknown or stale lease cannot run work or silently release another admission hold",async()=>{
  const f=fixture(),pending=deferred<void>();const io=f.io.run("o","c","a",()=>pending.promise);let ran=0;
  const work=f.q.withTargetClosed("o","c",async()=>++ran);await turn();f.invalidate();pending.resolve();await io;
  assert.deepEqual(await work,{kind:"unresolved"});assert.equal(ran,0);
  const unknown=new ConversationIoQuiescence({acquireTargetLease:async()=>({kind:"unresolved"})},f.io);
  assert.deepEqual(await unknown.withTargetClosed("o","c",async()=>++ran),{kind:"unresolved"});assert.equal(ran,0);
});
test("target identities isolate settlement; synchronous throw is settled failure, never leaked pending work",async()=>{
  const f=fixture(),pending=deferred<void>();const issued=f.io.run("other","c","a",()=>pending.promise);
  await assert.rejects(f.io.run("o","c","a",()=>{throw new Error("synthetic");}));
  assert.deepEqual(await f.q.withTargetClosed("o","c",async()=>1),{kind:"settled",value:1});
  assert.equal(f.io.idle("other","c"),false);pending.resolve();await issued;
});
test("hold stays through work, refused later SDK supplier never runs, and work error is unresolved",async()=>{
  const f=fixture();let calls=0;
  assert.deepEqual(await f.q.withTargetClosed("o","c",async()=>{
    await assert.rejects(f.io.run("o","c","new",async()=>++calls));throw new Error("synthetic");
  }),{kind:"unresolved"});assert.equal(calls,0);assert.equal(f.state().released,1);
});

const identity:AsyncConversationIdentity={principal:{firebaseUid:"controlled"},ownerId:"o",session:{},tokenInstance:{},originalRequest:{}};
const operation:AsyncOperation={operationId:"op",conversationId:"c",userMessageId:"u",kind:"send",targetKind:"reserved_new"};
test("normal retirement waits late initialization, terminal wrapper forbids new effects and duplicate close cannot recreate a retired fence",async()=>{
  const io=new ConversationIoTracker(),pending=deferred<Awaited<ReturnType<AsyncConversationStore["open"]>>>();let retired=0,closes=0,writes=0;
  const inner:AsyncConversationStore & AsyncAcknowledgedConversationPair={
    open:()=>pending.promise,submitUser:async()=>{writes++;return {kind:"unknown"};},submitAssistant:async()=>({kind:"unknown"}),
    confirmAssistant:async()=>({kind:"unknown"}),read:async()=>({kind:"failure",code:"AI_UNAVAILABLE"}),reconcile:async()=>({kind:"unresolved"}),
    close:async()=>{closes++;return {kind:"closed",operationId:"op",conversationId:"c"};},
  };
  const lower={retireOperation:async(_t:unknown,_e:unknown,proof:()=>boolean)=>{assert.equal(proof(),true);retired++;return {kind:"confirmed",value:undefined};}} as unknown as RealConversationStore;
  const wrapper=new TrackedAsyncConversationStore(inner,io,lower,{processEpoch:"epoch",generation:1},()=>{});
  const c={identity,operation} as AsyncEffectContext;
  const opened=wrapper.open(c);assert.equal((await wrapper.close(identity,operation)).kind,"closed");await turn();assert.equal(retired,0);
  assert.equal((await wrapper.submitUser(c,()=>"synthetic",undefined)).kind,"rejected");assert.equal(writes,0);
  pending.resolve({kind:"open",operationId:"op",conversationId:"c"});await opened;await turn();await io.settled("o","c");
  assert.equal(retired,1);await wrapper.close(identity,operation);assert.equal(closes,1);
});
test("unconfirmed durable close is never normal retirement or false cleanup success",async()=>{
  const io=new ConversationIoTracker();let retired=0;
  const inner={close:async()=>({kind:"unresolved"})} as unknown as AsyncConversationStore & AsyncAcknowledgedConversationPair;
  const lower={retireOperation:async()=>{retired++;return {kind:"confirmed",value:undefined};}} as unknown as RealConversationStore;
  const wrapper=new TrackedAsyncConversationStore(inner,io,lower,{processEpoch:"epoch",generation:1},()=>{});
  assert.deepEqual(await wrapper.close(identity,operation),{kind:"unresolved"});await turn();assert.equal(retired,0);
});
