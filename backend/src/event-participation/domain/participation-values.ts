import type { ParticipationChange, ParticipationStatus } from '../ports/participation-repository.js';
export const validEventId = (v: unknown): v is string => typeof v === 'string' &&
  /^[A-Za-z0-9_-]{1,128}$/.test(v) && !/[^A-Za-z0-9_-]/.test(v) && ((!v.startsWith('tm_') && !v.startsWith('pa_')) || /^(tm|pa)_event_[0-9a-f]{64}$/.test(v));
export const validRevision = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
export const validStatus = (v: unknown): v is ParticipationStatus => v === 'none' || v === 'interested' || v === 'going';
export function validChange(v: unknown): v is ParticipationChange {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const c = v as Record<string, unknown>;
  return Object.keys(c).length === 3 && validStatus(c.status) && typeof c.ignored === 'boolean' && validRevision(c.expectedRevision);
}
