import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
export interface FriendSuggestion {
  readonly username:string;readonly displayName:string|null;
  readonly sharedInterests:readonly string[];readonly commonEventCount:number;readonly reason:string;
  readonly ignoreVersion:string;
}
export interface FriendRecommendations {
  recommend(uid:string,view:"home"|"all"):Promise<Result<{suggestions:readonly FriendSuggestion[]},AppFailure>>;
}
