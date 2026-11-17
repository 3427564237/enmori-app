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
function fake(provide:(query:string,offset:number)=>readonly Emission[],options:{missingLinks?:boolean;documentStatus?:number;renderedQuery?:string}={}) {
  let closed=0,pages=0,next=0;
  const requests:{query:string;offset:number}[]=[],rendered:string[][]=[];
  const rejectors=new Set<(error:Error)=>void>();
  const browser={
    newContext:async()=>({route:async()=>{},newPage:async()=>{
      pages++;
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
        waitForResponse:(match:typeof predicate)=>{predicate=match;return new Promise<Response>((yes,no)=>{resolve=yes;reject=no;rejectors.add(no);});},
        goto:async(value:string)=>{url=value;query=new URL(value).searchParams.get('events')??'';offset=0;
          if((options.documentStatus??200)<400)emit();return {status:()=>options.documentStatus??200};},
        url:()=>options.renderedQuery===undefined?url:`https://www.onepa.gov.sg/events/search?events=${options.renderedQuery}&page=1`,
        getByRole:(role:string,selector:{name:string;exact:boolean})=>{
          assert.equal(role,'link');assert.deepEqual(selector,{name:'Next Page',exact:true});
          return {click:async()=>{next++;offset+=10;const parsed=new URL(url);parsed.searchParams.set('page',String(offset/10+1));url=parsed.toString();emit();}};
        },
        waitForFunction:async(_fn:unknown,ids:string[])=>{rendered.push(ids);},
        locator:()=>({evaluateAll:async()=>options.missingLinks?[]:(shown?.content??[]).map(p=>`https://www.onepa.gov.sg/events/synthetic-${p.id.slice(9)}`)}),
      };
    }}),
    close:async()=>{closed++;for(const reject of rejectors)reject(Error('Browser closed'));},
  } as unknown as Browser;
  return {browser,launch:async()=>browser,state:()=>({closed,pages,next,requests,rendered})};
}
const emptyQueries=(query:string,offset:number):readonly Emission[]=>[{grid:query?grid(0,0):grid(offset)}];

test('default pages and every fixed public search complete on four reused pages, with a 190-record raw bound',async()=>{
  const f=fake((query,offset)=>[{grid:grid(offset,query?100:100,query?20000000+ONEPA_INTEREST_RULES.findIndex(r=>r.query===query)*100:10000000)}]);
  let receipt:OnePaCatalogueDiagnostics|undefined;
  const rows=await readOnePaCatalogue(new AbortController().signal,f.launch,value=>{receipt=value;});
  assert.equal(rows.length,190);assert.equal(f.state().pages,4);assert.equal(f.state().next,4);assert.equal(f.state().closed,1);
  assert.equal(f.state().requests.filter(r=>r.query==='').length,5);
  assert.deepEqual(f.state().requests.filter(r=>r.query).map(r=>r.query).sort(),ONEPA_INTEREST_RULES.map(r=>r.query).sort());
  assert.ok(f.state().requests.filter(r=>r.query).every(r=>r.offset===0));
  assert.equal(receipt?.completedTasks,15);assert.equal(receipt?.rawRecords,190);assert.equal(receipt?.uniqueRecords,190);
  assert.equal(receipt?.outcome,'complete');
});

test('empty and short official first pages complete normally without a fabricated next page',async()=>{
  const f=fake((query,offset)=>[{grid:query==='cooking'?grid(0,7,20000000):query?grid(0,0):grid(offset,0)}]);
  const rows=await readOnePaCatalogue(new AbortController().signal,f.launch);
  assert.equal(rows.length,7);assert.equal(f.state().next,0);assert.equal(f.state().requests.length,15);
});

test('an exact old default page is ignored, while another keyword never supplies a current worker result',async()=>{
  const f=fake((query,offset)=>query?[{grid:grid(0,10),query:'unrelated'},{grid:grid(0,0)}]
    :offset===0?[{grid:grid(0)}]:[{grid:grid(0)},{grid:grid(10)}]);
  const rows=await readOnePaCatalogue(new AbortController().signal,f.launch);
  assert.equal(rows.length,20);assert.equal(f.state().next,1);
});

test('document/search refusal in any required task discards every other task and closes once',async()=>{
  for(const status of [403,429,503]){
    const denied=fake(emptyQueries,{documentStatus:status});
    await assert.rejects(readOnePaCatalogue(new AbortController().signal,denied.launch),/Source unavailable/);
    assert.equal(denied.state().closed,1);
    const failed=fake((query,offset)=>[{grid:query?grid(0,0):grid(offset),...(query==='cooking'?{status}:{})}]);
    let receipt:OnePaCatalogueDiagnostics|undefined;
    await assert.rejects(readOnePaCatalogue(new AbortController().signal,failed.launch,value=>{receipt=value;}),/Source unavailable/);
    assert.equal(failed.state().closed,1);assert.equal(receipt?.outcome,'unavailable');assert.equal(receipt?.uniqueRecords,0);
  }
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
  const source=new OnePaBrowseSource(()=>true,async()=>{throw Error('No per-card fan-out');},async()=>{reads++;return records;});
  const ids:string[]=[];let page=0;
  for(;;){const batch=await source.batch('2026-11-17T00:00:00.000Z',page,new AbortController().signal);
    assert.ok(batch.items.length<=20);ids.push(...batch.items.map(row=>row.browseId));
    if(batch.nextPage===undefined)break;page=batch.nextPage;
  }
  assert.equal(ids.length,190);assert.equal(new Set(ids).size,190);assert.equal(reads,1);
  const excessive=new OnePaBrowseSource(()=>true,async()=>'',async()=>[...records,item(10000999)]);
  await assert.rejects(excessive.firstBatch('2026-11-17T00:00:00.000Z',new AbortController().signal),/Source unavailable/);
});
