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

export function createAuthoritativeValues(
  clock: Clock,
  idGenerator: OpaqueIdGenerator,
): Result<AuthoritativeValues, AppFailure> {
  const current = clock.now();
  if (!current.ok || !Number.isFinite(current.value.getTime())) {
    return err(appFailure("SERVICE_UNAVAILABLE"));
  }

  const generated = idGenerator.generate();
  if (!generated.ok || generated.value.length === 0) {
    return err(appFailure("SERVICE_UNAVAILABLE"));
  }

  return ok({
    opaqueId: generated.value,
    occurredAt: current.value.toISOString(),
    idempotencyExpiresAt: new Date(
      current.value.getTime() + IDEMPOTENCY_WINDOW_MILLISECONDS,
    ).toISOString(),
  });
}

export { IDEMPOTENCY_WINDOW_MILLISECONDS };
