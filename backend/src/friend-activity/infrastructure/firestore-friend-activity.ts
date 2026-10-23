import { normalizeCheckInContent } from "../../check-ins/domain/content.js";
import { rankActivity,type ActivityCandidate } from "../domain/rank-activity.js";
import type { FriendActivity,ActivityCategory,ActivityItem,EventActivitySource } from "../ports/friend-activity.js";
import type { FirestoreGateway,StoredDocumentEntry } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import type { Clock } from "../../shared/ports/clock.js";
import { fail, failure, SocialFailure, visible } from "../../friends/domain/social-failure.js";
import type { Member, Reader, SocialAuthority } from "../../friends/ports/social-authority.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import { ok,err } from "../../shared/domain/result.js";
async function completePage(read:(after:string|undefined)=>Promise<readonly StoredDocumentEntry[]>){
  const result:StoredDocumentEntry[]=[];let after:string|undefined;
  for(let page=0;page<40;page++){
    const rows=await read(after);
    if(rows.length>25||rows.some((r,i)=>!isSafeDocumentId(r.id)||(i? r.id<=rows[i-1]!.id:after!==undefined&&r.id<=after)))return fail("SERVICE_UNAVAILABLE");
    result.push(...rows);if(rows.length<25)return result;after=rows.at(-1)!.id;
  }
  return fail("SERVICE_UNAVAILABLE");
}
export class FirestoreFriendActivity implements FriendActivity {
  constructor(private readonly store:FirestoreGateway,private readonly clock:Clock,private readonly authority:SocialAuthority,private readonly events?:EventActivitySource){}
  async read(uid:string,view:"home"|"all",category:ActivityCategory){
    try{return await this.store.runTransaction(async tx=>{
      const own=await this.authority.viewer(tx,uid),now=this.clock.now();
      if(!now.ok||!Number.isFinite(now.value.getTime())||!tx.listPage)return fail("SERVICE_UNAVAILABLE");
      if(own.data.optionalProcessingConsent!=="accepted")return ok({activities:[]});
      const candidates:ActivityCandidate[]=[],seen=new Set<string>();
      const actors=new Map<string,{owner:string;username:string;displayName:string|null}>();
      for(const pointer of await completePage(after=>tx.listPage!(`friend_lists/${own.id}/members`,after,25))){
        const key=pointer.data.pairKey;
        if(typeof key!=="string"||!isSafeDocumentId(key))return fail("SERVICE_UNAVAILABLE");
        const raw=await tx.get(`friend_pairs/${key}`);
        const ids=raw?.accountIds;
        if(!Array.isArray(ids)||ids.length!==2||!ids.includes(own.id))return fail("SERVICE_UNAVAILABLE");
        const other=ids.find(id=>id!==own.id);
        if(typeof other!=="string"||this.authority.pairKey(own.id,other)!==key)return fail("SERVICE_UNAVAILABLE");
        const pair=raw&&this.authority.parsePair(raw,own.id,other);
        if(!pair)return fail("SERVICE_UNAVAILABLE");
        if(!pair.friendship||pair.blockedByAccountIds.length)continue;
        let target;
        try{target=await this.authority.member(tx,other);}catch(e){if(e instanceof SocialFailure&&e.code==="ADD_FRIEND_TARGET_UNAVAILABLE")continue;throw e;}
        if(!visible(target.visibility,false,true)||target.data.optionalProcessingConsent!=="accepted")continue;
        const reservation=await tx.get(`username_reservations/${target.username}`);
        if(reservation?.accountId!==other)continue;
        this.authority.revision(raw,own.id);
        const care=raw?.specialCareByAccount as Record<string,unknown>|undefined;
        const specialCare=care?.[own.id]===true;
        const add=(type:ActivityItem["type"],id:string,time:unknown)=>{
          if(!isSafeDocumentId(id)||typeof time!=="string"||!Number.isFinite(Date.parse(time))||new Date(time).toISOString()!==time)return fail("SERVICE_UNAVAILABLE");
          const identity=JSON.stringify([type,id]);
          if(seen.has(identity))return fail("SERVICE_UNAVAILABLE");seen.add(identity);
          // Only Q17 metadata enters rankActivity, never display content or actor fields.
          candidates.push({type,sourceRecordId:id,occurredAt:time,specialCare});
          actors.set(identity,{owner:other,username:target.username,displayName:target.displayName});
        };
        if(category==="all"||category==="check_in_created"){
          if(!tx.listActivityCheckInPage)return fail("SERVICE_UNAVAILABLE");
          for(const row of await completePage(after=>tx.listActivityCheckInPage!(other,after,25))){
            if(row.data.ownerAccountId!==other||Object.keys(row.data).some(k=>!["ownerAccountId","createdAt","checkInVisibility"].includes(k)))return fail("SERVICE_UNAVAILABLE");
            if(visible(row.data.checkInVisibility,false,true))add("check_in_created",row.id,row.data.createdAt);
          }
        }
        if(category!=="check_in_created"&&visible(target.fields.participation,false,true)){
          const rows=await this.events?.read(tx,own.id,other,now.value.toISOString(),"friends_activity_v1");
          if(!rows||rows.length>999)return fail("SERVICE_UNAVAILABLE");
          for(const row of rows){
            if(!["event_interested","event_going"].includes(row.type)||Object.keys(row).some(k=>!["type","sourceRecordId","occurredAt"].includes(k)))return fail("SERVICE_UNAVAILABLE");
            if(category==="all"||category===row.type)add(row.type,row.sourceRecordId,row.occurredAt);
          }
        }
      }
      const activities:ActivityItem[]=[];
      for(const row of rankActivity(candidates,now.value.getTime())){
        const actor=actors.get(JSON.stringify([row.type,row.sourceRecordId]))!;
        const display={type:row.type,sourceRecordId:row.sourceRecordId,occurredAt:row.occurredAt,
          username:actor.username,displayName:actor.displayName};
        if(row.type==="check_in_created"){
          // Read content only for a selected, already-authorized candidate, in the same transaction.
          const data=await tx.get(`check_ins/${row.sourceRecordId}`);
          if(!data||data.ownerAccountId!==actor.owner||!visible(data.checkInVisibility,false,true))continue;
          if(data.createdAt!==row.occurredAt||typeof data.note!=="string")return fail("SERVICE_UNAVAILABLE");
          const content=normalizeCheckInContent(data.note,data.mood as string|null|undefined);
          if(!content.ok||content.value.note!==data.note||content.value.mood!==(data.mood??null))return fail("SERVICE_UNAVAILABLE");
          activities.push({...display,checkIn:{note:content.value.note,
            ...(content.value.mood===null?{}:{mood:content.value.mood})}});
        }else{
          const event=await this.events?.display(tx,own.id,actor.owner,
            {type:row.type,sourceRecordId:row.sourceRecordId,occurredAt:row.occurredAt},now.value.toISOString(),"friends_activity_v1");
          if(event===undefined)continue;
          if(Object.keys(event).sort().join(",")!=="eventId,title"||
            !/^[A-Za-z0-9_-]{1,128}$/.test(event.eventId)||/[^A-Za-z0-9_-]/.test(event.eventId)||(event.eventId.startsWith("tm_")&&!/^tm_event_[0-9a-f]{64}$/.test(event.eventId))||
            typeof event.title!=="string"||!event.title.trim()||event.title!==event.title.trim()||event.title.length>500)return fail("SERVICE_UNAVAILABLE");
          activities.push({...display,event:{eventId:event.eventId,title:event.title}});
        }
        if(view==="home"&&activities.length===2)break;
      }
      return ok({activities});
    });}catch(e){return err(failure(e));}
  }
}
