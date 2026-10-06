import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ok, err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirestoreFriendRepository, friendPairKey } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { FriendRequests } from "../src/friends/application/friend-requests.js";
import { FirestoreEventDetailRepository, parseEventDetail } from "../src/event-detail/infrastructure/firestore-event-detail-repository.js";
import { GetEventDetail } from "../src/event-detail/application/get-event-detail.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { targetSchema, eventDetailSchema, friendInboxSchema, friendActionSchema } from "../src/transport/register-isolated-slices.js";

test("Event Detail keeps calendar-exact UTC and nanosecond ordering without recommendation Infrastructure", () => {
  const record = {title:"Synthetic",startAt:"2026-10-06T00:00:00.000000001Z",endAt:"2026-10-06T00:00:00.000000002Z",externalSourceUrl:"https://example.invalid/synthetic-event",available:true,validUntil:"2026-10-07T00:00:00Z"};
  const urls = [record.externalSourceUrl], now = BigInt(new Date("2026-10-05T00:00:00Z").getTime()) * 1000000n;
  assert.notEqual(parseEventDetail("ev",record,urls,now),undefined);
  for (const field of ["startAt","endAt","validUntil"] as const) {
    for (const invalid of ["2026-02-30T00:00:00Z","2026-10-06T00:00:00.1234567890Z","2026-10-06T00:00:00+00:00"]) {
      assert.equal(parseEventDetail("ev",{...record,[field]:invalid},urls,now),undefined);
    }
  }
  assert.equal(parseEventDetail("ev",{...record,endAt:record.startAt},urls,now),undefined);
  assert.equal(parseEventDetail("ev",{...record,endAt:"2026-10-06T00:00:00.000000000Z"},urls,now),undefined);
});

const instant = "2026-10-05T00:00:00.000Z", sourceUrl = "https://example.invalid/synthetic-event";
const base = { optionalProcessingConsent:"rejected", checkInVisibility:"private", onboardingCompletedAt:instant, profileVisibility:"private",profileRevision:1 };
const seed = () => Object.fromEntries([
  ...["a","b","c"].flatMap(id => [
    [`auth_bindings/${createAuthBindingDocumentId(id)!}`,{accountId:id}],
    [`accounts/${id}`,{...base,username:`member_${id}`,displayName:`Member ${id}`}],
    [`username_reservations/member_${id}`,{accountId:id}],
    [`friend_access/${id}`,{eligibilityState:"eligible"}],
  ] as const),
  [`friend_pairs/${friendPairKey("a","b")}`,{accountIds:["a","b"],blockedByAccountIds:[],friendship:false,pending:null}],
]);
const detail = {title:"Synthetic event",startAt:"2026-10-06T00:00:00.000000001Z",externalSourceUrl:sourceUrl,available:true,validUntil:"2026-10-07T00:00:00.000Z"};
function fixture() {
  let date = new Date(instant);
  const clock = {now:()=>ok(new Date(date))};
  const gateway = new InMemoryFirestoreGateway(seed());
  const repo = new FirestoreFriendRepository(gateway,clock);
  return {gateway,repo,app:new FriendRequests(repo,clock),clock,setTime:(value:string)=>{date=new Date(value);}};
}
async function reference(f: ReturnType<typeof fixture>): Promise<string> {
  const inbox = await f.repo.inbox("b"); assert.equal(inbox.ok,true); if(!inbox.ok) assert.fail();
  return inbox.value.requests[0]!.requestRef;
}

test("exact lookup is read-only, minimized, canonicalized and strict; missing authority is protected",async()=>{
  const f=fixture(),before=f.gateway.entries();
  assert.deepEqual(await f.app.lookup({firebaseUid:"a"}," MEMBER_B "),ok({username:"member_b",displayName:"Member b",relationshipState:"can_send_request"}));
  assert.deepEqual(f.gateway.entries(),before);
  for(const username of ["member","member_z","member_c"]) assert.deepEqual(await f.app.lookup({firebaseUid:"a"},username),err(appFailure("ADD_FRIEND_TARGET_UNAVAILABLE")));
  assert.deepEqual(await f.app.lookup({firebaseUid:"a"},"\tmember_b"),err(appFailure("USERNAME_INVALID")));
  await f.gateway.runTransaction(async tx => tx.set("accounts/b",{...base,username:"member_b",displayName:null}));
  assert.equal((await f.app.lookup({firebaseUid:"a"},"member_b")).ok,false);
});
test("send does not duplicate/cross-accept; recipient alone accepts once; fresh lookup confirms friendship",async()=>{
  const f=fixture(); await f.repo.lookup("a","member_b",true); const ref=await reference(f);
  for(let i=0;i<3;i++) { const sent=await f.repo.lookup("a","member_b",true); assert.equal(sent.ok,true); }
  const reverse=await f.repo.lookup("b","member_a",true); if(!reverse.ok) assert.fail(); assert.equal(reverse.value.relationshipState,"incoming_request_pending");
  assert.equal(await reference(f),ref);
  assert.deepEqual(await f.repo.act("a",ref,"accept"),err("request_unavailable"));
  assert.deepEqual(await f.repo.act("c",ref,"accept"),err("request_unavailable"));
  assert.deepEqual(await f.repo.act("b",ref,"accept"),ok({result:"accepted"}));
  assert.deepEqual(await f.repo.act("b",ref,"accept"),err("request_unavailable"));
  assert.deepEqual(await f.repo.lookup("a","member_b",false),ok({username:"member_b",displayName:"Member b",relationshipState:"already_friends"}));
  assert.deepEqual(await f.repo.inbox("b"),ok({requests:[],nextCursor:null}));
});
test("decline permits a new reference; stale reference never acts on replacement",async()=>{
  const f=fixture(); await f.repo.lookup("a","member_b",true); const old=await reference(f);
  assert.deepEqual(await f.repo.act("b",old,"decline"),ok({result:"declined"}));
  await f.repo.lookup("a","member_b",true); const fresh=await reference(f); assert.notEqual(old,fresh);
  assert.deepEqual(await f.repo.act("b",old,"accept"),err("request_unavailable")); assert.equal(await reference(f),fresh);
});
test("30-day expiry is enforced on read without writes and exactly at action boundary",async()=>{
  const f=fixture(); await f.repo.lookup("a","member_b",true); const ref=await reference(f);
  f.setTime("2026-11-03T23:59:59.999Z"); assert.equal(await reference(f),ref);
  f.setTime("2026-11-04T00:00:00.000Z"); const before=f.gateway.entries();
  assert.deepEqual(await f.repo.inbox("b"),ok({requests:[],nextCursor:null})); assert.deepEqual(f.gateway.entries(),before);
  assert.deepEqual(await f.repo.act("b",ref,"accept"),err("request_unavailable"));
  await f.repo.lookup("a","member_b",true); assert.notEqual(await reference(f),ref);
});
test("either-direction block consumes pending; unblock does not revive; temporary ineligibility retains it",async()=>{
  const f=fixture(); await f.repo.lookup("a","member_b",true); const ref=await reference(f);
  await f.repo.setFixtureProtection("a","b",{blockedByAccountIds:["b"]});
  assert.deepEqual(await f.repo.act("b",ref,"accept"),err("request_unavailable"));
  assert.deepEqual(await f.repo.lookup("a","member_b",false),err("target_unavailable"));
  await f.repo.setFixtureProtection("a","b",{blockedByAccountIds:[]}); assert.deepEqual(await f.repo.inbox("b"),ok({requests:[],nextCursor:null}));
  await f.repo.lookup("a","member_b",true); const fresh=await reference(f);
  await f.repo.setFixtureProtection("a","b",{temporaryAccountId:"a"});
  assert.deepEqual(await f.repo.act("b",fresh,"accept"),err("request_unavailable"));
  assert.notEqual(f.gateway.read(`friend_pairs/${friendPairKey("a","b")}`)!.pending,null);
  await f.repo.setFixtureProtection("a","b",{permanentlyDeletedAccountId:"a"});
  assert.equal(f.gateway.read(`friend_pairs/${friendPairKey("a","b")}`)!.pending,null);
});
test("bounded filtered pages keep continuation; no terminal history or broad unbounded list",async()=>{
  const f=fixture(); const refs=Array.from({length:21},()=>randomUUID()).sort();
  await f.gateway.runTransaction(async tx => { for(const ref of refs) tx.create(`friend_inboxes/b/requests/${ref}`,{pairKey:friendPairKey("a","b")}); });
  const page=await f.repo.inbox("b");if(!page.ok) assert.fail();assert.deepEqual(page.value.requests,[]);assert.notEqual(page.value.nextCursor,null);
  const last=await f.repo.inbox("b",page.value.nextCursor!);assert.deepEqual(last,ok({requests:[],nextCursor:null}));
});
test("requester limits use uniform protected errors, reset and respect requester authorization",async()=>{
  for(const send of [false,true]) {
    const f=fixture();for(let i=0;i<(send?10:30);i++) assert.equal((await f.app.lookup({firebaseUid:"a"},"member_b",send)).ok,true);
    assert.deepEqual(await f.app.lookup({firebaseUid:"a"},"member_b",send),err(appFailure("ADD_FRIEND_TARGET_UNAVAILABLE")));
    f.setTime("2026-10-05T00:01:00.000Z");assert.equal((await f.app.lookup({firebaseUid:"a"},"member_b",send)).ok,true);
    await f.repo.setFixtureProtection("a","b",{temporaryAccountId:"a"});assert.deepEqual(await f.app.lookup({firebaseUid:"a"},"member_b",send),err(appFailure("AUTH_FORBIDDEN")));
  }
});
test("failed dependencies never become successful empty requests or events",async()=>{
  const f=fixture(),bad=new FailingFirestoreGateway();
  assert.deepEqual(await new FirestoreFriendRepository(bad,f.clock).inbox("a"),err("dependency_unavailable"));
  assert.deepEqual(await new FirestoreEventDetailRepository(bad,f.clock,[sourceUrl]).read("a","ev"),err("dependency_unavailable"));
});
for(const [label,change] of Object.entries({end_before_start:{endAt:instant},null_end:{endAt:null},unapproved_link:{externalSourceUrl:"https://example.invalid/other"},unsafe_link:{externalSourceUrl:"http://example.invalid/synthetic-event"},title_limit:{title:"x".repeat(201)},unknown_field:{providerPayload:{}},removed:{available:false},expired:{validUntil:instant},bad_time:{startAt:"2026-02-30T00:00:00Z"},location_limit:{locationLabel:"x".repeat(201)}})) {
  test(`Event Detail rejects ${label} without widening recommendations`,()=>assert.equal(parseEventDetail("ev",{...detail,...change},[sourceUrl],BigInt(new Date(instant).getTime())*1000000n),undefined));
}
test("Event Detail supports omitted end, preserves nanosecond source time and scalar text limits",async()=>{
  const f=fixture(); await f.gateway.runTransaction(async tx=>tx.create("event_details/ev",{...detail,title:"😀".repeat(200)}));
  const result=await new FirestoreEventDetailRepository(f.gateway,f.clock,[sourceUrl]).read("a","ev"); if(!result.ok) assert.fail();
  assert.equal(result.value.startAt,detail.startAt);assert.equal(Object.hasOwn(result.value,"endAt"),false); assert.equal(Object.hasOwn(result.value,"available"),false);
});
const environment={ENMORI_ENVIRONMENT:"test",ENMORI_CONTROLLED_PROFILE_DIRECTORY:"/tmp/isolated-slices-test",HOME:"/tmp/isolated-slices-test",USERPROFILE:"/tmp/isolated-slices-test",APPDATA:"/tmp/isolated-slices-test",XDG_CONFIG_HOME:"/tmp/isolated-slices-test",GCLOUD_PROJECT:"demo-enmori-rmvp01a-r10",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"};
const unavailable={execute:async()=>err(appFailure("SERVICE_UNAVAILABLE"))};
function dependencies() { return {identityVerifier:{verifyIdToken:async(token:string)=>token==="invalid" ? {kind:"invalid" as const} : {kind:"verified" as const,principal:{firebaseUid:token}}},completeOnboarding:unavailable,getOnboarding:unavailable,createCheckIn:unavailable,getCheckIn:unavailable,getInterestTags:unavailable,getOwnInterests:unavailable,replaceOwnInterests:unavailable}; }
test("isolated routes require explicit safe composition; ordinary build has none",async()=>{
  const plain=await buildApp(dependencies());try{assert.equal((await plain.inject({url:"/v1/events/ev"})).statusCode,404);}finally{await plain.close();}
  await assert.rejects(buildApp({...dependencies(),isolatedSlices:{environment:{...environment,ENMORI_ENVIRONMENT:"controlled-demo"}}}));
});
test("Transport requires auth, strict inputs, rejects action bodies and hides internal/protected data",async()=>{
  const f=fixture();await f.gateway.runTransaction(async tx=>tx.create("event_details/ev",detail));
  const app=await buildApp({...dependencies(),isolatedSlices:{environment,friends:f.app,eventDetail:new GetEventDetail(new FirestoreEventDetailRepository(f.gateway,f.clock,[sourceUrl]))}});
  try {
    const headers={authorization:"Bearer a"};
    assert.equal((await app.inject({method:"POST",url:"/v1/friends/lookup",payload:{username:"member_b"}})).statusCode,401);
    for(const payload of [{username:"member_b",owner:"b"},{username:42},{}]) assert.equal((await app.inject({method:"POST",url:"/v1/friends/lookup",headers,payload})).statusCode,400);
    const lookup=await app.inject({method:"POST",url:"/v1/friends/lookup",headers,payload:{username:"member_b"}});assert.equal(lookup.statusCode,200);assert.deepEqual(lookup.json(),{target:{username:"member_b",displayName:"Member b",relationshipState:"can_send_request"}});
    assert.equal((await app.inject({url:"/v1/me/friend-requests?cursor=bad",headers})).statusCode,400);
    assert.equal((await app.inject({method:"POST",url:`/v1/friend-requests/${randomUUID()}/accept`,headers,payload:{owner:"b"}})).statusCode,400);
    assert.equal((await app.inject({url:"/v1/events/ev?owner=b",headers})).statusCode,400);
    const event=await app.inject({url:"/v1/events/ev",headers});assert.equal(event.statusCode,200);assert.equal(event.json().event.eventId,"ev");assert.equal(Object.hasOwn(event.json().event,"validUntil"),false);
  } finally {await app.close();}
});
test("normative isolated schemas match Transport and describe the restricted activation",async()=>{
 const api=JSON.parse(await readFile("api/openapi.json","utf8"));
 for(const [name,schema] of Object.entries({FriendTarget:targetSchema,EventDetail:eventDetailSchema,FriendInbox:friendInboxSchema,FriendAction:friendActionSchema})) assert.deepEqual(api.components.schemas[name],schema);
 for(const path of ["/v1/friends/lookup","/v1/friend-requests","/v1/me/friend-requests","/v1/friend-requests/{requestRef}/accept","/v1/friend-requests/{requestRef}/decline","/v1/events/{eventId}"]) for(const operation of Object.values(api.paths[path]) as Record<string,unknown>[]) assert.equal(operation["x-enmori-environment"],"isolated-emulator");
});
