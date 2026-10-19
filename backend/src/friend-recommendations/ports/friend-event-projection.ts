import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
export interface SocialSourceReader {get(path:string):Promise<StoredDocument|undefined>}
/** SHI-owned producer: current, eligible, purpose-authorized Interested/Going
 * IDs only. undefined is unavailable, never an empty successful event history.
 * All reads must use the supplied transaction; no remote IO or writes here. */
export interface FriendEventProjection {
  read(reader:SocialSourceReader,requesterAccountId:string,subjectAccountId:string,
    purpose:"friend_recommendation_v1"):Promise<{
      interestedEventIds:readonly string[];goingEventIds:readonly string[];
    }|undefined>;
}
