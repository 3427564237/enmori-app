import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { ApplicationConversationOperations } from "../../src/ai-conversation/application/application-conversation-operations.js";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { registerConversationRoutes } from "../../src/ai-conversation/transport/register-routes.js";
import type { ConversationCaller, ConversationOperations, ConversationResult, ConversationSummaryPage } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { ConversationOperationReaders } from "../../src/ai-conversation/ports/application-conversation-operations.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument, StoredDocumentSnapshot } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import type { IdentityVerificationResult } from "../../src/shared/ports/identity-verifier.js";

const id = (n:number):string => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const owner = id(1), foreign = id(2), principal = { firebaseUid:"synthetic-history-owner" };
const now = Date.UTC(2026,9,20), headers = { authorization:"Bearer synthetic-token" };
const profile = "synthetic-history-profile";
const environment = { ENMORI_ENVIRONMENT:"test",ENMORI_CONTROLLED_PROFILE_DIRECTORY:profile,
  APPDATA:profile,HOME:profile,USERPROFILE:profile,XDG_CONFIG_HOME:profile,GCLOUD_PROJECT:"demo-enmori-rmvp01a-r10",
  FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099" };
const good = <T>(value:T):ConversationResult<T> => ({kind:"success",value});
const unavailable = () => ({kind:"failure" as const,code:"AI_UNAVAILABLE" as const});
const summary = (n:number) => ({conversationId:id(n),lastMessageAt:"2026-10-20T00:00:00.000Z"});

function storeFixture(count=1,expired=0) {
  const records = new Map<string,StoredDocument>(), snapshots = new Map<string,readonly StoredDocumentSnapshot[]>();
  const reads:string[] = [], pages:{path:string;after:string|undefined;limit:number}[] = [];
  let live = true, stopAt:string|undefined;
  records.set(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`,{accountId:owner});
  records.set(`accounts/${owner}`,{username:"history_owner",optionalProcessingConsent:"accepted",checkInVisibility:"private",
    onboardingCompletedAt:"2026-10-20T00:00:00.000Z",purposeRevocationGeneration:0});
  for (let i=0;i<count;i++) {
    const root = `accounts/${owner}/conversations/${id(100+i)}`, messageId=id(1000+i);
    records.set(root,{state:"live",lifecycleVersion:1,nextSequence:2,latestMessageId:messageId});
    snapshots.set(`${root}/messages`,[{id:messageId,data:{role:"user",sequence:1,text:"private-message-canary"},
      createTime:{seconds:Math.floor(now/1000)-(i<expired?91*24*60*60:10),nanoseconds:0}}]);
  }
  // An unrelated owner's parent must never be discovered through a group scan.
  records.set(`accounts/${foreign}/conversations/${id(999)}`,{private:"foreign-canary"});
  const read = async <T>(path:string,value:T):Promise<T> => {
    reads.push(path); await Promise.resolve(); if (path===stopAt) live=false; return value;
  };
  const tx:FirestoreTransactionGateway = {
    get:path=>read(path,records.get(path)),list:path=>read(path,[]),
    listSnapshots:path=>read(path,snapshots.get(path)??[]),
    listPage:async(path,after,limit)=>{
      pages.push({path,after,limit});
      const values=[...records.entries()].filter(([key])=>key.startsWith(`${path}/`)&&!key.slice(path.length+1).includes("/"))
        .map(([key,data])=>({id:key.slice(path.length+1),data})).filter(row=>after===undefined||row.id>after)
        .sort((a,b)=>a.id<b.id?-1:1).slice(0,limit);
      return read(`page:${path}`,values);
    },
    create:()=>assert.fail("history cannot create"),set:()=>assert.fail("history cannot write"),delete:()=>assert.fail("history cannot delete"),
  };
  const gateway:FirestoreGateway={runTransaction:async(work,options)=>{assert.deepEqual(options,{maxAttempts:1});return work(tx);}};
  const store=new FirestoreConversationStore(gateway,environment,()=>now);
  const run=(after?:string,asOwner=owner)=>store.listOwnedConversations(principal,asOwner,after,()=>live);
  return {records,snapshots,reads,pages,run,stop:(path:string)=>{stopAt=path;},tx};
}

test("history reads only the authenticated owner's canonical parents and returns metadata without content",async()=>{
  const f=storeFixture(2),result=await f.run();
  assert.deepEqual(result,{kind:"confirmed",value:{conversations:[100,101].map(n=>({conversationId:id(n),lastMessageAt:new Date(now-10_000).toISOString()}))}});
  assert.deepEqual(f.pages,[{path:`accounts/${owner}/conversations`,after:undefined,limit:20}]);
  assert(!JSON.stringify(result).includes("private-message-canary"));assert(!JSON.stringify(result).includes("foreign-canary"));
  assert(!f.reads.some(path=>path.includes(foreign)));
});
test("twenty expired parents yield an empty continuing page and the next read reaches the live parent",async()=>{
  const f=storeFixture(21,20),first=await f.run();
  assert.deepEqual(first,{kind:"confirmed",value:{conversations:[],nextCursor:id(119)}});
  const second=await f.run(id(119));
  assert.deepEqual(second,{kind:"confirmed",value:{conversations:[{conversationId:id(120),lastMessageAt:new Date(now-10_000).toISOString()}]}});
  assert.equal(f.pages[1]?.after,id(119));
});
test("history denies another owner and revoked consent before querying parents",async()=>{
  const other=storeFixture();assert.deepEqual(await other.run(undefined,foreign),{kind:"denied"});assert.equal(other.pages.length,0);
  const declined=storeFixture();declined.records.set(`accounts/${owner}`,{...declined.records.get(`accounts/${owner}`),optionalProcessingConsent:"rejected"});
  assert.deepEqual(await declined.run(),{kind:"denied"});assert.equal(declined.pages.length,0);
});
test("corrupt retained inventory fails the entire page and does not masquerade as expiry",async()=>{
  const f=storeFixture(2);f.snapshots.set(`accounts/${owner}/conversations/${id(101)}/messages`,[]);
  assert.deepEqual(await f.run(),{kind:"unavailable"});
});
test("a current guard ending during the parent query blocks all following inventory dispatch",async()=>{
  const f=storeFixture();f.stop(`page:accounts/${owner}/conversations`);
  assert.deepEqual(await f.run(),{kind:"terminated"});assert(!f.reads.some(path=>path.endsWith("/messages")));
});
test("history refuses malformed cursors and missing bounded query support",async()=>{
  const invalid=storeFixture();assert.deepEqual(await invalid.run("../other-owner"),{kind:"unavailable"});assert.equal(invalid.pages.length,0);
  const missing=storeFixture();delete missing.tx.listPage;assert.deepEqual(await missing.run(),{kind:"unavailable"});
});

function applicationFixture(reader?:ConversationOperationReaders["listConversations"]) {
  let consent=true,auth:IdentityVerificationResult={kind:"verified",principal},instant=0,resolutions=0;
  let resolvedOwner=owner;
  const caller:ConversationCaller={principal,tokenInstance:"synthetic-history-token",verifyCurrentAuth:async()=>auth};
  const readers:ConversationOperationReaders=reader?{listConversations:reader}:{};
  const app=new ApplicationConversationOperations({resolve:async(_caller,purpose)=>{
    assert.equal(purpose,true);resolutions++;return consent?good({ownerId:resolvedOwner}):{kind:"failure",code:"AI_CONTEXT_NOT_PERMITTED"};
  }},{uuid:()=>id(999),operationKey:()=>"A".repeat(43)},
  {now:()=>instant,utcMilliseconds:()=>now,at:()=>()=>{}},
  {create:()=>assert.fail("history must not construct an AI operation")},readers);
  return {app,caller,readers,setConsent:(value:boolean)=>{consent=value;},setAuth:(value:IdentityVerificationResult)=>{auth=value;},
    setOwner:(value:string)=>{resolvedOwner=value;},expire:()=>{instant=15_000;},resolutions:()=>resolutions};
}
test("history ordinary read requires purpose and old suppliers fail unavailable",async()=>{
  const f=applicationFixture();assert.deepEqual(await f.app.listConversations(f.caller,undefined),unavailable());
  f.setConsent(false);assert.deepEqual(await f.app.listConversations(f.caller,undefined),{kind:"failure",code:"AI_CONTEXT_NOT_PERMITTED"});
  assert.deepEqual(await f.app.listConversations(f.caller,"not-a-uuid"),{kind:"failure",code:"REQUEST_INVALID"});
});
for (const changed of ["auth","consent","owner","deadline"] as const) {
  test(`history suppresses a successful storage page after late ${changed} change`,async()=>{
    const f=applicationFixture();f.readers.listConversations=async()=>{
      if(changed==="auth")f.setAuth({kind:"invalid"});
      if(changed==="consent")f.setConsent(false);
      if(changed==="owner")f.setOwner(foreign);
      if(changed==="deadline")f.expire();
      return good({conversations:[summary(100)]});
    };
    assert.deepEqual(await f.app.listConversations(f.caller,undefined),{kind:"failure",code:changed==="auth"?"AUTH_REQUIRED":
      changed==="consent"?"AI_CONTEXT_NOT_PERMITTED":changed==="owner"?"AUTH_FORBIDDEN":"AI_UNAVAILABLE"});
  });
}
test("history accepts an empty continuing page and rechecks authority after storage",async()=>{
  const f=applicationFixture(async()=>good({conversations:[],nextCursor:id(119)}));
  assert.deepEqual(await f.app.listConversations(f.caller,id(99)),good({conversations:[],nextCursor:id(119)}));assert.equal(f.resolutions(),2);
});
test("history rejects malformed inner order and display timestamps",async()=>{
  for(const page of [{conversations:[summary(101),summary(100)]},{conversations:[{...summary(100),lastMessageAt:"invalid"}]},
    {conversations:[summary(100)],nextCursor:id(99)}]) {
    const f=applicationFixture(async()=>good(page));assert.deepEqual(await f.app.listConversations(f.caller,undefined),unavailable());
  }
});

async function transportFixture(page?:ConversationSummaryPage) {
  const app=Fastify();app.decorateRequest("authPrincipal",null);
  const operations:ConversationOperations={prepare:async()=>unavailable(),execute:async()=>unavailable(),cancel:async()=>unavailable(),
    readOutcome:async()=>unavailable(),listMessages:async()=>unavailable(),deleteConversation:async()=>unavailable(),
    ...(page?{listConversations:async()=>good(page)}:{})};
  await registerConversationRoutes(app,{verifyIdToken:async()=>({kind:"verified",principal})},operations);
  return app;
}
test("history transport authenticates, rejects extra/control parameters, and preserves old-supplier failure",async t=>{
  const app=await transportFixture();t.after(()=>app.close());
  assert.equal((await app.inject({method:"GET",url:"/v1/me/conversations"})).statusCode,401);
  for(const suffix of ["?after=invalid","?after=x&after=y","?ownerId=other","?limit=500"]) {
    assert.equal((await app.inject({method:"GET",url:`/v1/me/conversations${suffix}`,headers})).statusCode,400);
  }
  assert.equal((await app.inject({method:"GET",url:"/v1/me/conversations",headers:{...headers,"ai-operation-key":"A".repeat(43)}})).statusCode,400);
  assert.equal((await app.inject({method:"GET",url:"/v1/me/conversations",headers})).statusCode,503);
});
test("history transport emits only selected metadata and permits empty-page continuation",async t=>{
  const app=await transportFixture({conversations:[{...summary(100),...{text:"private-canary"}}],nextCursor:id(119)});t.after(()=>app.close());
  const response=await app.inject({method:"GET",url:`/v1/me/conversations?after=${id(99)}`,headers});
  assert.equal(response.statusCode,200);assert.deepEqual(response.json(),{conversations:[summary(100)],nextCursor:id(119)});
  assert.equal(response.headers["cache-control"],"no-store");
  const empty=await transportFixture({conversations:[],nextCursor:id(119)});t.after(()=>empty.close());
  assert.deepEqual((await empty.inject({method:"GET",url:"/v1/me/conversations",headers})).json(),{conversations:[],nextCursor:id(119)});
  assert.equal((await empty.inject({method:"HEAD",url:"/v1/me/conversations",headers})).statusCode,404);
});
