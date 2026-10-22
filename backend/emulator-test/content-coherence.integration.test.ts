import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {initializeApp, deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import Fastify from 'fastify';
import {requireControlledEmulatorEnvironment} from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import {FirebaseAdminFirestoreGateway} from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import {FirebaseIdentityVerifier} from '../src/shared/infrastructure/firebase/firebase-identity-verifier.js';
import {createAuthBindingDocumentId, createIdempotencyIdentity} from '../src/shared/infrastructure/firebase/firestore-records.js';
import {FirebaseAdminCheckInHistoryGateway} from '../src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.js';
import {AesGcmHistoryCursorCodec} from '../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js';
import {FirestoreCheckInRepository} from '../src/check-ins/infrastructure/firestore-check-in-repository.js';
import {CreateCheckIn} from '../src/check-ins/application/create-check-in.js';
import {EditCheckIn} from '../src/check-ins/application/edit-check-in.js';
import {FirestoreCheckInMutations} from '../src/check-ins/infrastructure/firestore-check-in-mutations.js';
import {registerCheckInMutations} from '../src/check-ins/transport/mutation-routes.js';
import {FirestoreAccountPreferencesRepository} from '../src/account/infrastructure/firestore-account-preferences-repository.js';
import {FirestoreFriendRepository, friendPairKey} from '../src/friends/infrastructure/firestore-friend-repository.js';
import {registerSocialModule} from '../src/bootstrap/register-social-module.js';
import {ok} from '../src/shared/domain/result.js';

const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, 'demo-enmori-rmvp01a-r10');

test('two owned identities: current content authority across mutation, pagination and removal', async t => {
  const nonce = randomUUID().replaceAll('-', ''), owner = `cc_o_${nonce}`, peer = `cc_p_${nonce}`;
  const ownerName = `cc_${nonce.slice(0, 14)}a`, peerName = `cc_${nonce.slice(0, 14)}b`;
  const app = initializeApp({projectId: environment.projectId}, `coherence-${nonce}`);
  const auth = getAuth(app), db = getFirestore(app), store = new FirebaseAdminFirestoreGateway(db);
  const owned = new Set<string>(), users: string[] = [], tokens = new Map<string, string>();
  const pairPath = `friend_pairs/${friendPairKey(owner, peer)}`; owned.add(pairPath);
  const server = Fastify({ajv: {customOptions: {removeAdditional: false, coerceTypes: false}}});
  const instant = '2026-10-22T00:00:00.000Z', clock = {now: () => ok(new Date(instant))};
  const fields = {interests: 'private' as const, location: 'friends_only' as const, participation: 'private' as const, mapSharedWithFriends: true};
  const seed = async (path: string, value: Record<string, unknown>) => { owned.add(path); await db.doc(path).create(value); };
  const request = (uid: string, method: 'GET' | 'PUT' | 'DELETE', url: string, payload?: Record<string, unknown>) => server.inject({method, url, headers: {authorization: `Bearer ${tokens.get(uid)}`}, ...(payload ? {payload} : {})});
  const person = `/v1/people/${ownerName}`;
  const month = `${person}/calendar-map?month=2026-10&timeZone=UTC`;
  const history = `${person}/check-ins?date=2026-10-22&timeZone=UTC`;
  const activity = '/v1/me/friends/activity?view=all&category=check_in_created';
  let id = '', revision = 1;
  try {
    for (const [uid, username] of [[owner, ownerName], [peer, peerName]] as const) {
      users.push(uid); await auth.createUser({uid});
      await seed(`auth_bindings/${createAuthBindingDocumentId(uid)}`, {accountId: uid});
      await seed(`accounts/${uid}`, {username, displayName: username, profileVisibility: 'friends_only', profileRevision: 1,
        optionalProcessingConsent: 'accepted', checkInVisibility: 'private', onboardingCompletedAt: instant, fieldPrivacy: fields});
      await seed(`friend_access/${uid}`, {eligibilityState: 'eligible'});
      await seed(`friend_lists/${uid}`, {initialized: true});
      await seed(`username_reservations/${username}`, {accountId: uid});
      const custom = await auth.createCustomToken(uid);
      const signed = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=controlled-emulator-key`, {
        method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({token: custom, returnSecureToken: true}),
      });
      assert.equal(signed.status, 200); tokens.set(uid, (await signed.json() as {idToken: string}).idToken);
    }
    const friends = new FirestoreFriendRepository(store, clock);
    assert.equal((await friends.lookup(owner, peerName, true)).ok, true);
    const inbox = await friends.inbox(peer); assert.ok(inbox.ok);
    const ref = inbox.value.requests[0]!.requestRef; owned.add(`friend_inboxes/${peer}/requests/${ref}`);
    assert.equal((await friends.act(peer, ref, 'accept')).ok, true);
    const identity = new FirebaseIdentityVerifier(auth);
    await registerSocialModule(server, {identity, store, clock, history: new FirebaseAdminCheckInHistoryGateway(db), cursor: new AesGcmHistoryCursorCodec(Buffer.alloc(32, 23)), weather: {current: async () => { throw new Error('No weather call authorized by this fixture'); }}});
    await registerCheckInMutations(server, identity, new EditCheckIn(new FirestoreCheckInMutations(store)));
    const creation = new CreateCheckIn(new FirestoreCheckInRepository(store), clock, {generate: () => { id = `cc_${nonce}`; owned.add(`check_ins/${id}`); return ok(id); }});
    const key = `CC_${nonce}`; owned.add(`idempotency/${createIdempotencyIdentity({scope: owner, operation: 'create_check_in', rawKey: key}).documentId}`);
    const saved = await creation.execute({principal: {firebaseUid: owner}, note: 'Synthetic shared record', idempotencyKey: key, checkInVisibility: 'friends_only', location: {latitude: 1, longitude: 2}});
    assert.ok(saved.ok); id = saved.value.checkIn.checkInId;
    const edit = async (extra: Record<string, unknown>) => {
      const response = await request(owner, 'PUT', `/v1/check-ins/${id}`, {note: 'Synthetic shared record', checkInVisibility: 'friends_only', expectedRevision: revision, ...extra});
      assert.equal(response.statusCode, 200, response.body); revision = response.json().checkIn.revision;
    };
    await t.test('owner save is independently readable by peer; old records without newer fields stay conservative', async () => {
      const read = await request(peer, 'GET', `${person}/check-ins/${id}`); assert.equal(read.statusCode, 200); assert.equal(read.json().checkIn.location.latitude, 1);
      const legacy = `${id}_legacy`; await seed(`check_ins/${legacy}`, {ownerAccountId: owner, note: 'Legacy synthetic', createdAt: instant});
      assert.equal((await request(owner, 'GET', `${person}/check-ins/${legacy}`)).statusCode, 200);
      assert.equal((await request(peer, 'GET', `${person}/check-ins/${legacy}`)).statusCode, 404);
      // Enough explicit synthetic rows for an actual cursor, not fabricated pagination.
      for (let i = 0; i < 21; i++) await seed(`check_ins/${id}_${i}`, {ownerAccountId: owner, note: 'Private synthetic', createdAt: instant, checkInVisibility: 'private'});
    });
    await t.test('privacy change retires exact ID, current month/activity and a previously issued history cursor', async () => {
      const page = await request(peer, 'GET', history); assert.equal(page.statusCode, 200); const cursor: string = page.json().nextCursor; assert.equal(typeof cursor, 'string');
      await edit({checkInVisibility: 'private'});
      assert.equal((await request(peer, 'GET', `${person}/check-ins/${id}`)).statusCode, 404);
      const current = await request(peer, 'GET', month); assert.equal(current.statusCode, 200); assert.equal(current.json().points.length, 0); assert.equal(current.json().days.reduce((sum: number, day: {count: number}) => sum + day.count, 0), 0);
      const continued = await request(peer, 'GET', `${history}&cursor=${encodeURIComponent(cursor)}`); assert.equal(continued.statusCode, 200); assert.deepEqual(continued.json().checkIns, []);
      assert.deepEqual((await request(peer, 'GET', activity)).json().activities, []);
    });
    await t.test('replace/remove location and saved map-sharing withdrawal each change fresh projections', async () => {
      await edit({location: {latitude: 3, longitude: 4}});
      assert.equal((await request(peer, 'GET', month)).json().points[0].location.latitude, 3);
      await edit({location: null}); assert.deepEqual((await request(peer, 'GET', month)).json().points, []);
      assert.equal((await request(peer, 'GET', `${person}/check-ins/${id}`)).json().checkIn.location, undefined);
      await edit({location: {latitude: 5, longitude: 6}});
      const prefs = new FirestoreAccountPreferencesRepository(store);
      const settings = await prefs.saveSettings(owner, {expectedRevision: 0, checkInVisibility: 'private', optionalProcessingConsent: 'accepted', fieldPrivacy: {...fields, mapSharedWithFriends: false}}); assert.equal(settings.kind, 'saved');
      const reread = await prefs.getSettings(owner); assert.equal(reread.kind, 'found'); if (reread.kind === 'found') assert.equal(reread.value.fieldPrivacy?.mapSharedWithFriends, false);
      assert.deepEqual((await request(peer, 'GET', month)).json().points, []);
      assert.equal((await request(peer, 'GET', `${person}/check-ins/${id}`)).json().checkIn.location, undefined);
      assert.equal((await request(owner, 'GET', `${person}/check-ins/${id}`)).json().checkIn.location.latitude, 5);
    });
    await t.test('failed delete preserves record; confirmed delete removes current shared record and activity', async () => {
      const denied = await request(peer, 'DELETE', `/v1/check-ins/${id}`, {expectedRevision: revision}); assert.equal(denied.statusCode, 404);
      const stale = await request(owner, 'DELETE', `/v1/check-ins/${id}`, {expectedRevision: 1}); assert.equal(stale.statusCode, 412);
      assert.equal((await request(owner, 'GET', `${person}/check-ins/${id}`)).statusCode, 200);
      assert.equal((await request(owner, 'DELETE', `/v1/check-ins/${id}`, {expectedRevision: revision})).statusCode, 200);
      assert.equal((await request(owner, 'GET', `${person}/check-ins/${id}`)).statusCode, 404);
      assert.equal((await request(peer, 'GET', `${person}/check-ins/${id}`)).statusCode, 404);
      assert.deepEqual((await request(peer, 'GET', activity)).json().activities, []);
    });
    await t.test('relationship removal rejects both peer projections and issued cursor with no list ghosts', async () => {
      const pair = (await db.doc(pairPath).get()).data()!;
      for (const [uid, ref] of Object.entries(pair.listRefs)) owned.add(`friend_lists/${uid}/members/${ref}`);
      const p = await request(peer, 'GET', person); assert.equal(p.statusCode, 200);
      const removed = await request(peer, 'DELETE', `/v1/me/friends/${ownerName}`, {expectedRevision: p.json().friendshipRevision}); assert.equal(removed.statusCode, 200, removed.body);
      assert.equal((await request(peer, 'GET', person)).statusCode, 404);
      assert.equal((await request(owner, 'GET', `/v1/people/${peerName}`)).statusCode, 404);
      assert.equal((await request(peer, 'GET', history)).statusCode, 404);
      for (const uid of [owner, peer]) assert.equal((await db.collection(`friend_lists/${uid}/members`).get()).empty, true);
    });
  } finally {
    await server.close(); const pair = (await db.doc(pairPath).get()).data();
    if (pair?.listRefs) for (const [uid, ref] of Object.entries(pair.listRefs)) { assert.ok(uid === owner || uid === peer); owned.add(`friend_lists/${uid}/members/${ref}`); }
    if (pair?.pending?.requestRef) owned.add(`friend_inboxes/${pair.pending.recipientAccountId}/requests/${pair.pending.requestRef}`);
    for (const path of owned) await db.doc(path).delete();
    for (const uid of users) await auth.deleteUser(uid);
    assert.equal((await Promise.all([...owned].map(path => db.doc(path).get()))).some(doc => doc.exists), false);
    await deleteApp(app); console.log(`coherence cleanup: ${owned.size} owned documents and ${users.length} Auth users removed`);
  }
});
