/** Retained Auth/Firestore core environment. No reset, model call or cleanup API. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, lstatSync, writeFileSync, unlinkSync, openSync, closeSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { quoteFixedWorkerCommand } from './zhou_real_model_store_probe.mjs';

const phoneMode = process.argv[3] === '--phone';
const extras = process.argv.slice(4);
assert((extras.length === 0 || phoneMode) && extras.every(value => ['--events', '--ai'].includes(value)) && new Set(extras).size === extras.length, 'Invalid retained core arguments');
const authPort = phoneMode ? 9099 : 9098;
const directory = resolve(process.argv[2] ?? '');
assert(process.argv[2] && directory !== process.cwd(), 'Supply a private data directory outside the repository');
assert(!directory.startsWith(process.cwd() + '/'), 'Runtime data must stay outside the repository');
assert.equal(process.versions.node, '24.19.0');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const stat = lstatSync(directory);
assert.equal(realpathSync(directory), directory, 'Data directory must not traverse symlinks');
assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'Data directory must be private');
const marker = join(directory, 'enmori-retained-core-v1');
if (!existsSync(marker)) {
  assert.equal(readdirSync(directory).length, 0, 'Use an empty dedicated directory; existing data is never adopted automatically');
  writeFileSync(marker, 'ENMORI retained core v1\n', { flag: 'wx', mode: 0o600 });
}
const lock = join(directory, 'running.lock');
writeFileSync(lock, JSON.stringify({ pid: process.pid, startTicks: readFileSync(`/proc/${process.pid}/stat`, 'utf8').split(') ').at(-1).split(' ')[19], bootId: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() }), { flag: 'wx', mode: 0o600 });
const stop = join(directory, 'stop-requested');
let child;
let exportConfirmed = false;
try {
  for (const port of [authPort, 8088, 4408, 4508, 9158, 9380]) {
    await new Promise((done, reject) => {
      const server = createServer(); server.once('error', reject);
      server.listen(port, '127.0.0.1', () => server.close(done));
    });
  }
  if (phoneMode) writeFileSync(join(directory, 'phone-ready.json'), JSON.stringify({ ready: false, reason: 'starting' }), { mode: 0o600 });
  const profile = join(directory, 'credential-profile');
  mkdirSync(profile, { recursive: true, mode: 0o700 });
  if (existsSync(stop)) unlinkSync(stop);
  const config = join(directory, 'firebase.json');
  writeFileSync(config, JSON.stringify({ firestore: { indexes: resolve('firestore.indexes.json') }, emulators: {
    auth: { host: '127.0.0.1', port: authPort }, firestore: { host: '127.0.0.1', port: 8088, websocketPort: 9158 },
    hub: { host: '127.0.0.1', port: 4408 }, logging: { host: '127.0.0.1', port: 4508 },
    ui: { enabled: false }, singleProjectMode: true,
  } }), { mode: 0o600 });
  const snapshot = join(directory, 'snapshot');
  if (existsSync(snapshot)) assert(existsSync(join(snapshot, 'firebase-export-metadata.json')), 'Incomplete snapshot: preserve and investigate');
  const env = buildControlledEmulatorTestEnvironment({ ...process.env, GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
    GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8088' }, profile);
  env.CI = 'true'; env.FIREBASE_CLI_DISABLE_USAGE = 'true';
  env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
  env.ENMORI_RETAINED_CORE_DIRECTORY = directory;
  env.ENMORI_RETAINED_CORE_VERIFY = process.argv[3] ?? '';
  env.ENMORI_RETAINED_CORE_EVENTS = extras.includes('--events') ? 'true' : 'false';
  env.ENMORI_RETAINED_CORE_AI = extras.includes('--ai') ? 'true' : 'false';
  const args = [resolve('node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--project', 'demo-enmori-rmvp01a-r10',
    '--only', 'auth,firestore', '--config', config, '--non-interactive', `--export-on-exit=${snapshot}`,
    ...(existsSync(snapshot) ? [`--import=${snapshot}`] : []),
    quoteFixedWorkerCommand(process.execPath, resolve('tool/retained_core_worker.mjs'))];
  const onSignal = () => writeFileSync(stop, '', { mode: 0o600 });
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  const log = openSync(join(directory, 'runtime-private.log'), 'a', 0o600);
  child = spawn(process.execPath, args, { env, detached: true, stdio: ['ignore', log, log] });
  closeSync(log);
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
  process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
  assert.equal(code, 0, 'Core process or export failed; preserve the data directory');
  assert(existsSync(join(snapshot, 'firebase-export-metadata.json')), 'Snapshot was not confirmed');
  exportConfirmed = true;
  console.log('Core stopped; Auth and Firestore snapshot retained.');
} finally {
  writeFileSync(join(directory, 'phone-ready.json'), JSON.stringify({ ready: false }), { mode: 0o600 });
  writeFileSync(join(directory, 'last-stop.json'), JSON.stringify({ stoppedAt: new Date().toISOString(), exportConfirmed }), { mode: 0o600 });
  unlinkSync(lock);
}
