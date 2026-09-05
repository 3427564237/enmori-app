import { randomUUID } from "node:crypto";

import { err, ok, type Result } from "../domain/result.js";
import {
  dependencyUnavailable,
  type DependencyUnavailable,
} from "../ports/dependency-failure.js";
import type { OpaqueIdGenerator } from "../ports/opaque-id-generator.js";

export class CryptoOpaqueIdGenerator implements OpaqueIdGenerator {
  public generate(): Result<string, DependencyUnavailable> {
    try {
      return ok(randomUUID());
    } catch {
      return err(dependencyUnavailable);
    }
  }
}
