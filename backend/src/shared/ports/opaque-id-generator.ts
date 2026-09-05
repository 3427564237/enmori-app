import type { Result } from "../domain/result.js";
import type { DependencyUnavailable } from "./dependency-failure.js";

/** Generates an opaque identifier for the context in which it is injected. */
export interface OpaqueIdGenerator {
  generate(): Result<string, DependencyUnavailable>;
}
