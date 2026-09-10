import { appFailure, type AppFailure } from "./app-failure.js";
import { err, ok, type Result } from "../domain/result.js";
import type { Clock } from "../ports/clock.js";
import type { OpaqueIdGenerator } from "../ports/opaque-id-generator.js";

const IDEMPOTENCY_WINDOW_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface AuthoritativeValues {
  readonly opaqueId: string;
  readonly occurredAt: string;
  readonly idempotencyExpiresAt: string;
}

export function readAuthoritativeInstant(
  clock: Clock,
): Result<string, AppFailure> {
  const current = clock.now();
  if (!current.ok || !Number.isFinite(current.value.getTime())) {
    return err(appFailure("SERVICE_UNAVAILABLE"));
  }
  return ok(current.value.toISOString());
}

export function createAuthoritativeValues(
  currentInstant: string,
  idGenerator: OpaqueIdGenerator,
): Result<AuthoritativeValues, AppFailure> {
  const occurredAt = new Date(currentInstant);
  if (!Number.isFinite(occurredAt.getTime())) {
    return err(appFailure("SERVICE_UNAVAILABLE"));
  }

  const generated = idGenerator.generate();
  if (!generated.ok || generated.value.length === 0) {
    return err(appFailure("SERVICE_UNAVAILABLE"));
  }

  return ok({
    opaqueId: generated.value,
    occurredAt: occurredAt.toISOString(),
    idempotencyExpiresAt: new Date(
      occurredAt.getTime() + IDEMPOTENCY_WINDOW_MILLISECONDS,
    ).toISOString(),
  });
}

export { IDEMPOTENCY_WINDOW_MILLISECONDS };
