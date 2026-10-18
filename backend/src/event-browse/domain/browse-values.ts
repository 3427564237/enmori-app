import { Temporal } from "@js-temporal/polyfill";
import type { BrowseOccurrence } from "../ports/event-browse.js";
const sourceId=/^[A-Za-z0-9_-]{1,128}$/;
const unsafe=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>]|```/u;
export const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
export function browseId(id:string):string|undefined{return sourceId.test(id)?`tm_${Buffer.from(id,"utf8").toString("base64url")}`:undefined;}
export function decodeBrowseId(v:unknown):string|undefined{
  if(typeof v!=="string"||v.length<5||v.length>174||!/^tm_[A-Za-z0-9_-]+$/.test(v))return undefined;
  try{const id=new TextDecoder("utf-8",{fatal:true}).decode(Buffer.from(v.slice(3),"base64url"));return browseId(id)===v?id:undefined;}catch{return undefined;}
}
function text(v:unknown,max:number):v is string{return typeof v==="string"&&v.isWellFormed()&&!!v.trim()&&[...v].length<=max&&!unsafe.test(v);}
export function sourceUrl(v:unknown):v is string{
  if(typeof v!=="string"||!v.isWellFormed()||v.length>2048||/[\s\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(v)||v.includes("#"))return false;
  try{const u=new URL(v);return u.protocol==="https:"&&["ticketmaster.sg","www.ticketmaster.sg"].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&
    ![...u.searchParams.keys()].some(k=>/^(?:api[_-]?key|token|access_token|secret|password|authorization)$/i.test(k));}catch{return false;}
}
function instant(v:unknown):Temporal.Instant|undefined{
  if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(v))return undefined;
  try{return Temporal.Instant.from(v);}catch{return undefined;}
}
/** Minimized source projection. Music ID verified against the official Discovery API:
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery/v2/
 * No label inference, other category mapping or participation fields. */
export function projectOccurrence(raw:unknown,asOf:string):BrowseOccurrence|undefined{
  try{
    if(!object(raw)||typeof raw.id!=="string"||!text(raw.name,200)||!sourceUrl(raw.url)||!object(raw.dates)||!object(raw.dates.start)||!object(raw.dates.status)||raw.dates.status.code!=="onsale")return undefined;
    const id=browseId(raw.id),start=instant(raw.dates.start.dateTime),now=instant(asOf);
    if(!id||!start||!now||Temporal.Instant.compare(start,now)<=0||["dateTBA","dateTBD","timeTBA","noSpecificTime"].some(k=>raw.dates && object(raw.dates)&&object(raw.dates.start)&&raw.dates.start[k]===true))return undefined;
    if(!object(raw._embedded)||!Array.isArray(raw._embedded.venues)||raw._embedded.venues.length===0||raw._embedded.venues.some(v=>!object(v)||!object(v.country)||v.country.countryCode!=="SG"))return undefined;
    let end:Temporal.Instant|undefined;
    if(raw.dates.end!==undefined){if(!object(raw.dates.end))return undefined;if(Object.hasOwn(raw.dates.end,"dateTime")){end=instant(raw.dates.end.dateTime);if(!end||Temporal.Instant.compare(end,start)<=0)return undefined;}}
    const venue=raw._embedded.venues[0] as Record<string,unknown>;
    let category:unknown;
    if(raw.classifications!==undefined){if(!Array.isArray(raw.classifications))return undefined;const c=raw.classifications[0];if(c!==undefined){if(!object(c))return undefined;if(c.segment!==undefined){if(!object(c.segment))return undefined;category=c.segment.name;}}}
    if((Object.hasOwn(venue,"name")&&!text(venue.name,200))||(category!==undefined&&!text(category,100)))return undefined;
    return {browseId:id,title:raw.name,startAt:start.toString(),externalSourceUrl:raw.url,
      ...(Array.isArray(raw.classifications)&&raw.classifications.some(c=>object(c)&&object(c.segment)&&c.segment.id==="KZFzniwnSyZfZ7v7nJ")?{musicSegment:true as const}:{}),
      ...(end?{endAt:end.toString()}:{}),...(typeof venue.name==="string"?{locationLabel:venue.name}:{}),...(typeof category==="string"?{categoryLabel:category}:{})};
  }catch{return undefined;}
}
