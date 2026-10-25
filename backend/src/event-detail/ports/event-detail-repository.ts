import type { Result } from "../../shared/domain/result.js";
export interface EventDetail { readonly eventId: string; readonly title: string; readonly startAt: string; readonly externalSourceUrl: string; readonly endAt?: string; readonly locationLabel?: string; readonly categoryLabel?: string; readonly shortDescription?: string; readonly coverImageUrl?: string }
export interface EventDetailRepository {
  read(uid: string, eventId: string): Promise<Result<EventDetail, "onboarding_required" | "event_unavailable" | "dependency_unavailable">>;
}
