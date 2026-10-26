/** Vendor-neutral, read-only source view; the composition supplies one transaction. */
export interface SocialSourceReader {
  get(path:string):Promise<Readonly<Record<string,unknown>>|undefined>;
  listWherePage?(collection:string,equal:Readonly<Record<string,string>>,afterId:string|undefined,limit:number):
    Promise<readonly {readonly id:string;readonly data:Readonly<Record<string,unknown>>}[]>;
}
/** Current, eligible, purpose-authorized Interested/Going IDs only. undefined
 * is unavailable, never an empty successful event history. */
export interface FriendEventProjection {
  /** Optional public Event source readiness, outside any Firestore transaction.
   * Called only after current owner/purpose authorization, then followed by a
   * fresh full authorization transaction. No owner data, retry or stale fallback. */
  prepare?(asOf:string):Promise<void>;
  /** Personal reads use this transaction only; no remote IO or writes here.
   * All subjects share the recommendation's captured ranking instant. */
  read(reader:SocialSourceReader,requesterAccountId:string,subjectAccountId:string,
    purpose:"friend_recommendation_v1",asOf:string):Promise<{
      interestedEventIds:readonly string[];goingEventIds:readonly string[];
    }|undefined>;
}
