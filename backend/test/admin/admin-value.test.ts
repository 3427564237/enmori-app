import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import Fastify from 'fastify';
import { AdminOperations, validAuditCursor } from '../../src/admin/application/admin-operations.js';
import { RuntimeStatus } from '../../src/admin/application/runtime-status.js';
import { FirestoreAdminRepository } from '../../src/admin/infrastructure/firestore-admin-repository.js';
import { FirestoreOperationRecords, OPERATION_RETENTION_MS } from '../../src/admin/infrastructure/firestore-operation-records.js';
import { registerAdminOperations, adminSchemas } from '../../src/admin/transport/admin-routes.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import { catalogueName } from '../../src/interests/domain/catalogue-name.js';
import { FirestoreCatalogueWriter } from '../../src/interests/infrastructure/firestore-catalogue-writer.js';
import { CreateInterestTag } from '../../src/interests/application/create-interest-tag.js';
import { ManageInterestTags } from '../../src/interests/application/manage-interest-tags.js';
import { OnePaBrowseSource } from '../../src/event-browse/infrastructure/onepa-browse-source.js';
import { CombinedEventSource } from '../../src/event-browse/infrastructure/combined-event-source.js';
import type { BrowseSource } from '../../src/event-browse/ports/event-browse.js';
import { ok, err } from '../../src/shared/domain/result.js';
import { appFailure } from '../../src/shared/application/app-failure.js';
import type { FirestoreGateway } from '../../src/shared/infrastructure/firebase/firestore-gateway.js';

const principal={firebaseUid:'verified-admin'}, now=Date.parse('2026-11-11T08:00:00.000Z');
const allowed={currentAdmin:async()=> 'allowed' as const};
function fixture(store:FirestoreGateway=new InMemoryFirestoreGateway(),clock=()=>now){
  const audit=new FirestoreOperationRecords(store,clock),repo=new FirestoreAdminRepository(store,audit);
  const status=new RuntimeStatus(()=>({configured:false,available:false,maintenanceHealthy:true}),()=>[],true,()=>audit.healthy,clock);
  const app=new AdminOperations(allowed,repo,status,async()=>ok(undefined));
  return {store,audit,repo,app,status};
}
async function create(f:ReturnType<typeof fixture>,name='Arts'){
  const r=await f.app.create(principal,name);assert.equal(r.ok,true);if(!r.ok)throw Error('create failed');return r.value;
}
test('category changes and minimal audit records commit together; inactive uniqueness remains',async()=>{
  const f=fixture(),a=await create(f,'Straße');
  assert.equal((await f.app.create(principal,'STRASSE')).ok,false);
  assert.equal((await f.app.change(principal,a.eventCategoryId,{expectedRevision:1,lifecycleState:'inactive'})).ok,true);
  assert.equal((await f.app.create(principal,'STRASSE')).ok,false);
  const r=await f.app.change(principal,a.eventCategoryId,{expectedRevision:2,displayName:'Arts'});assert.equal(r.ok,true);
  const history=await f.audit.read();assert.equal(history.records.length,3);
  assert.ok(history.records.every(r=>r.actorAdminUid===principal.firebaseUid&&r.targetId===a.eventCategoryId));
  assert.ok(history.records.every(r=>!Object.hasOwn(r,'displayName')&&!Object.hasOwn(r,'body')));
  const rows=await f.repo.categories();assert.equal(rows.kind,'success');
});
test('audit persistence failure rolls back the catalogue and reservation',async()=>{
  const store=new InMemoryFirestoreGateway();
  const broken:FirestoreGateway={runTransaction:work=>store.runTransaction(tx=>work({...tx,create:(path,data)=>{
    if(path.startsWith('admin_operation_records/'))throw Error('synthetic secret failure');tx.create(path,data);
  }}))};
  const f=fixture(broken);assert.deepEqual(await f.repo.create('admin','Art','art'),{kind:'unavailable'});
  assert.deepEqual(store.entries(),[]);
});
test('original Interest create/rename/lifecycle receive verified actor and atomic history',async()=>{
  const f=fixture(),writer=new FirestoreCatalogueWriter(f.store,undefined,f.audit);
  const creator=new CreateInterestTag(allowed,writer),manager=new ManageInterestTags(allowed,writer);
  const created=await creator.execute(principal,'Music');assert.ok(created.ok);if(!created.ok)return;
  assert.ok((await manager.change(principal,created.value.interestTagId,{expectedRevision:1,displayName:'Sound'})).ok);
  assert.ok((await manager.change(principal,created.value.interestTagId,{expectedRevision:2,lifecycleState:'inactive'})).ok);
  assert.equal((await f.audit.read()).records.length,3);
  assert.deepEqual(await writer.delete(created.value.interestTagId,3),{kind:'unavailable'});
});
test('classification preserves stable IDs and source data, blocks new inactive assignments, clears with a tombstone',async()=>{
  const f=fixture(),category=await create(f),id='tm_event_'+'a'.repeat(64);
  const saved=await f.app.assign(principal,id,{expectedRevision:0,eventCategoryId:category.eventCategoryId});assert.ok(saved.ok);
  await f.app.change(principal,category.eventCategoryId,{expectedRevision:1,lifecycleState:'inactive'});
  assert.equal((await f.app.assign(principal,'another-event',{expectedRevision:0,eventCategoryId:category.eventCategoryId})).ok,false);
  assert.equal((await f.app.assign(principal,id,{expectedRevision:1,eventCategoryId:category.eventCategoryId})).ok,true);
  assert.equal((await f.repo.readMany([id])).get(id)?.lifecycleState,'inactive');
  await f.app.change(principal,category.eventCategoryId,{expectedRevision:2,displayName:'Renamed'});
  assert.equal((await f.repo.readMany([id])).get(id)?.displayName,'Renamed');
  const cleared=await f.app.assign(principal,id,{expectedRevision:1});assert.ok(cleared.ok);
  if(cleared.ok)assert.deepEqual(cleared.value,{eventId:id,revision:2});
  assert.equal((await f.app.assign(principal,id,{expectedRevision:0})).ok,false);
  assert.deepEqual((f.store as InMemoryFirestoreGateway).read(`event_category_assignments/${id}`),{revision:2});
  assert.equal((f.store as InMemoryFirestoreGateway).read(`events/${id}`),undefined);
});
test('stale revisions reject before no-op and no-op generates no duplicate history',async()=>{
  const f=fixture(),c=await create(f);
  await f.app.change(principal,c.eventCategoryId,{expectedRevision:1,lifecycleState:'inactive'});
  assert.equal((await f.app.change(principal,c.eventCategoryId,{expectedRevision:1,lifecycleState:'inactive'})).ok,false);
  assert.equal((await f.app.change(principal,c.eventCategoryId,{expectedRevision:2,lifecycleState:'inactive'})).ok,true);
  assert.equal((await f.audit.read()).records.length,2);
});
test('authorization loss during source lookup prevents classification writes',async()=>{
  const f=fixture();let access=true,reads=0;
  const app=new AdminOperations({currentAdmin:async()=>access?'allowed':'forbidden'},f.repo,f.status,async()=>{reads++;access=false;return ok(undefined);});
  const before=(f.store as InMemoryFirestoreGateway).entries();
  const result=await app.assign(principal,'event',{expectedRevision:0});
  assert.equal(result.ok,false);assert.equal(reads,1);assert.deepEqual((f.store as InMemoryFirestoreGateway).entries(),before);
  assert.equal((await app.status(principal)).ok,false);
  assert.equal((await app.records(principal)).ok,false);
});
test('unavailable/private Event does not expose existing classification',async()=>{
  const f=fixture(),app=new AdminOperations(allowed,f.repo,f.status,async()=>err(appFailure('EVENT_UNAVAILABLE')));
  const r=await app.classification(principal,'event');assert.ok(!r.ok);if(!r.ok)assert.equal(r.failure.code,'EVENT_UNAVAILABLE');
});
test('expiry boundary hides records without waiting for cleanup; cleanup removes only expired records',async()=>{
  let clock=now;const f=fixture(undefined,()=>clock);await create(f);
  clock=now+OPERATION_RETENTION_MS-1;assert.equal((await f.audit.read()).records.length,1);
  clock++;assert.equal((await f.audit.read()).records.length,0);
  assert.equal((f.store as InMemoryFirestoreGateway).entries().filter(([p])=>p.startsWith('admin_operation_records/')).length,1);
  await f.audit.cleanup();assert.equal(f.audit.healthy,true);
  assert.equal((f.store as InMemoryFirestoreGateway).entries().filter(([p])=>p.startsWith('admin_operation_records/')).length,0);
  assert.equal((await f.repo.categories()).kind,'success');
});
test('pagination is deterministic across equal timestamps, bounded and never duplicates',async()=>{
  const f=fixture();for(let i=0;i<55;i++)await create(f,`Category ${i}`);
  const first=await f.audit.read();assert.equal(first.records.length,50);assert.ok(first.nextCursor&&validAuditCursor(first.nextCursor));
  const next=await f.audit.read(first.nextCursor);assert.equal(next.records.length,5);assert.equal(next.nextCursor,undefined);
  assert.equal(new Set([...first.records,...next.records].map(r=>r.recordId)).size,55);
  for(const input of ['', 'bad!',Buffer.from('[]').toString('base64url')])assert.equal(validAuditCursor(input),false);
});
test('failed cleanup is visible as degraded maintenance and expired records stay unavailable',async()=>{
  const f=fixture({runTransaction:async()=>{throw Error('private database error');}});
  await f.audit.cleanup();assert.equal(f.audit.healthy,false);
  assert.equal(f.status.read().services[0]?.reason,'maintenance_unavailable');
  assert.equal((await f.repo.records()).kind,'unavailable');
});
test('status is passive and distinguishes unknown, stale observations and AI readiness',()=>{
  let calls=0;
  const status=new RuntimeStatus(()=>{calls++;return {configured:true,available:true,maintenanceHealthy:true};},()=>[
    {provider:'onepa',available:true,lastObservedAt:new Date(now-300001).toISOString(),lastSucceededAt:new Date(now-300001).toISOString()},
  ],true,()=>true,()=>now);
  const r=status.read();assert.equal(calls,1);
  assert.equal(r.services.find(s=>s.service==='ticketmaster')?.reason,'not_observed');
  assert.equal(r.services.find(s=>s.service==='onepa')?.reason,'stale_observation');
  assert.equal(r.services.find(s=>s.service==='ai')?.lastSucceededAt,undefined);
});
test('source initial defaults and skipped subsequent pages never fabricate observations',async()=>{
  let first=0,second=0;
  const a:BrowseSource={firstBatch:async()=>{first++;return [];},detail:async()=>undefined};
  const b:BrowseSource={firstBatch:async()=>{second++;throw Error('private error');},detail:async()=>undefined};
  const source=new CombinedEventSource(a,b);assert.deepEqual(source.observations(),[]);
  await source.batch('now',0,new AbortController().signal);const observed=source.observations();assert.equal(observed.length,2);
  await source.batch('now',1,new AbortController().signal);assert.deepEqual(source.observations(),observed);assert.equal(first,1);assert.equal(second,1);
});
test('HTTP requires current Admin and strict schemas, returns only safe fields',async t=>{
  const f=fixture();let access=true;
  const operations=new AdminOperations({currentAdmin:async()=>access?'allowed':'forbidden'},f.repo,f.status,async()=>ok(undefined));
  const app=Fastify({ajv:{customOptions:{removeAdditional:false}}});app.decorateRequest('authPrincipal',null);
  await registerAdminOperations(app,{verifyIdToken:async()=>({kind:'verified',principal})},operations);t.after(()=>app.close());
  const headers={authorization:'Bearer synthetic'},path='/v1/admin/event-categories';
  assert.equal((await app.inject({url:path})).statusCode,401);
  assert.equal((await app.inject({url:path+'?unknown=true',headers})).statusCode,400);
  assert.equal((await app.inject({method:'POST',url:path,headers,payload:{displayName:'Art',actor:'other'}})).statusCode,400);
  const r=await app.inject({method:'POST',url:path,headers,payload:{displayName:'Art'}});assert.equal(r.statusCode,201);assert.equal(r.headers['cache-control'],'no-store');
  const id=r.json().eventCategory.eventCategoryId;
  assert.equal((await app.inject({method:'PATCH',url:`${path}/${id}`,headers,payload:{expectedRevision:1,displayName:'New',lifecycleState:'inactive'}})).statusCode,400);
  assert.equal((await app.inject({url:'/v1/admin/operation-records?cursor=bad',headers})).statusCode,400);
  access=false;
  for(const url of [path,'/v1/admin/operations-status','/v1/admin/operation-records','/v1/admin/events/example/category'])assert.equal((await app.inject({url,headers})).statusCode,403);
});
test('new normative OpenAPI bodies and response schemas exactly match Transport',async()=>{
  const api=JSON.parse(await readFile('api/openapi.json','utf8'));
  for(const [method,path,key,status] of [
    ['get','/v1/admin/operations-status','status',200],['get','/v1/admin/event-categories','categories',200],['post','/v1/admin/event-categories','create',201],
    ['patch','/v1/admin/event-categories/{eventCategoryId}','change',200],['get','/v1/admin/events/{eventId}/category','classification',200],['put','/v1/admin/events/{eventId}/category','assign',200],['get','/v1/admin/operation-records','records',200],
  ] as const){
    const schema=adminSchemas[key];const operation=api.paths[path][method];
    assert.deepEqual(operation.responses[status].content['application/json'].schema,schema.response[status as keyof typeof schema.response]);
    if('body' in schema)assert.deepEqual(operation.requestBody.content['application/json'].schema,schema.body);
  }
});

test('onePA cached catalogue does not fabricate a fresh successful provider observation',async()=>{
  let reads=0;
  const onepa=new OnePaBrowseSource(()=>true,undefined,async()=>{reads++;return [];});
  const tm:BrowseSource={firstBatch:async()=>[],detail:async()=>undefined};
  const combined=new CombinedEventSource(tm,onepa),signal=new AbortController().signal;
  await combined.batch(new Date(now).toISOString(),0,signal);
  const first=combined.observations().find(o=>o.provider==='onepa');assert.ok(first);
  await new Promise(resolve=>setTimeout(resolve,5));
  await combined.batch(new Date(now+1).toISOString(),0,signal);
  assert.equal(reads,1);
  assert.deepEqual(combined.observations().find(o=>o.provider==='onepa'),first);
});

test('HTTP Event projection preserves provider labels and cannot bypass existing read authority', async t=>{
  const {EventBrowse}=await import('../../src/event-browse/application/event-browse.js');
  const {registerEventBrowseRoutes}=await import('../../src/event-browse/transport/register-routes.js');
  const {registerIsolatedSlices}=await import('../../src/transport/register-isolated-slices.js');
  const {GetEventDetail}=await import('../../src/event-detail/application/get-event-detail.js');
  const {browseId}=await import('../../src/event-browse/domain/browse-values.js');
  const {sourceEventId}=await import('../../src/event-browse/domain/source-event-id.js');
  const f=fixture(),c=await create(f),locator=browseId('managed-category-fixture')!,eventId=sourceEventId(locator);
  await f.app.assign(principal,eventId,{expectedRevision:0,eventCategoryId:c.eventCategoryId});
  let access=true,projectionReads=0,broken=false;
  const projection={readMany:async(ids:readonly string[])=>{projectionReads++;if(broken)throw Error('private failure');return f.repo.readMany(ids);}};
  const row={browseId:locator,eventId,title:'Synthetic event',startAt:'2026-12-01T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/synthetic',categoryLabel:'Source music'};
  const source:BrowseSource={firstBatch:async()=>[row],detail:async()=>row};
  const browse=new EventBrowse({verify:async()=>access?ok(undefined):err(appFailure('SERVICE_UNAVAILABLE'))},source,()=>new Date(now),true);
  const detail=new GetEventDetail({read:async()=>access?ok({eventId,title:row.title,startAt:row.startAt,externalSourceUrl:row.externalSourceUrl,categoryLabel:row.categoryLabel}):err('event_unavailable')});
  const server=Fastify();server.decorateRequest('authPrincipal',null);t.after(()=>server.close());
  const identity={verifyIdToken:async()=>({kind:'verified' as const,principal})};
  await registerEventBrowseRoutes(server,identity,browse,projection);
  await registerIsolatedSlices(server,identity,undefined,detail,undefined,projection);
  const headers={authorization:'Bearer synthetic','x-enmori-contract-version':'3'};
  const result=await server.inject({url:`/v1/events/${eventId}`,headers});
  assert.equal(result.statusCode,200);assert.equal(result.json().event.categoryLabel,'Source music');assert.equal(result.json().event.managedCategory.displayName,'Arts');
  const list=await server.inject({url:'/v1/event-browse',headers});assert.equal(list.statusCode,200);assert.equal(list.json().items[0].managedCategory.eventCategoryId,c.eventCategoryId);
  broken=true;assert.equal((await server.inject({url:`/v1/events/${eventId}`,headers})).statusCode,503);
  const before=projectionReads;access=false;
  assert.equal((await server.inject({url:`/v1/events/${eventId}`,headers})).statusCode,404);
  assert.equal((await server.inject({url:'/v1/event-browse',headers})).statusCode,503);
  assert.equal(projectionReads,before);
});
