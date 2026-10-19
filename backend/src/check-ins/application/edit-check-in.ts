import { appFailure } from '../../shared/application/app-failure.js';
import { err } from '../../shared/domain/result.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
import { normalizeCheckInContent } from '../domain/content.js';
import type { CheckInMutations } from '../ports/check-in-mutations.js';

type Identity = { principal: AuthPrincipal; checkInId: string; expectedRevision: number };
export class EditCheckIn {
  constructor(private readonly repository: CheckInMutations) {}
  async update(input: Identity & { note: string; mood?: string | null; activity?: string | null; checkInVisibility: string }) {
    const note = normalizeCheckInContent(input.note, input.mood, input.activity);
    if (!note.ok) return note;
    const visibility = input.checkInVisibility;
    if (!validRevision(input.expectedRevision) || !['private', 'friends_only', 'public'].includes(visibility)) return err(appFailure('CHECKIN_INVALID'));
    return this.repository.update({ firebaseUid: input.principal.firebaseUid, checkInId: input.checkInId,
      expectedRevision: input.expectedRevision, note: note.value.note,
      ...(input.mood === undefined ? {} : {mood:note.value.mood}), ...(input.activity === undefined ? {} : {activity:note.value.activity}), checkInVisibility: visibility as 'private' | 'friends_only' | 'public' });
  }
  async remove(input: Identity) {
    if (!validRevision(input.expectedRevision)) return err(appFailure('CHECKIN_INVALID'));
    return this.repository.remove({ firebaseUid: input.principal.firebaseUid, checkInId: input.checkInId, expectedRevision: input.expectedRevision });
  }
}
function validRevision(value: number) { return Number.isSafeInteger(value) && value >= 1 && value < Number.MAX_SAFE_INTEGER; }
