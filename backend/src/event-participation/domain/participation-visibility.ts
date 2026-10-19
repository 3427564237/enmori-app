import type { ProfileVisibility } from '../../account/domain/profile-values.js';

/** Pure policy only. Does not select a public DTO, cursor or Firestore schema.
 * All facts must come from current trusted reads, never ordinary client fields.
 * Legacy missing privacy is deny-by-default. Consent is deliberately absent:
 * refusal does not prohibit manual browsing/participation.
 */
export interface ParticipationVisibilityFacts {
  readonly isOwner: boolean;
  readonly isFriend: boolean;
  readonly isBlocked: boolean;
  readonly participantEligible: boolean;
  readonly privacy: ProfileVisibility | undefined;
}

export function maySeeParticipation(facts: ParticipationVisibilityFacts): boolean {
  if (!facts.participantEligible) return false;
  if (facts.isOwner) return true;
  if (facts.isBlocked) return false;
  return facts.privacy === 'public' ||
    (facts.privacy === 'friends_only' && facts.isFriend);
}
