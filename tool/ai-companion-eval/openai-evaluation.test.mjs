import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { prepareOpenAiCases, validateOpenAiTokenEvidence, runOpenAiEvaluation, requireOpenAiSemanticAcceptance } from './openai-evaluation.mjs';

const key = 'sk-synthetic_only_not_a_credential_123456789';
async function fixture(http) {
  const prepared = await prepareOpenAiCases('gpt-6-luna');
  const evidence = { schemaVersion: 'openai_input_bound_v1', model: 'gpt-6-luna',
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
  const golden = JSON.parse(readFileSync(new URL('./fixtures/current-prompt-requests.json', import.meta.url)));
  for (const model of ['gpt-6-luna', 'gpt-6.1-sol']) {
    const prepared = await prepareOpenAiCases(model);
    assert.equal(prepared.rows.length, 24);
    for (let i = 0; i < 24; i++) assert.deepEqual(prepared.rows[i].messages, JSON.parse(golden.cases[i].body).messages);
  }
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
