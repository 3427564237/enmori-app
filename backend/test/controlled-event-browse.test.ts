import assert from "node:assert/strict";
import { test } from "node:test";
import { createControlledEventBrowse } from "../src/bootstrap/controlled-event-browse.js";
import type { BrowseDetail, BrowseSource } from "../src/event-browse/ports/event-browse.js";

const row: BrowseDetail = { browseId: "synthetic", title: "Synthetic activity", startAt: "2026-10-16T10:00:00Z", externalSourceUrl: "https://www.ticketmaster.sg/" };
function fixture(source?: BrowseSource) {
  let running = true, active = 0;
  const gate = createControlledEventBrowse({ ...(source ? { source } : {}), running: () => running,
    track: async work => { active++; try { return await work(); } finally { active--; } } });
  return { gate, active: () => active, stop: () => { running = false; gate.disable(); } };
}
const read = (gate: ReturnType<typeof fixture>["gate"]) => gate.source.firstBatch("2026-10-15T00:00:00Z", new AbortController().signal);

test("optional Event source is absent/disabled by default; construction cannot authorize calls", async () => {
  const absent = fixture();
  assert.throws(() => absent.gate.enable()); await assert.rejects(read(absent.gate));
  let calls = 0;
  const f = fixture({ firstBatch: async () => { calls++; return [row]; }, detail: async () => { calls++; return row; } });
  await assert.rejects(read(f.gate)); assert.equal(calls, 0);
  f.gate.enable(); assert.deepEqual(await read(f.gate), [row]);
  assert.deepEqual(await f.gate.source.detail("synthetic", "now", new AbortController().signal), row);
  f.gate.disable(); await assert.rejects(read(f.gate)); assert.equal(calls, 2);
  assert.deepEqual(f.gate.observation(), { configured: true, enabled: false, pending: 0 });
});

test("disable/re-enable aborts and rejects the OLD source result without forgetting pending I/O", async () => {
  const old = Promise.withResolvers<readonly BrowseDetail[]>(); let signal!: AbortSignal, calls = 0;
  const f = fixture({ firstBatch: async (_asOf, current) => { signal = current; calls++; return calls === 1 ? old.promise : []; }, detail: async () => undefined });
  f.gate.enable(); const pending = read(f.gate); const rejected = assert.rejects(pending, /CONTROLLED_EVENT_BROWSE_UNAVAILABLE/);
  assert.equal(f.active(), 1); f.gate.disable(); f.gate.enable();
  assert.equal(signal.aborted, true); assert.equal(f.gate.observation().pending, 1); assert.equal(f.active(), 1);
  assert.deepEqual(await read(f.gate), []); // Valid new empty response, no cached old rows.
  old.resolve([row]); await rejected;
  assert.equal(f.active(), 0); assert.equal(f.gate.observation().pending, 0);
});

test("caller abort, failure, stop and unavailable Detail cannot produce stale success or replacement calls", async () => {
  const result = Promise.withResolvers<BrowseDetail | undefined>(); let calls = 0;
  const f = fixture({ firstBatch: async () => { calls++; throw new Error("synthetic dependency failure"); },
    detail: async () => { calls++; return result.promise; } });
  f.gate.enable(); await assert.rejects(read(f.gate)); assert.equal(f.active(), 0);
  const abort = new AbortController();
  const pending = f.gate.source.detail("synthetic", "now", abort.signal), rejected = assert.rejects(pending);
  abort.abort(); f.stop(); assert.throws(() => f.gate.enable());
  await assert.rejects(read(f.gate)); assert.equal(f.active(), 1); assert.equal(calls, 2);
  result.resolve(undefined); await rejected; assert.equal(f.active(), 0);
});

test("already-aborted caller and closed process do not invoke source; absent Detail stays absent", async () => {
  let calls = 0;
  const f = fixture({ firstBatch: async () => { calls++; return []; }, detail: async () => { calls++; return undefined; } });
  f.gate.enable(); const abort = new AbortController(); abort.abort();
  await assert.rejects(f.gate.source.firstBatch("now", abort.signal)); assert.equal(calls, 0);
  assert.equal(await f.gate.source.detail("missing", "now", new AbortController().signal), undefined);
  f.stop(); await assert.rejects(read(f.gate)); assert.equal(calls, 1);
});
