import type { ActivityType } from "../domain/rank-activity.js";
import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
import type { SocialSourceReader } from "../../friend-recommendations/ports/friend-event-projection.js";
export interface ActivityItem {readonly type:ActivityType;readonly sourceRecordId:string;readonly occurredAt:string;readonly username:string;readonly displayName:string|null;}
export type ActivityCategory="all"|ActivityType;
export interface FriendActivity {
  read(uid:string,view:"home"|"all",category:ActivityCategory):Promise<Result<{readonly activities:readonly ActivityItem[]},AppFailure>>;
}
/** SHI supplies current, purpose-authorized source metadata in this transaction.
 * IDs identify the participation source (not an ambiguous actor/event concat).
 * Missing adapter is unavailable, not a successful empty event feed. */
export interface EventActivitySource {
  read(tx:SocialSourceReader,viewerAccountId:string,ownerAccountId:string,asOf:string,
    purpose:"friends_activity_v1"):Promise<readonly {readonly type:"event_interested"|"event_going";readonly sourceRecordId:string;readonly occurredAt:string}[]|undefined>;
}
