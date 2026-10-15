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
import { FirestoreConversationOperationReaders } from "../src/ai-conversation/infrastructure/firestore-conversation-operation-readers.js";
import { createIsolatedConversationComposition } from "../src/bootstrap/isolated-conversation-composition.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { getAuth } from "firebase-admin/auth";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";

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
  // A failed Bootstrap may already have confirmed a replacement epoch. Read it
  // back so a failed assertion cannot poison later independent fixture cases.
  const current=(await db.doc(runtime).get()).data()!;
  epoch={processEpoch:current.processEpoch as string,generation:current.generation as number};
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

test("actual replacement checkpoint with reused revision cannot be overwritten or deleted by the earlier scan",async()=>{
  let replaced=false,clock=Date.now()+10_000;let replacement:Record<string,unknown>|undefined;
  const raced:FirestoreGateway={runTransaction:async(work,options)=>{
    let page=false;
    const value=await gateway.runTransaction(tx=>work({get:tx.get.bind(tx),list:tx.list.bind(tx),set:tx.set.bind(tx),create:tx.create.bind(tx),
      delete:tx.delete!.bind(tx),listSnapshots:tx.listSnapshots!.bind(tx),listGroupPage:async(...args)=>{page=true;return tx.listGroupPage!(...args);}}),options);
    if(page&&!replaced){replaced=true;clock+=1000;const seconds=Math.floor(clock/1000),nanoseconds:(number)=(clock-seconds*1000)*1000000;
      replacement={schemaVersion:1,revision:1,phase:"messages",startedAt:{seconds,nanoseconds},
        resumeUntil:{seconds:seconds+86400,nanoseconds},hadFailure:false};await db.doc(progress).set(replacement);clock+=1000;}
    return value;
  }};
  const result=await components(raced,idle,()=>clock).maintenance.sourceSweep(epoch);
  assert.equal(replaced,true);assert.equal(result.complete,false);assert.ok(result.failures>0);
  assert.deepEqual((await db.doc(progress).get()).data(),replacement);
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

test("actual absent-parent orphans trigger whole cleanup and continue all targets in the same source sweep",async()=>{
  const first=await pair(),second=await pair();await db.doc(first.base).delete();await db.doc(second.base).delete();
  const result=await components().maintenance.sourceSweep(epoch);
  assert.equal(result.complete,true);assert.equal(result.changed,2);assert.equal(result.failures,0);
  for(const row of [first,second]){
    assert.equal((await db.collection(`${row.base}/messages`).get()).empty,true);
    assert.equal((await db.collection(`${row.base}/message_sources`).get()).empty,true);
  }
  assert.equal((await db.doc(progress).get()).exists,false);
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

async function readers(){
  const uid=`maintenance-${randomUUID()}`;await set(`auth_bindings/${createAuthBindingDocumentId(uid)!}`,{accountId:owner});
  const store=new FirestoreConversationStore(gateway,process.env,now),c={principal:{firebaseUid:uid},ownerId:owner,signal:new AbortController().signal,current:()=>true};
  return {c,store,readers:new FirestoreConversationOperationReaders(store,components().cleanup,epoch)};
}

for (const scenario of ["expired", "interrupted-delete"] as const) test(`R1 actual previous ${scenario} target permits control retirement and bounded cleanup`, async()=>{
  const row=await pair(),operationId=randomUUID(),fence=`ai_operation_fences/${operationId}`,oldEpoch=epoch;
  const target={ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,operationId,kind:"send" as const,targetKind:"reserved_new" as const};
  await set(`${row.base}/effects/${operationId}`,{kind:"send",userMessageId:row.u,assistantMessageId:row.a});
  await db.doc(`${row.base}/messages/${row.u}`).update({pendingOperationId:operationId});
  await set(fence,{ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,kind:"send",targetKind:"reserved_new",
    processEpoch:oldEpoch.processEpoch,revision:1,state:"open"});
  const latest=(await db.doc(`${row.base}/messages/${row.a}`).get()).createTime!;
  const future=()=>latest.seconds*1000+Math.floor(latest.nanoseconds/1e6)+90*86400000+1;
  if(scenario==="interrupted-delete"){
    await db.doc(row.base).update({state:"deleting",lifecycleVersion:2});
    // A real interrupted child batch: U is gone, its effect and A remain.
    await db.doc(`${row.base}/messages/${row.u}`).delete();
  }
  const clock=scenario==="expired"?future:now,store=new FirestoreConversationStore(gateway,process.env,clock);
  const started=await store.startEpoch(randomUUID());assert.equal(started.kind,"confirmed");if(started.kind!=="confirmed")return;epoch=started.value;
  const result=await retirePreviousConversationEpoch(gateway,store,epoch,process.env);
  assert.deepEqual(result,{complete:true,inspected:1,retired:1,failures:0});
  assert.equal((await db.doc(fence).get()).exists,false);
  assert.equal((await store.closeOperation(target,oldEpoch)).kind,"terminated");
  assert.equal((await components(gateway,idle,clock).cleanup.expireKnown(owner,row.cid,epoch)).kind,"deleted");
  assert.equal((await db.doc(row.base).get()).exists,false);
  for(const name of ["messages","message_sources","effects"])assert.equal((await db.collection(`${row.base}/${name}`).get()).empty,true);
});

async function restartTarget(){
  const row=await pair(),operationId=randomUUID(),fence=`ai_operation_fences/${operationId}`,oldEpoch=epoch;
  const target={ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,operationId,kind:"send" as const,targetKind:"reserved_new" as const};
  await set(`${row.base}/effects/${operationId}`,{kind:"send",userMessageId:row.u,assistantMessageId:row.a});
  await db.doc(`${row.base}/messages/${row.u}`).update({pendingOperationId:operationId});
  await set(fence,{ownerAccountId:owner,conversationId:row.cid,userMessageId:row.u,kind:"send",targetKind:"reserved_new",
    processEpoch:oldEpoch.processEpoch,revision:2,state:"closed"});
  const latest=await db.doc(`${row.base}/messages/${row.a}`).get();
  const expiryMs=(latest.createTime!.seconds+90*86400)*1000+Math.ceil(latest.createTime!.nanoseconds/1e6);
  return {...row,target,fence,oldEpoch,latest,expiryMs};
}
async function startForRestart(clock:()=>number){
  const reports:{phase:string;complete:boolean;changed:number}[]=[];let stopped=0;
  const joined=await createIsolatedConversationComposition({firestore:db,environment:process.env,utcMilliseconds:clock,
    transport:{generate:async()=>{throw new Error("No model in restart fixture");}},
    gates:{beforeGeneration:async()=>({ok:false,failure:"dependency_unavailable"}),candidate:async()=>({ok:false,failure:"unsafe_output"})},
    report:(phase,result)=>reports.push({phase,complete:result.complete,changed:result.changed}),reportRetirement:()=>{},
    schedule:{every:(interval)=>{assert.equal(interval,3600000);return ()=>{stopped++;};}}});
  epoch=joined.epoch;
  return {joined,reports,stop:async()=>{await joined.stopAdmissionAndMaintenance();assert.equal(stopped,1);}};
}

for(const kind of ["expired","deleting","partial-deleting"] as const)test(`R1 actual Bootstrap ${kind} restart reaches startup sweeps and physically drains old target`,async()=>{
  const row=await restartTarget();
  if(kind!=="expired")await db.doc(row.base).update({state:"deleting",lifecycleVersion:2});
  if(kind==="partial-deleting")await db.doc(`${row.base}/messages/${row.u}`).delete();
  const clock=kind==="expired"?()=>row.expiryMs:now;
  const f=await startForRestart(clock);
  try{
    assert.deepEqual(f.joined.restart,{complete:true,inspected:1,retired:1,failures:0});
    assert.deepEqual(f.reports,[{phase:"expiry",complete:true,changed:1},{phase:"source",complete:true,changed:0}]);
    assert.equal((await db.doc(row.base).get()).exists,false);assert.equal((await db.doc(row.fence).get()).exists,false);
    for(const name of ["messages","message_sources","effects"])assert.equal((await db.collection(`${row.base}/${name}`).get()).empty,true);
    assert.equal((await db.doc(progress).get()).exists,false);
    const old=new FirestoreConversationStore(gateway,process.env,clock);
    assert.equal((await old.closeOperation(row.target,row.oldEpoch)).kind,"terminated");
    assert.equal((await db.doc(row.fence).get()).exists,false);
  }finally{await f.stop();}
});

test("R1 restart preserves full-precision original expiry; retirement does not renew or round the target deadline",async()=>{
  const row=await restartTarget();
  // The floor bucket containing a sub-ms expiry is deliberately unavailable,
  // not live. Test the last certainly-live bucket, then the first expired one.
  const certainlyLive=(row.latest.createTime!.seconds+90*86400)*1000+Math.floor(row.latest.createTime!.nanoseconds/1e6)-1;
  const before=await startForRestart(()=>certainlyLive);
  try{
    assert.equal(before.joined.restart.complete,true);
    assert.equal(before.reports[0]!.changed,0);assert.equal((await db.doc(row.base).get()).data()!.state,"live");
    const latest=await db.doc(`${row.base}/messages/${row.a}`).get();
    assert.equal(latest.createTime!.isEqual(row.latest.createTime!),true);assert.deepEqual(latest.data()!.appendBefore,row.appendBefore);
    assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).createTime!.isEqual(row.original.createTime!),true);
  }finally{await before.stop();}
  const at=await startForRestart(()=>row.expiryMs);
  try{assert.equal(at.reports[0]!.changed,1);assert.equal((await db.doc(row.base).get()).exists,false);}finally{await at.stop();}
});

test("R1 current-epoch unsettled and corrupt old targets remain fail closed with their controls retained",async()=>{
  const row=await restartTarget(),store=new FirestoreConversationStore(gateway,process.env,now);
  await db.doc(row.base).update({state:"deleting",lifecycleVersion:2});
  assert.equal((await store.retireOperation(row.target,epoch,()=>false)).kind,"conflict");
  assert.equal((await db.doc(row.fence).get()).exists,true);
  const started=await store.startEpoch(randomUUID());assert.equal(started.kind,"confirmed");if(started.kind!=="confirmed")return;epoch=started.value;
  await db.doc(row.base).update({latestMessageId:"invalid"});
  assert.equal((await store.retireOperation(row.target,epoch,()=>false)).kind,"unavailable");
  assert.equal((await db.doc(row.fence).get()).exists,true);
  await db.doc(row.base).update({state:"live",latestMessageId:row.a});
  await db.doc(`${row.base}/messages/${row.a}`).update({appendBefore:{seconds:row.appendBefore.seconds,nanoseconds:1000000000}});
  const future=new FirestoreConversationStore(gateway,process.env,()=>row.expiryMs+1);
  assert.equal((await future.retireOperation(row.target,epoch,()=>false)).kind,"unavailable");
  const unavailable:FirestoreGateway={runTransaction:async()=>{throw new Error("Synthetic unknown SDK result");}};
  assert.equal((await new FirestoreConversationStore(unavailable,process.env).retireOperation(row.target,epoch,()=>false)).kind,"unresolved");
  assert.equal((await db.doc(row.fence).get()).exists,true);
  assert.equal((await db.doc(`${row.base}/messages/${row.u}`).get()).data()!.pendingOperationId,row.target.operationId);
});
test("actual ordinary message query uses DESC limit20, returns ASC with precise continuation, and verifies owner first",async()=>{
  const f=await readers(),cid=randomUUID(),base=`accounts/${owner}/conversations/${cid}`;let previous:{seconds:number;nanoseconds:number}|undefined;
  let latest="";
  for(let sequence=1;sequence<=21;sequence++){
    latest=randomUUID();await set(`${base}/messages/${latest}`,{role:"user",sequence,text:"Synthetic historical message",
      ...(previous?{appendBefore:{seconds:previous.seconds+90*86400,nanoseconds:previous.nanoseconds}}:{})});
    const snapshot=await db.doc(`${base}/messages/${latest}`).get();previous={seconds:snapshot.createTime!.seconds,nanoseconds:snapshot.createTime!.nanoseconds};
  }
  await set(base,{state:"live",lifecycleVersion:1,nextSequence:22,latestMessageId:latest});
  const page=await f.readers.listMessages(f.c,cid,undefined);assert.equal(page.kind,"success");if(page.kind!=="success")return;
  assert.deepEqual(page.value.messages.map(m=>m.sequence),Array.from({length:20},(_,i)=>i+2));assert.equal(page.value.nextBefore,2);
  const tail=await f.readers.listMessages(f.c,cid,2);assert.equal(tail.kind,"success");if(tail.kind!=="success")return;
  assert.deepEqual(tail.value.messages.map(m=>m.sequence),[1]);assert.equal(tail.value.nextBefore,undefined);
  assert.deepEqual(await f.readers.listMessages({...f.c,principal:{firebaseUid:"unbound"}},cid,undefined),{kind:"failure",code:"AUTH_FORBIDDEN"});
  assert.deepEqual(await f.readers.listMessages({...f.c,current:()=>false},cid,undefined),{kind:"failure",code:"AI_UNAVAILABLE"});
});

test("actual ordinary Retry and page keep canonical accepted/tombstone and unproved provenance protection",async()=>{
  const f=await readers(),row=await pair();
  assert.deepEqual(await f.readers.retryUser(f.c,{operationId:randomUUID(),conversationId:row.cid,userMessageId:row.u,kind:"retry",targetKind:"existing"},()=>"Synthetic original"),
    {kind:"failure",code:"AI_OPERATION_CONFLICT"});
  assert.equal((await f.readers.listMessages(f.c,row.cid,undefined)).kind,"success");
  await db.doc(`${row.base}/message_sources/${row.a}`).set({sources:[{sourceType:"check_in",sourceId:"unproved"}],purposeRevocationGeneration:2});
  assert.equal((await f.readers.listMessages(f.c,row.cid,undefined)).kind,"failure");
  assert.equal((await db.doc(`${row.base}/messages/${row.a}`).get()).data()!.text,"Synthetic reply");
});

test("actual no-effect readback requires original reserved-new identity, closed matching guard and full absence",async()=>{
  const f=await readers(),operation={operationId:randomUUID(),conversationId:randomUUID(),userMessageId:randomUUID(),kind:"send" as const,targetKind:"reserved_new" as const};
  const path=`ai_operation_fences/${operation.operationId}`;await set(path,{ownerAccountId:owner,conversationId:operation.conversationId,
    userMessageId:operation.userMessageId,kind:"send",targetKind:"reserved_new",processEpoch:epoch.processEpoch,revision:1,state:"closed"});
  assert.deepEqual(await f.readers.readOutcome(f.c,operation.conversationId,operation.operationId,operation),{kind:"success",value:{operationId:operation.operationId,state:"no_effect"}});
  assert.deepEqual(await f.readers.readOutcome(f.c,operation.conversationId,operation.operationId),{kind:"failure",code:"CONVERSATION_UNAVAILABLE"});
  await db.doc(path).update({state:"open"});
  assert.equal((await f.readers.readOutcome(f.c,operation.conversationId,operation.operationId,operation)).kind,"failure");
});

test("actual ordinary readback derives canonical pair from immutable effects after control retirement, and Delete uses whole cleanup",async()=>{
  const f=await readers(),row=await pair(),operationId=randomUUID();
  await set(`${row.base}/effects/${operationId}`,{kind:"send",userMessageId:row.u,assistantMessageId:row.a});
  const read=await f.readers.readOutcome(f.c,row.cid,operationId);assert.equal(read.kind,"success");
  if(read.kind==="success")assert.equal(read.value.state,"assistant_saved");
  assert.deepEqual(await f.readers.deleteConversation(f.c,row.cid),{kind:"success",value:undefined});
  assert.equal((await db.doc(row.base).get()).exists,false);
  assert.equal((await db.collection(`${row.base}/messages`).get()).empty,true);
  assert.equal((await db.collection(`${row.base}/effects`).get()).empty,true);
});

test("actual general isolated composition traverses all six HTTP operations, independent canonical readers, normal retirement and SDK-settled whole cleanup",async()=>{
  const auth=getAuth(app),uid=`jin-composition-${randomUUID()}`,email=`${uid}@example.invalid`,password=`Synthetic_${randomUUID()}`;
  let token="",server:Awaited<ReturnType<typeof buildApp>>|undefined,joined:Awaited<ReturnType<typeof createIsolatedConversationComposition>>|undefined;
  const targetIds=new Set<string>(),operationIds=new Set<string>(),reports:boolean[]=[],retirements:boolean[]=[];let modelCalls=0,scheduled=0,stopped=0;
  let retirementObserved!:()=>void;const retirementCompletion=new Promise<void>(resolve=>{retirementObserved=resolve;});
  await auth.createUser({uid,email,password});
  try {
    const signed=await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,
      {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});
    assert.equal(signed.status,200);token=(await signed.json() as {idToken:string}).idToken;
    await set(`auth_bindings/${createAuthBindingDocumentId(uid)}`,{accountId:owner});
    await set(`accounts/${owner}/persona_state/current`,{stateRevision:0,livePersonaIds:[]});
    assert.equal((await db.collection("check_ins").where("ownerAccountId","==",owner).get()).empty,true);
    joined=await createIsolatedConversationComposition({firestore:db,environment:process.env,
      notePrerequisites:{firestore:db,sourceReferences:["real-conversation-maintenance.integration.test.ts#owned-empty-inventory"],
        completeCanonicalUtcInventory:true,immutableOwnerNoteAndTime:true,permanentDeletion:true,noRestoreOrIdReuse:true},
      transport:{generate:async input=>{assert.equal(input.checkIns.length,0);modelCalls++;return Buffer.from(JSON.stringify({schemaVersion:"ai_assistant_message_v1",message:"Synthetic coordinator reply"}));}},
      gates:{beforeGeneration:async()=>({ok:true,value:undefined}),candidate:async()=>({ok:true,value:undefined})},
      report:(_phase,result)=>reports.push(result.complete),reportRetirement:ok=>{retirements.push(ok);retirementObserved();},
      schedule:{every:(interval,_tick)=>{assert.equal(interval,3600000);scheduled++;return ()=>{stopped++;};}}});
    epoch=joined.epoch;assert.equal(joined.restart.complete,true);assert.deepEqual(reports,[true,true]);assert.equal(scheduled,1);
    const unused={execute:async()=>err(appFailure("SERVICE_UNAVAILABLE"))};
    server=await buildApp({identityVerifier:new FirebaseIdentityVerifier(auth),completeOnboarding:unused,getOnboarding:unused,
      createCheckIn:unused,getCheckIn:unused,getInterestTags:unused,getOwnInterests:unused,replaceOwnInterests:unused,
      isolatedSlices:{environment:process.env,conversations:joined.operations}});
    const headers={authorization:`Bearer ${token}`};
    const prep=await server.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation"}});
    assert.equal(prep.statusCode,201);const p=prep.json<{operationId:string;conversationId:string;operationKey:string}>();targetIds.add(p.conversationId);operationIds.add(p.operationId);
    const sent=await server.inject({method:"POST",url:`/v1/me/ai/operations/${p.operationId}/execute`,headers:{...headers,"ai-operation-key":p.operationKey},payload:{text:"Synthetic SDK coordinator input"}});
    assert.equal(sent.statusCode,200);assert.equal(modelCalls,1);
    const pair=sent.json<{userMessage:{messageId:string;persistedAt:string};assistantMessage:{messageId:string}}>();
    // Complete-body HTTP acceptance precedes terminal close/retirement. Await
    // the actual adapter completion, never infer it from an empty instant or tick.
    let retirementTimer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([retirementCompletion,new Promise<never>((_resolve,reject)=>{retirementTimer=setTimeout(()=>reject(new Error("Retirement completion unavailable")),15000);})]);}
    finally{if(retirementTimer)clearTimeout(retirementTimer);}
    await joined.io.settled(owner,p.conversationId);
    assert.equal(joined.io.idle(owner,p.conversationId),true);assert.deepEqual(retirements,[true]);
    assert.equal((await db.doc(`ai_operation_fences/${p.operationId}`).get()).exists,false);
    const base=`accounts/${owner}/conversations/${p.conversationId}`;
    const u=await db.doc(`${base}/messages/${pair.userMessage.messageId}`).get();assert.equal(u.exists,true);
    assert.equal(u.data()!.acceptedAssistantMessageId,pair.assistantMessage.messageId);assert.equal(u.data()!.pendingOperationId,undefined);
    const read=await server.inject({method:"GET",url:`/v1/me/conversations/${p.conversationId}/operations/${p.operationId}`,headers});
    assert.equal(read.statusCode,200);assert.equal(read.json().state,"assistant_saved");
    const page=await server.inject({method:"GET",url:`/v1/me/conversations/${p.conversationId}/messages`,headers});
    assert.equal(page.statusCode,200);assert.equal(page.json().messages.length,2);assert.equal(page.json().messages[0].persistedAt,pair.userMessage.persistedAt);
    assert.equal((await db.doc(u.ref.path).get()).createTime!.isEqual(u.createTime!),true);
    const otherPrep=await server.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",conversationId:p.conversationId}});
    assert.equal(otherPrep.statusCode,201);const other=otherPrep.json<{operationId:string;operationKey:string}>();operationIds.add(other.operationId);
    const cancelled=await server.inject({method:"POST",url:`/v1/me/ai/operations/${other.operationId}/cancel`,headers:{...headers,"ai-operation-key":other.operationKey}});
    assert.equal(cancelled.statusCode,200);assert.equal(cancelled.json().state,"terminal");assert.equal(modelCalls,1);
    const deleted=await server.inject({method:"DELETE",url:`/v1/me/conversations/${p.conversationId}`,headers});assert.equal(deleted.statusCode,204);
    assert.equal((await db.doc(base).get()).exists,false);
    for(const collection of ["messages","message_sources","effects"])assert.equal((await db.collection(`${base}/${collection}`).get()).empty,true);
    assert.equal((await db.collection("ai_operation_fences").where("ownerAccountId","==",owner).get()).empty,true);
    assert.equal((await db.doc(progress).get()).exists,false);assert.equal(joined.runtime.state.nonTerminal,0);assert.equal(joined.runtime.state.quarantined,false);
  }finally{
    await joined?.stopAdmissionAndMaintenance();await server?.close();if(joined)assert.equal(stopped,1);
    // Inspect and remove only this owned test's targets even after an assertion fails.
    for(const cid of targetIds){
      await joined?.io.settled(owner,cid);
      const base=`accounts/${owner}/conversations/${cid}`;paths.add(base);
      for(const collection of ["messages","message_sources","effects"])for(const row of (await db.collection(`${base}/${collection}`).get()).docs)paths.add(row.ref.path);
    }
    for(const id of operationIds)paths.add(`ai_operation_fences/${id}`);
    token="";await auth.deleteUser(uid);await assert.rejects(auth.getUser(uid));
  }
});

test("source-bound actual sweep keeps live sources, then atomically tombstones all pairs on permanent used-source deletion", async()=>{
  const first=randomUUID(),second=randomUUID();
  for(const id of [first,second])await set(`check_ins/${id}`,{ownerAccountId:owner,note:"Synthetic immutable Note",createdAt:new Date().toISOString()});
  const row=await pair([{sourceType:"check_in",sourceId:first},{sourceType:"check_in",sourceId:second}],2);
  const sourcePath=`${row.base}/message_sources/${row.a}`,messagePath=`${row.base}/messages/${row.a}`;
  const original=await db.doc(messagePath).get();
  const cleanup=new FirestoreConversationCleanup(gateway,process.env,idle,now);
  const maintenance=new FirestoreConversationMaintenance(gateway,process.env,cleanup,idle,now,{gateway,
    sourceReferences:["this owned synthetic create-only fixture; explicit permanent test delete, no restore"],completeCanonicalUtcInventory:true,
    immutableOwnerNoteAndTime:true,permanentDeletion:true,noRestoreOrIdReuse:true});
  assert.equal((await maintenance.sourceSweep(epoch)).complete,true);
  assert.deepEqual((await db.doc(messagePath).get()).data(),original.data());
  await db.doc(`check_ins/${first}`).delete();
  const swept=await maintenance.sourceSweep(epoch);assert.equal(swept.complete,true);assert.equal(swept.changed,1);
  const final=await db.doc(messagePath).get();const {text:_discarded,...metadata}=original.data()!;
  assert.deepEqual(final.data(),{...metadata,availability:"unavailable"});assert(final.createTime!.isEqual(original.createTime!));
  assert.equal((await db.doc(sourcePath).get()).exists,false);assert.equal((await db.doc(`check_ins/${second}`).get()).exists,true);
  assert.equal((await maintenance.sourceSweep(epoch)).changed,0);
});

test("source-bound sweep treats corrupt owner/time or unknown read as incomplete, not proof for permanent erasure",async()=>{
  const id=randomUUID();await set(`check_ins/${id}`,{ownerAccountId:owner,note:"Synthetic Note",createdAt:"2026-10-16T00:00:00Z"});
  const row=await pair([{sourceType:"check_in",sourceId:id}],2),original=await db.doc(`${row.base}/messages/${row.a}`).get();
  const cleanup=new FirestoreConversationCleanup(gateway,process.env,idle,now);
  const maintenance=new FirestoreConversationMaintenance(gateway,process.env,cleanup,idle,now,{gateway,sourceReferences:["explicit negative fixture"],
    completeCanonicalUtcInventory:true,immutableOwnerNoteAndTime:true,permanentDeletion:true,noRestoreOrIdReuse:true});
  const result=await maintenance.sourceSweep(epoch);assert.equal(result.complete,false);assert.equal(result.changed,0);
  assert.deepEqual((await db.doc(`${row.base}/messages/${row.a}`).get()).data(),original.data());
  assert.equal((await db.doc(`${row.base}/message_sources/${row.a}`).get()).exists,true);
});
