// Explicit operator-only verification, never imported by ordinary bootstrap.
// Existing private Qwen binding/tokenizer config arrives on stdin only. Firebase
// is a fresh isolated demo Emulator fixture, never an actual user datastore.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, lstatSync, realpathSync, rmSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment, requireControlledEmulatorEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

const ports = [8080, 9099, 4400, 4500, 9150];
const handoffName = 'zhou-model-handoff.json';
const safeFailure = reason => ({status: 'Blocked', reason, actualModelStorePass: false});
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && Object.keys(value).every(key => fields.includes(key));

export function validateZhouModelConfiguration(config) {
  assert(exact(config, ['controlledHostVerified', 'existingHostGenerationLeaseSettled', 'binding', 'tokenizerFiles']) ||
    exact(config, ['controlledHostVerified', 'existingHostGenerationLeaseSettled', 'binding', 'tokenizerFiles', 'mobile']));
  assert.equal(config.controlledHostVerified, true);
  // LI's existing-host lease is external to this disposable fixture. Only its
  // owner can confirm the ORIGINAL invocation stopped; a new process/profile
  // is never permission to bypass an outstanding termination_unconfirmed hold.
  assert.equal(config.existingHostGenerationLeaseSettled, true);
  const binding = config.binding;
  assert(exact(binding, ['endpoint', 'reference', 'manifestDigest', 'tokenizerDigest', 'ollamaVersion', 'mode']));
  const origin = new URL(binding.endpoint);
  assert(['127.0.0.1', '[::1]'].includes(origin.hostname));
  assert.equal(origin.protocol, 'http:');
  assert.equal(origin.pathname, '/');
  assert(!origin.username && !origin.password && !origin.search && !origin.hash);
  assert.equal(binding.mode, 'formal-9b');
  assert.equal(config.tokenizerFiles.manifestDigest, binding.manifestDigest);
  assert.equal(config.tokenizerFiles.tokenizerSha256, binding.tokenizerDigest);
  assert.match(binding.manifestDigest, /^[0-9a-f]{64}$/u);
  assert.match(binding.tokenizerDigest, /^[0-9a-f]{64}$/u);
  assert.equal(typeof binding.reference, 'string');
  assert(binding.reference.length > 0 && !/\s/u.test(binding.reference));
  assert.match(binding.ollamaVersion, /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u);
  if (Object.hasOwn(config, 'mobile')) {
    const mobile = config.mobile;
    assert(exact(mobile, ['serial', 'adb', 'aapt', 'apksigner', 'flutterDart', 'flutterSnapshot', 'apkPath', 'certificatePath', 'keyPath']));
    assert.match(mobile.serial, /^[A-Za-z0-9]{6,64}$/u);
    for (const name of ['adb', 'aapt', 'flutterDart', 'flutterSnapshot', 'apkPath', 'certificatePath', 'keyPath']) {
      assert.equal(typeof mobile[name], 'string'); assert(isAbsolute(mobile[name])); assert(!/[\x00\r\n]/u.test(mobile[name]));
    }
    if (typeof mobile.apksigner === 'string') assert(isAbsolute(mobile.apksigner));
    else {
      assert(exact(mobile.apksigner, ['program', 'args'])); assert(isAbsolute(mobile.apksigner.program));
      assert(Array.isArray(mobile.apksigner.args) && mobile.apksigner.args.length === 2 && mobile.apksigner.args[0] === '-jar' && isAbsolute(mobile.apksigner.args[1]));
    }
  }
  return config;
}

export function quoteFixedWorkerCommand(executable, script) {
  // The CLI launches a shell command; only fixed resolved executable/file paths
  // are admitted. No private config, URL, data or caller option enters it.
  assert(isAbsolute(executable) && isAbsolute(script));
  assert(!/["'`$\r\n]/u.test(executable + script));
  return `"${executable}" "${script}" --worker`;
}

export function isPositiveZhouModelStoreReport(report, observation) {
  return Boolean(report && report.schemaVersion === 1 && report.scope === 'owned-empty-note-auth-persona-http-firestore' &&
    report.result === 'accepted' && report.modelAttempts === 1 && report.completeInputGatePassed === true &&
    report.personaCrudAndSelectionPassed === true && report.ordinaryOutcomeAndHistoryPassed === true &&
    report.canonicalUserMetadataConfirmed === true && report.assistantAnchorConfirmed === true &&
    report.rejectedHasNoAssistantOrProvenance === false && report.physicalConversationCleanupPassed === true &&
    observation.modelPosts === 1 && observation.adapterState === 'stopped' && observation.fixtureCleanupConfirmed === true);
}

async function stdinConfiguration() {
  let value = '';
  for await (const part of process.stdin) {
    value += part; assert(Buffer.byteLength(value) <= 16384);
  }
  try { return validateZhouModelConfiguration(JSON.parse(value)); }
  finally { value = ''; }
}
async function free(port) {
  return new Promise((done, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(done));
  });
}
function removeOwnedProfile(directory) {
  const child = relative(realpathSync(tmpdir()), realpathSync(directory));
  assert(child && !child.startsWith('..') && !isAbsolute(child));
  rmSync(directory, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  assert.equal(existsSync(directory), false);
}
function lockedStack() {
  assert.equal(process.version, 'v24.19.0');
  const read = path => JSON.parse(readFileSync(path, 'utf8'));
  const require = createRequire(import.meta.url), adminRequire = createRequire(require.resolve('firebase-admin/app'));
  assert.equal(read(resolve('node_modules/firebase-admin/package.json')).version, '14.3.0');
  assert.equal(read(resolve('node_modules/firebase-tools/package.json')).version, '15.29.0');
  assert.equal(read(adminRequire.resolve('@google-cloud/firestore/package.json')).version, '8.7.1');
  const emulator = read(resolve('node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json')).firestore;
  assert.equal(emulator.version, '1.22.0');
  assert.equal(createHash('sha256').update(readFileSync(join(process.env.FIREBASE_EMULATORS_PATH,
    emulator.downloadPathRelativeToCacheDir))).digest('hex'), emulator.expectedChecksumSHA256);
}

async function outer() {
  assert.equal(process.platform, 'linux'); // LI owns the already provisioned host.
  lockedStack();
  const config = await stdinConfiguration();
  for (const port of ports) await free(port);
  const directory = mkdtempSync(join(tmpdir(), 'enmori-zhou-model-outer-'));
  try {
    const env = buildControlledEmulatorTestEnvironment({...process.env,
      GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'}, directory);
    env.CI = 'true'; env.FIREBASE_CLI_DISABLE_USAGE = 'true'; env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
    // One temporary mode0600 transfer inside the newly owned private profile.
    // CLI argv/stdout/env contain none of the private model/tokenizer values.
    writeFileSync(join(directory, handoffName), JSON.stringify(config), {mode: 0o600, flag: 'wx'});
    const code = await new Promise((done, reject) => {
      const child = spawn(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
        'emulators:exec', '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore',
        '--config', 'firebase.json', '--non-interactive', quoteFixedWorkerCommand(process.execPath,
          resolve('tool/zhou_real_model_store_probe.mjs'))], {env, stdio: 'inherit', windowsHide: true});
      child.once('error', reject); child.once('exit', done);
    });
    return code ?? 1;
  } finally {
    removeOwnedProfile(directory);
    for (const port of ports) await free(port);
    process.stdout.write('ZHOU_MODEL_STORE_OUTER_PROFILE_REMOVED_AND_PORTS_FREE\n');
  }
}

async function worker() {
  assert.equal(process.platform, 'linux');
  const parentProfile = process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
  assert(parentProfile && isAbsolute(parentProfile));
  const file = join(parentProfile, handoffName), stat = lstatSync(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 16384 && (stat.mode & 0o777) === 0o600);
  let bytes = readFileSync(file); unlinkSync(file);
  let serialized;
  try { serialized = JSON.stringify(validateZhouModelConfiguration(JSON.parse(bytes.toString('utf8')))); }
  finally { bytes.fill(0); bytes = undefined; }
  const directory = mkdtempSync(join(tmpdir(), 'enmori-zhou-model-worker-'));
  try {
    const env = buildControlledEmulatorTestEnvironment(process.env, directory);
    const result = await new Promise((done, reject) => {
      const child = spawn(process.execPath, ['--import', pathToFileURL(resolve('tool/ai_store_gateway_binding.mjs')).href,
        resolve('tool/zhou_real_model_store_probe.mjs'), '--execute'], {env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
      let output = '', stderrBytes = 0;
      child.stdout.setEncoding('utf8'); child.stdout.on('data', text => {output += text; if (output.length > 32768) child.kill();});
      child.stderr.on('data', chunk => {stderrBytes += chunk.length;});
      child.stdin.on('error', () => {}); child.once('error', reject);
      child.once('close', code => done({code, output, stderrBytes}));
      child.stdin.end(serialized); serialized = undefined;
    });
    // Only the explicitly generated content-free report is forwarded. SDK/vendor
    // errors and private operator input are never echoed as diagnostics.
    const lines = result.output.trim().split(/\r?\n/u), report = lines.map(line => {
      try { const item = JSON.parse(line); return item.kind === 'zhou-model-store-report' ? item : undefined; }
      catch { return undefined; }
    }).filter(Boolean);
    assert.equal(report.length, 1);
    process.stdout.write(JSON.stringify({...report[0], capturedStderrBytes: result.stderrBytes}) + '\n');
    return result.code ?? 1;
  } finally {
    serialized = undefined; removeOwnedProfile(directory);
    process.stdout.write('ZHOU_MODEL_STORE_WORKER_PROFILE_REMOVED\n');
  }
}

async function execute() {
  assert.equal(process.platform, 'linux');
  assert.equal(requireControlledEmulatorEnvironment(process.env).projectId, 'demo-enmori-rmvp01a-r10');
  const config = await stdinConfiguration();
  const [{ControlledTokenizerProcess}, {ControlledConversationPrompt}, {ControlledOllamaTransport}, {createZhouRealModelStoreFixture}] = await Promise.all([
    import('../backend/dist/src/ai-runtime/infrastructure/controlled-tokenizer-process.js'),
    import('../backend/dist/src/ai-runtime/infrastructure/controlled-conversation-prompt.js'),
    import('../backend/dist/src/ai-runtime/infrastructure/controlled-ollama-transport.js'),
    import('../backend/dist/emulator-test/support/zhou-real-model-store-fixture.js'),
  ]);
  let live = true, modelPosts = 0, fixture;
  const completeInputCounts = [];
  const counter = new ControlledTokenizerProcess({...config.tokenizerFiles, current: () => live});
  const compiler = new ControlledConversationPrompt({manifestDigest: counter.manifestDigest, tokenizerDigest: counter.tokenizerDigest,
    current: () => counter.current(), count: (raw, budget) => counter.count(raw, budget).then(count => {completeInputCounts.push(count); return count;})});
  const transport = new ControlledOllamaTransport({...config.binding, current: () => live}, compiler, (url, init) => {
    if (new URL(String(url)).pathname === '/api/generate') {modelPosts++; assert.equal(modelPosts, 1);}
    return fetch(url, init);
  });
  const abort = new AbortController(), end = performance.now() + 60000, timer = setTimeout(() => abort.abort(), 60000);
  try {
    await transport.preflight({signal: abort.signal, deadline: end, remainingMs: () => Math.max(0, end - performance.now())});
  } finally {clearTimeout(timer); abort.abort();}
  let result, mobileResult, fixtureCleanupConfirmed = false, localHandlesClosed = false, localApplicationTerminal = false;
  let localShutdownUnconfirmed = false;
  try {
    fixture = await createZhouRealModelStoreFixture({environment: process.env, transport, compiler});
    if (config.mobile) {
      const {runZhouMobileNetworkFixture} = await import('./zhou_mobile_network_fixture.mjs');
      const {certificatePath, keyPath, ...mobileOptions} = config.mobile;
      mobileResult = await runZhouMobileNetworkFixture({fixture, ...mobileOptions,
        certificate: readFileSync(certificatePath), key: readFileSync(keyPath),
        existingHostGenerationLeaseSettled: config.existingHostGenerationLeaseSettled,
        modelBinding: {...config.binding, controlledHostVerified: config.controlledHostVerified}});
    } else {result = await fixture.runPositiveChat();}
  } catch {
    // No raw HTTP/vendor/model exception, response body or test identity escapes.
  } finally {
    if (fixture) {
      try {await fixture.cleanup(); fixtureCleanupConfirmed = true; localHandlesClosed = true;}
      catch {
        localApplicationTerminal = fixture.state().nonTerminal === 0;
        if (localApplicationTerminal) {
          try {await fixture.closeTerminalLocalHandlesPreservingFixture(); localHandlesClosed = true;}
          catch {localShutdownUnconfirmed = true;}
        } else {localShutdownUnconfirmed = true;}
      }
      localApplicationTerminal = fixture.state().nonTerminal === 0;
    }
    live = false;
  }
  const actualModelStorePass = isPositiveZhouModelStoreReport(result, {modelPosts, adapterState: transport.state, fixtureCleanupConfirmed});
  const actualMobileJourneyPass = Boolean(config.mobile && mobileResult?.actual9bJourneyPassed === true &&
    mobileResult.cleanupPassed === true && mobileResult.credentialCleanupConfirmed === true && mobileResult.apkAttributionConfirmed === true &&
    modelPosts === 1 && transport.state === 'stopped' && fixtureCleanupConfirmed);
  const passed = config.mobile ? actualMobileJourneyPass : actualModelStorePass;
  // Explicit allowlist, not a spread of a future content-bearing helper object.
  process.stdout.write(JSON.stringify({kind: 'zhou-model-store-report', schemaVersion: 1,
    status: passed ? 'Pass' : 'Not Proven', actualModelStorePass, actualMobileJourneyPass,
    accepted: result?.result === 'accepted', completeInputGatePassed: result?.completeInputGatePassed === true,
    personaCrudAndSelectionPassed: result?.personaCrudAndSelectionPassed === true,
    ordinaryOutcomeAndHistoryPassed: result?.ordinaryOutcomeAndHistoryPassed === true,
    canonicalUserMetadataConfirmed: result?.canonicalUserMetadataConfirmed === true,
    assistantAnchorConfirmed: result?.assistantAnchorConfirmed === true,
    physicalConversationCleanupPassed: result?.physicalConversationCleanupPassed === true,
    fixtureCleanupConfirmed, localApplicationTerminal, localHandlesClosed, localShutdownUnconfirmed,
    operatorHold: !fixtureCleanupConfirmed || (modelPosts > 0 && transport.state !== 'stopped'),
    databaseLifetime: 'temporary-emulator-process-only', durableFixtureRetention: 'not-provided',
    modelPosts, adapterState: transport.state, completeInputCounts,
    remoteSettlementRequired: modelPosts > 0 && transport.state !== 'stopped',
    deviceExecution: config.mobile ? (actualMobileJourneyPass ? 'Pass' : 'Not Proven') : 'Not Run',
    mobileConfigurationDelivered: mobileResult?.runtimeConfigurationDelivered === true,
    mobileCredentialCleanupConfirmed: mobileResult?.credentialCleanupConfirmed === true,
    mobileAiReadback: mobileResult?.aiAcceptedAndReadback === true,
    mobilePersonaHistoryAndDelete: mobileResult?.personaHistoryAndDelete === true,
    mobileApkAttributionConfirmed: mobileResult?.apkAttributionConfirmed === true,
    mobileApkSha256: mobileResult?.selectedApkSha256, model: 'formal-9b-existing-private-binding',
    database: 'actual-isolated-Auth-and-Firestore-Emulators'}) + '\n');
  if (localShutdownUnconfirmed) {
    // Only this owned operator child is terminated. This is NOT SDK settlement,
    // database cleanup, remote cancellation or permission for another model call.
    // stdout is a pipe; finish the allowlisted report before closing the child.
    await new Promise(resolve => process.stdout.write('', resolve));
    process.exit(1);
  }
  return passed ? 0 : 2;
}

export async function main() {
  const mode = process.argv[2];
  assert.equal(process.argv.length, 3);
  return mode === '--live-existing-host' ? outer() : mode === '--worker' ? worker() :
    mode === '--execute' ? execute() : Promise.reject(new Error('Unsupported controlled mode'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => {process.exitCode = code;}).catch(() => {
    process.stdout.write(JSON.stringify({kind: 'zhou-model-store-report', ...safeFailure('Guard, fixture or cleanup could not be confirmed; no private diagnostics published')}) + '\n');
    process.exitCode = 1;
  });
}
