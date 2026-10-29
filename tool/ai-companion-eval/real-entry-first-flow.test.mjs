import assert from 'node:assert/strict';
import test from 'node:test';
import * as retained from '../../backend/dist/src/bootstrap/retained-core-runtime.js';

// Execute the actual entry module with every external effect replaced. Never
// open a listener, read a credential/account, acquire a real lock or call a model.
let sequence = 0;
const owner = '00000000-0000-4000-8000-000000000001';
async function entry(t, firstFlow, fullFeatures = true) {
  const calls = { remote: [], core: 0, locks: 0, reads: [], writes: [], listening: [], closed: 0 };
  const configPath = '/synthetic-private/local-backend.json';
  const config = { projectId: 'enmori-rmvp-controlled', host: '127.0.0.1', port: 9381,
    verificationEmail: 'synthetic@example.invalid', keyPath: '/synthetic-private/key',
    certificatePath: '/synthetic-private/cert', fullFeatures,
    ...(firstFlow === undefined ? {} : { firstFlow }) };
  const previousArgv = process.argv, previousExitCode = process.exitCode;
  process.argv = [process.execPath, 'tool/run_real_account_local.mjs', configPath];
  process.exitCode = undefined;
  t.after(() => { process.argv = previousArgv; process.exitCode = previousExitCode; });
  const mockModule = (specifier, exports) => t.mock.module(specifier, { exports });
  mockModule('node:fs', {
    lstatSync: path => ({ uid: process.getuid(), mode: 0o600, isSymbolicLink: () => false,
      isDirectory: () => path === '/synthetic-private', isFile: () => path !== '/synthetic-private' }),
    realpathSync: path => path,
    readFileSync: path => {
      calls.reads.push(path);
      if (path === configPath) return JSON.stringify(config);
      if (path === config.keyPath || path === config.certificatePath) return 'synthetic-only';
      throw Error('Unexpected file read');
    },
    writeFileSync: (path, body) => calls.writes.push({ path, body: JSON.parse(body) }),
  });
  mockModule('node:crypto', { X509Certificate: class {
    validFrom = '2020-01-01T00:00:00.000Z'; validTo = '2100-01-01T00:00:00.000Z';
    checkIP = value => value;
  } });
  const server = () => ({ listening: false, once() {},
    listen(port, host, done) { this.listening = true; calls.listening.push({ port, host }); done(); },
    close(done) { this.listening = false; done(); } });
  mockModule('node:https', { createServer: server });
  mockModule('node:http', { createServer: server });
  mockModule('firebase-admin/auth', { getAuth: () => ({
    getUserByEmail: async () => ({ uid: 'synthetic-owner', emailVerified: true }),
    verifyIdToken: async () => { throw Error('No request permitted'); },
  }) });
  mockModule('firebase-admin/firestore', { getFirestore: () => ({ doc: path => ({ get: async () => ({
    exists: true, data: () => path.startsWith('interest_tags/')
      ? { displayName: 'Music', lifecycleState: 'active' } : {},
  }) }) }) });
  mockModule(new URL('../retained_core_events.mjs', import.meta.url), { retainedCoreEvents: () => ({
    configuration: 'configured', input: { source: {}, musicInterestTagId: 'synthetic-music' },
  }) });
  mockModule(new URL('../real_account_lock.mjs', import.meta.url), { acquireRealAccountLock: () => {
    calls.locks++; return { release() {} };
  } });
  mockModule(new URL('../../backend/dist/src/shared/infrastructure/firebase/firestore-records.js', import.meta.url), {
    createAuthBindingDocumentId: () => 'synthetic-binding', FIRESTORE_COLLECTIONS: { authBindings: 'auth_bindings' },
  });
  const runtime = { firebaseApp: {}, app: { routing() { throw Error('No HTTP request permitted'); } },
    eventBrowseControl: { enable() {}, observation: () => ({ enabled: true }) }, aiStatus: () => ({ available: true }) };
  mockModule(new URL('../../backend/dist/src/bootstrap/retained-core-runtime.js', import.meta.url), {
    parseLocalFirstFlowConfiguration: retained.parseLocalFirstFlowConfiguration,
    createRemoteGroupRuntime: async (...args) => { calls.remote.push(args); return runtime; },
    closeControlledRuntime: async () => { calls.closed++; },
  });
  mockModule(new URL('../../backend/dist/src/bootstrap/controlled-runtime.js', import.meta.url), {
    createControlledRuntime: async () => { calls.core++; return runtime; }, closeControlledRuntime: async () => { calls.closed++; },
  });
  const once = process.once;
  t.mock.method(process, 'once', function(event, callback) {
    if (event === 'SIGTERM') { queueMicrotask(callback); return this; }
    if (event === 'SIGINT') return this;
    return once.call(this, event, callback);
  });
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => { throw Error('Network forbidden'); });
  await import(new URL(`../run_real_account_local.mjs?first-flow-test=${sequence++}`, import.meta.url));
  return { ...calls, exitCode: process.exitCode };
}

test('actual real entry forwards the explicit local-only first-flow scope and bounded worker', async t => {
  const firstFlow = { ownerAccountId: owner, firebaseUid: 'synthetic-owner', worker: { endsAtMs: Date.now() + 300000 } };
  const run = await entry(t, firstFlow);
  assert.equal(run.exitCode, undefined);
  assert.equal(run.remote.length, 1);
  assert.equal(run.remote[0][2], 'qwen3.5:9b');
  assert.deepEqual(run.remote[0][3], firstFlow);
  assert.equal(run.remote[0][3].push, undefined);
  assert.equal(run.closed, 1);
  assert.deepEqual(run.listening, [{ host: '127.0.0.1', port: 9381 }]);
  assert(!JSON.stringify(run.writes).includes('synthetic-owner'));
});

test('existing real entry without firstFlow keeps companion construction off', async t => {
  const run = await entry(t, undefined);
  assert.equal(run.exitCode, undefined);
  assert.equal(run.remote.length, 1);
  assert.equal(run.remote[0][3], undefined);
});

test('malformed push configuration fails before credential, lock, runtime and listener work', async t => {
  const run = await entry(t, { ownerAccountId: owner, firebaseUid: 'synthetic-owner', push: { installationRef: owner } });
  assert.equal(run.exitCode, 1);
  assert.deepEqual(run.reads, ['/synthetic-private/local-backend.json']);
  assert.equal(run.locks, 0);
  assert.equal(run.remote.length + run.core, 0);
  assert.equal(run.listening.length + run.writes.length, 0);
});

test('actual entry forwards explicit service-mode push and reports configuration without claiming delivery', async t => {
  const firstFlow = {ownerAccountId:owner,firebaseUid:'synthetic-owner',worker:{mode:'service'},
    push:{installationRef:owner,leaseDurationMs:30*86400000}};
  const run = await entry(t,firstFlow);
  assert.equal(run.exitCode,undefined);
  assert.deepEqual(run.remote[0][3],firstFlow);
  const state=run.writes.find(w=>w.body.phase==='listening').body.firstFlow;
  assert.equal(state.pushConfigured,true);
  assert.equal(state.workerConfigured,true);
  assert.equal(Object.hasOwn(state,'delivered'),false);
});

test('firstFlow cannot silently disappear behind fullFeatures false', async t => {
  const run = await entry(t, { ownerAccountId: owner, firebaseUid: 'synthetic-owner' }, false);
  assert.equal(run.exitCode, 1);
  assert.equal(run.locks, 0);
  assert.equal(run.remote.length + run.core, 0);
});
