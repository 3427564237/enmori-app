// Focused isolated My Friends evidence. Reuses the approved demo project,
// loopback ports, environment filter and SDK integration_test workflow.
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
  child.on('error', reject);
  child.on('exit', code => code === 0 ? done() : reject(new Error(`Test child exited ${code}`)));
});
const mode = process.argv[2] ?? '--backend';
const androidVariables = ['ENMORI_TEST_FLUTTER_DART', 'ENMORI_TEST_FLUTTER_SNAPSHOT', 'ENMORI_TEST_OPENSSL', 'ANDROID_HOME', 'PUB_CACHE', 'GRADLE_USER_HOME', 'JAVA_HOME'];
if (mode === '--backend-child') {
  const env = buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  await run(process.execPath, ['--test', '--test-concurrency=1', 'backend/dist/emulator-test/blocker-slices.integration.test.js'], env);
} else if (mode === '--android-child') {
  const env = buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  for (const key of androidVariables) if (process.env[key]) env[key] = process.env[key];
  await run(process.execPath, [resolve('tool/my_friends_android_fixture.mjs'), process.argv[3]], env);
} else {
  assert.ok(mode === '--backend' || mode === '--android');
  if (mode === '--android') assert.match(process.argv[3] ?? '', /^emulator-\d+$/);
  for (const port of [8080, 9099]) {
    await new Promise((done, reject) => {
      const server = createServer(); server.once('error', reject);
      server.listen(port, '127.0.0.1', () => server.close(done));
    });
  }
  const directory = mkdtempSync(join(tmpdir(), 'enmori-my-friends-'));
  const parent = realpathSync(tmpdir());
  try {
    const env = buildControlledEmulatorTestEnvironment({ ...process.env,
      GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    }, directory);
    env.CI = 'true'; env.FIREBASE_CLI_DISABLE_USAGE = 'true';
    if (process.env.FIREBASE_EMULATORS_PATH) env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
    for (const key of androidVariables) if (process.env[key]) env[key] = process.env[key];
    const script = resolve('tool/run_my_friends_emulators.mjs');
    assert.equal(script.includes('"'), false);
    const args = mode === '--android' ? `--android-child ${process.argv[3]}` : '--backend-child';
    const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;
    const command = process.platform === 'win32' ? `node "${script}" ${args}` : `${shellQuote(process.execPath)} ${shellQuote(script)} ${args}`;
    await run(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec',
      '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore', '--config', 'firebase.json', '--non-interactive', command], env);
  } finally {
    const child = relative(parent, realpathSync(directory));
    assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
    rmSync(directory, { recursive: true, force: true });
  }
}
