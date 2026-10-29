import { area } from "./areas.js";
export interface RecommendationProfile {
  readonly birthDate: string | null;
  readonly homeAreaCode: string | null;
  readonly autoActivityLocation: boolean;
  readonly discoverable: boolean;
  readonly matchInterests: boolean;
  readonly matchRegion: boolean;
  readonly matchAffiliation: boolean;
  readonly matchAge: boolean;
  readonly onboardingPromptSeen: boolean;
  readonly revision: number;
}
export const emptyRecommendationProfile: RecommendationProfile = Object.freeze({
  birthDate: null,
  homeAreaCode: null,
  autoActivityLocation: false,
  discoverable: false,
  matchInterests: false,
  matchRegion: false,
  matchAffiliation: false,
  matchAge: false,
  onboardingPromptSeen: false,
  revision: 0,
});
export function civilAge(
  birth: string | null,
  date: string,
): number | undefined {
  if (
    !birth ||
    !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  )
    return undefined;
  const b = new Date(birth + "T00:00:00Z"),
    d = new Date(date + "T00:00:00Z");
  if (
    !Number.isFinite(b.getTime()) ||
    b.toISOString().slice(0, 10) !== birth ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== date ||
    birth > date
  )
    return undefined;
  return (
    Number(date.slice(0, 4)) -
    Number(birth.slice(0, 4)) -
    Number(date.slice(5) < birth.slice(5))
  );
}
export function singaporeDate(instant: string): string {
  return new Date(Date.parse(instant) + 8 * 3600000).toISOString().slice(0, 10);
}
export function parseRecommendationProfile(
  value: unknown,
): RecommendationProfile | undefined {
  if (value === undefined) return emptyRecommendationProfile;
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(emptyRecommendationProfile);
  if (
    Object.keys(v).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(v, k))
  )
    return undefined;
  if (
    v.birthDate !== null &&
    (typeof v.birthDate !== "string" ||
      civilAge(v.birthDate, "9999-12-31") === undefined)
  )
    return undefined;
  if (v.homeAreaCode !== null && !area(v.homeAreaCode)) return undefined;
  if (
    !Number.isSafeInteger(v.revision) ||
    Number(v.revision) < 0 ||
    Number(v.revision) >= Number.MAX_SAFE_INTEGER
  )
    return undefined;
  if (
    keys
      .filter((k) => !["birthDate", "homeAreaCode", "revision"].includes(k))
      .some((k) => typeof v[k] !== "boolean")
  )
    return undefined;
  return v as unknown as RecommendationProfile;
}
