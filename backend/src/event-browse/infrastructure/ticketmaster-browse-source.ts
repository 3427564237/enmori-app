import {locateArea} from '../../recommendation-profile/infrastructure/region-geometry.js';
import {plain} from './public-event-pages.js';
import {Temporal} from "@js-temporal/polyfill";
import {decodeBrowseId,object,projectOccurrence} from "../domain/browse-values.js";
import {dependencyUnavailable} from "../../shared/ports/dependency-failure.js";
import type {BrowseSource,BrowseOccurrence} from "../ports/event-browse.js";
import {sourceEventId} from '../domain/source-event-id.js';
/** Explicit private key and activation supplied by controlled composition.
 * Default activation is NEVER inferred from a key; no env/credential discovery. */
export class TicketmasterBrowseSource implements BrowseSource {
  private readonly observed = new Map<string,{browseId:string;expires:number}>();
  constructor(private readonly access:{key():string|undefined;enabled():boolean},private readonly http:typeof fetch=fetch){}
  private project(raw:unknown,asOf:string):BrowseOccurrence|undefined{
    const row=projectOccurrence(raw,asOf);if(!row||!object(raw))return row;
    const embedded=object(raw._embedded)?raw._embedded:undefined;
    const venue=Array.isArray(embedded?.venues)?embedded.venues[0]:undefined;
    const loc=object(venue)&&object(venue.location)?venue.location:undefined;
    const areaCode=loc?locateArea(Number(loc.latitude),Number(loc.longitude)):undefined;
    const description=plain(raw.info??raw.description),note=plain(raw.pleaseNote,12000);
    const rawStatus=object(raw.dates)&&object(raw.dates.status)?raw.dates.status.code:undefined;
    const status=rawStatus==='cancelled'?'cancelled' as const:rawStatus==='postponed'?'postponed' as const:rawStatus==='rescheduled'?'rescheduled' as const:rawStatus==='offsale'?'not_on_sale' as const:'available' as const;
    const sections=note?[{heading:'Important information',text:note}]:[];
    const prices=Array.isArray(raw.priceRanges)?raw.priceRanges.filter(p=>object(p)&&p.currency==='SGD'&&typeof p.min==='number'&&p.min>=0):[];
    const priceLabel=prices.length?`From SGD ${Math.min(...prices.map(p=>Number(p.min)))}; confirm fees and availability on the official site`:undefined;
    return {...row,content:{provider:'ticketmaster',sourceId:String(raw.id),fetchedAt:new Date().toISOString(),timeZone:'Asia/Singapore',detailUrl:row.externalSourceUrl,status,...(areaCode?{areaCode}:{}),...(description?{fullDescription:description}:{}),...(sections.length?{sections}:{}),...(priceLabel?{priceLabel}:{})}};
  }
  private async read(path:string,query:Record<string,string>,signal:AbortSignal):Promise<unknown>{
    const key=this.access.key();if(signal.aborted||!this.access.enabled()||!key||/\s/.test(key))throw dependencyUnavailable;
    const url=new URL(`https://app.ticketmaster.com/discovery/v2/${path}.json`);
    for(const [k,v]of Object.entries({...query,apikey:key}))url.searchParams.set(k,v);
    const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),10000);
    const combined=AbortSignal.any([signal,timeout.signal]);
    let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
    try{
      const response=await this.http(url,{method:"GET",redirect:"error",cache:"no-store",signal:combined});
      if(!response.ok){await response.body?.cancel().catch(()=>{});if(response.status===404&&path.startsWith("events/"))return undefined;throw dependencyUnavailable;}
      if(!response.body)throw dependencyUnavailable;reader=response.body.getReader();
      const decoder=new TextDecoder("utf-8",{fatal:true});let size=0,raw="";
      for(;;){const r=await reader.read();if(combined.aborted)throw dependencyUnavailable;if(r.done)break;size+=r.value.length;if(size>1024*1024)throw dependencyUnavailable;raw+=decoder.decode(r.value,{stream:true});}
      raw+=decoder.decode();if(!this.access.enabled()||combined.aborted)throw dependencyUnavailable;return JSON.parse(raw) as unknown;
    }catch{throw dependencyUnavailable;}
    finally{clearTimeout(timer);await reader?.cancel().catch(()=>{});reader?.releaseLock();}
  }
  async firstBatch(asOf:string,signal:AbortSignal):Promise<readonly BrowseOccurrence[]>{
    return (await this.batch(asOf,0,signal)).items;
  }
  async batch(asOf:string,page:number,signal:AbortSignal):Promise<{items:readonly BrowseOccurrence[];nextPage?:number}>{
    if(!Number.isSafeInteger(page)||page<0||page>49)throw dependencyUnavailable;
    // Discovery rejects fractional query seconds. Widen only its lower bound;
    // projectOccurrence below still compares each row to the original asOf.
    let startDateTime:string;
    try{startDateTime=Temporal.Instant.from(asOf).toString({smallestUnit:"second",roundingMode:"floor"});}
    catch{throw dependencyUnavailable;}
    const raw=await this.read("events",{countryCode:"SG",size:"20",page:String(page),sort:"date,asc",startDateTime,includeTBA:"no",includeTBD:"no",includeTest:"no"},signal);
    if(!object(raw)||!object(raw.page)||raw.page.number!==page||typeof raw.page.totalElements!=="number"||!Number.isSafeInteger(raw.page.totalElements)||raw.page.totalElements<0)throw dependencyUnavailable;
    let rows:unknown[]=[];
    if(raw._embedded!==undefined){if(!object(raw._embedded)||!Array.isArray(raw._embedded.events))throw dependencyUnavailable;rows=raw._embedded.events;}
    else if(raw.page.totalElements!==0)throw dependencyUnavailable;
    // A positive upstream count with no raw page0 rows is an inconsistent
    // source response, not a batch whose supplied occurrences were excluded.
    if(rows.length>20||raw.page.totalElements<rows.length||(raw.page.totalElements>0&&rows.length===0))throw dependencyUnavailable;
    const items:BrowseOccurrence[]=[];const ids=new Set<string>();
    for(const row of rows){const v=this.project(row,asOf);if(v){if(ids.has(v.browseId))throw dependencyUnavailable;ids.add(v.browseId);items.push(v);}}
    const now=Date.now();
    for(const [key,value]of this.observed)if(value.expires<=now)this.observed.delete(key);
    for(const row of items){this.observed.delete(sourceEventId(row.browseId));this.observed.set(sourceEventId(row.browseId),{browseId:row.browseId,expires:now+300000});}
    while(this.observed.size>1000)this.observed.delete(this.observed.keys().next().value!);
    // Never silently claim exhaustive coverage at the provider's 1000-item cap.
    if (page===49 && raw.page.totalElements>1000) throw dependencyUnavailable;
    const more=(page+1)*20<raw.page.totalElements;
    return {items,...(more?{nextPage:page+1}:{})};
  }
  async availableEvent(eventId:string,asOf:string,signal:AbortSignal):Promise<boolean>{
    return (await this.event(eventId,asOf,signal))!==undefined;
  }
  async event(eventId:string,asOf:string,signal:AbortSignal):Promise<BrowseOccurrence|undefined>{
    const known=this.observed.get(eventId);
    if(!known||known.expires<=Date.now())return undefined;
    return this.detail(known.browseId,asOf,signal);
  }
  async detail(id:string,asOf:string,signal:AbortSignal):Promise<BrowseOccurrence|undefined>{
    const source=decodeBrowseId(id);if(!source)return undefined;
    const raw=await this.read(`events/${encodeURIComponent(source)}`,{},signal);
    if(raw===undefined)return undefined;
    if(!object(raw))throw dependencyUnavailable;
    if(raw.id!==source)return undefined;
    const result=this.project(raw,asOf);
    if(result){this.observed.delete(sourceEventId(result.browseId));this.observed.set(sourceEventId(result.browseId),{browseId:result.browseId,expires:Date.now()+300000});while(this.observed.size>1000)this.observed.delete(this.observed.keys().next().value!);}
    return result;
  }
}
