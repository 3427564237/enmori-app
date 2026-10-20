import assert from 'node:assert/strict';
import test from 'node:test';
import {TicketmasterBrowseSource} from '../src/event-browse/infrastructure/ticketmaster-browse-source.js';
import {ControlledSourceProjection} from '../src/event-browse/infrastructure/controlled-source-projection.js';
import {EventBrowse} from '../src/event-browse/application/event-browse.js';
import {BrowseCursor} from '../src/event-browse/infrastructure/browse-cursor.js';
import {browseId} from '../src/event-browse/domain/browse-values.js';
import {sourceEventId} from '../src/event-browse/domain/source-event-id.js';
import {ok} from '../src/shared/domain/result.js';
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
