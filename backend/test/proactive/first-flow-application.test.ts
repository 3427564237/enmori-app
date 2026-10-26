import assert from "node:assert/strict";
import test from "node:test";
import { FirstFlowDueWorker } from "../../src/proactive/application/due-worker.js";
import { deferred, fixture, ids, rawReply } from "./first-flow-fakes.js";

test("F0 fake vertical: explicit intent -> one genuine proactive append -> one dispatch -> visible read, without old-anchor advance", async () => {
  const f = fixture(); await f.queued();
  const anchor = f.store.anchor;
  const result = await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  assert.equal(result.kind, "ok");
  if (result.kind === "ok") { assert.equal(result.value.state, "published"); assert.equal(result.value.dispatchState, "accepted"); }
  assert.deepEqual(f.counts(), { model: 1, sends: 1 });
  assert.equal(f.store.publications.length, 1);
  assert.equal(f.store.publications[0]!.role, "assistant"); assert.equal(f.store.publications[0]!.origin, "proactive");
  assert.equal(f.store.anchor, anchor);
  assert.deepEqual(Object.keys(f.observed[0]!).sort(), ["dueAt", "inputKind", "quotedRequest", "timeZone"]);
  assert.equal(f.observed[0]!.inputKind, "proactive_followup");
  assert.equal(f.observed[0]!.quotedRequest.occurredAt, "2026-10-24T04:00:00.000Z");
  assert.deepEqual(await f.app.markRead(f.actor, ids.topic, 0, 2), { kind: "ok", value: { revision: 1, readThroughSequence: 2 } });
  await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  assert.deepEqual(f.counts(), { model: 1, sends: 1 });
});

test("quiet/frequency store denial stops before model dispatch", async () => {
  for (const reason of ["quiet", "frequency"] as const) {
    const f = fixture(); await f.queued(); f.store.reserveFailure = reason;
    assert.deepEqual(await f.app.runIntent(f.actor, ids.intent, new AbortController().signal), { kind: reason });
    assert.deepEqual(f.counts(), { model: 0, sends: 0 });
  }
});

test("unknown reserve ACK is not retried and recovery never assumes a model was dispatched", async () => {
  const f = fixture(); await f.queued(); f.store.unknownReserve = true;
  assert.deepEqual(await f.app.runIntent(f.actor, ids.intent, new AbortController().signal), { kind: "unknown" });
  await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  assert.deepEqual(f.counts(), { model: 0, sends: 0 });
  await f.app.recover(f.actor); assert.equal(f.store.rows.get(ids.intent)!.state, "failed");
});

test("unknown publish ACK permits only readback/recovery of the same canonical message, not regeneration", async () => {
  const f = fixture(); await f.queued(); f.store.unknownPublish = true;
  assert.deepEqual(await f.app.runIntent(f.actor, ids.intent, new AbortController().signal), { kind: "unknown" });
  assert.equal(f.store.publications.length, 1); assert.deepEqual(f.counts(), { model: 1, sends: 0 });
  f.store.unknownPublish = false; await f.app.recover(f.actor);
  await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  assert.equal(f.store.publications.length, 1); assert.deepEqual(f.counts(), { model: 1, sends: 1 });
});

test("unknown external result and restarted dispatching never replay a provider request", async () => {
  let calls = 0;
  const f = fixture(undefined, { sendOnce: async input => {
    const claim = await input.claimAfterCredential(); if (claim.kind !== "ok") return { kind: "not_attempted" };
    calls++; return { kind: "unknown" };
  } });
  await f.queued(); await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  assert.equal(f.store.rows.get(ids.intent)!.dispatchState, "unknown");
  await f.app.recover(f.actor); await f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  assert.equal(calls, 1);
});

test("off while physically generating aborts delivery without releasing the pending lane", async () => {
  const physical = deferred<Uint8Array>(), entered = deferred<void>(); let signal: AbortSignal | undefined;
  const f = fixture({ generate: async (_input, budget) => { signal = budget.signal; entered.resolve(); return physical.promise; } });
  await f.queued();
  const pending = f.app.runIntent(f.actor, ids.intent, new AbortController().signal);
  await entered.promise;
  await f.app.replaceSettings(f.actor, f.store.settingsValue.revision, { ...f.settings, mode: "off" });
  assert.equal(signal!.aborted, true); assert.deepEqual(f.app.executionState, { running: true, modelPending: true });
  assert.deepEqual(await f.app.recover(f.actor), { kind: "unavailable" });
  assert.deepEqual(await f.app.runIntent(f.actor, ids.second, new AbortController().signal), { kind: "unavailable" });
  physical.resolve(rawReply()); assert.equal((await pending).kind, "terminated");
  assert.equal(f.store.publications.length, 0); assert.deepEqual(f.app.executionState, { running: false, modelPending: false });
});

test("source deletion or settings change during generation cannot publish late content", async () => {
  for (const invalidate of ["source", "settings"] as const) {
    const physical = deferred<Uint8Array>(), entered = deferred<void>();
    const f = fixture({ generate: async () => { entered.resolve(); return physical.promise; } });
    await f.queued(); const pending = f.app.runIntent(f.actor, ids.intent, new AbortController().signal); await entered.promise;
    if (invalidate === "source") f.store.sourceAlive = false;
    else f.store.settingsValue = { ...f.store.settingsValue, grantGeneration: f.store.settingsValue.grantGeneration + 1 };
    physical.resolve(rawReply()); assert.notEqual((await pending).kind, "ok");
    assert.equal(f.store.publications.length, 0); assert.equal(f.counts().sends, 0);
  }
});

test("identity changes across reserve await deny model execution", async () => {
  const f = fixture(); await f.queued();
  f.store.beforeReserve = async () => { f.setAuthUid("replacement-owner"); };
  assert.deepEqual(await f.app.runIntent(f.actor, ids.intent, new AbortController().signal), { kind: "denied" });
  assert.deepEqual(f.counts(), { model: 0, sends: 0 });
});

test("model invalid UTF8, duplicate schema or rejection fails the occurrence with no publication", async () => {
  for (const raw of [new Uint8Array([255]), new TextEncoder().encode('{"schemaVersion":"ai_assistant_message_v1","message":"a","message":"b"}')]) {
    const f = fixture({ generate: async () => raw }); await f.queued();
    assert.equal((await f.app.runIntent(f.actor, ids.intent, new AbortController().signal)).kind, "unavailable");
    assert.equal(f.store.rows.get(ids.intent)!.state, "failed"); assert.equal(f.store.publications.length, 0);
  }
});

test("ordinary lists/URLs in the accepted JSON remain allowed by existing plain-text mode", async () => {
  const f = fixture({ generate: async () => rawReply("1. Review notes\n2. See https://example.com") });
  await f.queued(); assert.equal((await f.app.runIntent(f.actor, ids.intent, new AbortController().signal)).kind, "ok");
  assert.match(f.store.publications[0]!.text, /https:/);
});

test("bounded worker recovers once, serializes overlapping ticks and stops without late publication", async () => {
  const physical = deferred<Uint8Array>(), entered = deferred<void>();
  const f = fixture({ generate: async () => { entered.resolve(); return physical.promise; } }); await f.queued();
  const worker = new FirstFlowDueWorker({ application: f.app, actor: f.actor, endsAtMs: f.clock.now + 60000, nowMs: () => f.clock.now });
  const first = worker.tick(); await entered.promise; assert.equal(worker.tick(), first);
  let stopped = false; const stopping = worker.stop().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false); assert.equal(f.app.executionState.modelPending, true);
  physical.resolve(rawReply()); await stopping;
  assert.equal(f.store.publications.length, 0); assert.equal(f.app.executionState.modelPending, false);
  await worker.tick(); assert.equal(f.store.publications.length, 0);
});

test("ended worker window starts no model or sender and unknown create is read back without retry", async () => {
  const f = fixture(); f.store.unknownCreate = true; const created = await f.queued();
  assert.equal(created.created.kind, "unknown"); assert.equal((await f.app.intent(f.actor, ids.intent)).kind, "ok");
  const worker = new FirstFlowDueWorker({ application: f.app, actor: f.actor, endsAtMs: f.clock.now + 1000, nowMs: () => f.clock.now });
  f.clock.advance(1000); await worker.tick(); assert.deepEqual(f.counts(), { model: 0, sends: 0 });
});

test("an unexpectedly thrown write is preserved as unknown and can only be read back", async () => {
  const f = fixture();
  const create = f.store.createIntent.bind(f.store);
  f.store.createIntent = async (...args) => { await create(...args); throw Error("lost private write ACK"); };
  const created = await f.queued();
  assert.equal(created.created.kind, "unknown"); assert.equal(f.store.rows.size, 1);
  assert.equal((await f.app.intent(f.actor, ids.intent)).kind, "ok");
  assert.deepEqual(f.counts(), { model: 0, sends: 0 });
});

test("window expiry aborts an active model budget but does not pretend physical settlement", async () => {
  const physical = deferred<Uint8Array>(), entered = deferred<void>(); let signal: AbortSignal | undefined;
  const f = fixture({ generate: async (_input, budget) => { signal = budget.signal; entered.resolve(); return physical.promise; } });
  await f.queued();
  const worker = new FirstFlowDueWorker({ application: f.app, actor: f.actor, endsAtMs: f.clock.now + 1000, nowMs: () => f.clock.now });
  const pending = worker.tick(); await entered.promise; f.clock.advance(1000);
  assert.equal(worker.tick(), pending); assert.equal(signal!.aborted, true);
  assert.equal(f.app.executionState.modelPending, true);
  physical.resolve(rawReply()); await pending; await worker.stop();
  assert.equal(f.store.publications.length, 0);
});
