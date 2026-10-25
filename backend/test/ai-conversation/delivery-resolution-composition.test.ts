import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { withDeliveryResolution } from "../../src/bootstrap/owned-source-composition.js";
import type { ConversationCaller } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { OwnedMessageAnchor } from "../../src/ai-conversation/ports/owned-sources.js";
import type { FirstFlowApplication } from "../../src/proactive/application/first-flow-application.js";
import type { FirstFlowIntent } from "../../src/proactive/ports/first-flow.js";
import type { OwnedSourceOperations } from "../../src/ai-conversation/transport/register-owned-source-routes.js";

const deliveryRef=randomUUID(),conversationId=randomUUID(),messageId=randomUUID();
const caller:ConversationCaller={principal:{firebaseUid:"fixed-synthetic-owner"},tokenInstance:"request-only",verifyCurrentAuth:async()=>({kind:"verified",principal:{firebaseUid:"fixed-synthetic-owner"}})};
const target:OwnedMessageAnchor={conversationId,messageId,sequence:3,pageBefore:4};
const published={intentId:deliveryRef,state:"published",messageId,messageSequence:3,conversationId} as FirstFlowIntent;
function fixture(intent:FirstFlowApplication["intent"],anchor:OwnedSourceOperations["anchor"],accepting=()=>true){
 return withDeliveryResolution({resolve:async()=>({kind:"failure",code:"AI_SOURCE_UNAVAILABLE"}),anchor},{intent},accepting).deliveryAnchor!;
}
test("delivery resolution rereads the exact published message and uses current request authority",async()=>{
 let reads=0;
 const resolve=fixture(async(actor,id)=>{assert.equal(id,deliveryRef);assert.equal(actor.principal,caller.principal);assert.equal((await actor.verifyCurrentAuth()).kind,"verified");return{kind:"ok",value:published};},
  async(actual,c,m,current)=>{reads++;assert.equal(actual,caller);assert.equal(c,conversationId);assert.equal(m,messageId);assert.equal(current(),true);return{kind:"success",value:target};});
 assert.deepEqual(await resolve(caller,deliveryRef,()=>true),{kind:"success",value:target});assert.equal(reads,1);
});
test("unpublished, denied and unknown delivery references cannot fall back to latest transcript",async()=>{
 for(const result of [{kind:"ok",value:{...published,state:"queued"}},{kind:"not_found"},{kind:"denied"},{kind:"unknown"}] as const){
  let reads=0;const resolve=fixture(async()=>result,async()=>{reads++;return{kind:"success",value:target};});
  const response=await resolve(caller,deliveryRef,()=>true);assert.deepEqual(response,{kind:"failure",code:result.kind==="unknown"?"AI_UNAVAILABLE":"AI_SOURCE_UNAVAILABLE"});assert.equal(reads,0);
 }
});
test("account or host retirement after lookup cannot reveal an anchor and inconsistent inner targets fail closed",async()=>{
 let live=true,reads=0;
 const retired=fixture(async()=>{live=false;return{kind:"ok",value:published};},async()=>{reads++;return{kind:"success",value:target};});
 assert.deepEqual(await retired(caller,deliveryRef,()=>live),{kind:"terminated"});assert.equal(reads,0);
 for(const change of [{messageId:randomUUID()},{conversationId:randomUUID()},{sequence:5,pageBefore:6}]){
  const resolve=fixture(async()=>({kind:"ok",value:published}),async()=>({kind:"success",value:{...target,...change}}));
  assert.deepEqual(await resolve(caller,deliveryRef,()=>true),{kind:"failure",code:"AI_UNAVAILABLE"});
 }
});
