import { FirstFlowApplication } from "../../src/proactive/application/first-flow-application.js";
import { AccountFirstFlowDueWorker } from "../../src/proactive/application/account-due-worker.js";
import { createAccountScopedFirstFlowStore } from "../../src/proactive/infrastructure/account-scoped-first-flow-store.js";
import { FirestoreProactiveAccountRoster } from "../../src/proactive/infrastructure/firestore-account-roster.js";
import assert from "node:assert/strict";
import { MetadataFirestoreGateway } from "../support/metadata-firestore-gateway.js";
import test from "node:test";
import { FirestoreFirstFlowStore } from "../../src/proactive/infrastructure/firestore-first-flow-store.js";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { OPENAI_CLOUD_PROCESSING } from "../../src/account/domain/cloud-ai-consent.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as Row, StoredDocumentSnapshot as Snapshot } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { FirstFlowResult, FirstFlowSettingsInput, FirstFlowIntent, FirstFlowReservation, ProactiveActor } from "../../src/proactive/ports/first-flow.js";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const owner=id(1),topic=id(2),user=id(3),assistant=id(4),installation=id(5),principal={firebaseUid:"synthetic-first-flow"};
const root=`accounts/${owner}/conversations/${topic}`,base=`accounts/${owner}`,start=Date.UTC(2026,9,25,10);
const profile="synthetic-first-flow-profile";
const environment={ENMORI_ENVIRONMENT:"test",ENMORI_CONTROLLED_PROFILE_DIRECTORY:profile,APPDATA:profile,HOME:profile,USERPROFILE:profile,XDG_CONFIG_HOME:profile,
  GCLOUD_PROJECT:"demo-enmori-rmvp01a-r10",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099"};
const settings:FirstFlowSettingsInput={mode:"on",categories:["explicit_follow_up"],timeZone:"UTC",quiet:{kind:"window",startMinute:1320,endMinute:480},maximumInRolling24h:1,cooldownMinutes:480,pushEnabled:true,preview:"generic"};
function value<T>(r:FirstFlowResult<T>):T{assert.equal(r.kind,"ok");if(r.kind!=="ok")throw Error("Expected ok");return r.value;}

function fixture(configured=true, serviceLeaseMs?:number, cloud=false){
  const g=new MetadataFirestoreGateway(start);let live=true,checks=0;
  g.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`,{accountId:owner});
  g.put(base,{username:"first_flow_owner",optionalProcessingConsent:"accepted",checkInVisibility:"private",onboardingCompletedAt:new Date(start).toISOString(),purposeRevocationGeneration:0});
  if(cloud)g.put(base,{...g.rows.get(base)!.data,cloudAiConsent:{state:"accepted",disclosureVersion:"openai_cloud_v1"},cloudAiConsentGeneration:3});
  g.put(`${base}/persona_state/current`,{stateRevision:0,livePersonaIds:[]});
  const cutoff={seconds:Math.floor(start/1000)-100+90*86400,nanoseconds:0};
  g.put(`${root}/messages/${user}`,{role:"user",sequence:1,text:"Synthetic request: follow up later",acceptedAssistantMessageId:assistant},start-200000);
  g.put(`${root}/messages/${assistant}`,{role:"assistant",sequence:2,text:"Synthetic original response",replyToUserMessageId:user,availability:"available",presentationMode:"default",appendBefore:{seconds:Math.floor(start/1000)-200+90*86400,nanoseconds:0}},start-100000);
  g.put(`${root}/message_sources/${assistant}`,{sources:[]});
  g.put(root,{state:"live",lifecycleVersion:1,nextSequence:3,latestMessageId:assistant});
  const conversations=new FirestoreConversationStore(g,environment,()=>g.now,undefined,cloud?OPENAI_CLOUD_PROCESSING:undefined);
  const store=new FirestoreFirstFlowStore(g,environment,{ownerAccountId:owner,utcMilliseconds:()=>g.now,
    ...(cloud?{cloudProcessing:OPENAI_CLOUD_PROCESSING}:{}),
    conversationTransaction:(tx,p,o,current)=>conversations.firstFlowTransaction(tx,p,o,current),
    ...(configured?{installationRef:installation,...(serviceLeaseMs===undefined?{registrationLeaseExpiresAt:new Date(start+45*60000).toISOString()}:{registrationLeaseDurationMs:serviceLeaseMs})}: {})});
  const actor:ProactiveActor={principal,current:()=>live,verifyCurrentAuth:async()=>{checks++;return {kind:"verified",principal};}};
  const create=async(n=10)=>value(await store.createIntent(actor,{intentId:id(n),conversationId:topic,sourceMessageId:user,category:"explicit_follow_up",dueAt:new Date(start+60000).toISOString(),timeZone:"UTC",...(cloud?{processing:"cloud" as const,...OPENAI_CLOUD_PROCESSING}:{processing:"local" as const}),expectedSettingsRevision:1}));
  const enable=async()=>value(await store.replaceSettings(actor,0,settings));
  const reserve=async(i:FirstFlowIntent)=>{g.now=start+60000;return value(await store.reserve(actor,i.intentId,i.revision));};
  const publish=async(r:FirstFlowReservation,n=20)=>value(await store.publish(actor,{reservation:r,messageId:id(n),text:"Synthetic follow up",presentation:{presentationMode:"default"}}));
  return {g,store,conversations,actor,cutoff,create,enable,reserve,publish,stop:()=>{live=false;},checks:()=>checks};
}

test("restart reads the committed rolling budget and cannot publish a second daily follow-up",async()=>{
  const f=fixture(false);await f.enable();await f.publish(await f.reserve(await f.create()));
  const restarted=new FirestoreFirstFlowStore(f.g,environment,{ownerAccountId:owner,utcMilliseconds:()=>f.g.now,
    conversationTransaction:(tx,p,o,current)=>f.conversations.firstFlowTransaction(tx,p,o,current)});
  const recovered=await restarted.recover(f.actor);assert.equal(recovered.kind,"ok");
  const next=value(await restarted.createIntent(f.actor,{intentId:id(42),conversationId:topic,sourceMessageId:user,
    category:"explicit_follow_up",dueAt:new Date(f.g.now+60000).toISOString(),timeZone:"UTC",processing:"local",expectedSettingsRevision:1}));
  f.g.now+=60000;
  const before=f.g.writes;
  assert.equal((await restarted.reserve(f.actor,next.intentId,next.revision)).kind,"frequency");
  assert.equal(f.g.writes,before);
});

test("restart expires a stale queued occurrence; idempotent readback never resurrects it",async()=>{
  const f=fixture(false);await f.enable();const old=await f.create();
  f.g.now=Date.parse(old.expiresAt);
  const restarted=new FirestoreFirstFlowStore(f.g,environment,{ownerAccountId:owner,utcMilliseconds:()=>f.g.now,
    conversationTransaction:(tx,p,o,current)=>f.conversations.firstFlowTransaction(tx,p,o,current)});
  const recovered=value(await restarted.recover(f.actor));
  assert.equal(recovered[0]?.state,"expired");
  const read=value(await restarted.intent(f.actor,old.intentId));assert.equal(read.state,"expired");
  assert.equal((await restarted.reserve(f.actor,read.intentId,read.revision)).kind,"conflict");
  const settings=value(await restarted.settings(f.actor));assert.equal(settings.revision,1);
});

test('service registration expiry is finite, dispatch never renews it, and explicit registration renews',async()=>{
  const f=fixture(true,60000);await f.enable();
  const command={expectedRevision:0,installationRef:installation,registrationKind:'fcm_token' as const,registrationValue:'synthetic-token',enabled:true as const};
  const registered=value(await f.store.replaceRegistration(f.actor,command));
  assert.equal(registered.expiresAt,new Date(start+60000).toISOString());
  const p=await f.publish(await f.reserve(await f.create()));
  assert.equal((await f.store.claimDispatch(f.actor,p.intentId,p.revision)).kind,'denied');
  assert.equal(value(await f.store.registration(f.actor)).availability,'expired');
  const renewed=value(await f.store.replaceRegistration(f.actor,{...command,expectedRevision:1}));
  assert.equal(renewed.expiresAt,new Date(start+120000).toISOString());
  value(await f.store.claimDispatch(f.actor,p.intentId,p.revision));
  assert.equal(value(await f.store.registration(f.actor)).expiresAt,renewed.expiresAt);
});

test("F0 defaults off, no implicit confirmed zone, no registration secret in metadata",async()=>{
  const f=fixture();const s=value(await f.store.settings(f.actor));assert.equal(s.mode,"off");assert.equal(s.timeZone,"");assert.equal(s.pushEnabled,false);assert.equal(f.g.writes,0);
  await f.enable();const registered=value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:"fcm_token",registrationValue:"secret-canary",enabled:true}));
  assert.equal(registered.availability,"registered");assert(!JSON.stringify(registered).includes("secret-canary"));assert(!JSON.stringify(await f.store.registration(f.actor)).includes("secret-canary"));
});
test("fresh async identity barrier denies revoked/unknown/different/terminated actors before any transaction",async()=>{
  for(const kind of ["forbidden","invalid","dependency_unavailable","different","terminated"] as const){
    const f=fixture();const calls=f.g.calls,writes=f.g.writes;
    const actor:ProactiveActor={...f.actor,verifyCurrentAuth:async()=>{await Promise.resolve();if(kind==="terminated")f.stop();return kind==="different"?{kind:"verified",principal:{firebaseUid:"foreign"}}:kind==="terminated"?{kind:"verified",principal}:{kind};}};
    assert.equal((await f.store.replaceSettings(actor,0,settings)).kind,kind==="dependency_unavailable"?"unavailable":kind==="terminated"?"terminated":"denied");assert.equal(f.g.calls,calls);assert.equal(f.g.writes,writes);
  }
});
test("unconfigured owner installation window cannot register even with enabled settings",async()=>{
  const f=fixture(false);await f.enable();const before=f.g.writes;
  assert.equal((await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:"fcm_token",registrationValue:"opaque",enabled:true})).kind,"denied");assert.equal(f.g.writes,before);
});
test("same create key reads back, changed command conflicts, max three active and no model/send I/O",async()=>{
  const f=fixture();await f.enable();const first=await f.create(),writes=f.g.writes;assert.deepEqual(await f.create(),first);assert.equal(f.g.writes,writes);
  assert.equal((await f.store.createIntent(f.actor,{intentId:first.intentId,conversationId:topic,sourceMessageId:user,category:"explicit_follow_up",dueAt:new Date(start+120000).toISOString(),timeZone:"UTC",processing:"local",expectedSettingsRevision:1})).kind,"conflict");
  await f.create(11);await f.create(12);assert.equal((await f.store.createIntent(f.actor,{intentId:id(13),conversationId:topic,sourceMessageId:user,category:"explicit_follow_up",dueAt:new Date(start+60000).toISOString(),timeZone:"UTC",processing:"local",expectedSettingsRevision:1})).kind,"frequency");
});
test("canonical publish is a standalone assistant plus v2 receipt and one budget charge, preserving R-ANCHOR",async()=>{
  const f=fixture();await f.enable();const r=await f.reserve(await f.create()),published=await f.publish(r);
  const message=f.g.rows.get(`${root}/messages/${id(20)}`)!;assert.equal(message.data.origin,"proactive");assert.equal(message.data.role,"assistant");assert(!Object.hasOwn(message.data,"replyToUserMessageId"));assert.deepEqual(message.data.appendBefore,f.cutoff);
  const receipt=f.g.rows.get(`${root}/message_sources/${id(20)}`)!.data;assert.equal(receipt.schemaVersion,"source_use_v2");assert(!JSON.stringify(receipt).includes("Synthetic"));assert(!JSON.stringify(receipt).includes("persona"));
  assert.deepEqual(f.g.rows.get(`${base}/proactive_state/current`)!.data.rollingAttemptTimes,[published.publishedAt]);
  const list=await f.conversations.listOwnedMessages(principal,owner,topic,undefined,()=>true);assert.equal(list.kind,"confirmed");if(list.kind!=="confirmed")return;
  assert.deepEqual(list.value.messages.map(m=>m.sequence),[1,2,3]);assert.equal(list.value.messages[2]?.sources?.length,1);
  const card=list.value.messages[2]!.sources![0]!;assert(!card.version.includes(user));
  assert.equal((await f.conversations.resolveOwnedSource(principal,owner,topic,id(20),card.cardRef,()=>true)).kind,"confirmed");
  f.g.now=(f.cutoff.seconds*1000);assert.equal((await f.conversations.listOwnedMessages(principal,owner,topic,undefined,()=>true)).kind,"conversation_unavailable");
});
test("source deletion or consent revoke/regrant stops queued/reserved publish with zero partial writes",async()=>{
  for(const mutation of ["delete","regrant"]){
    const f=fixture();await f.enable();const i=await f.create(),r=await f.reserve(i);
    if(mutation==="delete")f.g.rows.delete(`${root}/messages/${user}`);else f.g.put(base,{...f.g.rows.get(base)!.data,purposeRevocationGeneration:1});
    const before=f.g.writes;assert.notEqual((await f.store.publish(f.actor,{reservation:r,messageId:id(20),text:"must not publish",presentation:{presentationMode:"default"}})).kind,"ok");assert.equal(f.g.writes,before);assert(!f.g.rows.has(`${root}/messages/${id(20)}`));
  }
});
test("lost publish ACK keeps committed single message/budget; repeated publish cannot duplicate",async()=>{
  const f=fixture();await f.enable();const r=await f.reserve(await f.create());f.g.loseAck=true;
  assert.equal((await f.store.publish(f.actor,{reservation:r,messageId:id(20),text:"Synthetic follow up",presentation:{presentationMode:"default"}})).kind,"unknown");
  const read=value(await f.store.intent(f.actor,r.intent.intentId));assert.equal(read.state,"published");assert.equal(read.messageId,id(20));
  const before=f.g.writes;assert.equal((await f.store.publish(f.actor,{reservation:r,messageId:id(21),text:"duplicate",presentation:{presentationMode:"default"}})).kind,"revision_conflict");assert.equal(f.g.writes,before);assert(!f.g.rows.has(`${root}/messages/${id(21)}`));
});
test("dispatch claim is one-use; unknown ACK returns no send capability and recovery never reclaims",async()=>{
  const f=fixture();await f.enable();value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:"fcm_token",registrationValue:"secret",enabled:true}));
  const p=await f.publish(await f.reserve(await f.create()));f.g.loseAck=true;
  assert.deepEqual(await f.store.claimDispatch(f.actor,p.intentId,p.revision),{kind:"unknown"});
  const recovered=value(await f.store.recover(f.actor));assert.equal(recovered[0]?.dispatchState,"unknown");
  const i=value(await f.store.intent(f.actor,p.intentId));assert.equal((await f.store.claimDispatch(f.actor,i.intentId,i.revision)).kind,"conflict");assert.equal(value(await f.store.activeIntents(f.actor)).length,0);
});
test("off cancels captured work and on never resurrects; cancellation after dispatch does not promise recall",async()=>{
  const f=fixture();await f.enable();const i=await f.create();value(await f.store.replaceSettings(f.actor,1,{...settings,mode:"off"}));value(await f.store.replaceSettings(f.actor,2,settings));assert.equal(value(await f.store.intent(f.actor,i.intentId)).state,"cancelled");assert.equal(value(await f.store.activeIntents(f.actor)).length,0);
  const next=value(await f.store.createIntent(f.actor,{intentId:id(11),conversationId:topic,sourceMessageId:user,category:"explicit_follow_up",dueAt:new Date(start+60000).toISOString(),timeZone:"UTC",processing:"local",expectedSettingsRevision:3}));
  value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:"fcm_token",registrationValue:"secret",enabled:true}));const p=await f.publish(await f.reserve(next));const dispatch=value(await f.store.claimDispatch(f.actor,p.intentId,p.revision));
  const cancelled=value(await f.store.cancelIntent(f.actor,p.intentId,dispatch.claim.revision));assert.equal(cancelled.dispatchState,"dispatching");
});
test("read watermark is monotonic CAS metadata, never a topic append or unread inferred from push",async()=>{
  const f=fixture();const before=f.g.rows.get(root);assert.deepEqual(value(await f.store.readState(f.actor,topic)),{revision:0,readThroughSequence:0});
  assert.deepEqual(value(await f.store.markRead(f.actor,topic,0,2)),{revision:1,readThroughSequence:2});assert.deepEqual(value(await f.store.markRead(f.actor,topic,1,1)),{revision:1,readThroughSequence:2});assert.deepEqual(f.g.rows.get(root),before);
  assert.equal((await f.store.markRead(f.actor,topic,0,2)).kind,"revision_conflict");assert.notEqual((await f.store.markRead(f.actor,topic,1,99)).kind,"ok");
});
test("stale sequential source reads cannot become fresh by wrapping a new envelope",async()=>{
  const f=fixture();await f.enable();const i=await f.create();f.g.now=start+60000;const before=f.g.writes;f.g.onRead=()=>{f.g.now+=1000;};assert.equal((await f.store.reserve(f.actor,i.intentId,i.revision)).kind,"unavailable");assert.equal(f.g.writes,before);
});
test("fresh identity and source checks run anew for reserve/publish/claim, no cached authorization",async()=>{
  const f=fixture();await f.enable();value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:"fcm_token",registrationValue:"secret",enabled:true}));const i=await f.create(),at=f.checks(),r=await f.reserve(i),p=await f.publish(r),d=value(await f.store.claimDispatch(f.actor,p.intentId,p.revision));assert.equal(f.checks()-at,4);
  assert.equal(value(await f.store.recordDispatch(f.actor,d.claim,"accepted")).dispatchState,"accepted");assert.equal((await f.store.claimDispatch(f.actor,p.intentId,p.revision)).kind,"revision_conflict");
});

test("reserve/publish/claim each await current identity and revoked/unknown identity causes zero transactions",async()=>{
  for(const phase of ["reserve","publish","claim"]){for(const kind of ["forbidden","dependency_unavailable"] as const){
    const f=fixture();await f.enable();const i=await f.create(),r=phase!=="reserve"?await f.reserve(i):undefined,p=phase==="claim"?await f.publish(r!):undefined;
    const a:ProactiveActor={...f.actor,verifyCurrentAuth:async()=>{await Promise.resolve();return {kind};}},calls=f.g.calls,writes=f.g.writes;
    const result=phase==="reserve"?await f.store.reserve(a,i.intentId,i.revision):phase==="publish"?await f.store.publish(a,{reservation:r!,messageId:id(20),text:"must not save",presentation:{presentationMode:"default"}}):await f.store.claimDispatch(a,p!.intentId,p!.revision);
    assert.equal(result.kind,kind==="forbidden"?"denied":"unavailable");assert.equal(f.g.calls,calls);assert.equal(f.g.writes,writes);
  }}
});
test("a failed staged canonical/receipt write rolls back every document and budget, without retry",async()=>{
  const f=fixture();await f.enable();const r=await f.reserve(await f.create()),before=structuredClone([...f.g.rows]),calls=f.g.calls;f.g.failAtWrite=2;
  assert.equal((await f.store.publish(f.actor,{reservation:r,messageId:id(20),text:"must roll back",presentation:{presentationMode:"default"}})).kind,"unavailable");
  assert.deepEqual([...f.g.rows],before);assert.equal(f.g.calls,calls+1);
});
test("preview-only settings edits preserve grants; expiry and registration lease are checked again before claim",async()=>{
  const f=fixture();await f.enable();const i=await f.create();const changed=value(await f.store.replaceSettings(f.actor,1,{...settings,preview:"hidden"}));assert.equal(changed.grantGeneration,1);
  value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:"fcm_token",registrationValue:"secret",enabled:true}));
  const p=await f.publish(await f.reserve(i));f.g.now=start+45*60000;const before=f.g.writes;assert.equal((await f.store.claimDispatch(f.actor,p.intentId,p.revision)).kind,"denied");assert.equal(f.g.writes,before);
});
test("recovery with no saved settings is a read-only empty set and does not create an invalid revision zero row",async()=>{
  const f=fixture();assert.deepEqual(value(await f.store.recover(f.actor)),[]);assert.equal(f.g.writes,0);assert.equal(value(await f.store.settings(f.actor)).revision,0);
});

function ordinaryFixture(){
  const f=fixture(false),otherOwner=id(100),otherBase=`accounts/${otherOwner}`;
  for(const [path,row] of [...f.g.rows])if(path===base||path.startsWith(base+"/")){
    const data={...structuredClone(row.data),...(path===base?{username:"ordinary_other"}:{})};
    f.g.put(path.replace(base,otherBase),data,row.createTime.seconds*1000+row.createTime.nanoseconds/1e6);
  }
  const otherPrincipal={firebaseUid:"ordinary-second-account"};
  f.g.put(`auth_bindings/${createAuthBindingDocumentId(otherPrincipal.firebaseUid)}`,{accountId:otherOwner});
  const other:ProactiveActor={principal:otherPrincipal,current:()=>true,verifyCurrentAuth:async()=>({kind:"verified",principal:otherPrincipal})};
  const store=createAccountScopedFirstFlowStore(f.g,environment,{utcMilliseconds:()=>f.g.now,accountScopedRegistration:true,registrationLeaseDurationMs:30*86400000,
    conversationTransaction:(tx,p,o,live)=>f.conversations.firstFlowTransaction(tx,p,o,live)});
  const register=(a:ProactiveActor,installationRef:string,token:string,expectedRevision=0)=>store.replaceRegistration(a,{expectedRevision,installationRef,registrationKind:"fcm_token",registrationValue:token,enabled:true});
  const create=(a:ProactiveActor,n:number)=>store.createIntent(a,{intentId:id(n),conversationId:topic,sourceMessageId:user,category:"explicit_follow_up",dueAt:new Date(start+60000).toISOString(),timeZone:"UTC",processing:"local",expectedSettingsRevision:1});
  return {...f,store,other,otherBase,register,create};
}

test("ordinary accounts have independent defaults, settings, sources and opaque occurrence ownership",async()=>{
  const f=ordinaryFixture();
  assert.equal(value(await f.store.settings(f.actor)).mode,"off");assert.equal(value(await f.store.settings(f.other)).mode,"off");
  value(await f.store.replaceSettings(f.actor,0,settings));
  assert.equal(value(await f.store.settings(f.other)).mode,"off");
  value(await f.store.replaceSettings(f.other,0,settings));
  value(await f.create(f.actor,401));value(await f.create(f.other,402));
  assert.equal((await f.store.intent(f.other,id(401))).kind,"not_found");
  assert.equal((await f.store.cancelIntent(f.actor,id(402),1)).kind,"not_found");
  assert.deepEqual(value(await f.store.activeIntents(f.actor)).map(i=>i.intentId),[id(401)]);
  assert.deepEqual(value(await f.store.activeIntents(f.other)).map(i=>i.intentId),[id(402)]);
  const roster=await new FirestoreProactiveAccountRoster(f.g).page(undefined);
  assert.deepEqual(new Set(roster.actors),new Set([principal.firebaseUid,f.other.principal.firebaseUid]));
});

test("ordinary installation or token transfer fences the previous account's dispatch without changing its data",async()=>{
  for(const reuse of ["installation","token"]){
    const f=ordinaryFixture();value(await f.store.replaceSettings(f.actor,0,settings));value(await f.store.replaceSettings(f.other,0,settings));
    value(await f.register(f.actor,id(501),"synthetic-token-a"));
    const i=value(await f.create(f.actor,601));f.g.now=start+60000;
    const reserved=value(await f.store.reserve(f.actor,i.intentId,i.revision));
    const published=value(await f.store.publish(f.actor,{reservation:reserved,messageId:id(602),text:"Synthetic follow up",presentation:{presentationMode:"default"}}));
    const prior=f.g.rows.get(`${base}/proactive_registration/current`);
    value(await f.register(f.other,reuse==="installation"?id(501):id(502),reuse==="token"?"synthetic-token-a":"synthetic-token-b"));
    assert.deepEqual(f.g.rows.get(`${base}/proactive_registration/current`),prior);
    assert.equal(value(await f.store.registration(f.actor)).enabled,false);
    assert.equal(value(await f.store.registration(f.other)).enabled,true);
    assert.equal((await f.store.claimDispatch(f.actor,published.intentId,published.revision)).kind,"denied");
    value(await f.store.deleteRegistration(f.actor,id(501),1));
    assert.equal(value(await f.store.registration(f.other)).enabled,true,"old owner cleanup cannot release new owner");
  }
});

test("ordinary device replacement uses revision, removes old indexes, and denies stale revocation",async()=>{
  const f=ordinaryFixture();value(await f.store.replaceSettings(f.actor,0,settings));
  value(await f.register(f.actor,id(701),"token-one"));
  assert.equal((await f.register(f.actor,id(702),"token-two",0)).kind,"revision_conflict");
  value(await f.register(f.actor,id(702),"token-two",1));
  assert.equal(f.g.rows.has(`proactive_installations/${id(701)}`),false);
  assert.equal((await f.store.deleteRegistration(f.actor,id(701),2)).kind,"denied");
  assert.equal(value(await f.store.registration(f.actor)).installationRef,id(702));
  value(await f.store.deleteRegistration(f.actor,id(702),2));
  assert.equal([...f.g.rows.keys()].some(k=>k.startsWith("proactive_installations/")||k.startsWith("proactive_token_owners/")),false);
});

test("ordinary identity replacement and consent rejection do not borrow another owner's grant",async()=>{
  const f=ordinaryFixture();value(await f.store.replaceSettings(f.actor,0,settings));
  const changed={...f.actor,verifyCurrentAuth:async()=>({kind:"verified" as const,principal:f.other.principal})};
  assert.equal((await f.store.settings(changed)).kind,"denied");
  const row=f.g.rows.get(base)!.data;f.g.put(base,{...row,optionalProcessingConsent:"rejected",purposeRevocationGeneration:1});
  assert.equal((await f.register(f.actor,id(801),"token")).kind,"denied");
  assert.equal(value(await f.store.settings(f.other)).mode,"off");
});


test("ordinary worker runs two registered owners once, restores after restart and never replays unknown send",async()=>{
  const f=ordinaryFixture();
  for(const [a,n] of [[f.actor,901],[f.other,902]] as const){
    value(await f.store.replaceSettings(a,0,settings));value(await f.register(a,id(n),`synthetic-${n}`));value(await f.create(a,n+10));
  }
  f.g.now=start+60000;let models=0,sends=0;
  const app=new FirstFlowApplication({store:f.store,newMessageId:()=>id(1000+models),nowMs:()=>f.g.now,
    model:{generate:async()=>{models++;return new TextEncoder().encode(JSON.stringify({schemaVersion:"ai_assistant_message_v1",message:"Synthetic requested reminder"}));}},
    sender:{sendOnce:async input=>{const dispatch=value(await input.claimAfterCredential());assert(input.current(dispatch.claim));sends++;return {kind:sends===1?"unknown":"accepted"};}}});
  const options={application:app,roster:new FirestoreProactiveAccountRoster(f.g),actor:(uid:string)=>uid===principal.firebaseUid?f.actor:f.other,current:()=>true,nowMs:()=>f.g.now};
  const worker=new AccountFirstFlowDueWorker(options);await worker.tick();await worker.stop();
  assert.equal(models,2);assert.equal(sends,2);
  assert.equal(value(await f.store.activeIntents(f.actor)).length,0);assert.equal(value(await f.store.activeIntents(f.other)).length,0);
  assert.deepEqual(new Set([value(await f.store.intent(f.actor,id(911))).dispatchState,value(await f.store.intent(f.other,id(912))).dispatchState]),new Set(["accepted","unknown"]));
  const restarted=new AccountFirstFlowDueWorker(options);await restarted.tick();await restarted.stop();assert.equal(models,2);assert.equal(sends,2);
});

test("ordinary roster rotates beyond a full page without reading private message content",async()=>{
  const g=new MetadataFirestoreGateway(start),seen:string[]=[];
  for(let i=0;i<27;i++){const uid=`ordinary-roster-${String(i).padStart(3,"0")}`;g.put(`auth_bindings/${createAuthBindingDocumentId(uid)}`,{accountId:id(2000+i)});g.put(`accounts/${id(2000+i)}/proactive_state/current`,{activeIntentIds:[id(3000+i)]});}
  g.onRead=path=>{seen.push(path);};const roster=new FirestoreProactiveAccountRoster(g);
  const first=await roster.page(undefined);assert.equal(first.actors.length,25);assert(first.next);
  const second=await roster.page(first.next);assert.equal(second.actors.length,2);assert.equal(second.next,undefined);
  assert.equal(new Set([...first.actors,...second.actors]).size,27);
  assert(seen.every(path=>path==="auth_bindings"||path.endsWith("/proactive_state/current")));
});

test('OpenAI intent stores only its exact marker and server generation; receipt v3 carries original provenance',async()=>{
  const f=fixture(true,undefined,true);await f.enable();const intent=await f.create();
  assert.equal(intent.processing,'cloud');assert.equal(intent.cloudAiConsentGeneration,3);
  assert.equal(f.g.rows.get(`${base}/proactive_occurrences/${intent.intentId}`)?.data.cloudAiConsentGeneration,3);
  const reserved=await f.reserve(intent);assert.equal((await f.store.validateReservation(f.actor,reserved)).kind,'ok');
  const published=await f.publish(reserved);
  const receipt=f.g.rows.get(`${root}/message_sources/${id(20)}`)!.data;
  assert.equal(receipt.schemaVersion,'source_use_v3');assert.equal(receipt.purpose,'explicit_follow_up');
  assert.equal(receipt.processing,'cloud');assert.equal(receipt.provider,'openai');assert.equal(receipt.disclosureVersion,'openai_cloud_v1');
  assert.equal(receipt.cloudAiConsentGeneration,3);assert.equal(receipt.purposeRevocationGeneration,0);
  const list=await f.conversations.listOwnedMessages(principal,owner,topic,undefined,()=>true);
  assert.equal(list.kind,'confirmed');if(list.kind!=='confirmed')return;
  const message=list.value.messages.find(m=>m.messageId===published.messageId)!;
  assert.equal(message.processing,'cloud');assert.equal(message.provider,'openai');
});

test('cloud F0 exact marker rejects partial, extra, foreign provider, client generation and unmarked local input',async()=>{
  const f=fixture(true,undefined,true);await f.enable();const command={intentId:id(10),conversationId:topic,sourceMessageId:user,category:'explicit_follow_up',
    dueAt:new Date(start+60000).toISOString(),timeZone:'UTC',processing:'cloud',...OPENAI_CLOUD_PROCESSING,expectedSettingsRevision:1};
  const before=f.g.writes;
  for(const patch of [{provider:undefined},{disclosureVersion:undefined},{provider:'groq',disclosureVersion:'groq_cloud_v1'},
    {cloudAiConsentGeneration:3},{processing:'local'},{unexpected:true}]){
    assert.equal((await f.store.createIntent(f.actor,{...command,...patch} as unknown as import('../../src/proactive/ports/first-flow.js').FirstFlowIntentCommand)).kind,'invalid');
  }
  const {provider:_p,disclosureVersion:_v,...local}=command;
  assert.equal((await f.store.createIntent(f.actor,{...local,processing:'local'} as import('../../src/proactive/ports/first-flow.js').FirstFlowIntentCommand)).kind,'denied');
  assert.equal(f.g.writes,before);
});

for(const phase of ['reserve','validate','publish','dispatch'])test(`OpenAI withdrawal/reaccept before ${phase} prevents the effect`,async()=>{
  const f=fixture(true,undefined,true);await f.enable();
  value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:'fcm_token',registrationValue:'synthetic',enabled:true}));
  const intent=await f.create(),reservation=phase==='reserve'?undefined:await f.reserve(intent),published=phase==='dispatch'?await f.publish(reservation!):undefined;
  f.g.now=start+60000;f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsentGeneration:4});const before=f.g.writes;
  const result=phase==='reserve'?await f.store.reserve(f.actor,intent.intentId,intent.revision):phase==='validate'?await f.store.validateReservation(f.actor,reservation!):
    phase==='publish'?await f.store.publish(f.actor,{reservation:reservation!,messageId:id(20),text:'must not publish',presentation:{presentationMode:'default'}}):
    await f.store.claimDispatch(f.actor,published!.intentId,published!.revision);
  assert.notEqual(result.kind,'ok');assert.equal(f.g.writes,before);
});

test('cloud withdrawal leaves protective pause/off/cancel/delete and local history readable, but closes new enable/rotate',async()=>{
  const f=fixture(true,undefined,true);await f.enable();const intent=await f.create();
  value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:'fcm_token',registrationValue:'synthetic',enabled:true}));
  f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsent:{state:'declined',disclosureVersion:'openai_cloud_v1'},cloudAiConsentGeneration:4});
  const before=f.g.writes;
  assert.equal((await f.store.replaceSettings(f.actor,1,settings)).kind,'denied');
  assert.equal((await f.store.replaceRegistration(f.actor,{expectedRevision:1,installationRef:installation,registrationKind:'fcm_token',registrationValue:'rotated',enabled:true})).kind,'denied');
  assert.equal(f.g.writes,before);assert.equal((await f.store.intent(f.actor,intent.intentId)).kind,'ok');
  value(await f.store.cancelIntent(f.actor,intent.intentId,intent.revision));
  value(await f.store.replaceSettings(f.actor,1,{...settings,mode:'paused'}));
  value(await f.store.replaceSettings(f.actor,2,{...settings,mode:'off'}));
  value(await f.store.deleteRegistration(f.actor,installation,1));
  assert.equal((await f.conversations.listOwnedMessages(principal,owner,topic,undefined,()=>true)).kind,'confirmed');
});

test('restart preserves queued cloud generation but fails started work and never reclaims unknown delivery',async()=>{
  const f=fixture(true,undefined,true);await f.enable();await f.create(10);const reserved=await f.reserve(await f.create(11));
  const restarted=new FirestoreFirstFlowStore(f.g,environment,{ownerAccountId:owner,cloudProcessing:OPENAI_CLOUD_PROCESSING,utcMilliseconds:()=>f.g.now,
    conversationTransaction:(tx,p,o,current)=>f.conversations.firstFlowTransaction(tx,p,o,current)});
  value(await restarted.recover(f.actor));assert.equal(value(await restarted.intent(f.actor,id(10))).state,'queued');
  assert.equal(value(await restarted.intent(f.actor,id(10))).cloudAiConsentGeneration,3);
  assert.equal(value(await restarted.intent(f.actor,reserved.intent.intentId)).state,'failed');
  assert.notEqual((await restarted.reserve(f.actor,reserved.intent.intentId,reserved.intent.revision)).kind,'ok');
  f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsentGeneration:4});
  assert.equal((await restarted.reserve(f.actor,id(10),1)).kind,'denied');
});

test('cloud withdrawal permits strict push-off while mode stays on, without opening zone/quiet or re-enable changes',async()=>{
  const f=fixture(true,undefined,true);await f.enable();
  value(await f.store.replaceRegistration(f.actor,{expectedRevision:0,installationRef:installation,registrationKind:'fcm_token',registrationValue:'synthetic',enabled:true}));
  f.g.put(base,{...f.g.rows.get(base)!.data,cloudAiConsent:{state:'declined',disclosureVersion:'openai_cloud_v1'},cloudAiConsentGeneration:4});
  value(await f.store.deleteRegistration(f.actor,installation,1));
  for(const patch of [{timeZone:'Australia/Sydney'},{quiet:{kind:'disabled' as const}},{preview:'hidden' as const}])
    assert.equal((await f.store.replaceSettings(f.actor,1,{...settings,pushEnabled:false,...patch})).kind,'denied');
  const disabled=value(await f.store.replaceSettings(f.actor,1,{...settings,pushEnabled:false}));
  assert.equal(disabled.mode,'on');assert.equal(disabled.pushEnabled,false);
  assert.equal((await f.store.replaceSettings(f.actor,2,settings)).kind,'denied');
  assert.equal((await f.store.replaceSettings(f.actor,2,{...settings,pushEnabled:false})).kind,'denied');
});
