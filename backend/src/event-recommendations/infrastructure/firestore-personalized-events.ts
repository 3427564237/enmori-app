import type { FirestoreGateway, FirestoreTransactionGateway as Tx } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import type { SocialAuthority } from '../../friends/ports/social-authority.js';
import { SocialFailure, visible } from '../../friends/domain/social-failure.js';
import type { FriendEventProjection } from '../../friend-recommendations/ports/friend-event-projection.js';
import type { RecommendationSnapshot } from '../../event-browse/ports/event-browse.js';
import { sourceEventId } from '../../event-browse/domain/source-event-id.js';
import { isSafeDocumentId, sha256 } from '../../shared/infrastructure/firebase/firestore-records.js';
import { parseEventInstant, parseMatchingInterest, parseSelectedInterests } from './event-records.js';
import type { EventRecommendationReadResult } from '../ports/event-recommendation-repository.js';

export function matchingRegion(a: string | null | undefined, b: string | null | undefined): boolean {
  const canonical = (v: string | null | undefined) => v?.normalize('NFC').trim().toLowerCase().replace(/\s+/gu, ' ');
  return !!a?.trim() && !!b?.trim() && canonical(a) === canonical(b);
}

/** Provider I/O has already completed. All personal signals and exclusions are
 * reread in one transaction; no stored scores, history, new collection or model. */
export class FirestorePersonalizedEvents {
  constructor(private readonly store: FirestoreGateway, private readonly authority: SocialAuthority,
    private readonly events: FriendEventProjection, private readonly musicInterestTagId: string) {}

  private async friends(tx: Tx, owner: string) {
    const root = await tx.get(`friend_lists/${owner}`);
    if (!root || root.initialized !== true || !tx.listPage) throw Error('Friend index unavailable');
    const ids: string[] = [];
    let after: string | undefined;
    for (let page=0;page<40;page++) {
      const rows=await tx.listPage(`friend_lists/${owner}/members`,after,25);
      if(rows.length>25)throw Error('Friend capacity');
      for(const row of rows) {
        if(!isSafeDocumentId(row.id)||(after!==undefined&&row.id<=after))throw Error('Friend order');
        after=row.id;
        if(typeof row.data.pairKey!=='string'||!/^[0-9a-f]{64}$/.test(row.data.pairKey))throw Error('Invalid friend pointer');
        const stored=await tx.get(`friend_pairs/${row.data.pairKey}`);
        if(!stored||!Array.isArray(stored.accountIds)||stored.accountIds.length!==2||!stored.accountIds.includes(owner))throw Error('Invalid friend pair');
        const other=stored.accountIds.find(id=>id!==owner);
        if(typeof other!=='string'||!isSafeDocumentId(other)||this.authority.pairKey(owner,other)!==row.data.pairKey)throw Error('Invalid friend identity');
        const pair=this.authority.parsePair(stored,owner,other);
        if(!pair)throw Error('Invalid friend pair');
        if(!pair.friendship||pair.blockedByAccountIds.length)continue;
        const refs=stored.listRefs;
        if(!refs||typeof refs!=='object'||(refs as Record<string,unknown>)[owner]!==row.id)throw Error('Stale friend pointer');
        if(!ids.includes(other))ids.push(other);
      }
      if(rows.length<25)return ids;
    }
    throw Error('Friend capacity');
  }
  async read(uid: string, asOf: string, snapshot: RecommendationSnapshot): Promise<EventRecommendationReadResult> {
    try {
      const result = await this.store.runTransaction(async tx => {
        const own=await this.authority.viewer(tx,uid);
        const empty: EventRecommendationReadResult={kind:'ready',sources:{formulaVersion:'event_recommendation_v2',selectedInterestTagIds:[],interestTags:[],events:[]}};
        if(own.data.optionalProcessingConsent!=='accepted')return empty;
        const raw=await tx.get(`account_interests/${own.id}`);
        const selected=raw===undefined?[]:parseSelectedInterests(raw);
        if(!selected)throw Error('Interest source unavailable');
        const interestTags=[];
        for(const id of selected) {
          const row=await tx.get(`interest_tags/${id}`);
          if(row===undefined)continue;
          const tag=parseMatchingInterest(id,row);
          if(!tag)throw Error('Interest source invalid');
          if(tag.lifecycleState==='active')interestTags.push(tag);
        }
        const counts=new Map<string,number>();
        for(const id of await this.friends(tx,own.id)) {
          let friend;
          try{friend=await this.authority.member(tx,id);}catch(error){
            if(error instanceof SocialFailure&&error.code==='ADD_FRIEND_TARGET_UNAVAILABLE')continue;
            throw error;
          }
          const stored=await tx.get(`friend_pairs/${this.authority.pairKey(own.id,id)}`);
          const pair=stored&&this.authority.parsePair(stored,own.id,id);
          if(stored&&!pair)throw Error('Invalid relationship');
          if(!pair?.friendship||pair.blockedByAccountIds.length||friend.data.optionalProcessingConsent!=='accepted'||
            !visible(friend.visibility,false,true)||!visible(friend.fields.participation,false,true))continue;
          const source=await this.events.read(tx,own.id,id,'friend_recommendation_v1',asOf);
          if(!source)throw Error('Participation unavailable');
          for(const event of new Set([...source.interestedEventIds,...source.goingEventIds]))counts.set(event,(counts.get(event)??0)+1);
        }
        const events=[];
        for(const row of snapshot.items) {
          const eventId=sourceEventId(row.browseId);
          const preference=await tx.get(`event_participations/${sha256(JSON.stringify([own.id,eventId]))}`);
          if(preference && (preference.accountId!==own.id||preference.eventId!==eventId||typeof preference.ignored!=='boolean'))throw Error('Invalid preference');
          if(preference?.ignored===true)continue;
          const startInstant=parseEventInstant(row.startAt);
          if(startInstant===undefined)throw Error('Invalid source instant');
          const matched=interestTags.filter(tag=>tag.displayName==='Music'
            ? tag.interestTagId===this.musicInterestTagId&&row.musicSegment===true
            : row.interestConcepts?.includes(tag.displayName));
          events.push({scoring:{eventId,active:true,published:true,startInstant,
            interestTagIds:matched.map(tag=>tag.interestTagId),
            visibleFriendCount:counts.get(eventId)??0,
            sameRegion:row.regionNames?.some(region=>matchingRegion(own.details.region,region))??false},
            presentation:{title:row.title,startAt:row.startAt,...(row.endAt?{endAt:row.endAt}:{})}});
        }
        if(!snapshot.current())throw Error('Source generation invalidated');
        return {kind:'ready' as const,sources:{formulaVersion:'event_recommendation_v2' as const,
          selectedInterestTagIds:selected,interestTags,events}};
      });
      return snapshot.current() ? result : {kind:'dependency_unavailable'};
    } catch(error) {
      if(error instanceof SocialFailure && error.code==='ONBOARDING_REQUIRED')return {kind:'onboarding_required'};
      if(error instanceof SocialFailure && error.code==='AUTH_FORBIDDEN')return {kind:'forbidden'};
      return {kind:'dependency_unavailable'};
    }
  }
}
