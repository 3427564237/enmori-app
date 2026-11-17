import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import type { Browser, Response } from 'playwright';
import { readOnePaCatalogue, mergeOnePaCatalogue, type OnePaCatalogueDiagnostics } from '../../src/event-browse/infrastructure/onepa-public-catalogue.js';
import { ONEPA_INTEREST_RULES } from '../../src/event-browse/domain/onepa-interest-classification.js';
import { OnePaBrowseSource } from '../../src/event-browse/infrastructure/onepa-browse-source.js';

function grid(offset=0,total=20,base=10000000) {
  const count=Math.min(10,Math.max(0,total-offset));
  return {entity:'product',type:'content_grid',offset,limit:count,total_item:total,
    content:Array.from({length:count},(_,i)=>({id:`PA-Event-${base+offset+i}`,name:'Synthetic event',active:true}))};
}
type Grid=ReturnType<typeof grid>;
type Emission={grid:unknown;query?:string;skip?:number;take?:number;status?:number;delay?:Promise<void>};
function fake(provide:(query:string,offset:number)=>readonly Emission[],options:{missingLinks?:boolean|((query:string)=>boolean);documentStatus?:number|((query:string)=>number);renderedQuery?:string}={}) {
  let closed=0,pages=0,next=0,activePages=0,maxActivePages=0,pageClosures=0;
  const requests:{query:string;offset:number}[]=[],rendered:string[][]=[];
  const rejectors=new Set<(error:Error)=>void>();
  const browser={
    newContext:async()=>({route:async()=>{},newPage:async()=>{
      pages++;activePages++;maxActivePages=Math.max(maxActivePages,activePages);
      let pageClosed=false;
      const ownRejectors=new Set<(error:Error)=>void>();
      let url='about:blank',query='',offset=0,shown:Grid|undefined;
      let predicate!:(response:Response)=>boolean|Promise<boolean>;
      let resolve!:(response:Response)=>void,reject!:(error:Error)=>void;
      const emit=()=>{
        requests.push({query,offset});
        const values=provide(query,offset),match=predicate,yes=resolve,no=reject;
        for(const value of values){
          const raw=value.grid as Grid;
          if((value.query??query)===query&&raw.offset===offset)shown=raw;
          const response={url:()=> 'https://www.onepa.gov.sg/-api/search/query',status:()=>value.status??201,
            request:()=>({postDataJSON:()=>({searchKeyword:value.query??query,pagination:{skip:value.skip??raw.offset,take:value.take??10}})}),
            body:async()=>{if(value.delay)await value.delay;return Buffer.from(JSON.stringify({widgets:[value.grid]}));},
          } as unknown as Response;
          void Promise.resolve(match(response)).then(matches=>{if(matches)yes(response);},no);
        }
      };
      return {
        waitForResponse:(match:typeof predicate)=>{predicate=match;return new Promise<Response>((yes,no)=>{resolve=yes;reject=no;rejectors.add(no);ownRejectors.add(no);});},
        close:async()=>{if(pageClosed)return;pageClosed=true;activePages--;pageClosures++;for(const reject of ownRejectors)reject(Error('Page closed'));},
        goto:async(value:string)=>{url=value;query=new URL(value).searchParams.get('events')??'';offset=0;
          const status=typeof options.documentStatus==='function'?options.documentStatus(query):options.documentStatus??200;
          if(status<400)emit();return {status:()=>status};},
        url:()=>options.renderedQuery===undefined?url:`https://www.onepa.gov.sg/events/search?events=${options.renderedQuery}&page=1`,
        getByRole:(role:string,selector:{name:string;exact:boolean})=>{
          assert.equal(role,'link');assert.deepEqual(selector,{name:'Next Page',exact:true});
          return {click:async()=>{next++;offset+=10;const parsed=new URL(url);parsed.searchParams.set('page',String(offset/10+1));url=parsed.toString();emit();}};
        },
        waitForFunction:async(_fn:unknown,ids:string[])=>{rendered.push(ids);},
        locator:()=>({evaluateAll:async()=>(typeof options.missingLinks==='function'?options.missingLinks(query):options.missingLinks)?[]:(shown?.content??[]).map(p=>`https://www.onepa.gov.sg/events/synthetic-${p.id.slice(9)}`)}),
      };
    }}),
    close:async()=>{closed++;for(const reject of rejectors)reject(Error('Browser closed'));},
  } as unknown as Browser;
  return {browser,launch:async()=>browser,state:()=>({closed,pages,next,requests,rendered,maxActivePages,pageClosures})};
}
const emptyQueries=(query:string,offset:number):readonly Emission[]=>[{grid:query?grid(0,0):grid(offset)}];

test('default pages and every fixed public search complete on four reused pages, with a 190-record raw bound',async()=>{
  const f=fake((query,offset)=>[{grid:grid(offset,query?100:100,query?20000000+ONEPA_INTEREST_RULES.findIndex(r=>r.query===query)*100:10000000)}]);
  let receipt:OnePaCatalogueDiagnostics|undefined;
  const {items:rows,complete}=await readOnePaCatalogue(new AbortController().signal,f.launch,value=>{receipt=value;});
  assert.equal(complete,true);
  assert.equal(rows.length,190);assert.equal(f.state().pages,4);assert.equal(f.state().next,4);assert.equal(f.state().closed,1);
  assert.equal(f.state().requests.filter(r=>r.query==='').length,5);
  assert.deepEqual(f.state().requests.filter(r=>r.query).map(r=>r.query).sort(),ONEPA_INTEREST_RULES.map(r=>r.query).sort());
  assert.ok(f.state().requests.filter(r=>r.query).every(r=>r.offset===0));
  assert.equal(receipt?.completedTasks,15);assert.equal(receipt?.rawRecords,190);assert.equal(receipt?.uniqueRecords,190);
  assert.equal(receipt?.outcome,'complete');
});

test('empty and short official first pages complete normally without a fabricated next page',async()=>{
  const f=fake((query,offset)=>[{grid:query==='cooking'?grid(0,7,20000000):query?grid(0,0):grid(offset,0)}]);
  const {items:rows,complete}=await readOnePaCatalogue(new AbortController().signal,f.launch);
  assert.equal(complete,true);
  assert.equal(rows.length,7);assert.equal(f.state().next,0);assert.equal(f.state().requests.length,15);
});

test('an exact old default page is ignored, while another keyword never supplies a current worker result',async()=>{
  const f=fake((query,offset)=>query?[{grid:grid(0,10),query:'unrelated'},{grid:grid(0,0)}]
    :offset===0?[{grid:grid(0)}]:[{grid:grid(0)},{grid:grid(10)}]);
  const {items:rows}=await readOnePaCatalogue(new AbortController().signal,f.launch);
  assert.equal(rows.length,20);assert.equal(f.state().next,1);
});

test('required default failure discards every other task; supplemental refusal isolates its group without retry',async()=>{
  for(const status of [403,429,503]){
    const denied=fake(emptyQueries,{documentStatus:status});
    await assert.rejects(readOnePaCatalogue(new AbortController().signal,denied.launch),/Source unavailable/);
    assert.equal(denied.state().closed,1);
    const failed=fake((query,offset)=>[{grid:query?grid(0,0):grid(offset),...(query==='cooking'?{status}:{})}]);
    let receipt:OnePaCatalogueDiagnostics|undefined;
    const catalogue=await readOnePaCatalogue(new AbortController().signal,failed.launch,value=>{receipt=value;});
    assert.equal(catalogue.complete,false);assert.equal(catalogue.items.length,20);
    assert.equal(failed.state().closed,1);assert.equal(receipt?.outcome,'partial');assert.equal(receipt?.uniqueRecords,20);
    assert.equal(receipt?.completedTasks,14);assert.equal(receipt?.failedTasks,1);assert.equal(receipt?.settledTasks,15);
    assert.equal(receipt?.tasks.find(task=>task.index===6)?.status,'failed');
    assert.equal(failed.state().maxActivePages,4);assert.equal(failed.state().pageClosures,1);
    assert.deepEqual(failed.state().requests.filter(r=>r.query).map(r=>r.query).sort(),ONEPA_INTEREST_RULES.map(r=>r.query).sort());
  }
});

test('a malformed supplemental group publishes none of its rows while the remaining fixed queries complete',async()=>{
  const broken=grid(0,10,20000000);broken.content[1]!.id=broken.content[0]!.id;
  const f=fake((query,offset)=>[{grid:query==='cooking'?broken:query==='dance'?grid(0,7,30000000):query?grid(0,0):grid(offset)}]);
  const result=await readOnePaCatalogue(new AbortController().signal,f.launch);
  assert.equal(result.complete,false);assert.equal(result.items.length,27);
  assert.ok(result.items.every(row=>!(row.product as any).ID.startsWith('PA-Event-2000')));
});

test('supplemental navigation refusal and missing official links each discard the whole query group',async()=>{
  for(const options of [{documentStatus:(query:string)=>query==='cooking'?403:200},{missingLinks:(query:string)=>query==='cooking'}]){
    const f=fake((query,offset)=>[{grid:query==='cooking'?grid(0,7,20000000):query?grid(0,0):grid(offset)}],options);
    const result=await readOnePaCatalogue(new AbortController().signal,f.launch);
    assert.equal(result.complete,false);assert.equal(result.items.length,20);
    assert.equal(f.state().maxActivePages,4);assert.equal(f.state().pageClosures,1);
  }
});

test('all supplemental groups may fail while the required default group stays complete and coverage stays partial',async()=>{
  const f=fake((query,offset)=>[{grid:query?grid(0,0):grid(offset),...(query?{status:403}:{})}]);
  let receipt:OnePaCatalogueDiagnostics|undefined;
  const result=await readOnePaCatalogue(new AbortController().signal,f.launch,value=>{receipt=value;});
  assert.equal(result.complete,false);assert.equal(result.items.length,20);
  assert.equal(receipt?.completedTasks,1);assert.equal(receipt?.failedTasks,14);assert.equal(receipt?.settledTasks,15);
  assert.equal(f.state().maxActivePages,4);assert.equal(f.state().requests.length,16);
});

test('a conflicting identity across successful groups remains fatal even when another query failed',async()=>{
  const conflict=grid(0,10);conflict.content[0]!.name='Conflicting title';
  const f=fake((query,offset)=>[{grid:query==='dance'?conflict:query?grid(0,0):grid(offset),...(query==='game'?{status:403}:{})}]);
  await assert.rejects(readOnePaCatalogue(new AbortController().signal,f.launch),/Source identity conflict/);
});

test('a supplemental stage timeout is isolated and its page is closed before another fixed query uses the worker',async()=>{
  const f=fake((query,offset)=>{
    if(query==='book')throw Object.assign(Error('Synthetic stage timeout'),{name:'TimeoutError'});
    return emptyQueries(query,offset);
  });
  const result=await readOnePaCatalogue(new AbortController().signal,f.launch);
  assert.equal(result.complete,false);assert.equal(result.items.length,20);
  assert.equal(f.state().requests.filter(request=>request.query==='book').length,1);
  assert.equal(f.state().requests.filter(request=>request.query).length,14);
  assert.equal(f.state().pageClosures,1);assert.equal(f.state().maxActivePages,4);
});

test('a later required default page failure cannot publish otherwise successful supplementary groups',async()=>{
  const f=fake((query,offset)=>[{grid:query?grid(0,7,20000000):grid(offset),...(!query&&offset===10?{status:503}:{})}]);
  let receipt:OnePaCatalogueDiagnostics|undefined;
  await assert.rejects(readOnePaCatalogue(new AbortController().signal,f.launch,value=>{receipt=value;}),/Source unavailable/);
  assert.equal(receipt?.outcome,'unavailable');assert.equal(receipt?.uniqueRecords,0);
  assert.equal(receipt?.tasks[0]?.status,'failed');
});

test('malformed, truncated and uncorrelated current pages fail rather than becoming partial success',async()=>{
  const duplicate=grid(0);duplicate.content[1]!.id=duplicate.content[0]!.id;
  const invalid=grid(0);invalid.content[0]!.id='not-an-event';
  for(const emission of [
    {grid:duplicate},{grid:invalid},{grid:{...grid(0),limit:20}},
    {grid:{...grid(0),total_item:'20'}},{grid:{...grid(0,7),total_item:8}},
    {grid:grid(0),skip:10},{grid:grid(0),take:20},
  ]){
    const f=fake((query,offset)=>query?[{grid:grid(0,0)}]:offset===0?[emission]:[{grid:grid(offset)}]);
    await assert.rejects(readOnePaCatalogue(new AbortController().signal,f.launch),/Source format changed/);
    assert.equal(f.state().closed,1);
  }
});

test('changed old pages or an unexpected later offset cannot be substituted for the requested page',async()=>{
  const changed=grid(0);changed.content[0]!.name='Changed synthetic event';
  for(const wrong of [changed,grid(20,30)]){
    const f=fake((query,offset)=>query?[{grid:grid(0,0)}]:offset===0?[{grid:grid(0)}]:[{grid:wrong},{grid:grid(10)}]);
    await assert.rejects(readOnePaCatalogue(new AbortController().signal,f.launch),/Source format changed/);
  }
});

test('current source IDs require matching official rendered links and the exact rendered query',async()=>{
  for(const options of [{missingLinks:true},{renderedQuery:'different'}]){
    const f=fake(emptyQueries,options);
    await assert.rejects(readOnePaCatalogue(new AbortController().signal,f.launch),/Source (identity unavailable|format changed)/);
    assert.equal(f.state().closed,1);
  }
});

test('cancellation during a waiting page retires all partial work and prevents late completion',async()=>{
  const f=fake((query,offset)=>query?[{grid:grid(0,0)}]:[{grid:grid(0)}]),caller=new AbortController();
  const work=readOnePaCatalogue(caller.signal,f.launch);
  while(f.state().next===0)await setImmediate();caller.abort();
  await assert.rejects(work,/Source unavailable/);assert.equal(f.state().closed,1);
});

test('the shared 180-second timer starts before browser launch and closes a late launcher',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fake(emptyQueries);let release!:(browser:Browser)=>void;
  const launched=new Promise<Browser>(resolve=>{release=resolve;});
  const work=readOnePaCatalogue(new AbortController().signal,()=>launched);await Promise.resolve();
  const rejected=assert.rejects(work,/Source unavailable/);t.mock.timers.tick(180000);await rejected;
  release(f.browser);await setImmediate();assert.equal(f.state().closed,1);assert.equal(f.state().pages,0);
});

for(const cancellation of ['deadline','caller'] as const)test(`a completed default group cannot publish before every query settles or after ${cancellation}`,async t=>{
  if(cancellation==='deadline')t.mock.timers.enable({apis:['setTimeout']});
  const f=fake((query,offset)=>query==='cooking'?[]:emptyQueries(query,offset)),caller=new AbortController();
  let receipt:OnePaCatalogueDiagnostics|undefined;
  const work=readOnePaCatalogue(caller.signal,f.launch,value=>{receipt=value;});
  let published=false;void work.then(()=>{published=true;},()=>{});
  while(f.state().requests.length<16)await setImmediate();
  await setImmediate();assert.equal(published,false);
  const rejected=assert.rejects(work,/Source unavailable/);
  if(cancellation==='deadline')t.mock.timers.tick(180000);else caller.abort();
  await rejected;
  assert.equal(receipt?.outcome,'unavailable');assert.equal(receipt?.completedTasks,14);
  assert.equal(receipt?.settledTasks,14);assert.equal(receipt?.cancelledTasks,1);
  assert.equal(receipt?.uniqueRecords,0);assert.equal(f.state().closed,1);
});

test('a slow malformed response cannot lose to a later valid response for the same query and offset',async()=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const bad=grid(0);bad.content[0]!.id='invalid';
  const f=fake((query,offset)=>query?[{grid:grid(0,0)}]:[{grid:bad,delay:gate},{grid:grid(offset)}]);
  const work=readOnePaCatalogue(new AbortController().signal,f.launch);void setImmediate().then(release);
  try{await assert.rejects(work,/Source format changed/);}finally{release();}
});

function item(id=34316958,published:unknown=true){
  return {product:{ID:`PA-Event-${id}`,Name:'Synthetic Cooking Demo',Active:true,xp:{
    Private:0,Published:published,InvitationOnly:0,UsePassword:0,ProductType:'Event',Timezone:'8.0',
    Event:{Id:id},StartDate:'2026-11-28T11:00:00+00:00',EndDate:'2026-11-28T13:00:00+00:00',
  }},url:`https://www.onepa.gov.sg/events/synthetic-${id}`};
}
test('deduplication normalizes explicit publication and presentation while rejecting real source conflicts',()=>{
  const a=item(),b={...item(34316958,1),url:'https://www.onepa.gov.sg/events/another-slug-e34316958'};
  (b.product as Record<string,unknown>).searchScore=99;
  assert.equal(mergeOnePaCatalogue([[a],[b]]).length,1);
  for(const changed of [
    {...b,product:{...b.product,Name:'Another event'}},
    {...b,product:{...b.product,xp:{...b.product.xp,Private:1}}},
    {...b,product:{...b.product,xp:{...b.product.xp,StartDate:'2026-11-29T11:00:00+00:00'}}},
    {...b,product:{...b.product,Description:'Changed description'}},
  ])assert.throws(()=>mergeOnePaCatalogue([[a],[changed]]),/Source identity conflict/);
  assert.throws(()=>mergeOnePaCatalogue([Array.from({length:191},(_,i)=>item(10000000+i))]),/Source format changed/);
});

test('the actual browse adapter serves all 190 unique records, reuses the completed cache and rejects 191',async()=>{
  let reads=0;
  const records=Array.from({length:190},(_,i)=>item(10000000+i));
  const source=new OnePaBrowseSource(()=>true,async()=>{throw Error('No per-card fan-out');},async()=>{reads++;return {items:records,complete:true};});
  const ids:string[]=[];let page=0;
  for(;;){const batch=await source.batch('2026-11-17T00:00:00.000Z',page,new AbortController().signal);
    assert.ok(batch.items.length<=20);ids.push(...batch.items.map(row=>row.browseId));
    assert.deepEqual(batch.sourceStatus,[{provider:'onepa',available:true}]);
    assert.deepEqual(batch.sourceCoverage,[{provider:'onepa',complete:true}]);
    if(batch.nextPage===undefined)break;page=batch.nextPage;
  }
  assert.equal(ids.length,190);assert.equal(new Set(ids).size,190);assert.equal(reads,1);
  const excessive=new OnePaBrowseSource(()=>true,async()=>'',async()=>({items:[...records,item(10000999)],complete:true}));
  await assert.rejects(excessive.firstBatch('2026-11-17T00:00:00.000Z',new AbortController().signal),/Source unavailable/);
});

test('partial catalogue rows and coverage share one five-minute cache generation without query retries',async t=>{
  t.mock.timers.enable({apis:['Date']});
  let reads=0,complete=false;
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{reads++;return {items:Array.from({length:25},(_,i)=>item(10000000+i)),complete};});
  const signal=new AbortController().signal,asOf='2026-11-17T00:00:00.000Z';
  const first=await source.batch(asOf,0,signal);complete=true;
  const second=await source.batch(asOf,1,signal);
  assert.equal(reads,1);assert.equal(first.items.length,20);assert.equal(second.items.length,5);
  assert.deepEqual(first.sourceCoverage,[{provider:'onepa',complete:false}]);
  assert.deepEqual(second.sourceCoverage,first.sourceCoverage);assert.ok(Object.isFrozen(second.sourceCoverage));
  t.mock.timers.tick(300001);
  const refreshed=await source.batch(asOf,0,signal);
  assert.equal(reads,2);assert.deepEqual(refreshed.sourceCoverage,[{provider:'onepa',complete:true}]);
  assert.deepEqual(first.sourceCoverage,[{provider:'onepa',complete:false}]);
});

test('a catalogue without explicit boolean completeness cannot claim coverage or publish rows',async()=>{
  for(const complete of [undefined,null,'false',1]){
    const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>({items:[item()],complete}) as any);
    await assert.rejects(source.batch('2026-11-17T00:00:00.000Z',0,new AbortController().signal),/Source unavailable/);
  }
});
