import { isVisibility, type ProfileVisibility } from './profile-values.js';

export interface ProfileDetails {
  readonly bio: string | null;
  readonly affiliationType: 'school' | 'company' | null;
  readonly affiliationName: string | null;
  readonly region: string | null;
}
export type ProfileDetailsChange = Omit<ProfileDetails, 'region'> & { readonly region?: string | null };
export interface FieldPrivacy {
  readonly interests: ProfileVisibility;
  readonly location: ProfileVisibility;
  readonly participation: ProfileVisibility;
  readonly mapSharedWithFriends: boolean;
}
export const emptyProfileDetails: ProfileDetails = { bio: null, affiliationType: null, affiliationName: null, region: null };
export const privateFields: FieldPrivacy = { interests: 'private', location: 'private', participation: 'private', mapSharedWithFriends: false };

function text(value: unknown, limit: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.isWellFormed() || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)) return undefined;
  const trimmed = value.trim();
  return [...trimmed].length > limit ? undefined : trimmed || null;
}
export function parseProfileDetails(value: unknown): ProfileDetails | undefined {
  const details = parseProfileDetailsChange(value);
  if (details?.region === undefined) return undefined;
  return { ...details, region: details.region };
}

export function parseProfileDetailsChange(value: unknown): ProfileDetailsChange | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  const hasRegion = Object.hasOwn(v, 'region');
  if (Object.keys(v).length !== (hasRegion ? 4 : 3) || !['bio', 'affiliationType', 'affiliationName'].every(k => Object.hasOwn(v, k))) return undefined;
  const bio = text(v.bio, 500), affiliationName = text(v.affiliationName, 120), region = hasRegion ? text(v.region, 120) : null;
  if (bio === undefined || affiliationName === undefined || region === undefined ||
      (v.affiliationType !== null && v.affiliationType !== 'school' && v.affiliationType !== 'company') ||
      (v.affiliationType === null && affiliationName !== null)) return undefined;
  return { bio, affiliationName, affiliationType: v.affiliationType, ...(hasRegion ? { region } : {}) };
}
export function parseFieldPrivacy(value: unknown): FieldPrivacy | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 4 || !isVisibility(v.interests) || !isVisibility(v.location) ||
      !isVisibility(v.participation) || typeof v.mapSharedWithFriends !== 'boolean') return undefined;
  return { interests: v.interests, location: v.location, participation: v.participation, mapSharedWithFriends: v.mapSharedWithFriends };
}
