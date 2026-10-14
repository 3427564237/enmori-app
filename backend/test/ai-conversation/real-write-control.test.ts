import { strict as assert } from "node:assert";
import { test } from "node:test";
import { RealWriteControl, type DurableCloseObservation } from "../../src/ai-conversation/application/real-write-control.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("each content transaction requires a fresh external Auth observation", async () => {
  const control = new RealWriteControl(() => true);
  let checks = 0;
  const fresh = async () => { checks++; return checks === 1; };
  assert.equal(await control.checkBeforeContentTransaction(fresh), true);
  assert.equal(await control.checkBeforeContentTransaction(fresh), false);
  assert.equal(await control.checkBeforeContentTransaction(async () => { checks++; return true; }), false);
  assert.equal(checks, 2);
  assert.equal(control.terminal, true);
});

test("local terminal synchronously stops continuation and all new Auth checks", async () => {
  const control = new RealWriteControl(() => true);
  control.terminate();
  assert.equal(control.terminal, true);
  assert.equal(control.allowsOriginalContinuation(), false);
  let checks = 0;
  assert.equal(await control.checkBeforeContentTransaction(async () => { checks++; return true; }), false);
  assert.equal(checks, 0);
  assert.equal(control.barrier, "unresolved");
});

test("an already invalid original session/deadline cannot start a new Auth check", async () => {
  const control = new RealWriteControl(() => false);
  let checks = 0;
  assert.equal(await control.checkBeforeContentTransaction(async () => { checks++; return true; }), false);
  assert.equal(checks, 0);
});

test("cancel while fresh Auth is pending blocks its late successful observation", async () => {
  const auth = deferred<boolean>();
  const control = new RealWriteControl(() => true);
  const decision = control.checkBeforeContentTransaction(() => auth.promise);
  control.terminate();
  assert.equal(control.allowsOriginalContinuation(), false);
  auth.resolve(true);
  assert.equal(await decision, false);
});

test("session/deadline loss during Auth is synchronously checked after the await", async () => {
  const auth = deferred<boolean>();
  let originalCurrent = true;
  const control = new RealWriteControl(() => originalCurrent);
  const decision = control.checkBeforeContentTransaction(() => auth.promise);
  originalCurrent = false;
  auth.resolve(true);
  assert.equal(await decision, false);
});

test("a fresh Auth failure or unavailable result cannot authorize new content I/O", async () => {
  const control = new RealWriteControl(() => true);
  assert.equal(await control.checkBeforeContentTransaction(async () => false), false);
  const unavailable = new RealWriteControl(() => true);
  assert.equal(await unavailable.checkBeforeContentTransaction(async () => { throw new Error("synthetic unavailable"); }), false);
  assert.equal(unavailable.terminal, true);
  assert.equal(await unavailable.checkBeforeContentTransaction(async () => true), false);
});

test("regrant or restored guard cannot reopen the original terminal request", async () => {
  let originalCurrent = false;
  const control = new RealWriteControl(() => originalCurrent);
  assert.equal(control.allowsOriginalContinuation(), false);
  originalCurrent = true;
  assert.equal(await control.checkBeforeContentTransaction(async () => true), false);
  assert.equal(control.terminal, true);
});

test("malformed or failed trusted guard results fail closed rather than using truthiness", async () => {
  for (const value of [undefined, null, 1, "true", {}]) {
    const control = new RealWriteControl(() => true);
    assert.equal(await control.checkBeforeContentTransaction(async () => value as boolean), false);
    assert.equal(control.terminal, true);
  }
  const malformedOriginal = new RealWriteControl(() => ({}) as boolean);
  assert.equal(malformedOriginal.allowsOriginalContinuation(), false);
  const failedOriginal = new RealWriteControl(() => { throw new Error("synthetic missing original guard"); });
  assert.equal(failedOriginal.allowsOriginalContinuation(), false);
});

test("known Auth loss blocks another pending fresh check on the same original request", async () => {
  const auth = deferred<boolean>();
  const control = new RealWriteControl(() => true);
  const pending = control.checkBeforeContentTransaction(() => auth.promise);
  assert.equal(await control.checkBeforeContentTransaction(async () => false), false);
  auth.resolve(true);
  assert.equal(await pending, false);
  assert.equal(control.barrier, "unresolved");
});

test("a true check is not a reusable permit after a local terminal", async () => {
  const control = new RealWriteControl(() => true);
  const checked = await control.checkBeforeContentTransaction(async () => true);
  control.terminate();
  let handoffs = 0;
  if (checked && control.allowsOriginalContinuation()) handoffs++;
  assert.equal(handoffs, 0);
});

test("a true check is not a reusable permit after original deadline loss", async () => {
  let originalCurrent = true;
  const control = new RealWriteControl(() => originalCurrent);
  const checked = await control.checkBeforeContentTransaction(async () => true);
  originalCurrent = false;
  let handoffs = 0;
  if (checked && control.allowsOriginalContinuation()) handoffs++;
  assert.equal(handoffs, 0);
});

test("already issued content I/O can settle after local terminal without original continuation", async () => {
  const io = deferred<void>();
  const control = new RealWriteControl(() => true);
  assert.equal(await control.checkBeforeContentTransaction(async () => true), true);
  assert.equal(control.allowsOriginalContinuation(), true);
  // Synthetic SDK handoff precedes terminal; completion is not remote rollback.
  const issued = io.promise;
  control.terminate();
  io.resolve(undefined);
  await issued;
  assert.equal(control.allowsOriginalContinuation(), false);
  assert.equal(control.barrier, "unresolved");
});

test("durable close stops local work before its remote observation settles", async () => {
  const close = deferred<DurableCloseObservation>();
  const control = new RealWriteControl(() => true);
  const closing = control.closeDurably(() => close.promise);
  assert.equal(control.terminal, true);
  assert.equal(control.allowsOriginalContinuation(), false);
  assert.equal(control.barrier, "unresolved");
  close.resolve("closed");
  assert.equal(await closing, "closed");
});

test("a lost or failed close acknowledgement stays unresolved", async () => {
  const control = new RealWriteControl(() => true);
  assert.equal(await control.closeDurably(async () => "unresolved"), "unresolved");
  assert.equal(await control.closeDurably(async () => { throw new Error("synthetic lost ACK"); }), "unresolved");
  assert.equal(control.terminal, true);
});

test("a delayed unresolved close cannot downgrade a confirmed closed barrier", async () => {
  const earlier = deferred<DurableCloseObservation>();
  const control = new RealWriteControl(() => true);
  const first = control.closeDurably(() => earlier.promise);
  assert.equal(await control.closeDurably(async () => "closed"), "closed");
  earlier.resolve("unresolved");
  assert.equal(await first, "closed");
  assert.equal(control.allowsOriginalContinuation(), false);
});

test("a delayed close failure cannot downgrade closed or start another close", async () => {
  const earlier = deferred<DurableCloseObservation>();
  const control = new RealWriteControl(() => true);
  const first = control.closeDurably(() => earlier.promise);
  await control.closeDurably(async () => "closed");
  earlier.reject(new Error("synthetic late failure"));
  assert.equal(await first, "closed");
  let calls = 0;
  assert.equal(await control.closeDurably(async () => { calls++; return "unresolved"; }), "closed");
  assert.equal(calls, 0);
});
