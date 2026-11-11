import assert from 'node:assert/strict';
import test from 'node:test';
import { readTogether } from '../../src/shared/infrastructure/firebase/read-together.js';
import { deferred } from './support.js';

test('independent reads overlap but cannot return until every read settles', async () => {
  const first = deferred<number>(), second = deferred<number>();
  const started: string[] = []; let finished = false;
  const result = readTogether([
    () => { started.push('first'); return first.promise; },
    () => { started.push('second'); return second.promise; },
  ]).finally(() => { finished = true; });
  await Promise.resolve();
  assert.deepEqual(started, ['first', 'second']);
  second.resolve(2); await Promise.resolve();
  assert.equal(finished, false);
  first.resolve(1);
  assert.deepEqual(await result, [1, 2]);
});

test('a failed read drains its sibling and retains original failure precedence', async () => {
  const first = deferred<number>(), second = deferred<number>();
  const primary = Error('first read'), later = Error('second read');
  let finished = false;
  const result = readTogether([() => first.promise, () => second.promise]);
  const checked = assert.rejects(result, error => error === primary).finally(() => { finished = true; });
  second.reject(later); await Promise.resolve();
  assert.equal(finished, false);
  first.reject(primary); await checked;
});
