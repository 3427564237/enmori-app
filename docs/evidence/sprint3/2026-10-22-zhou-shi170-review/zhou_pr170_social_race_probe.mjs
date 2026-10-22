import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { createControlledEventBrowse } from '../backend/dist/src/bootstrap/controlled-event-browse.js';
import { socialEventSource } from '../backend/dist/src/bootstrap/social-event-source.js';
import { FirestoreFriendActivity } from '../backend/dist/src/friend-activity/infrastructure/firestore-friend-activity.js';
import { registerFriendActivity } from '../backend/dist/src/friend-activity/transport/friend-activity-route.js';
import { firestoreSocialAuthority } from '../backend/dist/src/friends/infrastructure/social-authority.js';
import { participationKey } from '../backend/dist/src/event-participation/infrastructure/firestore-participation-repository.js';
import { browseId } from '../backend/dist/src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../backend/dist/src/event-browse/domain/source-event-id.js';
import { ok } from '../backend/dist/src/shared/domain/result.js';
import { InMemoryFirestoreGateway } from '../backend/dist/test/support/in-memory-firestore-gateway.js';
import { myFriendsSeed } from '../backend/dist/test/support/my-friends-fixture.js';

const at = '2026-10-22T00:00:00.000Z';
const item = id => ({
  browseId: browseId(id), title: `Synthetic ${id}`,
  startAt: '2026-12-01T00:00:00Z',
  externalSourceUrl: 'https://ticketmaster.sg/event/synthetic',
});
const laterId = sourceEventId(browseId('later'));
const participationPath = `event_participations/${participationKey('target_1', laterId)}`;

async function fixture({ hold = false, privateTarget = false } = {}) {
  let replaceLater = false;
  const raw = {
    firstBatch: async () => [item('first')],
    batch: async (_asOf, page) => ({ items: [item(page === 0
      ? 'first' : replaceLater ? 'replacement' : 'later')] }),
    detail: async () => undefined,
  };
  const gate = createControlledEventBrowse({
    source: raw, projectionCache: true, running: () => true, track: work => work(),
  });
  gate.enable();
  await gate.source.batch(at, 0, new AbortController().signal);
  await gate.source.batch(at, 1, new AbortController().signal);
  const seed = myFriendsSeed(1);
  for (const id of ['owner', 'target_1']) {
    seed[`accounts/${id}`] = {
      ...seed[`accounts/${id}`], optionalProcessingConsent: 'accepted',
      fieldPrivacy: {
        interests: 'private', location: 'private',
        participation: id === 'target_1' && privateTarget ? 'private' : 'friends_only',
        mapSharedWithFriends: false,
      },
    };
  }
  seed[participationPath] = {
    accountId: 'target_1', eventId: laterId, status: 'interested', ignored: false,
    revision: 1, updatedAt: at, selectedAt: at,
  };
  const store = new InMemoryFirestoreGateway(seed);
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  let held = false;
  const gateway = {
    runTransaction: work => store.runTransaction(tx => work({
      ...tx,
      get: async path => {
        if (hold && !held && path === participationPath) {
          held = true;
          entered.resolve();
          await release.promise;
        }
        return tx.get(path);
      },
    })),
  };
  const producer = socialEventSource(gate.peek, gate.projectionReady);
  const activity = new FirestoreFriendActivity(gateway,
    { now: () => ok(new Date(at)) }, firestoreSocialAuthority, producer.activity);
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
  await registerFriendActivity(app, {
    verifyIdToken: async token => token === 'synthetic'
      ? { kind: 'verified', principal: { firebaseUid: 'owner' } }
      : { kind: 'invalid' },
  }, activity);
  await app.ready();
  return {
    app, gate, store,
    entered: entered.promise, release: () => release.resolve(),
    async replacePageZero() { await gate.source.batch(at, 0, new AbortController().signal); },
    async replacePageOne() {
      replaceLater = true;
      await gate.source.batch(at, 1, new AbortController().signal);
    },
    request: () => app.inject({
      method: 'GET', url: '/v1/me/friends/activity?view=home&category=event_interested',
      headers: { authorization: 'Bearer synthetic' },
    }).then(value => value),
  };
}

test('positive control: unchanged observed title returns one authorized public API activity', { timeout: 5000 }, async () => {
  const h = await fixture();
  try {
    const response = await h.request();
    console.log(JSON.stringify({ case: 'positive', status: response.statusCode, body: response.json() }));
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().activities.length, 1);
    assert.equal(response.json().activities[0].event.eventId, laterId);
    assert.equal(response.headers['cache-control'], 'no-store');
  } finally { await h.app.close(); }
});

for (const mode of ['disable', 'page-zero-replacement', 'page-one-replacement']) {
  test(`authorized participation survives ${mode} during display read: public API must fail unavailable`, { timeout: 5000 }, async () => {
    const h = await fixture({ hold: true });
    try {
      const request = h.request();
      await Promise.race([h.entered, request.then(response => {
        throw new Error(`Display barrier was not reached: ${response.statusCode} ${response.body}`);
      })]);
      if (mode === 'disable') h.gate.disable();
      else if (mode === 'page-zero-replacement') await h.replacePageZero();
      else await h.replacePageOne();
      assert.equal(h.store.read(participationPath).status, 'interested');
      assert.equal(h.store.read(participationPath).selectedAt, at);
      assert.equal(h.gate.peek(laterId, at), undefined);
      h.release();
      const response = await request;
      console.log(JSON.stringify({ case: mode, status: response.statusCode, body: response.json() }));
      assert.equal(response.statusCode, 503, response.body);
      assert.equal(response.json().error.code, 'SERVICE_UNAVAILABLE');
    } finally { h.release(); await h.app.close(); }
  });
}

test('privacy control: revoked participation visibility is an actual empty authorized feed', { timeout: 5000 }, async () => {
  const h = await fixture({ privateTarget: true });
  try {
    h.gate.disable();
    const response = await h.request();
    console.log(JSON.stringify({ case: 'private', status: response.statusCode, body: response.json() }));
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), { activities: [] });
  } finally { await h.app.close(); }
});
