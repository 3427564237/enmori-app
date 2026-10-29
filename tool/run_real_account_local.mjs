import { retainedCoreEvents } from './retained_core_events.mjs';
import { createRemoteGroupRuntime, closeControlledRuntime as closeRemoteRuntime, parseLocalFirstFlowConfiguration } from '../backend/dist/src/bootstrap/retained-core-runtime.js';
/** Existing real Firebase composition behind the established localhost TLS edge. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createServer } from 'node:https';
import { createServer as createHttpServer } from 'node:http';
import { X509Certificate } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createControlledRuntime, closeControlledRuntime } from '../backend/dist/src/bootstrap/controlled-runtime.js';
import { createAuthBindingDocumentId, FIRESTORE_COLLECTIONS } from '../backend/dist/src/shared/infrastructure/firebase/firestore-records.js';
import { acquireRealAccountLock } from './real_account_lock.mjs';

const configPath = resolve(process.argv[2] ?? '');
const directory = dirname(configPath);
function privateOwned(path, directory = false) {
  const stat = lstatSync(path);
  assert(stat.uid === process.getuid() && !stat.isSymbolicLink());
  assert(directory ? stat.isDirectory() : stat.isFile());
  assert.equal(stat.mode & 0o077, 0, 'Private owner-only configuration required');
  assert.equal(realpathSync(path), path);
}
let runtime, server, remoteServer, fullFeatures = false, ownership;
const statePath = join(directory, 'real-account-status.json');
const publish = (state) => writeFileSync(statePath, JSON.stringify({ ...state, checkedAt: new Date().toISOString() }), { mode: 0o600 });
try {
  privateOwned(directory, true); privateOwned(configPath);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(process.versions.node, '24.19.0');
  assert.equal(config.projectId, 'enmori-rmvp-controlled');
  assert.equal(config.host, '127.0.0.1'); assert.equal(config.port, 9381);
  // Explicit opt-in for the public HTTPS edge; never bind this HTTP hop to LAN.
  assert(config.remotePort === undefined || config.remotePort === 9382);
  assert.equal(typeof config.verificationEmail, 'string');
  for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) assert.equal(process.env[name], undefined);
  const flags = process.argv.slice(3);
  assert(flags.length === 0 || flags.length === 1 && flags[0] === '--backend-only', 'Unknown runtime option');
  const backendOnly = flags[0] === '--backend-only';
  fullFeatures = config.fullFeatures === true;
  assert(!backendOnly || fullFeatures, 'Backend-only requires the full ordinary feature composition');
  const firstFlow = parseLocalFirstFlowConfiguration(config.firstFlow);
  assert(firstFlow === undefined || fullFeatures, 'Local first-flow requires full features');
  assert(!backendOnly || firstFlow === undefined, 'Backend-only cannot configure a model-backed first flow');
  privateOwned(config.keyPath);
  const certificate = readFileSync(config.certificatePath);
  const parsed = new X509Certificate(certificate);
  assert.equal(parsed.checkIP(config.host), config.host);
  assert(Date.parse(parsed.validFrom) <= Date.now() && Date.parse(parsed.validTo) > Date.now());
  ownership = acquireRealAccountLock(directory);
  publish({ phase: 'starting', ready: false });
  const events = retainedCoreEvents(config.eventDirectory ?? directory, fullFeatures,
    () => runtime?.eventBrowseControl?.observation().enabled === true);
  if (fullFeatures && events.configuration !== 'configured') throw new Error('Event configuration unavailable');
  const environment = { ...process.env,
    ENMORI_ENVIRONMENT: 'controlled-demo', ENMORI_FIREBASE_PROJECT_ID: config.projectId,
    ENMORI_BACKEND_HOST: config.host, ENMORI_BACKEND_PORT: String(config.port) };
  runtime = fullFeatures ? await createRemoteGroupRuntime({...environment, ENMORI_REMOTE_GROUP:'true'}, events.input, backendOnly ? undefined : 'qwen3.5:9b', firstFlow)
    : await createControlledRuntime(environment);
  if (fullFeatures) {
    const music = await getFirestore(runtime.firebaseApp).doc(`interest_tags/${events.input.musicInterestTagId}`).get();
    if (music.data()?.displayName !== 'Music' || music.data()?.lifecycleState !== 'active') throw new Error('Music mapping unavailable');
    runtime.eventBrowseControl.enable();
  }
  // Read-only readiness; no custom token, synthetic account or business writes.
  const user = await getAuth(runtime.firebaseApp).getUserByEmail(config.verificationEmail);
  const binding = await getFirestore(runtime.firebaseApp)
    .doc(`${FIRESTORE_COLLECTIONS.authBindings}/${createAuthBindingDocumentId(user.uid)}`).get();
  // Operational metadata only: never log tokens, query strings or response bodies.
  const identity = getAuth(runtime.firebaseApp);
  const verifyIdToken = identity.verifyIdToken.bind(identity);
  identity.verifyIdToken = async (...args) => {
    try { return await verifyIdToken(...args); }
    catch (error) {
      const code = typeof error?.code === 'string' && /^auth\/[a-z-]+$/.test(error.code)
        ? error.code : 'identity-dependency-failure';
      console.error(JSON.stringify({ diagnostic: 'identity-verification', code }));
      throw error;
    }
  };
  const route = (request, response) => {
    const started = Date.now();
    // A fixed label avoids identifiers or user text from arbitrary URLs.
    const onboarding = request.url === '/v1/me/onboarding';
    const aiAction = request.url === '/v1/me/ai/operations' ? 'prepare'
      : /^\/v1\/me\/ai\/operations\/[^/?]+\/execute$/.test(request.url ?? '') ? 'execute'
      : /^\/v1\/me\/ai\/operations\/[^/?]+\/cancel$/.test(request.url ?? '') ? 'cancel'
      : /^\/v1\/me\/conversations\/[^/?]+\/operations\/[^/?]+$/.test(request.url ?? '') ? 'outcome'
      : undefined;
    response.once('finish', () => {
      if (onboarding || aiAction || response.statusCode >= 500) console.log(JSON.stringify({
        diagnostic: 'api-response', route: onboarding ? 'onboarding' : aiAction ? 'ai' : 'other',
        ...(aiAction ? { action: aiAction } : {}),
        status: response.statusCode, elapsedMs: Date.now() - started,
      }));
    });
    runtime.app.routing(request, response);
  };
  server = createServer({ cert: certificate, key: readFileSync(config.keyPath) }, route);
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(config.port, config.host, resolve);
  });
  if (config.remotePort === 9382) {
    remoteServer = createHttpServer(route);
    await new Promise((resolve, reject) => {
      remoteServer.once('error', reject);
      remoteServer.listen(config.remotePort, '127.0.0.1', resolve);
    });
  }
  publish({ phase: 'listening', ready: true, authAdminRead: true, firestoreRead: true,
    remoteLoopbackEnabled: Boolean(remoteServer?.listening), fullFeatures,
    firstFlow: { configured: firstFlow !== undefined, workerConfigured: firstFlow?.worker !== undefined, pushConfigured: false },
    ...(fullFeatures ? {ai: runtime.aiStatus(), events: runtime.eventBrowseControl.observation()} : {}),
    emailVerified: user.emailVerified, bindingExists: binding.exists });
  console.log('Real account HTTPS ready; Firebase identity verification remains required.');
  await new Promise((resolve) => {
    process.once('SIGTERM', resolve); process.once('SIGINT', resolve);
  });
  publish({ phase: 'stopping', ready: false });
} catch (_) {
  if (ownership) publish({ phase: 'failed', ready: false });
  console.error('Real account service unavailable; inspect private configuration and access.');
  process.exitCode = 1;
} finally {
  try {
    if (remoteServer?.listening) await new Promise((resolve, reject) => remoteServer.close(error => error ? reject(error) : resolve()));
    if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (runtime) await (fullFeatures ? closeRemoteRuntime(runtime) : closeControlledRuntime(runtime));
  } catch (_) { process.exitCode = 1; }
  if (ownership) {
    publish({ phase: process.exitCode ? 'failed' : 'stopped', ready: false });
    try { ownership.release(); }
    catch { process.exitCode = 1; console.error('Runtime lock changed; preserved for inspection.'); }
  }
}
