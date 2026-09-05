import { err, ok, type Result } from "../domain/result.js";
import type { Clock } from "../ports/clock.js";
import {
  dependencyUnavailable,
  type DependencyUnavailable,
} from "../ports/dependency-failure.js";

export class SystemClock implements Clock {
  public now(): Result<Date, DependencyUnavailable> {
    try {
      const current = new Date();
      return Number.isFinite(current.getTime())
        ? ok(current)
        : err(dependencyUnavailable);
    } catch {
      return err(dependencyUnavailable);
    }
  }
}
