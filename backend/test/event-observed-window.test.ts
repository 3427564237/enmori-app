import assert from 'node:assert/strict';
import test from 'node:test';
import { createControlledEventBrowse } from '../src/bootstrap/controlled-event-browse.js';
import { socialEventSource } from '../src/bootstrap/social-event-source.js';
import { TicketmasterBrowseSource } from '../src/event-browse/infrastructure/ticketmaster-browse-source.js';
import { ControlledSourceProjection } from '../src/event-browse/infrastructure/controlled-source-projection.js';
import { EventBrowse } from '../src/event-browse/application/event-browse.js';
import { BrowseCursor } from '../src/event-browse/infrastructure/browse-cursor.js';
import { browseId } from '../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../src/event-browse/domain/source-event-id.js';
import { ok } from '../src/shared/domain/result.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { FirestoreParticipationRepository } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { participationAccess } from '../src/bootstrap/event-participation.js';
import { InMemoryFirestoreGateway } from './support/in-memory-firestore-gateway.js';
const at='2026-10-22T00:00:00.000Z',signal=()=>new AbortController().signal;
const item=(id:string,title=id)=>({browseId:browseId(id)!,title,startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/synthetic'});

test('actual signed next page supplies authorized participation title/activity without broadening first-batch recommendations',async()=>{
  const calls:number[]=[];
  const raw=new TicketmasterBrowseSource({key:()=> 'synthetic-only',enabled:()=>true},async input=>{
    const url=new URL(String(input));assert.equal(url.pathname.includes('/events/'),false);
    const page=Number(url.searchParams.get('page'));calls.push(page);
    const id=page===0?'first':'later';
    return Response.json({page:{number:page,totalElements:21},_embedded:{events:[{id,name:id,url:'https://ticketmaster.sg/event/synthetic',dates:{start:{dateTime:'2026-12-01T00:00:00Z'},status:{code:'onsale'}},_embedded:{venues:[{country:{countryCode:'SG'}}]}}]}});
  });
  const gate=createControlledEventBrowse({source:raw,projectionCache:true,running:()=>true,track:work=>work()});gate.enable();
  const browse=new EventBrowse({verify:async()=>ok(undefined)},gate.source,()=>new Date(at),true,new BrowseCursor(Buffer.alloc(32,3)));
  const first=await browse.read({firebaseUid:'synthetic'},undefined,signal());assert.ok(first.ok&&'nextCursor'in first.value);
  if(!first.ok||!('nextCursor'in first.value))return;
  const next=await browse.read({firebaseUid:'synthetic'},undefined,signal(),first.value.nextCursor);assert.ok(next.ok);
  const id=sourceEventId(browseId('later')!);
  assert.equal(gate.peek(id,at)?.title,'later');
  assert.deepEqual((await gate.source.firstBatch(at,signal())).map(x=>x.title),['first']);
  const db=new InMemoryFirestoreGateway({
    'accounts/owner':{username:'synthetic_owner',checkInVisibility:'private',onboardingCompletedAt:at,optionalProcessingConsent:'accepted',fieldPrivacy:{participation:'public'}},
    'friend_access/owner':{eligibilityState:'eligible'},
    'username_reservations/synthetic_owner':{accountId:'owner'},
    [`auth_bindings/${createAuthBindingDocumentId('synthetic')!}`]:{accountId:'owner'},
  });
  const repository=()=>new FirestoreParticipationRepository(db,{now:()=>ok(new Date(at))},async event=>gate.peek(event,at)!==undefined,participationAccess,Buffer.alloc(32,4));
  assert.ok((await repository().save('synthetic',id,{status:'interested',ignored:false,expectedRevision:0})).ok);
  assert.ok((await repository().save('synthetic',id,{status:'going',ignored:false,expectedRevision:1})).ok);
  assert.ok((await repository().save('synthetic',id,{status:'going',ignored:true,expectedRevision:2})).ok);
  const read=await repository().read('synthetic',id);assert.ok(read.ok);if(read.ok){assert.equal(read.value.status,'going');assert.equal(read.value.ignored,true);}
  const producer=socialEventSource(gate.peek,gate.projectionReady);
  const rows=await db.runTransaction(tx=>producer.activity.read(tx,'viewer','owner',at,'friends_activity_v1'));
  assert.equal(rows?.length,1);assert.equal(rows?.[0]?.occurredAt,at);
  const display=await db.runTransaction(tx=>producer.activity.display(tx,'viewer','owner',rows![0]!,at,'friends_activity_v1'));
  assert.deepEqual(display,{eventId:id,title:'later'});
  await db.runTransaction(async tx=>{const old=await tx.get('accounts/owner');tx.set('accounts/owner',{...old,fieldPrivacy:{participation:'private'}});});
  assert.equal(await db.runTransaction(tx=>producer.activity.display(tx,'viewer','owner',rows![0]!,at,'friends_activity_v1')),undefined);
  gate.disable();assert.equal(gate.peek(id,at),undefined);
  assert.ok((await repository().save('synthetic',id,{status:'none',ignored:true,expectedRevision:3})).ok);
  assert.ok((await repository().save('synthetic',id,{status:'none',ignored:false,expectedRevision:4})).ok);
  assert.deepEqual(calls,[0,1]);
});

test('observed pages expire with the original five-minute generation and refresh never retains old titles',async()=>{
  const cache=new ControlledSourceProjection({firstBatch:async()=>[item('first')],batch:async(_at,page)=>({items:[item(page===0?'first':'later')]}),detail:async()=>undefined});
  await cache.batch!(at,0,signal());await cache.batch!(at,1,signal());
  assert.equal(cache.peek(sourceEventId(browseId('later')!),at)?.title,'later');
  assert.equal(cache.peek(sourceEventId(browseId('later')!),'2026-10-22T00:05:00.000Z'),undefined);
  await cache.batch!(at,0,signal());assert.equal(cache.peek(sourceEventId(browseId('later')!),at),undefined);
});

test('late next page cannot publish after page-zero replacement or disable',async()=>{
  for(const clear of [false,true]){
    const held=Promise.withResolvers<{items:readonly ReturnType<typeof item>[]}>();
    const cache=new ControlledSourceProjection({firstBatch:async()=>[item('first')],batch:async(_at,page)=>page===0?{items:[item('first')]}:held.promise,detail:async()=>undefined});
    await cache.batch!(at,0,signal());const pending=cache.batch!(at,1,signal()),denied=assert.rejects(pending);
    if(clear)cache.clear();else await cache.batch!(at,0,signal());
    held.resolve({items:[item('late')]});await denied;
    assert.equal(cache.peek(sourceEventId(browseId('late')!),at),undefined);
  }
});

test('fifty bounded pages retain at most 1000 unique IDs; repeat pages replace rather than append',async()=>{
  let replacement=false;
  const cache=new ControlledSourceProjection({firstBatch:async()=>[],batch:async(_at,page)=>({items:Array.from({length:20},(_,i)=>item(`${replacement&&page===1?'replacement':page}-${i}`))}),detail:async()=>undefined});
  for(let page=0;page<50;page++)await cache.batch!(at,page,signal());
  assert.ok(cache.peek(sourceEventId(browseId('49-19')!),at));
  replacement=true;await cache.batch!(at,1,signal());
  assert.equal(cache.peek(sourceEventId(browseId('1-0')!),at),undefined);
  assert.ok(cache.peek(sourceEventId(browseId('replacement-0')!),at));
  await assert.rejects(cache.batch!(at,50,signal()));
  assert.equal(cache.peek(sourceEventId(browseId('50-0')!),at),undefined);
});

test('later-page retry keeps published rows; same-page obsolete work and mismatched cursor cannot replace them',async()=>{
  const held=Promise.withResolvers<{items:readonly ReturnType<typeof item>[]}>();let calls=0;
  const cache=new ControlledSourceProjection({firstBatch:async()=>[],batch:async(_at,page)=>{
    if(page===0)return {items:[item('first')]};
    calls++;if(calls===2)throw new Error('Synthetic later-page failure');
    if(calls===3)return held.promise;
    return {items:[item('later',calls===1?'ORIGINAL':'CURRENT')]};
  },detail:async()=>undefined});
  await cache.batch!(at,0,signal());await cache.batch!(at,1,signal());
  await assert.rejects(cache.batch!(at,1,signal()));assert.equal(cache.peek(sourceEventId(browseId('later')!),at)?.title,'ORIGINAL');
  const old=cache.batch!(at,1,signal()),denied=assert.rejects(old);
  await cache.batch!(at,1,signal());held.resolve({items:[item('later','LATE')]});await denied;
  assert.equal(cache.peek(sourceEventId(browseId('later')!),at)?.title,'CURRENT');
  await assert.rejects(cache.batch!('2026-10-22T00:00:01.000Z',1,signal()));assert.equal(calls,4);
});

test('duplicate or oversized page is never published; accepted rows are copied and frozen',async()=>{
  let rows=[item('first')];
  const cache=new ControlledSourceProjection({firstBatch:async()=>rows,batch:async()=>({items:rows}),detail:async()=>undefined});
  await cache.batch!(at,0,signal());rows[0]!.title='MUTATED';
  const found=cache.peek(sourceEventId(browseId('first')!),at)!;
  assert.equal(found.title,'first');assert.equal(Object.isFrozen(found),true);
  rows=[item('dup'),item('dup')];await assert.rejects(cache.batch!(at,1,signal()));
  assert.equal(cache.peek(sourceEventId(browseId('dup')!),at),undefined);
  rows=Array.from({length:21},(_,i)=>item(`oversized-${i}`));await assert.rejects(cache.batch!(at,1,signal()));
  assert.equal(cache.peek(sourceEventId(browseId('oversized-0')!),at),undefined);
});
