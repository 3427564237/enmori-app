import type { FieldPrivacy, ProfileDetails } from "../../account/domain/profile-details.js";
import type { ProfileVisibility } from "../../account/domain/profile-values.js";
export type SocialDocument = Readonly<Record<string, unknown>>;
export interface Reader { get(path: string): Promise<SocialDocument | undefined> }
export interface Member {
  id: string; data: SocialDocument; username: string; displayName: string | null;
  visibility: ProfileVisibility; fields: FieldPrivacy; details: ProfileDetails;
}
export interface SocialContext {
  viewer: Member; target: Member; self: boolean; friend: boolean; pairPath: string;
  pair: SocialDocument | undefined; revision: number; specialCare: boolean;
}
export interface SocialPair {
  readonly accountIds: readonly string[]; readonly blockedByAccountIds: readonly string[];
  readonly friendship: boolean; readonly pending: { readonly expiresAt: string } | null;
}
/** Public read authority. Implemented by Friends and injected at composition;
 * consumers use the same request transaction, never a second auth snapshot. */
export interface SocialAuthority {
  member(reader: Reader, id: string): Promise<Member>;
  viewer(reader: Reader, uid: string): Promise<Member>;
  context(reader: Reader, uid: string, username: string, profileRequired?: boolean): Promise<SocialContext>;
  pairKey(a: string, b: string): string;
  parsePair(data: SocialDocument | undefined, a: string, b: string): SocialPair | undefined;
  revision(pair: SocialDocument | undefined, accountId: string): number;
}
