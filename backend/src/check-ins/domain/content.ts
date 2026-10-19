import { appFailure, type AppFailure } from '../../shared/application/app-failure.js';
import { err, ok, type Result } from '../../shared/domain/result.js';
import { normalizeNote, type NormalizedNote } from './note.js';

/** Display labels only; these fields never confer visibility or AI permissions. */
export function normalizeCheckInLabel(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().normalize('NFC');
  if (!normalized) return null;
  if ([...normalized].length > 50 || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(normalized)) return undefined;
  return normalized;
}
export function normalizeCheckInContent(note: string, mood?: string | null, activity?: string | null): Result<{note:NormalizedNote;mood:string|null;activity:string|null},AppFailure> {
  const normalizedMood = normalizeCheckInLabel(mood), normalizedActivity = normalizeCheckInLabel(activity);
  if (normalizedMood === undefined || normalizedActivity === undefined) return err(appFailure('CHECKIN_INVALID'));
  const normalizedNote = note.trim() === '' && normalizedMood !== null ? ok('' as NormalizedNote) : normalizeNote(note);
  return normalizedNote.ok ? ok({note:normalizedNote.value,mood:normalizedMood,activity:normalizedActivity}) : normalizedNote;
}
