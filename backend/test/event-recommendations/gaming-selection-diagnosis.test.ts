import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { FirestorePersonalizedEvents } from '../../src/event-recommendations/infrastructure/firestore-personalized-events.js';
import { RecommendEvents } from '../../src/event-recommendations/application/recommend-events.js';
import { emptyRecommendationProfile } from '../../src/recommendation-profile/domain/recommendation-profile.js';
import { firestoreSocialAuthority } from '../../src/friends/infrastructure/social-authority.js';
import { classifyInterests } from '../../src/event-browse/domain/interest-classification.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../../src/event-browse/domain/source-event-id.js';
import { registerEventRecommendationRoute } from '../../src/event-recommendations/transport/register-route.js';
import type { BrowseOccurrence } from '../../src/event-browse/ports/event-browse.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import { myFriendsSeed, clock, instant } from '../support/my-friends-fixture.js';

function fixture(visibleFriends = 0) {
  const seed = myFriendsSeed(visibleFriends);
  seed['accounts/owner'] = { ...seed['accounts/owner'], optionalProcessingConsent: 'accepted',
    recommendationProfile: { ...emptyRecommendationProfile, homeAreaCode: 'TM' } };
  seed['account_interests/owner'] = { interestTagIds: ['gaming'], revision: 1 };
  for (const [id, displayName] of [['gaming','Gaming'], ['music','Music']]) {
    seed[`interest_tags/${id}`] = { displayName, lifecycleState: 'active', revision: 1 };
  }
  for (let n = 1; n <= visibleFriends; n++) {
    seed[`accounts/target_${n}`] = { ...seed[`accounts/target_${n}`],
      optionalProcessingConsent: 'accepted',
      fieldPrivacy: { interests: 'private', location: 'private', participation: 'friends_only', mapSharedWithFriends: false } };
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
    { read: async () => ({ interestedEventIds: visibleFriends ? [sourceEventId(rows[0]!.browseId)] : [], goingEventIds: [] }) }, 'music');
  const app = new RecommendEvents({ readForRequester: ({firebaseUid, asOf}) =>
    reader.read(firebaseUid, asOf, {items: rows, current: () => true}) }, clock);
  return { store, rows, app, read: () => app.execute({principal: {firebaseUid: 'owner'}, view: 'all'}) };
}

test('onePA Music concept uses the configured active Music identity and preserves frozen source status',async()=>{
  const f=fixture();
  const onepa={...f.rows[1]!,browseId:browseId('PA-Event-karaoke','pa')!,interestConcepts:['Music'],content:undefined};
  const {content:_,...row}=onepa;
  const status=Object.freeze([{provider:'ticketmaster' as const,available:false},{provider:'onepa' as const,available:true}]);
  const reader=new FirestorePersonalizedEvents(f.store,firestoreSocialAuthority,
    {read:async()=>({interestedEventIds:[],goingEventIds:[]})},'music');
  await f.store.runTransaction(async tx=>tx.set('account_interests/owner',{interestTagIds:['music'],revision:2}));
  const read=()=>reader.read('owner',instant,{items:[row],sourceStatus:status,current:()=>true});
  const result=await read();assert.equal(result.kind,'ready');
  if(result.kind==='ready'){
    assert.equal(result.sources.sourceStatus,status);
    assert.deepEqual(result.sources.events[0]!.scoring.interestTagIds,['music']);
  }
  for(const data of [{displayName:'Music',lifecycleState:'inactive'},{displayName:'Renamed',lifecycleState:'active'}]){
    await f.store.runTransaction(async tx=>tx.set('interest_tags/music',{...data,revision:2}));
    const changed=await read();assert.equal(changed.kind,'ready');
    if(changed.kind==='ready')assert.deepEqual(changed.sources.events[0]!.scoring.interestTagIds,[]);
  }
  await f.store.runTransaction(async tx=>{
    tx.set('interest_tags/other-music',{displayName:'Music',lifecycleState:'active',revision:1});
    tx.set('account_interests/owner',{interestTagIds:['other-music'],revision:3});
  });
  const wrongIdentity=await read();assert.equal(wrongIdentity.kind,'ready');
  if(wrongIdentity.kind==='ready')assert.deepEqual(wrongIdentity.sources.events[0]!.scoring.interestTagIds,[]);
});

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

test('HTTP Home/all put Gaming ahead of stronger Music social signals in both current and legacy representations', async () => {
  const f = fixture(5);
  f.rows.push({ ...f.rows[1]!, browseId: browseId('gaming-candidate-2')!,
    title: 'Second synthetic gaming event', startAt: '2026-11-21T00:00:00Z' });
  const app = Fastify();
  await registerEventRecommendationRoute(app, {
    identityVerifier: { verifyIdToken: async () => ({ kind: 'verified', principal: { firebaseUid: 'owner' } }) },
    recommendEvents: f.app,
  });
  try {
    for (const modern of [true, false]) {
      const headers = { authorization: 'Bearer synthetic-token', ...(modern ? { 'x-enmori-contract-version': '3' } : {}) };
      const all = await app.inject({ url: '/v1/recommendations/events?view=all', headers });
      const home = await app.inject({ url: '/v1/recommendations/events?view=home', headers });
      assert.equal(all.statusCode, 200);
      assert.equal(home.statusCode, 200);
      const body = all.json();
      assert.equal(body.formulaVersion, modern ? 'event_recommendation_v3' : 'event_recommendation_v2');
      assert.deepEqual(body.items.map((x: { title: string }) => x.title), [
        'Synthetic gaming event', 'Second synthetic gaming event', 'Synthetic music event',
      ]);
      assert.deepEqual(home.json().items, body.items.slice(0, 2));
      const music = body.items[2];
      assert.deepEqual(music.matchedInterests, []);
      assert.deepEqual(music.reasons.find((x: { code: string }) => x.code === 'friends_participating'),
        { code: 'friends_participating', count: 5, points: 10 });
      assert.equal(all.headers['cache-control'], 'no-store');
    }
    await f.store.runTransaction(async tx => tx.set('account_interests/owner', {
      interestTagIds: ['music'], revision: 2,
    }));
    const changed = await app.inject({ url: '/v1/recommendations/events?view=all',
      headers: { authorization: 'Bearer synthetic-token', 'x-enmori-contract-version': '3' } });
    assert.equal(changed.statusCode, 200);
    assert.equal(changed.json().items[0].title, 'Synthetic music event');
    assert.ok(changed.json().items.slice(1).every((x: { matchedInterests: unknown[] }) => x.matchedInterests.length === 0));
  } finally { await app.close(); }
});
