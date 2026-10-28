import assert from 'node:assert/strict';
import test from 'node:test';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../../src/event-browse/domain/source-event-id.js';
import type { BrowseOccurrence } from '../../src/event-browse/ports/event-browse.js';

const at = '2026-10-28T03:00:02.000Z', earlier = '2026-10-28T03:00:00.000Z';
const signal = () => new AbortController().signal;
const rows: BrowseOccurrence[] = [
  {browseId:browseId('between')!,title:'Starts between requests',startAt:'2026-10-28T03:00:01Z',externalSourceUrl:'https://ticketmaster.sg/event/a'},
  {browseId:browseId('future')!,title:'Future event',startAt:'2026-11-10T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/b'},
];

test('older delayed requester joins complete generation without losing events between request instants', async () => {
  let finish!: () => void, calls = 0;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  const source = new ControlledSourceProjection({
    firstBatch: async () => [], detail: async () => undefined,
    batch: async (asOf) => { calls++; await waiting; return {items:rows.filter(row=>Date.parse(row.startAt)>Date.parse(asOf))}; },
  });
  const newerWork=source.recommendationSnapshot(at,signal());
  const olderWork=source.recommendationSnapshot(earlier,signal());
  finish();
  const [newer,older]=await Promise.all([newerWork,olderWork]);
  assert.equal(calls,1);
  assert.deepEqual(newer.items.map(row=>row.title),['Future event']);
  assert.deepEqual(older.items.map(row=>row.title),['Starts between requests','Future event']);
  assert.equal(newer.current(),true); assert.equal(older.current(),true);
  assert.equal(source.ready(earlier),true);
  assert.equal(source.peek(sourceEventId(rows[0]!.browseId),earlier)?.title,'Starts between requests');
  assert.equal(source.peek(sourceEventId(rows[0]!.browseId),at),undefined);
  source.clear(); assert.equal(newer.current(),false); assert.equal(older.current(),false);
});

test('coverage lookback does not extend freshness or mask a failed replacement', async () => {
  let calls=0,fail=false;
  const source=new ControlledSourceProjection({firstBatch:async()=>[],detail:async()=>undefined,
    batch:async()=>{calls++;if(fail)throw Error('source unavailable');return {items:rows};}});
  const original=await source.recommendationSnapshot(at,signal());
  await source.recommendationSnapshot('2026-10-28T03:05:01.999Z',signal());
  assert.equal(calls,1);
  fail=true;
  await assert.rejects(source.recommendationSnapshot('2026-10-28T03:05:02.000Z',signal()));
  assert.equal(original.current(),false); assert.equal(source.ready(at),false);
  assert.equal(calls,2);
});
