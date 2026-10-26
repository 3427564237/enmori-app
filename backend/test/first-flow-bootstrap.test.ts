import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { Auth, UserRecord } from "firebase-admin/auth";
import type { FirestoreConversationStore } from "../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { LocalModelLane } from "../src/ai-runtime/infrastructure/local-model-lane.js";
import { createFirstFlowComposition } from "../src/bootstrap/first-flow-composition.js";

const profile="/tmp/enmori-first-flow-unit";
const environment={ENMORI_ENVIRONMENT:"test",ENMORI_CONTROLLED_PROFILE_DIRECTORY:profile,HOME:profile,APPDATA:profile,USERPROFILE:profile,XDG_CONFIG_HOME:profile,GCLOUD_PROJECT:"demo-enmori-first-flow",GOOGLE_CLOUD_PROJECT:"demo-enmori-first-flow",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:19099",FIRESTORE_EMULATOR_HOST:"127.0.0.1:18180"};
function fixture(auth:Pick<Auth,"getUser">={getUser:async()=>{throw Error("not called");}}){
 let transactions=0,modelCalls=0;
 const gateway={runTransaction:async<T>(_work:unknown):Promise<T>=>{transactions++;throw Error("No source fixture");}};
 const lane=new LocalModelLane("qwen3.5:9b",async()=>{modelCalls++;throw Error("No model calls permitted");});
 const options={environment,configuration:{ownerAccountId:randomUUID(),firebaseUid:"synthetic-fixed-owner"},conversation:{gateway,store:{} as FirestoreConversationStore},lane,auth,healthy:()=>true};
 return{options,counts:()=>({transactions,modelCalls})};
}
test("first-flow factory does no network, worker, credential or store work without an explicit window",async()=>{
 const f=fixture(),composition=createFirstFlowComposition(f.options);composition.start();
 assert.deepEqual(f.counts(),{transactions:0,modelCalls:0});assert.equal(composition.accepting(),true);
 await composition.stop();assert.equal(composition.accepting(),false);assert.deepEqual(f.counts(),{transactions:0,modelCalls:0});
});
test("first-flow factory rejects unapproved models, unbounded workers and push on emulator before IO",()=>{
 const f=fixture();
 assert.throws(()=>createFirstFlowComposition({...f.options,lane:new LocalModelLane("unapproved")}),/AI_CONFIGURATION_INVALID/);
 assert.throws(()=>createFirstFlowComposition({...f.options,configuration:{...f.options.configuration,worker:{endsAtMs:Date.now()+31*60000}}}),/worker window/);
 assert.throws(()=>createFirstFlowComposition({...f.options,configuration:{...f.options.configuration,push:{installationRef:randomUUID(),leaseExpiresAt:new Date(Date.now()+60000).toISOString()}}}),/bounded push/);
 assert.deepEqual(f.counts(),{transactions:0,modelCalls:0});
});
test("fixed-owner worker disabled Auth and delayed shutdown cannot reach Firestore or model",async()=>{
 let finish!:(value:UserRecord)=>void,asked!:(uid:string)=>void;
 const requested=new Promise<string>(resolve=>{asked=resolve;});
 const result=new Promise<UserRecord>(resolve=>{finish=resolve;});
 const f=fixture({getUser:async uid=>{asked(uid);return result;}});
 const composition=createFirstFlowComposition({...f.options,configuration:{...f.options.configuration,worker:{endsAtMs:Date.now()+60000}}});
 composition.start();assert.equal(await requested,"synthetic-fixed-owner");
 const closing=composition.stop();finish({uid:"synthetic-fixed-owner",disabled:true} as UserRecord);await closing;
 assert.equal(composition.accepting(),false);assert.deepEqual(f.counts(),{transactions:0,modelCalls:0});
});
