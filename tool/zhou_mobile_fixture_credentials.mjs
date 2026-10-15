// Test-only runtime credential delivery. This file is never an application
// endpoint or an ordinary launcher. The existing PC13 dedicated debug package
// must already be running and waiting for configuration before this is called.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const message = 'Controlled Android runtime configuration delivery failed.';
// Flutter 3.47.2 PathUtils.getCacheDirectory() prefers getCodeCacheDir(),
// then getCacheDir(); FlutterLoader -> --cache-dir-path -> dart_vm.cc sets
// dart:io Directory.systemTemp to that same directory. Do not assume cache/.
// These are fixed existing private directories, never caller-supplied paths.
const command = 'run-as com.enmori.app.personatest sh -c \'if [ -d code_cache ]; then directory=code_cache; elif [ -d cache ]; then directory=cache; else exit 1; fi; umask 077; test ! -e "$directory/zhou-mobile-configuration.json" && test ! -e "$directory/zhou-mobile-configuration.tmp" && test ! -e "$directory/zhou-mobile-configuration.owner" || exit 1; printf "%s\\n" "$0" > "$directory/zhou-mobile-configuration.owner" || exit 1; transferred=false; cleanup() { rm -f "$directory/zhou-mobile-configuration.tmp"; if [ "$transferred" != true ]; then rm -f "$directory/zhou-mobile-configuration.owner"; fi; }; trap cleanup EXIT; cat > "$directory/zhou-mobile-configuration.tmp" && mv "$directory/zhou-mobile-configuration.tmp" "$directory/zhou-mobile-configuration.json" && transferred=true\'';
// $0 is a fresh non-content ownership nonce, not a credential or shell fragment.
// Read only the sidecar nonce; never inspect or emit the credential JSON body.
const disposeCommand = 'run-as com.enmori.app.personatest sh -c \'matched=false; unknown=false; for directory in code_cache cache; do if [ -f "$directory/zhou-mobile-configuration.owner" ]; then owner=$(cat "$directory/zhou-mobile-configuration.owner"); if [ "$owner" = "$0" ]; then rm -f "$directory/zhou-mobile-configuration.json" "$directory/zhou-mobile-configuration.tmp" "$directory/zhou-mobile-configuration.owner" || exit 1; matched=true; else unknown=true; fi; elif [ -e "$directory/zhou-mobile-configuration.json" ] || [ -e "$directory/zhou-mobile-configuration.tmp" ]; then unknown=true; fi; done; if [ "$matched" = true ] || [ "$unknown" = false ]; then exit 0; fi; exit 1\'';

export function validateMobileFixtureConfiguration(configuration, now = Date.now()) {
  try {
    assert.ok(configuration && typeof configuration === 'object' && !Array.isArray(configuration));
    const keys = ['schemaVersion', 'projectId', 'baseUri', 'issuedAt', 'expiresAt', 'email', 'password', 'certificateBase64'];
    assert.deepEqual(Object.keys(configuration).sort(), [...keys].sort());
    assert.equal(configuration.schemaVersion, 1);
    assert.equal(configuration.projectId, 'demo-enmori-rmvp01a-r10');
    assert.equal(typeof configuration.baseUri, 'string');
    const uri = new URL(configuration.baseUri);
    assert.equal(uri.protocol, 'https:');
    assert.ok(['127.0.0.1', '10.0.2.2'].includes(uri.hostname));
    assert.equal(uri.username + uri.password + uri.search + uri.hash, '');
    assert.equal(uri.pathname, '/');
    const issuedAt = Date.parse(configuration.issuedAt), expiresAt = Date.parse(configuration.expiresAt);
    assert.ok(typeof configuration.issuedAt === 'string' && configuration.issuedAt.endsWith('Z'));
    assert.ok(typeof configuration.expiresAt === 'string' && configuration.expiresAt.endsWith('Z'));
    assert.ok(Number.isFinite(now) && Number.isFinite(issuedAt) && Number.isFinite(expiresAt));
    assert.ok(issuedAt <= now + 30_000 && expiresAt > now && expiresAt > issuedAt && expiresAt - issuedAt <= 300_000);
    assert.ok(typeof configuration.email === 'string' && /^[a-z0-9][a-z0-9._+-]{1,80}@example\.invalid$/.test(configuration.email));
    assert.ok(typeof configuration.password === 'string' && configuration.password.length >= 12 && configuration.password.length <= 256 && !/[\x00-\x1f\x7f]/.test(configuration.password));
    assert.ok(typeof configuration.certificateBase64 === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(configuration.certificateBase64));
    const pem = Buffer.from(configuration.certificateBase64, 'base64').toString('ascii');
    assert.ok(pem.startsWith('-----BEGIN CERTIFICATE-----') && pem.trimEnd().endsWith('-----END CERTIFICATE-----'));
    const body = Buffer.from(JSON.stringify(configuration));
    assert.ok(body.length <= 32768);
    return body;
  } catch {
    throw new Error(message);
  }
}

export async function deliverMobileFixtureConfiguration({ adb, serial, configuration, now = Date.now(), spawnChild = spawn }) {
  let body;
  let disposal;
  try {
    assert.ok(typeof adb === 'string' && adb.length > 0 && !/[\r\n\x00]/.test(adb));
    assert.match(serial, /^(?:emulator-[0-9]{1,5}|[A-Za-z0-9]{6,64})$/);
    body = validateMobileFixtureConfiguration(configuration, now);
    const nonce = randomUUID();
    disposal = async () => new Promise((done, reject) => {
      const child = spawnChild(adb, ['-s', serial, 'shell', disposeCommand, nonce], { stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true });
      const timer = setTimeout(() => { child.kill(); reject(new Error(message)); }, 10_000);
      const finish = action => { clearTimeout(timer); action(); };
      child.once('error', () => finish(() => reject(new Error(message))));
      child.once('exit', code => finish(() => code === 0 ? done({ credentialCleanupConfirmed: true }) : reject(new Error(message))));
    });
    await new Promise((done, reject) => {
      // No caller content is interpolated in a device shell expression. Device
      // selection is a separate argv item; credentials travel through stdin.
      const child = spawnChild(adb, ['-s', serial, 'shell', command, nonce], {
        stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true,
      });
      const timer = setTimeout(() => { child.kill(); reject(new Error(message)); }, 10_000);
      const finish = action => { clearTimeout(timer); action(); };
      child.once('error', () => finish(() => reject(new Error(message))));
      child.once('exit', code => finish(() => code === 0 ? done() : reject(new Error(message))));
      child.stdin.once('error', () => finish(() => reject(new Error(message))));
      child.stdin.end(body);
    });
    return { dispose: disposal };
  } catch {
    const error = new Error(message);
    if (disposal) Object.defineProperty(error, 'dispose', { value: disposal });
    throw error;
  } finally {
    body?.fill(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // The complete operator owns the returned disposal capability. A standalone
  // one-shot delivery would lose that owner and leave a sidecar after consume.
  console.error('Use the complete zhou_real_model_store_probe.mjs mobile operator; standalone credential delivery is disabled.');
  process.exitCode = 1;
}
