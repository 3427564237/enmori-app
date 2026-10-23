import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import { ok } from '../src/shared/domain/result.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from './support/in-memory-firestore-gateway.js';
import { FirestoreParticipationRepository, participationKey } from '../src/event-participation/infrastructure/firestore-participation-repository.js';
import { participationAccess } from '../src/bootstrap/event-participation.js';
import { registerParticipationRoutes } from '../src/event-participation/transport/register-routes.js';
import { ParticipationOperations } from '../src/event-participation/application/participation-operations.js';
import type { StoredDocument } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { sourceEventId } from '../src/bootstrap/controlled-event-recommendations.js';
import { EventBrowse } from '../src/event-browse/application/event-browse.js';

const at='2026-10-20T00:00:00.000Z', event='tm_event_'+'a'.repeat(64);
function seed(count=0):Record<string,StoredDocument>{
  const rows:Record<string,StoredDocument>={};
  for(let i=0;i<=count;i++){
    const id=`person-${i}`,username=`member_${i}`;
    rows[`accounts/${id}`]={username,optionalProcessingConsent:'rejected',checkInVisibility:'private',onboardingCompletedAt:at,
      fieldPrivacy:{interests:'private',location:'private',participation:'public',mapSharedWithFriends:false}};
    rows[`friend_access/${id}`]={eligibilityState:'eligible'};
    rows[`username_reservations/${username}`]={accountId:id};
    rows[`auth_bindings/${createAuthBindingDocumentId(`uid-${i}`)!}`]={accountId:id};
    if(i>0)rows[`event_participations/${participationKey(id,event)}`]={accountId:id,eventId:event,status:'going',ignored:false,revision:1,updatedAt:at};
  }
  return rows;
}
function fixture(count=0){const db=new InMemoryFirestoreGateway(seed(count));let available=true,calls=0;
  const repo=new FirestoreParticipationRepository(db,{now:()=>ok(new Date(at))},async()=>{calls++;return available;},participationAccess,Buffer.alloc(32,7));
  return {db,repo,setAvailable:(v:boolean)=>available=v,sourceCalls:()=>calls};}
function unwrap<T>(r:{ok:true;value:T}|{ok:false;failure:unknown}):T{assert.equal(r.ok,true);if(!r.ok)throw new Error('Expected success');return r.value;}

test('save/re-read via new Repository, rejected consent and other owner isolation',async()=>{
  const f=fixture(1);assert.deepEqual(unwrap(await f.repo.read('uid-0',event)),{eventId:event,status:'none',ignored:false,revision:0});
  const first=unwrap(await f.repo.save('uid-0',event,{status:'interested',ignored:false,expectedRevision:0}));assert.equal(first.revision,1);
  const second=new FirestoreParticipationRepository(f.db,{now:()=>ok(new Date(at))},async()=>false,participationAccess,Buffer.alloc(32,7));
  assert.deepEqual(unwrap(await second.read('uid-0',event)),first);
  assert.equal(unwrap(await second.read('uid-1',event)).status,'going');
});
test('version before no-op, no increment/source access for no-op',async()=>{
  const f=fixture();unwrap(await f.repo.save('uid-0',event,{status:'going',ignored:false,expectedRevision:0}));
  assert.equal(unwrap(await f.repo.save('uid-0',event,{status:'going',ignored:false,expectedRevision:1})).revision,1);
  const stale=await f.repo.save('uid-0',event,{status:'going',ignored:false,expectedRevision:0});assert.equal(stale.ok,false);if(!stale.ok)assert.equal(stale.failure.code,'EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED');
  assert.equal(f.sourceCalls(),1);
});
test('ignore keeps Going, selection clears ignored, cancellation preserves ignored',async()=>{
  const f=fixture();unwrap(await f.repo.save('uid-0',event,{status:'going',ignored:false,expectedRevision:0}));
  assert.equal(unwrap(await f.repo.save('uid-0',event,{status:'going',ignored:true,expectedRevision:1})).status,'going');
  assert.equal(unwrap(await f.repo.save('uid-0',event,{status:'interested',ignored:false,expectedRevision:2})).ignored,false);
  unwrap(await f.repo.save('uid-0',event,{status:'interested',ignored:true,expectedRevision:3}));
  assert.equal(unwrap(await f.repo.save('uid-0',event,{status:'none',ignored:true,expectedRevision:4})).ignored,true);
});
test('source offline permits read/cancel/unignore but not first ignore or new selection',async()=>{
  const f=fixture();unwrap(await f.repo.save('uid-0',event,{status:'going',ignored:false,expectedRevision:0}));
  unwrap(await f.repo.save('uid-0',event,{status:'going',ignored:true,expectedRevision:1}));f.setAvailable(false);
  assert.equal(unwrap(await f.repo.save('uid-0',event,{status:'none',ignored:true,expectedRevision:2})).revision,3);
  assert.equal(unwrap(await f.repo.save('uid-0',event,{status:'none',ignored:false,expectedRevision:3})).revision,4);
  assert.equal((await f.repo.save('uid-0',event,{status:'none',ignored:true,expectedRevision:4})).ok,false);
  assert.equal((await f.repo.save('uid-0',event,{status:'interested',ignored:false,expectedRevision:4})).ok,false);
  assert.equal(unwrap(await f.repo.read('uid-0',event)).status,'none');
});
for(const change of [{status:'booked',ignored:false,expectedRevision:0},{status:'going',ignored:true,expectedRevision:0},{status:'going',ignored:false,expectedRevision:-1},{status:'going',ignored:false,expectedRevision:0,uid:'attacker'}])
  test(`reject invalid change ${JSON.stringify(change)}`,async()=>{const f=fixture();assert.equal((await f.repo.save('uid-0',event,change as never)).ok,false);assert.equal(f.db.entries().filter(([p])=>p.startsWith('event_participations/')).length,0);});
test('sparse pages continue, zero is authorized count, cursor bound to requester/status/group',async()=>{
  const f=fixture(25);await f.db.runTransaction(async tx=>{for(let i=1;i<=25;i++){const d=await tx.get(`accounts/person-${i}`);tx.set(`accounts/person-${i}`,{...d,fieldPrivacy:{interests:'private',location:'private',participation:'private',mapSharedWithFriends:false}});}});
  const first=unwrap(await f.repo.participants('uid-0',event,'going','others'));assert.equal(first.items.length,0);assert.equal(first.visibleCount,0);assert.ok(first.nextCursor);
  assert.equal(unwrap(await f.repo.participants('uid-0',event,'going','others',first.nextCursor)).nextCursor,undefined);
  for(const [uid,status,group]of [['uid-1','going','others'],['uid-0','interested','others'],['uid-0','going','friends']]as const)assert.equal((await f.repo.participants(uid,event,status,group,first.nextCursor)).ok,false);
  assert.equal((await f.repo.participants('uid-0',event,'going','others',first.nextCursor+'=')).ok,false);
});
test('current privacy and profile projection re-read, no private display name',async()=>{
  const f=fixture(1);assert.deepEqual(unwrap(await f.repo.participants('uid-0',event,'going','others')).items,[{username:'member_1'}]);
  await f.db.runTransaction(async tx=>{const d=await tx.get('accounts/person-1');tx.set('accounts/person-1',{...d,fieldPrivacy:{interests:'private',location:'private',participation:'private',mapSharedWithFriends:false}});});
  assert.equal(unwrap(await f.repo.participants('uid-0',event,'going','others')).visibleCount,0);
});
test('count over200 omitted, never page length or raw total',async()=>{
  const f=fixture(201),page=unwrap(await f.repo.participants('uid-0',event,'going','others'));assert.equal(page.items.length,20);assert.equal(page.countState,'unavailable');assert.equal(Object.hasOwn(page,'visibleCount'),false);
});
test('missing participation privacy within legacy fieldPrivacy is private',async()=>{
  const f=fixture(1);await f.db.runTransaction(async tx=>{const account=await tx.get('accounts/person-1');tx.set('accounts/person-1',{...account,fieldPrivacy:{interests:'public',location:'private',mapSharedWithFriends:false}});});
  const page=unwrap(await f.repo.participants('uid-0',event,'going','others'));assert.equal(page.visibleCount,0);assert.deepEqual(page.items,[]);
});
test('non-ASCII forged cursor signature is request error, not dependency error',async()=>{
  const f=fixture(25),first=unwrap(await f.repo.participants('uid-0',event,'going','others'));
  const fields=JSON.parse(Buffer.from(first.nextCursor!,'base64url').toString('utf8'))as unknown[];fields[3]='é'.repeat(43);
  const bad=await f.repo.participants('uid-0',event,'going','others',Buffer.from(JSON.stringify(fields)).toString('base64url'));
  assert.equal(bad.ok,false);if(!bad.ok)assert.equal(bad.failure.code,'REQUEST_INVALID');
});
test('public username projection excludes ignored/revision/timestamp even for own username',async()=>{
  const f=fixture(1);for(const uid of ['uid-0','uid-1'])assert.deepEqual(unwrap(await f.repo.list(uid,'member_1')).items,[{eventId:event,status:'going'}]);
});
test('corrupt records and dependency errors fail closed',async()=>{
  const f=fixture();await f.db.runTransaction(async tx=>tx.set(`event_participations/${participationKey('person-0',event)}`,{bad:'secret'}));
  const bad=await f.repo.read('uid-0',event);assert.equal(bad.ok,false);assert.equal(JSON.stringify(bad).includes('secret'),false);
  const offline=new FirestoreParticipationRepository(new FailingFirestoreGateway(),{now:()=>ok(new Date(at))},async()=>true,participationAccess,Buffer.alloc(32,7));assert.equal((await offline.read('uid-0',event)).ok,false);
});
test('deletion seam refuses live account, cleans only confirmed permanently-deleted account',async()=>{
  const f=fixture(1);await assert.rejects(()=>f.repo.purgeDeletedAccountPage('person-1'));
  await f.db.runTransaction(async tx=>{tx.delete!('accounts/person-1');tx.set('friend_access/person-1',{eligibilityState:'permanently-deleted'});});
  await f.repo.purgeDeletedAccountPage('person-1');assert.equal(f.db.read(`event_participations/${participationKey('person-1',event)}`),undefined);
});
test('Transport auth precedence, strict input/header,422/412, safe no-store envelope',async()=>{
  const f=fixture(),app=Fastify({logger:false,routerOptions:{maxParamLength:174}});await registerParticipationRoutes(app,{verifyIdToken:async token=>token==='valid'?{kind:'verified',principal:{firebaseUid:'uid-0'}}:{kind:'invalid'}},new ParticipationOperations(f.repo));
  try{const url=`/v1/events/${event}/participation`,headers={authorization:'Bearer valid'};
    assert.equal((await app.inject({method:'PUT',url,payload:{extra:1}})).statusCode,401);
    assert.equal((await app.inject({method:'PUT',url,headers,payload:{status:'going',ignored:false,expectedRevision:0,uid:'attacker'}})).statusCode,400);
    assert.equal((await app.inject({method:'PUT',url,headers:{...headers,'idempotency-key':'bad'},payload:{status:'going',ignored:false,expectedRevision:0}})).statusCode,400);
    assert.equal((await app.inject({method:'PUT',url,headers,payload:{status:'booked',ignored:false,expectedRevision:0}})).statusCode,422);
    assert.equal((await app.inject({method:'PUT',url,headers,payload:{status:'going',ignored:false,expectedRevision:0}})).statusCode,200);
    const stale=await app.inject({method:'PUT',url,headers,payload:{status:'going',ignored:false,expectedRevision:0}});assert.equal(stale.statusCode,412);assert.equal(stale.json().error.code,'EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED');assert.ok(stale.json().error.requestId);
    assert.equal((await app.inject({url,headers})).headers['cache-control'],'no-store');
    assert.equal((await app.inject({url:url.replace('/participation','/participants')+'?status=going&group=others&cursor=bad',headers})).statusCode,400);
  }finally{await app.close();}
});
test('opt-in browse stableID is the original occurrence mapping',async()=>{
  const item={browseId:'tm_YQ',title:'Same name',startAt:'2027-01-01T00:00:00Z',externalSourceUrl:'https://www.ticketmaster.sg/event/a'};
  const browse=new EventBrowse({verify:async()=>ok(undefined)},{firstBatch:async()=>[item],detail:async()=>item},()=>new Date(at),true);
  const batch=unwrap(await browse.read({firebaseUid:'uid-0'},undefined,new AbortController().signal));assert.ok('items'in batch);if('items'in batch)assert.equal(batch.items[0]?.eventId,sourceEventId('tm_YQ'));
});

test('activity selection time survives ignore, is removed on cancel, and old rows are not backfilled', async()=>{
  const f=fixture(1),path=`event_participations/${participationKey('person-0',event)}`;
  unwrap(await f.repo.save('uid-0',event,{status:'interested',ignored:false,expectedRevision:0}));
  let row=await f.db.runTransaction(tx=>tx.get(path));assert.equal(row?.selectedAt,at);
  unwrap(await f.repo.save('uid-0',event,{status:'interested',ignored:true,expectedRevision:1}));
  row=await f.db.runTransaction(tx=>tx.get(path));assert.equal(row?.selectedAt,at);
  unwrap(await f.repo.save('uid-0',event,{status:'none',ignored:true,expectedRevision:2}));
  row=await f.db.runTransaction(tx=>tx.get(path));assert.equal(row?.selectedAt,undefined);
  unwrap(await f.repo.save('uid-1',event,{status:'going',ignored:true,expectedRevision:1}));
  const legacy=await f.db.runTransaction(tx=>tx.get(`event_participations/${participationKey('person-1',event)}`));
  assert.equal(legacy?.selectedAt,undefined);
});
