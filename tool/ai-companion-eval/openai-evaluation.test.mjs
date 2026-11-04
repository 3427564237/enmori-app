import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectOpenAiTokenEvidence, prepareOpenAiCases, validateOpenAiTokenEvidence, runOpenAiEvaluation,
  requireOpenAiSemanticAcceptance } from './openai-evaluation.mjs';
import { loadCases, sha256 } from './evaluation.mjs';
import { OpenAiChatTransport } from '../../backend/dist/src/ai-runtime/infrastructure/openai-chat-transport.js';
import { buildOpenAiRequest } from '../../backend/dist/src/ai-runtime/infrastructure/openai-cloud-transport.js';

const key = 'sk-synthetic_only_not_a_credential_123456789';
async function fixture(http) {
  const prepared = await prepareOpenAiCases('gpt-6-luna');
  const evidence = { schemaVersion: 'openai_input_bound_v1', mode: 'mock', model: 'gpt-6-luna',
    verifiedAtMs: 100, expiresAtMs: 200, method: 'verified-model-framing', corpusSha256: prepared.corpusSha256,
    rows: prepared.rows.map(r => ({ id: r.id, requestSha256: r.requestSha256, inputTokenUpperBound: 8192 })) };
  const actions = [], writes = new Map(); let claimed = false;
  const owner = { recover: async () => ({ kind: 'confirmed' }),
    reserve: async input => { actions.push(['reserve', input.attemptId]); return { kind: 'confirmed', reservation: {} }; },
    dispatch: (_, invoke) => invoke({ available: () => true,
      confirmUsage: async () => { actions.push(['settle']); return 'confirmed'; } }) };
  const args = { model: 'gpt-6-luna', key, owner, tokenEvidence: evidence,
    grant: { syntheticOnly: true, model: 'gpt-6-luna', corpusSha256: prepared.corpusSha256,
      maximumRequests: 24, approvalReference: 'synthetic-test', expiresAtMs: 200 },
    claimRun: async () => { assert(!claimed); claimed = true; },
    save: async (name, value) => { writes.set(name, structuredClone(value)); actions.push(['save', name]); },
    http: async (...a) => { actions.push(['http']); return http(...a); },
    clock: { now: () => 0, at: () => () => {} }, utcNow: () => 101 };
  return { prepared, evidence, args, actions, writes };
}

test('both OpenAI models preserve all 24 exact golden messages and criteria', async () => {
  const fixture = readFileSync(new URL('./fixtures/current-prompt-requests.json', import.meta.url));
  assert.equal(sha256(fixture), 'b6a8673446a1a36cc5921e097ecacbf06aa752450227e9eddbab6ad7049027ee');
  const golden = JSON.parse(fixture);
  for (const model of ['gpt-6-luna', 'gpt-6.1-sol']) {
    const prepared = await prepareOpenAiCases(model);
    assert.equal(prepared.rows.length, 24);
    for (let i = 0; i < 24; i++) assert.deepEqual(prepared.rows[i].messages, JSON.parse(golden.cases[i].body).messages);
  }
});

test('the goal-grounding profile changes only the system message in both complete candidate sets', async () => {
  const suffixes = new Set();
  const corpus = loadCases().cases.filter(item => item.track === 'current-prompt');
  for (const model of ['gpt-6-luna', 'gpt-6.1-sol']) {
    const baseline = await prepareOpenAiCases(model);
    const candidate = await prepareOpenAiCases(model, 'goal-grounding-v1');
    assert.equal(candidate.corpusSha256, baseline.corpusSha256);
    assert.deepEqual(candidate.config, { ...baseline.config, promptProfile: 'goal-grounding-v1' });
    let projectedBody;
    const production = new OpenAiChatTransport({ dispatch: async messages => {
      projectedBody = buildOpenAiRequest(messages, candidate.config);
      return { kind: 'unknown', physical: 'unknown' };
    } });
    for (const [index, row] of candidate.rows.entries()) {
      const old = baseline.rows[index];
      assert.equal(row.id, corpus[index].id);
      assert.equal(row.criteria, corpus[index].criteria);
      assert.deepEqual(row, { ...old, requestSha256: row.requestSha256 });
      const before = JSON.parse(buildOpenAiRequest(old.messages, baseline.config));
      const raw = buildOpenAiRequest(row.messages, candidate.config);
      const { input, ...controls } = JSON.parse(raw);
      projectedBody = undefined;
      await production.dispatch(corpus[index].input, {});
      assert.equal(projectedBody, raw);
      assert.equal(row.requestSha256, sha256(raw));
      assert.notEqual(row.requestSha256, old.requestSha256);
      assert.equal(input[0].role, 'system');
      assert(input[0].content.startsWith(`${before.input[0].content}\n\n`));
      suffixes.add(input[0].content.slice(before.input[0].content.length + 2));
      assert.deepEqual({ ...controls, input: [before.input[0], ...input.slice(1)] }, before);
    }
  }
  assert.equal(suffixes.size, 1);
  assert([...suffixes][0].length > 0);
});

test('the goal-grounding profile requires a matching grant and new exact-body count evidence', async () => {
  const promptProfile = 'goal-grounding-v1';
  const f = await fixture(async () => { throw Error('synthetic generation stopped'); });
  const candidate = await prepareOpenAiCases(f.args.model, promptProfile);
  const { model, utcNow } = f.args;
  const grant = { ...f.args.grant, promptProfile };
  let countCalls = 0, claims = 0;
  const count = { model, promptProfile, key, grant, utcNow, save: async () => {}, claimPreflight: async () => { claims++; },
    http: async (_url, { body }) => {
      const row = candidate.rows[countCalls++];
      const generation = JSON.parse(buildOpenAiRequest(row.messages, candidate.config));
      assert.deepEqual(JSON.parse(body).input, generation.input);
      return Response.json({ object: 'response.input_tokens', input_tokens: 101 });
    } };
  await assert.rejects(collectOpenAiTokenEvidence({ ...count, grant: f.args.grant }));
  assert.equal(claims, 0);
  assert.equal(countCalls, 0);
  const tokenEvidence = await collectOpenAiTokenEvidence(count);
  assert.equal(tokenEvidence.promptProfile, promptProfile);
  assert.equal(claims, 1);
  assert.equal(countCalls, 24);
  await assert.rejects(runOpenAiEvaluation({ ...f.args, promptProfile, grant }));
  await assert.rejects(runOpenAiEvaluation({ ...f.args, promptProfile, tokenEvidence }));
  assert.equal(f.actions.length, 0);
  const report = await runOpenAiEvaluation({ ...f.args, promptProfile, grant, tokenEvidence });
  assert.equal(report.promptProfile, promptProfile);
  assert.equal(report.configuration.promptProfile, promptProfile);
  assert.equal(report.rows[0].requestSha256, candidate.rows[0].requestSha256);
  assert.equal(report.transportInvocations, 1);
});

test('OpenAI preflight counts only the 24 fixed inputs and binds both request bodies', async () => {
  const f = await fixture(() => { throw Error('generation must not run'); });
  const { model, grant, save, utcNow } = f.args;
  let calls = 0, claims = 0;
  const args = { model, grant, key, save, utcNow, claimPreflight: async () => { assert.equal(++claims, 1); },
    http: async (url, options) => {
      const row = f.prepared.rows[calls++];
      assert.equal(url, 'https://api.openai.com/v1/responses/input_tokens');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.authorization, `Bearer ${key}`);
      const generation = JSON.parse(buildOpenAiRequest(row.messages, f.prepared.config));
      const { model, input, reasoning, text, truncation, tool_choice, tools } = generation;
      assert.deepEqual(JSON.parse(options.body), { model, input, reasoning, text, truncation, tool_choice, tools });
      assert.deepEqual(f.writes.get(`${row.id}.count-intent.json`),
        { id: row.id, requestSha256: row.requestSha256, countRequestSha256: sha256(options.body) });
      return Response.json({ object: 'response.input_tokens', input_tokens: 100 + calls });
    } };
  const evidence = await collectOpenAiTokenEvidence(args);
  assert.equal(calls, 24);
  assert.equal(evidence.rows.length, 24);
  assert.equal(evidence.mode, 'mock');
  assert.deepEqual(f.writes.get('token-evidence.json'), evidence);
  assert.equal(validateOpenAiTokenEvidence(evidence, f.prepared, 101).get(f.prepared.rows[0].requestSha256), 101);
  assert.throws(() => validateOpenAiTokenEvidence(evidence, f.prepared, 101, 'live'));
  await assert.rejects(collectOpenAiTokenEvidence(args));
  assert.equal(calls, 24);
  evidence.rows[0].countRequestSha256 = 'changed';
  assert.throws(() => validateOpenAiTokenEvidence(evidence, f.prepared, 101));
  assert(!JSON.stringify([...f.writes.values()]).includes(key));
});

test('count rejection, malformed data or unknown outcome preserve intent and stop without retry', async () => {
  for (const observe of [
    () => new Response(key, { status: 429 }),
    () => Response.json({ object: 'response.input_tokens', input_tokens: 8193 }),
    () => Response.json({ object: 'response', input_tokens: 100 }),
    () => new Response('{"object":"response.input_tokens","input_tokens":500,"input_\\u0074okens":1}',
      { headers: { 'content-type': 'application/json' } }),
    () => { throw Error(key); },
  ]) {
    const f = await fixture(() => { throw Error('generation must not run'); });
    const { model, grant, save, utcNow } = f.args;
    let calls = 0;
    await assert.rejects(collectOpenAiTokenEvidence({ model, grant, key, save, utcNow, claimPreflight: async () => {},
      http: async () => { calls++; return observe(); } }), { message: 'OPENAI_COUNT_UNCONFIRMED_NO_RETRY' });
    assert.equal(calls, 1);
    assert.deepEqual([...f.writes.keys()], [`${f.prepared.rows[0].id}.count-intent.json`, `${f.prepared.rows[0].id}.count-failure.json`]);
    assert(!JSON.stringify([...f.writes.values()]).includes(key));
  }
});

test('preflight rejects expired grants, incorrect modes and unsaved intent before HTTP', async () => {
  const f = await fixture(() => { throw Error('generation must not run'); });
  const { model, grant, save, utcNow } = f.args;
  let claims = 0, calls = 0;
  const args = { model, grant, key, save, utcNow, claimPreflight: async () => { claims++; },
    http: async () => { calls++; throw Error('must not call'); } };
  await assert.rejects(collectOpenAiTokenEvidence({ ...args, utcNow: () => grant.expiresAtMs }));
  await assert.rejects(collectOpenAiTokenEvidence({ ...args, mode: 'live' }));
  await assert.rejects(collectOpenAiTokenEvidence({ ...args, http: globalThis.fetch }));
  assert.equal(claims, 0);
  await assert.rejects(collectOpenAiTokenEvidence({ ...args, save: async () => { throw Error('private output unavailable'); } }));
  assert.equal(claims, 1);
  assert.equal(calls, 0);
});

test('altered request token evidence and expired evidence never authorize dispatch', async () => {
  const f = await fixture(() => { throw Error('must not call'); });
  f.evidence.rows[0].requestSha256 = 'changed';
  assert.throws(() => validateOpenAiTokenEvidence(f.evidence, f.prepared, 101));
  await assert.rejects(runOpenAiEvaluation(f.args));
  assert.equal(f.actions.length, 0);
  const g = await fixture(() => { throw Error('must not call'); });
  g.args.utcNow = () => 200;
  await assert.rejects(runOpenAiEvaluation(g.args)); assert.equal(g.actions.length, 0);
});

test('live validation rejects model-framing evidence marked mock or missing a mode', async () => {
  const f = await fixture(() => { throw Error('must not call'); });
  assert.throws(() => validateOpenAiTokenEvidence(f.evidence, f.prepared, 101, 'live'));
  delete f.evidence.mode;
  assert.throws(() => validateOpenAiTokenEvidence(f.evidence, f.prepared, 101, 'live'));
});

test('unknown network outcome keeps reservation and stops after the first call without retry', async () => {
  const f = await fixture(async () => { throw Error('lost response'); });
  const report = await runOpenAiEvaluation(f.args);
  assert.equal(report.actualProviderCalls, 0); assert.equal(report.transportInvocations, 1); assert.equal(report.rows.length, 1);
  assert.equal(report.stopReason, 'ineligible-or-unconfirmed-no-retry');
  assert.equal(f.actions.filter(a => a[0] === 'settle').length, 0);
  assert(f.actions.findIndex(a => a[0] === 'reserve') < f.actions.findIndex(a => a[0] === 'http'));
  assert(f.actions.findIndex(a => a[1]?.endsWith?.('.intent.json')) < f.actions.findIndex(a => a[0] === 'http'));
  await assert.rejects(runOpenAiEvaluation(f.args));
  assert.equal(f.actions.filter(a => a[0] === 'http').length, 1);
});

test('missing monetary budget stops before HTTP even with complete token evidence', async () => {
  const f = await fixture(() => { throw Error('must not call'); });
  f.args.owner.reserve = async () => ({ kind: 'rejected', reason: 'exhausted' });
  const report = await runOpenAiEvaluation(f.args);
  assert.equal(report.actualProviderCalls, 0); assert.equal(report.stopReason, 'budget-unavailable');
});

test('rate reservation precedes monetary reservation and a 429 stops after persisting cooldown', async () => {
  const f = await fixture(async () => new Response(null, { status: 429, headers: { 'retry-after': '2' } }));
  f.args.rateAuthority = { available: () => true,
    reserve: async live => { assert(live()); f.actions.push(['rate-reserve']); return 'confirmed'; },
    rateLimited: async seconds => { f.actions.push(['cooldown', seconds]); } };
  const report = await runOpenAiEvaluation(f.args);
  assert.equal(report.intendedCases, 24);
  assert.equal(report.transportInvocations, 1);
  assert.equal(report.rows[0].observation.httpStatus, 429);
  assert.deepEqual(f.actions.filter(([type]) => ['rate-reserve', 'reserve', 'http', 'cooldown'].includes(type)).map(([type]) => type),
    ['rate-reserve', 'reserve', 'http', 'cooldown']);
  assert.deepEqual(f.actions.find(([type]) => type === 'cooldown'), ['cooldown', 2]);
  assert.equal(f.actions.filter(([type]) => type === 'settle').length, 0);
});

test('unsettled diagnostic counters remain separate from confirmed usage and provider content', async () => {
  const f = await fixture(async () => Response.json({ id: key, object: 'response', model: 'gpt-6-luna',
    status: 'completed', service_tier: 'default', store: false, background: false, error: null, incomplete_details: null,
    usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120,
      input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 }, private: key },
    output: [{ type: 'message', content: key }] }));
  const report = await runOpenAiEvaluation(f.args);
  const observation = report.rows[0].observation;
  assert.deepEqual(observation.rejectionDiagnostic, { reason: 'usage-cache-write-count-missing',
    reportedTokenCounts: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20, reasoningTokens: 0, totalTokens: 120 } });
  assert.equal(observation.usage, undefined);
  assert.equal(observation.rawText, undefined);
  assert(!JSON.stringify([...f.writes.values()]).includes(key));
  assert.equal(f.actions.filter(([type]) => type === 'settle').length, 0);
});

test('24 mock responses stay unreviewed and never become semantic acceptance', async () => {
  const f = await fixture(async () => Response.json({ id: 'resp_synthetic', object: 'response', model: 'gpt-6-luna',
    status: 'completed', service_tier: 'default', store: false, background: false, error: null, incomplete_details: null,
    usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } },
    output: [{ id: 'msg_synthetic', type: 'message', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', annotations: [], text: JSON.stringify({ schemaVersion: 'ai_assistant_message_v1',
        message: 'MOCK ONLY. Not model quality evidence.' }) }] }] }));
  const report = await runOpenAiEvaluation(f.args);
  assert.equal(report.actualProviderCalls, 0); assert.equal(report.transportInvocations, 24); assert.equal(report.rows.length, 24);
  assert.equal(report.mode, 'mock');
  assert.throws(() => requireOpenAiSemanticAcceptance(report, 'synthetic', {}));
  assert.equal(report.semanticReview, 'unreviewed'); assert(report.rows.every(r => r.semanticReview === 'unreviewed'));
  assert.equal(f.actions.filter(a => a[0] === 'settle').length, 24);
});

test('a live label rejects injected mock HTTP and a shared current owner is not recovered again', async () => {
  const f = await fixture(async () => { throw Error('must not call'); });
  await assert.rejects(runOpenAiEvaluation({ ...f.args, mode: 'live' }));
  assert.equal(f.actions.length, 0);
  f.args.owner.isCurrent = () => true;
  f.args.owner.recover = async () => { throw Error('must not recover again'); };
  const report = await runOpenAiEvaluation(f.args);
  assert.equal(report.transportInvocations, 1);
});
