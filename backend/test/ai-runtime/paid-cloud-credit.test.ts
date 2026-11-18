import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudCostGrantCurrent, cloudCostGrantExpiresAt, cloudPaidCostCapNanoUsd, decodeCloudCostGrant, decodeOpenAiDeploymentCostGrant, paidCreditReviewWindowMs }
  from '../../src/ai-runtime/domain/cloud-cost.js';
import { cloudCostBudgetPath, cloudCostGrantPath, createOfflineCloudCostBudgetSeed, FirestoreCloudCostBudget }
  from '../../src/ai-runtime/infrastructure/firestore-cloud-cost-budget.js';
import { createOfflinePaidCloudCostBudgetSeed, PaidCloudCreditOperator, type PaidCreditInstallation }
  from '../../src/ai-runtime/infrastructure/paid-cloud-credit-operator.js';
import { CloudCostBudgetOwner } from '../../src/ai-runtime/application/cloud-cost-budget-owner.js';
import type { CloudPaidCostGrant } from '../../src/ai-runtime/ports/cloud-cost-budget.js';
import { syntheticCostGrant, syntheticPaidCostGrant, syntheticCostAttempt, syntheticCostUsage } from '../support/cloud-cost-fixtures.js';
import { MetadataFirestoreGateway } from '../support/metadata-firestore-gateway.js';
import { FakeClock } from './support.js';

const epoch = {processEpoch: '77777777-7777-4777-8777-777777777777', generation: 1};
const next = {processEpoch: '88888888-8888-4888-8888-888888888888', generation: 2, cleanupGeneration: 0};
const paidAttempt = {...syntheticCostAttempt, attemptId: '99999999-9999-4999-8999-999999999999', model: 'gpt-6.1-sol' as const};
const paidUsage = {...syntheticCostUsage, model: 'gpt-6.1-sol' as const};
async function fixture(grant: CloudPaidCostGrant = syntheticPaidCostGrant) {
  const gateway = new MetadataFirestoreGateway(1_000_000), clock = new FakeClock();
  gateway.put('ai_runtime_fence/current', {...epoch, cleanupGeneration: 0});
  const seed = createOfflineCloudCostBudgetSeed(syntheticCostGrant, epoch, gateway.now); gateway.put(seed.path, seed.data);
  const old = new FirestoreCloudCostBudget(gateway, epoch, syntheticCostGrant, clock, () => gateway.now, () => true);
  const recovered = await old.recover(); assert.equal(recovered.kind, 'confirmed');
  if (recovered.kind !== 'confirmed') throw Error();
  gateway.loseAck = true;
  assert.equal((await old.reserve(recovered.lease, syntheticCostAttempt, () => true)).kind, 'unknown');
  gateway.put('ai_runtime_fence/current', next);
  const packet: PaidCreditInstallation = {grant, expectedFence: next, predecessorLedger: structuredClone(gateway.rows.get(seed.path)!.data),
    predecessorAttempts: [{id: syntheticCostAttempt.attemptId, data: structuredClone(gateway.rows.get(`${seed.path}/attempts/${syntheticCostAttempt.attemptId}`)!.data)}]};
  const path = cloudCostGrantPath(grant), operator = () => new PaidCloudCreditOperator(gateway, () => gateway.now, () => true);
  const make = (selected = grant, generation = next) => new FirestoreCloudCostBudget(gateway, generation, selected, clock, () => gateway.now, () => true);
  return {gateway, clock, packet, path, make, operator};
}

test('paid cap deducts old liabilities from the purchased amount even when another balance is larger', () => {
  assert.equal(cloudPaidCostCapNanoUsd(2_000, 100_000, 2_000, 600, 133), 1_267);
  assert.equal(cloudPaidCostCapNanoUsd(2_000, 500, 2_000, 600, 133), 0);
  assert.equal(cloudPaidCostCapNanoUsd(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), 0);
  for (const bad of [NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.equal(cloudPaidCostCapNanoUsd(bad, 2_000, 1, 0, 0), undefined);
  assert.equal(decodeOpenAiDeploymentCostGrant(syntheticCostGrant), undefined);
  assert.equal(decodeOpenAiDeploymentCostGrant({...syntheticCostGrant, originalGiftCreditNanoUsd: 68_000_000_000,
    verifiedSpendableRemainingNanoUsd: 68_000_000_000, capNanoUsd: 3_400_000_000})?.schemaVersion, 'openai_cost_grant_v1');
  assert.equal(decodeOpenAiDeploymentCostGrant(syntheticPaidCostGrant)?.schemaVersion, 'openai_cost_grant_v2');
});

test('paid exact schema rejects gift disguises, wrong model, extra fields, altered cap and excessive freshness', () => {
  const grant = syntheticPaidCostGrant;
  for (const patch of [{originalGiftCreditNanoUsd: 1}, {cycleId: 'not_a_gift'}, {fundingKind: 'gift'}, {capNanoUsd: 2_000},
    {predecessor: {...grant.predecessor, grantId: grant.grantId}}, {approvedCapNanoUsd: 2_001},
    {balanceValidUntilMs: grant.creditExpiresAtMs + 1}, {priceSnapshot: syntheticCostGrant.priceSnapshot},
    {predecessor: {...grant.predecessor, extra: true}}]) assert.equal(decodeCloudCostGrant({...grant, ...patch}), undefined);
  const longer = {...grant, creditExpiresAtMs: Math.max(grant.balanceVerifiedAtMs, grant.priceSnapshot.verifiedAtMs) + paidCreditReviewWindowMs + 2};
  assert.equal(decodeCloudCostGrant({...longer, balanceValidUntilMs: grant.balanceVerifiedAtMs + paidCreditReviewWindowMs + 1}), undefined);
  assert.equal(decodeCloudCostGrant({...longer, priceSnapshot: {...grant.priceSnapshot,
    validUntilMs: grant.priceSnapshot.verifiedAtMs + paidCreditReviewWindowMs + 1}}), undefined);
  // v1 retains its original exact decoder; the paid-only window policy is not silently applied to old records.
  assert.ok(decodeCloudCostGrant({...syntheticCostGrant, creditExpiresAtMs: 2_000_000_000, balanceValidUntilMs: 900_000_000}));
});

test('one-shot install retains unknown gift attempts byte-for-byte; paid count is independent and IDs cannot migrate', async () => {
  const f = await fixture(), before = structuredClone(f.packet), op = f.operator();
  assert.equal((await op.install(f.packet)).kind, 'confirmed');
  assert.equal((await op.install(f.packet)).kind, 'unavailable');
  assert.deepEqual(f.gateway.rows.get(cloudCostBudgetPath)!.data, before.predecessorLedger);
  const owner = new CloudCostBudgetOwner(f.make()), recovered = await owner.recover();
  assert.equal(recovered.kind, 'confirmed'); if (recovered.kind !== 'confirmed') throw Error();
  assert.equal(recovered.snapshot.attemptCount, 0); assert.equal(recovered.snapshot.availableNanoUsd, 1_400);
  assert.deepEqual(await owner.reserve({...paidAttempt, attemptId: syntheticCostAttempt.attemptId}, () => true), {kind: 'rejected', reason: 'duplicate'});
  const reserved = await owner.reserve(paidAttempt, () => true); assert.equal(reserved.kind, 'confirmed');
  if (reserved.kind !== 'confirmed') throw Error();
  assert.equal(await owner.dispatch(reserved.reservation, async controls => controls.confirmUsage(paidUsage)), 'confirmed');
  assert.equal(f.gateway.rows.get(f.path)!.data.spentNanoUsd, 133);
  assert.deepEqual(f.gateway.rows.get(cloudCostBudgetPath)!.data, before.predecessorLedger);
  assert.deepEqual(f.gateway.rows.get(`${cloudCostBudgetPath}/attempts/${syntheticCostAttempt.attemptId}`)!.data, before.predecessorAttempts[0]!.data);
});

test('lost install ACK is reconciled against only the original ID; no new seed or retry is granted', async () => {
  const f = await fixture(), op = f.operator(), seed = createOfflinePaidCloudCostBudgetSeed(f.packet, f.gateway.now);
  f.gateway.loseAck = true; assert.equal((await op.install(f.packet)).kind, 'unknown');
  assert.equal((await op.install({...f.packet, grant: {...f.packet.grant, grantId: paidAttempt.attemptId}})).kind, 'unavailable');
  assert.equal((await op.inspect(f.packet, seed.data)).kind, 'confirmed');
  assert.equal((await f.operator().install(f.packet)).kind, 'unknown');
  assert.equal(f.gateway.rows.get(f.path)!.data.attemptCount, 0);
});

test('missing selected ledger never falls back; wrong predecessor, changed fence, or inventory refuses installation', async () => {
  for (const mode of ['missing', 'predecessor', 'fence', 'inventory', 'amount']) {
    const f = await fixture();
    if (mode === 'missing') {assert.equal((await f.make().recover()).kind, 'unknown'); assert.equal(f.gateway.rows.has(f.path), false); continue;}
    if (mode === 'predecessor') f.gateway.rows.delete(cloudCostBudgetPath);
    if (mode === 'fence') f.gateway.put('ai_runtime_fence/current', {...next, generation: 3});
    const packet = mode === 'inventory' ? {...f.packet, predecessorAttempts: []} : mode === 'amount'
      ? {...f.packet, grant: {...f.packet.grant, predecessor: {...f.packet.grant.predecessor, reservedLiabilityNanoUsd: 0}, capNanoUsd: 2_000}} : f.packet;
    const writes = f.gateway.writes;
    assert.equal((await f.operator().install(packet)).kind, 'unknown'); assert.equal(f.gateway.writes, writes); assert.equal(f.gateway.rows.has(f.path), false);
  }
});

test('all five consumers exhaust one paid cap and unknown paid reservations survive a new epoch without replay', async () => {
  const f = await fixture({...syntheticPaidCostGrant, creditedPurchasedNanoUsd: 900, approvedCapNanoUsd: 900,
    verifiedSpendableRemainingNanoUsd: 900, capNanoUsd: 300});
  await f.operator().install(f.packet); const first = f.make(), r = await first.recover(); assert.equal(r.kind, 'confirmed'); if (r.kind !== 'confirmed') throw Error();
  for (const [n, consumer] of (['evaluation', 'test_app', 'conversation', 'persona', 'proactive'] as const).entries()) {
    assert.equal((await first.reserve(r.lease, {...paidAttempt, attemptId: `99999999-9999-4999-8999-${String(n).padStart(12, '0')}`,
      consumer, maxInputTokens: 10, maxOutputTokens: 10}, () => true)).kind, 'confirmed');
  }
  assert.deepEqual(await first.reserve(r.lease, paidAttempt, () => true), {kind: 'rejected', reason: 'exhausted'});
  const replacement = {...next, generation: 3, processEpoch: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
  f.gateway.put('ai_runtime_fence/current', replacement); const restarted = f.make(f.packet.grant, replacement), restored = await restarted.recover();
  assert.equal(restored.kind, 'confirmed'); if (restored.kind !== 'confirmed') throw Error();
  assert.equal(restored.snapshot.reservedNanoUsd, 300); assert.equal(restored.snapshot.attemptCount, 5);
  assert.deepEqual(await restarted.reserve(restored.lease, {...paidAttempt, attemptId: '99999999-9999-4999-8999-000000000004'}, () => true), {kind: 'rejected', reason: 'duplicate'});
});

test('freshness changes only permitted fields and lost ACK does not reset counters or permit another mutation', async () => {
  const f = await fixture(); await f.operator().install(f.packet);
  const authority = f.make(), r = await authority.recover(); assert.equal(r.kind, 'confirmed'); if (r.kind !== 'confirmed') throw Error();
  const reserve = await authority.reserve(r.lease, paidAttempt, () => true); assert.equal(reserve.kind, 'confirmed');
  const expectedLedger = structuredClone(f.gateway.rows.get(f.path)!.data);
  const expectedAttempts = [{id: paidAttempt.attemptId, data: structuredClone(f.gateway.rows.get(`${f.path}/attempts/${paidAttempt.attemptId}`)!.data)}];
  const grant = {...f.packet.grant, balanceVerifiedAtMs: 1_000_000, priceSnapshot: {...f.packet.grant.priceSnapshot,
    snapshotId: 'synthetic_review', verifiedAtMs: 1_000_000}};
  const refresh = {...f.packet, grant, expectedLedger, expectedAttempts, observedSpendableNanoUsd: 2_000,
    unreflectedConfirmedNanoUsd: 0, priceEvidenceValidUntilMs: 1_800_000};
  for (const change of [{observedSpendableNanoUsd: 1_999}, {priceEvidenceValidUntilMs: 1_700_000},
    {grant: {...grant, fundingReference: 'different_purchase'}}, {grant: {...grant, priceSnapshot: {...grant.priceSnapshot,
      prices: [{...grant.priceSnapshot.prices[0]!, outputNanoUsdPerMillionTokens: 4_000_001}]}}}]) {
    assert.equal((await f.operator().refresh({...refresh, ...change})).kind, 'unknown'); assert.deepEqual(f.gateway.rows.get(f.path)!.data, expectedLedger);
  }
  const op = f.operator(); f.gateway.loseAck = true;
  assert.equal((await op.refresh(refresh)).kind, 'unknown'); assert.equal((await op.refresh(refresh)).kind, 'unavailable');
  const expected = {...expectedLedger, grant}; assert.deepEqual(f.gateway.rows.get(f.path)!.data, expected);
  assert.equal((await op.inspect(refresh, expected, expectedAttempts)).kind, 'confirmed');
  assert.deepEqual(f.gateway.rows.get(cloudCostBudgetPath)!.data, f.packet.predecessorLedger);
});

test('paid recovery closes on expired evidence or changed predecessor and never writes the gift', async () => {
  for (const mode of ['expired', 'predecessor', 'lost-recovery']) {
    const f = await fixture(); await f.operator().install(f.packet); const before = structuredClone(f.packet.predecessorLedger);
    if (mode === 'expired') {f.gateway.now = 1_800_000; f.clock.advance(800_000);}
    if (mode === 'predecessor') f.gateway.put(cloudCostBudgetPath, {...before, reservedNanoUsd: 601});
    if (mode === 'lost-recovery') f.gateway.loseAck = true;
    const a = f.make(); assert.equal((await a.recover()).kind, 'unknown'); assert.equal((await a.recover()).kind, 'unavailable');
    assert.equal(f.gateway.rows.get(f.path)!.data.attemptCount, 0);
    if (mode !== 'predecessor') assert.deepEqual(f.gateway.rows.get(cloudCostBudgetPath)!.data, before);
  }
});

test('install refuses an unretired epoch, stopped-guard loss and a partial atomic write without a second mutation', async () => {
  for (const mode of ['epoch', 'guard', 'write']) {
    const f = await fixture();
    const op = mode === 'guard' ? new PaidCloudCreditOperator(f.gateway, () => f.gateway.now, () => false) : f.operator();
    const packet = mode === 'epoch' ? {...f.packet, expectedFence: {...epoch, cleanupGeneration: 0}} : f.packet;
    if (mode === 'write') f.gateway.failAtWrite = 1;
    const before = f.gateway.writes;
    assert.equal((await op.install(packet)).kind, 'unknown'); assert.equal(f.gateway.writes, before); assert.equal(f.gateway.rows.has(f.path), false);
    assert.equal((await op.install(f.packet)).kind, 'unavailable');
  }
});

test('freshness refuses changed attempts and inspect cannot disguise invalid predecessor evidence', async () => {
  const f = await fixture(); await f.operator().install(f.packet);
  const expectedLedger = structuredClone(f.gateway.rows.get(f.path)!.data), op = f.operator();
  const newRow = `${f.path}/attempts/${paidAttempt.attemptId}`;
  f.gateway.put(newRow, {unexpected: true});
  const packet = {...f.packet, expectedLedger, expectedAttempts: [], observedSpendableNanoUsd: 2_000,
    unreflectedConfirmedNanoUsd: 0, priceEvidenceValidUntilMs: 1_800_000};
  assert.equal((await op.refresh(packet)).kind, 'unknown'); assert.deepEqual(f.gateway.rows.get(f.path)!.data, expectedLedger);
  assert.equal((await op.inspect(f.packet, expectedLedger)).kind, 'unavailable');
  f.gateway.rows.delete(newRow);
  assert.equal((await op.inspect({...f.packet, predecessorAttempts: []}, expectedLedger)).kind, 'unavailable');
  assert.equal((await op.inspect(f.packet, expectedLedger)).kind, 'confirmed');
});

// These dates/rates/funding are synthetic policy fixtures, not an operator packet.
const longWindowDayMs = 24 * 60 * 60 * 1000;
const longWindowObservedAt = Date.parse('2026-11-18T00:00:00.000+08:00');
const longWindowCutoff = Date.parse('2027-01-18T00:00:00.000+08:00');
const longWindowGrant: CloudPaidCostGrant = {
  ...syntheticPaidCostGrant,
  creditIssuedAtMs: longWindowObservedAt - longWindowDayMs,
  creditExpiresAtMs: longWindowCutoff + 10 * longWindowDayMs,
  balanceVerifiedAtMs: longWindowObservedAt,
  balanceValidUntilMs: longWindowCutoff,
  priceSnapshot: {...syntheticPaidCostGrant.priceSnapshot,
    verifiedAtMs: longWindowObservedAt, validUntilMs: longWindowCutoff},
};

test('paid evidence accepts exactly 61 days and still accepts a shorter seven-day packet', () => {
  assert.equal(paidCreditReviewWindowMs, 61 * longWindowDayMs);
  assert.equal(longWindowCutoff - longWindowObservedAt, paidCreditReviewWindowMs);
  assert.ok(decodeCloudCostGrant(longWindowGrant));
  assert.ok(decodeOpenAiDeploymentCostGrant(longWindowGrant));
  const sevenDayEnd = longWindowObservedAt + 7 * longWindowDayMs;
  assert.ok(decodeCloudCostGrant({...longWindowGrant, balanceValidUntilMs: sevenDayEnd,
    priceSnapshot: {...longWindowGrant.priceSnapshot, validUntilMs: sevenDayEnd}}));
});

for (const excess of [1, longWindowDayMs]) {
  test(`paid balance/price independently reject 61 days plus ${excess} ms`, () => {
    assert.equal(decodeCloudCostGrant({...longWindowGrant, balanceValidUntilMs: longWindowCutoff + excess}), undefined);
    assert.equal(decodeCloudCostGrant({...longWindowGrant,
      priceSnapshot: {...longWindowGrant.priceSnapshot, validUntilMs: longWindowCutoff + excess}}), undefined);
  });
}

test('delayed verification keeps the supplied fixed cutoff and never moves it at admission', () => {
  const later = {...longWindowGrant, balanceVerifiedAtMs: longWindowObservedAt + longWindowDayMs,
    priceSnapshot: {...longWindowGrant.priceSnapshot, verifiedAtMs: longWindowObservedAt + 2 * longWindowDayMs}};
  const grant = decodeCloudCostGrant(later); assert.ok(grant);
  assert.equal(grant.balanceValidUntilMs, longWindowCutoff);
  assert.equal(grant.priceSnapshot.validUntilMs, longWindowCutoff);
  assert.equal(cloudCostGrantExpiresAt(grant), longWindowCutoff);
  assert.equal(cloudCostGrantCurrent(grant, longWindowCutoff - 1), true);
  assert.equal(cloudCostGrantCurrent(grant, longWindowCutoff), false);
  assert.equal(cloudCostGrantCurrent(grant, longWindowCutoff + 1), false);
  assert.equal(cloudCostGrantCurrent(grant, later.priceSnapshot.verifiedAtMs - 1), false);
});

test('credit expiry and an earlier balance/price cutoff remain independent hard bounds', () => {
  const earlier = longWindowCutoff - longWindowDayMs;
  assert.equal(decodeCloudCostGrant({...longWindowGrant, creditExpiresAtMs: earlier}), undefined);
  for (const grant of [
    {...longWindowGrant, balanceValidUntilMs: earlier},
    {...longWindowGrant, priceSnapshot: {...longWindowGrant.priceSnapshot, validUntilMs: earlier}},
  ]) {
    const decoded = decodeCloudCostGrant(grant); assert.ok(decoded);
    assert.equal(cloudCostGrantExpiresAt(decoded), earlier);
    assert.equal(cloudCostGrantCurrent(decoded, earlier - 1), true);
    assert.equal(cloudCostGrantCurrent(decoded, earlier), false);
  }
});

test('verification at or after the fixed packet cutoff cannot re-open that packet', () => {
  for (const at of [longWindowCutoff, longWindowCutoff + 1]) {
    assert.equal(decodeCloudCostGrant({...longWindowGrant, balanceVerifiedAtMs: at}), undefined);
    assert.equal(decodeCloudCostGrant({...longWindowGrant,
      priceSnapshot: {...longWindowGrant.priceSnapshot, verifiedAtMs: at}}), undefined);
  }
});
