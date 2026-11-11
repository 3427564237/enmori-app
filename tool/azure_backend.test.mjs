import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {azureConfiguration, azureHost, azureIndonesiaHost, startAzureBackend} from './azure_backend.mjs';
import {syntheticCostGrant} from '../backend/dist/test/support/cloud-cost-fixtures.js';
const valid = {
  ENMORI_AZURE_BACKEND_ONLY: 'true', WEBSITE_HOSTNAME: azureHost, PORT: '8080',
  IDENTITY_ENDPOINT: 'http://169.254.129.2:8081/msi/token', IDENTITY_HEADER: 'synthetic-header',
  ENMORI_TICKETMASTER_KEY: 'synthetic-key', ENMORI_TICKETMASTER_TERMS_ACCEPTED: 'true', ENMORI_MUSIC_TAG_ID: 'music',
};
const syntheticOpenAiKey = 'sk-proj-synthetic_azure_key_1234567890';
const arm = {
  claim: { expectedFence: {processEpoch: '11111111-1111-4111-8111-111111111111', generation: 4, cleanupGeneration: 2}, expiresAtMs: 2000000 },
  firebaseUid: 'synthetic-private-test-uid', rateScope: 'synthetic_scope',
  ratePolicy: {minute: {windowMs: 60000, maxRequests: 60, maxTokens: 614400},
    day: {windowMs: 86400000, maxRequests: 1000, maxTokens: 10240000}, tokensPerRequest: 10240},
  grant: {...syntheticCostGrant, originalGiftCreditNanoUsd: 68_000_000_000, verifiedSpendableRemainingNanoUsd: 68_000_000_000,
    capNanoUsd: 3_400_000_000},
};
const armed = {...valid, ENMORI_OPENAI_TEST_APP: 'true', ENMORI_OPENAI_TEST_APP_CONFIG: JSON.stringify(arm),
  ENMORI_OPENAI_API_KEY: syntheticOpenAiKey};
test('Azure uses the exact managed identity audience and impersonation account', () => {
  const c = azureConfiguration(valid, '24.19.0');
  assert.equal(c.port, 8080);
  assert.equal(c.credential.type, 'external_account');
  assert.equal(c.credential.audience, '//iam.googleapis.com/projects/11254388146/locations/global/workloadIdentityPools/enmori-azure-backend/providers/azure-app-service');
  assert.equal(new URL(c.credential.credential_source.url).searchParams.get('api-version'), '2019-08-01');
  assert.equal(new URL(c.credential.credential_source.url).searchParams.get('resource'), 'api://18887a0d-6060-4ed5-ad3b-9a1d9ec2410d');
  assert.equal(c.credential.credential_source.headers['X-IDENTITY-HEADER'], 'synthetic-header');
  assert.equal(c.credential.service_account_impersonation_url, 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/enmori-azure-backend@enmori-rmvp-controlled.iam.gserviceaccount.com:generateAccessToken');
  assert.equal(azureConfiguration({...valid, IDENTITY_ENDPOINT: 'http://127.0.0.1:8081/msi/token'}, '24.19.0').port, 8080);
});
test('Indonesia candidate uses its own federation audience and the existing scoped service account', () => {
  const japan = azureConfiguration(valid, '24.19.0').credential;
  const indonesia = azureConfiguration({...valid, WEBSITE_HOSTNAME: azureIndonesiaHost}, '24.19.0').credential;
  assert.deepEqual(indonesia, {
    ...japan,
    audience: '//iam.googleapis.com/projects/11254388146/locations/global/workloadIdentityPools/enmori-azure-backend-idc/providers/azure-app-service',
  });
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

test('OpenAI arm is explicit, Japan-only, and never falls back to ordinary Settings on malformed input', () => {
  for (const mode of [undefined, 'false']) {
    const disarmed = {...valid, ENMORI_OPENAI_TEST_APP: mode};
    for (const name of ['ENMORI_OPENAI_TEST_APP_CONFIG', 'ENMORI_OPENAI_API_KEY']) {
      Object.defineProperty(disarmed, name, {get() { throw Error('Inactive setting was read'); }});
    }
    assert.equal(azureConfiguration(disarmed, '24.19.0').cloudTestApp, undefined);
  }
  assert.equal(azureConfiguration({...armed, ENMORI_OPENAI_TEST_APP: 'TRUE'}, '24.19.0').cloudTestApp, null);
  assert.throws(() => azureConfiguration({...armed, WEBSITE_HOSTNAME: azureIndonesiaHost}, '24.19.0'),
    {message: 'OPENAI_TEST_APP_HOST_UNAPPROVED'});
  assert.deepEqual(azureConfiguration(armed, '24.19.0').cloudTestApp, {...arm, apiKey: syntheticOpenAiKey});
  for (const raw of [undefined, '[', '[]', JSON.stringify({...arm, apiKey: syntheticOpenAiKey}),
    JSON.stringify({...arm, firebaseUid: ' '}), JSON.stringify({...arm, claim: {...arm.claim, expectedFence: undefined}}),
    JSON.stringify({...arm, ratePolicy: {...arm.ratePolicy, tokensPerRequest: 1}}), JSON.stringify({...arm, grant: {}})]) {
    assert.equal(azureConfiguration({...armed, ENMORI_OPENAI_TEST_APP_CONFIG: raw}, '24.19.0').cloudTestApp, null);
  }
  assert.equal(azureConfiguration({...armed, ENMORI_OPENAI_API_KEY: undefined}, '24.19.0').cloudTestApp, null);
});

test('Azure lifecycle passes only the explicit arm, probes permissions, and sanitizes failures', async t => {
  let reads = 0, listening = 0, closed = 0, enabled = false, denyRead = false, denyClose = false;
  let credentialPath, expectedArm;
  const logs = [];
  const runtime = {firebaseApp: {}, aiStatus: () => ({available: false}), eventBrowseControl: {enable() {enabled = true;}, observation: () => ({enabled})}, app: {async listen(options) {
    assert.equal(reads, 2); assert.equal(enabled, true); assert.deepEqual(options, {host: '0.0.0.0', port: 8080}); listening++;
  }}};
  t.mock.method(globalThis, 'fetch', async () => {throw Error('No external network permitted');});
  t.mock.method(console, 'log', value => logs.push(value));
  t.mock.method(console, 'error', value => logs.push(value));
  t.mock.module(new URL('../backend/dist/src/bootstrap/retained-core-runtime.js', import.meta.url), {exports: {
    createRemoteGroupRuntime: async (env, events, model, firstFlow, cloudTestApp) => {
      assert.equal(model, undefined); assert.equal(firstFlow, undefined); assert.equal(env.ENMORI_REMOTE_GROUP, 'true');
      assert.deepEqual(cloudTestApp, expectedArm);
      assert.equal(Object.keys(env).some(name => name.startsWith('ENMORI_OPENAI_')), false);
      assert.equal(events.musicInterestTagId, 'music');
      credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      assert.equal(statSync(credentialPath).mode & 0o777, 0o600);
      assert.equal(JSON.parse(readFileSync(credentialPath)).type, 'external_account');
      return runtime;
    }, closeControlledRuntime: async () => {closed++; if (denyClose) throw Error(syntheticOpenAiKey);},
  }});
  t.mock.module(new URL('./retained_core_events.mjs', import.meta.url), {exports: {retainedCoreEvents: (directory, requested, enabled, batchTimeoutMs) => {
    assert.equal(requested, true);
    assert.equal(batchTimeoutMs, 90000);
    const config = JSON.parse(readFileSync(`${directory}/event-source.json`));
    assert.equal(statSync(config.credentialFile).mode & 0o777, 0o600);
    return {configuration: 'configured', input: {source: {}, musicInterestTagId: config.musicInterestTagId}};
  }}});
  t.mock.module('firebase-admin/firestore', {exports: {getFirestore: () => ({doc: path => {
    assert.equal(path, 'interest_tags/music'); return {get: async () => {
      reads++;
      if (denyRead) throw Object.assign(Error(syntheticOpenAiKey), {code: syntheticOpenAiKey});
      return {data: () => ({displayName: 'Music', lifecycleState: 'active'})};
    }};
  }})}});
  t.mock.module('firebase-admin/auth', {exports: {getAuth: () => ({getUser: async uid => {
    assert.equal(uid, 'enmori-cloud-readiness-probe'); reads++; throw {code: 'auth/user-not-found'};
  }})}});
  const original = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  t.after(() => {if (original === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS; else process.env.GOOGLE_APPLICATION_CREDENTIALS = original;});
  for (const [input, expected] of [
    [{...armed, ENMORI_OPENAI_TEST_APP: 'false'}, undefined],
    [{...armed, ENMORI_OPENAI_TEST_APP_CONFIG: 'invalid'}, null],
    [armed, {...arm, apiKey: syntheticOpenAiKey}],
  ]) {
    expectedArm = expected;
    reads = 0;
    enabled = false;
    const close = await startAzureBackend(input);
    assert(existsSync(credentialPath));
    denyClose = expected !== undefined && expected !== null;
    if (denyClose) await assert.rejects(close(), {message: 'AZURE_BACKEND_SHUTDOWN_FAILURE'});
    else await close();
    await close();
    assert.equal(existsSync(credentialPath), false); assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  }
  assert.equal(listening, 3); assert.equal(closed, 3);
  denyClose = false;
  denyRead = true;
  await assert.rejects(startAzureBackend(armed), {message: 'AZURE_BACKEND_DEPENDENCY_FAILURE'});
  assert.equal(listening, 3); assert.equal(closed, 4); assert.equal(existsSync(credentialPath), false);
  assert(!logs.join('\n').includes(syntheticOpenAiKey));
  assert(!logs.join('\n').includes(arm.firebaseUid));
  assert.deepEqual(logs.map(line => JSON.parse(line)).filter(row => row.phase === 'listening').map(row => row.aiConfigured), [false, true, true]);
});
