import {
  parseRecommendationProfile,
  civilAge,
  singaporeDate,
} from "../domain/recommendation-profile.js";
import type { RecommendationProfiles } from "../ports/recommendation-profile.js";
import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import type { Clock } from "../../shared/ports/clock.js";
import {
  viewer,
  context,
  failure,
  fail,
} from "../../friends/infrastructure/social-authority.js";
import { ok, err } from "../../shared/domain/result.js";
import { appFailure } from "../../shared/application/app-failure.js";
export class FirestoreRecommendationProfiles implements RecommendationProfiles {
  constructor(
    private readonly store: FirestoreGateway,
    private readonly clock: Clock,
  ) {}
  async read(uid: string) {
    try {
      return await this.store.runTransaction(async (tx) => {
        const own = await viewer(tx, uid),
          profile = parseRecommendationProfile(own.data.recommendationProfile);
        if (!profile) return fail("SERVICE_UNAVAILABLE");
        return ok(profile);
      });
    } catch (e) {
      return err(failure(e));
    }
  }
  async save(uid: string, body: unknown) {
    try {
      if (!body || typeof body !== "object" || Array.isArray(body))
        return err(appFailure("PROFILE_INVALID"));
      const { expectedRevision, ...values } = body as Record<string, unknown>;
      const proposed = parseRecommendationProfile({
        ...values,
        revision: expectedRevision,
      });
      const now = this.clock.now();
      if (!now.ok) return err(appFailure("SERVICE_UNAVAILABLE"));
      if (
        !proposed ||
        (proposed.birthDate !== null &&
          civilAge(
            proposed.birthDate,
            singaporeDate(now.value.toISOString()),
          ) === undefined)
      )
        return err(appFailure("PROFILE_INVALID"));
      return await this.store.runTransaction(async (tx) => {
        const own = await viewer(tx, uid),
          previous = parseRecommendationProfile(own.data.recommendationProfile);
        if (!previous) return fail("SERVICE_UNAVAILABLE");
        if (previous.revision !== expectedRevision)
          return err(appFailure("PROFILE_REVISION_PRECONDITION_FAILED"));
        const profile = { ...proposed, revision: previous.revision + 1 };
        tx.set(`accounts/${own.id}`, {
          ...own.data,
          recommendationProfile: profile,
        });
        return ok(profile);
      });
    } catch (e) {
      return err(failure(e));
    }
  }
  async card(uid: string, username: string) {
    try {
      return await this.store.runTransaction(async (tx) => {
        const c = await context(tx, uid, username, false),
          p = parseRecommendationProfile(c.target.data.recommendationProfile);
        if (!p) return fail("SERVICE_UNAVAILABLE");
        if (
          !p.discoverable ||
          c.target.data.optionalProcessingConsent !== "accepted" ||
          c.viewer.data.optionalProcessingConsent !== "accepted"
        )
          return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
        return ok({
          username: c.target.username,
          displayName: c.target.displayName,
        });
      });
    } catch (e) {
      return err(failure(e));
    }
  }
}
