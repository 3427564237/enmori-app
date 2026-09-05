import type { Result } from "../domain/result.js";
import type { DependencyUnavailable } from "./dependency-failure.js";

/** Supplies server-authoritative time without coupling Application to a vendor. */
export interface Clock {
  now(): Result<Date, DependencyUnavailable>;
}
