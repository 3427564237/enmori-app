import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainedCoreEvents } from './retained_core_events.mjs';

test('private event configuration is explicit, fail-closed, and never sufficient to activate the source', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'enmori-event-config-test-'));
  try {
    assert.deepEqual(retainedCoreEvents(directory, false, () => false), { configuration: 'not_requested' });
    assert.deepEqual(retainedCoreEvents(directory, true, () => false), { configuration: 'unavailable' });
    const credentialFile = join(directory, 'credential.json');
    writeFileSync(credentialFile, JSON.stringify({ apiKey: 'synthetic', termsAccepted: true }), { mode: 0o600 });
    const config = join(directory, 'event-source.json');
    const write = values => writeFileSync(config, JSON.stringify(values), { mode: 0o600 });
    write({ credentialFile, musicInterestTagId: 'existing_music' });
    const accepted = retainedCoreEvents(directory, true, () => false);
    assert.equal(accepted.configuration, 'configured');
    await assert.rejects(accepted.input.source.firstBatch('2026-10-19T00:00:00Z', new AbortController().signal));
    chmodSync(credentialFile, 0o644);
    assert.equal(retainedCoreEvents(directory, true, () => false).configuration, 'unavailable');
    chmodSync(credentialFile, 0o600);
    const alias = join(directory, 'alias.json'); symlinkSync(credentialFile, alias);
    write({ credentialFile: alias, musicInterestTagId: 'existing_music' });
    assert.equal(retainedCoreEvents(directory, true, () => false).configuration, 'unavailable');
    write({ credentialFile, musicInterestTagId: '../accounts' });
    assert.equal(retainedCoreEvents(directory, true, () => false).configuration, 'unavailable');
  } finally { rmSync(directory, { recursive: true }); }
});
