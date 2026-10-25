import { Temporal } from "@js-temporal/polyfill";
import { parseCivilDay } from "../../check-ins/application/check-in-history.js";
import type { TodayReplySelection } from "../ports/selected-reply.js";

/** The device reports an IANA zone, not a location attestation. Only the server
 * clock chooses the civil date. Reuse history's canonical zone/DST rules. */
export function currentReplyDay(timeZone:string,utcMilliseconds:number):ReturnType<typeof parseCivilDay>{
  if(typeof timeZone!=="string"||!Number.isSafeInteger(utcMilliseconds)||utcMilliseconds<0)return undefined;
  try{
    const date=Temporal.Instant.fromEpochMilliseconds(utcMilliseconds).toZonedDateTimeISO(timeZone).toPlainDate().toString();
    return parseCivilDay(date,timeZone);
  }catch{return undefined;}
}

export function validTodayReplySelection(value:TodayReplySelection,utcMilliseconds:number):boolean{
  if(!value||Object.keys(value).some(k=>!["date","timeZone","limit","hasMore"].includes(k))||
    value.limit!==5||typeof value.hasMore!=="boolean")return false;
  const day=currentReplyDay(value.timeZone,utcMilliseconds);
  return day!==undefined&&!day.empty&&day.date===value.date;
}
