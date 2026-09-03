import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";

const USERNAME_PATTERN = /^[a-z0-9](?!.*__)[a-z0-9_]{1,28}[a-z0-9]$/;
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "system",
  "moderator",
  "root",
  "enmori",
]);

export type CanonicalUsername = string & {
  readonly __canonicalUsername: unique symbol;
};

export function canonicalizeUsername(
  input: string,
): Result<CanonicalUsername, AppFailure> {
  const trimmed = input.replace(/^ +| +$/g, "");
  const canonical = trimmed.replace(/[A-Z]/g, (value) => value.toLowerCase());
  const reserved =
    RESERVED_USERNAMES.has(canonical) || canonical.startsWith("enmori_");

  if (!USERNAME_PATTERN.test(canonical) || reserved) {
    return err(appFailure("USERNAME_INVALID"));
  }

  return ok(canonical as CanonicalUsername);
}
