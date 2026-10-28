import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, beforeEach, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway, type FirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { FirestoreCloudQuotaAuthority } from '../src/ai-runtime/infrastructure/firestore-cloud-quota-authority.js';
import { FakeClock } from '../test/ai-runtime/support.js';
const env = requireControlledEmulatorEnvironment(process.env);
const app = initializeApp({ projectId: env.projectId }, `cloud-quota-${randomUUID()}`), db = getFirestore(app);
const gateway = new FirebaseAdminFirestoreGateway(db), path = 'ai_cloud_quota/current', fence = 'ai_runtime_fence/current';
const epoch = { processEpoch: randomUUID(), generation: 1 };
const policy = { minute: { windowMs: 60000, maxRequests: 1, maxTokens: 10 },
  day: { windowMs: 86400000, maxRequests: 3, maxTokens: 30 }, tokensPerRequest: 10 };
const limits = { ...policy.day, tokensPerRequest: 10 }, clock = new FakeClock();
const make = (g: FirestoreGateway = gateway, e = epoch) => new FirestoreCloudQuotaAuthority(g, e,
  'emulator-synthetic', 'openai/gpt-oss-120b', policy, clock, () => 1000000 + clock.now(), () => true);
beforeEach(async () => {
  await db.doc(fence).set({ ...epoch, cleanupGeneration: 0 });
  await db.doc(path).set({ schemaVersion: 'cloud_quota_v1', provider: 'groq', model: 'openai/gpt-oss-120b',
    scope: 'emulator-synthetic', policy, ...epoch, lastObservedAtMs: 1000000,
    reservations: [], blockedUntilMs: 0 });
});
after(async () => { try { await db.doc(path).delete(); await db.doc(fence).delete(); }
  finally { await db.terminate(); await deleteApp(app); } });

test('real Firestore transactions allow at most one competing minute reservation', async () => {
  const a = make(), b = make(), ra = await a.recover(limits), rb = await b.recover(limits);
  assert.equal(ra.kind, 'confirmed'); assert.equal(rb.kind, 'confirmed');
  if (ra.kind !== 'confirmed' || rb.kind !== 'confirmed') throw Error();
  const input = { tokens: 10, conservativeExpiresAt: 86460000 };
  const results = await Promise.all([a.reserve(ra.lease, input, () => true), b.reserve(rb.lease, input, () => true)]);
  assert.equal(results.filter(r => r === 'confirmed').length, 1);
  assert.equal((await db.doc(path).get()).data()!.reservations.length, 1);
});

test('committed but unacknowledged reservation survives actual SDK recovery into a new epoch', async () => {
  let loseAck = false;
  const wrapped: FirestoreGateway = { async runTransaction(work, options) {
    const result = await gateway.runTransaction(work, options); if (loseAck) throw Error('synthetic lost ack'); return result;
  } };
  const a = make(wrapped), r = await a.recover(limits); assert.equal(r.kind, 'confirmed');
  if (r.kind !== 'confirmed') throw Error(); loseAck = true;
  assert.equal(await a.reserve(r.lease, { tokens: 10, conservativeExpiresAt: 86460000 }, () => true), 'unknown');
  const next = { processEpoch: randomUUID(), generation: 2 };
  await db.doc(fence).set({ ...next, cleanupGeneration: 0 });
  const restarted = make(gateway, next), restored = await restarted.recover(limits);
  assert.equal(restored.kind, 'confirmed');
  if (restored.kind !== 'confirmed') throw Error();
  assert.equal(restored.reservations.length, 1);
  assert.equal(await restarted.reserve(restored.lease, { tokens: 10, conservativeExpiresAt: 86460000 }, () => true), 'rejected');
  assert.equal((await db.doc(path).get()).data()!.generation, 2);
});
