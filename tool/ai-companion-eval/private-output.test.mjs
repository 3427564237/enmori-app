import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outsideRepository, createPrivateOutput } from './private-output.mjs';

test('output must escape by a path segment, not a .. prefix inside the repository', () => {
  for (const target of ['/review/ENMORI', '/review/ENMORI/raw', '/review/ENMORI/..raw/run', '/review/ENMORI/../ENMORI/raw'])
    assert.equal(outsideRepository('/review/ENMORI', target), false, target);
  for (const target of ['/review/raw/run', '/review/ENMORI-sibling/run', '/review'])
    assert.equal(outsideRepository('/review/ENMORI', target), true, target);
});

test('owner-only outputs reject canonical and ancestral symlink escapes, internal ..raw and existing runs', t => {
  const base = mkdtempSync(join(tmpdir(), 'enmori-eval-path-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'repo'), raw = join(base, 'private');
  mkdirSync(root, { mode: 0o700 }); mkdirSync(raw, { mode: 0o700 });
  mkdirSync(join(root, '..raw'), { mode: 0o700 });
  assert.throws(() => createPrivateOutput(root, join(root, '..raw', 'run')), /outside/);
  symlinkSync(raw, join(base, 'link'));
  assert.throws(() => createPrivateOutput(root, join(base, 'link', 'run')), /canonical/);
  mkdirSync(join(raw, 'nested'), { mode: 0o700 });
  assert.throws(() => createPrivateOutput(root, join(base, 'link', 'nested', 'run')), /canonical/);
  const output = createPrivateOutput(root, join(raw, 'run'));
  output.save('one.json', { synthetic: true });
  assert.equal(statSync(join(raw, 'run')).mode & 0o777, 0o700);
  assert.equal(statSync(join(raw, 'run', 'one.json')).mode & 0o777, 0o600);
  assert.throws(() => output.save('one.json', {}));
  assert.throws(() => output.save('../secret.json', {}));
  assert.throws(() => createPrivateOutput(root, join(raw, 'run')));
});
