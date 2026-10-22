import test from 'node:test';
import assert from 'node:assert/strict';
import { createControlledEventBrowse } from '../backend/dist/src/bootstrap/controlled-event-browse.js';
import { socialEventSource } from '../backend/dist/src/bootstrap/social-event-source.js';
import { participationKey } from '../backend/dist/src/event-participation/infrastructure/firestore-participation-repository.js';
import { validEventId } from '../backend/dist/src/event-participation/domain/participation-values.js';
import { activityItemSchema } from '../backend/dist/src/friend-activity/transport/friend-activity-route.js';
import { browseId } from '../backend/dist/src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../backend/dist/src/event-browse/domain/source-event-id.js';
import { InMemoryFirestoreGateway } from '../backend/dist/test/support/in-memory-firestore-gateway.js';

const at = '2026-10-22T00:00:00.000Z';
const item = id => ({ browseId: browseId(id), title: `Synthetic ${id}`,
  startAt: '2026-12-01T00:00:00Z',
  externalSourceUrl: 'https://ticketmaster.sg/event/synthetic' });
const id = sourceEventId(browseId('later'));
const key = participationKey('synthetic-owner', id);
const path = `event_participations/${key}`;

async function fixture() {
  let replaced = false;
  const gate = createControlledEventBrowse({
    source: {
      firstBatch: async () => [item('first')],
      batch: async (_asOf, page) => ({ items: [item(page === 0
        ? 'first' : replaced ? 'replacement' : 'later')] }),
      detail: async () => undefined,
    },
    projectionCache: true, running: () => true, track: work => work(),
  });
  gate.enable();
  await gate.source.batch(at, 0, new AbortController().signal);
  await gate.source.batch(at, 1, new AbortController().signal);
  const account = { optionalProcessingConsent: 'accepted', fieldPrivacy: { participation: 'public' } };
  const db = new InMemoryFirestoreGateway({
    'accounts/synthetic-owner': account,
    'friend_access/synthetic-owner': { eligibilityState: 'eligible' },
    [path]: { accountId: 'synthetic-owner', eventId: id, status: 'interested', ignored: false,
      revision: 1, updatedAt: at, selectedAt: at },
  });
  const source = socialEventSource(gate.peek, gate.projectionReady).activity;
  const rows = await db.runTransaction(tx => source.read(tx, 'synthetic-viewer', 'synthetic-owner', at, 'friends_activity_v1'));
  assert.equal(rows.length, 1);
  return {
    gate, db, source, metadata: rows[0], account,
    replaceZero: () => gate.source.batch(at, 0, new AbortController().signal),
    replaceOne: async () => {
      replaced = true;
      await gate.source.batch(at, 1, new AbortController().signal);
    },
    display: () => db.runTransaction(tx => source.display(tx, 'synthetic-viewer', 'synthetic-owner', rows[0], at, 'friends_activity_v1')),
  };
}

test('producer positive: unchanged real canonical ID returns observed page-one title', { timeout: 5000 }, async () => {
  const h = await fixture();
  const result = await h.display();
  assert.deepEqual(result, { eventId: id, title: 'Synthetic later' });
  const schema = activityItemSchema.oneOf[1].properties.event.properties.eventId.pattern;
  // Existing integration mismatch is recorded independently, not attributed to this delta.
  assert.equal(validEventId(id), true);
  assert.equal(new RegExp(schema).test(id), false);
  console.log(JSON.stringify({ case: 'producer-positive', result,
    canonicalAcceptedByEP1: validEventId(id), existingFASchemaAcceptsCanonical: new RegExp(schema).test(id) }));
});

for (const mode of ['disable', 'page-zero-replacement', 'page-one-replacement']) {
  test(`producer ${mode} while participation GET waits must fail unavailable`, { timeout: 5000 }, async () => {
    const h = await fixture();
    const entered = Promise.withResolvers(), release = Promise.withResolvers();
    const display = h.db.runTransaction(tx => h.source.display({
      ...tx, get: async currentPath => {
        if (currentPath === path) {
          entered.resolve();
          await release.promise;
        }
        return tx.get(currentPath);
      },
    }, 'synthetic-viewer', 'synthetic-owner', h.metadata, at, 'friends_activity_v1'));
    try {
      await entered.promise;
      if (mode === 'disable') h.gate.disable();
      else if (mode === 'page-zero-replacement') await h.replaceZero();
      else await h.replaceOne();
      assert.equal(h.db.read(path).status, 'interested');
      assert.equal(h.db.read(path).selectedAt, at);
      assert.equal(h.gate.peek(id, at), undefined);
      release.resolve();
      const observed = display.then(value => {
        console.log(JSON.stringify({ case: mode, resolved: value ?? null,
          stillAuthorizedParticipation: true }));
        return value;
      });
      await assert.rejects(observed, 'Missing source must be unavailable, not revoked participation');
    } finally { release.resolve(); }
  });
}

test('producer privacy control: actual participation visibility revoke remains omitted even with disabled source', { timeout: 5000 }, async () => {
  const h = await fixture();
  await h.db.runTransaction(async tx => {
    tx.set('accounts/synthetic-owner', { ...h.account, fieldPrivacy: { participation: 'private' } });
  });
  h.gate.disable();
  const result = await h.display();
  console.log(JSON.stringify({ case: 'producer-privacy-revoke', omitted: result === undefined }));
  assert.equal(result, undefined);
});
