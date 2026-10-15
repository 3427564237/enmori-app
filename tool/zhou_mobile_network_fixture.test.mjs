import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { resolve } from 'node:path';
import test from 'node:test';
import { expectedZhouMobileApkPath, runZhouMobileNetworkFixture } from './zhou_mobile_network_fixture.mjs';

// Orchestration doubles only: no Android, Firebase, TLS socket or model execution.
class Child extends EventEmitter {
  constructor() {
    super(); this.pid = 100; this.stdout = new PassThrough(); this.stderr = new PassThrough(); this.stdin = new PassThrough(); this.exited = false;
  }
  finish(code, output = '') {
    if (this.exited) return;
    this.exited = true; if (output) this.stdout.write(output); this.stdout.end(); this.stderr.end(); this.emit('exit', code);
  }
  kill() { setImmediate(() => this.finish(1)); return true; }
}
function setup({ conflict = false, changedMapping = false, markers = true, duplicateMarker = false, badPackage = false, failSignature = false, quarantine = false, missingLease = false, changedApk = false, abruptExit = false, failedDisposal = false, differentRunnerApk = false, missingPrebuiltApk = false, badRunnerPackage = false, badRunnerSignature = false, exitBeforeRunnerInspection = false, exitDuringDelivery = false, freshFlutterProfile = false } = {}) {
  const calls = [], phases = [], reverses = new Map([['tcp:9099', conflict ? 'tcp:12345' : 'tcp:9099']]);
  let privateReads = 0, delivered, cleaned = 0, preserved = 0, tlsClosed = 0, disposed = 0, fixtureState = { modelAttempts: 1, modelPending: quarantine ? 1 : 0, nonTerminal: 0, quarantined: quarantine };
  let androidChild;
  const fixture = {
    server: { routing() {} },
    state: () => fixtureState,
    privateChannel() { privateReads++; return { email: 'fresh-mobile@example.invalid', password: 'SyntheticNotAnActualCredential1!', idToken: 'never-forward-this-token' }; },
    ownedContentCounts: async () => ({ conversations: 0, messages: 0, sources: 0 }),
    cleanup: async () => { if (quarantine) throw Error('private vendor secret'); cleaned++; },
    closeTerminalLocalHandlesPreservingFixture: async () => { preserved++; return { fixturePreserved: true, cleanupPassed: false, operatorHold: true }; },
  };
  const options = {
    fixture, serial: 'USBTEST00001', adb: '/tools/adb', aapt: '/tools/aapt', apksigner: { program: '/tools/java', args: ['-jar', '/tools/apksigner.jar'] },
    flutterDart: '/flutter/dart', flutterSnapshot: '/flutter/flutter_tools.snapshot', apkPath: expectedZhouMobileApkPath,
    certificate: Buffer.from('-----BEGIN CERTIFICATE-----\nTEST ONLY\n-----END CERTIFICATE-----\n'), key: 'TEST ONLY KEY',
    modelBinding: { mode: 'test-double' }, existingHostGenerationLeaseSettled: missingLease ? undefined : true,
    environment: { PATH: '/owned/tools' },
    now: () => Date.parse('2026-10-15T04:00:00Z'),
    readArtifact: async path => {
      assert.equal(path, expectedZhouMobileApkPath);
      if (missingPrebuiltApk && !calls.some(call => call.args.includes('build'))) throw Error('No pre-existing APK');
      return Buffer.from(changedApk && delivered ? 'different post-test APK' :
        differentRunnerApk && calls.some(call => call.args.includes('test')) ? 'generated listener runner APK' : 'dedicated reviewed test APK');
    }, onPhase: phase => phases.push(phase),
    createHttpsServer(configuration, routing) {
      assert.equal(routing, fixture.server.routing); assert.equal(configuration.key, 'TEST ONLY KEY');
      const server = new EventEmitter();
      server.listen = (port, host, done) => { assert.equal(port, 0); assert.equal(host, '127.0.0.1'); setImmediate(done); };
      server.address = () => ({ port: 42001 });
      server.closeAllConnections = () => {};
      server.close = done => { tlsClosed++; setImmediate(done); };
      return server;
    },
    deliverConfiguration: async ({ configuration }) => {
      delivered = configuration;
      assert.equal(configuration.expiresAt, '2026-10-15T04:02:00.000Z');
      assert.equal(configuration.baseUri, 'https://127.0.0.1:42001/');
      const ownership = { dispose: async () => { disposed++; if (failedDisposal) throw Error('private failure'); return { credentialCleanupConfirmed: true }; } };
      if (exitDuringDelivery) return new Promise(done => setImmediate(() => { androidChild.finish(1); setImmediate(() => done(ownership)); }));
      return ownership;
    },
    spawnChild(program, args, childOptions) {
      calls.push({ program, args, options: childOptions });
      const child = new Child();
      setImmediate(() => {
        if (program === '/flutter/dart' && args.includes('test')) {
          androidChild = child;
          child.stdout.write('discard unrelated SDK detail and private-marker-value\n');
          if (markers) {
            child.stdout.write('ZHOU_MOBILE_RUNTIME_CONFIGURATION_REQUIRED\n');
            if (duplicateMarker) child.stdout.write('ZHOU_MOBILE_RUNTIME_CONFIGURATION_REQUIRED\n');
            if (exitBeforeRunnerInspection) { child.finish(1); return; }
            if (!exitDuringDelivery) {
              const finishAfterDelivery = () => {
                if (child.exited) return;
                if (!delivered) { setImmediate(finishAfterDelivery); return; }
                child.finish(abruptExit ? 1 : 0, abruptExit ? '' : 'ZHOU_MOBILE_AI_ACCEPTED_PERSISTED_READBACK: Pass\nZHOU_MOBILE_PERSONA_DELETE_PRESERVES_HISTORY_AND_CONVERSATION_DELETE: Pass\n');
              };
              setImmediate(finishAfterDelivery);
            }
          } else child.finish(0, 'All tests passed!\n');
          return;
        }
        let output = '', code = 0;
        if (program === '/flutter/dart' && args[0] === '--version') output = 'Dart SDK version: 3.13.2 (stable)';
        else if (program === '/flutter/dart' && args.includes('--machine')) output = JSON.stringify({ frameworkVersion: '3.47.2', dartSdkVersion: '3.13.2 (stable)' }) + (freshFlutterProfile && !calls.some(call => call.args.includes('--disable-analytics')) ? '\nFirst-run telemetry notice\n' : '');
        else if (program === '/tools/aapt' && args.includes('badging')) output = `package: name='${badPackage || badRunnerPackage && calls.some(call => call.args.includes('test')) ? 'com.enmori.app' : 'com.enmori.app.personatest'}' versionCode='1'\nlaunchable-activity: name='com.enmori.app.MainActivity'\n`;
        else if (program === '/tools/aapt' && args.includes('xmltree')) output = '  A: package="com.enmori.app.personatest"\n';
        else if (program === '/tools/java') code = failSignature || badRunnerSignature && calls.some(call => call.args.includes('test')) ? 1 : 0;
        else if (program === '/tools/adb') {
          if (args.includes('get-state')) output = 'device\n';
          else if (args.includes('force-stop')) assert.equal(args.at(-1), 'com.enmori.app.personatest');
          else if (args.includes('--list')) {
            if (changedMapping && delivered && reverses.has('tcp:42001')) reverses.set('tcp:42001', 'tcp:42002');
            output = [...reverses].map(([device, host]) => `private-transport-id ${device} ${host}`).join('\n');
          } else if (args.includes('--no-rebind')) { assert.equal(reverses.has(args.at(-2)), false); reverses.set(args.at(-2), args.at(-1)); }
          else if (args.includes('--remove')) reverses.delete(args.at(-1));
          else assert.fail('Unexpected ADB action');
        }
        child.finish(code, output);
      });
      return child;
    },
  };
  return { options, calls, phases, reverses, fixture, observation: () => ({ privateReads, delivered, cleaned, preserved, tlsClosed, disposed }), setState: value => { fixtureState = value; } };
}

test('pipeline verifies dedicated APK/signature before installation, delivers fresh runtime credentials once and removes only owned reverse', async () => {
  const state = setup(), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'passed'); assert.equal(report.actual9bJourneyPassed, false); assert.equal(report.modelMode, 'test-double');
  assert.equal(report.cleanupPassed, true); assert.equal(report.configurationMarkerCount, 1);
  assert.equal(report.credentialCleanupConfirmed, true); assert.equal(report.apkAttributionConfirmed, true);
  assert.equal(state.observation().disposed, 1);
  assert.equal(state.observation().privateReads, 1); assert.equal(state.observation().tlsClosed, 1);
  assert.equal(state.reverses.get('tcp:9099'), 'tcp:9099'); assert.equal(state.reverses.has('tcp:42001'), false);
  const installer = state.calls.findIndex(call => call.args.includes('test'));
  assert.ok(installer > state.calls.findIndex(call => call.args.includes('verify')));
  assert.equal(state.calls[installer].options.env.ENMORI_PERSONA_ANDROID_TEST, 'true');
  assert.equal(resolve(state.calls[installer].options.cwd, 'build/app/outputs/flutter-apk/app-debug.apk'), expectedZhouMobileApkPath);
  for (const call of state.calls) {
    assert.equal(call.args.some(arg => arg.includes('--dart-define')), false);
    assert.equal(JSON.stringify(call).includes('SyntheticNotAnActualCredential1!'), false);
    assert.equal(JSON.stringify(call).includes('never-forward-this-token'), false);
  }
  assert.equal(JSON.stringify(report).includes('private-marker-value'), false);
});

test('fresh isolated Flutter profile keeps version JSON clean before build or credentials', async () => {
  const state = setup({ freshFlutterProfile: true });
  const report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'passed');
  const version = state.calls.find(call => call.args.includes('--machine'));
  assert.equal(version.options.env.DASH__SUPPRESS_ANALYTICS, 'true');
  assert.ok(state.calls.findIndex(call => call.args.includes('--disable-analytics')) < state.calls.indexOf(version));
  assert.equal(state.options.environment.DASH__SUPPRESS_ANALYTICS, undefined);
  assert.equal(state.observation().privateReads, 1);
});

test('runner-generated APK differs from direct target prebuild yet remains correctly attributed', async () => {
  const state = setup({ differentRunnerApk: true }), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'passed');
  assert.notEqual(report.prebuildApkSha256, report.runnerApkSha256);
  assert.equal(report.runnerApkSha256, report.selectedApkSha256);
  assert.equal(report.postTestApkSha256, report.runnerApkSha256);
  assert.equal(state.observation().privateReads, 1);
});

test('clean checkout builds its dedicated APK safely without requiring an older APK', async () => {
  const state = setup({ differentRunnerApk: true, missingPrebuiltApk: true }), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'passed');
  assert.ok(state.calls.findIndex(call => call.args.includes('build')) < state.calls.findIndex(call => call.program === '/tools/aapt'));
});

test('stale copied APK paths and changed post-test build outputs cannot be attributed as a pass', async () => {
  const copied = setup(); copied.options.apkPath = '/owned/elsewhere/app-debug.apk';
  const copyReport = await runZhouMobileNetworkFixture(copied.options);
  assert.equal(copyReport.result, 'blocked'); assert.equal(copied.calls.length, 0);
  const changed = setup({ changedApk: true }), changedReport = await runZhouMobileNetworkFixture(changed.options);
  assert.equal(changedReport.result, 'blocked'); assert.equal(changedReport.apkAttributionConfirmed, false);
  assert.notEqual(changedReport.selectedApkSha256, changedReport.postTestApkSha256);
});

test('abrupt Flutter exit still disposes owned runtime credentials and failed disposal remains an operator hold', async () => {
  for (const failedDisposal of [false, true]) {
    const state = setup({ abruptExit: true, failedDisposal }), report = await runZhouMobileNetworkFixture(state.options);
    assert.equal(report.result, 'blocked'); assert.equal(state.observation().disposed, 1);
    assert.equal(report.credentialCleanupConfirmed, !failedDisposal);
    assert.equal(report.operatorHold, true);
    assert.ok(state.calls.some(call => call.args.includes('force-stop')));
  }
});

test('held or unknown original host generation lease prevents commands and credential access', async () => {
  const state = setup({ missingLease: true }), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'blocked'); assert.equal(report.blockedStage, 'host-generation-lease-gate');
  assert.equal(state.calls.length, 0); assert.equal(state.observation().privateReads, 0);
  assert.equal(state.observation().cleaned, 0); assert.equal(state.observation().preserved, 0);
});

test('ordinary built APK or invalid signature stops before Flutter TEST, ADB or private identity access', async () => {
  for (const selected of [{ badPackage: true }, { failSignature: true }]) {
    const state = setup(selected), report = await runZhouMobileNetworkFixture(state.options);
    assert.equal(report.result, 'blocked'); assert.equal(report.signatureVerified, false);
    assert.equal(state.calls.some(call => call.args.includes('build')), true);
    assert.equal(state.calls.some(call => call.args.includes('test') || call.program === '/tools/adb'), false);
    assert.equal(state.observation().privateReads, 0);
  }
});

test('runner package or signature is verified before any private identity or credential access', async () => {
  for (const selected of [{ badRunnerPackage: true }, { badRunnerSignature: true }]) {
    const state = setup({ ...selected, differentRunnerApk: true }), report = await runZhouMobileNetworkFixture(state.options);
    assert.equal(report.result, 'blocked'); assert.equal(report.signatureVerified, false);
    assert.equal(report.prebuildSignatureVerified, true);
    assert.equal(report.runnerApkSha256, undefined); assert.equal(report.selectedApkSha256, undefined);
    assert.equal(state.observation().privateReads, 0); assert.equal(state.observation().delivered, undefined);
  }
});

test('child exit during runner inspection prevents credentials and late delivery ownership is drained before cleanup', async () => {
  const inspecting = setup({ exitBeforeRunnerInspection: true }), inspectingReport = await runZhouMobileNetworkFixture(inspecting.options);
  assert.equal(inspectingReport.result, 'blocked'); assert.equal(inspecting.observation().privateReads, 0);
  const delivering = setup({ exitDuringDelivery: true }), deliveringReport = await runZhouMobileNetworkFixture(delivering.options);
  assert.equal(deliveringReport.result, 'blocked'); assert.equal(delivering.observation().privateReads, 1);
  assert.equal(delivering.observation().disposed, 1); assert.equal(deliveringReport.credentialCleanupConfirmed, true);
});

test('conflicting pre-existing reverse is preserved and no device test or new credential is started', async () => {
  const state = setup({ conflict: true }), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'blocked'); assert.equal(state.reverses.get('tcp:9099'), 'tcp:12345');
  assert.equal(state.calls.some(call => call.args.includes('test')), false); assert.equal(state.observation().privateReads, 0);
  assert.equal(state.observation().tlsClosed, 1);
});

test('missing or duplicated handshake markers cannot pass a successful Flutter exit', async () => {
  for (const selected of [{ markers: false }, { duplicateMarker: true }]) {
    const state = setup(selected), report = await runZhouMobileNetworkFixture(state.options);
    assert.equal(report.result, 'blocked'); assert.equal(report.deviceJourneyPassed, false);
    assert.equal(report.cleanupPassed, true);
  }
});

test('changed run-owned reverse is preserved and prevents a clean operator result', async () => {
  const state = setup({ changedMapping: true }), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'blocked'); assert.equal(report.blockedStage, 'owned-reverse-cleanup');
  assert.equal(state.reverses.get('tcp:42001'), 'tcp:42002');
});

test('terminal application with unconfirmed remote model stop preserves fixture and reports hold', async () => {
  const state = setup({ quarantine: true }), report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'blocked'); assert.equal(report.cleanupPassed, false);
  assert.equal(report.fixturePreserved, true); assert.equal(report.operatorHold, true);
  assert.equal(state.observation().preserved, 1); assert.equal(state.observation().cleaned, 0);
});

test('orchestration test seams cannot claim formal9B device evidence', async () => {
  const state = setup();
  state.options.modelBinding = { mode: 'formal-9b', controlledHostVerified: true, manifestDigest: 'a'.repeat(64), tokenizerDigest: 'b'.repeat(64) };
  const report = await runZhouMobileNetworkFixture(state.options);
  assert.equal(report.result, 'blocked'); assert.equal(report.actual9bJourneyPassed, false);
  assert.equal(state.calls.length, 0);
});
