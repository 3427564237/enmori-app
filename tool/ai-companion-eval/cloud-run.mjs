import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createPrivateOutput, outsideRepository } from './private-output.mjs';
import { loadCases, blankReview, sha256 } from './evaluation.mjs';
import { mockAuthorization } from './cloud-budget.mjs';
import { freeProject, freeSelection, freeSelectionSha256, freeMinimumSpacingMs,
  mockFreeAuthorization, validateFreeAuthorization } from './free-cloud-scope.mjs';
import { sourceBundle, createGeminiHttp, runSyntheticCloud, safeErrorCode, claimCloudAuthorization } from './cloud-runner.mjs';

const requireValue = (condition, code) => { if (!condition) throw Error(code); };
async function main() {
  requireValue(process.versions.node === '24.19.0', 'PINNED_NODE_REQUIRED');
  const options = {}, args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    requireValue(['--mode', '--out', '--authorization', '--authorization-sha256', '--allow-cloud', '--key-file', '--passes', '--max-usd'].includes(args[i]) &&
      args[i + 1] && !options[args[i]], 'ARGUMENTS_INVALID');
    options[args[i]] = args[i + 1];
  }
  const mode = options['--mode'] ?? 'dry';
  requireValue(mode !== 'cloud', 'PAID_EXECUTION_SUPERSEDED');
  const historicalMock = mode === 'mock';
  const passes = Number(options['--passes'] ?? (historicalMock ? 2 : 1)), maxUsd = Number(options['--max-usd'] ?? (historicalMock ? 1 : 0));
  requireValue(['dry', 'mock', 'mock-free', 'free'].includes(mode) && (historicalMock
    ? [1, 2].includes(passes) && maxUsd > 0 && maxUsd <= 1 : passes === 1 && maxUsd === 0), 'RUN_SCOPE_INVALID');
  const root = fileURLToPath(new URL('../../', import.meta.url)), bundle = sourceBundle(root), corpus = loadCases();
  if (mode === 'dry') {
    console.log(JSON.stringify({ mode, realCalls: 0, corpusSha256: corpus.corpusSha256, sourceBundleSha256: bundle.sha256,
      project: freeProject, model: 'gemini-3.8-flash', fullCorpusCases: corpus.cases.length,
      selection: freeSelection, selectionSha256: freeSelectionSha256, cases: 8, passes: 1,
      maxGenerationRequests: 8, maxCountRequests: 8, minimumRequestSpacingMs: freeMinimumSpacingMs, maxUsd: 0,
      authorization: 'Not granted by dry run. Verified Free/billing-disabled project and restricted protected key required. Paid execution superseded.' }, null, 2));
    return;
  }
  requireValue(options['--out'], 'PRIVATE_OUTPUT_REQUIRED');
  const now = new Date().toISOString();
  let authorization, secret, http, verifyExternal = () => {};
  if (mode === 'free') {
    requireValue(options['--allow-cloud'] === 'true' && options['--authorization'] &&
      /^[a-f0-9]{64}$/.test(options['--authorization-sha256'] ?? '') && options['--key-file'] &&
      options['--passes'] === '1' && options['--max-usd'] === '0', 'EXPLICIT_FREE_AUTHORIZATION_REQUIRED');
    requireValue(!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), 'CLEAN_SOURCE_REQUIRED');
    const privateBytes = path => {
      const absolute = resolve(path), stat = lstatSync(absolute);
      requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0 &&
        realpathSync(absolute) === absolute && outsideRepository(realpathSync(root), absolute), 'PRIVATE_AUTH_OR_KEY_FILE_REQUIRED');
      return readFileSync(absolute);
    };
    const authorizationBytes = privateBytes(options['--authorization']);
    requireValue(sha256(authorizationBytes) === options['--authorization-sha256'], 'AUTHORIZATION_FILE_CHANGED');
    authorization = JSON.parse(authorizationBytes);
    validateFreeAuthorization(authorization, { corpusSha256: corpus.corpusSha256, sourceBundleSha256: bundle.sha256, passes, maxUsd, now });
    // Only this protected server file is read, after all non-credential guards.
    const keyBytes = privateBytes(options['--key-file']);
    requireValue(sha256(keyBytes) === authorization.credentialFileSha256, 'KEY_FILE_BINDING_MISMATCH');
    secret = keyBytes.toString('utf8').trim();
    http = createGeminiHttp(secret, fetch);
    requireValue(!JSON.stringify(authorization).includes(secret), 'CREDENTIAL_IN_AUTHORIZATION_FILE');
    verifyExternal = () => {
      requireValue(sha256(privateBytes(options['--authorization'])) === options['--authorization-sha256'], 'AUTHORIZATION_FILE_CHANGED');
      requireValue(sha256(privateBytes(options['--key-file'])) === authorization.credentialFileSha256, 'KEY_FILE_BINDING_MISMATCH');
      requireValue(sourceBundle(root).sha256 === bundle.sha256, 'SOURCE_BUNDLE_CHANGED');
    };
  } else {
    requireValue(!options['--allow-cloud'] && !options['--authorization'] && !options['--authorization-sha256'] && !options['--key-file'], 'MOCK_CANNOT_USE_CLOUD_AUTHORIZATION');
    authorization = mode === 'mock-free' ? mockFreeAuthorization(corpus.corpusSha256, bundle.sha256, now)
      : mockAuthorization(corpus.corpusSha256, bundle.sha256, now, passes);
    http = async request => request.url.endsWith(':countTokens') ? Response.json({ totalTokens: 512 }) : Response.json({
      modelVersion: 'gemini-3.8-flash-mock-only', candidates: [{ finishReason: 'STOP', content: { role: 'model',
        parts: [{ text: '{"schemaVersion":"ai_assistant_message_v1","message":"MOCK ONLY; no semantic acceptance."}' }] } }],
      usageMetadata: { promptTokenCount: 512, candidatesTokenCount: 20, thoughtsTokenCount: 12, totalTokenCount: 544 } });
  }
  const output = createPrivateOutput(root, options['--out']), cancellation = new AbortController();
  if (mode === 'free') claimCloudAuthorization(
    resolve(homedir(), '.local/state/enmori-ai-companion-20261025/runtime/cloud-authorizations'), authorization);
  const cancel = () => cancellation.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  try {
    output.save('source-manifest.json', { sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      sourceDirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0,
      nodeVersion: process.versions.node, bundle });
    let fakeTime = 0;
    const report = await runSyntheticCloud({ mode: mode === 'free' ? 'free' : 'mock', authorization, passes, maxUsd, sourceBundleSha256: bundle.sha256,
      http, secret, verifyExternal, signal: cancellation.signal, save: output.save,
      ...(mode === 'mock-free' ? { monotonicNow: () => fakeTime, wait: async ms => { fakeTime += ms; } } : {}) });
    output.save('report.json', report);
    output.save('review-template.json', blankReview(sha256(JSON.stringify(report, null, 2) + '\n'), report.rows));
    console.log(JSON.stringify({ mode, output: output.path, cases: report.rows.length, budget: report.budget,
      realGenerationCalls: report.realGenerationCalls, realCountCalls: report.realCountCalls,
      stopReason: report.stopReason, semanticReview: 'unreviewed; QA required' }));
    if (report.stopReason !== 'case-budget-exhausted') process.exitCode = 2;
  } finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
}
main().catch(error => { console.error(JSON.stringify({ status: 'not-completed', code: safeErrorCode(error) })); process.exitCode = 2; });
