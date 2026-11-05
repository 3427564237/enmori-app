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
import { buildOpenAiInputTokenCountRequest, openAiInputTokensEndpoint, openAiResponsesEndpoint }
  from '../../src/ai-runtime/infrastructure/openai-cloud-transport.js';
import type { CloudAdmissionLimits } from '../../src/ai-runtime/ports/cloud-generation-transport.js';
import type { CloudCostGrant } from '../../src/ai-runtime/ports/cloud-cost-budget.js';
import { MetadataFirestoreGateway } from '../support/metadata-firestore-gateway.js';
import { syntheticCostGrant, syntheticCostUsage } from '../support/cloud-cost-fixtures.js';
import { accepted, deferred, FakeClock, flush } from './support.js';

const epoch = { processEpoch: '11111111-1111-4111-8111-111111111111', generation: 1 };
const limits: CloudAdmissionLimits = { windowMs: 60000, maxRequests: 100, maxTokens: 20000, tokensPerRequest: 200 };
const config = { model: 'gpt-6-luna', reasoningEffort: 'low', maxInputTokens: 100, maxOutputTokens: 100, maxRequestBytes: 8192 } as const;
const key = 'sk-proj-synthetic_runtime_key_1234567890';
const countResponse = () => Response.json({ object: 'response.input_tokens', input_tokens: 100 });
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

function fixture(settings: { grant?: CloudCostGrant; http?: typeof fetch; counted?: true } = {}) {
  const clock = new FakeClock(), gateway = new MetadataFirestoreGateway(1_000_000), rate = new FakeOpenAiRateAuthority();
  let host = true, consentCurrent = true, httpCalls = 0, nextAttempt = 0;
  const grant = settings.grant ?? syntheticCostGrant;
  gateway.put('ai_runtime_fence/current', { ...epoch, cleanupGeneration: 0 });
  const seed = createOfflineCloudCostBudgetSeed(grant, epoch, 1_000_000); gateway.put(seed.path, seed.data);
  const budgetAuthority = new FirestoreCloudCostBudget(gateway, epoch, grant, clock, () => 1_000_000 + clock.now(), () => host);
  const costBudget = new CloudCostBudgetOwner(budgetAuthority);
  const options: OpenAiConversationRuntimeOptions = { clock, costBudget, rateAuthority: rate, rateLimits: limits,
    ownsHost: () => host, apiKey: key, configuration: config,
    ...(settings.counted ? { countInputTokens: true, consumer: 'test_app' } : { inputTokenUpperBound: () => 100 }),
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
    { rateLimits: { ...limits, tokensPerRequest: 199 } }, { countInputTokens: true }, { inputTokenUpperBound: undefined },
    { consumer: 'persona' }]) {
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
    const { countInputTokens: _counted, ...staticOptions } = f.options;
    const options = mode === 'count' ? { ...staticOptions, inputTokenUpperBound: () => { f.revokeConsent(); return 100; } } : f.options;
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

test('provider count follows consent and money, refreshes authority, and binds the exact paid request', async () => {
  const events: string[] = [];
  let countBody: string | undefined;
  const f = fixture({ counted: true, http: async (url, init) => {
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error');
    assert.equal(f.rate.reservations, 2);
    assert.equal(f.owner.state.reservedTokens, limits.tokensPerRequest * 2);
    assert.equal(f.ledger().reservedNanoUsd, 600);
    assert.equal(f.ledger().attemptCount, 1);
    if (url === openAiInputTokensEndpoint) {
      events.push('count');
      countBody = init?.body as string;
      return countResponse();
    }
    assert.equal(url, openAiResponsesEndpoint);
    events.push('paid');
    assert.equal(countBody, buildOpenAiInputTokenCountRequest(init?.body as string, config));
    return response();
  } });
  await recover(f);
  const reserve = f.costBudget.reserve.bind(f.costBudget);
  f.costBudget.reserve = async (input, live) => { assert.equal(input.consumer, 'test_app'); return reserve(input, live); };
  const handle = f.handle(async () => { events.push('authorize'); return true; });
  const request = accepted(f.runtime.submit('synthetic', work(handle)));
  assert.equal((await request.outcome).ok, true);
  assert.deepEqual(events, ['authorize', 'count', 'authorize', 'paid']);
  assert.equal(f.ledger().attemptCount, 1);
  assert.equal(f.ledger().reconciledCount, 1);
  assert.equal(f.ledger().reservedNanoUsd, 0);
  assert.equal(f.ledger().spentNanoUsd, 133);
});

test('provider count needs an independent durable rate slot before money or either HTTP call', async () => {
  const f = fixture({ counted: true, http: async () => { throw Error('must not call'); } });
  await recover(f);
  const reserve = f.rate.reserve.bind(f.rate);
  let checks = 0;
  f.rate.reserve = async (...args) => ++checks === 1 ? reserve(...args) : 'rejected';
  const request = accepted(f.runtime.submit('synthetic', work(f.handle())));
  assert.equal((await request.outcome).ok, false);
  assert.equal(checks, 2);
  assert.equal(f.rate.reservations, 1);
  assert.equal(f.owner.state.reservedTokens, limits.tokensPerRequest);
  assert.equal(f.ledger().attemptCount, 0);
  assert.equal(f.httpCalls, 0);
});

test('provider count does not send a paid request after original cancellation, deadline, withdrawal or expiry', async () => {
  for (const mode of ['cancel', 'deadline', 'withdraw', 'epoch', 'grant-expiry']) {
    const pending = deferred<Response>(), counting = deferred<AbortSignal>();
    const grant = mode === 'grant-expiry' ? { ...syntheticCostGrant, balanceValidUntilMs: 1_000_001 } : syntheticCostGrant;
    const f = fixture({ counted: true, grant, http: async (url, init) => {
      assert.equal(url, openAiInputTokensEndpoint);
      counting.resolve(init!.signal!);
      return pending.promise;
    } });
    await recover(f);
    const request = accepted(f.runtime.submit('synthetic', work(f.handle())));
    const signal = await counting.promise;
    if (mode === 'cancel' || mode === 'deadline') {
      if (mode === 'cancel') request.cancel('cancelled');
      else f.clock.advance(45000);
      assert.equal((await request.outcome).ok, false, mode);
      assert.equal(signal.aborted, true, mode);
      await flush();
      assert.equal(f.owner.state.remoteUnknown, 0, mode);
    }
    if (mode === 'withdraw') f.revokeConsent();
    if (mode === 'epoch') f.rate.currentEpoch = false;
    if (mode === 'grant-expiry') f.clock.advance(2);
    pending.resolve(countResponse());
    assert.equal((await request.outcome).ok, false, mode);
    await flush();
    assert.equal(f.httpCalls, 1, mode);
    assert.equal(f.ledger().reservedNanoUsd, 600, mode);
    assert.equal(f.ledger().reconciledCount, 0, mode);
  }
});

test('provider count rejects denied authority, key reflection, post-count reauthorization failure and body drift', async () => {
  for (const mode of ['denied', 'key', 'reauthorize', 'changed']) {
    let checks = 0;
    const projection = { strategy: 'open_conversation_v1' as const, currentMessage: mode === 'key' ? key : 'Synthetic request.',
      checkIns: [], history: [], persona: undefined };
    const f = fixture({ counted: true, http: async url => {
      assert.equal(url, openAiInputTokensEndpoint);
      if (mode === 'changed') projection.currentMessage = 'A different authorized body.';
      return countResponse();
    } });
    await recover(f);
    const handle = { ...f.handle(async () => ++checks === 1 ? mode !== 'denied' : mode !== 'reauthorize'), projection: () => projection };
    const request = accepted(f.runtime.submit('synthetic', work(handle)));
    assert.equal((await request.outcome).ok, false, mode);
    assert.equal(f.httpCalls, mode === 'denied' || mode === 'key' ? 0 : 1, mode);
    assert.equal(f.ledger().reservedNanoUsd, 600, mode);
  }
});

test('provider count 429 persists cooldown and malformed counts stop without inference or retry', async () => {
  for (const value of [new Response(null, { status: 429, headers: { 'retry-after': '60' } }),
    new Response('{"object":"response.input_tokens","input_tokens":100,"input_\\u0074okens":1}',
      { headers: { 'content-type': 'application/json' } }),
    Response.json({ object: 'response.input_tokens', input_tokens: 101 })]) {
    const f = fixture({ counted: true, http: async url => { assert.equal(url, openAiInputTokensEndpoint); return value; } });
    await recover(f);
    const request = accepted(f.runtime.submit('synthetic', work(f.handle())));
    assert.equal((await request.outcome).ok, false);
    assert.equal(f.httpCalls, 1);
    assert.deepEqual(f.rate.cooldowns, value.status === 429 ? [60] : []);
    assert.equal(f.ledger().reservedNanoUsd, 600);
    assert.equal(f.ledger().reconciledCount, 0);
  }
});

test('Count 429 persistence stays visible to drain through cancellation, including a late authentic response', async () => {
  for (const mode of ['known-before-cancel', 'late-after-deadline']) {
    const pending = deferred<Response>(), counting = deferred<AbortSignal>(), writing = deferred<void>(), ack = deferred<void>();
    const f = fixture({ counted: true, http: async (url, init) => {
      assert.equal(url, openAiInputTokensEndpoint);
      counting.resolve(init!.signal!);
      return pending.promise;
    } });
    await recover(f);
    const block = f.rate.blockRateLimit.bind(f.rate);
    f.rate.blockRateLimit = async seconds => {
      writing.resolve();
      await ack.promise;
      await block(seconds);
    };
    const request = accepted(f.runtime.submit('synthetic', work(f.handle())));
    const signal = await counting.promise;
    const limited = new Response(null, { status: 429, headers: { 'retry-after': '60' } });
    if (mode === 'known-before-cancel') {
      pending.resolve(limited);
      await writing.promise;
      assert.equal(f.rateLimitPending(), true);
      request.cancel('cancelled');
    } else {
      f.clock.advance(45000);
      await request.outcome;
      assert.equal(f.rateLimitPending(), false);
      pending.resolve(limited);
      await writing.promise;
    }
    assert.equal((await request.outcome).ok, false);
    assert.equal(signal.aborted, true);
    await flush();
    assert.equal(f.owner.state.remotePending, 0);
    assert.equal(f.rateLimitPending(), true);
    ack.resolve();
    await flush();
    assert.equal(f.rateLimitPending(), false);
    assert.deepEqual(f.rate.cooldowns, [60]);
    assert.equal(f.httpCalls, 1);
    assert.equal(f.ledger().reservedNanoUsd, 600);
  }
});

test('overlapping Count 429s retain the stricter cooldown and block admission until persistence finishes', async () => {
  for (const firstWrite of ['confirmed', 'unknown']) {
    const firstResponse = deferred<Response>(), secondResponse = deferred<Response>();
    const firstHttp = deferred<void>(), secondHttp = deferred<void>();
    const firstWriteStarted = deferred<void>(), firstAck = deferred<void>();
    const secondWriteStarted = deferred<void>(), secondAck = deferred<void>();
    let calls = 0;
    const f = fixture({ counted: true, http: async url => {
      assert.equal(url, openAiInputTokensEndpoint);
      if (++calls === 1) {
        firstHttp.resolve();
        return firstResponse.promise;
      }
      assert.equal(calls, 2);
      secondHttp.resolve();
      return secondResponse.promise;
    } });
    await recover(f);
    const block = f.rate.blockRateLimit.bind(f.rate);
    const writes: (number | undefined)[] = [];
    f.rate.blockRateLimit = async seconds => {
      writes.push(seconds);
      if (writes.length === 1) {
        firstWriteStarted.resolve();
        await firstAck.promise;
        if (firstWrite === 'unknown') { f.rate.currentEpoch = false; return; }
      } else {
        secondWriteStarted.resolve();
        await secondAck.promise;
      }
      await block(seconds);
    };
    const first = accepted(f.runtime.submit('synthetic', work(f.handle())));
    await firstHttp.promise;
    first.cancel('cancelled');
    const second = accepted(f.runtime.submit('synthetic', work(f.handle())));
    await secondHttp.promise;
    firstResponse.resolve(new Response(null, { status: 429, headers: { 'retry-after': '1' } }));
    await firstWriteStarted.promise;
    secondResponse.resolve(new Response(null, { status: 429, headers: { 'retry-after': '60' } }));
    await flush();
    assert.deepEqual(writes, [1]);
    assert.equal(f.rateLimitPending(), true);
    second.cancel('cancelled');
    const duringWrite = accepted(f.runtime.submit('synthetic', work(f.handle())));
    assert.equal((await duringWrite.outcome).ok, false);
    assert.equal(f.rate.reservations, 4);
    firstAck.resolve();
    await flush();
    if (firstWrite === 'confirmed') {
      assert.deepEqual(writes, [1, 60]);
      await secondWriteStarted.promise;
      assert.equal(f.rateLimitPending(), true);
      secondAck.resolve();
    }
    await flush();
    assert.equal(f.rateLimitPending(), false);
    assert.deepEqual(f.rate.cooldowns, firstWrite === 'confirmed' ? [1, 60] : []);
    assert.deepEqual(writes, firstWrite === 'confirmed' ? [1, 60] : [1]);
    if (firstWrite === 'unknown') {
      assert.deepEqual(f.runtime.submit('synthetic', work(f.handle())), { accepted: false, failure: 'dependency_unavailable' });
    }
    assert.equal((await first.outcome).ok, false);
    assert.equal((await second.outcome).ok, false);
    assert.equal(f.ledger().reservedNanoUsd, 1200);
    assert.equal(f.ledger().reconciledCount, 0);
    assert.equal(f.httpCalls, 2);
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
