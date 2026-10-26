import assert from "node:assert/strict";
import test from "node:test";
import { currentReplyDay } from "../../src/ai-conversation/application/today-reply-selection.js";
import { SelectedReplyReader } from "../../src/ai-conversation/application/selected-reply-reader.js";
import { FirestoreSelectedReplyReader } from "../../src/ai-conversation/infrastructure/firestore-selected-reply-reader.js";
import type { AcceptedContextRead } from "../../src/ai-conversation/ports/real-context-reader.js";
import type { SelectedReplyGrant, SelectedReplySnapshot } from "../../src/ai-conversation/ports/selected-reply.js";
import type { FirestoreGateway, FirestoreTransactionGateway } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { MetadataFirestoreGateway } from "../support/metadata-firestore-gateway.js";

const now=Date.UTC(2026,9,25,10),owner="today-owner",principal={firebaseUid:"synthetic-today"};
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const profile="synthetic-today-profile",environment={ENMORI_ENVIRONMENT:"test",ENMORI_CONTROLLED_PROFILE_DIRECTORY:profile,APPDATA:profile,HOME:profile,
  USERPROFILE:profile,XDG_CONFIG_HOME:profile,GCLOUD_PROJECT:"demo-enmori-rmvp01a-r10",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099"};
function fixture(transform:(tx:FirestoreTransactionGateway)=>FirestoreTransactionGateway=tx=>tx){
  const g=new MetadataFirestoreGateway(now),paths:string[]=[];
  g.onRead=p=>paths.push(p);
  g.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`,{accountId:owner});
  g.put(`accounts/${owner}`,{username:"today_owner",optionalProcessingConsent:"accepted",checkInVisibility:"private",onboardingCompletedAt:new Date(now).toISOString(),purposeRevocationGeneration:0});
  g.put(`accounts/${owner}/persona_state/current`,{stateRevision:0,livePersonaIds:[]});
  const gateway:FirestoreGateway={runTransaction:(work,options)=>g.runTransaction(tx=>work(transform(tx)),options)};
  const context:AcceptedContextRead={principal,ownerId:owner,session:{},originalRequest:{},acceptedAt:0,deadline:60000,
    asOf:{seconds:now/1000,nanoseconds:0},signal:new AbortController().signal};
  const adapter=new FirestoreSelectedReplyReader(gateway,environment,{verifyRead:async()=>({kind:"read",value:principal}),currentRead:c=>c===context},()=>g.now);
  const ordinary={principal,ownerId:owner,signal:context.signal,deadline:15000,current:()=>true};
  const put=(key:string,createdAt:number,subject=owner)=>g.put(`check_ins/${key}`,{ownerAccountId:subject,note:`quoted-${key}`,mood:"calm",activity:"walking",
    locationLabel:"location-canary",weather:{label:"weather-canary"},createdAt:new Date(createdAt).toISOString(),revision:1},Math.min(createdAt,now));
  const prepare=(timeZone="Asia/Singapore")=>adapter.prepare(ordinary,{processing:"local",today:{timeZone}});
  const grant=(snapshot:SelectedReplySnapshot):SelectedReplyGrant=>({...snapshot,selectionRevision:id(1),sources:snapshot.sources.map((s,i)=>({...s,selectionKey:id(10+i)})),
    historyPairs:[],includedKeys:snapshot.sources.map((_,i)=>id(10+i)),excludedKeys:[],excludedHistoryKeys:[]});
  const reader=(selection:SelectedReplyGrant)=>new SelectedReplyReader(context,selection,adapter,()=>0,()=>true,()=>{});
  return {g,adapter,context,ordinary,paths,put,prepare,grant,reader};
}
async function snapshot(f:ReturnType<typeof fixture>,zone?:string){
  const result=await f.prepare(zone);assert.equal(result.kind,"success");if(result.kind!=="success")throw Error("Expected fresh today sources");return result.value;
}

test("today uses the server civil day, excludes other owners, yesterday, future and next midnight",async()=>{
  const f=fixture(),day=currentReplyDay("Asia/Singapore",now)!;
  f.put("start",Date.parse(day.startUtc));f.put("latest",now);f.put("yesterday",Date.parse(day.startUtc)-1);
  f.put("future",now+1);f.put("next-day",Date.parse(day.endUtc!));f.put("foreign",now,"another-owner");
  const selected=await snapshot(f);
  assert.deepEqual(selected.today,{date:"2026-10-25",timeZone:"Asia/Singapore",limit:5,hasMore:false});
  assert.deepEqual(selected.sources.map(s=>s.checkInId),["latest","start"]);
  assert.equal(f.g.calls,1);assert.equal(f.g.writes,0);
  assert.deepEqual(f.paths.filter(p=>p.startsWith("check_ins/")),["check_ins/latest","check_ins/start"]);
});

test("latest five use ID descending ties, report only hasMore, and never read sentinel source content",async()=>{
  const f=fixture();for(const key of ["a","b","c","d","e","f","g"])f.put(key,now-1000);
  const selected=await snapshot(f);assert.equal(selected.today?.hasMore,true);
  assert.deepEqual(selected.sources.map(s=>s.checkInId),["g","f","e","d","c"]);
  assert(!f.paths.includes("check_ins/b"));assert(!f.paths.includes("check_ins/a"));
  const read=f.reader(f.grant(selected));assert.equal(await read.prepare(),"ready");
  const model=JSON.stringify(read.modelContext());
  for(const canary of ["checkInId","observedAt","version","timeZone","Asia/Singapore","location-canary","weather-canary",'"today"'])assert(!model.includes(canary),canary);
  assert.deepEqual(read.modelContext()!.checkIns.map(s=>s.noteText),["quoted-g","quoted-f","quoted-e","quoted-d","quoted-c"]);
});

test("exclusion wins, does not reread the deleted excluded record and does not insert the sixth",async()=>{
  const f=fixture();for(const key of ["a","b","c","d","e","f"])f.put(key,now-1000);
  const selected=await snapshot(f),grant=f.grant(selected);f.g.rows.delete("check_ins/f");f.paths.length=0;
  const read=f.reader({...grant,excludedKeys:[grant.sources[0]!.selectionKey]});assert.equal(await read.prepare(),"ready");
  assert.deepEqual(read.modelContext()!.checkIns.map(s=>s.noteText),["quoted-e","quoted-d","quoted-c","quoted-b"]);
  assert(!f.paths.includes("check_ins/f"));assert(!f.paths.includes("check_ins/a"));
});

test("an empty day is a valid selected reply; missing/failed capability is unavailable rather than empty",async()=>{
  const f=fixture(),selected=await snapshot(f);assert.deepEqual(selected.sources,[]);assert.equal(selected.today?.hasMore,false);
  const read=f.reader(f.grant(selected));assert.equal(await read.prepare(),"ready");assert.deepEqual(read.modelContext()!.checkIns,[]);
  for(const transform of [(tx:FirestoreTransactionGateway)=>{const {listOwnCheckInDayPage:_,...other}=tx;return other;},
    (tx:FirestoreTransactionGateway)=>({...tx,listOwnCheckInDayPage:async()=>{throw Error("private service failure");}})]){
    const failed=fixture(transform);assert.deepEqual(await failed.prepare(),{kind:"failure",code:"AI_UNAVAILABLE"});assert.equal(failed.g.writes,0);
  }
});

test("day intervals reuse DST boundaries and reject offsets, abbreviations and invalid zones",async()=>{
  const spring=currentReplyDay("America/New_York",Date.UTC(2026,2,8,12))!,fall=currentReplyDay("America/New_York",Date.UTC(2026,10,1,12))!;
  assert.equal(Date.parse(spring.endUtc!)-Date.parse(spring.startUtc),23*3600000);
  assert.equal(Date.parse(fall.endUtc!)-Date.parse(fall.startUtc),25*3600000);
  for(const timeZone of ["+08:00","EST","CET","Invalid/Zone",""]){
    assert.equal(currentReplyDay(timeZone,now),undefined);
    assert.deepEqual(await fixture().prepare(timeZone),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
  }
});

test("crossing midnight before acceptance conflicts; actual source edits/deletion keep version failure semantics",async()=>{
  const f=fixture();f.put("one",now-1000);const selected=await snapshot(f);
  const midnight=Date.parse(currentReplyDay("Asia/Singapore",now)!.endUtc!);f.g.now=midnight;
  const later:AcceptedContextRead={...f.context,asOf:{seconds:midnight/1000,nanoseconds:0}};
  const adapter=new FirestoreSelectedReplyReader(f.g,environment,{verifyRead:async()=>({kind:"read",value:principal}),currentRead:c=>c===later},()=>f.g.now);
  assert.deepEqual(await adapter.read(later,f.grant(selected)),{kind:"selection_conflict"});
  for(const change of ["edit","delete","withdraw"]){
    const current=fixture();current.put("one",now-1000);const selection=current.grant(await snapshot(current));current.g.now+=1000;
    if(change==="delete")current.g.rows.delete("check_ins/one");
    else if(change==="withdraw")current.g.put(`accounts/${owner}`,{...current.g.rows.get(`accounts/${owner}`)!.data,optionalProcessingConsent:"rejected"});
    else current.g.put("check_ins/one",{...current.g.rows.get("check_ins/one")!.data,note:"updated",revision:2});
    assert.deepEqual(await current.adapter.read(current.context,selection),{kind:change==="delete"?"source_unavailable":change==="withdraw"?"denied":"changed"});
  }
});

test("a civil-day change during preparation is an explicit conflict, not an empty day",async()=>{
  const f=fixture(),end=Date.parse(currentReplyDay("Asia/Singapore",now)!.endUtc!);
  f.g.now=end-1000;
  f.g.onRead=path=>{if(path==="check_ins:own-day")f.g.now=end;};
  assert.deepEqual(await f.prepare(),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
  assert.equal(f.g.writes,0);
});

test("invalid query order, owner, range and mixed selectors fail closed",async()=>{
  for(const mutation of ["order","owner","range","duplicate","oversize"]){
    const f=fixture(tx=>({...tx,listOwnCheckInDayPage:async input=>{
      const rows=[...(await tx.listOwnCheckInDayPage!(input))];
      if(mutation==="order")rows.reverse();
      if(mutation==="owner")rows[0]={...rows[0]!,data:{...rows[0]!.data,ownerAccountId:"foreign"}};
      if(mutation==="range")rows[0]={...rows[0]!,data:{...rows[0]!.data,createdAt:new Date(now+1).toISOString()}};
      if(mutation==="duplicate")rows.push(rows[0]!);
      if(mutation==="oversize")while(rows.length<7)rows.push({...rows[0]!,id:`extra-${rows.length}`});
      return rows;
    }}));f.put("a",now-1000);f.put("b",now-2000);
    assert.deepEqual(await f.prepare(),{kind:"failure",code:"AI_UNAVAILABLE"},mutation);
  }
  const f=fixture();assert.deepEqual(await f.adapter.prepare(f.ordinary,{processing:"local",today:{timeZone:"UTC"},sources:[]}),{kind:"failure",code:"AI_CONTEXT_SELECTION_CONFLICT"});
});
