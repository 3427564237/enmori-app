import assert from 'node:assert/strict';
import test from 'node:test';
import { createControlledEventRecommendations } from '../../src/bootstrap/controlled-event-recommendations.js';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import { eventTestRecords, EVENT_TEST_UID, EVENT_AS_OF } from '../support/event-repository-contract.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { ok } from '../../src/shared/domain/result.js';

test('recommendations include an eligible occurrence beyond the provider first page', async () => {
  const row = (n: number) => ({ browseId: browseId(`occurrence_${n}`)!, title: `Occurrence ${n}`,
    startAt: '2026-11-10T00:00:00Z', externalSourceUrl: 'https://ticketmaster.sg/event/a', musicSegment: true as const });
  const records = eventTestRecords();
  const source = new ControlledSourceProjection({ firstBatch: async () => [row(0)], detail: async () => undefined,
    batch: async (_asOf, page) => page === 0 ? { items: [row(0)], nextPage: 1 } : { items: [row(1)] } });
  const joined = createControlledEventRecommendations({ source, clock: { now: () => ok(new Date(EVENT_AS_OF)) },
    gateway: { get: async path => records[path], listEvents: async () => [] } });
  const result = await joined.recommendEvents.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: 'all' });
  assert.ok(result.ok);
  assert.equal(result.value.items.length, 2);
});
