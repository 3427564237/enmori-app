/** Azure-only ordinary Backend entry. No model, personal ADC or local-host fallback. */
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const azureHost = 'enmori-backend-20261029.azurewebsites.net';
export const azureIndonesiaHost = 'enmori-backend-idc-20261104.azurewebsites.net';
const application = 'api://18887a0d-6060-4ed5-ad3b-9a1d9ec2410d';
const serviceAccount = 'enmori-azure-backend@enmori-rmvp-controlled.iam.gserviceaccount.com';
const federationAudiences = new Map([
  [azureHost, '//iam.googleapis.com/projects/11254388146/locations/global/workloadIdentityPools/enmori-azure-backend/providers/azure-app-service'],
  [azureIndonesiaHost, '//iam.googleapis.com/projects/11254388146/locations/global/workloadIdentityPools/enmori-azure-backend-idc/providers/azure-app-service'],
]);

export function azureConfiguration(env, nodeVersion = process.versions.node) {
  assert.equal(nodeVersion, '24.19.0');
  assert.equal(env.ENMORI_AZURE_BACKEND_ONLY, 'true');
  const audience = federationAudiences.get(env.WEBSITE_HOSTNAME);
  assert(audience, 'Unapproved Azure hostname');
  for (const key of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS']) {
    assert.equal(env[key], undefined, 'Ambient credential/emulator configuration forbidden');
  }
  assert(typeof env.PORT === 'string' && /^[1-9][0-9]{0,4}$/.test(env.PORT));
  const port = Number(env.PORT);
  assert(port <= 65535);
  const endpoint = new URL(env.IDENTITY_ENDPOINT);
  assert(endpoint.protocol === 'http:' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash);
  assert(endpoint.hostname === '127.0.0.1' || /^169\.254\.\d{1,3}\.\d{1,3}$/.test(endpoint.hostname));
  assert.equal(endpoint.pathname, '/msi/token');
  assert(typeof env.IDENTITY_HEADER === 'string' && env.IDENTITY_HEADER.length > 0 && !/[\r\n]/.test(env.IDENTITY_HEADER));
  assert(typeof env.ENMORI_TICKETMASTER_KEY === 'string' && env.ENMORI_TICKETMASTER_KEY.length > 0 && !/\s/.test(env.ENMORI_TICKETMASTER_KEY));
  assert.equal(env.ENMORI_TICKETMASTER_TERMS_ACCEPTED, 'true');
  assert(typeof env.ENMORI_MUSIC_TAG_ID === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(env.ENMORI_MUSIC_TAG_ID));
  endpoint.searchParams.set('resource', application);
  endpoint.searchParams.set('api-version', '2019-08-01');
  return {
    port, musicInterestTagId: env.ENMORI_MUSIC_TAG_ID,
    credential: {
      type: 'external_account', audience,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
      credential_source: {url: endpoint.href, headers: {'X-IDENTITY-HEADER': env.IDENTITY_HEADER}, format: {type: 'json', subject_token_field_name: 'access_token'}},
    },
  };
}

export async function startAzureBackend(env = process.env) {
  // Allowlisted, non-secret deployment diagnostics. Never log the full environment.
  console.log(JSON.stringify({phase: 'configuration', nodeVersion: process.versions.node,
    selectedHost: federationAudiences.has(env.WEBSITE_HOSTNAME),
    identityEndpointPath: (() => {try {return new URL(env.IDENTITY_ENDPOINT).pathname;} catch {return 'invalid';}})(),
  }));
  const config = azureConfiguration(env);
  const directory = mkdtempSync(join(tmpdir(), 'enmori-azure-'));
  const credentialPath = join(directory, 'federation.json');
  // The platform identity header is sensitive; this file never enters the bundle.
  writeFileSync(credentialPath, JSON.stringify(config.credential), {mode: 0o600});
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
  let runtime;
  let phase = 'composition';
  try {
    const {createRemoteGroupRuntime, closeControlledRuntime} = await import('../backend/dist/src/bootstrap/retained-core-runtime.js');
    const {retainedCoreEvents} = await import('./retained_core_events.mjs');
    const {getFirestore} = await import('firebase-admin/firestore');
    const {getAuth} = await import('firebase-admin/auth');
    const eventCredentialPath = join(directory, 'event-credential.json');
    writeFileSync(eventCredentialPath, JSON.stringify({apiKey: env.ENMORI_TICKETMASTER_KEY, termsAccepted: true}), {mode: 0o600});
    writeFileSync(join(directory, 'event-source.json'), JSON.stringify({credentialFile: eventCredentialPath, musicInterestTagId: config.musicInterestTagId}), {mode: 0o600});
    const events = retainedCoreEvents(directory, true, () => runtime?.eventBrowseControl?.observation().enabled === true, 10000);
    assert.equal(events.configuration, 'configured');
    runtime = await createRemoteGroupRuntime({
      ...env, ENMORI_REMOTE_GROUP: 'true', ENMORI_ENVIRONMENT: 'controlled-demo',
      ENMORI_FIREBASE_PROJECT_ID: 'enmori-rmvp-controlled',
    }, events.input, undefined);
    phase = 'firestore-read';
    const music = await getFirestore(runtime.firebaseApp).doc(`interest_tags/${config.musicInterestTagId}`).get();
    assert(music.data()?.displayName === 'Music' && music.data()?.lifecycleState === 'active');
    // Read-only permission probe; absence is expected and never creates an account.
    phase = 'auth-read';
    try {await getAuth(runtime.firebaseApp).getUser('enmori-cloud-readiness-probe');}
    catch (error) {if (error?.code !== 'auth/user-not-found') throw error;}
    runtime.eventBrowseControl.enable();
    phase = 'listen';
    await runtime.app.listen({host: '0.0.0.0', port: config.port});
    console.log(JSON.stringify({phase: 'listening', firebaseRead: true, aiConfigured: false}));
    let closed = false;
    return async () => {
      if (closed) return;
      closed = true;
      try {await closeControlledRuntime(runtime);}
      finally {delete process.env.GOOGLE_APPLICATION_CREDENTIALS; rmSync(directory, {recursive: true, force: true});}
    };
  } catch (error) {
    console.error(JSON.stringify({phase, category: 'dependency-failure',
      code: Number.isInteger(error?.code) ? error.code :
        typeof error?.code === 'string' && /^(auth\/[a-z-]+|ERR_[A-Z_]+|E[A-Z]+)$/.test(error.code) ? error.code : 'unclassified',
    }));
    if (runtime) {
      const {closeControlledRuntime} = await import('../backend/dist/src/bootstrap/retained-core-runtime.js');
      await closeControlledRuntime(runtime).catch(() => {});
    }
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    rmSync(directory, {recursive: true, force: true});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const close = await startAzureBackend();
    await new Promise(done => {process.once('SIGTERM', done); process.once('SIGINT', done);});
    await close();
  } catch {
    console.error(JSON.stringify({phase: 'failed', category: 'azure-backend-configuration-or-dependency'}));
    process.exitCode = 1;
  }
}
