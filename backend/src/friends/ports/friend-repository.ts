import type { Result } from "../../shared/domain/result.js";
export type FriendFailure = "onboarding_required" | "forbidden" | "target_unavailable" | "request_unavailable" | "invalid_input" | "dependency_unavailable";
export type FriendResult<T> = Result<T, FriendFailure>;
export type RelationshipState = "self" | "already_friends" | "outgoing_request_pending" | "incoming_request_pending" | "can_send_request";
export interface FriendTarget { readonly username: string; readonly displayName: string; readonly relationshipState: RelationshipState }
export interface FriendInbox { readonly requests: readonly { readonly username: string; readonly displayName: string; readonly requestRef: string }[]; readonly nextCursor: string | null }
export interface MyFriendsPage { readonly friends: readonly { readonly username: string; readonly displayName: string }[]; readonly nextCursor: string | null }
export interface FriendRepository {
  authorize(uid: string): Promise<FriendResult<void>>;
  lookup(uid: string, username: string, send: boolean): Promise<FriendResult<FriendTarget>>;
  inbox(uid: string, cursor?: string): Promise<FriendResult<FriendInbox>>;
  listFriends(uid: string, cursor?: string): Promise<FriendResult<MyFriendsPage>>;
  act(uid: string, requestRef: string, action: "accept" | "decline"): Promise<FriendResult<{ readonly result: "accepted" | "declined" }>>;
}
