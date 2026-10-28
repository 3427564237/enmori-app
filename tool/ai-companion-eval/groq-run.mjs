import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createPrivateOutput, outsideRepository } from './private-output.mjs';
import { sha256, loadCases } from './evaluation.mjs';
import { claimCloudAuthorization } from './cloud-runner.mjs';
import { groqModel, loadGroqCases, prepareGroqCase, buildGroqRequest, createGroqHttp, observeGroq } from './groq-evaluation.mjs';
import { createGroqPacer, groqRunPolicy, validGroqAuthorization, withinGroqRequestBound, withinGroqUsageBound } from './groq-run-policy.mjs';

// Explicit one-shot synthetic runner. No environment credentials, product data,
// provider fallback, automatic retry, or paid-plan upgrade.
const root = fileURLToPath(new URL('../../', import.meta.url));
const opt = {};
try {
  assert.equal(process.versions.node, '24.19.0');
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    assert(['--key-file', '--authorization', '--out', '--profile'].includes(args[i]) && args[i + 1] && !opt[args[i]]);
    opt[args[i]] = args[i] === '--profile' ? args[i + 1] : resolve(args[i + 1]);
  }
  assert(Object.keys(opt).length === 4);
  const profile = opt['--profile'];
  const policy = groqRunPolicy(profile);
  const maxCompletionTokens = policy.maximumCompletionTokens;
  function privateFile(path) {
    const s = lstatSync(path);
    assert(s.isFile() && !s.isSymbolicLink() && s.uid === process.getuid() && (s.mode & 0o077) === 0 &&
      realpathSync(path) === path && outsideRepository(root, path));
    return readFileSync(path, 'utf8');
  }
  const authorization = JSON.parse(privateFile(opt['--authorization']));
  const corpus = loadCases();
  const verify = () => assert(validGroqAuthorization(authorization, profile, corpus.corpusSha256, groqModel));
  verify();
  const key = privateFile(opt['--key-file']).trim();
  assert(/^gsk_[A-Za-z0-9_-]{20,}$/.test(key));
  const { save } = createPrivateOutput(root, opt['--out']);
  claimCloudAuthorization(resolve(opt['--authorization'], '../claims'), authorization);
  const files = ['tool/ai-companion-eval/groq-run.mjs', 'tool/ai-companion-eval/groq-run-policy.mjs', 'tool/ai-companion-eval/groq-evaluation.mjs',
    'tool/ai-companion-eval/evaluation.mjs', 'tool/ai-companion-eval/goal-prompt-candidate.mjs', 'tool/ai-companion-eval/fixtures/current-prompt-requests.json',
    'backend/dist/src/ai-runtime/infrastructure/local-chat-transport.js'];
  const report = { schemaVersion: 'groq_synthetic_run_v1', syntheticOnly: true, model: groqModel, profile,
    sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    sourceDirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0,
    sourceSha256: Object.fromEntries(files.map(p => [p, sha256(readFileSync(resolve(root, p)))])),
    corpusSha256: corpus.corpusSha256, authorization, startedAt: new Date().toISOString(),
    intendedCases: 24, maximumRequests: 24, maxUsd: 0, actualProviderCalls: 0,
    maximumCompletionTokens: maxCompletionTokens, reasoningEffort: policy.reasoningEffort, minimumSpacingMs: policy.minimumSpacingMs,
    deliveryMs: 45000, receiveMs: 120000, rows: [], semanticReview: 'unreviewed' };
  save('manifest.json', report);
  const originalHttp = createGroqHttp(key, fetch, profile);
  const pacer = createGroqPacer(profile, () => performance.now(), ms => delay(ms));
  for (const fixture of loadGroqCases()) {
    const { prompt } = await prepareGroqCase(fixture.id, profile);
    const request = buildGroqRequest(prompt, profile);
    // Fixed request byte bound, not proof of the provider's tokenizer or
    // server-side wrappers. Free-plan enforcement remains provider-side;
    // 429 and unknown responses stop, and never trigger a paid fallback.
    assert(withinGroqRequestBound(request.body, profile));
    await pacer.waitForSlot();
    verify();
    save(`${fixture.id}.intent.json`, { fixture, request, requestSha256: sha256(JSON.stringify(request)),
      attempt: report.actualProviderCalls + 1, at: new Date().toISOString() });
    const measured = async (req, signal) => {
      verify();
      assert(!signal.aborted && report.actualProviderCalls < 24);
      pacer.recordStart();
      report.actualProviderCalls++;
      return originalHttp(req, signal);
    };
    const result = await observeGroq(prompt, measured, { secret: key, profile });
    const row = { id: fixture.id, criteria: fixture.criteria, ...result, semanticReview: 'unreviewed' };
    save(`${fixture.id}.response.json`, row);
    report.rows.push(row);
    console.log(JSON.stringify({ id: row.id, outcome: row.observation.outcome, eligible: row.protocol.eligible,
      ms: Math.round(row.observation.elapsedMs), status: row.observation.httpStatus }));
    if (!row.protocol.eligible) { report.stopReason = 'ineligible-or-unconfirmed-no-retry'; break; }
    const usage = row.observation.usage;
    if (!withinGroqUsageBound(usage, profile)) {
      report.stopReason = 'usage-unknown-or-over-reservation'; break;
    }
  }
  report.finishedAt = new Date().toISOString();
  report.stopReason ??= 'case-budget-exhausted';
  save('report.json', report);
  console.log(JSON.stringify({ recorded: report.rows.length, calls: report.actualProviderCalls, stopReason: report.stopReason }));
  if (report.rows.length !== 24 || report.stopReason !== 'case-budget-exhausted') process.exitCode = 2;
} catch {
  // Never serialize unexpected errors containing credentials or provider text.
  console.error('GROQ_RUN_STOPPED; preserve exclusive intents; do not retry.');
  process.exitCode = 2;
}
