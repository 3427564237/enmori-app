import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway, type FirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { withRetainedMessageTimes } from "../src/ai-conversation/infrastructure/retained-message-times.js";
import { FirestoreConversationStore } from "../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { FirestoreSelectedReplyReader } from "../src/ai-conversation/infrastructure/firestore-selected-reply-reader.js";
import { AsyncFirestoreConversationStore } from "../src/ai-conversation/infrastructure/async-firestore-conversation-store.js";
import { FirebaseAdminAsyncConversationAuthority } from "../src/ai-conversation/infrastructure/firebase-admin-async-conversation-authority.js";
import { FirebaseAdminRealContextReader } from "../src/ai-conversation/infrastructure/firebase-admin-real-context-reader.js";
import { AsyncConversationOperationExecutor } from "../src/ai-conversation/application/async-conversation-operation-executor.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../src/ai-conversation/application/async-conversation-generation-transport.js";
import { BoundedAiRuntime } from "../src/ai-runtime/application/bounded-ai-runtime.js";
import { MonotonicRuntimeClock } from "../src/ai-runtime/infrastructure/monotonic-runtime-clock.js";
import { ConversationIoTracker } from "../src/ai-conversation/infrastructure/conversation-io-coordinator.js";
import { checkInSourceVersion } from "../src/ai-conversation/infrastructure/source-use-v2.js";
import type { SelectedReplyGrant } from "../src/ai-conversation/ports/selected-reply.js";
import type { ConversationInput } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import type { AsyncConversationModelInput } from "../src/ai-conversation/ports/async-conversation.js";
import type { ExecutedConversation } from "../src/ai-conversation/ports/application-conversation-operations.js";
import type { RuntimeEpoch } from "../src/ai-conversation/ports/real-conversation-store.js";

// Dedicated, explicitly scheduled AUTHOR proof; never a default real-service
// test or model call. The suite uses only its synthetic owner/documents, restores
// its matching runtime marker, and never clears a project or stops a service.
const enabled=process.env.ENMORI_F1A_EMULATOR_PROOF==="true",mode={skip:!enabled,timeout:20000};
const closeFixtures:(()=>Promise<void>)[]=[];
const owner=randomUUID(),uid=`f1a-author-${randomUUID()}`,base=`accounts/${owner}`,paths=new Set<string>(),operationIds=new Set<string>();
let firebase:App,firestore:Firestore,auth:Auth,gateway:FirestoreGateway,store:FirestoreConversationStore,epoch:RuntimeEpoch,token="",previousEpoch:Record<string,unknown>|undefined;
const clock=new MonotonicRuntimeClock();
function deferred<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return {promise,resolve};}
const pause=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function until(predicate:()=>boolean){const deadline=Date.now()+10000;while(!predicate()){assert(Date.now()<deadline,"Expected bounded fixture checkpoint");await pause();}}
async function put(path:string,data:Record<string,unknown>){paths.add(path);await firestore.doc(path).create(data);}
before(async()=>{
  if(!enabled)return;const env=requireControlledEmulatorEnvironment(process.env);assert.equal(env.projectId,"demo-enmori-companion-20261025");
  firebase=initializeApp({projectId:env.projectId},`f1a-author-${randomUUID()}`);firestore=getFirestore(firebase);auth=getAuth(firebase);
  const password=`Synthetic_${randomUUID()}`,email=`${uid}@example.invalid`;await auth.createUser({uid,email,password});
  const signed=await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});
  assert.equal(signed.status,200);token=(await signed.json() as {idToken:string}).idToken;assert(token);
  await put(`auth_bindings/${createAuthBindingDocumentId(uid)!}`,{accountId:owner});await put(base,{username:"f1a_author_owner",optionalProcessingConsent:"accepted",checkInVisibility:"private",onboardingCompletedAt:new Date().toISOString(),purposeRevocationGeneration:0});
  await put(`${base}/persona_state/current`,{stateRevision:0,livePersonaIds:[]});
  gateway=withRetainedMessageTimes(new FirebaseAdminFirestoreGateway(firestore));store=new FirestoreConversationStore(gateway,process.env);
  const old=await firestore.doc("ai_runtime_fence/current").get();previousEpoch=old.data();
  const started=await store.startEpoch(randomUUID());assert.equal(started.kind,"confirmed");if(started.kind!=="confirmed")throw Error("epoch");epoch=started.value;
});
after(async()=>{
  if(!enabled||!firebase)return;
  try{
    await Promise.all(closeFixtures.map(close=>close()));
    for(const topic of await firestore.collection(`${base}/conversations`).listDocuments()){
      for(const collection of ["messages","message_sources","effects","read_state"]){for(const doc of (await topic.collection(collection).get()).docs)await doc.ref.delete();}await topic.delete();
    }
    for(const id of operationIds)await firestore.doc(`ai_operation_fences/${id}`).delete();
    for(const path of [...paths].reverse())await firestore.doc(path).delete();
    const marker=await firestore.doc("ai_runtime_fence/current").get();if(epoch&&marker.data()?.processEpoch===epoch.processEpoch){if(previousEpoch)await marker.ref.set(previousEpoch);else await marker.ref.delete();}
    await auth.deleteUser(uid);assert.equal((await firestore.doc(base).get()).exists,false);
  }finally{token="";await firestore.terminate();await deleteApp(firebase);}
});
async function source(days=0){const id=`f1a-${randomUUID()}`;await put(`check_ins/${id}`,{ownerAccountId:owner,note:"Synthetic dated Note",mood:"calm",activity:"walking",locationLabel:"excluded-location-canary",createdAt:new Date(Date.now()-days*86400000-60000).toISOString(),revision:1});return id;}
async function seedPair(topic:string,sourceId:string){
  const root=`${base}/conversations/${topic}`,u=randomUUID(),a=randomUUID();await put(`${root}/messages/${u}`,{role:"user",sequence:1,text:"Synthetic old real user",acceptedAssistantMessageId:a});
  const first=await firestore.doc(`${root}/messages/${u}`).get(),cutoff={seconds:first.createTime!.seconds+90*86400,nanoseconds:first.createTime!.nanoseconds};
  await put(`${root}/messages/${a}`,{role:"assistant",sequence:2,text:"old-assistant-canary",availability:"available",replyToUserMessageId:u,presentationMode:"default",appendBefore:cutoff});
  const snap=await new FirebaseAdminFirestoreGateway(firestore).runTransaction(tx=>tx.getSnapshot!(`check_ins/${sourceId}`),{maxAttempts:1});assert(snap);
  await put(`${root}/message_sources/${a}`,{schemaVersion:"source_use_v2",purpose:"selected_checkin_reply",processing:"local",sources:[{kind:"check_in",id:sourceId,version:checkInSourceVersion(snap)!,cardRef:randomUUID()}],requiredCategories:["check_ins"],purposeRevocationGeneration:0});
  await put(root,{state:"live",lifecycleVersion:1,nextSequence:3,latestMessageId:a});return {u,a};
}
async function setup(ids:readonly string[],topic=randomUUID(),existing=false,exclude=false,blockedRead=false){
  const controller=new AbortController(),io=new ConversationIoTracker(),readEntered=deferred<void>(),readRelease=deferred<void>();let blocked=false;
  const operation={operationId:randomUUID(),conversationId:topic,userMessageId:randomUUID(),kind:"send" as const,targetKind:existing?"existing" as const:"reserved_new" as const};operationIds.add(operation.operationId);
  const reader=new FirestoreSelectedReplyReader(gateway,process.env,undefined,Date.now,(tx,p,o,c,current)=>store.prepareHistorySnapshot(tx,p,o,c,current));
  const prepared=await reader.prepare({principal:{firebaseUid:uid},ownerId:owner,signal:controller.signal,deadline:clock.now()+15000,current:()=>!controller.signal.aborted},{processing:"local",sources:ids.map(checkInId=>({kind:"check_in",checkInId}))},existing?topic:undefined);
  assert.equal(prepared.kind,"success");if(prepared.kind!=="success")throw Error("prepare");
  const grant:SelectedReplyGrant={...prepared.value,selectionRevision:randomUUID(),sources:prepared.value.sources.map(s=>({...s,selectionKey:randomUUID()})),historyPairs:prepared.value.historyPairs.map(p=>({...p,historyKey:randomUUID()})),includedKeys:[],excludedKeys:[],excludedHistoryKeys:[]};
  const selected={...grant,includedKeys:grant.sources.map(s=>s.selectionKey),excludedHistoryKeys:exclude?grant.historyPairs.map(p=>p.historyKey):[]};
  const calls:{input:ConversationInput;completion:ReturnType<typeof deferred<Uint8Array>>}[]=[],accepted:ExecutedConversation[]=[];
  const runtime=new BoundedAiRuntime<AsyncConversationModelInput>(clock,new AuthorizedAsyncConversationGenerationTransport({generate(input){const completion=deferred<Uint8Array>();calls.push({input,completion});return completion.promise;}}),true);
  const executor=new AsyncConversationOperationExecutor({runtime,strategy:"open_conversation_v1",clock:{monotonicNow:()=>clock.now(),utcNow:()=>{const now=Date.now(),seconds=Math.floor(now/1000);return {seconds,nanoseconds:(now-seconds*1000)*1e6};}},gates:{beforeGeneration:async()=>({ok:true,value:undefined}),candidate:async()=>({ok:true,value:undefined})},ports:original=>{
    const authority=new FirebaseAdminAsyncConversationAuthority(firestore,original,process.env),bridge=new AsyncFirestoreConversationStore(store,epoch,authority);
    const tracked:FirestoreGateway={runTransaction:(work,options)=>io.run(owner,topic,operation.operationId,()=>gateway.runTransaction(async tx=>work({...tx,getSnapshot:async path=>{
      const pending=tx.getSnapshot!(path);if(blockedRead&&!blocked&&path.startsWith("check_ins/")){blocked=true;readEntered.resolve();await readRelease.promise;}return pending;
    }}),options))};
    return {authority,reads:new FirebaseAdminRealContextReader(firestore,{controlledEnvironment:process.env,originalAuthority:{verify:original.verifyRead},monotonicNow:()=>clock.now(),includeCheckIns:false,includePersonaExpression:true}),
      selectedReads:new FirestoreSelectedReplyReader(tracked,process.env,original,Date.now,(tx,p,o,c,current)=>store.prepareHistorySnapshot(tx,p,o,c,current)),store:bridge,acknowledgedPair:bridge};
  }});
  const handle=executor.create({identity:{principal:{firebaseUid:uid},ownerId:owner,session:{},tokenInstance:{},originalRequest:{}},operation,text:()=>"Synthetic draft remains exact",selectedReply:selected,verifyCurrentAuth:()=>new FirebaseIdentityVerifier(auth).verifyIdToken(token)},
    {signal:controller.signal,current:()=>!controller.signal.aborted,acceptCompleteBody:pair=>{accepted.push(pair);return true;}});
  closeFixtures.push(async()=>{controller.abort();readRelease.resolve();for(const call of calls)finish(call);await handle.cancel();await io.settled(owner,topic);});
  return {handle,calls,accepted,operation,controller,io,readEntered,readRelease};
}
function finish(call:{completion:ReturnType<typeof deferred<Uint8Array>>}){call.completion.resolve(new TextEncoder().encode(JSON.stringify({schemaVersion:"ai_assistant_message_v1",message:"Synthetic accepted reply"})));}

test("F1 author actual mutable metadata and canonical v2/card publication, fake model only",mode,async()=>{
  const id=await source(),f=await setup([id]),pending=f.handle.dispatch();await until(()=>f.calls.length===1);assert(!JSON.stringify(f.calls[0]!.input).includes("excluded-location-canary"));assert(!JSON.stringify(f.calls[0]!.input).includes('"checkInId"'));finish(f.calls[0]!);
  const result=await pending;assert.equal(result.kind,"success");if(result.kind!=="success")return;assert.equal(result.value.assistantMessage.sources?.length,1);
  const proof=await firestore.doc(`${base}/conversations/${f.operation.conversationId}/message_sources/${result.value.assistantMessage.messageId}`).get();assert.equal(proof.data()?.schemaVersion,"source_use_v2");assert(!JSON.stringify(proof.data()).includes("Synthetic dated Note"));await f.handle.cancel();
});
test("F1 author actual in-flight Check-in edit rejects assistant delivery and preserves only U",mode,async()=>{
  const id=await source(),f=await setup([id]),pending=f.handle.dispatch();await until(()=>f.calls.length===1);await firestore.doc(`check_ins/${id}`).update({note:"Synthetic edit during model",revision:2});finish(f.calls[0]!);assert.deepEqual(await pending,{kind:"failure",code:"AI_AUTHORITY_CHANGED"});assert.equal(f.accepted.length,0);
  const messages=await firestore.collection(`${base}/conversations/${f.operation.conversationId}/messages`).get();assert.equal(messages.size,1);assert.equal(messages.docs[0]!.data().role,"user");await f.handle.cancel();
});
test("F1 author unselected history B conflicts before new U/model and explicit key recovers same topic without deletion",mode,async()=>{
  const a=await source(),b=await source(),topic=randomUUID(),old=await seedPair(topic,b),before=(await firestore.doc(`${base}/conversations/${topic}/messages/${old.a}`).get()).data();
  const denied=await setup([a],topic,true);assert.deepEqual(await denied.handle.dispatch(),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});assert.equal(denied.calls.length,0);await denied.handle.cancel();
  const f=await setup([a],topic,true,true),pending=f.handle.dispatch();await until(()=>f.calls.length===1);assert.deepEqual(f.calls[0]!.input.history,[]);assert.equal(f.calls[0]!.input.currentMessage,"Synthetic draft remains exact");finish(f.calls[0]!);assert.equal((await pending).kind,"success");await f.handle.cancel();
  assert.deepEqual((await firestore.doc(`${base}/conversations/${topic}/messages/${old.a}`).get()).data(),before);
});
test("F1 author eight-day source needs no new grant when its complete old pair is explicitly excluded",mode,async()=>{
  const b=await source(8),topic=randomUUID(),old=await seedPair(topic,b),f=await setup([],topic,true,true),pending=f.handle.dispatch();await until(()=>f.calls.length===1);assert.deepEqual(f.calls[0]!.input.history,[]);assert.deepEqual(f.calls[0]!.input.checkIns,[]);finish(f.calls[0]!);assert.equal((await pending).kind,"success");await f.handle.cancel();assert.equal((await firestore.doc(`${base}/conversations/${topic}/messages/${old.a}`).get()).exists,true);
});
test("F1 author cancellation does not declare tracked actual SDK read settled before its returned promise",mode,async()=>{
  const id=await source(),f=await setup([id],randomUUID(),false,false,true),pending=f.handle.dispatch();await f.readEntered.promise;assert.equal(f.io.idle(owner,f.operation.conversationId),false);f.controller.abort();let settled=false;void f.io.settled(owner,f.operation.conversationId).then(()=>{settled=true;});await pause();assert.equal(settled,false);assert.equal(f.calls.length,0);
  f.readRelease.resolve();await f.io.settled(owner,f.operation.conversationId);await pending;assert.equal(settled,true);assert.equal(f.io.idle(owner,f.operation.conversationId),true);assert.equal(f.accepted.length,0);await f.handle.cancel();
});
