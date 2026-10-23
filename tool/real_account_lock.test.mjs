import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync,
  symlinkSync, linkSync, unlinkSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { acquireRealAccountLock, processIdentity } from './real_account_lock.mjs';

const oldBoot = '00000000-0000-4000-8000-000000000001';
const current = processIdentity();
const previous = { ...current, bootId: oldBoot };
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'enmori-lock-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, path: join(directory, 'real-account.lock') };
}
function write(path, value) { writeFileSync(path, JSON.stringify(value), { mode: 0o600 }); }

test('current-boot lock still blocks a second runner', t => {
  const { directory, path } = fixture(t);
  const owner = acquireRealAccountLock(directory);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), current);
  assert.equal(lstatSync(path).mode & 0o777, 0o600);
  assert.throws(() => acquireRealAccountLock(directory));
  owner.release();
  owner.release();
  assert.equal(existsSync(path), false);
});

test('previous-boot lock permits startup without touching business state or AI fences', t => {
  const { directory, path } = fixture(t);
  write(path, previous);
  write(join(directory, 'business-snapshot.json'), { retained: true });
  write(join(directory, 'ai-operation-fence.json'), { outcome: 'unresolved' });
  const owner = acquireRealAccountLock(directory);
  assert.equal(owner.recoveredPreviousBoot, true);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), current);
  assert.deepEqual(JSON.parse(readFileSync(`${path}.recovered-${oldBoot}`, 'utf8')), previous);
  assert.equal(readFileSync(join(directory, 'business-snapshot.json'), 'utf8'), '{"retained":true}');
  assert.equal(readFileSync(join(directory, 'ai-operation-fence.json'), 'utf8'), '{"outcome":"unresolved"}');
  owner.release();
  // Normal later starts do not need to remove the recovery evidence.
  const restarted = acquireRealAccountLock(directory);
  assert.equal(restarted.recoveredPreviousBoot, false);
  restarted.release();
});

test('same-boot missing/reused process is not evidence of a reboot', t => {
  const { directory, path } = fixture(t);
  const absent = { ...current, pid: 2147483647, startTicks: '1' };
  write(path, absent);
  assert.throws(() => acquireRealAccountLock(directory));
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), absent);
});

test('unknown, truncated or extended ownership records remain untouched', async t => {
  for (const value of ['{', '{}', 'null', '[]',
    JSON.stringify({ ...previous, pid: '12' }), JSON.stringify({ ...previous, pid: -1 }),
    JSON.stringify({ ...previous, startTicks: '0' }), JSON.stringify({ ...previous, bootId: 'unknown' }),
    JSON.stringify({ ...previous, extra: true }), ' '.repeat(513)]) {
    await t.test(value.slice(0, 40), t => {
      const { directory, path } = fixture(t);
      writeFileSync(path, value, { mode: 0o600 });
      assert.throws(() => acquireRealAccountLock(directory));
      assert.equal(readFileSync(path, 'utf8'), value);
    });
  }
});

test('unsafe file and directory access never authorizes recovery', async t => {
  for (const kind of ['public-file', 'public-directory', 'symlink-file', 'hardlink-file', 'symlink-directory']) {
    await t.test(kind, t => {
      const { directory, path } = fixture(t);
      write(path, previous);
      let target = directory;
      if (kind === 'public-file') chmodSync(path, 0o644);
      if (kind === 'public-directory') chmodSync(directory, 0o755);
      if (kind === 'hardlink-file') linkSync(path, join(directory, 'alias'));
      if (kind === 'symlink-file') {
        unlinkSync(path); write(join(directory, 'original'), previous);
        symlinkSync(join(directory, 'original'), path);
      }
      if (kind === 'symlink-directory') {
        target = join(directory, 'alias'); symlinkSync(directory, target);
      }
      assert.throws(() => acquireRealAccountLock(target));
      assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), previous);
    });
  }
});

test('interrupted recovery is preserved instead of repeating the unlink', t => {
  const { directory, path } = fixture(t);
  write(path, previous);
  linkSync(path, `${path}.recovered-${oldBoot}`);
  assert.throws(() => acquireRealAccountLock(directory));
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), previous);
});

test('an existing recovery claim cannot authorize another unlink', t => {
  const { directory, path } = fixture(t);
  write(path, previous);
  write(`${path}.recovered-${oldBoot}`, previous);
  assert.throws(() => acquireRealAccountLock(directory));
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), previous);
});

test('a delayed reclaimer cannot delete a later runner lock', t => {
  const { directory, path } = fixture(t);
  write(path, previous);
  const originalLink = fs.linkSync;
  let delayed = true, later;
  const hook = t.mock.method(fs, 'linkSync', (...args) => {
    if (delayed) {
      delayed = false;
      const winner = acquireRealAccountLock(directory);
      winner.release();
      later = acquireRealAccountLock(directory);
    }
    return originalLink(...args);
  });
  syncBuiltinESMExports();
  try {
    assert.throws(() => acquireRealAccountLock(directory));
    assert(later);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), current);
    later.release();
  } finally { hook.mock.restore(); syncBuiltinESMExports(); }
});

test('shutdown does not unlink a replacement or changed lock', async t => {
  for (const replace of [false, true]) await t.test(String(replace), t => {
    const { directory, path } = fixture(t);
    const owner = acquireRealAccountLock(directory);
    if (replace) unlinkSync(path);
    write(path, { ...current, startTicks: String(BigInt(current.startTicks) + 1n) });
    const retained = readFileSync(path, 'utf8');
    assert.throws(() => owner.release());
    assert.equal(readFileSync(path, 'utf8'), retained);
  });
});

for (const reboot of [false, true]) test(`concurrent processes admit one runner (prior boot=${reboot})`, async t => {
  const { directory, path } = fixture(t);
  if (reboot) write(path, previous);
  const program = `
    import { acquireRealAccountLock } from ${JSON.stringify(new URL('./real_account_lock.mjs', import.meta.url).href)};
    let lock;
    process.on('message', message => {
      if (message === 'go') {
        try { lock = acquireRealAccountLock(process.argv[1]); process.send('acquired'); }
        catch { process.send('refused'); }
      } else { lock?.release(); process.disconnect(); }
    });
    process.send('ready');
  `;
  const children = Array.from({ length: 8 }, () => spawn(process.execPath,
    ['--input-type=module', '-e', program, directory], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }));
  t.after(() => children.forEach(child => { if (child.exitCode === null) child.kill(); }));
  const receive = child => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Lock contender did not respond')), 5000);
    child.once('message', value => { clearTimeout(timeout); resolve(value); });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  assert.deepEqual(await Promise.all(children.map(receive)), Array(8).fill('ready'));
  const outcomes = children.map(receive);
  children.forEach(child => child.send('go'));
  const results = await Promise.all(outcomes);
  assert.equal(results.filter(value => value === 'acquired').length, 1);
  assert.equal(results.filter(value => value === 'refused').length, 7);
  const winner = children[results.indexOf('acquired')];
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).pid, winner.pid);
  const exits = children.map(child => new Promise(resolve => child.once('exit', resolve)));
  children.forEach(child => child.send('stop'));
  assert.deepEqual(await Promise.all(exits), Array(8).fill(0));
  assert.equal(existsSync(path), false);
});
