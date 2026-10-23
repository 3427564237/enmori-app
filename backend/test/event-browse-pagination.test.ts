import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {EventBrowse} from '../src/event-browse/application/event-browse.js';
import {BrowseCursor} from '../src/event-browse/infrastructure/browse-cursor.js';
import {TicketmasterBrowseSource} from '../src/event-browse/infrastructure/ticketmaster-browse-source.js';
import {registerEventBrowseRoutes} from '../src/event-browse/transport/register-routes.js';
import {ok} from '../src/shared/domain/result.js';
import {browseId} from '../src/event-browse/domain/browse-values.js';
import {sourceEventId} from '../src/event-browse/domain/source-event-id.js';
import {createControlledEventBrowse} from '../src/bootstrap/controlled-event-browse.js';
const instant='2026-10-20T00:00:00.000Z';
const row=(id:string,valid=true)=>({id,name:valid?'Synthetic activity':'\ud800',url:'https://ticketmaster.sg/event/synthetic',dates:{start:{dateTime:'2026-11-01T00:00:00Z'},status:{code:'onsale'}},_embedded:{venues:[{country:{countryCode:'SG'}}]}});
test('actual source page advances, signed owner-bound position, sparse continuation, retry and terminal batch',async t=>{
  const calls:number[]=[];let fail=true;let now=new Date(instant);
  const source=new TicketmasterBrowseSource({key:()=> 'synthetic-only',enabled:()=>true},async input=>{
    const url=new URL(String(input)),page=Number(url.searchParams.get('page'));calls.push(page);
    assert.equal(url.searchParams.get('size'),'20');assert.equal(url.searchParams.get('countryCode'),'SG');
    if(page===1&&fail){fail=false;return new Response('',{status:503});}
    return Response.json({page:{number:page,totalElements:41},_embedded:{events:page===0?[row('first')]:page===1?[row('excluded',false)]:[row('last')]}});
  });
  const app=Fastify();app.decorateRequest('authPrincipal',null);t.after(()=>app.close());
  const browse=new EventBrowse({verify:async()=>ok(undefined)},source,()=>now,true,new BrowseCursor(new Uint8Array(32).fill(7)));
  await registerEventBrowseRoutes(app,{verifyIdToken:async token=>({kind:'verified',principal:{firebaseUid:token}})},browse);
  const headers={authorization:'Bearer synthetic-a'};
  const first=await app.inject({url:'/v1/event-browse',headers});assert.equal(first.statusCode,200);
  const cursor=first.json().nextCursor as string;assert.ok(cursor);assert.equal(first.json().items.length,1);
  assert.equal((await app.inject({url:`/v1/event-browse?cursor=${cursor}`,headers:{authorization:'Bearer synthetic-b'}})).statusCode,400);
  assert.deepEqual(calls,[0]);
  assert.equal((await app.inject({url:`/v1/event-browse?cursor=${cursor}`,headers})).statusCode,503);
  const second=await app.inject({url:`/v1/event-browse?cursor=${cursor}`,headers});assert.equal(second.statusCode,200);assert.deepEqual(second.json().items,[]);
  const third=await app.inject({url:`/v1/event-browse?cursor=${second.json().nextCursor}`,headers});assert.equal(third.statusCode,200);assert.equal(third.json().nextCursor,undefined);
  assert.deepEqual(calls,[0,1,1,2]);
  for(const suffix of [`${cursor}x`,`${cursor}&cursor=${cursor}`,`${cursor}&page=2`])assert.equal((await app.inject({url:`/v1/event-browse?cursor=${suffix}`,headers})).statusCode,400);
  now=new Date(new Date(instant).getTime()+300000);
  assert.equal((await app.inject({url:`/v1/event-browse?cursor=${cursor}`,headers})).statusCode,400);
  assert.deepEqual(calls,[0,1,1,2]);
});
test('cursor refuses malformed signatures, changed owner, future and expired sessions',()=>{
  const cursor=new BrowseCursor(new Uint8Array(32).fill(1));const token=cursor.encode('a',instant,1);
  assert.deepEqual(cursor.decode('a',token,new Date(instant)),{asOf:instant,page:1});
  for(const v of [token+'\n',token+'=',token.replace('.', '..'),'x.'+'é'.repeat(43)])assert.equal(cursor.decode('a',v,new Date(instant)),undefined);
  assert.equal(cursor.decode('b',token,new Date(instant)),undefined);
  assert.equal(cursor.decode('a',token,new Date('2026-10-19T00:00:00Z')),undefined);
  assert.equal(cursor.decode('a',token,new Date('2026-10-20T00:05:00Z')),undefined);
});
test('later-page stable ID resolves current detail and participation availability through controlled source gate',async()=>{
  let enabled=true,details=0;
  const raw=new TicketmasterBrowseSource({key:()=> 'synthetic-only',enabled:()=>enabled},async input=>{
    const url=new URL(String(input));
    if(url.pathname.includes('/events/')){details++;return Response.json(row('later'));}
    assert.equal(url.searchParams.get('page'),'1');
    return Response.json({page:{number:1,totalElements:21},_embedded:{events:[row('later')]}});
  });
  const gate=createControlledEventBrowse({source:raw,projectionCache:true,running:()=>true,track:work=>work()});
  gate.enable();const signal=new AbortController().signal;
  const page=await gate.source.batch!(instant,1,signal);assert.equal(page.nextPage,undefined);
  const id=sourceEventId(browseId('later')!);
  assert.equal((await gate.source.event!(id,instant,signal))?.browseId,browseId('later'));
  assert.equal(await gate.source.availableEvent!(id,instant,signal),true);assert.equal(details,2);
  enabled=false;await assert.rejects(gate.source.availableEvent!(id,instant,signal));
  gate.disable();await assert.rejects(gate.source.batch!(instant,1,signal));
  assert.equal(details,2);
});
