export type ActivityType="check_in_created"|"event_interested"|"event_going";
export interface ActivityCandidate {
  readonly type:ActivityType;readonly sourceRecordId:string;readonly occurredAt:string;
  readonly specialCare:boolean;
}
/** Q03/Q17: callers authorize metadata before scoring. No source bodies. */
export function rankActivity<T extends ActivityCandidate>(rows:readonly T[],asOf:number):T[]{
  const score=(r:T)=>{
    const hours=(asOf-Date.parse(r.occurredAt))/3600000;
    return (hours<24?3:hours<72?2:1)+(r.type==="event_going"?2:1)+(r.specialCare?2:0);
  };
  const lex=(a:string,b:string)=>a<b?-1:a>b?1:0;
  return rows.filter(r=>Number.isFinite(asOf)&&Number.isFinite(Date.parse(r.occurredAt))&&
    Date.parse(r.occurredAt)<=asOf&&Date.parse(r.occurredAt)>=asOf-168*3600000)
    .sort((a,b)=>score(b)-score(a)||Date.parse(b.occurredAt)-Date.parse(a.occurredAt)||
      lex(a.type,b.type)||lex(a.sourceRecordId,b.sourceRecordId));
}
