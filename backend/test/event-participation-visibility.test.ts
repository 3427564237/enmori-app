import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maySeeParticipation, type ParticipationVisibilityFacts } from '../src/event-participation/domain/participation-visibility.js';

const base: ParticipationVisibilityFacts = {
  isOwner: false, isFriend: false, isBlocked: false,
  participantEligible: true, privacy: undefined,
};

test('legacy missing privacy and private participation are not disclosed', () => {
  assert.equal(maySeeParticipation(base), false);
  assert.equal(maySeeParticipation({ ...base, privacy: 'private', isFriend: true }), false);
});
test('friends-only is reevaluated against the current friendship', () => {
  assert.equal(maySeeParticipation({ ...base, privacy: 'friends_only', isFriend: true }), true);
  assert.equal(maySeeParticipation({ ...base, privacy: 'friends_only', isFriend: false }), false);
});
test('blocked participation remains hidden even if public', () => {
  assert.equal(maySeeParticipation({ ...base, privacy: 'public', isBlocked: true }), false);
});
test('eligible owners may read their own private participation', () => {
  assert.equal(maySeeParticipation({ ...base, privacy: 'private', isOwner: true }), true);
  assert.equal(maySeeParticipation({ ...base, isOwner: true, participantEligible: false }), false);
});
test('public participation can be seen without requiring data consent', () => {
  assert.equal(maySeeParticipation({ ...base, privacy: 'public' }), true);
});
