import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createPrivateOutput } from './private-output.mjs';
import { loadCases, priceSnapshot, blankReview, sha256 } from './evaluation.mjs';
import { mockAuthorization, validateCloudAuthorization } from './cloud-budget.mjs';
import { sourceBundle, createGeminiHttp, runSyntheticCloud, safeErrorCode, claimCloudAuthorization } from './cloud-runner.mjs';

const requireValue = (condition, code) => { if (!condition) throw Error(code); };
async function main() {
  requireValue(process.versions.node === '24.19.0', 'PINNED_NODE_REQUIRED');
  const options = {}, args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    requireValue(['--mode', '--out', '--authorization', '--allow-cloud', '--passes', '--max-usd'].includes(args[i]) &&
      args[i + 1] && !options[args[i]], 'ARGUMENTS_INVALID');
    options[args[i]] = args[i + 1];
  }
  const mode = options['--mode'] ?? 'dry', passes = Number(options['--passes'] ?? 2), maxUsd = Number(options['--max-usd'] ?? 1);
  requireValue(['dry', 'mock', 'cloud'].includes(mode) && [1, 2].includes(passes) && maxUsd > 0 && maxUsd <= 1, 'RUN_SCOPE_INVALID');
  const root = fileURLToPath(new URL('../../', import.meta.url)), bundle = sourceBundle(root), corpus = loadCases();
  if (mode === 'dry') {
    console.log(JSON.stringify({ mode, realCalls: 0, corpusSha256: corpus.corpusSha256, sourceBundleSha256: bundle.sha256,
      cases: corpus.cases.length, passes, maxGenerationRequests: passes * 32, maxCountRequests: passes * 32,
      maximumTokenEstimateUsd: passes * 32 * 0.013824, maxUsd, priceSnapshot,
      authorization: 'Not granted by this dry run; LI decision and eligible paid project required' }, null, 2));
    return;
  }
  requireValue(options['--out'], 'PRIVATE_OUTPUT_REQUIRED');
  const now = new Date().toISOString();
  let authorization, secret, http;
  if (mode === 'cloud') {
    requireValue(options['--allow-cloud'] === 'true' && options['--authorization'] &&
      options['--passes'] && options['--max-usd'], 'EXPLICIT_CLOUD_AUTHORIZATION_REQUIRED');
    authorization = JSON.parse(readFileSync(options['--authorization'], 'utf8'));
    validateCloudAuthorization(authorization, { corpusSha256: corpus.corpusSha256, sourceBundleSha256: bundle.sha256, passes, maxUsd, now });
    // Sole permitted credential source, only after explicit authorization checks.
    secret = process.env.ENMORI_SYNTHETIC_GEMINI_API_KEY;
    http = createGeminiHttp(secret, fetch);
    requireValue(!JSON.stringify(authorization).includes(secret), 'CREDENTIAL_IN_AUTHORIZATION_FILE');
  } else {
    requireValue(!options['--allow-cloud'] && !options['--authorization'], 'MOCK_CANNOT_USE_CLOUD_AUTHORIZATION');
    authorization = mockAuthorization(corpus.corpusSha256, bundle.sha256, now, passes);
    http = async request => request.url.endsWith(':countTokens') ? Response.json({ totalTokens: 512 }) : Response.json({
      modelVersion: 'gemini-3.8-flash-mock-only', candidates: [{ finishReason: 'STOP', content: { role: 'model',
        parts: [{ text: '{"schemaVersion":"ai_assistant_message_v1","message":"MOCK ONLY; no semantic acceptance."}' }] } }],
      usageMetadata: { promptTokenCount: 512, candidatesTokenCount: 20, thoughtsTokenCount: 12, totalTokenCount: 544 } });
  }
  const output = createPrivateOutput(root, options['--out']), cancellation = new AbortController();
  if (mode === 'cloud') claimCloudAuthorization(
    resolve(homedir(), '.local/state/enmori-ai-companion-20261025/runtime/cloud-authorizations'), authorization);
  const cancel = () => cancellation.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  try {
    output.save('source-manifest.json', { sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      sourceDirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0,
      nodeVersion: process.versions.node, bundle });
    const report = await runSyntheticCloud({ mode, authorization, passes, maxUsd, sourceBundleSha256: bundle.sha256,
      http, secret, signal: cancellation.signal, save: output.save });
    output.save('report.json', report);
    output.save('review-template.json', blankReview(sha256(JSON.stringify(report, null, 2) + '\n'), report.rows));
    console.log(JSON.stringify({ mode, output: output.path, cases: report.rows.length, budget: report.budget,
      realGenerationCalls: report.realGenerationCalls, realCountCalls: report.realCountCalls,
      stopReason: report.stopReason, semanticReview: 'unreviewed; QA required' }));
    if (report.stopReason !== 'case-budget-exhausted') process.exitCode = 2;
  } finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
}
main().catch(error => { console.error(JSON.stringify({ status: 'not-completed', code: safeErrorCode(error) })); process.exitCode = 2; });
