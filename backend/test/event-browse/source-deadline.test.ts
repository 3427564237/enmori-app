import test from 'node:test';
import assert from 'node:assert/strict';
import {CombinedEventSource} from '../../src/event-browse/infrastructure/combined-event-source.js';
import type {BrowseSource, BrowseOccurrence} from '../../src/event-browse/ports/event-browse.js';

const asOf = '2026-10-29T00:00:00.000Z';
const row: BrowseOccurrence = {browseId:'tm_c3ludGhldGlj', title:'Synthetic event', startAt:'2026-11-01T00:00:00Z', externalSourceUrl:'https://ticketmaster.sg/activity/detail/synthetic'};
const healthy: BrowseSource = {firstBatch:async()=>[row], detail:async()=>row};

test('slow provider cleanup cannot withhold the healthy list or mark the slow source available', async () => {
  let signal!: AbortSignal;
  let finish!: (rows: readonly BrowseOccurrence[]) => void;
  const slow: BrowseSource = {detail:async()=>undefined, firstBatch: async (_asOf, observed) => {
    signal = observed;
    return new Promise(resolve=>{finish=resolve;});
  }};
  const source = new CombinedEventSource(healthy, slow, 20);
  const result = await source.batch(asOf, 0, new AbortController().signal);
  assert.deepEqual(result.items, [row]);
  assert.deepEqual(result.sourceStatus, [{provider:'ticketmaster',available:true},{provider:'onepa',available:false}]);
  assert.equal(signal.aborted, true);
  finish([]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(source.status()[1]!.available, false);
});

test('two timed-out providers remain unavailable instead of becoming an empty success', async () => {
  const never: BrowseSource = {firstBatch:async()=>new Promise(()=>{}),detail:async()=>undefined};
  const source = new CombinedEventSource(never, never, 20);
  await assert.rejects(source.firstBatch(asOf, new AbortController().signal));
  assert(source.status().every(s=>!s.available));
});

test('caller cancellation aborts provider reads and never publishes a partial result', async () => {
  const seen: AbortSignal[] = [];
  const never: BrowseSource = {firstBatch:async(_asOf,signal)=>{seen.push(signal);return new Promise(()=>{});},detail:async()=>undefined};
  const caller = new AbortController();
  const source = new CombinedEventSource(never, never, 10000);
  const pending = source.firstBatch(asOf, caller.signal);
  await new Promise(resolve=>setImmediate(resolve));
  caller.abort();
  await assert.rejects(pending);
  assert.equal(seen.length, 2);
  assert(seen.every(s=>s.aborted));
});
