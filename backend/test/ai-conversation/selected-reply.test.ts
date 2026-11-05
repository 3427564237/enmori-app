import { OPENAI_CLOUD_PROCESSING, GROQ_CLOUD_PROCESSING, type CloudAiProcessing } from "../../src/account/domain/cloud-ai-consent.js";
import { CloudConsentFence } from "../../src/account/application/cloud-consent-fence.js";
import { FirestoreCloudAiConsentAuthority } from "../../src/account/infrastructure/firestore-cloud-ai-consent-authority.js";
import { BoundedAiRuntime } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import { CloudAdmissionOwner } from "../../src/ai-runtime/application/cloud-admission-owner.js";
import { AuthorizedAsyncCloudConversationTransport, ApplicationCloudConversationConsent } from "../../src/ai-conversation/application/async-cloud-conversation-transport.js";
import assert from "node:assert/strict";
import { fixture as runtimeFixture, until } from "./async-conversation-fakes.js";
import { valid } from "../ai-runtime/support.js";
import { AsyncConversationOperationExecutor } from "../../src/ai-conversation/application/async-conversation-operation-executor.js";
import { AsyncFirestoreConversationStore } from "../../src/ai-conversation/infrastructure/async-firestore-conversation-store.js";
import type { AsyncConversationAuthority } from "../../src/ai-conversation/ports/async-conversation.js";
import type { ExecutedConversation } from "../../src/ai-conversation/ports/application-conversation-operations.js";
import test from "node:test";
import { MetadataFirestoreGateway } from "../support/metadata-firestore-gateway.js";
import { FirestoreSelectedReplyReader } from "../../src/ai-conversation/infrastructure/firestore-selected-reply-reader.js";
import { validOpenConversationInput } from "../../src/ai-conversation/application/open-conversation-semantic-policy.js";
import { SelectedReplyReader } from "../../src/ai-conversation/application/selected-reply-reader.js";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { checkInSourceVersion, messageSourceVersion } from "../../src/ai-conversation/infrastructure/source-use-v2.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import type { SelectedReplyGrant, SelectedReplySnapshot } from "../../src/ai-conversation/ports/selected-reply.js";
import type { ConversationResult } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { OriginalWriteAuthority, OperationTarget } from "../../src/ai-conversation/ports/real-conversation-store.js";
import type { AcceptedContextRead } from "../../src/ai-conversation/ports/real-context-reader.js";
import type { FirestoreTransactionGateway } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`,owner=id(1),topic=id(2),user=id(3),assistant=id(4),a="selected-a",b="selected-b",now=Date.UTC(2026,9,25,10);
const base=`accounts/${owner}`,root=`${base}/conversations/${topic}`,principal={firebaseUid:"synthetic-selected"};
const profile="synthetic-selected-profile",environment={ENMORI_ENVIRONMENT:"test",ENMORI_CONTROLLED_PROFILE_DIRECTORY:profile,APPDATA:profile,HOME:profile,USERPROFILE:profile,XDG_CONFIG_HOME:profile,
  GCLOUD_PROJECT:"demo-enmori-rmvp01a-r10",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099"};
function value<T>(r:ConversationResult<T>):T{assert.equal(r.kind,"success");if(r.kind!=="success")throw Error("expected success");return r.value;}
function fixture(cloud: boolean | CloudAiProcessing = false){
  const processing = typeof cloud === "object" ? cloud : GROQ_CLOUD_PROCESSING;
  const g=new MetadataFirestoreGateway(now);let live=true,monotonic=0;
  g.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`,{accountId:owner});
  g.put(base,{username:"selected_owner",optionalProcessingConsent:"accepted",checkInVisibility:"private",onboardingCompletedAt:new Date(now).toISOString(),purposeRevocationGeneration:0,...(cloud?{cloudAiConsent:{state:"accepted",disclosureVersion:processing.disclosureVersion},cloudAiConsentGeneration:1}:{})});
  g.put(`${base}/persona_state/current`,{stateRevision:0,livePersonaIds:[]});
  for(const [index,key]of [a,b].entries())g.put(`check_ins/${key}`,{ownerAccountId:owner,note:`quoted-${key}`,mood:"calm",activity:"walking",createdAt:new Date(now-60000-index*60000).toISOString(),
    locationLabel:"location-canary",revision:1},now-60000-index*60000);
  const controller=new AbortController(),context:AcceptedContextRead={principal,ownerId:owner,session:{},originalRequest:{},acceptedAt:0,deadline:60000,asOf:{seconds:now/1000,nanoseconds:0},signal:controller.signal};
  const adapter=new FirestoreSelectedReplyReader(g,environment,{verifyRead:async c=>c===context&&live?{kind:"read",value:principal}:{kind:"denied"},currentRead:c=>c===context&&live},()=>g.now,(tx,p,o,c,current)=>store.prepareHistorySnapshot(tx,p,o,c,current),cloud?"cloud":"local",processing);
  const ordinary={principal,ownerId:owner,signal:controller.signal,deadline:15000,current:()=>live};
  const prepare=async(ids=[a])=>value(await adapter.prepare(ordinary,{processing:cloud?"cloud":"local",sources:ids.map(checkInId=>({kind:"check_in",checkInId}))},g.rows.has(root)?topic:undefined));
  const grant=(snapshot:SelectedReplySnapshot,include=snapshot.sources.map((_,i)=>id(100+i)),exclude:string[]=[]):SelectedReplyGrant=>({...snapshot,purposeRevocationGeneration:snapshot.purposeRevocationGeneration,selectionRevision:id(90),historyPairs:snapshot.historyPairs.map((p,i)=>({...p,historyKey:id(200+i)})),excludedHistoryKeys:[],sources:snapshot.sources.map((s,i)=>({...s,selectionKey:id(100+i)})),includedKeys:include,excludedKeys:exclude});
  const failures:string[]=[];const reader=(selection:SelectedReplyGrant)=>new SelectedReplyReader(context,selection,adapter,()=>monotonic,()=>live,k=>failures.push(k));
  const store=new FirestoreConversationStore(g,environment,()=>g.now,undefined,processing);
  const target:OperationTarget={ownerAccountId:owner,conversationId:topic,userMessageId:id(30),operationId:id(31),kind:"send",targetKind:"existing"};
  return {g,processing,adapter,context,ordinary,prepare,grant,reader,failures,store,target,stop:()=>{live=false;},time:(ms:number)=>{monotonic=ms;}};
}
function delayedSelectedReads(f:ReturnType<typeof fixture>,delay:(path:string)=>Promise<void>){
  const run=f.g.runTransaction.bind(f.g);
  f.g.runTransaction=(work,options)=>run(tx=>work({...tx,
    get:async path=>{if(path.includes("/personas/"))await delay(path);return tx.get(path);},
    getSnapshot:async path=>{await delay(path);return tx.getSnapshot!(path);},
  } satisfies FirestoreTransactionGateway),options);
}
test("five selected documents overlap per authorized stage while retaining all reads",async t=>{
  t.mock.timers.enable({apis:["setTimeout"]});const f=fixture(),ids=[a,b,"selected-c","selected-d","selected-e"];
  const personIds=["a","b","c","d","e"].map(c=>c.repeat(64));
  for(const key of ids)f.g.put(`check_ins/${key}`,{...f.g.rows.get(`check_ins/${a}`)!.data});
  f.g.put(`${base}/persona_state/current`,{stateRevision:1,livePersonaIds:personIds,activePersonaId:personIds[0]});
  for(const key of personIds)f.g.put(`${base}/personas/${key}`,{displayName:"Synthetic persona",tone:"warm",responseLength:"balanced",formatStyle:"plain",createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),revision:1});
  const paths:string[]=[];delayedSelectedReads(f,async path=>{paths.push(path);await new Promise<void>(resolve=>setTimeout(resolve,100));});
  async function complete<T>(pending:Promise<T>){let done=false,elapsed=0;void pending.then(()=>{done=true;});
    for(let i=0;i<100;i++)await Promise.resolve();
    for(let tick=0;tick<20&&!done;tick++){t.mock.timers.tick(100);elapsed+=100;for(let i=0;i<100;i++)await Promise.resolve();}
    assert.equal(done,true);return {result:await pending,elapsed};}
  const prepared=await complete(f.prepare(ids));assert.equal(paths.length,5);
  const read=await complete(f.adapter.read(f.context,f.grant(prepared.result)));assert.equal(read.result.kind,"read");
  assert.equal(paths.length,15);assert.equal(f.g.writes,0);
  t.diagnostic(`Controlled 100ms/document: prepare ${prepared.elapsed}ms; Persona and source revalidation ${read.elapsed}ms.`);
  assert.equal(prepared.elapsed,100);assert.equal(read.elapsed,200);
});
test("parallel selected reads settle before leaving transaction and preserve first-source failure",async()=>{
  const f=fixture();let release!:()=>void,settled=false;const held=new Promise<void>(resolve=>{release=resolve;});
  delayedSelectedReads(f,async path=>{if(path===`check_ins/${b}`)await held;});f.g.rows.delete(`check_ins/${a}`);
  const result=f.adapter.prepare(f.ordinary,{processing:"local",sources:[{kind:"check_in",checkInId:a},{kind:"check_in",checkInId:b}]}).then(value=>{settled=true;return value;});
  for(let i=0;i<100;i++)await Promise.resolve();assert.equal(settled,false);release();
  assert.deepEqual(await result,{kind:"failure",code:"AI_SOURCE_UNAVAILABLE"});assert.equal(f.g.writes,0);
});
test("revoking the request while parallel selected sources wait publishes no prepared context",async()=>{
  const f=fixture();let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let reads=0;
  delayedSelectedReads(f,async()=>{reads++;await held;});const result=f.adapter.prepare(f.ordinary,{processing:"local",sources:[{kind:"check_in",checkInId:a},{kind:"check_in",checkInId:b}]});
  for(let i=0;i<100;i++)await Promise.resolve();assert.equal(reads,2);f.stop();release();
  assert.deepEqual(await result,{kind:"failure",code:"AI_UNAVAILABLE"});assert.equal(f.g.writes,0);
});
test("denied authority or invalid Persona stage starts no selected source content reads",async()=>{
  for(const failure of ["owner","purpose","cloud","persona"] as const){
    const f=fixture(failure==="cloud"?OPENAI_CLOUD_PROCESSING:false),snapshot=await f.prepare([a,b]);
    if(failure==="owner")f.g.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`,{accountId:id(99)});
    else if(failure==="purpose")f.g.put(base,{...f.g.rows.get(base)!.data,optionalProcessingConsent:"rejected"});
    else if(failure==="cloud")f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsent:{state:"rejected",disclosureVersion:OPENAI_CLOUD_PROCESSING.disclosureVersion}});
    else f.g.put(`${base}/persona_state/current`,{stateRevision:1,livePersonaIds:["a".repeat(64)],activePersonaId:"a".repeat(64)});
    const reads:string[]=[];f.g.onRead=path=>{reads.push(path);};
    assert.notEqual((await f.adapter.read(f.context,f.grant(snapshot))).kind,"read");
    assert.equal(reads.some(path=>path.startsWith("check_ins/")),false,failure);assert.equal(f.g.writes,0);
  }
});
test("F1a reads only exact selected own records and keeps original time/Mood/Activity, no location or IDs in model",async()=>{
  const f=fixture(),snapshot=await f.prepare([a,b]),reader=f.reader(f.grant(snapshot));assert.equal(await reader.prepare(),"ready");
  const model=reader.modelContext()!;assert.deepEqual(model.checkIns.map(s=>s.noteText),["quoted-selected-a","quoted-selected-b"]);assert.equal(model.checkIns[0]?.moodLabel,"calm");assert.equal(model.checkIns[0]?.activityLabel,"walking");
  const serialized=JSON.stringify(model);assert(!serialized.includes("location-canary"));assert(!serialized.includes('"checkInId"'));assert(!serialized.includes('"version"'));assert(!serialized.includes('"owner"'));
  assert.deepEqual(reader.dependencies()!.selectedReply!.permittedCheckInIds,[a,b]);reader.dispose();assert.equal(reader.modelContext(),undefined);assert.equal(reader.dependencies(),undefined);
});
test("F1a inclusive seven-day boundary, newest then exact ID order, at most five unique sources",async()=>{
  const f=fixture();for(const key of [a,b])f.g.put(`check_ins/${key}`,{...f.g.rows.get(`check_ins/${key}`)!.data,createdAt:new Date(now-7*86400000).toISOString()});
  assert.deepEqual((await f.prepare([b,a])).sources.map(s=>s.checkInId),[a,b]);
  f.g.put(`check_ins/${a}`,{...f.g.rows.get(`check_ins/${a}`)!.data,createdAt:new Date(now-7*86400000-1).toISOString()});
  assert.deepEqual(await f.adapter.prepare(f.ordinary,{processing:"local",sources:[{kind:"check_in",checkInId:a}]}),{kind:"failure",code:"AI_SOURCE_UNAVAILABLE"});
  assert.equal((await f.adapter.prepare(f.ordinary,{processing:"local",sources:[{kind:"check_in",checkInId:b},{kind:"check_in",checkInId:b}]})).kind,"failure");
});
test("exclusion wins without reading excluded Note, and no selected key grants any other owned Check-in",async()=>{
  const f=fixture(),snapshot=await f.prepare([a,b]);f.g.rows.delete(`check_ins/${a}`);const reader=f.reader(f.grant(snapshot,[id(100),id(101)],[id(100)]));assert.equal(await reader.prepare(),"ready");assert.deepEqual(reader.dependencies()!.selectedReply!.permittedCheckInIds,[b]);assert.deepEqual(reader.modelContext()!.checkIns.map(s=>s.noteText),["quoted-selected-b"]);
  const wrong=f.reader({...f.grant(snapshot),includedKeys:["foreign-key"]});assert.equal(await wrong.prepare(),"selection_conflict");assert.equal(wrong.modelContext(),undefined);
});
test("edit, delete, foreign owner and unknown metadata remain distinct, with no model context after failure",async()=>{
  for(const change of ["edit","delete","foreign","metadata"]){
    const f=fixture(),snapshot=await f.prepare(),reader=f.reader(f.grant(snapshot));assert.equal(await reader.prepare(),"ready");
    f.g.now+=1000;
    if(change==="delete")f.g.rows.delete(`check_ins/${a}`);
    else if(change==="metadata"){const row=f.g.rows.get(`check_ins/${a}`)!;const {updateTime:_,...other}=row;f.g.rows.set(`check_ins/${a}`,other);}
    else f.g.put(`check_ins/${a}`,{...f.g.rows.get(`check_ins/${a}`)!.data,...(change==="edit"?{note:"edited",revision:2}:{ownerAccountId:id(8)})});
    assert.equal(await reader.revalidate(),change==="edit"?"changed":change==="metadata"?"unavailable":"source_unavailable");assert.equal(reader.modelContext(),undefined);
  }
});
test("new mutable adapter needs no immutable-Note flag, and abort/stale source reads cannot authorize output",async()=>{
  const f=fixture(),s=await f.prepare(),r=f.reader(f.grant(s));f.g.onRead=()=>{f.g.now+=2000;};assert.equal(await r.prepare(),"unavailable");assert.equal(r.modelContext(),undefined);
  const f2=fixture(),s2=await f2.prepare(),r2=f2.reader(f2.grant(s2));f2.stop();assert.equal(await r2.prepare(),"terminated");assert.equal(f2.g.writes,0);
});
function seedPair(f:ReturnType<typeof fixture>,source=a){
  const cutoff={seconds:now/1000-20+90*86400,nanoseconds:0};
  f.g.put(`${root}/messages/${user}`,{role:"user",sequence:1,text:"old real user",acceptedAssistantMessageId:assistant},now-20000);
  f.g.put(`${root}/messages/${assistant}`,{role:"assistant",sequence:2,text:"old suggestion using selected source",availability:"available",replyToUserMessageId:user,presentationMode:"default",appendBefore:cutoff},now-10000);
  f.g.put(`${root}/message_sources/${assistant}`,{schemaVersion:"source_use_v2",purpose:"selected_checkin_reply",processing:"local",sources:[{kind:"check_in",id:source,version:checkInSourceVersion(f.g.rows.get(`check_ins/${source}`)!)!,cardRef:id(70)}],requiredCategories:["check_ins"],purposeRevocationGeneration:0});
  f.g.put(root,{state:"live",lifecycleVersion:1,nextSequence:3,latestMessageId:assistant});
}
async function writeAuthority(f:ReturnType<typeof fixture>,selectedIds:string[]|undefined):Promise<OriginalWriteAuthority>{
  const selected=selectedIds===undefined?undefined:f.reader(f.grant(await f.prepare(selectedIds)));if(selected)assert.equal(await selected.prepare(),"ready");
  return {principal,current:()=>true,verifyCurrentAuth:async()=>({kind:"verified",principal}),dependencies:selected?.dependencies()??{ownerId:owner,purpose:"checkin_conversation",purposeRevocationGeneration:0,usedPersonaId:undefined,sources:[]}};
}
test("history source B cannot ride through an old assistant when only A is selected or no F1 choice exists",async()=>{
  for(const selected of [[a],undefined]){const f=fixture();seedPair(f,b);const auth=await writeAuthority(f,selected);assert.equal((await f.store.readHistory(f.target,auth)).kind,"selection_conflict");assert.equal(f.g.writes,0);}
});
test("history with the same explicitly selected source has complete v2 closure; exclusion conflicts instead of dropping provenance",async()=>{
  const f=fixture();seedPair(f,a);const auth=await writeAuthority(f,[a]);const result=await f.store.readHistory(f.target,auth);assert.equal(result.kind,"confirmed");if(result.kind!=="confirmed")return;
  assert.deepEqual(result.value.sources.map(s=>s.sourceId),[a]);assert.equal(result.value.pairs.length,1);
  const closed={...auth,dependencies:{...auth.dependencies,selectedReply:{...auth.dependencies.selectedReply!,permittedCheckInIds:[],excludedCheckInIds:[a],sources:[]}}};
  assert.equal((await f.store.readHistory(f.target,closed)).kind,"selection_conflict");
});
test("legacy nonempty receipt cannot be backfilled with a current mutable version to permit reuse",async()=>{
  const f=fixture();seedPair(f);f.g.put(`${root}/message_sources/${assistant}`,{sources:[{sourceType:"check_in",sourceId:a}],purposeRevocationGeneration:0});
  assert.notEqual((await f.store.readHistory(f.target,await writeAuthority(f,[a]))).kind,"confirmed");assert.equal(f.g.writes,0);
});
test("effect transaction independently rejects a changed selected source before any operation or content write",async()=>{
  const f=fixture();seedPair(f);const auth=await writeAuthority(f,[a]),epoch=await f.store.startEpoch(id(50));assert.equal(epoch.kind,"confirmed");if(epoch.kind!=="confirmed")return;
  f.g.now+=1000;f.g.put(`check_ins/${a}`,{...f.g.rows.get(`check_ins/${a}`)!.data,note:"new Note",revision:2});const before=f.g.writes;
  assert.equal((await f.store.initializeOperation(f.target,epoch.value,auth)).kind,"source_changed");assert.equal(f.g.writes,before);assert(!f.g.rows.has(`ai_operation_fences/${f.target.operationId}`));
});

async function executionFixture(selected:string[]|null=[a],existing=false,replyToMessageId?:string,initialPairSource?:string,cloud: boolean | CloudAiProcessing = false){
  const f=fixture(cloud),runtime=runtimeFixture(undefined,cloud?(clock,model)=>{
    const lease={};const transport=new AuthorizedAsyncCloudConversationTransport({processing:f.processing,dispatch:async(input,budget)=>({kind:"response",physical:"stopped",raw:await model.generate(input,budget)})},new ApplicationCloudConversationConsent(f.processing));
    const owner=new CloudAdmissionOwner(clock,transport,{recover:async()=>({kind:"confirmed",lease,reservations:[],previousRemote:"none_confirmed"}),current:l=>l===lease,reserve:async()=>"confirmed"},{windowMs:86400000,maxRequests:24,maxTokens:24000,tokensPerRequest:1000});
    void owner.recover();return new BoundedAiRuntime(clock,{kind:"cloud",owner},true);
  }:undefined);if(initialPairSource)seedPair(f,initialPairSource);const snapshot=selected===null?undefined:await f.prepare(selected),grant=snapshot?f.grant(snapshot):undefined,epoch=await f.store.startEpoch(id(50));assert.equal(epoch.kind,"confirmed");if(epoch.kind!=="confirmed")throw Error("epoch");
  const accepted:ExecutedConversation[]=[];runtime.reads.authority={...runtime.reads.authority,purposeRevocationGeneration:0};
  const executor=new AsyncConversationOperationExecutor({...(cloud?{cloudConsent:new FirestoreCloudAiConsentAuthority(f.g,new CloudConsentFence(),()=>true,f.processing)}:{}),runtime:runtime.runtime,strategy:"open_conversation_v1",clock:{monotonicNow:()=>runtime.clock.now(),utcNow:()=>({seconds:f.g.now/1000,nanoseconds:0})},gates:runtime.gates,
    ports:original=>{
      const authority:AsyncConversationAuthority={current:i=>original.current(i),freshAuth:async i=>{const r=await original.verify(i);return r.kind==="verified"?"authorized":r.kind==="dependency_unavailable"?"unavailable":"denied";},preaccept:async i=>{const r=await original.verify(i);return r.kind==="verified"?"authorized":"denied";}};
      const store=new AsyncFirestoreConversationStore(f.store,epoch.value,authority);
      return {authority,reads:runtime.reads,selectedReads:new FirestoreSelectedReplyReader(f.g,environment,original,()=>f.g.now,(tx,p,o,c,current)=>f.store.prepareHistorySnapshot(tx,p,o,c,current),cloud?"cloud":"local",f.processing),store,acknowledgedPair:store};
    }});
  const identity={principal,ownerId:owner,session:{},tokenInstance:{},originalRequest:{}},operation={operationId:id(80),conversationId:topic,userMessageId:id(81),kind:"send" as const,targetKind:existing?"existing" as const:"reserved_new" as const};
  const create=(chosen=grant)=>executor.create({identity,operation,text:()=>"Synthetic exact draft",verifyCurrentAuth:async()=>({kind:"verified",principal}),...(chosen?{selectedReply:chosen}:{}),...(replyToMessageId?{replyToMessageId}: {})},
    {signal:f.context.signal,current:()=>!f.context.signal.aborted,acceptCompleteBody:p=>{accepted.push(p);return true;}});
  return {...f,runtime,accepted,create,selectedGrant:grant,operation};
}
async function waitModel(f:Awaited<ReturnType<typeof executionFixture>>,pending:Promise<unknown>){let done:unknown;pending.then(v=>{done=v;});for(let i=0;i<2000&&!f.runtime.calls.length&&done===undefined;i++)await Promise.resolve();assert.equal(f.runtime.calls.length,1,JSON.stringify(done));}
test("F1a actual executor plus mutable reader plus real store saves canonical v2 and source cards, without opening old Note reader",async()=>{
  const f=await executionFixture(),handle=f.create(),pending=handle.dispatch();await waitModel(f,pending);
  assert.equal(f.runtime.reads.opened.length,0);const input=f.runtime.calls[0]!.input;assert.equal(input.contextMode,"selected_checkins_v1");assert.deepEqual(input.checkIns.map(s=>s.noteText),["quoted-selected-a"]);
  assert(!JSON.stringify(input).includes("location-canary"));assert(!JSON.stringify(input).includes('"checkInId"'));assert(!JSON.stringify(input).includes('"selectionRevision"'));
  f.runtime.calls[0]!.completion.resolve(valid("Synthetic accepted suggestion"));const result=await pending;
  assert.equal(result.kind,"success");if(result.kind!=="success")return;
  assert.equal(f.accepted.length,1);assert.equal(result.value.userMessage.text,"Synthetic exact draft");assert.equal(result.value.assistantMessage.sources?.length,1);
  const proof=f.g.rows.get(`${root}/message_sources/${result.value.assistantMessage.messageId}`)!.data;assert.equal(proof.schemaVersion,"source_use_v2");assert(!JSON.stringify(proof).includes("quoted-selected"));assert(!JSON.stringify(proof).includes("location-canary"));
  assert.equal((await f.store.readHistory({...f.operation,ownerAccountId:owner,targetKind:"existing",userMessageId:id(90),operationId:id(91)},await writeAuthority(f,undefined))).kind,"selection_conflict");
});
test("changed selected Note after model dispatch rejects publication and delivery with explicit authority code, preserving saved U",async()=>{
  const f=await executionFixture(),pending=f.create().dispatch();await waitModel(f,pending);f.g.now+=1000;f.g.put(`check_ins/${a}`,{...f.g.rows.get(`check_ins/${a}`)!.data,note:"edited during generation",revision:2});
  f.runtime.calls[0]!.completion.resolve(valid("must not save"));assert.deepEqual(await pending,{kind:"failure",code:"AI_AUTHORITY_CHANGED"});assert.equal(f.accepted.length,0);
  const messages=[...f.g.rows].filter(([path])=>path.startsWith(`${root}/messages/`));assert.equal(messages.length,1);assert.equal(messages[0]![1].data.role,"user");
});
test("cross-record history conflict reaches executor before model or user writes",async()=>{
  const f=await executionFixture([a],true,undefined,b);const before=f.g.writes,pending=f.create().dispatch();assert.deepEqual(await pending,{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});assert.equal(f.runtime.calls.length,0);assert.equal(f.g.writes,before);assert.equal(f.accepted.length,0);
});

test("source resolver preserves changed409 vs missing404 vs unknown, without replacing the original card",async()=>{
  for(const mutation of ["edit","delete","metadata"]){
    const f=fixture();seedPair(f);const initial=await f.store.resolveOwnedSource(principal,owner,topic,assistant,id(70),()=>true);assert.equal(initial.kind,"confirmed");
    f.g.now+=1000;
    if(mutation==="delete")f.g.rows.delete(`check_ins/${a}`);
    else if(mutation==="metadata"){const row=f.g.rows.get(`check_ins/${a}`)!,{updateTime:_,...rest}=row;f.g.rows.set(`check_ins/${a}`,rest);}
    else f.g.put(`check_ins/${a}`,{...f.g.rows.get(`check_ins/${a}`)!.data,note:"edited",revision:2});
    assert.equal((await f.store.resolveOwnedSource(principal,owner,topic,assistant,id(70),()=>true)).kind,mutation==="edit"?"conflict":mutation==="delete"?"conversation_unavailable":"unavailable");assert.equal(f.g.writes,0);
  }
});
test("replying to an actual same-topic proactive message quotes it as an AI suggestion, without manufacturing a pair",async()=>{
  const proactive=id(75),f=await executionFixture(null,true,proactive),cutoff={seconds:now/1000-20+90*86400,nanoseconds:0};
  f.g.put(`${root}/messages/${user}`,{role:"user",sequence:1,text:"Original real request"},now-20000);
  f.g.put(`${root}/messages/${proactive}`,{role:"assistant",origin:"proactive",sequence:2,text:"Earlier AI suggestion",availability:"available",occurrenceId:id(76),category:"explicit_follow_up",presentationMode:"default",appendBefore:cutoff},now-10000);
  f.g.put(`${root}/message_sources/${proactive}`,{schemaVersion:"source_use_v2",purpose:"explicit_follow_up",processing:"local",sources:[{kind:"conversation_message",id:user,version:messageSourceVersion(f.g.rows.get(`${root}/messages/${user}`)!)!,cardRef:id(77)}],requiredCategories:["conversation_history"],purposeRevocationGeneration:0});
  f.g.put(root,{state:"live",lifecycleVersion:1,nextSequence:3,latestMessageId:proactive});
  const pending=f.create().dispatch();await waitModel(f,pending);const model=f.runtime.calls[0]!.input;assert.deepEqual(model.history,[]);assert.deepEqual(model.replyToAssistant,{occurredAt:new Date(now-10000).toISOString(),text:"Earlier AI suggestion"});assert.equal(model.contextMode,undefined);
  f.runtime.calls[0]!.completion.resolve(valid("Synthetic reply"));const result=await pending;assert.equal(result.kind,"success");if(result.kind!=="success")return;
  assert.equal(result.value.userMessage.replyToMessageId,proactive);assert.equal(f.g.rows.get(`${root}/messages/${result.value.userMessage.messageId}`)!.data.replyToMessageId,proactive);
  const receipt=f.g.rows.get(`${root}/message_sources/${result.value.assistantMessage.messageId}`)!.data;assert.equal(receipt.schemaVersion,"source_use_v2");assert.equal((receipt.sources as {id:string}[])[0]?.id,user);assert(!JSON.stringify(receipt).includes("Earlier AI suggestion"));
});

test("selected request keeps started Persona across edit/active switch but permanent deletion ends it",async()=>{
  const f=fixture(),one="a".repeat(64),two="b".repeat(64),persona={displayName:"Started persona",tone:"warm",responseLength:"concise",formatStyle:"plain",createdAt:new Date(now-10000).toISOString(),updatedAt:new Date(now-10000).toISOString(),revision:1};
  f.g.put(`${base}/personas/${one}`,persona);f.g.put(`${base}/persona_state/current`,{stateRevision:1,livePersonaIds:[one],activePersonaId:one});
  const r=f.reader(f.grant(await f.prepare()));assert.equal(await r.prepare(),"ready");const before=JSON.stringify(r.modelContext()?.persona);
  f.g.now+=1000;f.g.put(`${base}/personas/${one}`,{...persona,displayName:"Edited persona",tone:"neutral",updatedAt:new Date(f.g.now).toISOString(),revision:2});
  f.g.put(`${base}/personas/${two}`,{...persona,displayName:"Another persona"});f.g.put(`${base}/persona_state/current`,{stateRevision:2,livePersonaIds:[one,two],activePersonaId:two});
  assert.equal(await r.revalidate(),"ready");assert.equal(JSON.stringify(r.modelContext()?.persona),before);
  f.g.rows.delete(`${base}/personas/${one}`);f.g.put(`${base}/persona_state/current`,{stateRevision:3,livePersonaIds:[two],activePersonaId:two});
  assert.equal(await r.revalidate(),"changed");assert.equal(r.modelContext(),undefined);
});
test("selection source epoch cannot be rebound by consent revoke and later regrant",async()=>{
  const f=fixture(),r=f.reader(f.grant(await f.prepare()));assert.equal(await r.prepare(),"ready");f.g.put(base,{...f.g.rows.get(base)!.data,purposeRevocationGeneration:2});assert.equal(await r.revalidate(),"changed");assert.equal(r.dependencies(),undefined);
});
test("new input shape permits only reviewed selected labels/quote and rejects weather/location/identity metadata",()=>{
  const input={strategy:"open_conversation_v1" as const,currentMessage:"Synthetic reply",history:[],persona:undefined,contextMode:"selected_checkins_v1" as const,checkIns:[{occurredAt:new Date(now-60000).toISOString(),noteText:"quoted note",moodLabel:"calm",activityLabel:"walking"}],replyToAssistant:{occurredAt:new Date(now-10000).toISOString(),text:"AI suggestion"}};
  assert.equal(validOpenConversationInput(input),true);
  for(const extra of [{weatherConditionLabel:"sunny"},{locationLabel:"private place"},{sourceId:"private-id"}])assert.equal(validOpenConversationInput({...input,checkIns:[{...input.checkIns[0]!,...extra}]}),false);
  assert.equal(validOpenConversationInput({...input,contextMode:undefined} as unknown as typeof input),false);
});

test("malformed category proof and incomplete internal selection closure fail closed rather than acquire a source grant",async()=>{
  const f=fixture(),snapshot=await f.prepare([a,b]),incomplete={...f.grant(snapshot),includedKeys:[id(100)],excludedKeys:[]};assert.equal(await f.reader(incomplete).prepare(),"selection_conflict");
  seedPair(f);const path=`${root}/message_sources/${assistant}`,proof=f.g.rows.get(path)!.data;f.g.put(path,{...proof,requiredCategories:["check_ins","conversation_history"]});
  assert.equal((await f.store.resolveOwnedSource(principal,owner,topic,assistant,id(70),()=>true)).kind,"conversation_unavailable");assert.equal(f.g.writes,0);
});

test("explicit excluded history key restores same-topic reply for an unselected B or a source older than seven days",async()=>{
  for(const older of [false,true]){
    const f=await executionFixture(older?[]:[a],true,undefined,b);
    if(older)f.g.put(`check_ins/${b}`,{...f.g.rows.get(`check_ins/${b}`)!.data,createdAt:new Date(now-8*86400000).toISOString()});
    const grant={...f.selectedGrant!,excludedHistoryKeys:f.selectedGrant!.historyPairs.map(p=>p.historyKey)},oldUser=f.g.rows.get(`${root}/messages/${user}`),oldAssistant=f.g.rows.get(`${root}/messages/${assistant}`);
    const pending=f.create(grant).dispatch();await waitModel(f,pending);const input=f.runtime.calls[0]!.input;assert.deepEqual(input.history,[]);assert.equal(input.currentMessage,"Synthetic exact draft");assert(!JSON.stringify(input).includes("old suggestion"));assert(!JSON.stringify(input).includes("quoted-selected-b"));
    f.runtime.calls[0]!.completion.resolve(valid("Fresh reply without those past exchanges"));const result=await pending;assert.equal(result.kind,"success");
    assert.deepEqual(f.g.rows.get(`${root}/messages/${user}`),oldUser);assert.deepEqual(f.g.rows.get(`${root}/messages/${assistant}`),oldAssistant);
  }
});
test("a new complete pair after preparation invalidates exclusions, never maps an old key to a new window",async()=>{
  const f=await executionFixture([a],true,undefined,b),grant={...f.selectedGrant!,excludedHistoryKeys:f.selectedGrant!.historyPairs.map(p=>p.historyKey)};
  const cutoff={seconds:now/1000-10+90*86400,nanoseconds:0},nextUser=id(120),nextAssistant=id(121);
  f.g.put(`${root}/messages/${nextUser}`,{role:"user",sequence:3,text:"new unrelated user",acceptedAssistantMessageId:nextAssistant,appendBefore:cutoff},now-5000);
  f.g.put(`${root}/messages/${nextAssistant}`,{role:"assistant",sequence:4,text:"new unrelated response",replyToUserMessageId:nextUser,availability:"available",presentationMode:"default",appendBefore:{seconds:now/1000-5+90*86400,nanoseconds:0}},now-4000);
  f.g.put(`${root}/message_sources/${nextAssistant}`,{sources:[]});f.g.put(root,{state:"live",lifecycleVersion:1,nextSequence:5,latestMessageId:nextAssistant});
  const before=f.g.writes;assert.deepEqual(await f.create(grant).dispatch(),{kind:"failure",code:"AI_AUTHORITY_CHANGED"});assert.equal(f.runtime.calls.length,0);assert.equal(f.g.writes,before);assert.equal(f.accepted.length,0);
});
test("excluding the prepared top two exchanges never backfills an older source-free exchange",async()=>{
  const f=fixture();let cutoff:{seconds:number;nanoseconds:number}|undefined;
  for(let i=0;i<3;i++){
    const u=id(130+i*2),ai=id(131+i*2),created=now-60000+i*10000;
    f.g.put(`${root}/messages/${u}`,{role:"user",sequence:1+i*2,text:i?"later user":"oldest-private-canary",acceptedAssistantMessageId:ai,...(cutoff?{appendBefore:cutoff}:{})},created);
    cutoff={seconds:created/1000+90*86400,nanoseconds:0};f.g.put(`${root}/messages/${ai}`,{role:"assistant",sequence:2+i*2,text:"old assistant",replyToUserMessageId:u,availability:"available",presentationMode:"default",appendBefore:cutoff},created+1000);
    cutoff={seconds:(created+1000)/1000+90*86400,nanoseconds:0};f.g.put(`${root}/message_sources/${ai}`,{sources:[]});
    f.g.put(root,{state:"live",lifecycleVersion:1,nextSequence:3+i*2,latestMessageId:ai});
  }
  const s=await f.prepare([]),grant=f.grant(s);assert.deepEqual(s.historyPairs.map(p=>p.userSequence),[3,5]);
  const r=f.reader({...grant,excludedHistoryKeys:grant.historyPairs.map(p=>p.historyKey)});assert.equal(await r.prepare(),"ready");
  const auth:OriginalWriteAuthority={principal,current:()=>true,verifyCurrentAuth:async()=>({kind:"verified",principal}),dependencies:r.dependencies()!},result=await f.store.readHistory(f.target,auth);
  assert.deepEqual(result,{kind:"confirmed",value:{pairs:[],sources:[]}});assert.equal(f.g.writes,0);assert.equal([...f.g.rows.keys()].filter(p=>p.startsWith(`${root}/messages/`)).length,6);
});

test("cloud selected execution persists v3 and returns cloud provenance through actual executor/readback",async()=>{
 const f=await executionFixture([a],false,undefined,undefined,true),pending=f.create().dispatch();await waitModel(f,pending);
 assert(!JSON.stringify(f.runtime.calls[0]!.input).includes('cloudAiConsent'));
 f.runtime.calls[0]!.completion.resolve(valid('Synthetic cloud reply'));const result=await pending;
 assert.equal(result.kind,'success');if(result.kind!=='success')return;
 assert.equal(result.value.assistantMessage.processing,'cloud');assert.equal(result.value.assistantMessage.provider,'groq');
 const proof=f.g.rows.get(`${root}/message_sources/${result.value.assistantMessage.messageId}`)!.data;
 assert.equal(proof.schemaVersion,'source_use_v3');assert.equal(proof.cloudAiConsentGeneration,1);assert.equal(proof.processing,'cloud');
});


test("OpenAI selected execution preserves provider/disclosure through preparation, persistence and readback",async()=>{
 const f=await executionFixture([a],false,undefined,undefined,OPENAI_CLOUD_PROCESSING);
 assert.equal(f.selectedGrant?.provider,"openai");
 assert.equal(f.selectedGrant?.disclosureVersion,"openai_cloud_v1");
 const pending=f.create().dispatch();await waitModel(f,pending);
 f.runtime.calls[0]!.completion.resolve(valid("Synthetic OpenAI reply"));const result=await pending;
 assert.equal(result.kind,"success");if(result.kind!=="success")return;
 assert.equal(result.value.assistantMessage.provider,"openai");
 assert.equal(result.value.assistantMessage.disclosureVersion,"openai_cloud_v1");
 const proof=f.g.rows.get(`${root}/message_sources/${result.value.assistantMessage.messageId}`)!.data;
 assert.equal(proof.schemaVersion,"source_use_v3");assert.equal(proof.provider,"openai");assert.equal(proof.disclosureVersion,"openai_cloud_v1");
 const reread=await f.store.readOutcome(principal,{...f.operation,ownerAccountId:owner});
 assert.equal(reread.kind,"confirmed");
 if(reread.kind==="confirmed"&&reread.value.state==="assistant_saved")assert.equal(reread.value.assistant.provider,"openai");
});

test("OpenAI preparation and effects reject Groq grants even with identical counters",async()=>{
 const f=fixture(OPENAI_CLOUD_PROCESSING);
 const snapshot=await f.prepare([]),reader=f.reader(f.grant(snapshot));assert.equal(await reader.prepare(),"ready");
 const authority:OriginalWriteAuthority={principal,current:()=>true,verifyCurrentAuth:async()=>({kind:"verified",principal}),dependencies:reader.dependencies()!};
 const epoch=await f.store.startEpoch(id(50));assert.equal(epoch.kind,"confirmed");if(epoch.kind!=="confirmed")return;
 f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsent:{state:"accepted",disclosureVersion:"groq_cloud_v1"}});
 assert.deepEqual(await f.adapter.prepare(f.ordinary,{processing:"cloud",sources:[]}),{kind:"failure",code:"AI_CONTEXT_NOT_PERMITTED"});
 const before=f.g.writes;
 assert.equal((await f.store.initializeOperation({...f.target,targetKind:"reserved_new"},epoch.value,authority)).kind,"denied");
 assert.equal(f.g.writes,before);
});

test("legacy Groq or mismatched provider selection cannot enter OpenAI generation",async()=>{
 for(const patch of [{provider:"groq",disclosureVersion:"groq_cloud_v1"},{provider:"openai",disclosureVersion:"groq_cloud_v1"},{provider:undefined,disclosureVersion:undefined}]){
  const f=await executionFixture([],false,undefined,undefined,OPENAI_CLOUD_PROCESSING);
  const chosen={...f.selectedGrant!,...patch} as SelectedReplyGrant;
  const pending=f.create(chosen).dispatch();const result=await pending;
  assert.equal(result.kind,"failure");assert.equal(f.runtime.calls.length,0);
 }
});


test("OpenAI withdrawal after dispatch prevents assistant publication and delivery",async()=>{
 const f=await executionFixture([],false,undefined,undefined,OPENAI_CLOUD_PROCESSING),pending=f.create().dispatch();await waitModel(f,pending);
 f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsent:{state:"declined",disclosureVersion:"openai_cloud_v1"},cloudAiConsentGeneration:2});
 f.runtime.calls[0]!.completion.resolve(valid("Late synthetic reply"));
 assert.equal((await pending).kind,"terminated");assert.equal(f.accepted.length,0);
 assert.equal([...f.g.rows.entries()].filter(([path,row])=>path.startsWith(`${root}/messages/`)&&row.data.role==="assistant").length,0);
});
