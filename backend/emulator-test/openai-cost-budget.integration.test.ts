import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, beforeEach, test } from 'node:test';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createOfflineCloudCostBudgetSeed, cloudCostBudgetPath, FirestoreCloudCostBudget }
  from '../src/ai-runtime/infrastructure/firestore-cloud-cost-budget.js';
import type { CloudCostAttemptInput } from '../src/ai-runtime/ports/cloud-cost-budget.js';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway, type FirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { FakeClock } from '../test/ai-runtime/support.js';
import { syntheticCostAttempt, syntheticCostGrant, syntheticCostUsage } from '../test/support/cloud-cost-fixtures.js';

// This guard runs before Firebase initialization. Only the isolated demo-project
// emulator profile is accepted; no model, public endpoint or credential is used.
const environment = requireControlledEmulatorEnvironment(process.env);
const app = initializeApp({ projectId: environment.projectId }, `openai-cost-${randomUUID()}`), db = getFirestore(app);
const gateway = new FirebaseAdminFirestoreGateway(db), fencePath = 'ai_runtime_fence/current';
const epoch = { processEpoch: randomUUID(), generation: 1 }, clock = new FakeClock();
const grant = { ...syntheticCostGrant, originalGiftCreditNanoUsd: 12_000, capNanoUsd: 600 };
const ownedAttemptIds = new Set<string>();
const input = (): CloudCostAttemptInput => {
  const attemptId = randomUUID(); ownedAttemptIds.add(attemptId); return { ...syntheticCostAttempt, attemptId };
};
const attemptPath = (attemptId: string) => `${cloudCostBudgetPath}/attempts/${attemptId}`;
const make = (adapter: FirestoreGateway = gateway, runtimeEpoch = epoch, host = () => true) =>
  new FirestoreCloudCostBudget(adapter, runtimeEpoch, grant, clock, () => 1_000_000 + clock.now(), host);
async function recover(authority: FirestoreCloudCostBudget) {
  const result = await authority.recover(); assert.equal(result.kind, 'confirmed');
  if (result.kind !== 'confirmed') throw Error('expected budget recovery'); return result;
}
async function reserve(authority: FirestoreCloudCostBudget, attempt: CloudCostAttemptInput) {
  const recovered = await recover(authority), result = await authority.reserve(recovered.lease, attempt, () => true);
  assert.equal(result.kind, 'confirmed');
  if (result.kind !== 'confirmed') throw Error('expected cost reservation'); return result;
}
beforeEach(async () => {
  await db.doc(fencePath).set({ ...epoch, cleanupGeneration: 0 });
  const seed = createOfflineCloudCostBudgetSeed(grant, epoch, 1_000_000); await db.doc(seed.path).set(seed.data);
});
afterEach(async () => {
  for (const attemptId of ownedAttemptIds) await db.doc(attemptPath(attemptId)).delete();
  ownedAttemptIds.clear(); await db.doc(cloudCostBudgetPath).delete(); await db.doc(fencePath).delete();
});
after(async () => { try { await db.terminate(); } finally { await deleteApp(app); } });

test('actual SDK competing hosts cannot commit more than the shared monetary cap', async () => {
  const a = make(), b = make(), ra = await recover(a), rb = await recover(b), ia = input(), ib = input();
  const results = await Promise.all([a.reserve(ra.lease, ia, () => true), b.reserve(rb.lease, ib, () => true)]);
  assert.ok(results.filter(result => result.kind === 'confirmed').length <= 1);
  const ledger = (await db.doc(cloudCostBudgetPath).get()).data()!;
  const records = await Promise.all([db.doc(attemptPath(ia.attemptId)).get(), db.doc(attemptPath(ib.attemptId)).get()]);
  const committed = records.filter(row => row.exists).length;
  // With maxAttempts:1, Firestore may abort both lock contenders. Neither an
  // acknowledgment nor liveness is promised; the durable cap is the invariant.
  assert.ok(committed <= 1); assert.equal(ledger.reservedNanoUsd, committed * 600);
  assert.equal(ledger.spentNanoUsd, 0); assert.equal(ledger.attemptCount, committed);
  for (const [index, authority] of [a, b].entries()) {
    if (results[index]!.kind === 'unknown') assert.equal(authority.current(index === 0 ? ra.lease : rb.lease), false);
    if (results[index]!.kind === 'confirmed') assert.equal(records[index]!.exists, true);
  }
  // Never replay a contender after an ambiguous result. A fresh epoch may make
  // one independent new attempt if no durable reservation consumed the cap.
  const next = { processEpoch: randomUUID(), generation: 2 }; await db.doc(fencePath).set({ ...next, cleanupGeneration: 0 });
  const restarted = make(gateway, next), restored = await recover(restarted);
  assert.equal(restored.snapshot.reservedNanoUsd, committed * 600);
  const independent = await restarted.reserve(restored.lease, input(), () => true);
  assert.equal(independent.kind, committed === 0 ? 'confirmed' : 'rejected');
  assert.equal((await db.doc(cloudCostBudgetPath).get()).data()!.reservedNanoUsd, 600);
});

test('committed reservation with lost ACK survives SDK restart and duplicate IDs never authorize replay', async () => {
  let loseAck = false, owned = true;
  const wrapped: FirestoreGateway = { async runTransaction(work, options) {
    const result = await gateway.runTransaction(work, options);
    if (loseAck) throw Error('synthetic lost budget acknowledgment'); return result;
  } };
  const first = make(wrapped, epoch, () => owned), r = await recover(first), attempt = input(); loseAck = true;
  assert.deepEqual(await first.reserve(r.lease, attempt, () => true), { kind: 'unknown' });
  assert.equal((await db.doc(attemptPath(attempt.attemptId)).get()).data()!.state, 'reserved');
  assert.equal(first.current(r.lease), false);
  owned = false; const next = { processEpoch: randomUUID(), generation: 2 };
  await db.doc(fencePath).set({ ...next, cleanupGeneration: 0 });
  const restarted = make(gateway, next), restored = await recover(restarted);
  assert.equal(restored.snapshot.reservedNanoUsd, 600); assert.equal(restored.snapshot.availableNanoUsd, 0);
  assert.deepEqual(await restarted.reserve(restored.lease, attempt, () => true), { kind: 'rejected', reason: 'duplicate' });
  assert.deepEqual(await restarted.reserve(restored.lease, input(), () => true), { kind: 'rejected', reason: 'exhausted' });
  assert.equal((await db.doc(cloudCostBudgetPath).get()).data()!.generation, 2);
});

test('actual SDK terminal usage reconciles only once and retains premium cache-write/reasoning arithmetic', async () => {
  const authority = make(), attempt = input(), reserved = await reserve(authority, attempt);
  assert.equal(authority.beginDispatch(reserved.reservation), true);
  assert.equal(await authority.reconcile(reserved.reservation, syntheticCostUsage), 'confirmed');
  assert.equal(await authority.reconcile(reserved.reservation, syntheticCostUsage), 'already_reconciled');
  assert.equal(authority.beginDispatch(reserved.reservation), false);
  const ledger = (await db.doc(cloudCostBudgetPath).get()).data()!, row = (await db.doc(attemptPath(attempt.attemptId)).get()).data()!;
  assert.equal(ledger.reservedNanoUsd, 0); assert.equal(ledger.spentNanoUsd, 133);
  assert.equal(ledger.reconciledCount, 1); assert.equal(row.chargedNanoUsd, 133); assert.equal(row.state, 'reconciled');
  assert.deepEqual(row.usage, syntheticCostUsage);
});

test('lost settlement ACK remains a single durable charge after a new runtime epoch', async () => {
  let loseAck = false;
  const wrapped: FirestoreGateway = { async runTransaction(work, options) {
    const result = await gateway.runTransaction(work, options);
    if (loseAck) throw Error('synthetic lost settlement acknowledgment'); return result;
  } };
  const first = make(wrapped), attempt = input(), reserved = await reserve(first, attempt);
  assert.equal(first.beginDispatch(reserved.reservation), true); loseAck = true;
  assert.equal(await first.reconcile(reserved.reservation, syntheticCostUsage), 'unknown');
  assert.equal(await first.reconcile(reserved.reservation, syntheticCostUsage), 'rejected');
  const next = { processEpoch: randomUUID(), generation: 2 }; await db.doc(fencePath).set({ ...next, cleanupGeneration: 0 });
  const restarted = make(gateway, next), restored = await recover(restarted);
  assert.equal(restored.snapshot.reservedNanoUsd, 0); assert.equal(restored.snapshot.spentNanoUsd, 133);
  assert.equal(restored.snapshot.reconciledCount, 1); assert.equal(restored.snapshot.attemptCount, 1);
  assert.deepEqual(await restarted.reserve(restored.lease, attempt, () => true), { kind: 'rejected', reason: 'duplicate' });
  assert.equal((await db.doc(cloudCostBudgetPath).get()).data()!.spentNanoUsd, 133);
});

test('actual SDK missing ledger never initializes itself', async () => {
  await db.doc(cloudCostBudgetPath).delete();
  assert.equal((await make().recover()).kind, 'unknown'); assert.equal((await db.doc(cloudCostBudgetPath).get()).exists, false);
});
