import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {azureConfiguration, azureHost, startAzureBackend} from './azure_backend.mjs';
const valid = {
  ENMORI_AZURE_BACKEND_ONLY: 'true', WEBSITE_HOSTNAME: azureHost, PORT: '8080',
  IDENTITY_ENDPOINT: 'http://169.254.129.2:8081/msi/token', IDENTITY_HEADER: 'synthetic-header',
  ENMORI_TICKETMASTER_KEY: 'synthetic-key', ENMORI_TICKETMASTER_TERMS_ACCEPTED: 'true', ENMORI_MUSIC_TAG_ID: 'music',
};
test('Azure uses the exact managed identity audience and impersonation account', () => {
  const c = azureConfiguration(valid, '24.19.0');
  assert.equal(c.port, 8080);
  assert.equal(c.credential.type, 'external_account');
  assert.equal(new URL(c.credential.credential_source.url).searchParams.get('api-version'), '2019-08-01');
  assert.equal(new URL(c.credential.credential_source.url).searchParams.get('resource'), 'api://18887a0d-6060-4ed5-ad3b-9a1d9ec2410d');
  assert.equal(c.credential.credential_source.headers['X-IDENTITY-HEADER'], 'synthetic-header');
  assert.equal(c.credential.service_account_impersonation_url, 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/enmori-azure-backend@enmori-rmvp-controlled.iam.gserviceaccount.com:generateAccessToken');
  assert.equal(azureConfiguration({...valid, IDENTITY_ENDPOINT: 'http://127.0.0.1:8081/msi/token'}, '24.19.0').port, 8080);
});
test('rejects ambient personal credentials, emulators, wrong host and malformed settings', () => {
  for (const patch of [
    {ENMORI_AZURE_BACKEND_ONLY: undefined}, {WEBSITE_HOSTNAME: 'unapproved.azurewebsites.net'},
    {GOOGLE_APPLICATION_CREDENTIALS: '/personal.json'}, {FIRESTORE_EMULATOR_HOST: ''}, {FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099'},
    {PORT: '0'}, {PORT: '65536'}, {PORT: '8080x'}, {PORT: undefined},
    {IDENTITY_ENDPOINT: 'https://example.com/msi/token'}, {IDENTITY_ENDPOINT: 'http://127.0.0.1:8081/other'},
    {IDENTITY_ENDPOINT: 'http://user:secret@127.0.0.1/msi/token'}, {IDENTITY_ENDPOINT: 'http://127.0.0.1/msi/token?unexpected=true'},
    {IDENTITY_HEADER: ''}, {IDENTITY_HEADER: 'bad\r\nheader'},
    {ENMORI_TICKETMASTER_KEY: ''}, {ENMORI_TICKETMASTER_TERMS_ACCEPTED: 'false'}, {ENMORI_MUSIC_TAG_ID: '../private'},
  ]) assert.throws(() => azureConfiguration({...valid, ...patch}, '24.19.0'), JSON.stringify(Object.keys(patch)));
  assert.throws(() => azureConfiguration(valid, '24.0.0'));
});

test('Azure lifecycle probes read permissions before listening, excludes models and cleans credentials', async t => {
  let reads = 0, listening = 0, closed = 0, enabled = false, denyRead = false;
  let credentialPath;
  const runtime = {firebaseApp: {}, eventBrowseControl: {enable() {enabled = true;}, observation: () => ({enabled})}, app: {async listen(options) {
    assert.equal(reads, 2); assert.equal(enabled, true); assert.deepEqual(options, {host: '0.0.0.0', port: 8080}); listening++;
  }}};
  t.mock.method(globalThis, 'fetch', async () => {throw Error('No external network permitted');});
  t.mock.method(console, 'log', () => {});
  t.mock.module(new URL('../backend/dist/src/bootstrap/retained-core-runtime.js', import.meta.url), {exports: {
    createRemoteGroupRuntime: async (env, events, model, firstFlow) => {
      assert.equal(model, undefined); assert.equal(firstFlow, undefined); assert.equal(env.ENMORI_REMOTE_GROUP, 'true');
      assert.equal(events.musicInterestTagId, 'music');
      credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      assert.equal(statSync(credentialPath).mode & 0o777, 0o600);
      assert.equal(JSON.parse(readFileSync(credentialPath)).type, 'external_account');
      return runtime;
    }, closeControlledRuntime: async () => {closed++;},
  }});
  t.mock.module(new URL('./retained_core_events.mjs', import.meta.url), {exports: {retainedCoreEvents: (directory, requested, enabled, batchTimeoutMs) => {
    assert.equal(requested, true);
    assert.equal(batchTimeoutMs, 10000);
    const config = JSON.parse(readFileSync(`${directory}/event-source.json`));
    assert.equal(statSync(config.credentialFile).mode & 0o777, 0o600);
    return {configuration: 'configured', input: {source: {}, musicInterestTagId: config.musicInterestTagId}};
  }}});
  t.mock.module('firebase-admin/firestore', {exports: {getFirestore: () => ({doc: path => {
    assert.equal(path, 'interest_tags/music'); return {get: async () => {reads++; if (denyRead) throw Error('denied'); return {data: () => ({displayName: 'Music', lifecycleState: 'active'})};}};
  }})}});
  t.mock.module('firebase-admin/auth', {exports: {getAuth: () => ({getUser: async uid => {
    assert.equal(uid, 'enmori-cloud-readiness-probe'); reads++; throw {code: 'auth/user-not-found'};
  }})}});
  const original = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  t.after(() => {if (original === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS; else process.env.GOOGLE_APPLICATION_CREDENTIALS = original;});
  const close = await startAzureBackend(valid);
  assert.equal(listening, 1); assert(existsSync(credentialPath));
  await close(); await close();
  assert.equal(closed, 1); assert.equal(existsSync(credentialPath), false); assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  denyRead = true;
  await assert.rejects(startAzureBackend(valid));
  assert.equal(listening, 1); assert.equal(closed, 2); assert.equal(existsSync(credentialPath), false);
});
