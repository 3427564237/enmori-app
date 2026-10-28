import { parseRecommendationProfile, civilAge, singaporeDate } from "../../recommendation-profile/domain/recommendation-profile.js";
import { area } from "../../recommendation-profile/domain/areas.js";
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
  constructor(private readonly store:FirestoreGateway,private readonly clock:Clock,private readonly authority:SocialAuthority,private readonly events?:FriendEventProjection,private readonly personalized=false){}
  private profileSignals(member:Member,self:boolean,asOf:string){
    if(!this.personalized)return {};
    const p=parseRecommendationProfile(member.data.recommendationProfile);if(!p)return fail("SERVICE_UNAVAILABLE");
    const a=p.matchRegion?area(p.homeAreaCode):undefined;
    const age=p.matchAge?civilAge(p.birthDate,singaporeDate(asOf)):undefined;
    const canonical=(s:string)=>s.normalize("NFC").trim().toLowerCase().replace(/\s+/gu," ");
    const affiliation=p.matchAffiliation&&member.details.affiliationType&&member.details.affiliationName;
    return {...(a?{authorizedRegion:a.code,authorizedBroadRegion:a.regionCode}:{}),
      ...(age!==undefined?{authorizedAge:age}:{}),
      ...(affiliation?{authorizedAffiliation:member.details.affiliationType+":"+canonical(affiliation)}:{})};
  }
  private async eventProjection(tx:Reader,requester:string,subject:string,asOf:string){
    if(!this.events)return fail("SERVICE_UNAVAILABLE");
    const value=await this.events.read(tx,requester,subject,"friend_recommendation_v1",asOf);
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
  async recommend(uid:string,view:"home"|"all"):ReturnType<FriendRecommendations["recommend"]>{
    try{
      let source:void|{readonly current:()=>boolean}=undefined;
      if(this.events?.prepare){
        const permitted=await this.store.runTransaction(async tx=>{const own=await this.authority.viewer(tx,uid);const p=parseRecommendationProfile(own.data.recommendationProfile);if(!p)return fail("SERVICE_UNAVAILABLE");return own.data.optionalProcessingConsent==="accepted"&&(!this.personalized||p.discoverable);});
        if(!permitted)return ok({suggestions:[],...(this.personalized?{ownState:"disabled" as const}:{})});
        const before=this.clock.now();if(!before.ok||!Number.isFinite(before.value.getTime()))return fail("SERVICE_UNAVAILABLE");
        // Provider readiness never holds a Firestore transaction open. Waiting
        // cannot grant source/owner authority: the full transaction below rereads it.
        source=await this.events.prepare(before.value.toISOString());
      }
      const result=await this.store.runTransaction(async tx=>{
      const own=await this.authority.viewer(tx,uid),now=this.clock.now();
      if(!now.ok||!Number.isFinite(now.value.getTime()))return fail("SERVICE_UNAVAILABLE");
      const asOf=now.value.toISOString();
      // Q17 consent precedes candidate construction; manual Friend paths remain available.
      if(own.data.optionalProcessingConsent!=="accepted")return ok({suggestions:[],...(this.personalized?{ownState:"disabled" as const}:{})});
      const ownPreference=parseRecommendationProfile(own.data.recommendationProfile);if(!ownPreference)return fail("SERVICE_UNAVAILABLE");
      if(this.personalized&&!ownPreference.discoverable)return ok({suggestions:[],...(this.personalized?{ownState:"disabled" as const}:{})});
      const ownTags=!this.personalized||ownPreference.matchInterests?await tags(tx,own.id):new Map<string,string>(),candidates:AuthorizedFriendRankingCandidateProjection[]=[],
        displays=new Map<string,{username:string;displayName:string|null;sharedInterests:string[];ignoreVersion:string}>();
      let ownEvents:Omit<AuthorizedFriendRankingProjection,"authorizedInterestTagIds">|undefined;
      for(const row of await this.pool(tx)){
        if(row.id===own.id)continue;
        if(!this.personalized&&row.data.profileVisibility!=="public")continue;
        let candidate;
        try{candidate=await this.authority.member(tx,row.id);}catch(e){
          if(e instanceof SocialFailure&&e.code==="ADD_FRIEND_TARGET_UNAVAILABLE")continue;throw e;
        }
        const candidatePreference=parseRecommendationProfile(candidate.data.recommendationProfile);if(!candidatePreference)return fail("SERVICE_UNAVAILABLE");
        if((this.personalized?!candidatePreference.discoverable:candidate.visibility!=="public")||candidate.data.optionalProcessingConsent!=="accepted")continue;
        const reservation=await tx.get(`username_reservations/${candidate.username}`);
        if(reservation?.accountId!==candidate.id)continue;
        const stored=await tx.get(`friend_pairs/${this.authority.pairKey(own.id,candidate.id)}`),pair=stored&&this.authority.parsePair(stored,own.id,candidate.id);
        if(stored&&!pair)return fail("SERVICE_UNAVAILABLE");
        if(pair?.friendship||pair?.blockedByAccountIds.length||
          (pair?.pending&&Date.parse(pair.pending.expiresAt)>now.value.getTime()))continue;
        const preference=await readPreference(tx,own.id,candidate.id);
        if(preference.ignored)continue;
        const permittedTags=(this.personalized?candidatePreference.matchInterests:visible(candidate.fields.interests,false,false))?await tags(tx,candidate.id):new Map<string,string>();
        let eventProjection=emptyEvents as Omit<AuthorizedFriendRankingProjection,"authorizedInterestTagIds">;
        if(visible(candidate.fields.participation,false,false)){
          ownEvents??=await this.eventProjection(tx,own.id,own.id,asOf);
          eventProjection=await this.eventProjection(tx,own.id,candidate.id,asOf);
        }
        candidates.push({...this.profileSignals(candidate,false,asOf),candidateAccountId:candidate.id,authorizedInterestTagIds:[...permittedTags.keys()],...eventProjection});
        displays.set(candidate.id,{username:candidate.username,displayName:candidate.displayName,
          ignoreVersion:preferenceVersion(own.id,candidate.id,preference.revision),
          sharedInterests:(visible(candidate.fields.interests,false,false)?[...permittedTags]:[]).filter(([id])=>ownTags.has(id)).map(([,name])=>name)});
      }
      const ranked=rankAuthorizedFriendCandidates({...this.profileSignals(own,true,asOf),authorizedInterestTagIds:[...ownTags.keys()],...(ownEvents??emptyEvents)},candidates,this.personalized?"v3":"v1");
      const selected=view==="home"?ranked.slice(0,2):ranked;
      const suggestions:FriendSuggestion[]=selected.map(row=>{
        const display=displays.get(row.candidateAccountId)!;
        const commonEventCount=row.factors.common_event.matchedCount;
        const parts=[...(display.sharedInterests.length?[`${display.sharedInterests.length} shared interest${display.sharedInterests.length===1?"":"s"}`]:[]),
          ...(commonEventCount?[`${commonEventCount} common event${commonEventCount===1?"":"s"}`]:[]),
          ...(row.factors.same_region?[this.personalized?"Same area":"Same shared region"]:[]),...(row.factors.same_broad_region?["Same region"]:[]),...(row.factors.similar_age?["Similar age range"]:[]),...(row.factors.shared_interest.matchedCount&&!display.sharedInterests.length?["Shared interests"]:[]),...(row.factors.same_affiliation?["Same shared school or organization"]:[])];
        return {...display,commonEventCount,reason:parts.join(" · ")};
      });
      const signals=this.profileSignals(own,true,asOf);
      const hasSignals=ownTags.size>0||!!signals.authorizedRegion||!!signals.authorizedAffiliation||!!ownEvents&&(ownEvents.authorizedInterestedEventIds.length>0||ownEvents.authorizedGoingEventIds.length>0);
      return ok({suggestions,...(this.personalized?{ownState:suggestions.length?'ready' as const:hasSignals?'no_matches' as const:'incomplete' as const}:{})});
    });
      if(source&&!source.current())return fail("SERVICE_UNAVAILABLE");
      return result;
    }catch(e){return err(failure(e));}
  }
}
