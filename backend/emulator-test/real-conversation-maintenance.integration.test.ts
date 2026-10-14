import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, afterEach, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { FirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirestoreConversationStore } from "../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { FirestoreConversationCleanup } from "../src/ai-conversation/infrastructure/firestore-conversation-cleanup.js";
import { FirestoreConversationMaintenance } from "../src/ai-conversation/infrastructure/firestore-conversation-maintenance.js";
import type { ConversationQuiescence } from "../src/ai-conversation/ports/conversation-cleanup.js";
import type { RuntimeEpoch } from "../src/ai-conversation/ports/real-conversation-store.js";
import { retirePreviousConversationEpoch } from "../src/ai-conversation/infrastructure/firestore-conversation-restart.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";

const env=requireControlledEmulatorEnvironment(process.env);
const app=initializeApp({projectId:env.projectId},`ai-maintenance-${randomUUID()}`);
const db=getFirestore(app),gateway=new FirebaseAdminFirestoreGateway(db),owner=randomUUID();
const runtime="ai_runtime_fence/current",progress="ai_cleanup_progress/source_sweep";
const paths=new Set<string>();let epoch:RuntimeEpoch;
// All writes in this fixture are explicitly awaited. There are no tickets,
// running generation or detached writes; this is not a production coordinator.
const idle:ConversationQuiescence={
  withTargetClosed:async <T>(_o:string,_c:string,work:()=>Promise<T>)=>({kind:"settled",value:await work()}),
  withTargetIdle:async <T>(_o:string,_c:string,work:()=>Promise<T>)=>({kind:"settled",value:await work()}),
};
const account={username:"ai_maintenance",optionalProcessingConsent:"accepted",checkInVisibility:"private",
  onboardingCompletedAt:"2026-10-14T00:00:00.000Z",purposeRevocationGeneration:2};
async function set(path:string,data:Record<string,unknown>){paths.add(path);await db.doc(path).set(data);}
// The bounded future clock is a fixture, not a production clock guarantee.
const now=()=>Date.now()+10_000;
function components(g:FirestoreGateway=gateway,q:ConversationQuiescence=idle,clock=now){
  const cleanup=new FirestoreConversationCleanup(g,process.env,q,clock);
  return {cleanup,maintenance:new FirestoreConversationMaintenance(g,process.env,cleanup,q,clock)};
}
async function pair(sources:readonly {sourceType:string;sourceId:string}[]=[],generation?:number){
  const cid=randomUUID(),u=randomUUID(),a=randomUUID(),base=`accounts/${owner}/conversations/${cid}`;
  await set(`${base}/messages/${u}`,{role:"user",sequence:1,text:"Synthetic original",acceptedAssistantMessageId:a});
  const original=await db.doc(`${base}/messages/${u}`).get();
  const appendBefore={seconds:original.createTime!.seconds+90*86400,nanoseconds:original.createTime!.nanoseconds};
  await set(`${base}/messages/${a}`,{role:"assistant",sequence:2,availability:"available",replyToUserMessageId:u,
    presentationMode:"default",text:"Synthetic reply",appendBefore});
  await set(`${base}/message_sources/${a}`,{sources,...(generation===undefined?{}:{purposeRevocationGeneration:generation})});
  await set(base,{state:"live",lifecycleVersion:1,nextSequence:3,latestMessageId:a});
  return {cid,u,a,base,appendBefore,original};
}
before(async()=>{
  assert.equal((await db.doc(runtime).get()).exists,false);
  const result=await new FirestoreConversationStore(gateway,process.env).startEpoch(randomUUID());
  assert.equal(result.kind,"confirmed");if(result.kind!=="confirmed")throw new Error("epoch unavailable");epoch=result.value;
  await db.doc(`accounts/${owner}`).create(account);
});
afterEach(async()=>{
  for(const path of [...paths].sort((a,b)=>b.length-a.length)){await db.doc(path).delete();assert.equal((await db.doc(path).get()).exists,false);}
  paths.clear();await db.doc(progress).delete();await db.doc(`accounts/${owner}`).set(account);
});
after(async()=>{
  try{for(const path of [progress,runtime,`accounts/${owner}`]){await db.doc(path).delete();assert.equal((await db.doc(path).get()).exists,false);}}
  finally{await db.terminate();await deleteApp(app);}
});

test("actual source sweep crosses 25-row pages, revokes all references, preserves immutable U and tombstone slots",async()=>{
  const rows=[];for(let i=0;i<27;i++)rows.push(await pair([{sourceType:"check_in",sourceId:`synthetic-${i}`}],1));
  const result=await components().maintenance.sourceSweep(epoch);
  assert.equal(result.complete,true);assert.equal(result.changed,27);assert.equal(result.failures,0);assert.equal(result.inspected,54);
  for(const row of rows){
    const a=await db.doc(`${row.base}/messages/${row.a}`).get(),u=await db.doc(`${row.base}/messages/${row.u}`).get();
    assert.equal(a.data()!.availability,"unavailable");assert.equal(Object.hasOwn(a.data()!,"text"),false);
    assert.deepEqual(a.data()!.appendBefore,row.appendBefore);assert.equal(u.data()!.acceptedAssistantMessageId,row.a);
    assert.equal(u.createTime!.isEqual(row.original.createTime!),true);
    assert.equal((await db.doc(`${row.base}/message_sources/${row.a}`).get()).exists,false);
  }
  assert.equal((await db.doc(progress).get()).exists,false);
});

test("actual source sweep preserves missing/rollback/unproved sources and reports incomplete without fabricated empty authority",async()=>{
  const equal=await pair([{sourceType:"check_in",sourceId:"unproved"}],2);
  const rollback=await pair([{sourceType:"check_in",sourceId:"rollback"}],3);
  const missing=await pair();await db.doc(`${missing.base}/message_sources/${missing.a}`).delete();
  const valid=await pair();
  const result=await components().maintenance.sourceSweep(epoch);
  assert.equal(result.complete,false);assert.ok(result.failures>=3);assert.equal(result.changed,0);
  for(const row of [equal,rollback,missing,valid])assert.equal((await db.doc(`${row.base}/messages/${row.a}`).get()).data()!.text,"Synthetic reply");
  assert.equal((await db.doc(progress).get()).exists,false);
});

test("actual tombstone residual and absent-message provenance cleanup require settled target proof",async()=>{
  const row=await pair([{sourceType:"check_in",sourceId:"old"}],1);
  await db.doc(`${row.base}/messages/${row.a}`).update({availability:"unavailable"});
  const orphan=`${row.base}/message_sources/${randomUUID()}`;await set(orphan,{sources:[]});
  const noIdle:ConversationQuiescence={withTargetClosed:idle.withTargetClosed};
  const first=await components(gateway,noIdle).maintenance.sourceSweep(epoch);
  assert.equal(first.complete,false);assert.equal(first.changed,1);assert.equal((await db.doc(orphan).get()).exists,true);
  assert.equal(Object.hasOwn((await db.doc(`${row.base}/messages/${row.a}`).get()).data()!,"text"),false);
  const second=await components().maintenance.sourceSweep(epoch);
  assert.equal(second.complete,true);assert.equal(second.changed,1);assert.equal((await db.doc(orphan).get()).exists,false);
  assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).exists,true);
});

test("actual expired checkpoint restarts at head and reports its failure instead of silently extending retention",async()=>{
  const row=await pair([{sourceType:"check_in",sourceId:"old"}],1),seconds=Math.floor(now()/1000)-86401;
  await db.doc(progress).set({schemaVersion:1,revision:9,phase:"message_sources",lastDocumentName:`${row.base}/message_sources/${row.a}`,
    startedAt:{seconds,nanoseconds:0},resumeUntil:{seconds:seconds+86400,nanoseconds:0},hadFailure:false});
  const result=await components().maintenance.sourceSweep(epoch);
  assert.equal(result.expiredOrInvalidCheckpoint,true);assert.equal(result.complete,false);assert.equal(result.changed,1);assert.equal(result.failures,1);
  assert.equal((await db.doc(progress).get()).exists,false);
});

test("actual whole delete between page read and advance invalidates old checkpoint and cannot recreate it",async()=>{
  const row=await pair(),cleanup=components().cleanup;let deleted=false;
  const raced:FirestoreGateway={runTransaction:async(work,options)=>{
    let page=false;
    const value=await gateway.runTransaction(tx=>work({...tx,
      get:tx.get.bind(tx),list:tx.list.bind(tx),set:tx.set.bind(tx),create:tx.create.bind(tx),delete:tx.delete!.bind(tx),
      listSnapshots:tx.listSnapshots!.bind(tx),listPage:tx.listPage!.bind(tx),listWherePage:tx.listWherePage!.bind(tx),
      listGroupPage:async(...args)=>{page=true;return tx.listGroupPage!(...args);}}),options);
    if(page&&!deleted){deleted=true;await db.doc(row.base).update({state:"deleting",lifecycleVersion:2});
      assert.equal((await cleanup.expireKnown(owner,row.cid,epoch)).kind,"deleted");}
    return value;
  }};
  const result=await components(raced).maintenance.sourceSweep(epoch);
  assert.equal(deleted,true);assert.equal(result.complete,false);assert.ok(result.failures>0);
  assert.equal((await db.doc(progress).get()).exists,false);assert.equal((await db.doc(row.base).get()).exists,false);
  assert.equal((await components().maintenance.sourceSweep(epoch)).complete,true);
});

test("actual complete-reference cursor survives deletion and duplicate IDs across parents",async()=>{
  const duplicate=randomUUID(),first=await pair(),second=await pair();
  const a=`${first.base}/message_sources/${duplicate}`,b=`${second.base}/message_sources/${duplicate}`;
  await set(a,{sources:[]});await set(b,{sources:[]});
  const ordered=[a,b].sort();await db.doc(ordered[0]!).delete();
  const page=await gateway.runTransaction(tx=>tx.listGroupPage!("message_sources",ordered[0],25),{maxAttempts:1});
  assert.ok(page.some(entry=>entry.path===ordered[1]));assert.equal(page.some(entry=>entry.path===ordered[0]),false);
});

test("actual expiry sweep discovers multiple parents and deletes whole targets without renewal",async()=>{
  const one=await pair(),two=await pair();
  const clock=()=>Date.now()+92*86400*1000;
  const result=await components(gateway,idle,clock).maintenance.expirySweep(epoch);
  assert.equal(result.complete,true);assert.equal(result.inspected,2);assert.equal(result.changed,2);
  for(const row of [one,two]){
    assert.equal((await db.doc(row.base).get()).exists,false);
    assert.equal((await db.collection(`${row.base}/messages`).get()).empty,true);
    assert.equal((await db.collection(`${row.base}/message_sources`).get()).empty,true);
  }
});

test("actual noncanonical group ancestor is reported and retained while later legal targets are still inspected",async()=>{
  const bad=`_synthetic_invalid/${randomUUID()}/messages/${randomUUID()}`;await set(bad,{text:"fixture"});
  const row=await pair([{sourceType:"check_in",sourceId:"old"}],1);
  const result=await components().maintenance.sourceSweep(epoch);
  assert.equal(result.complete,false);assert.ok(result.failures>0);assert.equal(result.changed,1);
  assert.equal((await db.doc(bad).get()).exists,true);assert.equal((await db.doc(`${row.base}/message_sources/${row.a}`).get()).exists,false);
});

test("actual normal fence retirement requires closed and settled original, keeps canonical outcome, cannot reopen old effect",async()=>{
  const row=await pair(),operationId=randomUUID(),uid=`maintenance-${randomUUID()}`;
  const target={ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,operationId,kind:"send" as const,targetKind:"reserved_new" as const};
  await set(`auth_bindings/${createAuthBindingDocumentId(uid)!}`,{accountId:owner});
  await set(`${row.base}/effects/${operationId}`,{kind:"send",userMessageId:row.u,assistantMessageId:row.a});
  await db.doc(`${row.base}/messages/${row.u}`).update({pendingOperationId:operationId});
  const fence=`ai_operation_fences/${operationId}`;
  await set(fence,{ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,kind:"send",targetKind:"reserved_new",processEpoch:epoch.processEpoch,revision:2,state:"closed"});
  const store=new FirestoreConversationStore(gateway,process.env,now);
  assert.equal((await store.retireOperation(target,epoch,()=>false)).kind,"conflict");assert.equal((await db.doc(fence).get()).exists,true);
  assert.equal((await store.retireOperation(target,epoch,()=>true)).kind,"confirmed");assert.equal((await db.doc(fence).get()).exists,false);
  assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).data()!.pendingOperationId,undefined);
  const outcome=await store.readOutcome({firebaseUid:uid},target);assert.equal(outcome.kind,"confirmed");
  if(outcome.kind==="confirmed")assert.equal(outcome.value.state,"assistant_saved");
  // This test's verifier is a clearly synthetic authority fake; transaction and
  // binding are actual SDK. Separate store fixtures cover real Firebase Auth.
  assert.equal((await store.initializeOperation(target,epoch,{principal:{firebaseUid:uid},current:()=>true,
    dependencies:{ownerId:owner,purpose:"checkin_conversation",purposeRevocationGeneration:2,usedPersonaId:undefined,sources:[]},
    verifyCurrentAuth:async()=>({kind:"verified",principal:{firebaseUid:uid}})})).kind,"conflict");
});

test("actual retirement of old A never clears B's pending ownership or makes old A readback resolved",async()=>{
  const row=await pair(),a=randomUUID(),b=randomUUID(),uid=`maintenance-${randomUUID()}`;
  const target={ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,operationId:a,kind:"send" as const,targetKind:"reserved_new" as const};
  await set(`auth_bindings/${createAuthBindingDocumentId(uid)!}`,{accountId:owner});
  await set(`${row.base}/effects/${a}`,{kind:"send",userMessageId:row.u});
  await db.doc(`${row.base}/messages/${row.u}`).update({pendingOperationId:b});
  await set(`ai_operation_fences/${a}`,{ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,kind:"send",targetKind:"reserved_new",processEpoch:epoch.processEpoch,revision:2,state:"closed"});
  const store=new FirestoreConversationStore(gateway,process.env,now);
  assert.equal((await store.retireOperation(target,epoch,()=>true)).kind,"confirmed");
  assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).data()!.pendingOperationId,b);
  assert.deepEqual(await store.readOutcome({firebaseUid:uid},target),{kind:"confirmed",value:{state:"unresolved"}});
});

test("actual confirmed new epoch retires previous controls across pages and settles only canonical old claims",async()=>{
  const row=await pair(),operationId=randomUUID(),oldEpoch=epoch;
  const store=new FirestoreConversationStore(gateway,process.env,now);
  await db.doc(`${row.base}/messages/${row.u}`).update({pendingOperationId:operationId});
  await set(`${row.base}/effects/${operationId}`,{kind:"send",userMessageId:row.u,assistantMessageId:row.a});
  const fences=[];
  for(let i=0;i<28;i++){
    const id=i===0?operationId:randomUUID(),fence=`ai_operation_fences/${id}`;fences.push(fence);
    await set(fence,{ownerAccountId:owner,conversationId:i===0?row.cid:randomUUID(),userMessageId:i===0?row.u:randomUUID(),
      kind:"send",targetKind:"reserved_new",processEpoch:oldEpoch.processEpoch,revision:1,state:"open"});
  }
  const start=await store.startEpoch(randomUUID());assert.equal(start.kind,"confirmed");if(start.kind!=="confirmed")return;epoch=start.value;
  const result=await retirePreviousConversationEpoch(gateway,store,epoch,process.env);
  assert.deepEqual(result,{complete:true,inspected:28,retired:28,failures:0});
  for(const path of fences)assert.equal((await db.doc(path).get()).exists,false);
  assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).data()!.pendingOperationId,undefined);
  assert.equal((await db.doc(`${row.base}/effects/${operationId}`).get()).exists,true);
  assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).createTime!.isEqual(row.original.createTime!),true);
  assert.equal((await store.closeOperation({ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,operationId,kind:"send",targetKind:"reserved_new"},oldEpoch)).kind,"terminated");
  assert.equal((await db.doc(`ai_operation_fences/${operationId}`).get()).exists,false);
});
