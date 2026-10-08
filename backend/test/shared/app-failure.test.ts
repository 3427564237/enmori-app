import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_FAILURE_CATALOGUE,
  appFailure,
} from "../../src/shared/application/app-failure.js";
import { validateIdempotencyKey } from "../../src/shared/domain/idempotency-key.js";

test("maps the approved error catalogue to exact HTTP statuses", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(APP_FAILURE_CATALOGUE).map(([code, value]) => [
        code,
        value.statusCode,
      ]),
    ),
    {
      PERSONA_INVALID: 422,
      PERSONA_UNAVAILABLE: 404,
      PERSONA_LIMIT_REACHED: 409,
      PERSONA_COMMAND_CONFLICT: 409,
      PERSONA_REVISION_PRECONDITION_FAILED: 412,
      ADD_FRIEND_TARGET_UNAVAILABLE: 404,
      FRIEND_REQUEST_UNAVAILABLE: 404,
      EVENT_UNAVAILABLE: 404,
      PROFILE_INVALID: 422,
      PROFILE_REVISION_PRECONDITION_FAILED: 412,
      SETTINGS_INVALID: 422,
      SETTINGS_REVISION_PRECONDITION_FAILED: 412,
      REQUEST_INVALID: 400,
      AUTH_REQUIRED: 401,
      AUTH_FORBIDDEN: 403,
      USERNAME_INVALID: 400,
      USERNAME_UNAVAILABLE: 409,
      ONBOARDING_REQUIRED: 409,
      ONBOARDING_CONFLICT: 409,
      CHECKIN_INVALID: 400,
      CHECKIN_UNAVAILABLE: 404,
      INTEREST_SELECTION_INVALID: 422,
      INTEREST_REVISION_PRECONDITION_FAILED: 412,
      IDEMPOTENCY_KEY_INVALID: 400,
      IDEMPOTENCY_CONFLICT: 409,
      SERVICE_UNAVAILABLE: 503,
    },
  );
  assert.equal(
    appFailure("CHECKIN_INVALID").message,
    "Check-in details are invalid.",
  );
  assert.equal(
    appFailure("IDEMPOTENCY_KEY_INVALID").message,
    "Provide a valid request key and try again.",
  );
});

test("accepts only 22-64 character base64url idempotency keys", () => {
  assert.equal(validateIdempotencyKey("A".repeat(22)).ok, true);
  assert.equal(validateIdempotencyKey("aZ09_-".repeat(10)).ok, true);
  for (const invalid of [
    "",
    "A".repeat(21),
    "A".repeat(65),
    "not+base64/url==========",
  ]) {
    const result = validateIdempotencyKey(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.code, "IDEMPOTENCY_KEY_INVALID");
    }
  }
});
