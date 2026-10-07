import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'node:https';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireControlledEmulatorEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { myFriendsSeed, entryRef } from '../backend/dist/test/support/my-friends-fixture.js';
import { FirebaseAdminFirestoreGateway } from '../backend/dist/src/shared/infrastructure/firebase/firestore-gateway.js';
import { FirebaseIdentityVerifier } from '../backend/dist/src/shared/infrastructure/firebase/firebase-identity-verifier.js';
import { FirestoreFriendRepository, friendPairKey } from '../backend/dist/src/friends/infrastructure/firestore-friend-repository.js';
import { FriendRequests } from '../backend/dist/src/friends/application/friend-requests.js';
import { FirestoreOnboardingRepository } from '../backend/dist/src/onboarding/infrastructure/firestore-onboarding-repository.js';
import { GetOnboarding } from '../backend/dist/src/onboarding/application/get-onboarding.js';
import { FirestoreAccountPreferencesRepository } from '../backend/dist/src/account/infrastructure/firestore-account-preferences-repository.js';
import { OwnAccountPreferences } from '../backend/dist/src/account/application/own-account-preferences.js';
import { SystemClock } from '../backend/dist/src/shared/infrastructure/system-clock.js';
import { buildApp } from '../backend/dist/src/bootstrap/build-app.js';
import { err } from '../backend/dist/src/shared/domain/result.js';
import { appFailure } from '../backend/dist/src/shared/application/app-failure.js';

const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, 'demo-enmori-rmvp01a-r10');
const serial = process.argv[2]; assert.match(serial ?? '', /^emulator-\d+$/);
const directory = process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
const firebase = initializeApp({ projectId: env.projectId }, 'my-friends-android');
const auth = getAuth(firebase), firestore = getFirestore(firebase);
const run = (program, args, quiet = false) => new Promise((done, reject) => {
  // test_core on Windows requires LOCALAPPDATA; keep its discovery inside the
  // same temporary isolated profile rather than inheriting the user's profile.
  const child = spawn(program, args, { env: { ...process.env, LOCALAPPDATA: directory }, stdio: quiet ? 'ignore' : 'inherit', windowsHide: true });
  child.once('error', reject); child.once('exit', code => code === 0 ? done() : reject(new Error(`Test child exited ${code}`)));
});
let app, server;
try {
  const password = `${randomUUID()}Aa1!`;
  for (const [uid, email] of [['owner', 'my-friends-owner@example.invalid'], ['target_1', 'my-friends-peer@example.invalid']]) await auth.createUser({ uid, email, password });
  const seed = myFriendsSeed(42), pairKey = friendPairKey('owner', 'target_1');
  seed[`friend_pairs/${pairKey}`] = { accountIds: ['owner', 'target_1'], blockedByAccountIds: [], friendship: false, pending: null };
  delete seed[`friend_lists/owner/members/${entryRef(1)}`]; delete seed[`friend_lists/target_1/members/${entryRef(1001)}`];
  const batch = firestore.batch(); for (const [path, data] of Object.entries(seed)) batch.create(firestore.doc(path), data); await batch.commit();
  const gateway = new FirebaseAdminFirestoreGateway(firestore), clock = new SystemClock();
  const unavailable = { execute: async () => err(appFailure('SERVICE_UNAVAILABLE')) };
  app = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth), completeOnboarding: unavailable,
    getOnboarding: new GetOnboarding(new FirestoreOnboardingRepository(gateway)),
    getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable,
    createCheckIn: unavailable, getCheckIn: unavailable,
    accountPreferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway)),
    isolatedSlices: { environment: process.env, friends: new FriendRequests(new FirestoreFriendRepository(gateway, clock), clock) },
  });
  const cert = join(directory, 'test-certificate.pem'), key = join(directory, 'test-key.pem');
  await run(process.env.ENMORI_TEST_OPENSSL ?? 'openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key,
    '-out', cert, '-days', '1', '-subj', '/CN=ENMORI isolated test', '-addext', 'subjectAltName=IP:10.0.2.2,IP:127.0.0.1'], true);
  server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, app.routing);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const configuration = join(directory, 'android-fixture.json');
  writeFileSync(configuration, JSON.stringify({ ENMORI_API_BASE_URL: `https://10.0.2.2:${server.address().port}`,
    ENMORI_TEST_PASSWORD: password, ENMORI_TEST_TLS_CERTIFICATE_BASE64: readFileSync(cert).toString('base64') }), { mode: 0o600 });
  assert.ok(process.env.ENMORI_TEST_FLUTTER_DART && process.env.ENMORI_TEST_FLUTTER_SNAPSHOT);
  await run(process.env.ENMORI_TEST_FLUTTER_DART, [process.env.ENMORI_TEST_FLUTTER_SNAPSHOT, 'test',
    'integration_test/my_friends_real_backend_test.dart', '-d', serial, '--no-pub', '--reporter', 'expanded', `--dart-define-from-file=${configuration}`]);
  const pair = (await firestore.doc(`friend_pairs/${pairKey}`).get()).data();
  assert.equal(pair.friendship, true); assert.equal(pair.pending, null);
  for (const id of ['owner', 'target_1']) assert.equal((await firestore.doc(`friend_lists/${id}/members/${pair.listRefs[id]}`).get()).exists, true);
  console.log('MY_FRIENDS_ANDROID_TWO_ACCOUNTS_ATOMIC_POINTER_READBACK: Pass');
} finally {
  if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
  if (app) await app.close();
  for (const uid of ['owner', 'target_1']) await auth.deleteUser(uid).catch(() => {});
  await deleteApp(firebase);
}
