// JIN review counterexample for PR189 afe06ae, not a product test or live runtime.
// Usage: node this-file.mjs ABSOLUTE_COMPILED_BACKEND_DIRECTORY
import assert from 'node:assert/strict';
import test from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if (!process.argv[2]) throw Error('Supply the strict-compiled Backend output directory');
const source = path => import(pathToFileURL(resolve(process.argv[2], 'src', path)).href);
const {prepareConversationHost} = await source('bootstrap/prepare-conversation-host.js');
const {LocalModelLane} = await source('ai-runtime/infrastructure/local-model-lane.js');
const {ApplicationConversationOperations} = await source('ai-conversation/application/application-conversation-operations.js');
const {AsyncConversationOperationExecutor} = await source('ai-conversation/application/async-conversation-operation-executor.js');
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
const done = () => Response.json({model: 'qwen3.5:9b', done: true, response: ''});
function fixture(mode) {
  const held = deferred(), calls = [];
  const lane = new LocalModelLane('qwen3.5:9b', async url => {
    const path = new URL(url).pathname; calls.push(path);
    if (path === '/api/ps') return Response.json({models: []});
    return mode === 'failed-preload' ? new Response('synthetic unavailable', {status: 503}) : held.promise;
  });
  const clock = {now: () => 0, utcMilliseconds: () => Date.UTC(2026, 9, 28), at: () => () => {}};
  let next = 100, ports = 0;
  // The real inner executor is constructed and cancelled. Business admission
  // must never occur, so its runtime/gates/clock are deliberately unavailable.
  const inner = new AsyncConversationOperationExecutor({runtime: undefined, gates: undefined, clock: undefined,
    ports: () => { ports++; throw Error('Unexpected business admission'); }});
  const app = new ApplicationConversationOperations({resolve: async () => ({kind: 'success', value: {ownerId: uuid(1)}})},
    {uuid: () => uuid(next++), operationKey: () => 'A'.repeat(43)}, clock,
    prepareConversationHost(inner, () => lane.prepareForChat()), {});
  const caller = {principal: {firebaseUid: 'synthetic-owner'}, tokenInstance: 'a'.repeat(64),
    verifyCurrentAuth: async () => ({kind: 'verified', principal: {firebaseUid: 'synthetic-owner'}})};
  const abort = new AbortController(), delivery = {signal: abort.signal, current: () => !abort.signal.aborted, acceptCompleteBody: () => false};
  return {app, lane, caller, abort, delivery, held, calls, ports: () => ports};
}
test('control: completed preload plus cancel never opens business ports', async () => {
  const f = fixture('held-preload'), prepared = await f.app.prepare(f.caller, {kind: 'send', purpose: 'checkin_conversation'});
  assert.equal(prepared.kind, 'success'); const ticket = prepared.value;
  const executing = f.app.execute(f.caller, {...ticket, text: 'Synthetic only'}, f.delivery); await flush();
  assert.deepEqual(f.calls, ['/api/ps', '/api/generate']);
  assert.equal((await f.app.cancel(f.caller, ticket)).kind, 'success');
  f.held.resolve(done()); assert.deepEqual(await executing, {kind: 'terminated'});
  assert.equal(f.ports(), 0); assert.deepEqual(f.lane.state, {pending: false, outcomeUnknown: false});
});
for (const mode of ['held-preload', 'failed-preload']) test('cancelled business wait and target lease: ' + mode, async () => {
  const f = fixture(mode), prepared = await f.app.prepare(f.caller, {kind: 'send', purpose: 'checkin_conversation'});
  assert.equal(prepared.kind, 'success'); const ticket = prepared.value;
  const executing = f.app.execute(f.caller, {...ticket, text: 'Synthetic only'}, f.delivery); await flush();
  assert.deepEqual(f.calls, ['/api/ps', '/api/generate']); assert.equal(f.lane.state.pending, true);
  const cancelled = await f.app.cancel(f.caller, ticket); f.abort.abort(); await flush();
  const lease = f.app.acquireTargetLease(uuid(1), ticket.conversationId, 'closed');
  // This is an observation bound, not a new product timeout. The failed receipt
  // branch returns a permanently pending promise in the reviewed production code.
  const observed = await Promise.race([executing.then(result => ({settled: true, result})), delay(75).then(() => ({settled: false}))]);
  const target = await Promise.race([lease.then(result => ({settled: true, kind: result.kind})), delay(75).then(() => ({settled: false}))]);
  const lane = {...f.lane.state};
  console.log(JSON.stringify({mode, cancelled, observed, target, lane, businessPorts: f.ports()}));
  if (mode === 'held-preload') {
    f.held.resolve(done()); await executing;
    const acquired = await lease; assert.equal(acquired.kind, 'acquired'); acquired.lease.release();
  }
  assert.equal(cancelled.kind, 'success'); assert.equal(cancelled.value.state, 'terminal');
  assert.equal(lane.pending, true, 'cancellation must not free physical preload');
  assert.equal(lane.outcomeUnknown, mode === 'failed-preload'); assert.equal(f.ports(), 0);
  assert.equal(observed.settled, true, 'cancelled business dispatch still waits for physical preload settlement');
  assert.deepEqual(observed.result, {kind: 'terminated'}); assert.equal(target.settled, true);
});
