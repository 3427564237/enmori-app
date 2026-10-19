/** Same TLS/nonce handoff as the existing candidate; no credential in the APK. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, lstatSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:https';

export async function startRetainedCorePhone(runtime, auth, directory, eventConfiguration = 'not_requested') {
  const publish = (name, value) => {
    const target = join(directory, name);
    writeFileSync(target + '.pending', JSON.stringify(value), { mode: 0o600, flag: 'wx', flush: true });
    renameSync(target + '.pending', target);
  };
  const certificatePath = join(directory, 'phone-certificate.pem');
  const keyPath = join(directory, 'phone-key.pem');
  assert.equal(existsSync(certificatePath), existsSync(keyPath), 'Incomplete TLS material; preserve and inspect');
  if (!existsSync(keyPath)) {
    const generated = spawnSync('/usr/bin/openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-noenc',
      '-keyout', keyPath, '-out', certificatePath, '-days', '30', '-subj', '/CN=ENMORI controlled localhost',
      '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8', timeout: 15000 });
    assert.equal(generated.status, 0, 'Local TLS certificate creation failed');
  }
  for (const path of [certificatePath, keyPath]) {
    const stat = lstatSync(path);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid());
  }
  const certificate = readFileSync(certificatePath);
  const parsed = new X509Certificate(certificate);
  assert.equal(parsed.checkIP('127.0.0.1'), '127.0.0.1');
  assert(Date.parse(parsed.validFrom) <= Date.now() && Date.parse(parsed.validTo) > Date.now(), 'TLS expired; explicit renewal required');
  const identitiesPath = join(directory, 'phone-identities.json');
  if (!existsSync(identitiesPath)) {
    const identity = () => ({ uid: `phone-${randomUUID()}`, email: `phone-${randomUUID()}@example.invalid`, password: `Test_${randomUUID()}` });
    writeFileSync(identitiesPath, JSON.stringify({ primary: identity(), secondary: identity() }), { flag: 'wx', mode: 0o600 });
  }
  const identities = JSON.parse(readFileSync(identitiesPath, 'utf8'));
  // Primary is reserved for native registration; it is never reset on restart.
  const secondary = identities.secondary;
  try {
    const found = await auth.getUser(secondary.uid);
    assert.equal(found.email, secondary.email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    await auth.createUser(secondary);
  }
  await runtime.app.ready();
  const server = createServer({ cert: certificate, key: readFileSync(keyPath) }, runtime.app.routing);
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(9380, '127.0.0.1', resolve);
  });
  try {
    publish('handoff.json', { schemaVersion: 2,
      projectId: 'demo-enmori-rmvp01a-r10', email: identities.primary.email, password: identities.primary.password,
      secondaryAccount: { email: secondary.email, password: secondary.password },
      baseUri: 'https://127.0.0.1:9380/', certificateBase64: certificate.toString('base64'),
      authEmulatorHost: '127.0.0.1:9099', lifetime: 'until-explicit-stop-in-this-owned-process', syntheticOwnerOnly: true,
    });
    publish('phone-ready.json', { ready: true, port: 9380, authPort: 9099,
      mode: 'retained-core', aiEnabled: runtime.aiStatus().available, aiMaintenanceHealthy: runtime.aiStatus().maintenanceHealthy,
      eventConfiguration, eventsProviderEnabled: runtime.eventBrowseControl.observation().enabled });
  } catch (error) {
    await new Promise(resolve => server.close(resolve));
    throw error;
  }
  return async () => {
    publish('phone-ready.json', { ready: false });
    server.closeIdleConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  };
}
