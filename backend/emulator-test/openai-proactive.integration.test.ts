import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway, type FirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { withRetainedMessageTimes } from '../src/ai-conversation/infrastructure/retained-message-times.js';
import { FirestoreConversationStore } from '../src/ai-conversation/infrastructure/firestore-conversation-store.js';
import { FirestoreFirstFlowStore } from '../src/proactive/infrastructure/firestore-first-flow-store.js';
import { FirestoreCloudConsentGateway } from '../src/account/infrastructure/firestore-cloud-consent-gateway.js';
import { OPENAI_CLOUD_PROCESSING } from '../src/account/domain/cloud-ai-consent.js';
import type { FirstFlowResult, FirstFlowSettingsInput, ProactiveActor } from '../src/proactive/ports/first-flow.js';

// Guard before any Firebase initialization. Local synthetic metadata only; no
// model, FCM or production credentials. Every fixture removes only its own rows.
const env=requireControlledEmulatorEnvironment(process.env);
const firebase=initializeApp({projectId:env.projectId},`openai-proactive-${randomUUID()}`),db=getFirestore(firebase),auth=getAuth(firebase);
const raw=new FirebaseAdminFirestoreGateway(db),retained=withRetainedMessageTimes(raw);
const ok=<T>(result:FirstFlowResult<T>):T=>{assert.equal(result.kind,'ok');if(result.kind!=='ok')throw Error('Expected confirmed result');return result.value;};
after(async()=>{try{await db.terminate();}finally{await deleteApp(firebase);}});
async function fixture(){
  const owner=randomUUID(),uid=`synthetic-proactive-${randomUUID()}`,principal={firebaseUid:uid},topic=randomUUID(),user=randomUUID(),reply=randomUUID(),intentId=randomUUID(),messageId=randomUUID();
  const base=`accounts/${owner}`,root=`${base}/conversations/${topic}`,binding=`auth_bindings/${createAuthBindingDocumentId(uid)!}`;
  let now=Date.now(),active=true;
  const epoch={processEpoch:randomUUID(),generation:1},previous=(await db.doc('ai_runtime_fence/current').get()).data();
  await db.doc('ai_runtime_fence/current').set({...epoch,cleanupGeneration:0});
  await auth.createUser({uid});
  await db.doc(binding).create({accountId:owner});
  await db.doc(base).create({username:'synthetic_followup',optionalProcessingConsent:'accepted',checkInVisibility:'private',
    onboardingCompletedAt:new Date(now).toISOString(),purposeRevocationGeneration:0,
    cloudAiConsent:{state:'accepted',disclosureVersion:'openai_cloud_v1'},cloudAiConsentGeneration:3});
  await db.doc(`${base}/persona_state/current`).create({stateRevision:0,livePersonaIds:[]});
  await db.doc(`${root}/messages/${user}`).create({role:'user',sequence:1,text:'Synthetic request: ask about the task later.',acceptedAssistantMessageId:reply});
  const first=await db.doc(`${root}/messages/${user}`).get();
  const cutoff={seconds:first.createTime!.seconds+90*86400,nanoseconds:first.createTime!.nanoseconds};
  await db.doc(`${root}/messages/${reply}`).create({role:'assistant',sequence:2,text:'Synthetic existing reply.',availability:'available',replyToUserMessageId:user,presentationMode:'default',appendBefore:cutoff});
  const lastAnchor=(await db.doc(`${root}/messages/${reply}`).get()).createTime!;
  const topicCutoff={seconds:lastAnchor.seconds+90*86400,nanoseconds:lastAnchor.nanoseconds};
  await db.doc(`${root}/message_sources/${reply}`).create({sources:[]});
  await db.doc(root).create({state:'live',lifecycleVersion:1,nextSequence:3,latestMessageId:reply});
  // The scheduling clock starts after real SDK source commits. A frozen clock
  // captured before fixture setup would make their server times look future.
  now=Date.now();
  const gateway=new FirestoreCloudConsentGateway(retained,epoch,()=>active);
  const conversations=new FirestoreConversationStore(retained,process.env,()=>now,undefined,OPENAI_CLOUD_PROCESSING);
  const make=(g:FirestoreGateway=gateway)=>new FirestoreFirstFlowStore(g,process.env,{ownerAccountId:owner,cloudProcessing:OPENAI_CLOUD_PROCESSING,
    utcMilliseconds:()=>now,conversationTransaction:(tx,p,o,current)=>conversations.firstFlowTransaction(tx,p,o,current)});
  const store=make();
  const actor:ProactiveActor={principal,current:()=>active,verifyCurrentAuth:async()=>{
    const user=await auth.getUser(uid);return user.uid===uid&&!user.disabled?{kind:'verified',principal}:{kind:'forbidden'};
  }};
  const settings:FirstFlowSettingsInput={mode:'on',categories:['explicit_follow_up'],timeZone:'Asia/Singapore',quiet:{kind:'disabled'},
    maximumInRolling24h:1,cooldownMinutes:480,pushEnabled:false,preview:'generic'};
  ok(await store.replaceSettings(actor,0,settings));
  const command={intentId,conversationId:topic,sourceMessageId:user,category:'explicit_follow_up' as const,dueAt:new Date(now+60000).toISOString(),
    timeZone:'Asia/Singapore',processing:'cloud' as const,...OPENAI_CLOUD_PROCESSING,expectedSettingsRevision:1};
  return {owner,uid,principal,topic,user,reply,intentId,messageId,base,root,cutoff:topicCutoff,epoch,gateway,conversations,store,actor,settings,command,make,
    due(){now+=60000;},
    async close(){active=false;
      for(const name of ['messages','message_sources','read_state'])for(const doc of (await db.collection(`${root}/${name}`).get()).docs)await doc.ref.delete();
      await db.doc(root).delete();
      for(const name of ['persona_state','proactive_occurrences','proactive_state','proactive_registration'])for(const doc of (await db.collection(`${base}/${name}`).get()).docs)await doc.ref.delete();
      await db.doc(base).delete();await db.doc(binding).delete();await auth.deleteUser(uid);
      const marker=await db.doc('ai_runtime_fence/current').get();
      if(marker.data()?.processEpoch===epoch.processEpoch){if(previous)await marker.ref.set(previous);else await marker.ref.delete();}
      assert.equal((await db.doc(base).get()).exists,false);
    }};
}

test('actual SDK create captures consent generation; canonical cloud append commits v3 plus server timestamps once',async()=>{
  const f=await fixture();try{
    const intent=ok(await f.store.createIntent(f.actor,f.command));assert.equal(intent.cloudAiConsentGeneration,3);
    assert.deepEqual(ok(await f.store.createIntent(f.actor,f.command)),intent);
    const row=(await db.doc(`${f.base}/proactive_occurrences/${f.intentId}`).get()).data()!;
    assert.equal(row.provider,'openai');assert.equal(row.disclosureVersion,'openai_cloud_v1');assert.equal(row.cloudAiConsentGeneration,3);
    f.due();const reservation=ok(await f.store.reserve(f.actor,intent.intentId,intent.revision));
    ok(await f.store.validateReservation(f.actor,reservation));
    const published=ok(await f.store.publish(f.actor,{reservation,messageId:f.messageId,text:'Synthetic follow-up question.',presentation:{presentationMode:'default'}}));
    const receipt=(await db.doc(`${f.root}/message_sources/${f.messageId}`).get()).data()!;
    assert.equal(receipt.schemaVersion,'source_use_v3');assert.equal(receipt.purpose,'explicit_follow_up');assert.equal(receipt.cloudAiConsentGeneration,3);
    const canonical=(await db.doc(`${f.root}/messages/${f.messageId}`).get()).data()!;
    assert(canonical.retainedCreatedAt instanceof Timestamp);assert.deepEqual(canonical.appendBefore,f.cutoff);assert.equal(canonical.origin,'proactive');
    assert((await db.doc(`${f.base}/proactive_occurrences/${f.intentId}`).get()).data()!.publishedAt instanceof Timestamp);
    const state=(await db.doc(`${f.base}/proactive_state/current`).get()).data()!;assert(state.lastAttemptedAt instanceof Timestamp);assert.deepEqual(state.rollingAttemptTimes,[]);
    const history=await f.conversations.listOwnedMessages(f.principal,f.owner,f.topic,undefined,()=>true);assert.equal(history.kind,'confirmed');
    if(history.kind==='confirmed')assert.equal(history.value.messages.at(-1)?.provider,'openai');
    assert.notEqual((await f.store.publish(f.actor,{reservation,messageId:randomUUID(),text:'must not duplicate',presentation:{presentationMode:'default'}})).kind,'ok');
    assert.equal((await db.collection(`${f.root}/messages`).get()).size,3);assert.equal(published.dispatchState,'skipped');
  }finally{await f.close();}
});

test('actual SDK withdrawal/reaccept prevents original reservation publication but permits metadata cancellation',async()=>{
  const f=await fixture();try{
    const intent=ok(await f.store.createIntent(f.actor,f.command));f.due();const reservation=ok(await f.store.reserve(f.actor,intent.intentId,intent.revision));
    await db.doc(f.base).update({cloudAiConsentGeneration:4});
    assert.equal((await f.store.validateReservation(f.actor,reservation)).kind,'denied');
    assert.equal((await f.store.publish(f.actor,{reservation,messageId:f.messageId,text:'must not publish',presentation:{presentationMode:'default'}})).kind,'denied');
    assert.equal((await db.doc(`${f.root}/messages/${f.messageId}`).get()).exists,false);
    assert.equal(ok(await f.store.intent(f.actor,intent.intentId)).state,'reserved');
    ok(await f.store.cancelIntent(f.actor,intent.intentId,reservation.intent.revision));
    ok(await f.store.replaceSettings(f.actor,1,{...f.settings,mode:'off'}));
  }finally{await f.close();}
});

test('actual SDK lost publication ACK preserves exactly one message and recovery never regenerates it',async()=>{
  const f=await fixture();try{
    const intent=ok(await f.store.createIntent(f.actor,f.command));f.due();const reservation=ok(await f.store.reserve(f.actor,intent.intentId,intent.revision));
    let lose=true;const uncertain=f.make({async runTransaction(work){const result=await f.gateway.runTransaction(work);if(lose){lose=false;throw Error('synthetic lost ACK');}return result;}});
    assert.equal((await uncertain.publish(f.actor,{reservation,messageId:f.messageId,text:'Synthetic one committed follow-up.',presentation:{presentationMode:'default'}})).kind,'unknown');
    const restarted=f.make();ok(await restarted.recover(f.actor));const actual=ok(await restarted.intent(f.actor,f.intentId));
    assert.equal(actual.state,'published');assert.equal(actual.messageId,f.messageId);
    assert.notEqual((await restarted.reserve(f.actor,f.intentId,actual.revision)).kind,'ok');
    assert.equal((await db.collection(`${f.root}/messages`).get()).size,3);
  }finally{await f.close();}
});

test('actual SDK replacement epoch rejects old-owner creation without a new occurrence',async()=>{
  const f=await fixture();try{
    await db.doc('ai_runtime_fence/current').update({generation:2});
    assert.notEqual((await f.store.createIntent(f.actor,f.command)).kind,'ok');
    assert.equal((await db.doc(`${f.base}/proactive_occurrences/${f.intentId}`).get()).exists,false);
  }finally{await f.close();}
});

test('actual SDK permits only protective push-off after cloud withdrawal while mode remains on',async()=>{
  const f=await fixture();try{
    ok(await f.store.replaceSettings(f.actor,1,{...f.settings,pushEnabled:true}));
    await db.doc(f.base).update({cloudAiConsent:{state:'declined',disclosureVersion:'openai_cloud_v1'},cloudAiConsentGeneration:4});
    assert.equal((await f.store.replaceSettings(f.actor,2,{...f.settings,timeZone:'Australia/Sydney'})).kind,'denied');
    const disabled=ok(await f.store.replaceSettings(f.actor,2,f.settings));assert.equal(disabled.mode,'on');assert.equal(disabled.pushEnabled,false);
    assert.equal((await f.store.replaceSettings(f.actor,3,{...f.settings,pushEnabled:true})).kind,'denied');
    assert.equal((await db.doc(`${f.base}/proactive_state/current`).get()).data()!.pushEnabled,false);
  }finally{await f.close();}
});
