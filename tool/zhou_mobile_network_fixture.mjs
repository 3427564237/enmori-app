// Operator-only composition around an EXISTING fresh Emulator/model fixture.
// No ordinary entrypoint, Auth provider, product API or deployment is added.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deliverMobileFixtureConfiguration } from './zhou_mobile_fixture_credentials.mjs';

const target = 'integration_test/ai_persona_network_real_backend_test.dart';
const packageId = 'com.enmori.app.personatest';
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const expectedZhouMobileApkPath = resolve(repository, 'build/app/outputs/flutter-apk/app-debug.apk');
const requested = 'ZHOU_MOBILE_RUNTIME_CONFIGURATION_REQUIRED';
const accepted = 'ZHOU_MOBILE_AI_ACCEPTED_PERSISTED_READBACK: Pass';
const finished = 'ZHOU_MOBILE_PERSONA_DELETE_PRESERVES_HISTORY_AND_CONVERSATION_DELETE: Pass';
const mobileStages = new Set(['config_consumed', 'firebase_ready', 'auth_emulator', 'harness_mounted',
  'signed_in', 'ai_ready', 'persona_created', 'persona_active', 'persona_edited', 'send_requested',
  'ai_readback', 'conversation_deleted']);
export const allowlistedZhouMobileStage = value => mobileStages.has(value) ? value : undefined;
const failure = () => new Error('ZHOU_MOBILE_NETWORK_OPERATOR_BLOCKED');
const fixed = value => typeof value === 'string' && value.length > 0 && !/[\x00\r\n]/.test(value);
const executable = value => {
  const result = typeof value === 'string' ? { program: value, args: [] } : value;
  assert.ok(result && fixed(result.program) && isAbsolute(result.program) && Array.isArray(result.args) && result.args.every(fixed));
  return result;
};

/** Run on the same controlled host as the supplied fixture and selected USB
 * device. certificate/key are existing private PC13-style PEM material, not
 * generated here. The caller owns model preflight and actual binding evidence.
 * Test seams below permit orchestration unit tests, never device/model proof. */
export async function runZhouMobileNetworkFixture({
  fixture, serial, adb, aapt, apksigner, flutterDart, flutterSnapshot, apkPath,
  certificate, key, modelBinding, existingHostGenerationLeaseSettled, environment = process.env,
  spawnChild = spawn, createHttpsServer = createServer, readArtifact = readFile,
  deliverConfiguration = deliverMobileFixtureConfiguration,
  now = Date.now, delay = ms => new Promise(done => setTimeout(done, ms)),
  onPhase = () => {}, commandTimeoutMs = 30_000, flutterTimeoutMs = 300_000,
  buildTimeoutMs = 300_000, terminalTimeoutMs = 65_000,
}) {
  // Keep all Flutter commands in the owned profile opted out of telemetry.
  const toolEnvironment = { ...environment, DASH__SUPPRESS_ANALYTICS: 'true' };
  let httpsServer, httpsListening = false, flutterChild, flutterExited = true;
  let markerCount = 0, acceptedSeen = false, finishedSeen = false, delivered = false;
  let mobileLastStage;
  let currentStage = 'preflight', blockedStage, cleanupPassed = false, fixturePreserved = false;
  let prebuildApkSha256, runnerApkSha256, selectedApkSha256;
  let prebuildSignatureVerified = false, signatureVerified = false;
  let postTestApkSha256, apkAttributionConfirmed = false;
  let disposeConfiguration, credentialCleanupConfirmed = true, androidTestAttempted = false;
  let credentialFlight, credentialFlightClosed = false;
  let hostLeaseAccepted = false;
  const createdReverses = [];
  const phase = value => { currentStage = value; try { onPhase(value); } catch { /* Diagnostics cannot own resources. */ } };
  const report = () => ({ schemaVersion: 1, scope: 'controlled-android-ai-persona-network',
    result: !blockedStage && acceptedSeen && finishedSeen && cleanupPassed ? 'passed' : 'blocked',
    blockedStage, mobileLastStage, deviceJourneyPassed: !blockedStage && acceptedSeen && finishedSeen,
    actual9bJourneyPassed: !blockedStage && acceptedSeen && finishedSeen && cleanupPassed && modelBinding?.mode === 'formal-9b',
    modelMode: modelBinding?.mode === 'formal-9b' ? 'formal-9b' : 'test-double',
    modelBindingBasis: modelBinding?.mode === 'formal-9b' ? 'caller-verified-private-binding' : 'explicit-test-double',
    runtimeConfigurationDelivered: delivered, configurationMarkerCount: markerCount,
    aiAcceptedAndReadback: acceptedSeen, personaHistoryAndDelete: finishedSeen,
    cleanupPassed, fixturePreserved, operatorHold: Boolean(blockedStage) || !cleanupPassed,
    prebuildApkSha256, runnerApkSha256, selectedApkSha256, postTestApkSha256,
    apkAttributionConfirmed, prebuildSignatureVerified, signatureVerified,
    credentialCleanupConfirmed, rawChildOutputDiscarded: true,
  });
  // Short commands retain bounded output only in memory and never print it.
  const run = (program, args, childEnvironment = toolEnvironment, timeout = commandTimeoutMs) => new Promise((done, reject) => {
    const child = spawnChild(program, args, { cwd: repository, env: childEnvironment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = '', size = 0;
    const timer = setTimeout(() => { child.kill(); reject(failure()); }, timeout);
    const end = action => { clearTimeout(timer); action(); };
    child.stdout.on('data', bytes => {
      size += bytes.length;
      if (size > 262144) { child.kill(); end(() => reject(failure())); return; }
      output += bytes.toString('utf8');
    });
    child.stderr.resume();
    child.once('error', () => end(() => reject(failure())));
    child.once('exit', code => end(() => code === 0 ? done(output) : reject(failure())));
  });
  const adbRun = args => run(adb, ['-s', serial, ...args]);
  const mappings = async () => {
    const text = (await adbRun(['reverse', '--list'])).trim();
    return text ? text.split(/\r?\n/).map(line => {
      const fields = line.trim().split(/\s+/);
      assert.equal(fields.length, 3);
      return { device: fields[1], host: fields[2] };
    }) : [];
  };
  const ensureReverse = async port => {
    const endpoint = `tcp:${port}`, existing = (await mappings()).filter(row => row.device === endpoint);
    assert.ok(existing.length <= 1);
    if (existing.length) { assert.equal(existing[0].host, endpoint); return; }
    await adbRun(['reverse', '--no-rebind', endpoint, endpoint]);
    createdReverses.push(endpoint);
  };
  const inspectApk = async (current = () => true) => {
    assert.ok(current());
    const bytes = await readArtifact(apkPath);
    assert.ok(current());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const badging = await run(aapt, ['dump', 'badging', apkPath]);
    assert.ok(current());
    assert.match(badging, /^package: name='com\.enmori\.app\.personatest'(?:\s|$)/m);
    assert.match(badging, /^launchable-activity: name='com\.enmori\.app\.MainActivity'(?:\s|$)/m);
    const manifest = await run(aapt, ['dump', 'xmltree', apkPath, 'AndroidManifest.xml']);
    assert.ok(current());
    assert.match(manifest, /^\s*A: package="com\.enmori\.app\.personatest"/m);
    const signer = executable(apksigner);
    await run(signer.program, [...signer.args, 'verify', '--verbose', apkPath]);
    assert.ok(current());
    return sha256;
  };
  try {
    // LI's original cancel-once invocation is a host-level hold. The caller must
    // verify its ACTUAL original remote settlement before even creating the
    // supplied fresh fixture; this repeated operator guard grants no new lease.
    phase('host-generation-lease-gate');
    assert.equal(existingHostGenerationLeaseSettled, true);
    hostLeaseAccepted = true;
    phase('preflight');
    assert.ok(fixture && typeof fixture.cleanup === 'function' && typeof fixture.privateChannel === 'function' && typeof fixture.state === 'function');
    assert.match(serial, /^[A-Za-z0-9]{6,64}$/); // Explicit USB target; no Android alias is inferred.
    for (const path of [adb, aapt, flutterDart, flutterSnapshot, apkPath]) assert.ok(fixed(path) && isAbsolute(path));
    const canonical = path => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);
    assert.equal(canonical(apkPath), canonical(expectedZhouMobileApkPath));
    assert.ok(certificate && key && typeof fixture.server?.routing === 'function');
    assert.ok(modelBinding?.mode === 'test-double' || (modelBinding?.mode === 'formal-9b' && modelBinding.controlledHostVerified === true &&
      /^[0-9a-f]{64}$/.test(modelBinding.manifestDigest) && /^[0-9a-f]{64}$/.test(modelBinding.tokenizerDigest)));
    if (modelBinding.mode === 'formal-9b') {
      assert.ok(spawnChild === spawn && createHttpsServer === createServer && readArtifact === readFile && deliverConfiguration === deliverMobileFixtureConfiguration);
    }
    for (const timeout of [commandTimeoutMs, buildTimeoutMs, flutterTimeoutMs, terminalTimeoutMs]) assert.ok(Number.isFinite(timeout) && timeout > 0);
    assert.match(await run(flutterDart, ['--version']), /Dart SDK version: 3\.13\.2(?:\s|\()/);
    // First-run consent text is appended even with suppression enabled.
    // Initialize only this isolated profile before strictly parsing machine JSON.
    await run(flutterDart, [flutterSnapshot, '--suppress-analytics', '--disable-analytics']);
    const flutterVersion = JSON.parse(await run(flutterDart, [flutterSnapshot, '--suppress-analytics', '--version', '--machine']));
    assert.equal(flutterVersion.frameworkVersion, '3.47.2');
    assert.match(flutterVersion.dartSdkVersion, /^3\.13\.2(?:\s|$)/);
    const flutterEnvironment = { ...toolEnvironment, ENMORI_PERSONA_ANDROID_TEST: 'true', DASH__SUPPRESS_ANALYTICS: 'true',
      GRADLE_OPTS: '-Dorg.gradle.project.kotlin.incremental=false -Dorg.gradle.project.kotlin.compiler.execution.strategy=in-process' };
    phase('dedicated-build');
    // Building cannot install an APK. A clean checkout need not contain an old
    // artifact: build the dedicated target, then inspect before Flutter TEST.
    await run(flutterDart, [flutterSnapshot, '--suppress-analytics', 'build', 'apk', '--debug', '--no-pub', '--target', target,
      '--android-project-arg=kotlin.incremental=false', '--android-project-arg=kotlin.compiler.execution.strategy=in-process'], flutterEnvironment, buildTimeoutMs);
    prebuildApkSha256 = await inspectApk();
    prebuildSignatureVerified = true;
    assert.equal((await adbRun(['get-state'])).trim(), 'device');
    phase('owned-https-and-usb');
    httpsServer = createHttpsServer({ cert: certificate, key }, fixture.server.routing);
    await new Promise((done, reject) => { httpsServer.once('error', reject); httpsServer.listen(0, '127.0.0.1', done); });
    httpsListening = true;
    const address = httpsServer.address();
    assert.ok(address && Number.isInteger(address.port) && address.port > 0 && address.port <= 65535);
    await ensureReverse(9099); await ensureReverse(address.port);
    phase('android-journey');
    await new Promise((done, reject) => {
      let pending = '', flightTimer;
      androidTestAttempted = true;
      flutterChild = spawnChild(flutterDart, [flutterSnapshot, '--suppress-analytics', 'test', target, '-d', serial,
        '--no-pub', '--no-uninstall', '--reporter', 'expanded'], { cwd: repository, env: flutterEnvironment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      flutterExited = false;
      const timer = setTimeout(() => { credentialFlightClosed = true; flutterChild.kill(); reject(failure()); }, flutterTimeoutMs);
      const fail = () => { credentialFlightClosed = true; flutterChild.kill(); clearTimeout(timer); reject(failure()); };
      const line = value => {
        // Only a fixed stage at the end of a complete Flutter log line is kept.
        // Arbitrary stdout, unknown stage names and trailing data are discarded.
        const stage = allowlistedZhouMobileStage(value.match(/(?:^|\s)ZHOU_MOBILE_STAGE: ([a-z_]+)\r?$/u)?.[1]);
        if (stage) mobileLastStage = stage;
        if (value.includes(requested)) {
          if (++markerCount !== 1) { fail(); return; }
          const current = () => !credentialFlightClosed && !flutterExited;
          credentialFlight = (async () => {
            // Flutter's integration runner builds a generated listener.dart,
            // not the direct target used by BUILD. At this mounted handshake
            // its installed runner APK is the actual default build output.
            phase('runner-apk-preflight');
            runnerApkSha256 = await inspectApk(current);
            assert.ok(current());
            selectedApkSha256 = runnerApkSha256;
            signatureVerified = true;
            phase('runner-apk-verified');
            // No identity access or credential delivery before runner proof.
            const identity = fixture.privateChannel(), issuedAt = now();
            assert.ok(current());
            credentialCleanupConfirmed = false;
            let ownership;
            try { ownership = await deliverConfiguration({ adb, serial, configuration: {
              schemaVersion: 1, projectId: 'demo-enmori-rmvp01a-r10', baseUri: `https://127.0.0.1:${address.port}/`,
              issuedAt: new Date(issuedAt).toISOString(), expiresAt: new Date(issuedAt + 120_000).toISOString(),
              email: identity.email, password: identity.password,
              certificateBase64: Buffer.from(certificate).toString('base64'),
            } }); } catch (error) { disposeConfiguration = error?.dispose; throw failure(); }
            disposeConfiguration = ownership?.dispose;
            assert.equal(typeof disposeConfiguration, 'function');
            assert.ok(current());
            delivered = true; phase('runtime-configuration-delivered');
          })();
          flightTimer = setTimeout(fail, commandTimeoutMs + 10_000);
          credentialFlight.then(() => clearTimeout(flightTimer), () => { clearTimeout(flightTimer); fail(); });
        }
        if (value.includes(accepted)) acceptedSeen = true;
        if (value.includes(finished)) finishedSeen = true;
      };
      flutterChild.stdout.on('data', bytes => {
        // Parse fixed phase markers only. No raw child text, private IDs or SDK
        // diagnostics are emitted or returned, even on process failure.
        pending += bytes.toString('utf8');
        if (pending.length > 32768) { fail(); return; }
        let newline;
        while ((newline = pending.indexOf('\n')) >= 0) { line(pending.slice(0, newline)); pending = pending.slice(newline + 1); }
      });
      flutterChild.stderr.resume();
      flutterChild.once('error', () => { flutterExited = !flutterChild.pid; fail(); });
      flutterChild.once('exit', code => {
        flutterExited = true; credentialFlightClosed = true; clearTimeout(timer); if (pending) line(pending); pending = '';
        Promise.resolve(credentialFlight).then(() => code === 0 && delivered && markerCount === 1 && acceptedSeen && finishedSeen ? done() : reject(failure()), () => reject(failure()));
      });
    });
    postTestApkSha256 = createHash('sha256').update(await readArtifact(apkPath)).digest('hex');
    assert.equal(postTestApkSha256, runnerApkSha256);
    apkAttributionConfirmed = true;
    const state = fixture.state();
    assert.equal(state.modelAttempts, 1);
    assert.equal(state.modelPending, 0);
    assert.equal(state.nonTerminal, 0);
    assert.equal(state.quarantined, false);
    assert.equal(typeof fixture.ownedContentCounts, 'function');
    assert.deepEqual(await fixture.ownedContentCounts(), { conversations: 0, messages: 0, sources: 0 });
  } catch { blockedStage = currentStage; }
  finally {
    phase('terminal-cleanup');
    if (!hostLeaseAccepted) {
      // A held/unknown ORIGINAL invocation belongs to its original operator.
      // Do not inspect, clean, close or authenticate against that fixture here.
      fixturePreserved = true;
    } else {
    credentialFlightClosed = true;
    if (!flutterExited && flutterChild) {
      flutterChild.kill();
      await new Promise(done => { const timer = setTimeout(done, commandTimeoutMs); flutterChild.once('exit', () => { clearTimeout(timer); flutterExited = true; done(); }); });
    }
    if (credentialFlight) {
      // A marker flight can still be returning an ownership capability after a
      // child/duplicate-marker failure. Drain it before disposing credentials.
      try {
        await new Promise((done, reject) => {
          const timer = setTimeout(() => reject(failure()), commandTimeoutMs + 10_000);
          credentialFlight.then(() => { clearTimeout(timer); done(); }, () => { clearTimeout(timer); done(); });
        });
      } catch { credentialCleanupConfirmed = false; blockedStage ??= 'runtime-credential-flight-unconfirmed'; }
    }
    if (flutterExited && androidTestAttempted) {
      try { await adbRun(['shell', 'am', 'force-stop', packageId]); }
      catch { blockedStage ??= 'owned-test-application-stop'; }
    }
    if (flutterExited && disposeConfiguration) {
      try {
        const disposed = await disposeConfiguration();
        credentialCleanupConfirmed = disposed?.credentialCleanupConfirmed === true;
        assert.equal(credentialCleanupConfirmed, true);
      } catch { blockedStage ??= 'owned-runtime-credential-cleanup'; }
    }
    if (!credentialCleanupConfirmed) blockedStage ??= 'owned-runtime-credential-cleanup';
    let terminal = false;
    try {
      const until = now() + terminalTimeoutMs;
      do {
        terminal = fixture.state().nonTerminal === 0;
        if (terminal || now() >= until) break;
        await delay(100);
      } while (true);
    } catch { blockedStage ??= 'terminal-observation'; }
    if (!terminal || !flutterExited) blockedStage ??= 'original-application-nonterminal';
    if (terminal && flutterExited) {
      try {
        if (httpsListening) {
          httpsServer.closeAllConnections?.();
          await new Promise((done, reject) => httpsServer.close(error => error ? reject(error) : done()));
          httpsListening = false;
        }
      } catch { blockedStage ??= 'owned-https-close'; }
      for (const endpoint of createdReverses.reverse()) {
        try {
          const existing = (await mappings()).filter(row => row.device === endpoint);
          if (existing.length === 1 && existing[0].host === endpoint) await adbRun(['reverse', '--remove', endpoint]);
          else assert.equal(existing.length, 0); // Changed caller mapping is preserved.
        } catch { blockedStage ??= 'owned-reverse-cleanup'; }
      }
      try { await fixture.cleanup(); cleanupPassed = true; }
      catch {
        blockedStage ??= 'fixture-cleanup-unconfirmed';
        try {
          const preserved = await fixture.closeTerminalLocalHandlesPreservingFixture();
          fixturePreserved = preserved.fixturePreserved === true && preserved.cleanupPassed === false && preserved.operatorHold === true;
        } catch { /* Keep the original fixture held; never reset/delete here. */ }
      }
    }
    }
  }
  return report();
}
