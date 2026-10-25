import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstatSync, realpathSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases, prepareCase, buildEvaluationRequest, observeSyntheticEvaluation, evaluationProfiles,
  protocolAssessment, costObservation, priceSnapshot, mockHttpFor, blankReview, sha256 } from './evaluation.mjs';

assert.equal(process.versions.node, '24.19.0', 'Use the approved existing Node runtime');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  assert(['--provider', '--out', '--authorization'].includes(args[i]) && args[i + 1] && !options[args[i]], 'Invalid argument');
  options[args[i]] = args[i + 1];
}
const mode = options['--provider'] ?? 'mock';
assert(['mock', 'local'].includes(mode), 'Cloud execution is not enabled. First obtain the specific LI budget/data decision.');
assert(options['--out'], 'Usage: node tool/ai-companion-eval/run.mjs --provider mock --out /private/parent/new-run');
if (mode === 'local') assert(options['--authorization'], 'Integration must first assign a bounded local evaluation slot');
const root = fileURLToPath(new URL('../../', import.meta.url)), out = resolve(options['--out']);
assert(relative(root, out).startsWith('..'), 'Raw reports must be outside the repository');
const parent = dirname(out), stat = lstatSync(parent);
assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() &&
  (stat.mode & 0o077) === 0 && realpathSync(parent) === parent, 'Use an owner-only real parent directory');
mkdirSync(out, { mode: 0o700 }); // Exclusive; never resume/retry/overwrite an earlier run.
const save = (name, value) => writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const corpus = loadCases(), cases = mode === 'local' ? corpus.cases.filter(c => c.track === 'current-prompt') : corpus.cases;
const provider = mode === 'local' ? 'ollama-baseline' : 'gemini-candidate';
const sourceFiles = ['backend/src/ai-runtime/infrastructure/local-chat-transport.ts',
  'backend/src/ai-runtime/infrastructure/synthetic-evaluation-adapters.ts',
  'backend/src/ai-runtime/ports/synthetic-evaluation.ts', 'tool/ai-companion-eval/evaluation.mjs',
  'tool/ai-companion-eval/run.mjs', 'tool/ai-companion-eval/fixtures/companion-cases.json',
  'tool/ai-companion-eval/fixtures/preserved-small-plan-cases.json'];
const compiledFiles = ['backend/dist/src/ai-runtime/infrastructure/local-chat-transport.js',
  'backend/dist/src/ai-runtime/infrastructure/synthetic-evaluation-adapters.js',
  'backend/dist/src/ai-runtime/domain/parse-output.js',
  'backend/dist/src/ai-conversation/application/open-conversation-semantic-policy.js'];
const manifest = { schemaVersion: 'synthetic_evaluation_run_v1', mode, provider, syntheticOnly: true,
  nodeVersion: process.versions.node, lockfileSha256: sha256(readFileSync(resolve(root, 'pnpm-lock.yaml'))),
  startedAt: new Date().toISOString(), sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceDirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0,
  sourceSha256: Object.fromEntries(sourceFiles.map(p => [p, sha256(readFileSync(resolve(root, p)))])),
  compiledSha256: Object.fromEntries(compiledFiles.map(p => [p, sha256(readFileSync(resolve(root, p)))])),
  preservedSha256: corpus.preservedSha256, corpusSha256: corpus.corpusSha256,
  intendedCases: cases.length, caseIds: cases.map(c => c.id), profile: evaluationProfiles[provider],
  authorization: options['--authorization'] ?? 'offline mock only', deliveryMs: 45_000, receiveMs: 120_000,
  priceSnapshot, realProviderCalls: 0, semanticReview: 'unreviewed; independent QA required' };
save('manifest.json', manifest);
const rows = [];
for (let i = 0; i < cases.length; i++) {
  const fixture = cases[i], prepared = await prepareCase(fixture), request = buildEvaluationRequest(provider, prepared.prompt);
  const prefix = `${String(i + 1).padStart(2, '0')}-${fixture.id}`;
  save(`${prefix}.request.json`, { id: fixture.id, fixture, prompt: prepared.prompt, providerRequest: request,
    dispatchIntent: mode === 'mock' ? 'in-memory-fake' : 'one-attempt-no-retry', at: new Date().toISOString() });
  const http = mode === 'mock' ? mockHttpFor(i, cases.length) : async (req, signal) => {
    assert.equal(req.url, 'http://127.0.0.1:11434/api/chat');
    return fetch(req.url, { method: 'POST', redirect: 'error', cache: 'no-store', signal,
      headers: { 'content-type': 'application/json' }, body: req.body });
  };
  const observation = await observeSyntheticEvaluation(provider, prepared.prompt, http);
  const row = { id: fixture.id, track: fixture.track, tags: fixture.tags, criteria: fixture.criteria,
    requestSha256: sha256(JSON.stringify(request)), observation, protocol: protocolAssessment(observation),
    cost: costObservation(observation, mode === 'mock'), semanticReview: 'unreviewed' };
  rows.push(row); save(`${prefix}.response.json`, row);
  console.log(JSON.stringify({ id: row.id, outcome: observation.outcome, protocolValid: row.protocol.valid,
    elapsedMs: Math.round(observation.elapsedMs), semanticReview: 'unreviewed' }));
  if (observation.outcome !== 'response-observed') break;
}
const report = { ...manifest, realProviderCalls: mode === 'mock' ? 0 : rows.length,
  finishedAt: new Date().toISOString(), rows, stopReason: rows.at(-1)?.observation.outcome !== 'response-observed'
    ? 'unconfirmed-or-not-started; do not retry' : 'case-budget-exhausted',
  limitations: ['No service, storage, phone or product acceptance.', 'No automatic retry or provider fallback.',
    'Mock latency/usage are fabricated and not measured model performance.', 'Protocol success is not semantic acceptance.'] };
const reportBytes = JSON.stringify(report, null, 2) + '\n';
writeFileSync(resolve(out, 'report.json'), reportBytes, { flag: 'wx', mode: 0o600 });
save('review-template.json', blankReview(sha256(reportBytes), rows));
console.log(JSON.stringify({ output: out, casesRecorded: rows.length, realProviderCalls: report.realProviderCalls,
  semanticPasses: 0, review: 'required', stopReason: report.stopReason }));
