import assert from 'node:assert/strict';
import test from 'node:test';
import { FirestoreCloudQuotaAuthority, type CloudQuotaPolicy } from '../../src/ai-runtime/infrastructure/firestore-cloud-quota-authority.js';
import { CloudAdmissionOwner } from '../../src/ai-runtime/application/cloud-admission-owner.js';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from '../../src/shared/infrastructure/firebase/firestore-gateway.js';
import { deferred, FakeClock } from './support.js';
const policy: CloudQuotaPolicy = { minute: { windowMs: 60000, maxRequests: 2, maxTokens: 20 },
  day: { windowMs: 86400000, maxRequests: 4, maxTokens: 40 }, tokensPerRequest: 10 };
const limits = { ...policy.day, tokensPerRequest: 10 };
const oldEpoch = { processEpoch: '11111111-1111-4111-8111-111111111111', generation: 1 };
const nextEpoch = { processEpoch: '22222222-2222-4222-8222-222222222222', generation: 2 };
const path = 'ai_cloud_quota/current';
/** Synthetic transaction simulator; no SDK or real/emulator database access. */
class Gateway implements FirestoreGateway {
  docs = new Map<string, StoredDocument>(); writes = 0; calls = 0;
  loseAck = false; beforeWrite: (() => void) | undefined;
  beforeRead: (() => Promise<void>) | undefined;
  async runTransaction<T>(work: (tx: FirestoreTransactionGateway) => Promise<T>, options?: { readonly maxAttempts: 1 }): Promise<T> {
    assert.equal(options?.maxAttempts, 1); this.calls++;
    const staged = new Map<string, StoredDocument>();
    const result = await work({
      get: async key => { if (this.beforeRead) await this.beforeRead(); return structuredClone(this.docs.get(key)); },
      set: (key, value) => { this.beforeWrite?.(); staged.set(key, structuredClone(value)); },
      create: () => { throw Error('unexpected create'); }, list: async () => { throw Error('unexpected list'); },
    });
    for (const [key, value] of staged) { this.docs.set(key, value); this.writes++; }
    if (this.loseAck) throw Error('synthetic lost acknowledgement');
    return result;
  }
}
function fixture(config = policy, gateway = new Gateway(), epoch = oldEpoch, initial = true,
  provider: 'groq' | 'openai' = 'groq', model = provider === 'openai' ? 'gpt-6-luna' : 'openai/gpt-oss-120b') {
  const clock = new FakeClock(); let utc = 1000000, owned = true;
  if (initial) {
    gateway.docs.set('ai_runtime_fence/current', { ...epoch, cleanupGeneration: 0 });
    gateway.docs.set(provider === 'openai' ? `ai_openai_quota/${model}` : path, { schemaVersion: 'cloud_quota_v1', provider, model, scope: 'synthetic',
      policy: config, ...epoch, lastObservedAtMs: utc, reservations: [], blockedUntilMs: 0 });
  }
  const authority = new FirestoreCloudQuotaAuthority(gateway, epoch, 'synthetic', model, config, clock, () => utc, () => owned, provider);
  return { clock, gateway, authority, advance: (ms: number) => { utc += ms; clock.advance(ms); }, revoke: () => { owned = false; },
    setUtc: (value: number) => { utc = value; },
    claim: (lease: object) => authority.reserve(lease, { tokens: config.tokensPerRequest, conservativeExpiresAt: clock.now() + 60000 + config.day.windowMs }, () => true) };
}
async function recovered(f: ReturnType<typeof fixture>, config = limits) {
  const result = await f.authority.recover(config); assert.equal(result.kind, 'confirmed');
  if (result.kind !== 'confirmed') throw Error('expected recovery'); return result;
}

test('missing, corrupt, mismatched and future-clock ledgers fail closed without initialization', async () => {
  for (const change of [undefined, {}, { schemaVersion: 'wrong' }, { scope: 'another-account' },
    { reservations: [{ tokens: 10, minuteExpiresAtMs: 999999999999, dayExpiresAtMs: 999999999999 }] },
    { lastObservedAtMs: 1000001 }]) {
    const f = fixture(); const old = f.gateway.docs.get(path)!;
    if (change === undefined) f.gateway.docs.delete(path); else f.gateway.docs.set(path, { ...old, ...change });
    // {} is unchanged and exercises a valid counterpart.
    const result = await f.authority.recover(limits);
    assert.equal(result.kind, change && Object.keys(change).length === 0 ? 'confirmed' : 'unknown');
    if (result.kind !== 'confirmed') assert.equal(f.gateway.writes, 0);
  }
});

test('both minute and day request caps survive window expiry and restart without replay or refund', async () => {
  const f = fixture(), first = await recovered(f);
  assert.equal(await f.claim(first.lease), 'confirmed'); assert.equal(await f.claim(first.lease), 'confirmed');
  assert.equal(await f.claim(first.lease), 'rejected');
  f.advance(120000); // original 60-second deadline + minute window
  assert.equal(await f.claim(first.lease), 'confirmed'); assert.equal(await f.claim(first.lease), 'confirmed');
  f.advance(120000); assert.equal(await f.claim(first.lease), 'rejected'); // day still full
  f.revoke(); f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
  const restarted = fixture(policy, f.gateway, nextEpoch, false); restarted.setUtc(1240000);
  const restored = await recovered(restarted);
  assert.equal(restored.reservations.length, 4); assert.equal(restored.previousRemote, 'unknown');
  assert.equal(await restarted.claim(restored.lease), 'rejected');
  assert.equal(f.authority.current(first.lease), false);
  restarted.advance(86460000);
  assert.equal(await restarted.claim(restored.lease), 'confirmed');
});

test('token caps apply independently of request counts at both windows', async () => {
  const p = { minute: { ...policy.minute, maxRequests: 3, maxTokens: 10 }, day: { ...policy.day, maxRequests: 4, maxTokens: 20 }, tokensPerRequest: 10 };
  const f = fixture(p), r = await recovered(f, { ...p.day, tokensPerRequest: 10 });
  assert.equal(await f.claim(r.lease), 'confirmed'); assert.equal(await f.claim(r.lease), 'rejected');
  f.advance(120000); assert.equal(await f.claim(r.lease), 'confirmed');
  f.advance(120000); assert.equal(await f.claim(r.lease), 'rejected');
});

test('lost reservation acknowledgement retains the claim, blocks the old owner and is recovered by a new epoch', async () => {
  const f = fixture(), first = await recovered(f); f.gateway.loseAck = true;
  assert.equal(await f.claim(first.lease), 'unknown');
  assert.equal((f.gateway.docs.get(path)!.reservations as unknown[]).length, 1);
  assert.equal(f.authority.current(first.lease), false); assert.equal(await f.claim(first.lease), 'rejected');
  f.gateway.loseAck = false; f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 }); f.revoke();
  const second = fixture(policy, f.gateway, nextEpoch, false), recoveredState = await recovered(second);
  assert.equal(recoveredState.reservations.length, 1);
});

test('stale durable epoch, local ownership loss and backward clock reject before provider admission', async () => {
  for (const mode of ['epoch', 'host', 'clock']) {
    const f = fixture(), r = await recovered(f); const writes = f.gateway.writes;
    if (mode === 'epoch') f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
    if (mode === 'host') f.revoke();
    if (mode === 'clock') f.setUtc(999999);
    assert.notEqual(await f.claim(r.lease), 'confirmed'); assert.equal(f.gateway.writes, writes);
  }
});

test('cancellation after authority reads prevents quota write and never dispatches old work', async () => {
  const f = fixture(), r = await recovered(f), wait = deferred<void>(); let live = true;
  f.gateway.beforeRead = () => wait.promise;
  const pending = f.authority.reserve(r.lease, { tokens: 10, conservativeExpiresAt: 86460000 }, () => live);
  live = false; wait.resolve();
  assert.equal(await pending, 'rejected'); assert.equal(f.gateway.writes, 1); // only recovery
});

test('429 cooldown persists through restart; invalid Retry-After conservatively blocks a day', async () => {
  const f = fixture(), r = await recovered(f);
  await f.authority.blockRateLimit(120);
  assert.equal(await f.claim(r.lease), 'rejected');
  f.revoke(); f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
  const second = fixture(policy, f.gateway, nextEpoch, false), r2 = await recovered(second);
  assert.equal(await second.claim(r2.lease), 'rejected');
  second.advance(120000); assert.equal(await second.claim(r2.lease), 'confirmed');
  await second.authority.blockRateLimit(undefined); second.advance(86400000 - 1);
  assert.equal(await second.claim(r2.lease), 'rejected'); second.advance(1);
  assert.equal(await second.claim(r2.lease), 'confirmed');
});

test('pending cooldown prevents new claims and unknown cooldown writes close admission', async () => {
  const f = fixture(), r = await recovered(f), wait = deferred<void>();
  f.gateway.beforeRead = () => wait.promise;
  const block = f.authority.blockRateLimit(10);
  assert.equal(await f.claim(r.lease), 'rejected');
  f.gateway.loseAck = true; wait.resolve(); await block;
  assert.equal(f.authority.current(r.lease), false);
});

test('daily owner composes with durable minute admission and does not invoke provider after a denied reservation', async () => {
  const f = fixture(); let calls = 0;
  const owner = new CloudAdmissionOwner(f.clock, { async dispatch() { calls++; return { kind: 'unknown', physical: 'unknown' }; } }, f.authority, limits);
  assert.equal(await owner.recover(), true);
  const budget = { signal: new AbortController().signal, deadline: 60000, remainingMs: () => 60000 };
  for (let i = 0; i < 2; i++) { const attempt = await owner.reserve(budget, () => true); assert.ok(attempt); await owner.dispatch(attempt, 'synthetic', budget); owner.unknown(attempt); }
  assert.equal(await owner.reserve(budget, () => true), undefined); assert.equal(calls, 2);
  assert.equal(owner.state.reservedRequests, 2); assert.equal(owner.state.remoteUnknown, 2);
});

test('a pre-reserved permit cannot dispatch during or after a later 429 cooldown', async () => {
  const f = fixture(); let calls = 0;
  const owner = new CloudAdmissionOwner(f.clock, { async dispatch() { calls++; return { kind: 'unknown', physical: 'unknown' }; } }, f.authority, limits);
  await owner.recover();
  const budget = { signal: new AbortController().signal, deadline: 60000, remainingMs: () => 60000 };
  const attempt = await owner.reserve(budget, () => true); assert.ok(attempt);
  const wait = deferred<void>(); f.gateway.beforeRead = () => wait.promise;
  const blocked = f.authority.blockRateLimit(120);
  assert.equal(owner.dispatch(attempt, 'synthetic', budget), undefined);
  wait.resolve(); await blocked;
  assert.equal(owner.dispatch(attempt, 'synthetic', budget), undefined); assert.equal(calls, 0);
  assert.equal(owner.state.reservedRequests, 1);
});

test('UTC jumps and malformed runtime fences fail closed', async () => {
  for (const mode of ['forward', 'missing-field', 'extra-field', 'invalid-cleanup']) {
    const f = fixture(), r = await recovered(f), writes = f.gateway.writes;
    if (mode === 'forward') f.setUtc(2000000); // monotonic clock has not moved
    if (mode === 'missing-field') f.gateway.docs.set('ai_runtime_fence/current', { ...oldEpoch });
    if (mode === 'extra-field') f.gateway.docs.set('ai_runtime_fence/current', { ...oldEpoch, cleanupGeneration: 0, unexpected: true });
    if (mode === 'invalid-cleanup') f.gateway.docs.set('ai_runtime_fence/current', { ...oldEpoch, cleanupGeneration: -1 });
    assert.notEqual(await f.claim(r.lease), 'confirmed'); assert.equal(f.gateway.writes, writes);
  }
});

test('a valid provider cooldown longer than a day is not shortened', async () => {
  const f = fixture(), r = await recovered(f);
  await f.authority.blockRateLimit(172800); f.advance(86400001);
  assert.equal(await f.claim(r.lease), 'rejected'); f.advance(86400000);
  assert.equal(await f.claim(r.lease), 'confirmed');
});

test('restart never credits unproved downtime or a permitted small positive wall-clock drift', async () => {
  const f = fixture(), r = await recovered(f); await f.claim(r.lease);
  f.setUtc(1000999); assert.equal(f.authority.canDispatch(), true);
  f.revoke(); f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
  const restarted = fixture(policy, f.gateway, nextEpoch, false); restarted.setUtc(1000999);
  const recoveredState = await recovered(restarted);
  assert.equal(recoveredState.reservations[0]!.remainingMs, 86460000);
});

test('local dispatch retains the actual committed cooldown after a delayed database acknowledgment', async () => {
  const f = fixture(); await recovered(f); let delayed = false;
  f.gateway.beforeRead = async () => { if (!delayed) { delayed = true; f.advance(120000); } };
  await f.authority.blockRateLimit(60);
  assert.equal(f.authority.canDispatch(), false); f.advance(60000);
  assert.equal(f.authority.canDispatch(), true);
});

test('fractional monotonic deadlines never round a persisted window down', async () => {
  const f = fixture(), r = await recovered(f); f.clock.advance(10.8); f.setUtc(1000010);
  assert.equal(await f.authority.reserve(r.lease, { tokens: 10, conservativeExpiresAt: 86400000 + 59.8 }, () => true), 'confirmed');
  const rows = f.gateway.docs.get(path)!.reservations as { minuteExpiresAtMs: number }[];
  assert.ok(rows[0]!.minuteExpiresAtMs >= 1000000 + 59.8 + 60000);
});

test('uninterpretable Retry-After sentinel remains closed across recovery', async () => {
  const f = fixture(); await recovered(f); await f.authority.blockRateLimit(Infinity);
  assert.equal(f.authority.canDispatch(), false); assert.equal(f.gateway.docs.get(path)!.blockedUntilMs, Number.MAX_SAFE_INTEGER);
  f.revoke(); f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
  const restarted = fixture(policy, f.gateway, nextEpoch, false); await recovered(restarted);
  assert.equal(restarted.authority.canDispatch(), false);
});

test('OpenAI recovery cannot adopt a Groq ledger or another model and leaves old quota untouched', async () => {
  const old = fixture(), before = structuredClone(old.gateway.docs.get(path));
  const missing = fixture(policy, old.gateway, oldEpoch, false, 'openai');
  assert.equal((await missing.authority.recover(limits)).kind, 'unknown');
  assert.deepEqual(old.gateway.docs.get(path), before);
  for (const mutation of [{ provider: 'groq' }, { model: 'gpt-6.1-sol' }, { scope: 'other' }]) {
    const f = fixture(policy, new Gateway(), oldEpoch, true, 'openai');
    const key = 'ai_openai_quota/gpt-6-luna';
    f.gateway.docs.set(key, { ...f.gateway.docs.get(key), ...mutation });
    assert.equal((await f.authority.recover(limits)).kind, 'unknown');
    assert.equal(f.gateway.writes, 0);
  }
});

test('both OpenAI candidates retain unknown claims and cooldown across replacement epochs', async () => {
  for (const model of ['gpt-6-luna', 'gpt-6.1-sol']) {
    const f = fixture(policy, new Gateway(), oldEpoch, true, 'openai', model), r = await recovered(f);
    assert.equal(await f.claim(r.lease), 'confirmed');
    await f.authority.blockRateLimit(120);
    assert.equal(f.authority.canDispatch(), false);
    f.revoke(); f.gateway.docs.set('ai_runtime_fence/current', { ...nextEpoch, cleanupGeneration: 0 });
    const next = fixture(policy, f.gateway, nextEpoch, false, 'openai', model), restored = await recovered(next);
    assert.equal(restored.reservations.length, 1);
    assert.equal(await next.claim(restored.lease), 'rejected');
    next.advance(120000); assert.equal(await next.claim(restored.lease), 'confirmed');
    f.gateway.loseAck = true;
    assert.equal(await next.claim(restored.lease), 'unknown');
    assert.equal(next.authority.current(restored.lease), false);
    assert.equal((f.gateway.docs.get(`ai_openai_quota/${model}`)!.reservations as unknown[]).length, 3);
    assert.equal(f.gateway.docs.has(path), false);
  }
});

test('OpenAI policy can reserve the full bounded request while Groq limits remain unchanged', async () => {
  const p = { minute: { windowMs: 60000, maxRequests: 24, maxTokens: 245760 },
    day: { windowMs: 86400000, maxRequests: 96, maxTokens: 983040 }, tokensPerRequest: 10240 };
  assert.throws(() => fixture(p));
  const f = fixture(p, new Gateway(), oldEpoch, true, 'openai');
  const r = await recovered(f, { ...p.day, tokensPerRequest: p.tokensPerRequest });
  assert.equal(await f.claim(r.lease), 'confirmed');
  assert.throws(() => fixture(p, new Gateway(), oldEpoch, true, 'openai', 'openai/gpt-oss-120b'));
  assert.throws(() => fixture({ ...p, minute: { ...p.minute, maxRequests: 61 } }, new Gateway(), oldEpoch, true, 'openai'));
});
