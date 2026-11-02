// Focused cloud quota tests using the existing isolated demo-project workflow.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
assert.equal(process.version, 'v24.19.0');
const run = (program, args, env) => new Promise((done, reject) => {
  const child = spawn(program, args, { env, stdio: 'inherit', windowsHide: true });
  child.on('error', reject); child.on('exit', code => code === 0 ? done() : reject(new Error(`Test child exited ${code}`)));
});
const mode = process.argv[2] ?? '--backend';
assert.ok(['--backend', '--backend-child'].includes(mode));
if (mode === '--backend-child') {
  const env = buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  await run(process.execPath, ['--test', '--test-concurrency=1', 'backend/dist/emulator-test/cloud-quota.integration.test.js',
    'backend/dist/emulator-test/openai-cost-budget.integration.test.js'], env);
} else {
  for (const port of [8080, 9099]) await new Promise((done, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(done));
  });
  const directory = mkdtempSync(join(tmpdir(), 'enmori-cloud-quota-')), parent = realpathSync(tmpdir());
  try {
    const env = buildControlledEmulatorTestEnvironment({ ...process.env,
      GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    }, directory);
    env.CI = 'true'; env.FIREBASE_CLI_DISABLE_USAGE = 'true';
    if (process.env.FIREBASE_EMULATORS_PATH) env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
    const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
    const command = `${quote(process.execPath)} ${quote(resolve('tool/run_cloud_quota_emulators.mjs'))} --backend-child`;
    await run(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec',
      '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore', '--config', 'firebase.json', '--non-interactive', command], env);
  } finally {
    const child = relative(parent, realpathSync(directory));
    assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
