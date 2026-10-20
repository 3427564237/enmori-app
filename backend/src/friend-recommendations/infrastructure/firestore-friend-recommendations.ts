import { rankAuthorizedFriendCandidates,type AuthorizedFriendRankingCandidateProjection,type AuthorizedFriendRankingProjection } from "../domain/friend-ranking.js";
import type { FriendEventProjection } from "../ports/friend-event-projection.js";
import { fail, failure, SocialFailure, visible } from "../../friends/domain/social-failure.js";
import type { Member, Reader, SocialAuthority } from "../../friends/ports/social-authority.js";
import type { FirestoreGateway,FirestoreTransactionGateway,StoredDocumentEntry } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { Clock } from "../../shared/ports/clock.js";
import { ok,err } from "../../shared/domain/result.js";
import type { FriendSuggestion,FriendRecommendations } from "../ports/friend-recommendations.js";
import { readPreference,preferenceVersion } from "./recommendation-preference.js";
const emptyEvents={authorizedInterestedEventIds:[],authorizedGoingEventIds:[]} as const;
async function tags(tx:Reader,id:string):Promise<Map<string,string>>{
  const selected=await tx.get(`account_interests/${id}`),values=new Map<string,string>();
  if(selected===undefined)return values;
  if(!Array.isArray(selected.interestTagIds)||selected.interestTagIds.length>10||
    new Set(selected.interestTagIds).size!==selected.interestTagIds.length)return fail("SERVICE_UNAVAILABLE");
  for(const tagId of selected.interestTagIds){
    if(typeof tagId!=="string"||!isSafeDocumentId(tagId))return fail("SERVICE_UNAVAILABLE");
    const tag=await tx.get(`interest_tags/${tagId}`);
    if(tag?.lifecycleState!=="active")continue;
    if(typeof tag.displayName!=="string"||!tag.displayName.trim()||tag.displayName!==tag.displayName.trim()||[...tag.displayName].length>50)return fail("SERVICE_UNAVAILABLE");
    values.set(tagId,tag.displayName);
  }
  return values;
}
/** Request-local computation; no persisted recommendations or result history. */
export class FirestoreFriendRecommendations implements FriendRecommendations {
  constructor(private readonly store:FirestoreGateway,private readonly clock:Clock,private readonly authority:SocialAuthority,private readonly events?:FriendEventProjection){}
  private async eventProjection(tx:Reader,requester:string,subject:string){
    if(!this.events)return fail("SERVICE_UNAVAILABLE");
    const value=await this.events.read(tx,requester,subject,"friend_recommendation_v1");
    if(!value||![value.interestedEventIds,value.goingEventIds].every(ids=>Array.isArray(ids)&&ids.length<=1000&&
      ids.every(id=>typeof id==="string"&&isSafeDocumentId(id))))return fail("SERVICE_UNAVAILABLE");
    return {authorizedInterestedEventIds:value.interestedEventIds,authorizedGoingEventIds:value.goingEventIds};
  }
  private async pool(tx:FirestoreTransactionGateway):Promise<readonly StoredDocumentEntry[]>{
    if(!tx.listDiscoverableAccountPage)return fail("SERVICE_UNAVAILABLE");
    const rows:StoredDocumentEntry[]=[];let after:string|undefined;
    for(let page=0;page<40;page++){
      const batch=await tx.listDiscoverableAccountPage(after,25);
      if(batch.length>25||batch.some(row=>!isSafeDocumentId(row.id)||(after!==undefined&&row.id<=after)))return fail("SERVICE_UNAVAILABLE");
      rows.push(...batch);if(batch.length<25)return rows;
      after=batch.at(-1)!.id;
    }
    // Explicit capacity failure. Never rank just an arbitrary prefix of users.
    return fail("SERVICE_UNAVAILABLE");
  }
  async recommend(uid:string,view:"home"|"all"){
    try{return await this.store.runTransaction(async tx=>{
      const own=await this.authority.viewer(tx,uid),now=this.clock.now();
      if(!now.ok)return fail("SERVICE_UNAVAILABLE");
      // Q17 consent precedes candidate construction; manual Friend paths remain available.
      if(own.data.optionalProcessingConsent!=="accepted")return ok({suggestions:[]});
      const ownTags=await tags(tx,own.id),candidates:AuthorizedFriendRankingCandidateProjection[]=[],
        displays=new Map<string,{username:string;displayName:string|null;sharedInterests:string[];ignoreVersion:string}>();
      let ownEvents:Omit<AuthorizedFriendRankingProjection,"authorizedInterestTagIds">|undefined;
      for(const row of await this.pool(tx)){
        if(row.id===own.id||row.data.profileVisibility!=="public")continue;
        let candidate;
        try{candidate=await this.authority.member(tx,row.id);}catch(e){
          if(e instanceof SocialFailure&&e.code==="ADD_FRIEND_TARGET_UNAVAILABLE")continue;throw e;
        }
        if(candidate.visibility!=="public"||candidate.data.optionalProcessingConsent!=="accepted")continue;
        const reservation=await tx.get(`username_reservations/${candidate.username}`);
        if(reservation?.accountId!==candidate.id)continue;
        const stored=await tx.get(`friend_pairs/${this.authority.pairKey(own.id,candidate.id)}`),pair=stored&&this.authority.parsePair(stored,own.id,candidate.id);
        if(stored&&!pair)return fail("SERVICE_UNAVAILABLE");
        if(pair?.friendship||pair?.blockedByAccountIds.length||
          (pair?.pending&&Date.parse(pair.pending.expiresAt)>now.value.getTime()))continue;
        const preference=await readPreference(tx,own.id,candidate.id);
        if(preference.ignored)continue;
        const permittedTags=visible(candidate.fields.interests,false,false)?await tags(tx,candidate.id):new Map<string,string>();
        let eventProjection=emptyEvents as Omit<AuthorizedFriendRankingProjection,"authorizedInterestTagIds">;
        if(visible(candidate.fields.participation,false,false)){
          ownEvents??=await this.eventProjection(tx,own.id,own.id);
          eventProjection=await this.eventProjection(tx,own.id,candidate.id);
        }
        candidates.push({candidateAccountId:candidate.id,authorizedInterestTagIds:[...permittedTags.keys()],...eventProjection});
        displays.set(candidate.id,{username:candidate.username,displayName:candidate.displayName,
          ignoreVersion:preferenceVersion(own.id,candidate.id,preference.revision),
          sharedInterests:[...permittedTags].filter(([id])=>ownTags.has(id)).map(([,name])=>name)});
      }
      const ranked=rankAuthorizedFriendCandidates({authorizedInterestTagIds:[...ownTags.keys()],...(ownEvents??emptyEvents)},candidates);
      const selected=view==="home"?ranked.slice(0,2):ranked;
      const suggestions:FriendSuggestion[]=selected.map(row=>{
        const display=displays.get(row.candidateAccountId)!;
        const commonEventCount=row.factors.common_event.matchedCount;
        const parts=[...(display.sharedInterests.length?[`${display.sharedInterests.length} shared interest${display.sharedInterests.length===1?"":"s"}`]:[]),
          ...(commonEventCount?[`${commonEventCount} common event${commonEventCount===1?"":"s"}`]:[])];
        return {...display,commonEventCount,reason:parts.join(" · ")};
      });
      return ok({suggestions});
    });}catch(e){return err(failure(e));}
  }
}
