import {Temporal} from "@js-temporal/polyfill";
import {decodeBrowseId,object,projectOccurrence} from "../domain/browse-values.js";
import {dependencyUnavailable} from "../../shared/ports/dependency-failure.js";
import type {BrowseSource,BrowseOccurrence} from "../ports/event-browse.js";
/** Explicit private key and activation supplied by controlled composition.
 * Default activation is NEVER inferred from a key; no env/credential discovery. */
export class TicketmasterBrowseSource implements BrowseSource {
  constructor(private readonly access:{key():string|undefined;enabled():boolean},private readonly http:typeof fetch=fetch){}
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
    // Discovery rejects fractional query seconds. Widen only its lower bound;
    // projectOccurrence below still compares each row to the original asOf.
    let startDateTime:string;
    try{startDateTime=Temporal.Instant.from(asOf).toString({smallestUnit:"second",roundingMode:"floor"});}
    catch{throw dependencyUnavailable;}
    const raw=await this.read("events",{countryCode:"SG",size:"20",page:"0",sort:"date,asc",startDateTime,includeTBA:"no",includeTBD:"no",includeTest:"no"},signal);
    if(!object(raw)||!object(raw.page)||raw.page.number!==0||typeof raw.page.totalElements!=="number"||!Number.isSafeInteger(raw.page.totalElements)||raw.page.totalElements<0)throw dependencyUnavailable;
    let rows:unknown[]=[];
    if(raw._embedded!==undefined){if(!object(raw._embedded)||!Array.isArray(raw._embedded.events))throw dependencyUnavailable;rows=raw._embedded.events;}
    else if(raw.page.totalElements!==0)throw dependencyUnavailable;
    // A positive upstream count with no raw page0 rows is an inconsistent
    // source response, not a batch whose supplied occurrences were excluded.
    if(rows.length>20||raw.page.totalElements<rows.length||(raw.page.totalElements>0&&rows.length===0))throw dependencyUnavailable;
    const items:BrowseOccurrence[]=[];const ids=new Set<string>();
    for(const row of rows){const v=projectOccurrence(row,asOf);if(v){if(ids.has(v.browseId))throw dependencyUnavailable;ids.add(v.browseId);items.push(v);}}
    return items;
  }
  async detail(id:string,asOf:string,signal:AbortSignal):Promise<BrowseOccurrence|undefined>{
    const source=decodeBrowseId(id);if(!source)return undefined;
    const raw=await this.read(`events/${encodeURIComponent(source)}`,{},signal);
    if(raw===undefined)return undefined;
    if(!object(raw))throw dependencyUnavailable;
    if(raw.id!==source)return undefined;return projectOccurrence(raw,asOf);
  }
}
