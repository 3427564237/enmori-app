import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { validateZhouModelConfiguration, quoteFixedWorkerCommand, isPositiveZhouModelStoreReport, buildZhouProbeEnvironment, safeZhouMobileLastStage } from './zhou_real_model_store_probe.mjs';

const configuration = () => ({controlledHostVerified: true, existingHostGenerationLeaseSettled: true, binding: {endpoint: 'http://127.0.0.1:11434',
  reference: 'synthetic-existing-host:9b', manifestDigest: '1'.repeat(64), tokenizerDigest: '2'.repeat(64),
  ollamaVersion: '0.0.0-test', mode: 'formal-9b'}, tokenizerFiles: {manifestDigest: '1'.repeat(64), tokenizerSha256: '2'.repeat(64)}});

test('both isolated mobile workers retain only explicitly supplied existing toolchain paths and never host credential profiles', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'zhou-mobile-env-'));
  try {
    const host = {GCLOUD_PROJECT:'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT:'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099', FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',
      HOME:'synthetic-foreign-home', CLOUDSDK_CONFIG:'synthetic-foreign-config', FIREBASE_TOKEN:'synthetic-token'};
    for (const name of ['ANDROID_HOME','JAVA_HOME','PUB_CACHE','GRADLE_USER_HOME']) {
      host[name] = resolve(directory, name); mkdirSync(host[name]);
    }
    const outer = buildZhouProbeEnvironment(host, resolve(directory,'outer'), true);
    const inner = buildZhouProbeEnvironment(outer, resolve(directory,'inner'), true);
    for (const name of ['ANDROID_HOME','JAVA_HOME','PUB_CACHE','GRADLE_USER_HOME']) assert.equal(inner[name], realpathSync(host[name]));
    for (const name of ['HOME','APPDATA','USERPROFILE','XDG_CONFIG_HOME']) assert.equal(inner[name], resolve(directory,'inner'));
    assert.equal(inner.CLOUDSDK_CONFIG, undefined); assert.equal(inner.FIREBASE_TOKEN, undefined);
    assert.equal(buildZhouProbeEnvironment(host, resolve(directory,'model')).ANDROID_HOME, undefined);
    assert.throws(() => buildZhouProbeEnvironment({...host, ANDROID_HOME:'relative'}, resolve(directory,'bad'), true));
  } finally {
    const child = relative(realpathSync(tmpdir()), realpathSync(directory));
    assert(child && !child.startsWith('..') && !isAbsolute(child));
    rmSync(directory, {recursive:true,force:true});
  }
});

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

test('outer mobile report forwards only the allowlisted phase and never unknown diagnostic content', () => {
  assert.equal(safeZhouMobileLastStage({ mobileLastStage: 'signed_in', raw: 'synthetic-private-content' }), 'signed_in');
  for (const mobileLastStage of ['synthetic-private-content', 'ai_ready private-content', '', null, {}, ['signed_in']]) {
    assert.equal(safeZhouMobileLastStage({ mobileLastStage }), undefined);
  }
  assert.equal(safeZhouMobileLastStage(undefined), undefined);
});
