import assert from 'node:assert/strict';
import test from 'node:test';
import {createControlledEventBrowse} from '../backend/dist/src/bootstrap/controlled-event-browse.js';
import {TicketmasterBrowseSource} from '../backend/dist/src/event-browse/infrastructure/ticketmaster-browse-source.js';
import {EventBrowse} from '../backend/dist/src/event-browse/application/event-browse.js';
import {BrowseCursor} from '../backend/dist/src/event-browse/infrastructure/browse-cursor.js';
import {browseId} from '../backend/dist/src/event-browse/domain/browse-values.js';
import {sourceEventId} from '../backend/dist/src/event-browse/domain/source-event-id.js';
import {ok} from '../backend/dist/src/shared/domain/result.js';
const at='2026-10-22T00:00:00.000Z',signal=()=>new AbortController().signal;
const row=(id,title)=>({id,name:title,url:`https://ticketmaster.sg/event/${id}`,dates:{start:{dateTime:'2026-12-01T00:00:00Z'},status:{code:'onsale'}},_embedded:{venues:[{country:{countryCode:'SG'}}]}});
for(const replace of [false,true])test(`raw later-page Detail completion after page-slot replacement=${replace}`,async()=>{
  const held=Promise.withResolvers(),entered=Promise.withResolvers();let page1Reads=0,details=0;
  const raw=new TicketmasterBrowseSource({key:()=> 'synthetic-only',enabled:()=>true},async input=>{
    const url=new URL(String(input));
    if(url.pathname.includes('/events/')){details++;if(details===2)entered.resolve();return held.promise.then(()=>Response.json(row('B','OLD')));}
    const page=Number(url.searchParams.get('page'));
    if(page===1){page1Reads++;return Response.json({page:{number:1,totalElements:21},_embedded:{events:[row('B',page1Reads===1?'OLD':'NEW')]}});}
    return Response.json({page:{number:0,totalElements:21},_embedded:{events:Array.from({length:20},(_,i)=>row('A'+i,'first'+i))}});
  });
  const gate=createControlledEventBrowse({source:raw,projectionCache:true,running:()=>true,track:work=>work()});gate.enable();
  const browse=new EventBrowse({verify:async()=>ok(undefined)},gate.source,()=>new Date(at),true,new BrowseCursor(Buffer.alloc(32,3))),principal={firebaseUid:'synthetic'};
  const first=await browse.read(principal,undefined,signal());assert.equal(first.ok,true);
  const next=await browse.read(principal,undefined,signal(),first.value.nextCursor);assert.equal(next.ok,true);
  const id=sourceEventId(browseId('B'));
  assert.equal(gate.peek(id,at)?.title,'OLD');
  const stable=gate.source.event(id,at,signal()),ordinary=browse.read(principal,browseId('B'),signal());
  await entered.promise;
  if(replace){const replaced=await browse.read(principal,undefined,signal(),first.value.nextCursor);assert.equal(replaced.ok,true);assert.equal(replaced.value.items[0].title,'NEW');}
  held.resolve();const [stableResult,ordinaryResult]=await Promise.all([stable,ordinary]);
  console.log(JSON.stringify({replace,page1Reads,details,peek:gate.peek(id,at)?.title,stable:stableResult?.title,ordinary:ordinaryResult.ok?ordinaryResult.value.title:ordinaryResult.failure.code,observation:gate.observation()}));
  assert.equal(ordinaryResult.ok,true);
  assert.equal(stableResult?.title,gate.peek(id,at)?.title);
  assert.equal(ordinaryResult.value.title,gate.peek(id,at)?.title);
  gate.disable();
});
