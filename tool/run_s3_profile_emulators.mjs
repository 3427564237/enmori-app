// Test-only reproduction of the existing R13/S2 Android Emulator boundary.
// Run after the pinned Backend build and Flutter dependency resolution.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { buildControlledEmulatorTestEnvironment, requireControlledEmulatorEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

assert.equal(process.version, 'v24.19.0', 'Use the pinned Backend runtime');
const serial = process.argv.at(-1);
assert.match(serial ?? '', /^emulator-\d+$/, 'An isolated Android Emulator is required');
const run = (program, args, options = {}) => new Promise((resolveRun, reject) => {
  const child = spawn(program, args, { stdio: 'inherit', ...options });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolveRun() : reject(new Error(`Test child exited ${code}`)));
});

if (!['--fixture', '--isolated'].includes(process.argv[2])) {
  const privateDirectory = mkdtempSync(join(tmpdir(), 'enmori-s3-profile-'));
  try {
    const env = buildControlledEmulatorTestEnvironment({
      ...process.env,
      GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    }, privateDirectory);
    env.CI = 'true';
    env.FIREBASE_CLI_DISABLE_USAGE = 'true';
    // Cache and tool paths only; no real Firebase profile/credentials inherited.
    env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH ?? join(process.env.HOME, '.cache/firebase/emulators');
    env.ENMORI_TEST_PRIVATE_DIRECTORY = privateDirectory;
    env.ENMORI_TEST_FLUTTER = realpathSync('.fvm/flutter_sdk/bin/flutter');
    env.ANDROID_HOME = process.env.ANDROID_HOME ?? join(process.env.HOME, 'Android/Sdk');
    env.PUB_CACHE = process.env.PUB_CACHE ?? join(process.env.HOME, '.pub-cache');
    env.GRADLE_USER_HOME = process.env.GRADLE_USER_HOME ?? join(process.env.HOME, '.gradle');
    const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
    await run(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
      'emulators:exec', '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore',
      '--config', 'firebase.json', '--non-interactive',
      [process.execPath, resolve('tool/run_s3_profile_emulators.mjs'), '--fixture', serial].map(quote).join(' '),
    ], { env });
  } finally {
    // Only this newly-created private temporary directory is removed.
    rmSync(privateDirectory, { recursive: true, force: true });
  }
} else if (process.argv[2] === '--fixture') {
  // Firebase CLI injects FIREBASE_CONFIG for its child. Reapply the existing
  // allowlist before the SDK boundary, as run-emulator-tests.mjs does.
  const env = buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  for (const name of ['ENMORI_TEST_PRIVATE_DIRECTORY', 'ENMORI_TEST_FLUTTER',
    'ANDROID_HOME', 'PUB_CACHE', 'GRADLE_USER_HOME']) env[name] = process.env[name];
  await run(process.execPath, [resolve('tool/run_s3_profile_emulators.mjs'), '--isolated', serial], { env });
} else {
  const environment = requireControlledEmulatorEnvironment(process.env);
  assert.equal(environment.projectId, 'demo-enmori-rmvp01a-r10');
  const directory = process.env.ENMORI_TEST_PRIVATE_DIRECTORY;
  assert.equal(directory, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  const load = (path) => import(new URL(`../backend/dist/src/${path}.js`, import.meta.url));
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { buildApp } = await load('bootstrap/build-app');
  const { FirebaseAdminFirestoreGateway } = await load('shared/infrastructure/firebase/firestore-gateway');
  const { FirebaseIdentityVerifier } = await load('shared/infrastructure/firebase/firebase-identity-verifier');
  const { FirestoreOnboardingRepository } = await load('onboarding/infrastructure/firestore-onboarding-repository');
  const { FirestoreInterestRepository } = await load('interests/infrastructure/firestore-interest-repository');
  const { FirestoreCheckInRepository } = await load('check-ins/infrastructure/firestore-check-in-repository');
  const { FirestoreEventRecommendationRepository } = await load('event-recommendations/infrastructure/firestore-event-recommendation-repository');
  const { FirebaseAdminEventReadGateway } = await load('event-recommendations/infrastructure/event-read-gateway');
  const { CryptoOpaqueIdGenerator } = await load('shared/infrastructure/crypto-opaque-id-generator');
  const { SystemClock } = await load('shared/infrastructure/system-clock');
  const firebase = initializeApp({ projectId: environment.projectId }, 's3-profile-fixture');
  const auth = getAuth(firebase);
  const firestore = getFirestore(firebase);
  let app, server;
  const uid = `s3-profile-${randomBytes(6).toString('hex')}`;
  const email = `${uid}@example.invalid`;
  const password = `${randomUUID()}Aa1!`;
  const username = `s3_${randomBytes(6).toString('hex')}`;
  try {
    const gateway = new FirebaseAdminFirestoreGateway(firestore);
    const onboarding = new FirestoreOnboardingRepository(gateway);
    const interests = new FirestoreInterestRepository(gateway);
    const checkIns = new FirestoreCheckInRepository(gateway);
    const clock = new SystemClock();
    const ids = new CryptoOpaqueIdGenerator();
    const use = async (path, name, ...args) => new (await load(path))[name](...args);
    const completeOnboarding = await use('onboarding/application/complete-onboarding', 'CompleteOnboarding', onboarding, clock, ids);
    app = await buildApp({
      identityVerifier: new FirebaseIdentityVerifier(auth), completeOnboarding,
      getOnboarding: await use('onboarding/application/get-onboarding', 'GetOnboarding', onboarding),
      getInterestTags: await use('interests/application/get-interest-tags', 'GetInterestTags', interests),
      getOwnInterests: await use('interests/application/get-own-interests', 'GetOwnInterests', interests),
      replaceOwnInterests: await use('interests/application/replace-own-interests', 'ReplaceOwnInterests', interests),
      createCheckIn: await use('check-ins/application/create-check-in', 'CreateCheckIn', checkIns, clock, ids),
      getCheckIn: await use('check-ins/application/get-check-in', 'GetCheckIn', checkIns),
      recommendEvents: await use('event-recommendations/application/recommend-events', 'RecommendEvents',
        new FirestoreEventRecommendationRepository(new FirebaseAdminEventReadGateway(firestore)), clock),
    });
    await auth.createUser({ uid, email, password });
    const completed = await completeOnboarding.execute({ principal: { firebaseUid: uid }, username,
      initialChoice: 'reject', idempotencyKey: randomBytes(24).toString('base64url') });
    assert.equal(completed.ok, true);
    // Public onboarding deliberately omits AccountId. Resolve the existing
    // binding inside this test fixture; never infer it from the public DTO.
    const { createAuthBindingDocumentId } = await load('shared/infrastructure/firebase/firestore-records');
    const accountId = (await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(uid)}`).get()).data().accountId;
    assert.equal(typeof accountId, 'string');
    const batch = firestore.batch();
    batch.create(firestore.doc('interest_tags/interest_music'), { displayName: 'Music fixture', lifecycleState: 'active', revision: 1 });
    batch.create(firestore.doc('interest_tags/interest_inactive'), { displayName: 'Inactive fixture', lifecycleState: 'inactive', revision: 1 });
    batch.create(firestore.doc(`account_interests/${accountId}`), { interestTagIds: ['interest_inactive'], revision: 1 });
    batch.create(firestore.doc('events/s3_profile_event'), {
      title: 'Synthetic Profile event', active: true, published: true,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 172800000).toISOString(), interestTagIds: ['interest_music'],
    });
    await batch.commit();
    const cert = join(directory, 'certificate.pem'), key = join(directory, 'key.pem');
    await run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key,
      '-out', cert, '-days', '1', '-subj', '/CN=ENMORI isolated test',
      '-addext', 'subjectAltName=IP:10.0.2.2,IP:127.0.0.1'], { stdio: 'ignore' });
    server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, app.routing);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const configuration = join(directory, 'fixture.json');
    writeFileSync(configuration, JSON.stringify({
      ENMORI_API_BASE_URL: `https://10.0.2.2:${server.address().port}`,
      ENMORI_FIREBASE_API_KEY: 'controlled-emulator-key',
      ENMORI_FIREBASE_APP_ID: '1:1234567890:android:controlledtest',
      ENMORI_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      ENMORI_FIREBASE_PROJECT_ID: environment.projectId,
      ENMORI_FIREBASE_AUTH_EMULATOR_HOST: '10.0.2.2',
      ENMORI_FIREBASE_AUTH_EMULATOR_PORT: '9099',
      ENMORI_TEST_EMAIL: email, ENMORI_TEST_PASSWORD: password, ENMORI_TEST_USERNAME: username,
      ENMORI_TEST_INTEREST_TAG_ID: 'interest_music',
      ENMORI_TEST_TLS_CERTIFICATE_BASE64: readFileSync(cert).toString('base64'),
    }), { mode: 0o600 });
    await run(process.env.ENMORI_TEST_FLUTTER, ['test', 'integration_test/s3_own_profile_real_backend_test.dart',
      '-d', serial, '--no-pub', '--reporter', 'expanded', `--dart-define-from-file=${configuration}`]);
    const stored = (await firestore.doc(`account_interests/${accountId}`).get()).data();
    assert.deepEqual(stored, { interestTagIds: [], revision: 3 });
    console.log('S3_PROFILE_PERSISTED_EMPTY_REVISION_3: Pass');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    if (app) await app.close();
    await auth.deleteUser(uid).catch(() => {});
    await deleteApp(firebase);
  }
}
