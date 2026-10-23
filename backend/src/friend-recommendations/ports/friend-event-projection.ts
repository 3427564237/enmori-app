/** Vendor-neutral, read-only source view; the composition supplies one transaction. */
export interface SocialSourceReader {
  get(path:string):Promise<Readonly<Record<string,unknown>>|undefined>;
  listWherePage?(collection:string,equal:Readonly<Record<string,string>>,afterId:string|undefined,limit:number):
    Promise<readonly {readonly id:string;readonly data:Readonly<Record<string,unknown>>}[]>;
}
/** SHI-owned producer: current, eligible, purpose-authorized Interested/Going
 * IDs only. undefined is unavailable, never an empty successful event history.
 * All reads must use the supplied transaction; no remote IO or writes here. */
export interface FriendEventProjection {
  read(reader:SocialSourceReader,requesterAccountId:string,subjectAccountId:string,
    purpose:"friend_recommendation_v1"):Promise<{
      interestedEventIds:readonly string[];goingEventIds:readonly string[];
    }|undefined>;
}
