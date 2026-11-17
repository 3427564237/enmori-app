import assert from 'node:assert/strict';
import test from 'node:test';
import { createControlledEventBrowse } from '../../src/bootstrap/controlled-event-browse.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../../src/event-browse/domain/source-event-id.js';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import type { BrowseOccurrence, BrowseSource } from '../../src/event-browse/ports/event-browse.js';
import { dependencyUnavailable } from '../../src/shared/ports/dependency-failure.js';

const start = Date.parse('2026-11-17T00:00:00.000Z');
const iso = (at: number) => new Date(at).toISOString();
const signal = () => new AbortController().signal;
type Provider = 'ticketmaster' | 'onepa';
type Batch = Awaited<ReturnType<NonNullable<BrowseSource['batch']>>>;
const occurrence = (provider: Provider, title: string): BrowseOccurrence => ({
  browseId: browseId('synthetic_expiry', provider === 'onepa' ? 'pa' : 'tm')!,
  title,
  startAt: '2026-12-01T00:00:00Z',
  externalSourceUrl: provider === 'onepa'
    ? 'https://www.onepa.gov.sg/events/synthetic-expiry'
    : 'https://ticketmaster.sg/event/synthetic-expiry',
});

function fixture(provider: Provider) {
  const state = { now: start, exactReads: 0, batchReads: 0 };
  const freshDetail = occurrence(provider, 'Fresh exact detail');
  const eventId = sourceEventId(freshDetail.browseId);
  const freshBatch = (): Batch => ({
    items: [occurrence(provider, 'List summary')],
    sourceFreshness: { acquiredAt: iso(state.now), expiresAt: iso(state.now + 300_000) },
  });
  const behavior = {
    exact: (async () => freshDetail) as NonNullable<BrowseSource['event']>,
    batch: (async () => freshBatch()) as NonNullable<BrowseSource['batch']>,
  };
  const source: BrowseSource = {
    status: () => [{ provider, available: true }],
    firstBatch: async () => freshBatch().items,
    batch: (...args) => { state.batchReads++; return behavior.batch(...args); },
    event: (...args) => { state.exactReads++; return behavior.exact(...args); },
    detail: async () => freshDetail,
  };
  const projection = new ControlledSourceProjection(source, () => state.now);
  return {
    state, behavior, freshBatch, freshDetail, eventId, projection,
    seed: () => projection.batch!(iso(state.now), 0, signal()),
    read: (current = signal()) => projection.event!(eventId, iso(state.now), current),
  };
}

for (const provider of ['ticketmaster', 'onepa'] as const) {
  test(`${provider}: cold stable detail reads the exact source without creating a list generation`, async () => {
    const f = fixture(provider);
    assert.equal(await f.read(), f.freshDetail);
    assert.equal(f.state.batchReads, 0);
    assert.equal(f.state.exactReads, 1);
    assert.equal(f.projection.ready(iso(f.state.now)), false);
  });

  test(`${provider}: live snapshot does not substitute its list summary for exact detail`, async () => {
    const f = fixture(provider); await f.seed(); f.state.now += 299_999;
    assert.equal(await f.read(), f.freshDetail);
    assert.equal(f.state.batchReads, 1);
    assert.equal(f.state.exactReads, 1);
    assert.equal(f.projection.ready(iso(f.state.now)), true);
  });

  test(`${provider}: already-expired snapshot permits repeated fresh exact reads without a list refresh`, async () => {
    const f = fixture(provider); await f.seed(); f.state.now += 300_000;
    assert.equal(await f.read(), f.freshDetail);
    assert.equal(await f.read(), f.freshDetail);
    assert.equal(f.state.exactReads, 2);
    assert.equal(f.state.batchReads, 1, 'retirement must not trigger catalogue acquisition');
    assert.equal(f.projection.ready(iso(f.state.now)), false);
    assert.equal(f.projection.peek(f.eventId, iso(f.state.now)), undefined);
  });

  for (const outcome of ['failure', 'undefined'] as const) {
    test(`${provider}: expired retirement preserves exact-source ${outcome} without stale fallback or retry`, async () => {
      const f = fixture(provider); await f.seed(); f.state.now += 300_000;
      f.behavior.exact = async () => {
        if (outcome === 'failure') throw dependencyUnavailable;
        return undefined;
      };
      if (outcome === 'failure') await assert.rejects(f.read(), error => error === dependencyUnavailable);
      else assert.equal(await f.read(), undefined);
      assert.equal(f.state.exactReads, 1);
      assert.equal(f.state.batchReads, 1);
      assert.equal(f.projection.peek(f.eventId, iso(f.state.now)), undefined);
    });
  }

  test(`${provider}: a snapshot live at admission remains an in-flight expiry fence`, async () => {
    const f = fixture(provider); await f.seed(); f.state.now += 299_999;
    const held = Promise.withResolvers<BrowseOccurrence | undefined>();
    f.behavior.exact = () => held.promise;
    const denied = assert.rejects(f.read(), error => error === dependencyUnavailable);
    f.state.now++; held.resolve(f.freshDetail); await denied;
    assert.equal(f.state.exactReads, 1);
  });

  test(`${provider}: retiring an expired snapshot cannot revive an older exact read`, async () => {
    const f = fixture(provider); await f.seed(); f.state.now += 299_999;
    const held = Promise.withResolvers<BrowseOccurrence | undefined>();
    f.behavior.exact = () => held.promise;
    const denied = assert.rejects(f.read(), error => error === dependencyUnavailable);
    f.state.now++; f.behavior.exact = async () => f.freshDetail;
    try { assert.equal(await f.read(), f.freshDetail); }
    finally { held.resolve(occurrence(provider, 'Old in-flight detail')); await denied; }
    assert.equal(f.state.exactReads, 2);
  });

  for (const outcome of ['success', 'failure'] as const) {
    test(`${provider}: stable detail joins a pending replacement before ${outcome}`, async () => {
      const f = fixture(provider); await f.seed(); f.state.now += 300_000;
      const replacement = Promise.withResolvers<Batch>();
      f.behavior.batch = () => replacement.promise;
      const page = f.seed(), read = f.read();
      assert.equal(f.state.exactReads, 0, 'do not bypass pending replacement');
      if (outcome === 'success') {
        replacement.resolve(f.freshBatch()); await page;
        assert.equal(await read, f.freshDetail);
        assert.equal(f.state.exactReads, 1);
      } else {
        const pageDenied = assert.rejects(page), readDenied = assert.rejects(read);
        replacement.reject(dependencyUnavailable); await pageDenied; await readDenied;
        assert.equal(f.state.exactReads, 0);
      }
    });
  }

  for (const finish of ['replacement', 'failed-replacement', 'cancel', 'clear'] as const) {
    test(`${provider}: exact read after expired retirement still rejects ${finish}`, async () => {
      const f = fixture(provider); await f.seed(); f.state.now += 300_000;
      const held = Promise.withResolvers<BrowseOccurrence | undefined>();
      f.behavior.exact = () => held.promise;
      const controller = new AbortController();
      const denied = assert.rejects(f.read(controller.signal), error => error === dependencyUnavailable);
      if (finish === 'replacement') await f.seed();
      if (finish === 'failed-replacement') {
        f.behavior.batch = async () => { throw dependencyUnavailable; };
        await assert.rejects(f.seed());
      }
      if (finish === 'cancel') controller.abort();
      if (finish === 'clear') f.projection.clear();
      held.resolve(f.freshDetail); await denied;
      assert.equal(f.state.exactReads, 1);
    });
  }

  test(`${provider}: retiring expired first-page state rejects its in-flight later page`, async () => {
    const f = fixture(provider); await f.seed();
    const held = Promise.withResolvers<Batch>();
    f.behavior.batch = () => held.promise;
    const denied = assert.rejects(f.projection.batch!(iso(start), 1, signal()), error => error === dependencyUnavailable);
    f.state.now += 300_000;
    try { assert.equal(await f.read(), f.freshDetail); }
    finally { held.resolve(f.freshBatch()); await denied; }
    assert.equal(f.projection.peek(f.eventId, iso(f.state.now)), undefined);
  });

  test(`${provider}: pre-aborted stable read cannot call the exact source`, async () => {
    const f = fixture(provider); await f.seed(); f.state.now += 300_000;
    const controller = new AbortController(); controller.abort();
    await assert.rejects(f.read(controller.signal), error => error === dependencyUnavailable);
    assert.equal(f.state.exactReads, 0);
    assert.equal(f.state.batchReads, 1);
  });

  test(`${provider}: runtime disable rejects an exact read after expired retirement`, async () => {
    const f = fixture(provider); await f.seed(); f.state.now += 300_000;
    const held = Promise.withResolvers<BrowseOccurrence | undefined>();
    f.behavior.exact = () => held.promise;
    const gate = createControlledEventBrowse({ source: f.projection, running: () => true, track: work => work() });
    gate.enable();
    const denied = assert.rejects(gate.source.event!(f.eventId, iso(f.state.now), signal()));
    assert.equal(gate.observation().pending, 1);
    gate.disable(); held.resolve(f.freshDetail); await denied;
    assert.equal(gate.observation().pending, 0);
    await assert.rejects(gate.source.event!(f.eventId, iso(f.state.now), signal()));
    assert.equal(f.state.exactReads, 1);
  });
}
