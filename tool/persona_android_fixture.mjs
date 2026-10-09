// Fixture-only initialization; the product still fails closed on absent state.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { createServer, request } from 'node:https';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireControlledEmulatorEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway } from '../backend/dist/src/shared/infrastructure/firebase/firestore-gateway.js';
import { FirebaseIdentityVerifier } from '../backend/dist/src/shared/infrastructure/firebase/firebase-identity-verifier.js';
import { createAuthBindingDocumentId } from '../backend/dist/src/shared/infrastructure/firebase/firestore-records.js';
import { FirestoreOnboardingRepository } from '../backend/dist/src/onboarding/infrastructure/firestore-onboarding-repository.js';
import { GetOnboarding } from '../backend/dist/src/onboarding/application/get-onboarding.js';
import { FirestorePersonaRepository } from '../backend/dist/src/personas/infrastructure/firestore-persona-repository.js';
import { OwnPersonas } from '../backend/dist/src/personas/application/own-personas.js';
import { SystemClock } from '../backend/dist/src/shared/infrastructure/system-clock.js';
import { buildApp } from '../backend/dist/src/bootstrap/build-app.js';
import { err } from '../backend/dist/src/shared/domain/result.js';
import { appFailure } from '../backend/dist/src/shared/application/app-failure.js';

const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, 'demo-enmori-rmvp01a-r10');
assert.equal(environment.authHost, '127.0.0.1:9099');
assert.equal(environment.firestoreHost, '127.0.0.1:8080');
const serial = process.argv[2];
const smoke = serial === '--smoke';
if (!smoke) assert.match(serial ?? '', /^(?:emulator-[0-9]{1,5}|[A-Za-z0-9]{6,64})$/, 'An attached USB Android device or Emulator serial is required');
const physicalDevice = !smoke && !serial.startsWith('emulator-');
const apiHost = physicalDevice ? '127.0.0.1' : '10.0.2.2';
const directory = process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
const adb = physicalDevice
  ? join(process.env.ANDROID_HOME ?? '', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  : undefined;
if (physicalDevice) assert.ok(isAbsolute(adb) && existsSync(adb), 'The configured Android SDK must contain adb');
// Match the already-approved build-tools pin; do not select or install a tool.
const aapt = smoke ? undefined : join(process.env.ANDROID_HOME ?? '', 'build-tools', '36.0.0', process.platform === 'win32' ? 'aapt.exe' : 'aapt');
if (!smoke) assert.ok(isAbsolute(aapt) && existsSync(aapt), 'The configured Android SDK must contain the pinned aapt');
const firebase = initializeApp({ projectId: environment.projectId }, 'persona-android');
const auth = getAuth(firebase), firestore = getFirestore(firebase);
const identities = ['owner', 'peer'].map(role => ({
  uid: `pc13-${role}-${randomUUID()}`,
  accountId: `pc13-${role}-${randomUUID()}`,
  email: `persona-${role}@example.invalid`,
}));
const run = (program, args, quiet = false, extraEnvironment = {}) => new Promise((done, reject) => {
  const child = spawn(program, args, { env: { ...process.env, LOCALAPPDATA: directory, DASH__SUPPRESS_ANALYTICS: 'true', ...extraEnvironment }, stdio: quiet ? 'ignore' : 'inherit', windowsHide: true });
  child.once('error', reject);
  child.once('exit', code => code === 0 ? done() : reject(new Error(`Test child exited ${code}`)));
});
const requireDedicatedTestApk = async () => {
  const apk = resolve('build/app/outputs/flutter-apk/app-debug.apk');
  const inspect = args => new Promise((done, reject) => {
    const child = spawn(aapt, args, {
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let result = '';
    child.stdout.setEncoding('utf8'); child.stdout.on('data', chunk => { result += chunk; });
    child.stderr.resume();
    child.once('error', () => reject(new Error('The dedicated test APK could not be inspected.')));
    child.once('exit', code => code === 0 ? done(result) : reject(new Error('The dedicated test APK inspection failed.')));
  });
  const [output, manifest] = await Promise.all([
    inspect(['dump', 'badging', apk]),
    // Flutter reads this same compiled manifest before selecting an install ID.
    inspect(['dump', 'xmltree', apk, 'AndroidManifest.xml']),
  ]);
  assert.ok(/^package: name='com\.enmori\.app\.personatest'(?:\s|$)/m.test(output), 'Refusing Android execution: APK must use the dedicated Persona test application ID');
  assert.ok(/^launchable-activity: name='com\.enmori\.app\.MainActivity'(?:\s|$)/m.test(output), 'Refusing Android execution: test launch activity could not be verified');
  assert.ok(/^\s*A: package="com\.enmori\.app\.personatest"/m.test(manifest), 'Refusing Android execution: compiled test manifest could not be verified');
  console.log('PERSONA_ANDROID_DEDICATED_TEST_PACKAGE_PREFLIGHT: Pass');
};
// Capture adb diagnostics without emitting device identifiers or unrelated
// forwarding entries. Commands target the explicitly selected device only.
const adbCommand = args => new Promise((done, reject) => {
  const child = spawn(adb, ['-s', serial, ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.resume();
  child.once('error', () => reject(new Error('The controlled USB forwarding command could not start.')));
  child.once('exit', code => code === 0 ? done(output.trim()) : reject(new Error('The controlled USB forwarding command failed.')));
});
const reverseMappings = async () => {
  const output = await adbCommand(['reverse', '--list']);
  if (output === '') return [];
  return output.split(/\r?\n/).map(line => {
    const fields = line.trim().split(/\s+/);
    assert.equal(fields.length, 3, 'Unexpected adb reverse listing shape');
    return { device: fields[1], host: fields[2] };
  });
};
const createdReverses = [];
const ensureReverse = async port => {
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
  const endpoint = `tcp:${port}`;
  const existing = (await reverseMappings()).filter(mapping => mapping.device === endpoint);
  assert.ok(existing.length <= 1, 'Ambiguous existing USB reverse mapping');
  if (existing.length === 1) {
    assert.equal(existing[0].host, endpoint, 'A conflicting USB reverse mapping already exists');
    return; // Matching caller-owned mapping is reused and never removed.
  }
  await adbCommand(['reverse', '--no-rebind', endpoint, endpoint]);
  createdReverses.push(endpoint);
};
const removeCreatedReverses = async () => {
  const outcomes = await Promise.allSettled(createdReverses.map(async endpoint => {
    const current = (await reverseMappings()).filter(mapping => mapping.device === endpoint);
    if (current.length === 1 && current[0].host === endpoint) {
      await adbCommand(['reverse', '--remove', endpoint]);
    } else if (current.length !== 0) {
      throw new Error('A run-owned USB reverse mapping changed; it was preserved.');
    }
  }));
  if (outcomes.some(result => result.status === 'rejected')) {
    throw new Error('Some run-owned USB reverse mappings could not be safely removed.');
  }
};
let app, server;
try {
  if (physicalDevice) assert.equal(await adbCommand(['get-state']), 'device', 'The selected USB device must be online');
  const password = `${randomUUID()}Aa1!`;
  for (const [index, identity] of identities.entries()) {
    await auth.createUser({ uid: identity.uid, email: identity.email, password });
    const batch = firestore.batch();
    batch.create(firestore.doc(`auth_bindings/${createAuthBindingDocumentId(identity.uid)}`), { accountId: identity.accountId });
    batch.create(firestore.doc(`accounts/${identity.accountId}`), {
      username: `pc13_member_${index}`, optionalProcessingConsent: 'rejected', checkInVisibility: 'private',
      onboardingCompletedAt: '2026-10-09T00:00:00.000Z',
    });
    batch.create(firestore.doc(`accounts/${identity.accountId}/persona_state/current`), { livePersonaIds: [], stateRevision: 0 });
    await batch.commit();
  }
  const gateway = new FirebaseAdminFirestoreGateway(firestore);
  const unavailable = { execute: async () => err(appFailure('SERVICE_UNAVAILABLE')) };
  app = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth), completeOnboarding: unavailable,
    getOnboarding: new GetOnboarding(new FirestoreOnboardingRepository(gateway)),
    getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable,
    createCheckIn: unavailable, getCheckIn: unavailable,
    isolatedSlices: { environment: process.env, personas: new OwnPersonas(new FirestorePersonaRepository(gateway, new SystemClock())) },
  });
  const certificate = join(directory, 'test-certificate.pem'), key = join(directory, 'test-key.pem');
  await run(process.env.ENMORI_TEST_OPENSSL ?? 'openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key,
    '-out', certificate, '-days', '1', '-subj', '/CN=ENMORI isolated test', '-addext', 'subjectAltName=IP:10.0.2.2,IP:127.0.0.1'], true);
  server = createServer({ key: readFileSync(key), cert: readFileSync(certificate) }, app.routing);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  if (physicalDevice) {
    await ensureReverse(9099);
    await ensureReverse(server.address().port);
  }
  const configuration = join(directory, 'android-fixture.json');
  writeFileSync(configuration, JSON.stringify({
    ENMORI_API_BASE_URL: `https://${apiHost}:${server.address().port}`,
    ENMORI_TEST_PASSWORD: password,
    ENMORI_TEST_TLS_CERTIFICATE_BASE64: readFileSync(certificate).toString('base64'),
  }), { mode: 0o600 });
  if (smoke) {
    // Validates fixture provisioning and the actual guarded HTTPS transport only.
    // This never stands in for the required Android UI/mutation PC13 execution.
    for (const identity of identities) {
      const response = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: identity.email, password, returnSecureToken: true }),
      });
      assert.equal(response.ok, true);
      const { idToken } = await response.json();
      assert.equal(typeof idToken, 'string');
      const result = await new Promise((done, reject) => {
        const req = request({ hostname: '127.0.0.1', port: server.address().port, path: '/v1/me/personas',
          ca: readFileSync(certificate), headers: { authorization: `Bearer ${idToken}` } }, response => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', chunk => { body += chunk; });
          response.once('error', reject);
          response.once('end', () => done({ status: response.statusCode, body }));
        });
        req.once('error', reject); req.end();
      });
      assert.equal(result.status, 200);
      assert.deepEqual(JSON.parse(result.body), { personas: { items: [], stateRevision: 0 } });
    }
    console.log('PERSONA_FIXTURE_SMOKE_TWO_AUTH_IDENTITIES_HTTPS_EMPTY_READ: Pass (Android PC13 Not Run)');
  } else {
    assert.ok(process.env.ENMORI_TEST_FLUTTER_DART && process.env.ENMORI_TEST_FLUTTER_SNAPSHOT);
    const flutterEnvironment = {
      // Deliberately supplied only to this harness's Flutter children.
      ENMORI_PERSONA_ANDROID_TEST: 'true',
      GRADLE_OPTS: '-Dorg.gradle.project.kotlin.incremental=false -Dorg.gradle.project.kotlin.compiler.execution.strategy=in-process',
    };
    // Compile and inspect the dedicated ID before Flutter can stop, install or
    // replace any device package. Its subsequent test build uses the same flag.
    await run(process.env.ENMORI_TEST_FLUTTER_DART, [process.env.ENMORI_TEST_FLUTTER_SNAPSHOT, '--suppress-analytics', 'build', 'apk',
      '--debug', '--no-pub', '--target', 'integration_test/persona_real_backend_test.dart',
      '--android-project-arg=kotlin.incremental=false', '--android-project-arg=kotlin.compiler.execution.strategy=in-process',
      `--dart-define-from-file=${configuration}`], false, flutterEnvironment);
    await requireDedicatedTestApk();
    // Flutter 3.47.2's `test` command has no --android-project-arg option.
    // Dart uppercases inherited environment *keys* on Windows, breaking mixed-
    // case ORG_GRADLE_PROJECT_kotlin.* names. GRADLE_OPTS preserves the lowercase
    // property names in its value; Gradle loads org.gradle.project.* system
    // properties above environment/file properties. No global config is edited.
    await run(process.env.ENMORI_TEST_FLUTTER_DART, [process.env.ENMORI_TEST_FLUTTER_SNAPSHOT, '--suppress-analytics', 'test',
      'integration_test/persona_real_backend_test.dart', '-d', serial, '--no-pub', '--reporter', 'expanded', `--dart-define-from-file=${configuration}`], false, flutterEnvironment);
    const state = (await firestore.doc(`accounts/${identities[0].accountId}/persona_state/current`).get()).data();
    assert.deepEqual(state, { livePersonaIds: [], stateRevision: 4 });
    assert.equal((await firestore.collection(`accounts/${identities[0].accountId}/personas`).get()).empty, true);
    const peerState = (await firestore.doc(`accounts/${identities[1].accountId}/persona_state/current`).get()).data();
    assert.deepEqual(peerState, { livePersonaIds: [], stateRevision: 0 });
    assert.equal((await firestore.collection(`accounts/${identities[1].accountId}/personas`).get()).empty, true);
    console.log('PERSONA_PC13_ANDROID_TWO_OWNERS_PERSISTED_ACTIVE_DELETE_REVISION_4: Pass');
  }
} finally {
  try {
    if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
    if (app) await app.close();
    for (const name of ['android-fixture.json', 'test-key.pem', 'test-certificate.pem']) rmSync(resolve(directory, name), { force: true });
    // Stop all requests and identities before deleting only this run's partitions.
    for (const identity of identities) {
      await auth.deleteUser(identity.uid).catch(() => {});
      await firestore.recursiveDelete(firestore.doc(`accounts/${identity.accountId}`));
      await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(identity.uid)}`).delete();
    }
    await deleteApp(firebase);
  } finally {
    // Existing caller-owned and unrelated mappings are never removed.
    if (physicalDevice) await removeCreatedReverses();
  }
}
