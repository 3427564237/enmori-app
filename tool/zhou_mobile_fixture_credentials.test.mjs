import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { deliverMobileFixtureConfiguration, validateMobileFixtureConfiguration } from './zhou_mobile_fixture_credentials.mjs';

const now = Date.parse('2026-10-15T04:00:00Z');
const configuration = () => ({
  schemaVersion: 1, projectId: 'demo-enmori-rmvp01a-r10', baseUri: 'https://127.0.0.1:42001/',
  issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 120_000).toISOString(),
  email: 'synthetic-mobile@example.invalid', password: 'TestOnlyNotAnActualCredential1!',
  certificateBase64: Buffer.from('-----BEGIN CERTIFICATE-----\nTEST ONLY\n-----END CERTIFICATE-----\n').toString('base64'),
});

test('runtime credentials travel only through stdin of the existing private debug sandbox', async () => {
  let invocation, received;
  const expected = configuration();
  await deliverMobileFixtureConfiguration({ adb: '/owned/sdk/adb', serial: 'emulator-5554', configuration: expected, now,
    spawnChild(program, args, options) {
      invocation = { program, args, options };
      const child = new EventEmitter();
      child.kill = () => {};
      child.stdin = new Writable({ write(chunk, _encoding, next) { received = Buffer.from(chunk); next(); } });
      child.stdin.once('finish', () => child.emit('exit', 0));
      return child;
    },
  });
  assert.deepEqual(JSON.parse(received), expected);
  assert.equal(invocation.args.join(' ').includes(expected.password), false);
  assert.equal(invocation.args.join(' ').includes(expected.email), false);
  assert.match(invocation.args[3], /run-as com\.enmori\.app\.personatest/);
  assert.match(invocation.args[3], /if \[ -d code_cache \]; then directory=code_cache; elif \[ -d cache \]; then directory=cache; else exit 1; fi/);
  assert.equal(invocation.args[3].includes('mkdir'), false);
  assert.match(invocation.args[4], /^[0-9a-f-]{36}$/);
  assert.deepEqual(invocation.options.stdio, ['pipe', 'ignore', 'ignore']);
});

// Execute the actual fixed remote POSIX script in an owned local sandbox. This
// proves its path selection and file behavior; it is not Android/ADB execution.
// Windows reuses the installed Git shell. No runtime/tool is installed or added.
const shell = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\sh.exe' : '/bin/sh';
async function sandbox(directories, action) {
  const parent = realpathSync(tmpdir());
  const directory = mkdtempSync(join(parent, 'zhou-adb-shell-test-'));
  try {
    for (const selected of directories) mkdirSync(join(directory, selected));
    const deliver = () => deliverMobileFixtureConfiguration({ adb: 'test-only-adb', serial: 'emulator-5554', configuration: configuration(), now,
      spawnChild(_program, args, options) {
        const script = /^run-as com\.enmori\.app\.personatest sh -c '([^']+)'$/.exec(args[3]);
        assert.ok(script, 'The fixed private sandbox command must contain no caller shell syntax');
        assert.equal(script[1].includes(configuration().password), false);
        const env = { ...process.env };
        for (const name of Object.keys(env)) if (name.toUpperCase() === 'PATH') delete env[name];
        env.PATH = `${dirname(shell)}${delimiter}${process.env.PATH ?? ''}`;
        return spawn(shell, ['-c', script[1], args[4]], { ...options, cwd: directory, env });
      },
    });
    await action(directory, deliver);
  } finally {
    const owned = relative(parent, realpathSync(directory));
    assert.ok(owned && !owned.startsWith('..') && !isAbsolute(owned));
    rmSync(directory, { recursive: true, force: true });
  }
}

test('actual fixed shell script prefers existing code_cache over cache as pinned Flutter does', async () => {
  await sandbox(['code_cache', 'cache'], async (directory, deliver) => {
    await deliver();
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'code_cache/zhou-mobile-configuration.json'))), configuration());
    assert.equal(existsSync(join(directory, 'cache/zhou-mobile-configuration.json')), false);
    assert.equal(existsSync(join(directory, 'code_cache/zhou-mobile-configuration.tmp')), false);
  });
});

test('actual fixed shell script uses existing cache only when code_cache is unavailable', async () => {
  await sandbox(['cache'], async (directory, deliver) => {
    await deliver();
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'cache/zhou-mobile-configuration.json'))), configuration());
    assert.equal(existsSync(join(directory, 'code_cache')), false);
    assert.equal(existsSync(join(directory, 'cache/zhou-mobile-configuration.tmp')), false);
  });
});

test('actual fixed shell script rejects absent directories and preserves existing configuration or transfer files', async () => {
  await sandbox([], async (directory, deliver) => {
    await assert.rejects(deliver(), { message: 'Controlled Android runtime configuration delivery failed.' });
    assert.equal(existsSync(join(directory, 'code_cache')), false);
    assert.equal(existsSync(join(directory, 'cache')), false);
  });
  for (const name of ['zhou-mobile-configuration.json', 'zhou-mobile-configuration.tmp']) {
    await sandbox(['code_cache', 'cache'], async (directory, deliver) => {
      const prior = join(directory, 'code_cache', name);
      writeFileSync(prior, 'previous owned artifact');
      await assert.rejects(deliver(), { message: 'Controlled Android runtime configuration delivery failed.' });
      assert.equal(readFileSync(prior, 'utf8'), 'previous owned artifact');
      assert.equal(existsSync(join(directory, 'cache/zhou-mobile-configuration.json')), false);
    });
  }
});

test('disposal removes only matching nonce-owned files, including an abruptly unconsumed payload', async () => {
  await sandbox(['code_cache', 'cache'], async (directory, deliver) => {
    const foreign = join(directory, 'cache/zhou-mobile-configuration.json');
    writeFileSync(foreign, 'another run must be preserved');
    const delivered = await deliver();
    assert.equal((await delivered.dispose()).credentialCleanupConfirmed, true);
    assert.equal(existsSync(join(directory, 'code_cache/zhou-mobile-configuration.json')), false);
    assert.equal(existsSync(join(directory, 'code_cache/zhou-mobile-configuration.owner')), false);
    assert.equal(readFileSync(foreign, 'utf8'), 'another run must be preserved');
  });
});

test('failed delivery exposes a disposal capability without deleting a pre-existing foreign payload', async () => {
  await sandbox(['code_cache'], async (directory, deliver) => {
    const foreign = join(directory, 'code_cache/zhou-mobile-configuration.json');
    writeFileSync(foreign, 'pre-existing payload');
    let failure;
    try { await deliver(); } catch (error) { failure = error; }
    assert.equal(typeof failure.dispose, 'function');
    await assert.rejects(failure.dispose());
    assert.equal(readFileSync(foreign, 'utf8'), 'pre-existing payload');
  });
});

test('external hosts, expired/long-lived payloads, unexpected fields and shell serials fail before spawning', async () => {
  for (const delta of [
    { baseUri: 'http://127.0.0.1:42001/' }, { baseUri: 'https://backend.example/' },
    { baseUri: 'https://name:password@127.0.0.1:42001/' }, { baseUri: 'https://127.0.0.1:42001/path' },
    { projectId: 'unselected-project' }, { expiresAt: new Date(now).toISOString() },
    { expiresAt: new Date(now + 300_001).toISOString() }, { email: 'real@example.com' },
    { unknown: true }, { password: 'short' },
  ]) {
    assert.throws(() => validateMobileFixtureConfiguration({ ...configuration(), ...delta }, now), { message: 'Controlled Android runtime configuration delivery failed.' });
  }
  await assert.rejects(deliverMobileFixtureConfiguration({ adb: 'adb', serial: 'serial; echo secret', configuration: configuration(), now,
    spawnChild() { assert.fail('Invalid selection must not launch adb'); },
  }), { message: 'Controlled Android runtime configuration delivery failed.' });
});

test('failed run-as never emits a credential or child error in the returned diagnostic', async () => {
  await assert.rejects(deliverMobileFixtureConfiguration({ adb: 'adb', serial: 'emulator-5554', configuration: configuration(), now,
    spawnChild() {
      const child = new EventEmitter();
      child.kill = () => {};
      child.stdin = new Writable({ write(_chunk, _encoding, next) { next(); } });
      child.stdin.once('finish', () => child.emit('error', new Error(configuration().password)));
      return child;
    },
  }), { message: 'Controlled Android runtime configuration delivery failed.' });
});

test('disabled standalone CLI exits without waiting for private stdin or handing off credentials', async () => {
  const secret = 'synthetic-private-marker-never-print';
  const result = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./zhou_mobile_fixture_credentials.mjs', import.meta.url)), '--serial', 'USBTEST00001'],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Disabled CLI waited for private stdin.')); }, 5000);
    child.stdout.on('data', part => { stdout += part; });
    child.stderr.on('data', part => { stderr += part; });
    child.stdin.on('error', () => {});
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); done({ code, stdout, stderr }); });
    child.stdin.write(secret); // Deliberately no EOF: the disabled CLI must exit.
  });
  assert.equal(result.code, 1); assert.equal(result.stdout, '');
  assert.equal(result.stderr.includes('standalone credential delivery is disabled'), true);
  assert.equal(result.stderr.includes(secret), false);
});
