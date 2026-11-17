import test from 'node:test';
import assert from 'node:assert/strict';
import { OnePaBrowseSource } from '../../src/event-browse/infrastructure/onepa-browse-source.js';
import type { OnePaCatalogue } from '../../src/event-browse/infrastructure/onepa-public-catalogue.js';
const asOf='2026-11-17T00:00:00.000Z', signal=new AbortController().signal;
const empty:OnePaCatalogue={items:[],complete:true};

test('onePA foreground failure and scheduled refresh share a five-minute start cap',async()=>{
  let now=Date.parse(asOf),reads=0;
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{reads++;throw Error('Synthetic source failure');},()=>now,()=>now);
  await assert.rejects(source.batch(asOf,0,signal));
  await assert.rejects(source.batch(asOf,0,signal));
  await source.warm(signal);assert.equal(reads,1);
  now+=299999;await source.warm(signal);assert.equal(reads,1);
  now++;await assert.rejects(source.warm(signal));assert.equal(reads,2);
});

test('scheduled refresh leaves valid cache immediately readable and replaces coverage atomically',async()=>{
  let now=Date.parse(asOf),reads=0;
  const replacement=Promise.withResolvers<OnePaCatalogue>();
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{
    reads++;if(reads===1){now+=100000;return empty;}return replacement.promise;
  },()=>now,()=>now);
  await source.warm(signal);
  const first=await source.batch(asOf,0,signal);
  now=Date.parse(asOf)+300000;
  const refresh=source.warm(signal);
  const during=await source.batch(asOf,0,signal);
  assert.deepEqual(during.sourceFreshness,first.sourceFreshness);
  assert.deepEqual(during.sourceCoverage,[{provider:'onepa',complete:true}]);assert.equal(reads,2);
  replacement.resolve({items:[],complete:false});await refresh;
  const after=await source.batch(asOf,0,signal);
  assert.deepEqual(after.sourceCoverage,[{provider:'onepa',complete:false}]);
  assert.notDeepEqual(after.sourceFreshness,first.sourceFreshness);
});

test('failed replacement never renews prior expiry, while all cold callers coalesce',async()=>{
  let now=Date.parse(asOf),reads=0;
  const held=Promise.withResolvers<OnePaCatalogue>();
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{
    reads++;if(reads===1){now+=100000;return empty;}return held.promise;
  },()=>now,()=>now);
  await source.warm(signal);const first=await source.batch(asOf,0,signal);
  now=Date.parse(asOf)+300000;
  const work=source.warm(signal),failure=assert.rejects(work);
  assert.equal((await source.batch(asOf,0,signal)).sourceFreshness?.expiresAt,first.sourceFreshness?.expiresAt);
  now=Date.parse(asOf)+400001;
  const waiting=source.batch(asOf,0,signal),rejected=assert.rejects(waiting);
  held.reject(Error('Synthetic source failure'));await failure;await rejected;
  await assert.rejects(source.batch(asOf,0,signal));await source.warm(signal);assert.equal(reads,2);
});

test('initial foreground and warm callers share one acquisition and abort retains cleanup fence',async()=>{
  let now=Date.parse(asOf),reads=0;const held=Promise.withResolvers<OnePaCatalogue>();
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{reads++;return held.promise;},()=>now,()=>now);
  const owner=new AbortController();const warm=source.warm(owner.signal),rejected=assert.rejects(warm);
  const joined=source.batch(asOf,0,signal),joinRejected=assert.rejects(joined);
  await Promise.resolve();assert.equal(reads,1);
  owner.abort();now+=600000;
  await assert.rejects(source.warm(signal));await assert.rejects(source.batch(asOf,0,signal));assert.equal(reads,1);
  held.resolve(empty);await rejected;await joinRejected;
  const next=await source.batch(asOf,0,signal);assert.equal(reads,2);assert.deepEqual(next.items,[]);
});

test('disabled sources cannot start and late completion cannot populate cache',async()=>{
  let enabled=false,now=Date.parse(asOf),reads=0;const held=Promise.withResolvers<OnePaCatalogue>();
  const source=new OnePaBrowseSource(()=>enabled,async()=>'',async()=>{reads++;return held.promise;},()=>now,()=>now);
  await assert.rejects(source.warm(signal));await assert.rejects(source.batch(asOf,0,signal));assert.equal(reads,0);
  enabled=true;const work=source.warm(signal),failed=assert.rejects(work);await Promise.resolve();enabled=false;
  held.resolve(empty);await failed;enabled=true;
  await assert.rejects(source.batch(asOf,0,signal));assert.equal(reads,1);
});

test('wall-clock jumps do not bypass monotonic five-minute start cap',async()=>{
  let now=Date.parse(asOf),elapsed=0,reads=0;
  const source=new OnePaBrowseSource(()=>true,async()=>'',async()=>{reads++;throw Error('Synthetic failure');},()=>now,()=>elapsed);
  await assert.rejects(source.warm(signal));now+=86400000;
  await source.warm(signal);await assert.rejects(source.batch(asOf,0,signal));assert.equal(reads,1);
  elapsed=300000;await assert.rejects(source.warm(signal));assert.equal(reads,2);
});
