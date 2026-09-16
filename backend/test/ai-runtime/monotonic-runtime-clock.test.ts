import assert from "node:assert/strict";
import test from "node:test";
import { MonotonicRuntimeClock } from "../../src/ai-runtime/infrastructure/monotonic-runtime-clock.js";

test("real monotonic clock ignores UTC and wakes asynchronously at elapsed deadline", async () => {
  const clock = new MonotonicRuntimeClock();
  const before = clock.now();
  let called = false;
  const done = new Promise<void>((resolve) => clock.at(before + 2, () => { called = true; resolve(); }));
  assert.equal(called, false);
  await done;
  assert.ok(clock.now() >= before + 2);
  assert.ok(clock.now() < Date.now());
});

test("clock cancellation is idempotent and prevents a pending callback", async () => {
  const clock = new MonotonicRuntimeClock();
  let called = false;
  const cancel = clock.at(clock.now(), () => { called = true; });
  cancel(); cancel();
  await new Promise<void>((resolve) => clock.at(clock.now() + 2, resolve));
  assert.equal(called, false);
});
