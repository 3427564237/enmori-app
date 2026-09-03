import { appFailure, type AppFailure } from "../application/app-failure.js";
import { err, ok, type Result } from "./result.js";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export type IdempotencyKey = string & {
  readonly __idempotencyKey: unique symbol;
};

export function validateIdempotencyKey(
  input: string,
): Result<IdempotencyKey, AppFailure> {
  return IDEMPOTENCY_KEY_PATTERN.test(input)
    ? ok(input as IdempotencyKey)
    : err(appFailure("IDEMPOTENCY_CONFLICT"));
}

export { IDEMPOTENCY_KEY_PATTERN };
