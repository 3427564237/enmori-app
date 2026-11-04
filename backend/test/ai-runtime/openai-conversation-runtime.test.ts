import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpenAiConversationRuntime, type OpenAiConversationRuntimeOptions, type OpenAiRateAuthority }
  from '../../src/bootstrap/openai-conversation-runtime.js';
import { OPENAI_CLOUD_PROCESSING, GROQ_CLOUD_PROCESSING } from '../../src/account/domain/cloud-ai-consent.js';
import { ApplicationCloudConversationConsent } from '../../src/ai-conversation/application/async-cloud-conversation-transport.js';
import type { AsyncConversationModelInput } from '../../src/ai-conversation/ports/async-conversation.js';
import type { RuntimeWork } from '../../src/ai-runtime/application/bounded-ai-runtime.js';
import { CloudCostBudgetOwner } from '../../src/ai-runtime/application/cloud-cost-budget-owner.js';
import { createOfflineCloudCostBudgetSeed, cloudCostBudgetPath, FirestoreCloudCostBudget }
  from '../../src/ai-runtime/infrastructure/firestore-cloud-cost-budget.js';
import { FirestoreCloudQuotaAuthority } from '../../src/ai-runtime/infrastructure/firestore-cloud-quota-authority.js';
import type { CloudAdmissionLimits } from '../../src/ai-runtime/ports/cloud-generation-transport.js';
import type { CloudCostGrant } from '../../src/ai-runtime/ports/cloud-cost-budget.js';
import { MetadataFirestoreGateway } from '../support/metadata-firestore-gateway.js';
import { syntheticCostGrant, syntheticCostUsage } from '../support/cloud-cost-fixtures.js';
import { accepted, deferred, FakeClock, flush } from './support.js';

const epoch = { processEpoch: '11111111-1111-4111-8111-111111111111', generation: 1 };
const limits: CloudAdmissionLimits = { windowMs: 60000, maxRequests: 100, maxTokens: 20000, tokensPerRequest: 200 };
const config = { model: 'gpt-6-luna', reasoningEffort: 'low', maxInputTokens: 100, maxOutputTokens: 100, maxRequestBytes: 8192 } as const;
const key = 'sk-proj-synthetic_runtime_key_1234567890';
const response = () => Response.json({ id: 'resp_synthetic', object: 'response', status: 'completed', model: config.model,
  error: null, incomplete_details: null, service_tier: 'default', store: false, background: false,
  output: [{ id: 'msg_synthetic', type: 'message', role: 'assistant', status: 'completed',
    content: [{ type: 'output_text', annotations: [], text: JSON.stringify({ schemaVersion: 'ai_assistant_message_v1', message: 'Synthetic reply.' }) }] }],
  usage: { input_tokens: syntheticCostUsage.inputTokens,
    input_tokens_details: { cached_tokens: syntheticCostUsage.cachedInputTokens, cache_write_tokens: syntheticCostUsage.cacheWriteTokens },
    output_tokens: syntheticCostUsage.outputTokens, output_tokens_details: { reasoning_tokens: syntheticCostUsage.reasoningTokens },
    total_tokens: syntheticCostUsage.totalTokens } });

/** A generic synthetic quota authority; no production OpenAI limits are inferred. */
class FakeOpenAiRateAuthority implements OpenAiRateAuthority {
  readonly quotaIdentity = Object.freeze({ provider: 'openai', model: config.model } as const);
  readonly lease = {};
  readonly cooldowns: (number | undefined)[] = [];
  currentEpoch = true;
  allowed = true;
  recoveries = 0;
  reservations = 0;
  async recover(received: Readonly<CloudAdmissionLimits>) {
    assert.deepEqual(received, limits); this.recoveries++;
    return { kind: 'confirmed', lease: this.lease, previousRemote: 'unknown', reservations: [] } as const;
  }
  current(lease: object) { return this.currentEpoch && lease === this.lease; }
  dispatchAllowed(lease: object) { return this.current(lease) && this.allowed; }
  async reserve(lease: object, input: { readonly tokens: number; readonly conservativeExpiresAt: number }, live: () => boolean) {
    if (!this.dispatchAllowed(lease) || !live()) return 'rejected' as const;
    assert.equal(input.tokens, limits.tokensPerRequest); this.reservations++;
    return 'confirmed' as const;
  }
  async blockRateLimit(seconds: number | undefined) {
    this.cooldowns.push(seconds);
    this.allowed = false;
  }
}

function fixture(settings: { grant?: CloudCostGrant; http?: typeof fetch } = {}) {
  const clock = new FakeClock(), gateway = new MetadataFirestoreGateway(1_000_000), rate = new FakeOpenAiRateAuthority();
  let host = true, consentCurrent = true, httpCalls = 0, nextAttempt = 0;
  const grant = settings.grant ?? syntheticCostGrant;
  gateway.put('ai_runtime_fence/current', { ...epoch, cleanupGeneration: 0 });
  const seed = createOfflineCloudCostBudgetSeed(grant, epoch, 1_000_000); gateway.put(seed.path, seed.data);
  const budgetAuthority = new FirestoreCloudCostBudget(gateway, epoch, grant, clock, () => 1_000_000 + clock.now(), () => host);
  const costBudget = new CloudCostBudgetOwner(budgetAuthority);
  const options: OpenAiConversationRuntimeOptions = { clock, costBudget, rateAuthority: rate, rateLimits: limits,
    ownsHost: () => host, apiKey: key, configuration: config, inputTokenUpperBound: () => 100,
    cloudConsent: new ApplicationCloudConversationConsent(OPENAI_CLOUD_PROCESSING),
    randomAttemptId: () => `00000000-0000-4000-8000-${(++nextAttempt).toString(16).padStart(12, '0')}`,
    http: async (url, init) => { httpCalls++; return settings.http ? settings.http(url, init) : response(); },
  };
  const built = createOpenAiConversationRuntime(options);
  return { ...built, options, gateway, budgetAuthority, rate, clock,
    get httpCalls() { return httpCalls; }, get attempts() { return nextAttempt; },
    ledger: () => gateway.rows.get(cloudCostBudgetPath)!.data,
    revokeConsent() { consentCurrent = false; }, revokeHost() { host = false; },
    handle(authorize: () => Promise<boolean> = async () => true): AsyncConversationModelInput {
      return { processing: 'cloud', ...OPENAI_CLOUD_PROCESSING, cloudConsentCurrent: () => consentCurrent,
        authorize, projection: () => ({ strategy: 'open_conversation_v1', currentMessage: 'Synthetic request.', checkIns: [], history: [], persona: undefined }) };
    },
  };
}
async function recover(f: ReturnType<typeof fixture>) {
  assert.equal((await f.costBudget.recover()).kind, 'confirmed');
  assert.equal(await f.owner.recover(), true);
}
function work(handle: AsyncConversationModelInput, check: () => void = () => {}): RuntimeWork<AsyncConversationModelInput> {
  return { purpose: 'ai_assistant_message_v1', prepare: async () => handle,
    checkCandidate: async () => { check(); return { ok: true, value: undefined }; } };
}

test('factory is inert and unrecovered monetary/rate owners issue no HTTP or application preparation', async () => {
  const f = fixture(); let prepared = 0;
  assert.equal(f.gateway.calls, 0); assert.equal(f.rate.recoveries, 0); assert.equal(f.httpCalls, 0);
  assert.equal(f.costBudget, f.options.costBudget);
  assert.deepEqual(f.runtime.submit('synthetic', { ...work(f.handle()), prepare: async () => { prepared++; return f.handle(); } }),
    { accepted: false, failure: 'dependency_unavailable' });
  assert.equal(prepared, 0); assert.equal(f.httpCalls, 0); assert.equal(f.gateway.calls, 0);
  const wrongOrder = fixture(); assert.equal(await wrongOrder.owner.recover(), false);
  assert.equal(wrongOrder.rate.recoveries, 0); assert.equal(wrongOrder.httpCalls, 0);
  await f.costBudget.recover();
  assert.deepEqual(f.runtime.submit('synthetic', work(f.handle())), { accepted: false, failure: 'dependency_unavailable' });
});

test('missing quota dispatch guard, wrong processor or insufficient reservation fails construction', () => {
  const f = fixture();
  for (const change of [{ cloudConsent: new ApplicationCloudConversationConsent(GROQ_CLOUD_PROCESSING) },
    { rateAuthority: { ...f.rate, dispatchAllowed: undefined } }, { costBudget: undefined },
    { rateLimits: { ...limits, tokensPerRequest: 199 } }]) {
    assert.throws(() => createOpenAiConversationRuntime({ ...f.options, ...change } as OpenAiConversationRuntimeOptions),
      /^Error: OPENAI_RUNTIME_CONFIGURATION_INVALID$/);
  }
  assert.equal(f.gateway.calls, 0); assert.equal(f.httpCalls, 0);
});

test('a Groq or different-model quota cannot be used for OpenAI dispatch', () => {
  const f = fixture();
  const policy = { minute: { windowMs: 60000, maxRequests: 2, maxTokens: 400 },
    day: { windowMs: 86400000, maxRequests: 4, maxTokens: 800 }, tokensPerRequest: 200 };
  for (const [provider, model] of [['groq', 'openai/gpt-oss-120b'], ['openai', 'gpt-6.1-sol']] as const) {
    const authority = new FirestoreCloudQuotaAuthority(f.gateway, epoch, 'synthetic', model, policy,
      f.clock, () => 1_000_000, () => true, provider);
    assert.deepEqual(authority.quotaIdentity, { provider, model });
    assert.equal(Reflect.set(authority.quotaIdentity, 'model', config.model), false);
    assert.equal(Reflect.set(authority, 'quotaIdentity', f.rate.quotaIdentity), false);
    assert.throws(() => createOpenAiConversationRuntime({ ...f.options, rateAuthority: authority,
      rateLimits: { ...policy.day, tokensPerRequest: policy.tokensPerRequest } }),
      /^Error: OPENAI_RUNTIME_CONFIGURATION_INVALID$/);
  }
  assert.equal(f.gateway.calls, 0); assert.equal(f.httpCalls, 0);
});

test('invalid key, model and numeric settings are rejected before recovery or any monetary claim', () => {
  const f = fixture();
  for (const change of [{ apiKey: 'invalid' }, { apiKey: key + '\n' },
    { configuration: { ...config, model: 'unknown' } }, { configuration: { ...config, reasoningEffort: 'medium' } },
    { configuration: { ...config, maxInputTokens: 0 } }, { configuration: { ...config, maxInputTokens: NaN } },
    { configuration: { ...config, maxOutputTokens: 15 } }, { configuration: { ...config, maxRequestBytes: 0 } }]) {
    assert.throws(() => createOpenAiConversationRuntime({ ...f.options, ...change } as OpenAiConversationRuntimeOptions),
      /^Error: OPENAI_RUNTIME_CONFIGURATION_INVALID$/);
  }
  assert.equal(f.gateway.calls, 0); assert.equal(f.ledger().attemptCount, 0);
  assert.equal(f.rate.recoveries, 0); assert.equal(f.httpCalls, 0); assert.equal(f.attempts, 0);
});

test('rate reservation, durable money reservation, fresh authorization, HTTP and usage reconciliation occur in order', async () => {
  const events: string[] = [];
  let f: ReturnType<typeof fixture>;
  f = fixture({ http: async (_url, init) => {
    events.push('http'); assert.equal(f.ledger().reservedNanoUsd, 600); assert.equal(f.ledger().attemptCount, 1);
    const body = JSON.parse(init?.body as string);
    assert.equal(body.input.at(-1).content, 'Synthetic request.');
    assert(!String(init?.body).includes('cloudConsentCurrent')); assert(!String(init?.body).includes('authorize'));
    return response();
  } });
  await recover(f);
  const reserve = f.costBudget.reserve.bind(f.costBudget);
  f.costBudget.reserve = async (input, live) => { events.push('money'); assert.equal(input.consumer, 'conversation'); return reserve(input, live); };
  const handle = f.handle(async () => { events.push('authorize'); assert.equal(f.ledger().reservedNanoUsd, 600); return true; });
  const request = accepted(f.runtime.submit('synthetic', { ...work(handle), prepare: async () => {
    events.push('prepare'); assert.equal(f.rate.reservations, 1); return handle;
  } }));
  const outcome = await request.outcome;
  assert.equal(outcome.ok, true, JSON.stringify({ outcome, events, httpCalls: f.httpCalls, rate: f.owner.state }));
  assert.deepEqual(events, ['prepare', 'money', 'authorize', 'http']);
  assert.equal(f.httpCalls, 1); assert.equal(f.ledger().reservedNanoUsd, 0); assert.equal(f.ledger().spentNanoUsd, 133);
  assert.equal(f.ledger().reconciledCount, 1); assert.equal(f.owner.state.remotePending, 0);
});

test('Groq, legacy missing or partial grants cannot reserve OpenAI money or reach HTTP', async () => {
  const f = fixture(); await recover(f);
  for (const handle of [{ ...f.handle(), ...GROQ_CLOUD_PROCESSING },
    { ...f.handle(), provider: undefined, disclosureVersion: undefined }, { ...f.handle(), disclosureVersion: undefined }]) {
    const request = accepted(f.runtime.submit('synthetic', work(handle as unknown as AsyncConversationModelInput)));
    assert.equal((await request.outcome).ok, false);
  }
  assert.equal(f.httpCalls, 0); assert.equal(f.attempts, 0); assert.equal(f.ledger().attemptCount, 0);
});

test('cancellation during a delayed money ACK preserves its claim and cannot dispatch the old handle after independent work', async () => {
  const f = fixture(); await recover(f);
  const ack = deferred<void>(), claimed = deferred<void>(), original = f.costBudget.reserve.bind(f.costBudget);
  let reservations = 0;
  f.costBudget.reserve = async (input, live) => {
    const result = await original(input, live);
    if (++reservations === 1) { claimed.resolve(); await ack.promise; }
    return result;
  };
  const oldHandle = f.handle(), first = accepted(f.runtime.submit('synthetic', work(oldHandle)));
  await claimed.promise; assert.equal(f.ledger().reservedNanoUsd, 600); assert.equal(f.httpCalls, 0);
  first.cancel('cancelled'); assert.deepEqual(await first.outcome, { ok: false, failure: 'cancelled' });
  const next = accepted(f.runtime.submit('synthetic', work(f.handle())));
  assert.equal((await next.outcome).ok, true); assert.equal(f.httpCalls, 1);
  ack.resolve(); await flush(); assert.equal(f.httpCalls, 1); assert.equal(f.ledger().reservedNanoUsd, 600);
  const repeated = accepted(f.runtime.submit('synthetic', work(oldHandle)));
  assert.equal((await repeated.outcome).ok, false); assert.equal(f.httpCalls, 1); assert.equal(f.ledger().attemptCount, 2);
});

test('consent withdrawal while money reservation awaits its ACK prevents authorization, projection and HTTP', async () => {
  const f = fixture(); await recover(f);
  const ack = deferred<void>(), claimed = deferred<void>(), original = f.costBudget.reserve.bind(f.costBudget);
  f.costBudget.reserve = async (input, live) => { const result = await original(input, live); claimed.resolve(); await ack.promise; return result; };
  let authorized = 0, projected = 0;
  const handle = { ...f.handle(async () => { authorized++; return true; }), projection: () => {
    projected++; return { strategy: 'open_conversation_v1', currentMessage: 'Private synthetic.', checkIns: [], history: [], persona: undefined } as const;
  } };
  const request = accepted(f.runtime.submit('synthetic', work(handle)));
  await claimed.promise; f.revokeConsent(); ack.resolve();
  assert.equal((await request.outcome).ok, false); assert.equal(f.httpCalls, 0);
  assert.equal(authorized, 0); assert.equal(projected, 0); assert.equal(f.ledger().reservedNanoUsd, 600);
});

test('final consent and epoch guards still run after asynchronous authorization and token counting', async () => {
  for (const mode of ['consent', 'epoch', 'host', 'count']) {
    const f = fixture(); await recover(f);
    const authority = deferred<boolean>();
    const options = mode === 'count' ? { ...f.options, inputTokenUpperBound: () => { f.revokeConsent(); return 100; } } : f.options;
    const selected = mode === 'count' ? createOpenAiConversationRuntime(options) : f;
    if (mode === 'count') assert.equal(await selected.owner.recover(), true);
    const request = accepted(selected.runtime.submit('synthetic', work(f.handle(() => authority.promise))));
    // Wait until the monetary claim and bridge authorization have started.
    for (let i = 0; i < 12; i++) await flush();
    if (mode === 'consent') f.revokeConsent();
    if (mode === 'epoch') f.rate.currentEpoch = false;
    if (mode === 'host') f.revokeHost();
    authority.resolve(true);
    assert.equal((await request.outcome).ok, false); assert.equal(f.httpCalls, 0, mode);
  }
});

test('withdrawal after HTTP can reconcile confirmed original billing but cannot deliver the response', async () => {
  const pending = deferred<Response>(), called = deferred<void>();
  const f = fixture({ http: async () => { called.resolve(); return pending.promise; } }); await recover(f);
  let checks = 0;
  const request = accepted(f.runtime.submit('synthetic', work(f.handle(), () => { checks++; })));
  await called.promise; f.revokeConsent(); pending.resolve(response());
  assert.equal((await request.outcome).ok, false); assert.equal(checks, 0); assert.equal(f.httpCalls, 1);
  assert.equal(f.ledger().reservedNanoUsd, 0); assert.equal(f.ledger().spentNanoUsd, 133);
});

test('unknown HTTP and 429 retain the full monetary claim without retries or duplicate dispatch', async () => {
  for (const status of [429, 503]) {
    const f = fixture({ http: async () => new Response('', { status, headers: { 'retry-after': '60' } }) }); await recover(f);
    const handle = f.handle(), request = accepted(f.runtime.submit('synthetic', work(handle)));
    assert.equal((await request.outcome).ok, false); assert.equal(f.httpCalls, 1);
    assert.equal(f.ledger().reservedNanoUsd, 600); assert.equal(f.ledger().spentNanoUsd, 0);
    assert.deepEqual(f.rate.cooldowns, status === 429 ? [60] : []);
    const repeated = accepted(f.runtime.submit('synthetic', work(handle)));
    assert.equal((await repeated.outcome).ok, false); assert.equal(f.httpCalls, 1); assert.equal(f.ledger().attemptCount, 1);
  }
});

test('exhausted shared budget cannot call HTTP while ordinary profile/settings reads and profile saves still work', async () => {
  const grant = { ...syntheticCostGrant, originalGiftCreditNanoUsd: 10_000, capNanoUsd: 500 };
  const f = fixture({ grant }); await recover(f);
  const request = accepted(f.runtime.submit('synthetic', work(f.handle())));
  assert.equal((await request.outcome).ok, false); assert.equal(f.httpCalls, 0); assert.equal(f.ledger().attemptCount, 0);
  const { createCloudConsentServices } = await import('../../src/bootstrap/cloud-consent-services.js');
  const { InMemoryFirestoreGateway } = await import('../support/in-memory-firestore-gateway.js');
  const { createAuthBindingDocumentId } = await import('../../src/shared/infrastructure/firebase/firestore-records.js');
  const principal = { firebaseUid: 'synthetic-budget-owner' }, profile = '/tmp/enmori-openai-runtime-synthetic';
  const environment = { ENMORI_ENVIRONMENT: 'test', ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile, HOME: profile, APPDATA: profile,
    USERPROFILE: profile, XDG_CONFIG_HOME: profile, GCLOUD_PROJECT: 'demo-enmori-openai-runtime', GOOGLE_CLOUD_PROJECT: 'demo-enmori-openai-runtime',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:19099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:18180' };
  const store = new InMemoryFirestoreGateway({ [`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`]: { accountId: 'owner' },
    'accounts/owner': { username: 'member_a', optionalProcessingConsent: 'accepted', checkInVisibility: 'private',
      onboardingCompletedAt: '2026-10-05T00:00:00.000Z', purposeRevocationGeneration: 3 } });
  const services = createCloudConsentServices(store, environment, epoch, () => false, undefined, OPENAI_CLOUD_PROCESSING);
  assert.equal((await services.preferences.getProfile(principal)).ok, true);
  assert.equal((await services.preferences.getSettings(principal)).ok, true);
  assert.equal((await services.preferences.saveProfile({ principal, displayName: 'Synthetic', profileVisibility: 'private', expectedRevision: 0 })).ok, true);
});
