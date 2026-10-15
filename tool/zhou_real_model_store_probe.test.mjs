import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateZhouModelConfiguration, quoteFixedWorkerCommand, isPositiveZhouModelStoreReport } from './zhou_real_model_store_probe.mjs';

const configuration = () => ({controlledHostVerified: true, existingHostGenerationLeaseSettled: true, binding: {endpoint: 'http://127.0.0.1:11434',
  reference: 'synthetic-existing-host:9b', manifestDigest: '1'.repeat(64), tokenizerDigest: '2'.repeat(64),
  ollamaVersion: '0.0.0-test', mode: 'formal-9b'}, tokenizerFiles: {manifestDigest: '1'.repeat(64), tokenizerSha256: '2'.repeat(64)}});

test('operator configuration binds the existing formal loopback model and matching tokenizer before any contact', () => {
  assert.equal(validateZhouModelConfiguration(configuration()).binding.mode, 'formal-9b');
  for (const alter of [c => {c.controlledHostVerified = false;}, c => {c.existingHostGenerationLeaseSettled = false;},
    c => {delete c.existingHostGenerationLeaseSettled;}, c => {c.binding.mode = 'manual-development-4b';},
    c => {c.binding.endpoint = 'http://10.0.0.1:11434';}, c => {c.binding.endpoint = 'http://127.0.0.1:11434/?key=x';},
    c => {c.binding.endpoint = 'http://user:secret@127.0.0.1:11434';}, c => {c.tokenizerFiles.tokenizerSha256 = '3'.repeat(64);},
    c => {c.binding.manifestDigest = 'mutable-tag';}, c => {c.extra = 'unknown';}]) {
    const value = configuration(); alter(value); assert.throws(() => validateZhouModelConfiguration(value));
  }
});

test('only complete accepted store evidence plus one stopped model invocation and confirmed fixture cleanup can pass', () => {
  const row = {schemaVersion: 1, scope: 'owned-empty-note-auth-persona-http-firestore', result: 'accepted', modelAttempts: 1,
    completeInputGatePassed: true, personaCrudAndSelectionPassed: true, ordinaryOutcomeAndHistoryPassed: true,
    canonicalUserMetadataConfirmed: true, assistantAnchorConfirmed: true, rejectedHasNoAssistantOrProvenance: false,
    physicalConversationCleanupPassed: true};
  const observed = {modelPosts: 1, adapterState: 'stopped', fixtureCleanupConfirmed: true};
  assert.equal(isPositiveZhouModelStoreReport(row, observed), true);
  for (const field of ['completeInputGatePassed', 'personaCrudAndSelectionPassed', 'ordinaryOutcomeAndHistoryPassed',
    'canonicalUserMetadataConfirmed', 'assistantAnchorConfirmed', 'physicalConversationCleanupPassed']) {
    assert.equal(isPositiveZhouModelStoreReport({...row, [field]: false}, observed), false);
  }
  for (const change of [{modelPosts: 0}, {modelPosts: 2}, {adapterState: 'termination_unconfirmed'}, {fixtureCleanupConfirmed: false}]) {
    assert.equal(isPositiveZhouModelStoreReport(row, {...observed, ...change}), false);
  }
  assert.equal(isPositiveZhouModelStoreReport({...row, result: 'rejected'}, observed), false);
  assert.equal(isPositiveZhouModelStoreReport(undefined, observed), false);
});

test('optional mobile handoff admits only explicit USB and existing absolute tooling/certificate paths', () => {
  const value = configuration();
  value.mobile = {serial: 'SYNTHETIC123', adb: resolve('adb'), aapt: resolve('aapt'), apksigner: resolve('apksigner'),
    flutterDart: resolve('dart'), flutterSnapshot: resolve('flutter.snapshot'), apkPath: resolve('build/app/outputs/flutter-apk/app-debug.apk'),
    certificatePath: resolve('private-certificate.pem'), keyPath: resolve('private-key.pem')};
  assert.equal(validateZhouModelConfiguration(value).mobile.serial, 'SYNTHETIC123');
  for (const alter of [c => {c.mobile.adb = 'relative';}, c => {c.mobile.serial = '127.0.0.1:5555';},
    c => {c.mobile.extra = 'unknown';}, c => {c.existingHostGenerationLeaseSettled = false;},
    c => {c.mobile.apksigner = {program: resolve('java'), args: ['-jar', 'relative']};}]) {
    const candidate = structuredClone(value); alter(candidate); assert.throws(() => validateZhouModelConfiguration(candidate));
  }
});

test('the Emulator shell command admits only fixed absolute executable/script paths and excludes shell expansion', () => {
  assert.match(quoteFixedWorkerCommand(resolve('node'), resolve('tool/zhou_real_model_store_probe.mjs')), / --worker$/u);
  for (const path of ['relative', '/tmp/node$(echo unsafe)', '/tmp/node`unsafe`', '/tmp/node"unsafe', '/tmp/node\nunsafe']) {
    assert.throws(() => quoteFixedWorkerCommand(path, resolve('tool/zhou_real_model_store_probe.mjs')));
  }
});

test('negative CLI configuration publishes only a safe blocked record without private stdin or SDK diagnostics', () => {
  const secret = 'synthetic-private-marker-never-print';
  const child = spawnSync(process.execPath, [resolve('tool/zhou_real_model_store_probe.mjs'), '--unsupported'],
    {input: secret, encoding: 'utf8', windowsHide: true});
  assert.equal(child.status, 1); assert.equal(child.stderr, '');
  const record = JSON.parse(child.stdout);
  assert.equal(record.kind, 'zhou-model-store-report'); assert.equal(record.status, 'Blocked');
  assert.equal(record.actualModelStorePass, false); assert.equal(child.stdout.includes(secret), false);
});
