import { Temporal } from "@js-temporal/polyfill";
import { err,ok } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { FirestoreGateway,StoredDocumentEntry } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { isSafeDocumentId,parseCheckInProjection,sha256 } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { CheckInHistoryFirestoreGateway,CheckInHistoryTransaction } from "../../check-ins/ports/check-in-history-firestore-gateway.js";
import type { CheckInHistoryCursorCodec } from "../../check-ins/ports/check-in-history-cursor.js";
import { parseCivilDay } from "../../check-ins/application/check-in-history.js";
import type { CheckInProjection } from "../../check-ins/application/check-in-model.js";
import type { SocialRepository,SocialProfile,SocialMonth } from "../ports/social-repository.js";
import { context,fail,failure,visible,revision,type Reader,type SocialContext } from "./social-authority.js";

function mapAllowed(c:SocialContext){return c.self||(c.friend&&c.target.fields.mapSharedWithFriends&&visible(c.target.fields.location,false,true));}
function rowBoundary(row:StoredDocumentEntry,owner:string,startUtc:string,endUtc:string|null){
  const value=row.data.createdAt;
  if(row.data.ownerAccountId!==owner||!isSafeDocumentId(row.id)||typeof value!=="string"||
    !Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value||value<startUtc||
    (endUtc!==null&&value>=endUtc))return fail("SERVICE_UNAVAILABLE");
  return {createdAt:value,checkInId:row.id};
}
function projectRecord(c:SocialContext,entry:StoredDocumentEntry):CheckInProjection|undefined {
  if(entry.data.ownerAccountId!==c.target.id)return fail("SERVICE_UNAVAILABLE");
  // Missing legacy visibility is not retroactively set by a newer default.
  if(!visible(entry.data.checkInVisibility,c.self,c.friend))return undefined;
  const projection=parseCheckInProjection(entry.data,entry.id);
  if(!projection)return fail("SERVICE_UNAVAILABLE");
  const {location,weather,locationLabel,...rest}=projection;
  return {...rest,...(location&&mapAllowed(c)?{location}:{}),
    ...(locationLabel&&visible(c.target.fields.location,c.self,c.friend)?{locationLabel}:{}),
    ...(weather&&visible(c.target.fields.location,c.self,c.friend)?{weather}:{})};
}
export class FirestoreSocialRepository implements SocialRepository {
  constructor(private readonly store:FirestoreGateway,private readonly history:CheckInHistoryFirestoreGateway,
    private readonly cursor:CheckInHistoryCursorCodec,private readonly clock:Clock){}
  private now():Date {
    const now=this.clock.now();if(!now.ok||!Number.isFinite(now.value.getTime()))return fail("SERVICE_UNAVAILABLE");
    return now.value;
  }
  private async profileView(tx:Reader,c:SocialContext):Promise<SocialProfile>{
    const interests:{interestTagId:string;displayName:string}[]=[];
    if(visible(c.target.fields.interests,c.self,c.friend)){
      const selection=await tx.get(`account_interests/${c.target.id}`);
      if(selection!==undefined){
        if(!Array.isArray(selection.interestTagIds)||selection.interestTagIds.length>10||
          new Set(selection.interestTagIds).size!==selection.interestTagIds.length)return fail("SERVICE_UNAVAILABLE");
        for(const id of selection.interestTagIds){
          if(typeof id!=="string"||!isSafeDocumentId(id))return fail("SERVICE_UNAVAILABLE");
          const tag=await tx.get(`interest_tags/${id}`);
          if(tag?.lifecycleState==="active"){
            if(typeof tag.displayName!=="string"||!tag.displayName.trim()||tag.displayName.trim()!==tag.displayName||
              [...tag.displayName].length>50)return fail("SERVICE_UNAVAILABLE");
            interests.push({interestTagId:id,displayName:tag.displayName});
          }
        }
      }
    }
    return {username:c.target.username,displayName:c.target.displayName,
      details:{...c.target.details,...(visible(c.target.fields.location,c.self,c.friend)?{}:{region:null})},
      relationship:c.self?"self":c.friend?"friend":"other",specialCare:c.specialCare,friendshipRevision:c.revision,
      interests,mapAvailable:mapAllowed(c),participationAvailable:visible(c.target.fields.participation,c.self,c.friend)};
  }
  async profile(uid:string,username:string){
    try{return await this.store.runTransaction(async tx=>ok(await this.profileView(tx,await context(tx,uid,username))));}
    catch(e){return err(failure(e));}
  }
  async care(uid:string,username:string,input:{specialCare:boolean;expectedRevision:number}){
    try{return await this.store.runTransaction(async tx=>{
      const c=await context(tx,uid,username,false);
      if(!c.friend||!c.pair)return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
      if(typeof input.specialCare!=="boolean"||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)return fail("REQUEST_INVALID");
      if(c.revision!==input.expectedRevision)return fail("FRIEND_REVISION_PRECONDITION_FAILED");
      if(c.revision>=Number.MAX_SAFE_INTEGER-1)return fail("SERVICE_UNAVAILABLE");
      // Private flag updates return no profile fields and do not advance the
      // other member's revision (which would disclose private flag changes).
      tx.set(c.pairPath,{...c.pair,revisions:{...(c.pair.revisions as object|undefined),[c.viewer.id]:c.revision+1},
        specialCareByAccount:{...(c.pair.specialCareByAccount as object|undefined),[c.viewer.id]:input.specialCare}});
      return ok({specialCare:input.specialCare,friendshipRevision:c.revision+1});
    });}catch(e){return err(failure(e));}
  }
  async remove(uid:string,username:string,expectedRevision:number){
    try{return await this.store.runTransaction(async tx=>{
      const c=await context(tx,uid,username,false);
      if(!c.friend||!c.pair)return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)return fail("REQUEST_INVALID");
      if(c.revision!==expectedRevision)return fail("FRIEND_REVISION_PRECONDITION_FAILED");
      if(c.revision>=Number.MAX_SAFE_INTEGER-1||revision(c.pair,c.target.id)>=Number.MAX_SAFE_INTEGER-1)return fail("SERVICE_UNAVAILABLE");
      if(!tx.delete)return fail("SERVICE_UNAVAILABLE");
      const refs=c.pair.listRefs;
      if(!refs||typeof refs!=="object"||Array.isArray(refs))return fail("SERVICE_UNAVAILABLE");
      for(const [id,ref]of Object.entries(refs)){
        if((id!==c.viewer.id&&id!==c.target.id)||typeof ref!=="string"||!isSafeDocumentId(ref))return fail("SERVICE_UNAVAILABLE");
        const path=`friend_lists/${id}/members/${ref}`,pointer=await tx.get(path);
        if(pointer?.pairKey!==c.pairPath.slice("friend_pairs/".length))return fail("SERVICE_UNAVAILABLE");
      }
      for(const [id,ref]of Object.entries(refs))tx.delete(`friend_lists/${id}/members/${ref}`);
      const {listRefs:_refs,specialCareByAccount:_care,...retained}=c.pair;
      tx.set(c.pairPath,{...retained,friendship:false,pending:null,revisions:{
        [c.viewer.id]:c.revision+1,[c.target.id]:revision(c.pair,c.target.id)+1}});
      return ok(undefined);
    });}catch(e){return err(failure(e));}
  }
  async records(uid:string,username:string,input:{date:string;timeZone:string;cursor?:string}){
    try{return await this.history.runTransaction(async tx=>{
      const c=await context(tx,uid,username);
      const day=parseCivilDay(input.date,input.timeZone),now=this.now();
      if(!day)return fail("REQUEST_INVALID");
      const cursor=input.cursor===undefined?undefined:this.cursor.decode(input.cursor,now);
      const binding=sha256(JSON.stringify([c.viewer.id,c.target.id]));
      if(input.cursor!==undefined&&(!cursor||cursor.ownerAccountId!==binding||
        cursor.date!==day.date||cursor.timeZone!==day.timeZone||cursor.startUtc!==day.startUtc||cursor.endUtc!==day.endUtc))return fail("REQUEST_INVALID");
      if(day.empty)return ok({checkIns:[],nextCursor:null});
      const rows=await tx.listCheckInHistoryPage({ownerAccountId:c.target.id,startUtc:day.startUtc,endUtc:day.endUtc,
        ...(cursor?{after:{createdAt:cursor.lastCreatedAt,checkInId:cursor.lastCheckInId}}:{}),limit:21});
      for(const row of rows)rowBoundary(row,c.target.id,day.startUtc,day.endUtc);
      const checkIns=rows.slice(0,20).flatMap(row=>{const value=projectRecord(c,row);return value?[value]:[];});
      const last=rows[19],nextCursor=rows.length>20&&last?this.cursor.encode({
        version:1,ownerAccountId:binding,date:day.date,timeZone:day.timeZone,startUtc:day.startUtc,endUtc:day.endUtc,
        lastCreatedAt:String(last.data.createdAt),lastCheckInId:last.id,expiresAt:new Date(now.getTime()+900_000).toISOString(),
      }):null;
      return ok({checkIns,nextCursor});
    });}catch(e){return err(failure(e));}
  }
  async record(uid:string,username:string,checkInId:string){
    try{return await this.history.runTransaction(async tx=>{
      const c=await context(tx,uid,username);
      if(!isSafeDocumentId(checkInId))return fail("CHECKIN_UNAVAILABLE");
      const data=await tx.get(`check_ins/${checkInId}`);
      if(!data||data.ownerAccountId!==c.target.id)return fail("CHECKIN_UNAVAILABLE");
      const projected=projectRecord(c,{id:checkInId,data});
      return projected?ok(projected):fail("CHECKIN_UNAVAILABLE");
    });}catch(e){return err(failure(e));}
  }
  async month(uid:string,username:string,input:{month:string;timeZone:string}){
    try{return await this.history.runTransaction(async tx=>{
      const c=await context(tx,uid,username);
      if(!/^\d{4}-\d{2}$/.test(input.month))return fail("REQUEST_INVALID");
      let month:Temporal.PlainYearMonth;
      try{month=Temporal.PlainYearMonth.from(input.month);}catch{return fail("REQUEST_INVALID");}
      const days:{date:string;count:number}[]=[];
      if(month.year<1||month.year>9999)return fail("REQUEST_INVALID");
      for(let n=1;n<=month.daysInMonth;n++){
        const date=`${input.month}-${String(n).padStart(2,"0")}`;
        if(!parseCivilDay(date,input.timeZone))return fail("REQUEST_INVALID");
        days.push({date,count:0});
      }
      const first=parseCivilDay(days[0]!.date,input.timeZone)!,last=parseCivilDay(days.at(-1)!.date,input.timeZone)!;
      const rows=await this.monthRows(tx,c,first.startUtc,last.endUtc);
      const points:SocialMonth["points"][number][]=[];
      for(const row of rows){
        const value=projectRecord(c,row);if(!value)continue;
        const date=Temporal.Instant.from(value.createdAt).toZonedDateTimeISO(input.timeZone).toPlainDate().toString();
        const day=days.find(d=>d.date===date);if(!day)return fail("SERVICE_UNAVAILABLE");day.count++;
        if(value.location)points.push({checkInId:value.checkInId,createdAt:value.createdAt,location:value.location});
      }
      points.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.checkInId.localeCompare(b.checkInId));
      return ok({month:input.month,timeZone:input.timeZone,days,points});
    });}catch(e){return err(failure(e));}
  }
  private async monthRows(tx:CheckInHistoryTransaction,c:SocialContext,startUtc:string,endUtc:string|null){
    const rows:StoredDocumentEntry[]=[];let after:{createdAt:string;checkInId:string}|undefined;
    // Capacity failure is explicit, never a partial heatmap or invented count.
    for(let page=0;page<100;page++){
      const entries=await tx.listCheckInHistoryPage({ownerAccountId:c.target.id,startUtc,endUtc,...(after?{after}:{}),limit:20});
      for(const row of entries)rowBoundary(row,c.target.id,startUtc,endUtc);
      rows.push(...entries);
      if(entries.length<20)return rows;
      const last=entries.at(-1)!;
      if(typeof last.data.createdAt!=="string"||!isSafeDocumentId(last.id))return fail("SERVICE_UNAVAILABLE");
      const next={createdAt:last.data.createdAt,checkInId:last.id};
      if(after&&next.createdAt===after.createdAt&&next.checkInId===after.checkInId)return fail("SERVICE_UNAVAILABLE");
      after=next;
    }
    return fail("SERVICE_UNAVAILABLE");
  }
}
