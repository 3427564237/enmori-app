import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { OwnAvatar } from '../../src/account/application/own-avatar.js';
import { FirestoreOwnAvatarRepository } from '../../src/account/infrastructure/firestore-own-avatar-repository.js';
import { FirestoreConversationStore } from '../../src/ai-conversation/infrastructure/firestore-conversation-store.js';
import { MonotonicRuntimeClock } from '../../src/ai-runtime/infrastructure/monotonic-runtime-clock.js';
import { createOpenAiTestAppComposition, type OpenAiTestAppConfiguration } from '../../src/bootstrap/openai-test-app-composition.js';
import { createAuthBindingDocumentId } from '../../src/shared/infrastructure/firebase/firestore-records.js';
import type { IdentityVerifier } from '../../src/shared/ports/identity-verifier.js';
import { syntheticCostGrant } from '../support/cloud-cost-fixtures.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import type { FirestoreGateway } from '../../src/shared/infrastructure/firebase/firestore-gateway.js';
import type { RuntimeClock } from '../../src/ai-runtime/ports/runtime-clock.js';

const principal = { firebaseUid: 'synthetic-test-operator' };
const environment = { ENMORI_ENVIRONMENT: 'controlled-demo', ENMORI_REMOTE_GROUP: 'true', ENMORI_FIREBASE_PROJECT_ID: 'enmori-rmvp-controlled' };
const identity: IdentityVerifier = { async verifyIdToken(token) { return { kind: 'verified', principal: { firebaseUid: token } }; } };
const expectedFence = { processEpoch: randomUUID(), generation: 5, cleanupGeneration: 2 };
const settings = { principal, checkInVisibility: 'private', optionalProcessingConsent: 'rejected', expectedRevision: 0 };
const profile = { principal, displayName: 'Synthetic', profileVisibility: 'private', expectedRevision: 0 };
const config: OpenAiTestAppConfiguration = {
  claim: { expectedFence, expiresAtMs: 2_000_001 }, firebaseUid: principal.firebaseUid,
  grant: { ...syntheticCostGrant, originalGiftCreditNanoUsd: 68_000_000_000, verifiedSpendableRemainingNanoUsd: 68_000_000_000,
    capNanoUsd: 3_400_000_000 }, rateScope: 'synthetic_scope',
  ratePolicy: { minute: { windowMs: 60_000, maxRequests: 1, maxTokens: 10240 },
    day: { windowMs: 86_400_000, maxRequests: 1, maxTokens: 10240 }, tokensPerRequest: 10240 },
  apiKey: 'sk-proj-synthetic_runtime_key_1234567890',
};
function fixture() {
  const gateway = new InMemoryFirestoreGateway({
    'ai_runtime_fence/current': expectedFence,
    [`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`]: { accountId: 'owner' },
    'accounts/owner': { username: 'member_a', optionalProcessingConsent: 'accepted', checkInVisibility: 'private',
      onboardingCompletedAt: '2026-10-05T00:00:00.000Z', purposeRevocationGeneration: 3 },
  });
  const avatar = new OwnAvatar(new FirestoreOwnAvatarRepository(gateway));
  return { gateway, avatar, store: new FirestoreConversationStore(gateway, environment, () => 2_000_000) };
}

test('armed process keeps ordinary reads/profile updates but cannot write Settings without its claim', async () => {
  const { gateway, avatar } = fixture();
  for (const arm of [null, config]) {
    const testApp = createOpenAiTestAppComposition(arm, gateway, environment, avatar, identity);
    assert.equal((await testApp.preferences.getProfile(principal)).ok, true);
    assert.equal((await testApp.preferences.getSettings(principal)).ok, true);
    assert.equal((await testApp.preferences.saveSettings(settings)).ok, false);
    assert.equal(testApp.state(), undefined);
  }
  const testApp = createOpenAiTestAppComposition(config, gateway, environment, avatar, identity);
  assert.equal((await testApp.preferences.saveProfile(profile)).ok, true);
  assert.deepEqual(await testApp.identity.verifyIdToken('other'), { kind: 'verified', principal: { firebaseUid: 'other' } });
  assert.deepEqual(await testApp.identity.verifyIdToken(principal.firebaseUid), { kind: 'verified', principal });
});

test('confirmed owner keeps Settings through failed monetary recovery; replacement and released owner stay closed', async () => {
  const { gateway, avatar, store } = fixture();
  const owner = createOpenAiTestAppComposition(config, gateway, environment, avatar, identity);
  const winner = await store.startEpoch(randomUUID(), owner.selection!.claim);
  assert.equal(winner.kind, 'confirmed');
  if (winner.kind !== 'confirmed') return;
  const claimed = owner.selection!.afterClaim(winner.value, new MonotonicRuntimeClock(), () => 2_000_000);
  // Valid grant shape but expired authority and no monetary ledger. No send is invoked.
  const runtime = await claimed.createRuntime();
  assert.equal(owner.state()?.ready, false);
  assert.equal((await owner.preferences.saveSettings(settings)).ok, true);
  const replacement = createOpenAiTestAppComposition(config, gateway, environment, avatar, identity);
  assert.deepEqual(await store.startEpoch(randomUUID(), replacement.selection!.claim), { kind: 'conflict' });
  assert.equal((await replacement.preferences.saveSettings({ ...settings, expectedRevision: 1 })).ok, false);
  owner.closeAdmission();
  owner.release();
  runtime.shutdown();
  assert.equal((await owner.preferences.getSettings(principal)).ok, true);
  assert.equal((await owner.preferences.saveSettings({ ...settings, expectedRevision: 1 })).ok, false);
});

test('all-account admission preserves upstream authentication rejection', async () => {
  const { gateway, avatar } = fixture();
  const rejected: IdentityVerifier = { async verifyIdToken() { return { kind: 'invalid' }; } };
  const app = createOpenAiTestAppComposition(config, gateway, environment, avatar, rejected);
  assert.deepEqual(await app.identity.verifyIdToken('invalid'), { kind: 'invalid' });
});

test('renewable owner gates Settings synchronously after suspend/expiry and retains ordinary reads/profile edits',async()=>{
  const {gateway:memory,avatar}=fixture();
  const ownership={mode:'renewable_service_lease',serviceKey:'synthetic_azure',leaseDurationMs:120000,renewEveryMs:30000,safetyMarginMs:15000} as const;
  await memory.runTransaction(async tx=>tx.set('ai_runtime_fence/service_owner',{schemaVersion:'openai_service_owner_v1',
    serviceKey:ownership.serviceKey,enabled:true,processEpoch:expectedFence.processEpoch,generation:expectedFence.generation,
    leaseVersion:0,renewedAtMs:0,leaseUntilMs:0}));
  const gateway:FirestoreGateway={runTransaction:(work,options)=>memory.runTransaction(tx=>work({...tx,getSnapshot:async path=>{
    const data=await tx.get(path);return data?{id:path.split('/').at(-1)!,data,createTime:{seconds:1,nanoseconds:0},readTime:{seconds:2000,nanoseconds:0}}:undefined;
  }}))};
  let now=0;const clock:RuntimeClock={now:()=>now,at:()=>()=>{}};
  const {claim:_claim,...common}=config;
  const app=createOpenAiTestAppComposition({...common,ownership},gateway,environment,avatar,identity,clock);
  assert.equal((await app.preferences.saveSettings(settings)).ok,false);
  const epoch=await app.selection?.acquireEpoch?.();assert(epoch);app.selection!.afterClaim(epoch,new MonotonicRuntimeClock(),()=>2000000);
  assert.equal((await app.preferences.saveSettings(settings)).ok,true);
  now=105000;assert.equal((await app.preferences.saveSettings({...settings,expectedRevision:1})).ok,false);
  assert.equal(app.ownerCurrent(),false);assert.equal(app.ownershipLost(),true);
  assert.equal((await app.preferences.getSettings(principal)).ok,true);assert.equal((await app.preferences.saveProfile(profile)).ok,true);
  app.release();
});
