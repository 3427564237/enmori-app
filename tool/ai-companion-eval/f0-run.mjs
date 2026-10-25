import { readFileSync, lstatSync, realpathSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createPrivateOutput, writeExclusiveJson } from './private-output.mjs';
import { sha256, blankReview } from './evaluation.mjs';
import { loadF0Cases } from './f0-evaluation.mjs';
import { f0SourceBundle, f0CorpusSha256, validateF0Authorization, runF0 } from './f0-runner.mjs';

const requireValue = (value, code) => { if (!value) throw Error(code); };
async function main() {
  requireValue(process.versions.node === '24.19.0', 'PINNED_NODE_REQUIRED');
  const options = {}, args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    requireValue(['--mode', '--out', '--authorization', '--authorization-sha256', '--allow-local', '--preload'].includes(args[i]) &&
      args[i + 1] && !options[args[i]], 'ARGUMENTS_INVALID');
    options[args[i]] = args[i + 1];
  }
  const mode = options['--mode'] ?? 'dry', preloadValue = options['--preload'] ?? '0';
  requireValue(['dry', 'mock', 'local'].includes(mode) && ['0', '1'].includes(preloadValue), 'F0_SCOPE_INVALID');
  const preload = preloadValue === '1', root = fileURLToPath(new URL('../../', import.meta.url));
  const bundle = f0SourceBundle(root), corpus = loadF0Cases();
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const sourceDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
  const manifest = { schemaVersion: 'f0_local_run_v1', mode, sourceHead, sourceDirty,
    sourceBundleSha256: bundle.sha256, bundle, corpusSha256: f0CorpusSha256(),
    caseIds: corpus.cases.map(c => c.id), nodeVersion: process.versions.node,
    model: 'qwen3.5:9b', numCtx: 8192, numPredict: 512, think: false,
    maxGenerationRequests: 8, maxEmptyPreloads: Number(preload), deliveryMs: 45_000, receiveMs: 120_000,
    realProviderCalls: 0, syntheticOnly: true, startedAt: new Date().toISOString() };
  if (mode === 'dry') { console.log(JSON.stringify(manifest, null, 2)); return; }
  requireValue(options['--out'], 'PRIVATE_OUTPUT_REQUIRED');
  let authorization, guard = () => {};
  if (mode === 'local') {
    requireValue(options['--allow-local'] === 'true' && options['--authorization'] &&
      /^[a-f0-9]{64}$/.test(options['--authorization-sha256'] ?? '') && !sourceDirty, 'F0_EXPLICIT_AUTHORIZATION_REQUIRED');
    const path = resolve(options['--authorization']), stat = lstatSync(path);
    requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() &&
      (stat.mode & 0o077) === 0 && realpathSync(path) === path, 'F0_AUTHORIZATION_FILE_UNSAFE');
    guard = () => {
      const bytes = readFileSync(path);
      requireValue(sha256(bytes) === options['--authorization-sha256'], 'F0_AUTHORIZATION_CHANGED');
      requireValue(f0SourceBundle(root).sha256 === bundle.sha256, 'F0_SOURCE_CHANGED');
      authorization = JSON.parse(bytes);
      validateF0Authorization(authorization, { sourceHead, sourceBundleSha256: bundle.sha256, preload });
    };
    guard();
  } else requireValue(!options['--allow-local'] && !options['--authorization'] && !options['--authorization-sha256'], 'F0_MOCK_CANNOT_USE_AUTHORIZATION');
  const output = createPrivateOutput(root, options['--out']);
  if (mode === 'local') {
    const directory = resolve(homedir(), '.local/state/enmori-ai-companion-20261025/runtime/f0-authorizations');
    try { mkdirSync(directory, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const stat = lstatSync(directory);
    requireValue(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() &&
      (stat.mode & 0o077) === 0 && realpathSync(directory) === directory, 'F0_AUTHORIZATION_LEDGER_UNSAFE');
    writeExclusiveJson(resolve(directory, `${sha256(authorization.slotReference)}.claimed.json`),
      { authorizationSha256: options['--authorization-sha256'], sourceHead, claimedAt: new Date().toISOString(),
        disposition: 'Consumed once. No automatic retry, resume or reset, including after failure.' });
  }
  output.save('manifest.json', { ...manifest, authorization });
  const cancellation = new AbortController(), cancel = () => cancellation.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  try {
    const http = mode === 'local' ? fetch : async url => Response.json({ model: 'qwen3.5:9b', done: true, done_reason: 'stop',
      ...(url.endsWith('/generate') ? { response: '' } : { message: { content:
        '{"schemaVersion":"ai_assistant_message_v1","message":"MOCK ONLY; fabricated, no semantic evidence."}' } }) });
    const result = await runF0({ mode, http, save: output.save, guard, preload, signal: cancellation.signal,
      onProgress: row => console.log(JSON.stringify({ id: row.id, outcome: row.observation.outcome,
        elapsedMs: Math.round(row.observation.elapsedMs), eligible: row.protocol.eligible, semanticReview: 'unreviewed' })) });
    const report = { ...manifest, ...result, authorization, finishedAt: new Date().toISOString() };
    output.save('report.json', report);
    output.save('review-template.json', blankReview(sha256(JSON.stringify(report, null, 2) + '\n'), report.rows));
    console.log(JSON.stringify({ output: output.path, counts: result.counts, realProviderCalls: result.realProviderCalls,
      stopReason: result.stopReason, laneState: result.laneState, semanticReview: 'independent QA required' }));
    if (result.stopReason !== 'case-budget-exhausted' || result.rows.some(row => !row.protocol.eligible)) process.exitCode = 2;
  } finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
}
main().catch(error => { console.error(JSON.stringify({ status: 'not-completed', code:
  /^[A-Z][A-Z0-9_]{3,70}$/.test(error?.message ?? '') ? error.message : 'F0_STOPPED' })); process.exitCode = 2; });
