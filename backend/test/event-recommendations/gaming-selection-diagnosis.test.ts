import assert from 'node:assert/strict';
import test from 'node:test';
import { FirestorePersonalizedEvents } from '../../src/event-recommendations/infrastructure/firestore-personalized-events.js';
import { RecommendEvents } from '../../src/event-recommendations/application/recommend-events.js';
import { emptyRecommendationProfile } from '../../src/recommendation-profile/domain/recommendation-profile.js';
import { firestoreSocialAuthority } from '../../src/friends/infrastructure/social-authority.js';
import { classifyInterests } from '../../src/event-browse/domain/interest-classification.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import type { BrowseOccurrence } from '../../src/event-browse/ports/event-browse.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import { myFriendsSeed, clock, instant } from '../support/my-friends-fixture.js';

function fixture() {
  const seed = myFriendsSeed(0);
  seed['accounts/owner'] = { ...seed['accounts/owner'], optionalProcessingConsent: 'accepted',
    recommendationProfile: { ...emptyRecommendationProfile, homeAreaCode: 'TM' } };
  seed['account_interests/owner'] = { interestTagIds: ['gaming'], revision: 1 };
  for (const [id, displayName] of [['gaming','Gaming'], ['music','Music']]) {
    seed[`interest_tags/${id}`] = { displayName, lifecycleState: 'active', revision: 1 };
  }
  const store = new InMemoryFirestoreGateway(seed);
  const occurrence = (id: string, music: boolean): BrowseOccurrence => ({
    browseId: browseId(id)!, title: music ? 'Synthetic music event' : 'Synthetic gaming event',
    startAt: '2026-11-20T00:00:00Z', externalSourceUrl: 'https://ticketmaster.sg/event/example',
    ...(music ? { musicSegment: true as const } : {}),
    interestConcepts: classifyInterests([music
      ? { segment: {id: 'KZFzniwnSyZfZ7v7nJ', name: 'Music'} }
      : { genre: {id: 'synthetic-esports', name: 'eSports'} }]),
    content: { provider: 'ticketmaster', sourceId: id, fetchedAt: instant,
      timeZone: 'Asia/Singapore', detailUrl: 'https://ticketmaster.sg/event/example', areaCode: 'TM' },
  });
  const rows = [occurrence('music-candidate', true), occurrence('gaming-candidate', false)];
  const reader = new FirestorePersonalizedEvents(store, firestoreSocialAuthority,
    { read: async () => ({ interestedEventIds: [], goingEventIds: [] }) }, 'music');
  const app = new RecommendEvents({ readForRequester: ({firebaseUid, asOf}) =>
    reader.read(firebaseUid, asOf, {items: rows, current: () => true}) }, clock);
  return { store, rows, read: () => app.execute({principal: {firebaseUid: 'owner'}, view: 'all'}) };
}

test('Gaming-only selection is read freshly and changes the interest ranking and reasons', async () => {
  const f = fixture();
  const gaming = await f.read(); assert.ok(gaming.ok);
  assert.equal(gaming.value.items[0]!.title, 'Synthetic gaming event');
  assert.deepEqual(gaming.value.items[0]!.matchedInterests.map(x => x.displayName), ['Gaming']);
  const music = gaming.value.items.find(x => x.title === 'Synthetic music event')!;
  assert.deepEqual(music.matchedInterests, []);
  assert.deepEqual(music.reasons, [{code: 'same_area', count: 1, points: 2}]);
  await f.store.runTransaction(async tx => tx.set('account_interests/owner', {
    interestTagIds: ['music'], revision: 2,
  }));
  const changed = await f.read(); assert.ok(changed.ok);
  assert.equal(changed.value.items[0]!.title, 'Synthetic music event');
  assert.deepEqual(changed.value.items[0]!.matchedInterests.map(x => x.displayName), ['Music']);
  assert.ok(changed.value.items.every(x => !x.matchedInterests.some(i => i.displayName === 'Gaming')));
});

test('v3 reproduces Music-only recommendations for Gaming selection when source has no Gaming and shares an area', async () => {
  const f = fixture(); f.rows.splice(1);
  const result = await f.read(); assert.ok(result.ok);
  assert.equal(result.value.items.length, 1);
  assert.equal(result.value.items[0]!.title, 'Synthetic music event');
  assert.deepEqual(result.value.items[0]!.matchedInterests, []);
  assert.deepEqual(result.value.items[0]!.reasons, [{code: 'same_area', count: 1, points: 2}]);
  await f.store.runTransaction(async tx => tx.set('accounts/owner', {
    ...f.store.read('accounts/owner'), recommendationProfile: emptyRecommendationProfile,
  }));
  const withoutArea = await f.read(); assert.ok(withoutArea.ok);
  assert.deepEqual(withoutArea.value.items, []);
});
