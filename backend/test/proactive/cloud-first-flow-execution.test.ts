import assert from 'node:assert/strict';
import test from 'node:test';
import { CloudFirstFlowExecution } from '../../src/proactive/application/cloud-first-flow-execution.js';
import { FirstFlowApplication } from '../../src/proactive/application/first-flow-application.js';
import { OPENAI_CLOUD_PROCESSING } from '../../src/account/domain/cloud-ai-consent.js';
import type { CloudAiConsentAuthority } from '../../src/account/ports/cloud-ai-consent-authority.js';
import type { AsyncConversationModelInput } from '../../src/ai-conversation/ports/async-conversation.js';
import { BoundedAiRuntime } from '../../src/ai-runtime/application/bounded-ai-runtime.js';
import { FakeClock, deferred, flush } from '../ai-runtime/support.js';
import { fixture as localFixture, ids, rawReply } from './first-flow-fakes.js';

async function fixture(effect: (handle: AsyncConversationModelInput) => Promise<Uint8Array> = async () => rawReply()) {
  const f = localFixture(); await f.queued();
  const row = f.store.rows.get(ids.intent)!;
  f.store.rows.set(ids.intent, {...row, processing: 'cloud', ...OPENAI_CLOUD_PROCESSING,
    cloudAiConsentGeneration: 3, authorizationScope: `v1.0.${ids.intent}`});
  let grant = true, generation = 3, purpose = 0, owner = 'synthetic-owner', calls = 0, sends = 0, leases = 0;
  const consent: CloudAiConsentAuthority = {processing: OPENAI_CLOUD_PROCESSING, async read() {
    if (!grant) return {kind: 'denied'};
    let released = false; leases++;
    return {kind: 'authorized', generation, purposeGeneration: purpose,
      current: () => grant && !released, release: () => {if (!released) leases--; released = true;}};
  }};
  const runtime = new BoundedAiRuntime<AsyncConversationModelInput>(new FakeClock(), {async generate(handle) {
    assert.equal(await handle.authorize(), true); calls++; return effect(handle);
  }}, true);
  const execution = new CloudFirstFlowExecution({read: async () => ({kind: 'success', value: {ownerId: owner, purposeRevocationGeneration: purpose}})}, consent, runtime);
  let beforeClaim: (() => void) | undefined;
  const app = new FirstFlowApplication({store: f.store, cloudExecution: execution, nowMs: () => f.clock.now,
    newMessageId: () => ids.message, sender: {async sendOnce(input) {
      beforeClaim?.(); const result = await input.claimAfterCredential();
      if (result.kind !== 'ok' || !input.current(result.value.claim)) return {kind: 'not_attempted'};
      sends++; return {kind: 'accepted'};
    }}});
  const abort = new AbortController();
  return {...f, app, runtime, execution, abort, run: () => app.runIntent(f.actor, ids.intent, abort.signal),
    get calls() {return calls;}, get sends() {return sends;}, get leases() {return leases;},
    withdraw() {grant = false;}, reaccept() {generation++;}, changePurpose() {purpose++;}, changeOwner() {owner = 'another-owner';},
    beforeClaim(fn: () => void) {beforeClaim = fn;},
  };
}

test('cloud F0 borrows only quoted source/time/persona and keeps its consent lease through final notification', async () => {
  let seen: AsyncConversationModelInput | undefined;
  const f = await fixture(async handle => {
    seen = handle;
    assert.equal(handle.monetaryConsumer, 'proactive'); assert.equal(handle.projection(), undefined);
    assert.deepEqual(handle.proactiveProjection?.(), {inputKind: 'proactive_followup',
      quotedRequest: {occurredAt: f.store.sourceValue.occurredAt, text: f.store.sourceValue.text},
      dueAt: f.store.rows.get(ids.intent)!.dueAt, timeZone: 'Asia/Singapore'});
    return rawReply();
  });
  f.beforeClaim(() => {assert(f.leases > 0); assert.equal(seen?.cloudConsentCurrent?.(), true);});
  const result = await f.run(); assert.equal(result.kind, 'ok'); assert.equal(f.calls, 1); assert.equal(f.sends, 1);
  assert.equal(f.store.publications.length, 1); assert.equal(f.leases, 0);
  assert.equal(seen?.proactiveProjection?.(), undefined); assert.equal(seen?.cloudConsentCurrent?.(), false);
  assert.equal((await f.run()).kind, 'ok'); assert.equal(f.calls, 1); assert.equal(f.sends, 1); f.runtime.shutdown();
});

for (const change of ['withdraw', 'reaccept', 'changePurpose', 'changeOwner'] as const) {
  test(`cloud F0 ${change} during model prevents publication and notification`, async () => {
    const f = await fixture(async () => {f[change](); return rawReply();});
    assert.notEqual((await f.run()).kind, 'ok'); assert.equal(f.calls, 1);
    assert.equal(f.store.publications.length, 0); assert.equal(f.sends, 0); assert.equal(f.leases, 0);
    assert.equal(f.store.rows.get(ids.intent)?.state, 'failed'); f.runtime.shutdown();
  });
}

test('source deletion during model fails the fresh reservation checkpoint', async () => {
  const f = await fixture(async () => {f.store.sourceAlive = false; return rawReply();});
  assert.notEqual((await f.run()).kind, 'ok'); assert.equal(f.store.publications.length, 0); assert.equal(f.sends, 0);
  assert.equal(f.leases, 0); f.runtime.shutdown();
});

test('withdrawal after publication before final FCM claim leaves no notification send', async () => {
  const f = await fixture(); f.beforeClaim(() => f.withdraw());
  assert.notEqual((await f.run()).kind, 'ok'); assert.equal(f.store.publications.length, 1); assert.equal(f.sends, 0);
  assert.equal(f.leases, 0); f.runtime.shutdown();
});

test('missing consent and legacy local intent issue no model call', async () => {
  for (const mode of ['declined', 'local']) {
    const f = await fixture();
    if (mode === 'declined') f.withdraw();
    else {const {provider: _p, disclosureVersion: _v, cloudAiConsentGeneration: _g, ...row} = f.store.rows.get(ids.intent)! as Extract<import('../../src/proactive/ports/first-flow.js').FirstFlowIntent,{processing:'cloud'}>;
      f.store.rows.set(ids.intent, {...row, processing: 'local'});}
    assert.equal((await f.run()).kind, 'denied'); assert.equal(f.calls, 0); assert.equal(f.store.publications.length, 0);
    assert.equal(f.leases, 0); f.runtime.shutdown();
  }
});

test('shared owner admission and cancellation suppress a late cloud result without regeneration', async () => {
  const started = deferred<void>(), gate = deferred<Uint8Array>();
  const f = await fixture(async () => {started.resolve(); return gate.promise;});
  const pending = f.run(); await started.promise;
  assert.deepEqual(f.runtime.submit('synthetic-owner', {purpose: 'ai_assistant_message_v1', prepare: async () => {throw Error('must not run');},
    checkCandidate: async () => ({ok: true, value: undefined})}), {accepted: false, failure: 'overload'});
  f.abort.abort(); assert.equal((await pending).kind, 'terminated'); assert.equal(f.leases, 0);
  gate.resolve(rawReply()); await flush(); assert.equal(f.store.publications.length, 0); assert.equal(f.sends, 0);
  assert.equal(f.store.rows.get(ids.intent)?.state, 'failed'); f.runtime.shutdown();
});

test('aborted initial authority read releases its late consent without returning a run', async () => {
  const f = await fixture(), gate = deferred<void>(), abort = new AbortController(); let release = 0;
  const execution = new CloudFirstFlowExecution({read: async () => {await gate.promise; return {kind: 'success', value: {ownerId: 'synthetic-owner', purposeRevocationGeneration: 0}};}},
    {processing: OPENAI_CLOUD_PROCESSING, read: async () => ({kind: 'authorized', generation: 3, purposeGeneration: 0, current: () => true, release: () => {release++;}})}, f.runtime);
  const pending = execution.open(f.actor, f.store.rows.get(ids.intent)!, {signal: abort.signal, deadline: 45000, remainingMs: () => 45000});
  abort.abort(); assert.equal((await pending).kind, 'denied'); gate.resolve(); await flush();
  assert.equal(release, 0); assert.equal(f.calls, 0); f.runtime.shutdown();
});
