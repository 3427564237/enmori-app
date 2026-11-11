import type { ActivityType } from "../domain/rank-activity.js";
import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
import type { SocialSourceReader } from "../../friend-recommendations/ports/friend-event-projection.js";
export interface ActivityItem {readonly type:ActivityType;readonly sourceRecordId:string;readonly occurredAt:string;readonly username:string;readonly displayName:string|null;
  readonly checkIn?:{readonly note:string;readonly mood?:string};
  readonly event?:{readonly eventId:string;readonly title:string};
}
export type ActivityCategory="all"|ActivityType;
export interface FriendActivity {
  read(uid:string,view:"home"|"all",category:ActivityCategory):Promise<Result<{readonly activities:readonly ActivityItem[]},AppFailure>>;
}
/** SHI supplies current, purpose-authorized source metadata in this transaction.
 * IDs identify the participation source (not an ambiguous actor/event concat).
 * Missing adapter is unavailable, not a successful empty event feed. */
export interface EventActivityMetadata {
  readonly type:"event_interested"|"event_going";readonly sourceRecordId:string;readonly occurredAt:string;
}
export interface EventActivitySource {
  /** Prepare the existing public source outside transactions after viewer
   * authorization. Personal sources and permissions are freshly read afterward. */
  prepare?(asOf:string):Promise<void|{readonly current:()=>boolean}>;
  read(tx:SocialSourceReader,viewerAccountId:string,ownerAccountId:string,asOf:string,
    purpose:"friends_activity_v1"):Promise<readonly EventActivityMetadata[]|undefined>;
  /** After ranking only. Recheck exact participation and current gated Event source;
   * undefined is unavailable/revoked content, never an archived title fallback. */
  display(tx:SocialSourceReader,viewerAccountId:string,ownerAccountId:string,source:EventActivityMetadata,
    asOf:string,purpose:"friends_activity_v1"):Promise<{readonly eventId:string;readonly title:string}|undefined>;
}
