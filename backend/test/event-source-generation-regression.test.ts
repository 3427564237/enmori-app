import assert from 'node:assert/strict';
import test from 'node:test';
import {TicketmasterBrowseSource} from '../src/event-browse/infrastructure/ticketmaster-browse-source.js';
import {ControlledSourceProjection} from '../src/event-browse/infrastructure/controlled-source-projection.js';
import {EventBrowse} from '../src/event-browse/application/event-browse.js';
import {BrowseCursor} from '../src/event-browse/infrastructure/browse-cursor.js';
import {browseId} from '../src/event-browse/domain/browse-values.js';
import {sourceEventId} from '../src/event-browse/domain/source-event-id.js';
import {ok} from '../src/shared/domain/result.js';
import {createControlledEventBrowse} from '../src/bootstrap/controlled-event-browse.js';
import {createControlledEventRecommendations} from '../src/bootstrap/controlled-event-recommendations.js';
import {eventTestRecords,EVENT_TEST_UID} from './support/event-repository-contract.js';
const instant='2026-10-20T00:00:00.000Z',signal=()=>new AbortController().signal;
const occurrence=(title:string)=>({browseId:browseId('same')!,title,startAt:'2026-11-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/same'});
test('EB2 initial page atomically replaces cached first generation for browse and stable detail',async()=>{
  let reads=0;
  const raw=new TicketmasterBrowseSource({key:()=> 'synthetic-only',enabled:()=>true},async()=>{
    const title=++reads===1?'OLD':'NEW';
    return Response.json({page:{number:0,totalElements:1},_embedded:{events:[{id:'same',name:title,url:'https://ticketmaster.sg/event/same',dates:{start:{dateTime:'2026-11-01T00:00:00Z'},status:{code:'onsale'}},_embedded:{venues:[{country:{countryCode:'SG'}}]}}]}});
  });
  const cache=new ControlledSourceProjection(raw);
  assert.equal((await cache.firstBatch(instant,signal()))[0]!.title,'OLD');
  const browse=new EventBrowse({verify:async()=>ok(undefined)},cache,()=>new Date(instant),true,new BrowseCursor(new Uint8Array(32).fill(8)));
  const page=await browse.read({firebaseUid:'synthetic'},undefined,signal());
  assert.ok(page.ok&&'items'in page.value);if(!page.ok||!('items'in page.value))return;
  assert.equal(page.value.items[0]!.title,'NEW');
  assert.equal((await cache.detail(browseId('same')!,instant,signal()))?.title,'NEW');
  assert.equal((await cache.event!(sourceEventId(browseId('same')!),instant,signal()))?.title,'NEW');
  assert.equal((await cache.firstBatch(instant,signal()))[0]!.title,'NEW');assert.equal(reads,2);
});
test('old pending first read cannot overwrite a newer page-zero generation; concurrent readers join replacement',async()=>{
  const old=Promise.withResolvers<readonly ReturnType<typeof occurrence>[]>();
  const fresh=Promise.withResolvers<{items:readonly ReturnType<typeof occurrence>[]}>();
  let firstCalls=0;
  const cache=new ControlledSourceProjection({firstBatch:()=>{firstCalls++;return old.promise;},batch:()=>fresh.promise,detail:async()=>undefined});
  const oldRead=cache.firstBatch(instant,signal());const oldDenied=assert.rejects(oldRead);
  const page=cache.batch!(instant,0,signal());const join=cache.firstBatch(instant,signal());
  fresh.resolve({items:[occurrence('NEW')]});await page;
  old.resolve([occurrence('OLD')]);await oldDenied;
  assert.equal((await join)[0]!.title,'NEW');assert.equal(firstCalls,1);
});

test('stable Detail joins in-progress page-zero refresh instead of returning late OLD provider detail',async()=>{
  const refresh=Promise.withResolvers<Response>(),oldDetail=Promise.withResolvers<Response>(),entered=Promise.withResolvers<void>();
  let lists=0,details=0;
  const row=(title:string)=>({id:'same',name:title,url:'https://ticketmaster.sg/event/same',dates:{start:{dateTime:'2026-11-01T00:00:00Z'},status:{code:'onsale'}},classifications:[{segment:{id:'KZFzniwnSyZfZ7v7nJ',name:'Music'}}],_embedded:{venues:[{country:{countryCode:'SG'}}]}});
  const page=(title:string)=>Response.json({page:{number:0,totalElements:1},_embedded:{events:[row(title)]}});
  const raw=new TicketmasterBrowseSource({key:()=> 'synthetic-only',enabled:()=>true},async input=>{
    if(new URL(String(input)).pathname.includes('/events/')){details++;return oldDetail.promise;}
    lists++;if(lists===1)return page('OLD');entered.resolve();return refresh.promise;
  });
  const gate=createControlledEventBrowse({source:raw,projectionCache:true,running:()=>true,track:work=>work()});gate.enable();
  await gate.source.firstBatch(instant,signal());
  const browse=new EventBrowse({verify:async()=>ok(undefined)},gate.source,()=>new Date(instant),true,new BrowseCursor(new Uint8Array(32).fill(3)));
  const records=eventTestRecords();
  const joined=createControlledEventRecommendations({gateway:{get:async path=>records[path],listEvents:async()=>[]},source:gate.source,clock:{now:()=>ok(new Date(instant))}});
  const replacing=browse.read({firebaseUid:EVENT_TEST_UID},undefined,signal());await entered.promise;
  const stable=joined.eventDetail.execute({firebaseUid:EVENT_TEST_UID},sourceEventId(browseId('same')!));
  for(let i=0;i<30&&gate.observation().pending<2;i++)await Promise.resolve();
  assert.equal(gate.observation().pending,2); // Both operations are admitted before publication.
  refresh.resolve(page('NEW'));const listed=await replacing;
  oldDetail.resolve(Response.json(row('OLD')));
  const detail=await stable;
  assert.ok(listed.ok&&'items'in listed.value);assert.ok(detail.ok);
  if(listed.ok&&'items'in listed.value)assert.equal(listed.value.items[0]!.title,'NEW');
  if(detail.ok)assert.equal(detail.value.title,'NEW');
  assert.equal((await gate.source.detail(browseId('same')!,instant,signal()))?.title,'NEW');
  const recommendations=await joined.recommendEvents.execute({principal:{firebaseUid:EVENT_TEST_UID},view:'all'});
  assert.ok(recommendations.ok);if(recommendations.ok)assert.equal(recommendations.value.items[0]!.title,'NEW');
  assert.equal(lists,2);assert.equal(details,0);assert.equal(gate.observation().pending,0);gate.disable();
});

test('stable lookup cannot bypass a failed pending refresh or fallback to old raw content',async()=>{
  const failed=Promise.withResolvers<{items:readonly ReturnType<typeof occurrence>[]}>();let rawReads=0;
  const cache=new ControlledSourceProjection({firstBatch:async()=>[occurrence('OLD')],batch:()=>failed.promise,event:async()=>{rawReads++;return occurrence('OLD');},detail:async()=>undefined});
  await cache.firstBatch(instant,signal());
  const refresh=cache.batch!(instant,0,signal()),refreshDenied=assert.rejects(refresh);
  const stable=cache.event!(sourceEventId(browseId('same')!),instant,signal()),stableDenied=assert.rejects(stable);
  failed.reject(new Error('Synthetic refresh failure'));await refreshDenied;await stableDenied;
  assert.equal(rawReads,0);
});

test('raw later-page stable lookup is refused if a new first generation publishes during its wait',async()=>{
  const detail=Promise.withResolvers<ReturnType<typeof occurrence>|undefined>();
  const cache=new ControlledSourceProjection({firstBatch:async()=>[occurrence('NEW')],event:()=>detail.promise,detail:async()=>undefined});
  const stable=cache.event!(sourceEventId(browseId('same')!),instant,signal()),denied=assert.rejects(stable);
  await cache.firstBatch(instant,signal());detail.resolve(occurrence('OLD'));await denied;
});

test('disable invalidates stable Detail waiting on replacement without raw fallback or lost pending accounting',async()=>{
  const replacement=Promise.withResolvers<{items:readonly ReturnType<typeof occurrence>[]}>();let rawReads=0;
  const gate=createControlledEventBrowse({projectionCache:true,running:()=>true,track:work=>work(),source:{firstBatch:async()=>[occurrence('OLD')],batch:()=>replacement.promise,event:async()=>{rawReads++;return occurrence('OLD');},detail:async()=>undefined}});
  gate.enable();await gate.source.firstBatch(instant,signal());
  const refresh=gate.source.batch!(instant,0,signal()),refreshDenied=assert.rejects(refresh);
  const stable=gate.source.event!(sourceEventId(browseId('same')!),instant,signal()),stableDenied=assert.rejects(stable);
  assert.equal(gate.observation().pending,2);gate.disable();
  replacement.resolve({items:[occurrence('NEW')]});await refreshDenied;await stableDenied;
  assert.equal(gate.observation().pending,0);assert.equal(rawReads,0);
});

test('a failed first-generation refresh also invalidates a raw stable lookup already in flight',async()=>{
  const old=Promise.withResolvers<ReturnType<typeof occurrence>|undefined>();
  const cache=new ControlledSourceProjection({firstBatch:async()=>{throw new Error('Synthetic first refresh failure');},event:()=>old.promise,detail:async()=>undefined});
  const stable=cache.event!(sourceEventId(browseId('same')!),instant,signal()),denied=assert.rejects(stable);
  await assert.rejects(cache.firstBatch(instant,signal()));old.resolve(occurrence('OLD'));await denied;
});
