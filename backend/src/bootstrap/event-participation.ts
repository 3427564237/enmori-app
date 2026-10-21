import { requireRemoteGroupEnvironment } from '../shared/infrastructure/firebase/feature-environment.js';
import type { FirestoreGateway, FirestoreTransactionGateway } from '../shared/infrastructure/firebase/firestore-gateway.js';
import { parseOwnProfile } from '../account/infrastructure/firestore-account-preferences-repository.js';
import { isVisibility,type ProfileVisibility } from '../account/domain/profile-values.js';
import { readFriendVisibility } from '../friends/infrastructure/firestore-friend-repository.js';
import { FirestoreParticipationRepository } from '../event-participation/infrastructure/firestore-participation-repository.js';
import { ParticipationOperations } from '../event-participation/application/participation-operations.js';
import { EventBrowse } from '../event-browse/application/event-browse.js';
import { BrowseCursor } from '../event-browse/infrastructure/browse-cursor.js';
import type { ParticipationAccessPort } from '../event-participation/ports/participation-repository.js';
import type { BrowseSource } from '../event-browse/ports/event-browse.js';
import type { Clock } from '../shared/ports/clock.js';
import { sourceEventId } from './controlled-event-recommendations.js';
import { requireControlledEmulatorEnvironment } from '../shared/infrastructure/firebase/controlled-emulator-environment.js';
import { isSafeDocumentId } from '../shared/infrastructure/firebase/firestore-records.js';

/** Composition alone may see both Infrastructure implementations. The feature
 * adapter receives only its transaction-bound inner Access Port. */
export function participationAccess(tx: FirestoreTransactionGateway): ParticipationAccessPort {
  return {
    async accountForUsername(username) {
      const reservation=await tx.get(`username_reservations/${username}`);
      if(typeof reservation?.accountId!=='string'||!isSafeDocumentId(reservation.accountId)||/[\s/]/.test(reservation.accountId)||Object.keys(reservation).length!==1)return undefined;
      const account=await tx.get(`accounts/${reservation.accountId}`);
      return account&&parseOwnProfile(account)?.username===username?reservation.accountId:undefined;
    },
    async resolve(viewer,target) {
      const data=await tx.get(`accounts/${target}`), access=await tx.get(`friend_access/${target}`);
      if(!data || access?.eligibilityState==='permanently-deleted'||access?.eligibilityState==='temporary-ineligible')return undefined;
      if(access?.eligibilityState!=='eligible')return undefined; // legacy denied
      const profile=parseOwnProfile(data);
      if(!profile||/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(profile.username))throw new Error('Invalid profile projection');
      let participationPrivacy:ProfileVisibility='private';
      if(data.fieldPrivacy!==undefined){
        if(typeof data.fieldPrivacy!=='object'||data.fieldPrivacy===null||Array.isArray(data.fieldPrivacy))throw new Error('Invalid participation privacy');
        const v=(data.fieldPrivacy as Record<string,unknown>).participation;
        if(v!==undefined){if(!isVisibility(v))throw new Error('Invalid participation privacy');participationPrivacy=v;}
      }
      const relation=await readFriendVisibility(tx,viewer,target);
      const nameAllowed=viewer===target||profile.profileVisibility==='public'||(profile.profileVisibility==='friends_only'&&relation.isFriend&&!relation.isBlocked);
      return {username:profile.username,...(nameAllowed&&profile.displayName!==null?{displayName:profile.displayName}:{}),
        ...relation,eligible:true,participationPrivacy};
    },
  };
}

/** Deliberate isolated-only entry. No ordinary/real-account rollout by presence. */
interface ParticipationOptions {
  readonly environment: Readonly<Record<string,string|undefined>>;
  readonly firestore: FirestoreGateway; readonly clock: Clock;
  readonly source: BrowseSource; readonly cursorKey: Uint8Array;
}
export function createIsolatedEventParticipation(options: ParticipationOptions) {
  requireControlledEmulatorEnvironment(options.environment);
  return createParticipation(options);
}
export function createRemoteEventParticipation(options: ParticipationOptions) {
  requireRemoteGroupEnvironment(options.environment);
  return createParticipation(options);
}
function createParticipation(options: ParticipationOptions) {
  const repository=new FirestoreParticipationRepository(options.firestore,options.clock,async id=>{
    const now=options.clock.now();if(!now.ok)throw new Error('Clock unavailable');
    if(options.source.availableEvent)return options.source.availableEvent(id,now.value.toISOString(),new AbortController().signal);
    return (await options.source.firstBatch(now.value.toISOString(),new AbortController().signal)).some(row=>sourceEventId(row.browseId)===id);
  },participationAccess,options.cursorKey);
  const operations=new ParticipationOperations(repository);
  const browse=new EventBrowse({verify:principal=>operations.authorize(principal.firebaseUid)},options.source,()=>{
    const instant=options.clock.now();if(!instant.ok)throw new Error('Clock unavailable');return instant.value;
  },true,new BrowseCursor(options.cursorKey));
  return {repository,operations,browse,async ignoredEventIds(uid:string,ids:readonly string[]):Promise<readonly string[]>{
    if(ids.length>20)throw new Error('Source bound exceeded');
    const result:string[]=[];
    for(const id of ids){const r=await repository.read(uid,id);if(!r.ok)throw new Error('Participation unavailable');if(r.value.ignored)result.push(id);}
    return result;
  }};
}
