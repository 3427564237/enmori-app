// PC13 only: guarded local Auth/Firestore + Android, never a cloud runtime.
// Requires the pinned Backend build, locked dependencies and an attached target.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

assert.equal(process.version, 'v24.19.0', 'Use the pinned Backend runtime');
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const childMode = ['--android-child', '--smoke-child'].includes(process.argv[2]);
const smoke = ['--fixture-smoke', '--smoke-child'].includes(process.argv[2]);
const serial = process.argv[childMode ? 3 : 2];
// Alphanumeric USB identifiers only; network/adb-shell expressions are rejected.
if (!smoke) assert.match(serial ?? '', /^(?:emulator-[0-9]{1,5}|[A-Za-z0-9]{6,64})$/, 'An attached USB Android device or Emulator serial is required');
const forwarded = ['ENMORI_TEST_FLUTTER_DART', 'ENMORI_TEST_FLUTTER_SNAPSHOT', 'ENMORI_TEST_OPENSSL', 'ANDROID_HOME', 'PUB_CACHE', 'GRADLE_USER_HOME', 'JAVA_HOME'];
const run = (program, args, env, cwd = repository) => new Promise((done, reject) => {
  const child = spawn(program, args, { env, cwd, stdio: 'inherit', windowsHide: true });
  child.once('error', reject);
  child.once('exit', code => code === 0 ? done() : reject(new Error(`Test child exited ${code}`)));
});
const copyToolchain = env => {
  for (const name of forwarded) if (process.env[name]) env[name] = process.env[name];
  // The filtered child also needs invocation-scoped Flutter/Dart opt-out.
  env.CI = 'true';
  env.DASH__SUPPRESS_ANALYTICS = 'true';
  return env;
};

if (childMode) {
  const env = copyToolchain(buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY));
  await run(process.execPath, [join(repository, 'tool/persona_android_fixture.mjs'), smoke ? '--smoke' : serial], env);
} else {
  // The caller chooses an already-existing local drafts directory. No secrets or
  // temporary test identities are written inside the formal source checkout.
  assert.ok(process.env.ENMORI_TEST_TEMP_PARENT, 'Set ENMORI_TEST_TEMP_PARENT to the local drafts directory');
  const parent = realpathSync(process.env.ENMORI_TEST_TEMP_PARENT);
  assert.ok(isAbsolute(parent));
  const repositoryRelative = relative(repository, parent);
  assert.ok(repositoryRelative.startsWith('..') || isAbsolute(repositoryRelative), 'The temporary profile must be outside the source checkout');
  if (!smoke) for (const name of ['ENMORI_TEST_FLUTTER_DART', 'ENMORI_TEST_FLUTTER_SNAPSHOT', 'ANDROID_HOME']) assert.ok(process.env[name], `${name} is required`);
  for (const port of [8080, 9099]) {
    await new Promise((done, reject) => {
      const server = createServer();
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => server.close(done));
    });
  }
  const directory = mkdtempSync(join(parent, 'persona-android-'));
  try {
    const env = copyToolchain(buildControlledEmulatorTestEnvironment({ ...process.env,
      GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    }, directory));
    env.CI = 'true';
    env.FIREBASE_CLI_DISABLE_USAGE = 'true';
    env.TEMP = directory; env.TMP = directory; env.TMPDIR = directory;
    if (process.env.FIREBASE_EMULATORS_PATH) env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
    const script = fileURLToPath(import.meta.url);
    for (const value of [process.execPath, script]) assert.equal(/["\r\n]/.test(value), false);
    const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;
    const argumentsText = smoke ? '--smoke-child' : `--android-child ${serial}`;
    const command = process.platform === 'win32'
      ? `"${process.execPath}" "${script}" ${argumentsText}`
      : `${shellQuote(process.execPath)} ${shellQuote(script)} ${argumentsText}`;
    await run(process.execPath, [join(repository, 'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec',
      '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore', '--config', join(repository, 'firebase.json'), '--non-interactive', command], env, directory);
  } finally {
    const child = relative(parent, realpathSync(directory));
    assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
