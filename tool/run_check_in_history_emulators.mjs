import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { dirname, resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  buildControlledEmulatorTestEnvironment,
  requireControlledEmulatorEnvironment,
} from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

assert.equal(process.version, 'v24.19.0', 'Use the pinned Backend runtime');
const serial = process.argv.at(-1);
assert.match(serial ?? '', /^[A-Za-z0-9._:-]+$/, 'An authorized Android device is required');

function run(program, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(program, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolveRun() : reject(new Error(`Child exited ${code}: ${program}`)));
  });
}

function capture(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${program} failed: ${result.stderr}`);
  return result.stdout.trim();
}

if (!['--fixture', '--isolated'].includes(process.argv[2])) {
  const privateDirectory = mkdtempSync(join(resolve('.codex-appdata'), 'enmori-history-'));
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
    env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH ?? join(process.env.HOME, '.cache/firebase/emulators');
    env.ENMORI_CAPTURE_DEVICE_SCREENSHOTS = process.env.ENMORI_CAPTURE_DEVICE_SCREENSHOTS ?? 'false';
    env.ENMORI_TEST_PRIVATE_DIRECTORY = privateDirectory;
    env.LOCALAPPDATA = join(privateDirectory, 'localappdata');
    mkdirSync(env.LOCALAPPDATA);
    env.DART_TEST_CONFIG = join(privateDirectory, 'DartTest.yaml');
    writeFileSync(env.DART_TEST_CONFIG, '');
    env['ProgramFiles(x86)'] ??= 'C:\\Program Files (x86)';
    const androidUserHome = join(privateDirectory, 'android-user-home');
    mkdirSync(androidUserHome);
    env.JAVA_TOOL_OPTIONS = `-Duser.home=${androidUserHome.replaceAll('\\', '/')}`;
    env.ANDROID_USER_HOME = androidUserHome;
    env.ENMORI_TEST_FLUTTER = realpathSync(process.env.ENMORI_TEST_FLUTTER);
    env.ENMORI_TEST_ADB = realpathSync(process.env.ENMORI_TEST_ADB);
    env.ANDROID_HOME = realpathSync(process.env.ANDROID_HOME);
    env.JAVA_HOME = realpathSync(process.env.JAVA_HOME);
    env.PUB_CACHE = realpathSync(process.env.PUB_CACHE);
    env.GRADLE_USER_HOME = realpathSync(process.env.GRADLE_USER_HOME);
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = 'safe.directory';
    env.GIT_CONFIG_VALUE_0 = dirname(dirname(env.ENMORI_TEST_FLUTTER));
    const quote = process.platform === 'win32'
      ? (value) => `"${value.replaceAll('"', '\\"')}"`
      : (value) => `'${value.replaceAll("'", "'\\''")}'`;
    await run(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
      'emulators:exec', '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore',
      '--config', 'firebase.json', '--non-interactive',
      [process.execPath, resolve('tool/run_check_in_history_emulators.mjs'), '--fixture', serial].map(quote).join(' '),
    ], { env });
  } finally {
    rmSync(privateDirectory, { recursive: true, force: true });
  }
} else if (process.argv[2] === '--fixture') {
  const env = buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  for (const name of ['ENMORI_TEST_PRIVATE_DIRECTORY', 'ENMORI_TEST_FLUTTER',
    'ENMORI_TEST_ADB', 'ANDROID_HOME', 'JAVA_HOME', 'PUB_CACHE', 'GRADLE_USER_HOME',
    'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'LOCALAPPDATA',
    'DART_TEST_CONFIG', 'ProgramFiles(x86)', 'JAVA_TOOL_OPTIONS', 'ANDROID_USER_HOME',
    'ENMORI_CAPTURE_DEVICE_SCREENSHOTS']) {
    env[name] = process.env[name];
  }
  await run(process.execPath, [resolve('tool/run_check_in_history_emulators.mjs'), '--isolated', serial], { env });
} else {
  const environment = requireControlledEmulatorEnvironment(process.env);
  assert.equal(environment.projectId, 'demo-enmori-rmvp01a-r10');
  const directory = process.env.ENMORI_TEST_PRIVATE_DIRECTORY;
  assert.equal(directory, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  const adb = process.env.ENMORI_TEST_ADB;
  const api = Number(capture(adb, ['-s', serial, 'shell', 'getprop', 'ro.build.version.sdk']));
  const isEmulator = capture(adb, ['-s', serial, 'shell', 'getprop', 'ro.kernel.qemu']) === '1';
  assert.ok(api >= 35, 'Android API 35 or newer is required');
  if (isEmulator) assert.equal(api, 36, 'Use the isolated API 36 AVD');
  const zone = capture(adb, ['-s', serial, 'shell', 'getprop', 'persist.sys.timezone']);
  assert.ok(zone.length > 0 && zone.includes('/'), 'The device must expose a regional IANA zone');
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const dateMap = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
  const date = `${dateMap.year}-${dateMap.month}-${dateMap.day}`;
  const targetLocalNoon = Date.UTC(Number(dateMap.year), Number(dateMap.month) - 1, Number(dateMap.day), 12);
  const localParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let localNoonUtc = targetLocalNoon;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(localParts.formatToParts(new Date(localNoonUtc)).map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    localNoonUtc += targetLocalNoon - representedAsUtc;
  }

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
  const { FirestoreCheckInHistoryRepository } = await load('check-ins/infrastructure/firestore-check-in-history-repository');
  const { FirebaseAdminCheckInHistoryGateway } = await load('check-ins/infrastructure/firebase-admin-check-in-history-gateway');
  const { ListOwnCheckInsForDate } = await load('check-ins/application/check-in-history');
  const { createHistoryCursorCodec } = await load('check-ins/infrastructure/aes-gcm-history-cursor-codec');
  const { CompleteOnboarding } = await load('onboarding/application/complete-onboarding');
  const { GetOnboarding } = await load('onboarding/application/get-onboarding');
  const { CreateCheckIn } = await load('check-ins/application/create-check-in');
  const { GetCheckIn } = await load('check-ins/application/get-check-in');
  const { GetInterestTags } = await load('interests/application/get-interest-tags');
  const { GetOwnInterests } = await load('interests/application/get-own-interests');
  const { ReplaceOwnInterests } = await load('interests/application/replace-own-interests');
  const { CryptoOpaqueIdGenerator } = await load('shared/infrastructure/crypto-opaque-id-generator');
  const { SystemClock } = await load('shared/infrastructure/system-clock');

  const firebase = initializeApp({ projectId: environment.projectId }, 's3-history-fixture');
  const auth = getAuth(firebase);
  const firestore = getFirestore(firebase);
  const uid = `s3-history-${randomBytes(6).toString('hex')}`;
  const email = `${uid}@example.invalid`;
  const password = `${randomUUID()}Aa1!`;
  const username = `history_${randomBytes(6).toString('hex')}`;
  let app;
  let server;
  let accountId;
  const reversedPorts = [];
  try {
    const gateway = new FirebaseAdminFirestoreGateway(firestore);
    const onboarding = new FirestoreOnboardingRepository(gateway);
    const checkIns = new FirestoreCheckInRepository(gateway);
    const history = new FirestoreCheckInHistoryRepository(new FirebaseAdminCheckInHistoryGateway(firestore));
    const interests = new FirestoreInterestRepository(gateway);
    const clock = new SystemClock();
    const ids = new CryptoOpaqueIdGenerator();
    const completeOnboarding = new CompleteOnboarding(onboarding, clock, ids);
    app = await buildApp({
      identityVerifier: new FirebaseIdentityVerifier(auth),
      completeOnboarding,
      getOnboarding: new GetOnboarding(onboarding),
      createCheckIn: new CreateCheckIn(checkIns, clock, ids),
      getCheckIn: new GetCheckIn(checkIns),
      listOwnCheckInsForDate: new ListOwnCheckInsForDate(history, createHistoryCursorCodec(), clock),
      getInterestTags: new GetInterestTags(interests),
      getOwnInterests: new GetOwnInterests(interests),
      replaceOwnInterests: new ReplaceOwnInterests(interests),
    });
    await auth.createUser({ uid, email, password });
    const completion = await completeOnboarding.execute({
      principal: { firebaseUid: uid },
      username,
      initialChoice: 'reject',
      idempotencyKey: randomBytes(24).toString('base64url'),
    });
    assert.equal(completion.ok, true, 'Synthetic owner onboarding succeeds');
    const { createAuthBindingDocumentId } = await load('shared/infrastructure/firebase/firestore-records');
    accountId = (await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(uid)}`).get()).data()?.accountId;
    assert.equal(typeof accountId, 'string');

    const records = Array.from({ length: 22 }, (_, index) => ({
      id: `history_${String(index).padStart(2, '0')}`,
      note: `Synthetic footprint ${String(index).padStart(2, '0')}`,
      createdAt: new Date(localNoonUtc - index * 60_000).toISOString(),
      checkInVisibility: index % 2 === 0 ? 'private' : 'friends_only',
    }));
    const batch = firestore.batch();
    for (const record of records) {
      batch.create(firestore.doc(`check_ins/${record.id}`), {
        ownerAccountId: accountId,
        note: record.note,
        createdAt: record.createdAt,
        checkInVisibility: record.checkInVisibility,
      });
    }
    await batch.commit();

    const certificate = join(directory, 'certificate.pem');
    const key = join(directory, 'key.pem');
    const keystore = join(directory, 'test-certificate.p12');
    const storePassword = randomUUID();
    const keytool = join(process.env.JAVA_HOME, 'bin', 'keytool.exe');
    const java = join(process.env.JAVA_HOME, 'bin', 'java.exe');
    await run(keytool, [
      '-genkeypair', '-alias', 'AndroidDebugKey', '-keyalg', 'RSA', '-keysize', '2048',
      '-validity', '10000', '-storetype', 'JKS',
      '-keystore', join(process.env.ANDROID_USER_HOME, 'debug.keystore'),
      '-storepass', 'android', '-keypass', 'android',
      '-dname', 'CN=Android Debug,O=Android,C=US', '-noprompt',
    ], { stdio: 'ignore' });
    await run(keytool, [
      '-genkeypair', '-alias', 'history-test', '-keyalg', 'RSA', '-keysize', '2048',
      '-validity', '1', '-storetype', 'PKCS12', '-keystore', keystore,
      '-storepass', storePassword, '-keypass', storePassword,
      '-dname', 'CN=ENMORI isolated history test',
      '-ext', 'SAN=IP:10.0.2.2,IP:127.0.0.1', '-noprompt',
    ], { stdio: 'ignore' });
    await run(java, [resolve('tool/ExportPkcs12Pem.java'), keystore, storePassword, key, certificate], { stdio: 'ignore' });
    server = createServer({ key: readFileSync(key), cert: readFileSync(certificate) }, app.routing);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const apiPort = server.address().port;
    const existingReverses = capture(adb, ['-s', serial, 'reverse', '--list']);
    for (const port of [9099, apiPort]) {
      assert.ok(!existingReverses.includes(`tcp:${port}`), `ADB reverse port ${port} is already in use`);
      await run(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
      reversedPorts.push(port);
    }
    const configuration = join(directory, 'fixture.json');
    writeFileSync(configuration, JSON.stringify({
      ENMORI_API_BASE_URL: `https://127.0.0.1:${apiPort}`,
      ENMORI_FIREBASE_API_KEY: 'controlled-emulator-key',
      ENMORI_FIREBASE_APP_ID: '1:1234567890:android:historytest',
      ENMORI_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      ENMORI_FIREBASE_PROJECT_ID: environment.projectId,
      ENMORI_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1',
      ENMORI_FIREBASE_AUTH_EMULATOR_PORT: '9099',
      ENMORI_TEST_EMAIL: email,
      ENMORI_TEST_PASSWORD: password,
      ENMORI_EXPECTED_DEVICE_ZONE: zone,
      ENMORI_EXPECTED_DEVICE_DATE: date,
      ENMORI_TEST_TLS_CERTIFICATE_BASE64: readFileSync(certificate).toString('base64'),
    }), { mode: 0o600 });

    const captureScreenshots = process.env.ENMORI_CAPTURE_DEVICE_SCREENSHOTS === 'true';
    const testTarget = 'integration_test/s3_check_in_history_real_backend_test.dart';
    const flutter = process.env.ENMORI_TEST_FLUTTER;
    const defines = [`--dart-define-from-file=${configuration}`];
    if (captureScreenshots) {
      await run(flutter, [
        'build', 'apk', '--debug', '--no-pub', `--target=${testTarget}`,
        ...defines,
        '--dart-define=ENMORI_CAPTURE_DEVICE_SCREENSHOTS=true',
        ...(isEmulator ? [] : ['--android-project-arg=historyTestApplicationIdSuffix=.historytest']),
      ], {
        env: {
          ...process.env,
          JAVA_HOME: process.env.JAVA_HOME,
          ANDROID_HOME: process.env.ANDROID_HOME,
          ...(isEmulator ? {} : { ORG_GRADLE_PROJECT_historyTestApplicationIdSuffix: '.historytest' }),
        },
        shell: process.platform === 'win32' });
      if (!isEmulator) {
        const metadata = JSON.parse(readFileSync(resolve('build/app/outputs/apk/debug/output-metadata.json'), 'utf8'));
        assert.equal(metadata.applicationId, 'com.enmori.app.historytest', 'Do not install the test APK over the app package');
      }
    }
    const flutterArgs = captureScreenshots
      ? ['drive', '--driver=test_driver/integration_test.dart', `--target=${testTarget}`,
        `--use-application-binary=${resolve('build/app/outputs/flutter-apk/app-debug.apk')}`,
        '-d', serial, '--no-pub', '--timeout=180']
      : ['test', testTarget, '-d', serial, '--no-pub', '--reporter', 'expanded', ...defines];
    await run(flutter, flutterArgs, {
      env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME, ANDROID_HOME: process.env.ANDROID_HOME },
      shell: process.platform === 'win32' });

    const snapshot = await firestore.collection('check_ins').where('ownerAccountId', '==', accountId).get();
    assert.equal(snapshot.size, records.length, 'Android history performs only reads');
    const returned = snapshot.docs.map((doc) => ({
      id: doc.id,
      note: doc.get('note'),
      createdAt: doc.get('createdAt'),
      checkInVisibility: doc.get('checkInVisibility'),
    })).sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(returned, records);
    console.log(`S3_HISTORY_HOST_READBACK_PASS ownerRows=${snapshot.size} date=${date} zone=${zone}`);
  } finally {
    for (const port of reversedPorts.reverse()) {
      await run(adb, ['-s', serial, 'reverse', '--remove', `tcp:${port}`]).catch(() => {});
    }
    if (server) {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
    if (app) await app.close();
    if (uid) await auth.deleteUser(uid).catch(() => {});
    if (accountId) {
      const checkIns = await firestore.collection('check_ins').where('ownerAccountId', '==', accountId).get().catch(() => null);
      if (checkIns) await Promise.all(checkIns.docs.map((doc) => doc.ref.delete()));
      await firestore.doc(`accounts/${accountId}`).delete().catch(() => {});
      const { createAuthBindingDocumentId } = await load('shared/infrastructure/firebase/firestore-records');
      await firestore.doc(`auth_bindings/${createAuthBindingDocumentId(uid)}`).delete().catch(() => {});
      await firestore.doc(`username_reservations/${username}`).delete().catch(() => {});
    }
    await deleteApp(firebase);
  }
}

