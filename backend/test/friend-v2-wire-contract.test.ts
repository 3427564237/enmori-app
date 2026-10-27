import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { friendWireCases,friendWireResponse } from './support/friend-v2-wire-fixture.js';

for(const kind of friendWireCases)for(const view of ['home','all'] as const){
  test('actual Friend producer and HTTP serialization bind the shared Dart fixture: '+kind+'/'+view,async()=>{
    const fixtures=JSON.parse(await readFile('test/fixtures/friend-v2-wire.json','utf8')) as Record<string,unknown>;
    const response=await friendWireResponse(kind,view);
    assert.equal(response.status,200);assert.equal(response.cacheControl,'no-store');
    assert.deepEqual(response.body,fixtures[kind]);
  });
}
