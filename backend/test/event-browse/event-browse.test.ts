import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import {browseId,decodeBrowseId,projectOccurrence,sourceUrl} from "../../src/event-browse/domain/browse-values.js";
import {TicketmasterBrowseSource} from "../../src/event-browse/infrastructure/ticketmaster-browse-source.js";
import {EventBrowse} from "../../src/event-browse/application/event-browse.js";
import {registerEventBrowseRoutes} from "../../src/event-browse/transport/register-routes.js";
import {ok,err} from "../../src/shared/domain/result.js";
import {appFailure} from "../../src/shared/application/app-failure.js";
import {dependencyUnavailable} from "../../src/shared/ports/dependency-failure.js";
const now="2026-10-15T00:00:00Z",id="Synthetic_01",locator=browseId(id)!;
const row=(change:Record<string,unknown>={})=>({id,name:"Synthetic concert",url:"https://ticketmaster.sg/event/synthetic",
  dates:{start:{dateTime:"2026-10-16T10:00:00+08:00"},status:{code:"onsale"}},_embedded:{venues:[{country:{countryCode:"SG"},name:"Synthetic venue"}]},...change});
test("canonical occurrence identity rejects repair, malformed/padded/oversize and substitutes",()=>{
  assert.equal(decodeBrowseId(locator),id);assert.equal(browseId("a".repeat(128))!.length,174);
  for(const v of [locator+"=",locator+"x","tm_A","tm_", "tm_"+"A".repeat(172),"other_"+locator])assert.equal(decodeBrowseId(v),undefined);
  for(const id of ["","../x","a/b","é","a".repeat(129)])assert.equal(browseId(id),undefined);
});
test("source-backed missing end stays absent and precise offset conversion has no rounding",()=>{
  const v=projectOccurrence(row(),now)!;assert.equal(v.startAt,"2026-10-16T02:00:00Z");assert.equal(Object.hasOwn(v,"endAt"),false);
  const precise=projectOccurrence(row({dates:{start:{dateTime:"2026-10-16T10:00:00.123456789+08:00"},end:{dateTime:"2026-10-16T10:00:00.123456790+08:00"},status:{code:"onsale"}}}),now)!;
  assert.equal(precise.endAt,"2026-10-16T02:00:00.12345679Z");
  assert.equal(Object.hasOwn(v,"interestTagIds"),false);assert.equal(Object.hasOwn(v,"active"),false);
});
test("unsafe URL, invalid Unicode, uncertain/nonfuture/nonSG/cancelled and invalid optional end refuse occurrence",()=>{
  for(const url of ["http://ticketmaster.sg/x","https://ticketmaster.sg.evil/x","https://x@ticketmaster.sg/x","https://ticketmaster.sg/x#","https://ticketmaster.sg:444/x","https://ticketmaster.sg/x?apikey=synthetic","https://ticketmaster.sg/\n"]){assert.equal(sourceUrl(url),false);assert.equal(projectOccurrence(row({url}),now),undefined);}
  for(const name of [" ","\ud800","a\u202e","<b>title</b>","x".repeat(201)])assert.equal(projectOccurrence(row({name}),now),undefined);
  for(const dateTime of ["2026-10-16","2026-10-16T10:00:00","2026-02-30T10:00:00Z",now])assert.equal(projectOccurrence(row({dates:{start:{dateTime},status:{code:"onsale"}}}),now),undefined);
  assert.equal(projectOccurrence(row({dates:{start:{dateTime:"2026-10-16T00:00:00Z",timeTBA:true},status:{code:"onsale"}}}),now),undefined);
  assert.equal(projectOccurrence(row({_embedded:{venues:[{country:{countryCode:"US"}}]}}),now),undefined);
  assert.equal(projectOccurrence(row({dates:{start:{dateTime:"2026-10-16T00:00:00Z"},end:{dateTime:"2026-10-15T00:00:00Z"},status:{code:"onsale"}}}),now),undefined);
});
test("one server-owned SG first batch call minimizes without pagination/recommendation mutation",async()=>{
  const calls:URL[]=[];
  const fetcher:typeof fetch=async(input,options)=>{calls.push(new URL(String(input)));assert.equal(options?.redirect,"error");return Response.json({page:{number:0,totalElements:83},_embedded:{events:[row(),row({id:"other",name:"\ud800"})]}});};
  const source=new TicketmasterBrowseSource({key:()=>"synthetic-only",enabled:()=>true},fetcher);
  const app=new EventBrowse({verify:async()=>ok(undefined)},source,()=>new Date(now));
  const result=await app.read({firebaseUid:"synthetic"},undefined,new AbortController().signal);assert.equal(result.ok,true);if(!result.ok)return;
  assert.ok("items"in result.value);assert.equal(result.value.items.length,1);assert.equal(Object.hasOwn(result.value.items[0]! ,"externalSourceUrl"),false);
  assert.equal(calls.length,1);assert.equal(calls[0]!.searchParams.get("size"),"20");assert.equal(calls[0]!.searchParams.get("page"),"0");assert.equal(calls[0]!.searchParams.get("countryCode"),"SG");
});
test("onboarding denial and inactive configuration never access provider; errors hide raw data",async()=>{
  let calls=0;const http:typeof fetch=async()=>{calls++;throw new Error("private vendor key/payload");};
  const source=new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},http);
  const denied=new EventBrowse({verify:async()=>err(appFailure("ONBOARDING_REQUIRED"))},source,()=>new Date(now));
  const result=await denied.read({firebaseUid:"synthetic"},undefined,new AbortController().signal);assert.equal(result.ok,false);assert.equal(calls,0);
  const failed=await new EventBrowse({verify:async()=>ok(undefined)},source,()=>new Date(now)).read({firebaseUid:"synthetic"},undefined,new AbortController().signal);
  assert.equal(failed.ok,false);assert.equal(JSON.stringify(failed).includes("private"),false);assert.equal(calls,1);
  await assert.rejects(new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>false},http).firstBatch(now,new AbortController().signal));assert.equal(calls,1);
});
test("zero batch differs from failure, duplicate/oversize/missing positive payloads fail closed",async()=>{
  for(const raw of [{page:{number:0,totalElements:1}},{page:{number:0,totalElements:21},_embedded:{events:Array.from({length:21},(_,i)=>row({id:String(i)}))}},{page:{number:0,totalElements:2},_embedded:{events:[row(),row()]}}]){
    await assert.rejects(new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>Response.json(raw)).firstBatch(now,new AbortController().signal));
  }
  assert.deepEqual(await new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>Response.json({page:{number:0,totalElements:0}})).firstBatch(now,new AbortController().signal),[]);
});
test("detail requires returned identity, handles removed occurrence, never substitutes prior list",async()=>{
  const make=(r:Response)=>new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>r);
  assert.equal(await make(Response.json(row({id:"other"}))).detail(locator,now,new AbortController().signal),undefined);
  assert.equal(await make(new Response("not found",{status:404})).detail(locator,now,new AbortController().signal),undefined);
  const v=await make(Response.json(row())).detail(locator,now,new AbortController().signal);assert.equal(v?.browseId,locator);
});
test("positive total with an empty raw first page is dependency failure, not filtered success",async()=>{
  const source=new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>Response.json({page:{number:0,totalElements:1},_embedded:{events:[]}}));
  await assert.rejects(source.firstBatch(now,new AbortController().signal),error=>error===dependencyUnavailable);
});
test("genuine zero results stay valid with absent or explicitly empty raw events",async()=>{
  for(const raw of [{page:{number:0,totalElements:0}},{page:{number:0,totalElements:0},_embedded:{events:[]}}]){
    const source=new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>Response.json(raw));
    assert.deepEqual(await source.firstBatch(now,new AbortController().signal),[]);
  }
});
test("nonempty raw first batch whose occurrences are all ineligible remains a valid empty result",async()=>{
  const source=new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>Response.json({page:{number:0,totalElements:2},_embedded:{events:[row({name:"\ud800"}),row({_embedded:{venues:[{country:{countryCode:"US"}}]}})]}}));
  assert.deepEqual(await source.firstBatch(now,new AbortController().signal),[]);
});
test("positive-total empty raw page maps through real adapter and Application to safe no-store 503",async t=>{
  const app=Fastify();app.decorateRequest("authPrincipal",null);t.after(()=>app.close());
  let calls=0;
  const source=new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>{calls++;return Response.json({page:{number:0,totalElements:1},_embedded:{events:[]}});});
  await registerEventBrowseRoutes(app,{verifyIdToken:async()=>({kind:"verified",principal:{firebaseUid:"synthetic"}})},new EventBrowse({verify:async()=>ok(undefined)},source,()=>new Date(now)));
  const response=await app.inject({url:"/v1/event-browse",headers:{authorization:"Bearer synthetic"}});
  assert.equal(response.statusCode,503);assert.equal(response.headers["cache-control"],"no-store");
  assert.equal(response.json().error.code,"SERVICE_UNAVAILABLE");assert.equal(Object.hasOwn(response.json(),"items"),false);assert.equal(calls,1);
});
test("raw byte ceiling, malformed UTF-8, revoked activation and caller cancellation fail closed", async()=>{
  for (const response of [new Response(new Uint8Array(1024*1024+1)), new Response(new Uint8Array([0xc3,0x28]))]) {
    await assert.rejects(new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>response).firstBatch(now,new AbortController().signal));
  }
  let enabled=true;
  const revoked=new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>enabled},async()=>{
    enabled=false;return Response.json({page:{number:0,totalElements:0}});
  });
  await assert.rejects(revoked.firstBatch(now,new AbortController().signal));
  const caller=new AbortController();let calls=0;caller.abort();
  await assert.rejects(new TicketmasterBrowseSource({key:()=>"synthetic",enabled:()=>true},async()=>{calls++;return Response.json({});}).firstBatch(now,caller.signal));
  assert.equal(calls,0);
});
test("two feature-local routes authenticate before reading, no-store, unknown inputs and raw exceptions stay safe",async t=>{
  let calls=0;
  const app=Fastify();app.decorateRequest("authPrincipal",null);t.after(()=>app.close());
  const useCase=new EventBrowse({verify:async()=>ok(undefined)},{firstBatch:async()=>{calls++;return [projectOccurrence(row(),now)!];},detail:async()=>projectOccurrence(row(),now)},()=>new Date(now));
  await registerEventBrowseRoutes(app,{verifyIdToken:async()=>({kind:"verified",principal:{firebaseUid:"synthetic"}})},useCase);
  assert.equal((await app.inject({url:"/v1/event-browse"})).statusCode,401);assert.equal(calls,0);
  const headers={authorization:"Bearer synthetic"};assert.equal((await app.inject({url:"/v1/event-browse?countryCode=US",headers})).statusCode,400);assert.equal(calls,0);
  const r=await app.inject({url:"/v1/event-browse",headers});assert.equal(r.statusCode,200);assert.equal(r.headers["cache-control"],"no-store");assert.equal(r.json().items.length,1);
  assert.equal((await app.inject({url:`/v1/event-browse/${locator}`,headers})).statusCode,200);
  assert.equal((await app.inject({url:"/v1/event-browse/invalid",headers})).statusCode,404);
});

// Real provider counterexample: fractional UTC query values return HTTP400.
// Floor only the upstream lower bound; retain the original precise eligibility boundary.
test("provider lower bound uses whole seconds while local eligibility retains exact asOf",async()=>{
  for(const asOf of ["2026-10-15T00:00:00.123Z","2026-10-15T08:00:00.123456789+08:00"]){
    const calls:URL[]=[];
    const event=(id:string,dateTime:string)=>row({id,dates:{start:{dateTime},status:{code:"onsale"}}});
    const source=new TicketmasterBrowseSource({key:()=>"synthetic-only",enabled:()=>true},async input=>{
      const url=new URL(String(input));calls.push(url);
      assert.equal(url.searchParams.get("startDateTime"),"2026-10-15T00:00:00Z");
      return Response.json({page:{number:0,totalElements:3},_embedded:{events:[
        event("before","2026-10-15T00:00:00.100Z"),event("equal",asOf),event("future","2026-10-15T00:00:00.123456790Z"),
      ]}});
    });
    const values=await source.firstBatch(asOf,new AbortController().signal);
    assert.equal(calls.length,1);assert.deepEqual(values.map(v=>v.browseId),[browseId("future")]);
  }
});
test("invalid provider lower bound fails before fetching and whole-second input stays unchanged",async()=>{
  let calls=0;
  const source=new TicketmasterBrowseSource({key:()=>"synthetic-only",enabled:()=>true},async input=>{
    calls++;assert.equal(new URL(String(input)).searchParams.get("startDateTime"),now);
    return Response.json({page:{number:0,totalElements:0}});
  });
  await assert.rejects(source.firstBatch("not-an-instant",new AbortController().signal));assert.equal(calls,0);
  assert.deepEqual(await source.firstBatch(now,new AbortController().signal),[]);assert.equal(calls,1);
});
