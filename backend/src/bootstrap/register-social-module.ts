import { firestoreSocialAuthority } from "../friends/infrastructure/social-authority.js";
import type { FastifyInstance } from "fastify";
import type { IdentityVerifier } from "../shared/ports/identity-verifier.js";
import type { FirestoreGateway } from "../shared/infrastructure/firebase/firestore-gateway.js";
import type { CheckInHistoryFirestoreGateway } from "../check-ins/ports/check-in-history-firestore-gateway.js";
import type { CheckInHistoryCursorCodec } from "../check-ins/ports/check-in-history-cursor.js";
import type { Clock } from "../shared/ports/clock.js";
import type { WeatherProvider } from "../weather/ports/weather-provider.js";
import type { FriendEventProjection } from "../friend-recommendations/ports/friend-event-projection.js";
import type { EventActivitySource } from "../friend-activity/ports/friend-activity.js";
import { FirestoreSocialRepository } from "../friends/infrastructure/firestore-social-repository.js";
import { SocialProfiles } from "../friends/application/social-profile.js";
import { registerSocialRoutes } from "../friends/transport/social-routes.js";
import { FirestoreFriendSummary } from "../friends/infrastructure/firestore-friend-summary.js";
import { registerFriendSummary } from "../friends/transport/friend-summary-route.js";
import { FirestoreFriendRecommendations } from "../friend-recommendations/infrastructure/firestore-friend-recommendations.js";
import { registerFriendRecommendations } from "../friend-recommendations/transport/friend-recommendation-route.js";
import { FirestoreFriendIgnoreRepository } from "../friend-recommendations/infrastructure/firestore-friend-ignore-repository.js";
import { registerFriendIgnoreRoutes } from "../friend-recommendations/transport/friend-ignore-routes.js";
import { FirestoreFriendActivity } from "../friend-activity/infrastructure/firestore-friend-activity.js";
import { registerFriendActivity } from "../friend-activity/transport/friend-activity-route.js";
import { HomeWeather } from "../weather/application/home-weather.js";
import { FirestoreWeatherPurposeAuthority } from "../weather/infrastructure/firestore-weather-purpose-authority.js";
import { registerHomeWeather } from "../weather/transport/home-weather-route.js";
/** LI calls once alongside the existing routes. Reuse current identity/store/
 * cursor key/clock and one quota-authorized Weather provider for both purposes.
 * No alternate runtime/bootstrap, environment loading, credentials or listener. */
export async function registerSocialModule(app:FastifyInstance,input:{identity:IdentityVerifier;store:FirestoreGateway;
  history:CheckInHistoryFirestoreGateway;cursor:CheckInHistoryCursorCodec;clock:Clock;weather:WeatherProvider;
  recommendationEvents?:FriendEventProjection;activityEvents?:EventActivitySource}){
  await registerSocialRoutes(app,input.identity,new SocialProfiles(new FirestoreSocialRepository(input.store,input.history,input.cursor,input.clock)));
  await registerFriendSummary(app,input.identity,new FirestoreFriendSummary(input.store,input.clock));
  await registerFriendRecommendations(app,input.identity,new FirestoreFriendRecommendations(input.store,input.clock, firestoreSocialAuthority,input.recommendationEvents,true));
  await registerFriendIgnoreRoutes(app,input.identity,new FirestoreFriendIgnoreRepository(input.store,input.clock, firestoreSocialAuthority));
  await registerFriendActivity(app,input.identity,new FirestoreFriendActivity(input.store,input.clock, firestoreSocialAuthority,input.activityEvents));
  await registerHomeWeather(app,input.identity,new HomeWeather(new FirestoreWeatherPurposeAuthority(input.store),input.weather,input.clock));
}
