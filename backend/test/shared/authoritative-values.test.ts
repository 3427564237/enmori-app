import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthoritativeValues,
  IDEMPOTENCY_WINDOW_MILLISECONDS,
} from "../../src/shared/application/authoritative-values.js";
import { err, ok } from "../../src/shared/domain/result.js";
import { dependencyUnavailable } from "../../src/shared/ports/dependency-failure.js";

test("derives UTC time and the exact 24-hour idempotency expiry", () => {
  const now = new Date("2026-09-05T04:00:00Z");
  const result = createAuthoritativeValues(
    { now: () => ok(now) },
    { generate: () => ok("opaque_01") },
  );

  assert.deepEqual(result, {
    ok: true,
    value: {
      opaqueId: "opaque_01",
      occurredAt: "2026-09-05T04:00:00.000Z",
      idempotencyExpiresAt: "2026-09-06T04:00:00.000Z",
    },
  });
  assert.equal(IDEMPOTENCY_WINDOW_MILLISECONDS, 86_400_000);
});

test("fails closed when Clock or ID generation is unavailable", () => {
  const clockFailure = createAuthoritativeValues(
    { now: () => err(dependencyUnavailable) },
    { generate: () => ok("opaque_01") },
  );
  const idFailure = createAuthoritativeValues(
    { now: () => ok(new Date("2026-09-05T04:00:00Z")) },
    { generate: () => err(dependencyUnavailable) },
  );

  assert.equal(clockFailure.ok, false);
  assert.equal(idFailure.ok, false);
  if (!clockFailure.ok) {
    assert.equal(clockFailure.failure.code, "SERVICE_UNAVAILABLE");
  }
  if (!idFailure.ok) {
    assert.equal(idFailure.failure.code, "SERVICE_UNAVAILABLE");
  }
});
