import assert from "node:assert/strict";
import test from "node:test";

import { getApps } from "firebase-admin/app";

import { CryptoOpaqueIdGenerator } from "../src/shared/infrastructure/crypto-opaque-id-generator.js";
import { SystemClock } from "../src/shared/infrastructure/system-clock.js";

test("approved Firebase Admin package loads without initializing credentials", () => {
  assert.deepEqual(getApps(), []);
});

test("system clock returns a valid server UTC instant", () => {
  const before = Date.now();
  const result = new SystemClock().now();
  const after = Date.now();

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("system clock unavailable");
  assert.ok(result.value.getTime() >= before);
  assert.ok(result.value.getTime() <= after);
  assert.match(result.value.toISOString(), /Z$/);
});

test("crypto opaque ID generator returns distinct UUID values", () => {
  const generator = new CryptoOpaqueIdGenerator();
  const first = generator.generate();
  const second = generator.generate();

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) throw new Error("opaque ID unavailable");
  assert.match(
    first.value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.notEqual(first.value, second.value);
});
