export type ProfileVisibility = "private" | "friends_only" | "public";

export function isVisibility(value: unknown): value is ProfileVisibility {
  return value === "private" || value === "friends_only" || value === "public";
}

export function normalizeDisplayName(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !value.isWellFormed()) return undefined;
  const name = value.trim();
  if ([...name].length < 1 || [...name].length > 50 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(name)) {
    return undefined;
  }
  return name;
}

export function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
