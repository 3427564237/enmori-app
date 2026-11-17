/// <reference lib="dom" />
import { chromium, type Browser, type Page, type Response } from 'playwright';
import { isDeepStrictEqual } from 'node:util';
import { permittedBrowserResource, plain } from './public-event-pages.js';
import { ONEPA_INTEREST_RULES } from '../domain/onepa-interest-classification.js';

export interface OnePaListItem { readonly product: unknown; readonly url: string }
export interface OnePaCatalogueDiagnostics {
  readonly outcome: 'complete'|'unavailable';
  readonly elapsedMs: number;
  readonly completedTasks: number;
  readonly rawRecords: number;
  readonly uniqueRecords: number;
  readonly tasks: readonly { readonly index: number; readonly records: number; readonly elapsedMs: number }[];
}
interface SearchGrid {
  readonly offset: number;
  readonly limit: number;
  readonly total_item: number;
  readonly content: readonly { id: string; [key: string]: any }[];
}
const origin='https://www.onepa.gov.sg';
const unavailable=()=>Error('Source unavailable');
const changed=()=>Error('Source format changed');
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);

async function searchGrid(response: Response): Promise<SearchGrid> {
  const payload=await response.body();
  if(payload.length>2_500_000)throw Error('Source too large');
  const raw=JSON.parse(payload.toString('utf8'));
  const grids=Array.isArray(raw?.widgets)?raw.widgets.filter((w:any)=>w?.entity==='product'&&w?.type==='content_grid'):[];
  const grid=grids[0];
  if(grids.length!==1||!Number.isSafeInteger(grid.offset)||grid.offset<0||grid.offset%10!==0||
    !Number.isSafeInteger(grid.limit)||grid.limit<0||grid.limit>10||
    !Number.isSafeInteger(grid.total_item)||grid.total_item<0||grid.offset>grid.total_item||
    !Array.isArray(grid.content)||grid.content.length>grid.limit||
    grid.content.length!==Math.min(10,grid.total_item-grid.offset)||
    (grid.limit!==10&&grid.limit!==grid.content.length)||
    grid.content.some((p:any)=>!object(p)||typeof p.id!=='string'||!/^PA-Event-\d+$/.test(p.id))||
    new Set(grid.content.map((p:any)=>p.id)).size!==grid.content.length)throw changed();
  return grid;
}

/** Only authoritative fields used by the projection enter deduplication.
 * Search rank/highlights, request timestamps and URL slug aliases are presentation. */
function canonical(item: OnePaListItem): unknown {
  const p=object(item.product)?item.product:{};
  const xp=object(p.xp)?p.xp:{};
  const text=(value:unknown)=>plain(value)??value;
  return {id:p.ID,title:text(p.Name),active:p.Active,description:text(p.Description),
    private:xp.Private,published:xp.Published===true?1:xp.Published,invitationOnly:xp.InvitationOnly,
    usePassword:xp.UsePassword,type:xp.ProductType,timezone:xp.Timezone,eventId:xp.Event?.Id,
    start:xp.StartDate,end:xp.EndDate,cancelled:xp.Cancelled,deadline:xp.TicketEndDate,
    descriptionFull:text(xp.XmcDescription),summary:text(xp.SummaryBox),venue:text(xp.Venue),
    xmcVenue:text(xp.XmcVenue),address:text(xp.Address),latitude:xp.MapLat,longitude:xp.MapLng,
    organizer:text(xp.Outlet?.Name)};
}
export function mergeOnePaCatalogue(batches: readonly (readonly OnePaListItem[])[]): readonly OnePaListItem[] {
  const rows=new Map<string,{item:OnePaListItem;canonical:unknown}>();
  let rawCount=0;
  for(const batch of batches)for(const item of batch){
    if(++rawCount>190)throw changed();
    const id=object(item.product)?item.product.ID:undefined;
    if(typeof id!=='string'||!/^PA-Event-\d+$/.test(id))throw changed();
    const value=canonical(item),previous=rows.get(id);
    if(previous&&!isDeepStrictEqual(previous.canonical,value))throw Error('Source identity conflict');
    if(!previous)rows.set(id,{item,canonical:value});
  }
  return [...rows.values()].map(({item})=>item);
}

/** One anonymous browser, four pages, default five pages plus fourteen fixed
 * first-page searches. All work including launch shares one 180-second budget.
 * Nothing is published until every required task has completed successfully. */
export async function readOnePaCatalogue(
  signal: AbortSignal,
  launch: () => Promise<Browser> = () => chromium.launch({headless:false,args:['--start-minimized'],timeout:30000}),
  onDiagnostics?: (value: OnePaCatalogueDiagnostics) => void,
): Promise<readonly OnePaListItem[]> {
  if(signal.aborted)throw unavailable();
  const started=performance.now();
  let browser:Browser|undefined,closing:Promise<void>|undefined,stopped=false;
  let interrupt!:(reason:unknown)=>void;
  const interrupted=new Promise<never>((_,reject)=>{interrupt=reject;});
  void interrupted.catch(()=>{});
  const close=()=>{
    if(!browser)return Promise.resolve();
    return closing??=browser.close().catch(()=>{});
  };
  const stop=(reason:unknown=unavailable())=>{
    if(stopped)return;
    stopped=true;interrupt(reason);void close();
  };
  const abort=()=>stop();
  signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,180000);
  const current=()=>{if(stopped||signal.aborted||performance.now()-started>=180000){stop();throw unavailable();}};
  const within=async<T>(work:Promise<T>):Promise<T>=>{
    void work.catch(()=>{});current();const value=await Promise.race([work,interrupted]);current();return value;
  };
  let outcome:OnePaCatalogueDiagnostics['outcome']='unavailable',rawRecords=0,uniqueRecords=0;
  const taskStats:{index:number;records:number;elapsedMs:number}[]=[];
  const running:Promise<unknown>[]=[];
  try {
    current();
    const launched=Promise.resolve().then(()=>{current();return launch();}).then(value=>{
      browser=value;if(stopped)void close();return value;
    });
    browser=await within(launched);
    const context=await within(browser.newContext({serviceWorkers:'block',acceptDownloads:false}));
    await within(context.route('**/*',route=>{
      const request=route.request();
      return !permittedBrowserResource(request.url(),request.isNavigationRequest()&&request.frame().parentFrame()===null)||
        ['image','media','font'].includes(request.resourceType())?route.abort():route.continue();
    }));
    const pages=await within(Promise.all(Array.from({length:4},()=>context.newPage())));

    const readTask=async(page:Page,query:string,taskIndex:number,maxPages:number):Promise<readonly OnePaListItem[]>=>{
      const taskStarted=performance.now(),result:OnePaListItem[]=[],completed=new Map<number,SearchGrid>();
      let total:number|undefined;
      const response=(offset:number)=>{
        const observed=new WeakMap<Response,SearchGrid>();
        let validation=Promise.resolve(false);
        const pending=page.waitForResponse(r=>{
          const url=new URL(r.url());
          if(url.origin!==origin||url.pathname!=='/-api/search/query')return false;
          validation=validation.then(async()=>{
            current();
            const request:unknown=r.request().postDataJSON();
            if(!object(request)||typeof request.searchKeyword!=='string')throw changed();
            // Workers reuse a page. An earlier keyword's delayed response cannot
            // satisfy another search with the same zero offset.
            if(request.searchKeyword!==query)return false;
            if(!object(request.pagination)||request.pagination.take!==10||
              !Number.isSafeInteger(request.pagination.skip))throw changed();
            if(r.status()>=400)throw unavailable();
            if(r.status()!==201)return false;
            const grid=await searchGrid(r);
            current();
            if(request.pagination.skip!==grid.offset)throw changed();
            if(grid.offset===offset){observed.set(r,grid);return true;}
            const previous=completed.get(grid.offset);
            if(grid.offset<offset&&previous&&previous.total_item===grid.total_item&&
              isDeepStrictEqual(previous.content,grid.content))return false;
            throw changed();
          });
          return validation;
        },{timeout:60000}).then(r=>observed.get(r)!);
        void pending.catch(()=>{});return pending;
      };
      for(let index=0;index<maxPages;index++){
        current();const pending=response(index*10);
        if(index===0){
          const url=query?`${origin}/events/search?events=${encodeURIComponent(query)}&category=&page=1`:`${origin}/events/search`;
          const navigation=await within(page.goto(url,{waitUntil:'domcontentloaded',timeout:60000}));
          if(!navigation||navigation.status()>=400)throw unavailable();
        }else await within(page.getByRole('link',{name:'Next Page',exact:true}).click({timeout:15000}));
        const grid=await within(pending);
        const renderedUrl=new URL(page.url());
        if(renderedUrl.origin!==origin||renderedUrl.pathname!=='/events/search'||
          (renderedUrl.searchParams.get('events')??'')!==query||
          (renderedUrl.searchParams.get('page')??'1')!==String(index+1))throw changed();
        if(total!==undefined&&total!==grid.total_item)throw changed();total=grid.total_item;
        rawRecords+=grid.content.length;if(rawRecords>190)throw changed();
        const ids=grid.content.map(item=>item.id);
        if(ids.length){
          await within(page.waitForFunction((ids:string[])=>ids.every(id=>
            [...document.querySelectorAll<HTMLAnchorElement>('a.serp-grid__item[href]')]
              .some(a=>a.href.endsWith('-e'+id.slice(9))||a.href.endsWith('-'+id.slice(9)))),ids,{timeout:15000,polling:100}));
          const links=await within(page.locator('a.serp-grid__item[href]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLAnchorElement).href)));
          for(const item of grid.content){
            const suffix=item.id.slice(9);
            const url=links.find(u=>/^https:\/\/www\.onepa\.gov\.sg\/events\/[a-zA-Z0-9-]+$/.test(u)&&
              (u.endsWith('-e'+suffix)||u.endsWith('-'+suffix)));
            if(!url)throw Error('Source identity unavailable');
            result.push({product:{...item,ID:item.id,Name:item.name,Active:item.active,Description:item.description},url});
          }
        }
        completed.set(grid.offset,grid);current();
        if(grid.offset+grid.content.length>=grid.total_item)break;
      }
      taskStats.push({index:taskIndex,records:result.length,elapsedMs:Math.round(performance.now()-taskStarted)});
      return result;
    };

    const results:(readonly OnePaListItem[])[]=Array.from({length:15},()=>[]);
    running.push(readTask(pages[0]!,'',0,5).then(rows=>{results[0]=rows;}));
    let nextQuery=0;
    for(const page of pages.slice(1))running.push((async()=>{
      while(nextQuery<ONEPA_INTEREST_RULES.length){
        current();const index=nextQuery++,query=ONEPA_INTEREST_RULES[index]!.query;
        results[index+1]=await readTask(page,query,index+1,1);
      }
    })());
    await within(Promise.all(running));current();
    const result=mergeOnePaCatalogue(results);uniqueRecords=result.length;
    outcome='complete';return result;
  } catch(error) {
    stop(error);await Promise.allSettled(running);throw error;
  } finally {
    stopped=true;clearTimeout(timer);signal.removeEventListener('abort',abort);await close();
    // Optional operator counters contain no source content, account state,
    // tokens, URLs or provider response bodies.
    try{onDiagnostics?.({outcome,elapsedMs:Math.round(performance.now()-started),completedTasks:taskStats.length,
      rawRecords,uniqueRecords,tasks:taskStats.sort((a,b)=>a.index-b.index)});}catch{/* An observer cannot change the source result. */}
  }
}
