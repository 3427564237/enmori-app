import type { RecommendationProfile } from "../domain/recommendation-profile.js";
import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
export interface RecommendationProfiles {
  read(uid: string): Promise<Result<RecommendationProfile, AppFailure>>;
  save(
    uid: string,
    body: unknown,
  ): Promise<Result<RecommendationProfile, AppFailure>>;
  card(
    uid: string,
    username: string,
  ): Promise<
    Result<{ username: string; displayName: string | null }, AppFailure>
  >;
}
