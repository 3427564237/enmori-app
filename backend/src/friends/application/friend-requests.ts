import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, type Result } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { canonicalizeUsername } from "../../onboarding/domain/username.js";
import type { FriendRepository, FriendResult, FriendTarget, FriendInbox, MyFriendsPage } from "../ports/friend-repository.js";

function mapped<T>(result: FriendResult<T>): Result<T, AppFailure> {
  if (result.ok) return result;
  const codes = { onboarding_required: "ONBOARDING_REQUIRED", forbidden: "AUTH_FORBIDDEN", target_unavailable: "ADD_FRIEND_TARGET_UNAVAILABLE", request_unavailable: "FRIEND_REQUEST_UNAVAILABLE", invalid_input: "REQUEST_INVALID", dependency_unavailable: "SERVICE_UNAVAILABLE" } as const;
  return err(appFailure(codes[result.failure]));
}
export class FriendRequests {
  private readonly limits = new Map<string, { start: number; count: number }>();
  public constructor(private readonly repository: FriendRepository, private readonly clock: Clock) {}
  public async lookup(principal: AuthPrincipal, username: string, send = false): Promise<Result<FriendTarget, AppFailure>> {
    const authorized = await this.repository.authorize(principal.firebaseUid);
    if (!authorized.ok) return mapped(authorized);
    const normalized = canonicalizeUsername(username);
    if (!normalized.ok) return err(appFailure("USERNAME_INVALID"));
    const clock = this.clock.now();
    if (!clock.ok || !Number.isFinite(clock.value.getTime())) return err(appFailure("SERVICE_UNAVAILABLE"));
    const now = clock.value.getTime();
    for (const [key, value] of this.limits) if (now - value.start >= 60000 || now < value.start) this.limits.delete(key);
    const key = `${send ? "send" : "lookup"}:${principal.firebaseUid}`;
    const window = this.limits.get(key) ?? { start: now, count: 0 };
    this.limits.set(key, window);
    if (++window.count > (send ? 10 : 30)) return err(appFailure("ADD_FRIEND_TARGET_UNAVAILABLE"));
    return mapped(await this.repository.lookup(principal.firebaseUid, normalized.value, send));
  }
  public async inbox(principal: AuthPrincipal, cursor?: string): Promise<Result<FriendInbox, AppFailure>> {
    return mapped(await this.repository.inbox(principal.firebaseUid, cursor));
  }
  public async searchFriends(principal: AuthPrincipal, input: unknown): Promise<Result<MyFriendsPage, AppFailure>> {
    return mapped(await this.repository.searchFriends(principal.firebaseUid, input));
  }
  public async listFriends(principal: AuthPrincipal, cursor?: string): Promise<Result<MyFriendsPage, AppFailure>> {
    return mapped(await this.repository.listFriends(principal.firebaseUid, cursor));
  }
  public async act(principal: AuthPrincipal, ref: string, action: "accept" | "decline") {
    return mapped(await this.repository.act(principal.firebaseUid, ref, action));
  }
}
