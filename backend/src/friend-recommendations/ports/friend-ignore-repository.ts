import type { AppFailure } from "../../shared/application/app-failure.js";
import type { Result } from "../../shared/domain/result.js";

export interface FriendIgnoreState {
  readonly username: string;
  readonly displayName: string | null;
  readonly ignored: boolean;
  /** Opaque owner/target/version binding. Never an account ID or authority token. */
  readonly version: string;
}
export interface FriendIgnoreRepository {
  list(uid: string): Promise<Result<{ people: readonly FriendIgnoreState[] }, AppFailure>>;
  read(uid: string, username: string): Promise<Result<FriendIgnoreState, AppFailure>>;
  set(uid: string, username: string, ignored: boolean, expectedVersion: string): Promise<Result<FriendIgnoreState, AppFailure>>;
}
