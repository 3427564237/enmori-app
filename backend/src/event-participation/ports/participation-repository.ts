import type { Result } from '../../shared/domain/result.js';
import type { ProfileVisibility } from '../../account/domain/profile-values.js';

export type ParticipationStatus = 'none' | 'interested' | 'going';
export interface Participation {
  readonly eventId: string; readonly status: ParticipationStatus;
  readonly ignored: boolean; readonly revision: number; readonly updatedAt?: string;
}
export interface ParticipationChange { readonly status: ParticipationStatus; readonly ignored: boolean; readonly expectedRevision: number }
export interface Participant { readonly username: string; readonly displayName?: string }
export interface ParticipantPage {
  readonly items: readonly Participant[]; readonly nextCursor?: string;
  readonly countState: 'exact' | 'unavailable'; readonly visibleCount?: number;
}
export interface ParticipationPage { readonly items: readonly (Participation | Pick<Participation, 'eventId' | 'status'>)[]; readonly nextCursor?: string }
/** Fresh facts for one target, resolved under the caller's transaction. */
export interface ParticipationAccess {
  readonly username: string; readonly displayName?: string;
  readonly isFriend: boolean; readonly isBlocked: boolean; readonly eligible: boolean;
  readonly participationPrivacy: ProfileVisibility | undefined;
}
export interface ParticipationAccessPort {
  resolve(viewerAccountId: string, targetAccountId: string): Promise<ParticipationAccess | undefined>;
  accountForUsername(username: string): Promise<string | undefined>;
}
/** Stable internal category, without vendor detail or public message. */
export type ParticipationFailureCode='ONBOARDING_REQUIRED'|'EVENT_PARTICIPATION_INVALID'|'EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED'|'EVENT_UNAVAILABLE'|'REQUEST_INVALID'|'SERVICE_UNAVAILABLE'|'ADD_FRIEND_TARGET_UNAVAILABLE';
export interface ParticipationFailure { readonly code: ParticipationFailureCode }
export const participationFailure=(code: ParticipationFailureCode):ParticipationFailure=>({code});
export type ParticipationResult<T> = Promise<Result<T, ParticipationFailure>>;
export interface ParticipationRepository {
  authorize(uid: string): ParticipationResult<void>;
  read(uid: string, eventId: string): ParticipationResult<Participation>;
  save(uid: string, eventId: string, change: ParticipationChange): ParticipationResult<Participation>;
  participants(uid: string, eventId: string, status: 'interested' | 'going', group: 'friends' | 'others', cursor?: string): ParticipationResult<ParticipantPage>;
  list(uid: string, username?: string, cursor?: string): ParticipationResult<ParticipationPage>;
}
