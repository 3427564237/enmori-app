// Ongoing operator-owned isolated service. No automatic test journey, model
// call, ADB action, process supervisor, cloud fallback or ordinary enablement.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer as createNetServer } from 'node:net';
import { createServer as createHttpsServer } from 'node:https';
import { mkdtempSync, readFileSync, writeFileSync, renameSync, lstatSync, realpathSync, rmSync, unlinkSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { validateZhouModelConfiguration, quoteFixedWorkerCommand } from './zhou_real_model_store_probe.mjs';
import { buildControlledEmulatorTestEnvironment, requireControlledEmulatorEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { ControlledTokenizerProcess } from '../backend/dist/src/ai-runtime/infrastructure/controlled-tokenizer-process.js';
import { ControlledConversationPrompt } from '../backend/dist/src/ai-runtime/infrastructure/controlled-conversation-prompt.js';
import { ControlledOllamaTransport } from '../backend/dist/src/ai-runtime/infrastructure/controlled-ollama-transport.js';
import { createControlledPhoneService } from '../backend/dist/src/bootstrap/controlled-phone-service.js';
import { TicketmasterBrowseSource } from '../backend/dist/src/event-browse/infrastructure/ticketmaster-browse-source.js';
import { createHostDiagnostics } from './diagnostic_capture_client.mjs';

const ports = [8080, 9099, 4400, 4500, 9150];
const transfer = 'phone-service-model-handoff.json';
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
export function validatePhoneServiceConfiguration(config) {
  const keys = ['controlledHostVerified', 'existingHostGenerationLeaseSettled', 'binding', 'tokenizerFiles', 'phone'];
  const allowed = [...keys, 'eventBrowse', 'demoFeatures', 'dualAccounts'];
  assert(config && typeof config === 'object' && keys.every(key => Object.hasOwn(config, key)) && Object.keys(config).every(key => allowed.includes(key)));
  if (Object.hasOwn(config, 'dualAccounts')) assert(config.dualAccounts === true && config.demoFeatures === true);
  if (Object.hasOwn(config, 'demoFeatures')) assert.equal(config.demoFeatures, true);
  const { phone, eventBrowse, demoFeatures, dualAccounts, ...existing } = config; validateZhouModelConfiguration(existing);
  if (Object.hasOwn(config, 'eventBrowse')) {
    assert(exact(eventBrowse, ['key']));
    assert(typeof eventBrowse.key === 'string' && /^[A-Za-z0-9_-]{1,256}$/u.test(eventBrowse.key));
  }
  assert(exact(phone, ['certificatePath', 'keyPath', 'sessionDirectory']));
  for (const path of Object.values(phone)) assert(typeof path === 'string' && isAbsolute(path) && !/[\x00\r\n]/u.test(path));
  assert.notEqual(phone.certificatePath, phone.keyPath);
  return config;
}
export function validateEventBrowseCommand(command) {
  assert(exact(command, ['enabled']) && typeof command.enabled === 'boolean');
  return command.enabled;
}
function privateDirectory(directory, empty = false) {
  const stat = lstatSync(directory);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0);
  assert.equal(realpathSync(directory), directory);
  if (empty) assert.equal(readdirSync(directory).length, 0);
}
function privateFile(path, maxSize) {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0 && stat.size <= maxSize);
}
function writePrivate(directory, name, value) {
  privateDirectory(directory);
  const path = join(directory, name), temporary = `${path}.tmp`;
  if (existsSync(path)) privateFile(path, 32768);
  writeFileSync(temporary, JSON.stringify(value) + '\n', { mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
}
function stopRequested(directory) {
  privateDirectory(directory);
  const path = join(directory, 'stop');
  if (!existsSync(path)) return false;
  privateFile(path, 0); return true;
}
function takeEventBrowseCommand(directory) {
  privateDirectory(directory);
  const path = join(directory, 'event-command.json');
  if (!existsSync(path)) return undefined;
  privateFile(path, 64);
  const bytes = readFileSync(path);
  // Consume before acting. A failed read/unlink/parse cannot activate a source.
  unlinkSync(path);
  try { return JSON.parse(bytes.toString('utf8')); } finally { bytes.fill(0); }
}
function requestStop(directory) {
  privateDirectory(directory);
  const path = join(directory, 'stop');
  if (!existsSync(path)) writeFileSync(path, '', { mode: 0o600, flag: 'wx' });
  else privateFile(path, 0);
}
async function configuration() {
  let text = ''; for await (const chunk of process.stdin) { text += chunk; assert(Buffer.byteLength(text) <= 16384); }
  try { return validatePhoneServiceConfiguration(JSON.parse(text)); } finally { text = ''; }
}
async function free(port) {
  await new Promise((done, reject) => { const server = createNetServer(); server.once('error', reject); server.listen(port, '127.0.0.1', () => server.close(done)); });
}
function removeOwnedProfile(directory) {
  const child = relative(realpathSync(tmpdir()), realpathSync(directory));
  assert(child && !child.startsWith('..') && !isAbsolute(child)); rmSync(directory, { recursive: true, force: true });
  assert.equal(existsSync(directory), false);
}
function lockedStack() {
  assert.equal(process.version, 'v24.19.0');
  const json = path => JSON.parse(readFileSync(path, 'utf8'));
  const require = createRequire(import.meta.url), admin = createRequire(require.resolve('firebase-admin/app'));
  assert.equal(json(resolve('node_modules/firebase-admin/package.json')).version, '14.3.0');
  assert.equal(json(admin.resolve('@google-cloud/firestore/package.json')).version, '8.7.1');
  assert.equal(json(resolve('node_modules/firebase-tools/package.json')).version, '15.29.0');
  const emulator = json(resolve('node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json')).firestore;
  assert.equal(emulator.version, '1.22.0');
  assert.equal(createHash('sha256').update(readFileSync(join(process.env.FIREBASE_EMULATORS_PATH, emulator.downloadPathRelativeToCacheDir))).digest('hex'), emulator.expectedChecksumSHA256);
}

async function outer() {
  assert.equal(process.platform, 'linux'); lockedStack();
  assert.equal(createHostDiagnostics().healthy, true); // Before emulators or model preflight.
  const config = await configuration(); privateDirectory(config.phone.sessionDirectory, true);
  // Reuse operator-supplied existing TLS files. Never generate/install/copy them.
  privateFile(config.phone.keyPath, 16384);
  const certificate = lstatSync(config.phone.certificatePath);
  assert(certificate.isFile() && !certificate.isSymbolicLink() && certificate.size <= 16384);
  for (const port of ports) await free(port);
  const directory = mkdtempSync(join(tmpdir(), 'enmori-phone-service-outer-'));
  const onSignal = () => { try { requestStop(config.phone.sessionDirectory); } catch { /* No forced disposal or false success. */ } };
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  let exitCode = 1, portsFree = false;
  try {
    const env = buildControlledEmulatorTestEnvironment({ ...process.env,
      GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }, directory);
    env.CI = 'true'; env.FIREBASE_CLI_DISABLE_USAGE = 'true'; env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
    writeFileSync(join(directory, transfer), JSON.stringify(config), { mode: 0o600, flag: 'wx' });
    const code = await new Promise((done, reject) => {
      // Separate process group: Ctrl-C on the operator parent requests DRAIN;
      // it must not kill Firebase/Java while the original model is unresolved.
      const child = spawn(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
        'emulators:exec', '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore', '--config', 'firebase.json',
        '--non-interactive', quoteFixedWorkerCommand(process.execPath, resolve('tool/controlled_phone_service.mjs'))],
      { env, stdio: ['ignore', 'ignore', 'ignore'], detached: true, windowsHide: true });
      child.once('error', reject); child.once('exit', done);
    });
    for (const port of ports) await free(port);
    portsFree = true; exitCode = code ?? 1;
    return exitCode;
  } finally {
    process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal); removeOwnedProfile(directory);
    writePrivate(config.phone.sessionDirectory, 'operator-exit.json', { schemaVersion: 1, exitCode, portsFree, outerProfileRemoved: true });
  }
}
async function worker() {
  assert.equal(process.platform, 'linux');
  const profile = process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY; privateDirectory(profile);
  const path = join(profile, transfer); privateFile(path, 16384);
  const bytes = readFileSync(path); unlinkSync(path);
  let config;
  try { config = validatePhoneServiceConfiguration(JSON.parse(bytes.toString('utf8'))); } finally { bytes.fill(0); }
  const directory = mkdtempSync(join(tmpdir(), 'enmori-phone-service-worker-'));
  try {
    const env = buildControlledEmulatorTestEnvironment(process.env, directory);
    const code = await new Promise((done, reject) => {
      const child = spawn(process.execPath, ['--import', pathToFileURL(resolve('tool/ai_store_gateway_binding.mjs')).href,
        resolve('tool/controlled_phone_service.mjs'), '--execute'], { env, stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true });
      child.stdin.on('error', () => {}); child.once('error', reject); child.once('exit', done);
      child.stdin.end(JSON.stringify(config));
    });
    return code ?? 1;
  } finally {
    removeOwnedProfile(directory);
    writePrivate(config.phone.sessionDirectory, 'worker-exit.json', { schemaVersion: 1, innerProfileRemoved: true });
  }
}

/** Reusable owned HTTPS edge. Does not perform ADB reversal or install an APK.
 * Dependency seams below are for isolated operator unit tests only. */
export async function runPhoneService(config, dependencies = {}) {
  validatePhoneServiceConfiguration(config);
  const { phone } = config;
  const read = dependencies.read ?? readFileSync;
  const publish = dependencies.publish ?? ((name, value) => writePrivate(phone.sessionDirectory, name, value));
  const removeHandoff = dependencies.removeHandoff ?? (() => {
    for (const name of ['handoff.json', 'handoff.json.tmp']) {
      const path = join(phone.sessionDirectory, name); if (existsSync(path)) { privateFile(path, 32768); unlinkSync(path); }
    }
  });
  const requested = dependencies.requested ?? (() => stopRequested(phone.sessionDirectory));
  const eventCommand = dependencies.eventCommand ?? (() => takeEventBrowseCommand(phone.sessionDirectory));
  const wait = dependencies.wait ?? (() => delay(500));
  let live = true, service, listener, listenerClosed = false, cleaned = false, constructing = false, cleanupConfirmed = false;
  const compiler = dependencies.compiler ?? new ControlledConversationPrompt(new ControlledTokenizerProcess({ ...config.tokenizerFiles, current: () => live }), ...(config.dualAccounts ? ["open_conversation_v1"] : []));
  // The actual CLI supplies the installed Q14 capture. Test seams retain the
  // existing isolated in-process path; ordinary application bootstrap is unchanged.
  const diagnostics = dependencies.diagnostics;
  const transport = dependencies.transport ?? new ControlledOllamaTransport({ ...config.binding, current: () => live }, compiler, undefined,
    diagnostics?.observe, diagnostics ? () => diagnostics.healthy : undefined);
  try {
    assert(!diagnostics || diagnostics.healthy === true);
    const abort = new AbortController(), end = performance.now() + 60_000;
    const timer = setTimeout(() => abort.abort(), 60_000);
    try {
      const budget = { signal: abort.signal, deadline: end, remainingMs: () => Math.max(0, end - performance.now()) };
      await transport.preflight(budget);
      const probe = await (diagnostics?.compiler('startup_compile', compiler) ?? compiler).compile({ currentMessage: '今天读书了。', checkIns: [], persona: undefined,
        ...(config.dualAccounts ? { strategy: 'open_conversation_v1', history: [] } : {}) }, budget);
      assert(probe.includesAllFraming === true && Number.isSafeInteger(probe.tokens) && probe.tokens >= 1 && probe.tokens <= 4096);
      assert.equal(probe.manifestDigest, config.binding.manifestDigest);
      assert.equal(probe.tokenizerDigest, config.binding.tokenizerDigest);
      assert(!budget.signal.aborted && budget.remainingMs() > 0);
      assert(!diagnostics || diagnostics.healthy === true);
      // No generation, storage, saved content, raw prompt or count is published.
    }
    finally { clearTimeout(timer); abort.abort(); }
    constructing = true;
    // A supplied private key constructs a source only; it NEVER enables it.
    const eventBrowse = config.eventBrowse ? { source: new TicketmasterBrowseSource({
      key: () => live ? config.eventBrowse.key : undefined,
      enabled: () => service?.eventBrowseControl.observation().enabled === true,
    }) } : undefined;
    service = await (dependencies.createService ?? createControlledPhoneService)({ environment: process.env, exclusiveEmulatorsVerified: true, ...(config.demoFeatures ? { demoFeatures: true } : {}), ...(config.dualAccounts ? { dualAccounts: true, conversationStrategy: "open_conversation_v1" } : {}), transport, compiler,
      ...(eventBrowse ? { eventBrowse } : {}), ...(diagnostics ? { diagnostics } : {}) });
    listener = (dependencies.createHttpsServer ?? createHttpsServer)({ cert: read(phone.certificatePath), key: read(phone.keyPath) }, service.app.routing);
    await new Promise((done, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', done); });
    const address = listener.address(); assert(address && typeof address !== 'string');
    publish('handoff.json', { schemaVersion: config.dualAccounts ? 2 : 1, ...service.privateHandoff(), baseUri: `https://127.0.0.1:${address.port}/`,
      certificateBase64: read(phone.certificatePath).toString('base64'), authEmulatorHost: '127.0.0.1:9099',
      lifetime: 'until-explicit-stop-in-this-owned-process', syntheticOwnerOnly: true });
    let stopping = false, eventControlFailed = false;
    for (;;) {
      if (!stopping && requested()) { stopping = true; removeHandoff(); }
      if (!stopping) {
        try {
          const command = eventCommand();
          if (command !== undefined) {
            if (validateEventBrowseCommand(command)) service.eventBrowseControl.enable();
            else service.eventBrowseControl.disable();
            eventControlFailed = false;
          }
        } catch {
          // This private control failure disables only Event. No model/service
          // restart, owner reset, false cleanup, or credential diagnostic.
          service.eventBrowseControl.disable(); eventControlFailed = true;
        }
      }
      let result;
      if (stopping) result = await service.stopAndClean();
      if (result?.cleanupConfirmed) cleanupConfirmed = true;
      // No model/key/token/URL/identity/content is included in readiness output.
      publish('status.json', { schemaVersion: 1, scope: 'isolated-phone-service', ...service.observation(),
        hostPreflightPassed: true, tokenizerReadinessPassed: true, adapterState: transport.state, httpsListening: !listenerClosed,
        stopRequested: stopping, cleanupConfirmed: result?.cleanupConfirmed === true,
        eventControlFailed,
        ...(diagnostics ? { diagnosticCaptureHealthy: diagnostics.healthy } : {}),
        operatorHold: result?.operatorHold === true });
      if (result?.cleanupConfirmed) {
        await new Promise((done, reject) => { listener.close(error => error ? reject(error) : done()); listener.closeAllConnections(); });
        listenerClosed = true;
        publish('status.json', { schemaVersion: 1, phase: 'closed', accepting: false, httpsListening: false,
          cleanupConfirmed: true, operatorHold: false, databaseLifetime: 'owned-emulator-process' });
        cleaned = true; return 0;
      }
      await wait();
    }
  } catch (error) {
    if (!service && (!constructing || error?.message === 'CONTROLLED_PHONE_SERVICE_UNAVAILABLE')) {
      // A failed read-only model preflight, or a factory-confirmed clean startup
      // rejection, has no outstanding owned execution requiring preservation.
      try { removeHandoff(); } catch { /* No owned execution; retain failure exit. */ }
      cleaned = true;
      try {
        publish('status.json', { schemaVersion: 1, phase: 'failed-before-ready', accepting: false,
          cleanupConfirmed: true, operatorHold: false });
      } catch { /* A missing receipt is not a reported Pass. */ }
      return 1;
    }
    // Startup/lifecycle failure must not let emulators:exec destroy a possible
    // in-flight fixture. Reporting and private-file removal are not lifecycle
    // authority: each can fail independently while this ORIGINAL stays held.
    for (;;) {
      let handoffRemoved = false;
      try { removeHandoff(); handoffRemoved = true; } catch { /* Retry without skipping the admission/drain gate. */ }
      if (!cleanupConfirmed) {
        try { cleanupConfirmed = (await service?.stopAndClean())?.cleanupConfirmed === true; } catch { /* Retain hold. */ }
      }
      if (cleanupConfirmed) {
        try {
          if (listener && !listenerClosed) {
            await new Promise((done, reject) => { listener.close(error => error ? reject(error) : done()); listener.closeAllConnections(); });
            listenerClosed = true;
          }
          if (handoffRemoved) {
            publish('status.json', { schemaVersion: 1, phase: 'failed-cleaned', accepting: false, cleanupConfirmed: true, operatorHold: false });
            cleaned = true; return 1;
          }
        } catch { /* Original cleanup is confirmed; retry only close/removal/reporting. */ }
      }
      try {
        publish('status.json', { schemaVersion: 1, phase: 'held', accepting: false, cleanupConfirmed: false, operatorHold: true });
      } catch { /* A reporting outage cannot reject the held operator promise. */ }
      try { await wait(); } catch { await delay(500); }
    }
  } finally { if (cleaned) live = false; }
}
async function execute() {
  assert.equal(process.platform, 'linux');
  requireControlledEmulatorEnvironment(process.env);
  const config = await configuration(); privateDirectory(config.phone.sessionDirectory);
  const diagnostics = createHostDiagnostics();
  assert.equal(diagnostics.healthy, true);
  return runPhoneService(config, { diagnostics });
}
export async function main() {
  assert.equal(process.argv.length, 3);
  const mode = process.argv[2];
  return mode === '--live-existing-host' ? outer() : mode === '--worker' ? worker() : mode === '--execute' ? execute() : Promise.reject(new Error('Unsupported mode'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    process.stdout.write('CONTROLLED_PHONE_SERVICE_START_FAILED_NO_PRIVATE_DIAGNOSTICS\n'); process.exitCode = 1;
  });
}
