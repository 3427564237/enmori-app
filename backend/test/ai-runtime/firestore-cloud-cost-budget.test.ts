import assert from 'node:assert/strict';
import test from 'node:test';
import { CloudCostBudgetOwner, type CloudCostDispatchControls } from '../../src/ai-runtime/application/cloud-cost-budget-owner.js';
import { createOfflineCloudCostBudgetSeed, cloudCostBudgetPath, FirestoreCloudCostBudget }
  from '../../src/ai-runtime/infrastructure/firestore-cloud-cost-budget.js';
import type { CloudCostAttemptInput, CloudCostGrant } from '../../src/ai-runtime/ports/cloud-cost-budget.js';
import { MetadataFirestoreGateway } from '../support/metadata-firestore-gateway.js';
import { FakeClock, deferred } from './support.js';
import { syntheticCostAttempt as attempt, syntheticCostGrant as grant, syntheticCostUsage as usage } from '../support/cloud-cost-fixtures.js';

const oldEpoch = { processEpoch: '11111111-1111-4111-8111-111111111111', generation: 1 };
const nextEpoch = { processEpoch: '22222222-2222-4222-8222-222222222222', generation: 2 };
const secondId = '44444444-4444-4444-8444-444444444444';
const thirdId = '55555555-5555-4555-8555-555555555555';
const rowPath = `${cloudCostBudgetPath}/attempts/${attempt.attemptId}`;
function fixture(config: CloudCostGrant = grant, gateway = new MetadataFirestoreGateway(1_000_000), epoch = oldEpoch, initialize = true) {
  const clock = new FakeClock(); let utc = 1_000_000, owned = true;
  if (initialize) {
    gateway.put('ai_runtime_fence/current', { ...epoch, cleanupGeneration: 0 });
    const seed = createOfflineCloudCostBudgetSeed(config, epoch, utc); gateway.put(seed.path, seed.data);
  }
  const authority = new FirestoreCloudCostBudget(gateway, epoch, config, clock, () => utc, () => owned);
  const owner = new CloudCostBudgetOwner(authority);
  return { gateway, authority, owner, clock, advance(ms: number) { utc += ms; clock.advance(ms); gateway.now = utc; },
    setUtc(value: number) { utc = value; }, revoke() { owned = false; } };
}
async function recovered(f: ReturnType<typeof fixture>) {
  const value = await f.owner.recover(); assert.equal(value.kind, 'confirmed');
  if (value.kind !== 'confirmed') throw Error('expected recovery'); return value;
}
async function reserve(f: ReturnType<typeof fixture>, input = attempt, live = () => true) {
  const result = await f.owner.reserve(input, live); assert.equal(result.kind, 'confirmed');
  if (result.kind !== 'confirmed') throw Error('expected reservation'); return result.reservation;
}
function ledger(f: ReturnType<typeof fixture>) { return f.gateway.rows.get(cloudCostBudgetPath)!.data; }
function restart(f: ReturnType<typeof fixture>, config = grant) {
  f.revoke(); f.gateway.put('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
  return fixture(config, f.gateway, nextEpoch, false);
}

test('missing, corrupt, changed-grant, expired and future-clock ledgers never initialize themselves', async () => {
  for (const mode of ['missing', 'schema', 'extra', 'negative', 'overspend', 'grant', 'future', 'expired', 'price', 'balance']) {
    const f = fixture(), before = ledger(f);
    if (mode === 'missing') f.gateway.rows.delete(cloudCostBudgetPath);
    if (mode === 'schema') f.gateway.put(cloudCostBudgetPath, { ...before, schemaVersion: 'unknown' });
    if (mode === 'extra') f.gateway.put(cloudCostBudgetPath, { ...before, extra: true });
    if (mode === 'negative') f.gateway.put(cloudCostBudgetPath, { ...before, reservedNanoUsd: -1 });
    if (mode === 'overspend') f.gateway.put(cloudCostBudgetPath, { ...before, spentNanoUsd: grant.capNanoUsd + 1 });
    if (mode === 'grant') f.gateway.put(cloudCostBudgetPath, { ...before, grant: { ...grant, cycleId: 'changed_cycle' } });
    if (mode === 'future') f.gateway.put(cloudCostBudgetPath, { ...before, lastObservedAtMs: 1_000_001 });
    if (mode === 'expired') f.setUtc(grant.creditExpiresAtMs);
    if (mode === 'price') f.setUtc(grant.priceSnapshot.validUntilMs);
    if (mode === 'balance') f.setUtc(grant.balanceValidUntilMs);
    assert.equal((await f.owner.recover()).kind, 'unknown', mode); assert.equal(f.gateway.writes, 0, mode);
    assert.deepEqual(await f.owner.reserve(attempt, () => true), { kind: 'rejected', reason: 'unavailable' });
  }
});

test('reserve writes permanent attempt before dispatch; every consumer shares one cap', async () => {
  const limited = { ...grant, originalGiftCreditNanoUsd: 12_000, capNanoUsd: 600 }, f = fixture(limited);
  const state = await recovered(f); assert.equal(state.snapshot.availableNanoUsd, 600);
  const permit = await reserve(f); assert.equal(ledger(f).reservedNanoUsd, 600);
  assert.equal(f.gateway.rows.get(rowPath)!.data.state, 'reserved');
  for (const consumer of ['test_app', 'conversation', 'persona', 'proactive'] as const) {
    assert.deepEqual(await f.owner.reserve({ ...attempt, attemptId: secondId, consumer }, () => true), { kind: 'rejected', reason: 'exhausted' });
  }
  assert.equal(f.authority.beginDispatch(permit), true); assert.equal(f.authority.beginDispatch(permit), false);
  assert.equal(await f.authority.reconcile(permit, usage), 'confirmed');
  assert.equal(ledger(f).reservedNanoUsd, 0); assert.equal(ledger(f).spentNanoUsd, 133);
  await reserve(f, { ...attempt, attemptId: secondId, consumer: 'proactive', maxInputTokens: 50, maxOutputTokens: 50 });
  assert.equal(ledger(f).reservedNanoUsd, 300); assert.equal(ledger(f).spentNanoUsd, 133);
});

test('duplicate IDs never authorize replay before dispatch, after reconciliation or in a new epoch', async () => {
  const f = fixture(); await recovered(f); const permit = await reserve(f);
  assert.deepEqual(await f.owner.reserve(attempt, () => true), { kind: 'rejected', reason: 'duplicate' });
  f.authority.beginDispatch(permit); await f.authority.reconcile(permit, usage);
  assert.deepEqual(await f.owner.reserve(attempt, () => true), { kind: 'rejected', reason: 'duplicate' });
  assert.equal(f.owner.dispatch(permit, async () => { throw Error('must never replay'); }), undefined);
  const fresh = restart(f); const r = await recovered(fresh);
  assert.equal(r.snapshot.spentNanoUsd, 133); assert.equal(r.snapshot.attemptCount, 1); assert.equal(r.snapshot.reconciledCount, 1);
  assert.deepEqual(await fresh.owner.reserve(attempt, () => true), { kind: 'rejected', reason: 'duplicate' });
  assert.equal(f.authority.dispatchAllowed(permit), false);
});

test('lost reservation ACK closes the owner and full reservation survives restart without replay or refund', async () => {
  const f = fixture(); await recovered(f); f.gateway.loseAck = true;
  assert.deepEqual(await f.owner.reserve(attempt, () => true), { kind: 'unknown' });
  assert.equal(ledger(f).reservedNanoUsd, 600); assert.equal(ledger(f).attemptCount, 1);
  assert.deepEqual(await f.owner.reserve({ ...attempt, attemptId: secondId }, () => true), { kind: 'rejected', reason: 'unavailable' });
  const fresh = restart(f), r = await recovered(fresh);
  assert.equal(r.snapshot.reservedNanoUsd, 600); assert.equal(r.snapshot.spentNanoUsd, 0);
  assert.deepEqual(await fresh.owner.reserve(attempt, () => true), { kind: 'rejected', reason: 'duplicate' });
  await reserve(fresh, { ...attempt, attemptId: secondId }); assert.equal(ledger(fresh).reservedNanoUsd, 1200);
});

test('failed atomic writes cannot leave half an attempt and ambiguous recovery does not retry itself', async () => {
  const f = fixture(); await recovered(f); const calls = f.gateway.calls; f.gateway.failAtWrite = 2;
  assert.deepEqual(await f.owner.reserve(attempt, () => true), { kind: 'unknown' });
  assert.equal(f.gateway.calls, calls + 1); assert.equal(f.gateway.rows.has(rowPath), false); assert.equal(ledger(f).reservedNanoUsd, 0);
  assert.equal((await f.owner.recover()).kind, 'unavailable');
  const other = fixture(); other.gateway.loseAck = true;
  assert.equal((await other.owner.recover()).kind, 'unknown'); assert.equal(other.gateway.calls, 1);
  assert.equal((await other.owner.recover()).kind, 'unavailable'); assert.equal(other.gateway.calls, 1);
});

test('confirmed terminal usage reconciles exactly once; lost ACK never authorizes a second settlement', async () => {
  const f = fixture(); await recovered(f); const permit = await reserve(f); f.authority.beginDispatch(permit);
  assert.equal(await f.authority.reconcile(permit, usage), 'confirmed'); const writes = f.gateway.writes;
  assert.equal(await f.authority.reconcile(permit, usage), 'already_reconciled'); assert.equal(f.gateway.writes, writes);
  assert.equal(await f.authority.reconcile(permit, { ...usage, reasoningTokens: 5 }), 'rejected');
  assert.equal(ledger(f).reconciledCount, 1); assert.equal(ledger(f).spentNanoUsd, 133);
  const other = fixture(); await recovered(other); const pending = await reserve(other); other.authority.beginDispatch(pending); other.gateway.loseAck = true;
  assert.equal(await other.authority.reconcile(pending, usage), 'unknown');
  assert.equal(await other.authority.reconcile(pending, usage), 'rejected');
  const fresh = restart(other), r = await recovered(fresh);
  assert.equal(r.snapshot.reservedNanoUsd, 0); assert.equal(r.snapshot.spentNanoUsd, 133); assert.equal(r.snapshot.reconciledCount, 1);
});

test('missing, invalid, unstarted and over-bound usage never refunds the full reservation', async () => {
  for (const mode of ['unstarted', 'missing', 'subsets', 'bounds', 'model']) {
    const f = fixture(); await recovered(f); const permit = await reserve(f);
    if (mode !== 'unstarted') f.authority.beginDispatch(permit);
    const value = mode === 'missing' ? { ...usage, cacheWriteTokens: undefined } : mode === 'subsets' ? { ...usage, cachedInputTokens: 100 } :
      mode === 'bounds' ? { ...usage, inputTokens: 101, totalTokens: 111 } : mode === 'model' ? { ...usage, model: 'gpt-6.1-sol' } : usage;
    assert.equal(await f.authority.reconcile(permit, value as typeof usage), 'rejected', mode);
    assert.equal(ledger(f).reservedNanoUsd, 600, mode); assert.equal(ledger(f).spentNanoUsd, 0, mode);
  }
});

test('unknown invocation retains the claim through all process time and new epochs; controls cannot be reused', async () => {
  const f = fixture(); await recovered(f); const permit = await reserve(f); let controls: CloudCostDispatchControls | undefined;
  assert.equal(await f.owner.dispatch(permit, async c => { controls = c; assert.equal(c.available(), true); return 'unknown'; }), 'unknown');
  assert.equal(controls!.available(), false); assert.equal(await controls!.confirmUsage(usage), 'unknown');
  assert.equal(f.owner.dispatch(permit, async () => 'replayed'), undefined);
  f.advance(100_000); const fresh = restart(f); fresh.setUtc(1_100_000); fresh.clock.advance(100_000);
  const r = await recovered(fresh); assert.equal(r.snapshot.reservedNanoUsd, 600); assert.equal(r.snapshot.attemptCount, 1);
});

test('withdrawal/cancellation prevents actual dispatch but known original billing may still reconcile', async () => {
  const f = fixture(); await recovered(f); let live = true;
  const permit = await reserve(f, attempt, () => live); live = false;
  assert.equal(f.owner.dispatch(permit, async () => 'forbidden'), undefined); assert.equal(ledger(f).reservedNanoUsd, 600);
  live = true;
  const other = await reserve(f, { ...attempt, attemptId: secondId }, () => live);
  assert.equal(f.authority.beginDispatch(other), true); live = false;
  assert.equal(f.authority.dispatchAllowed(other), false); assert.equal(await f.authority.reconcile(other, usage), 'confirmed');
  assert.equal(ledger(f).reservedNanoUsd, 600); assert.equal(ledger(f).spentNanoUsd, 133);
});

test('cancellation during authority reads prevents any reservation effect', async () => {
  const f = fixture(); await recovered(f); let live = true; const writes = f.gateway.writes;
  f.gateway.onRead = path => { if (path === rowPath) live = false; };
  assert.deepEqual(await f.owner.reserve(attempt, () => live), { kind: 'rejected', reason: 'unavailable' });
  assert.equal(f.gateway.writes, writes); assert.equal(f.gateway.rows.has(rowPath), false);
});

test('stale runtime fence, lost ownership, expiry and wall-clock jumps close admission only', async () => {
  for (const mode of ['epoch', 'host', 'backward', 'forward', 'expiry', 'fence_extra']) {
    const f = fixture(); await recovered(f); const writes = f.gateway.writes;
    if (mode === 'epoch') f.gateway.put('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
    if (mode === 'host') f.revoke();
    if (mode === 'backward') f.setUtc(999_999);
    if (mode === 'forward') f.setUtc(1_010_000);
    if (mode === 'expiry') f.advance(800_000);
    if (mode === 'fence_extra') f.gateway.put('ai_runtime_fence/current', { ...oldEpoch, cleanupGeneration: 0, extra: true });
    assert.notEqual((await f.owner.reserve(attempt, () => true)).kind, 'confirmed', mode); assert.equal(f.gateway.writes, writes, mode);
  }
  const f = fixture(); await recovered(f); const permit = await reserve(f); f.authority.beginDispatch(permit);
  f.gateway.put('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
  assert.equal(await f.authority.reconcile(permit, usage), 'unknown'); assert.equal(ledger(f).reservedNanoUsd, 600);
});

test('only one local budget transaction proceeds at a time; rejected concurrent work cannot dispatch', async () => {
  const f = fixture(); await recovered(f); const wait = deferred<void>();
  const original = f.gateway.runTransaction.bind(f.gateway);
  f.gateway.runTransaction = async (work, options) => { await wait.promise; return original(work, options); };
  const pending = f.owner.reserve(attempt, () => true);
  assert.deepEqual(await f.owner.reserve({ ...attempt, attemptId: thirdId }, () => true), { kind: 'rejected', reason: 'unavailable' });
  wait.resolve(); const result = await pending; assert.equal(result.kind, 'confirmed'); assert.equal(ledger(f).attemptCount, 1);
});

test('application controls reconcile billable terminal usage and reject a second dispatch', async () => {
  const f = fixture(); assert.equal(f.owner.isCurrent(), false); await recovered(f); assert.equal(f.owner.isCurrent(), true);
  const permit = await reserve(f); let invocations = 0;
  const result = f.owner.dispatch(permit, async controls => {
    invocations++; assert.equal(controls.available(), true); assert.equal(await controls.confirmUsage(usage), 'confirmed'); return 'terminal';
  });
  assert.ok(result); assert.equal(await result, 'terminal'); assert.equal(invocations, 1);
  assert.equal(f.owner.dispatch(permit, async () => 'duplicate'), undefined); assert.equal(ledger(f).spentNanoUsd, 133);
  f.revoke(); assert.equal(f.owner.isCurrent(), false);
});

test('grant expiry closes new generation while original confirmed billing can still settle once', async () => {
  const f = fixture(); await recovered(f); const permit = await reserve(f); f.authority.beginDispatch(permit);
  f.advance(800_000); assert.equal(f.owner.isCurrent(), false); assert.equal(f.authority.dispatchAllowed(permit), false);
  assert.deepEqual(await f.owner.reserve({ ...attempt, attemptId: secondId }, () => true), { kind: 'rejected', reason: 'unavailable' });
  assert.equal(await f.authority.reconcile(permit, usage), 'confirmed'); assert.equal(ledger(f).spentNanoUsd, 133);
  assert.equal(await f.authority.reconcile(permit, usage), 'already_reconciled'); assert.equal(f.owner.isCurrent(), false);
});

test('reservation overlaps only independent metadata after its fence and never commits before both settle', async () => {
  const f = fixture(); await recovered(f);
  const original = f.gateway.runTransaction.bind(f.gateway);
  const ledgerRead = deferred<void>(), attemptRead = deferred<void>(), bothStarted = deferred<void>();
  const seen: string[] = [];
  f.gateway.runTransaction = (work, options) => original(tx => work({ ...tx, get: async path => {
    seen.push(path);
    if (path === cloudCostBudgetPath || path === rowPath) {
      if (seen.includes(cloudCostBudgetPath) && seen.includes(rowPath)) bothStarted.resolve();
      await (path === cloudCostBudgetPath ? ledgerRead.promise : attemptRead.promise);
    }
    return tx.get(path);
  }}), options);
  const writes = f.gateway.writes;
  let completed = false;
  const pending = f.owner.reserve(attempt, () => true).finally(() => { completed = true; });
  await bothStarted.promise;
  assert.deepEqual(seen, ['ai_runtime_fence/current', cloudCostBudgetPath, rowPath]);
  ledgerRead.resolve(); await Promise.resolve();
  assert.equal(completed, false); assert.equal(f.gateway.writes, writes);
  attemptRead.resolve(); assert.equal((await pending).kind, 'confirmed');
  assert.equal(f.gateway.rows.has(rowPath), true);
});
