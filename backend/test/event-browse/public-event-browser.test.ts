import test from 'node:test';
import assert from 'node:assert/strict';
import type { Browser } from 'playwright';
import { PublicEventBrowser } from '../../src/event-browse/infrastructure/public-event-pages.js';

const booking='https://ticketmaster.sg/ticket/area/synthetic/123';
const detail='https://ticketmaster.sg/activity/detail/synthetic';
function fixture(statuses:number[],homeLinks:string[]=[detail]) {
  const state={navigations:[] as string[],waits:0,contextsClosed:0,browsersClosed:0,failures:[] as string[]};
  const page={goto:async(url:string)=>{state.navigations.push(url);return {status:()=>statuses[state.navigations.length-1]??200};},
    locator:()=>({first:()=>({waitFor:async()=>{state.waits++;}}),waitFor:async()=>{state.waits++;},evaluateAll:async()=>state.navigations.length===1?homeLinks:[detail]}),
    evaluate:async()=>({url:detail,title:'Synthetic show',text:'Real content',description:'Complete official description.',links:[booking],metadata:[{name:'og:image',property:null,content:'https://static.ticketmaster.sg/show.jpg'}],sections:[]})};
  const browser={newContext:async()=>({route:async()=>{},newPage:async()=>page,close:async()=>{state.contextsClosed++;}}),close:async()=>{state.browsersClosed++;}} as unknown as Browser;
  return {state,reader:new PublicEventBrowser(category=>state.failures.push(category),async()=>browser)};
}
for(const status of [403,429])test(`explicit homepage ${status} releases browser before waiting for event links`,async()=>{
  const {state,reader}=fixture([status]);
  await assert.rejects(reader.read(booking,new AbortController().signal),/Source unavailable/);
  assert.deepEqual(state.navigations,['https://ticketmaster.sg/']);assert.equal(state.waits,0);
  assert.equal(state.contextsClosed,1);assert.equal(state.browsersClosed,1);
  assert.deepEqual(state.failures,['EVENT_READER_HOME_ACCESS_DENIED_UNAVAILABLE']);
});
test('ordinary non-200 bootstrap still renders linked official content and its named cover',async()=>{
  const {state,reader}=fixture([401,200]);
  const result=await reader.read(booking,new AbortController().signal);
  assert.equal(result.description,'Complete official description.');assert.equal(result.cover,'https://static.ticketmaster.sg/show.jpg');
  assert.equal(state.waits,2);assert.deepEqual(state.failures,[]);assert.equal(state.browsersClosed,1);
});
test('a refused linked detail does not wait for content or publish the denial page',async()=>{
  const {state,reader}=fixture([200,403]);
  await assert.rejects(reader.read(booking,new AbortController().signal),/Source unavailable/);
  assert.deepEqual(state.navigations,['https://ticketmaster.sg/',detail]);assert.equal(state.waits,1);assert.equal(state.browsersClosed,1);
  assert.deepEqual(state.failures,['EVENT_READER_DETAIL_ACCESS_DENIED_UNAVAILABLE']);
});
test('a refused booking fallback does not wait or follow unrelated information',async()=>{
  const {state,reader}=fixture([200,403],['https://ticketmaster.sg/activity/detail/unrelated']);
  await assert.rejects(reader.read(booking,new AbortController().signal),/Source unavailable/);
  assert.deepEqual(state.navigations,['https://ticketmaster.sg/',booking]);assert.equal(state.waits,1);assert.equal(state.browsersClosed,1);
  assert.deepEqual(state.failures,['EVENT_READER_BOOKING_ACCESS_DENIED_UNAVAILABLE']);
});
