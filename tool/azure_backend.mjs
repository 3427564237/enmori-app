/** Azure Backend entry. Ordinary by default, with an explicit Sol test-app arm. */
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {costRecord, decodeOpenAiDeploymentCostGrant, exactCostFields, isCostInteger, isCostUuid} from '../backend/dist/src/ai-runtime/domain/cloud-cost.js';
import {parseServiceOwnership} from '../backend/dist/src/ai-runtime/domain/service-owner.js';

export const azureHost = 'enmori-backend-20261029.azurewebsites.net';
export const azureIndonesiaHost = 'enmori-backend-idc-20261104.azurewebsites.net';
const application = 'api://18887a0d-6060-4ed5-ad3b-9a1d9ec2410d';
const serviceAccount = 'enmori-azure-backend@enmori-rmvp-controlled.iam.gserviceaccount.com';
const federationAudiences = new Map([
  [azureHost, '//iam.googleapis.com/projects/11254388146/locations/global/workloadIdentityPools/enmori-azure-backend/providers/azure-app-service'],
  [azureIndonesiaHost, '//iam.googleapis.com/projects/11254388146/locations/global/workloadIdentityPools/enmori-azure-backend-idc/providers/azure-app-service'],
]);
const openAiSettings = new Set(['ENMORI_OPENAI_TEST_APP', 'ENMORI_OPENAI_TEST_APP_CONFIG', 'ENMORI_OPENAI_API_KEY']);
const exactRecord = (value, keys) => costRecord(value) && exactCostFields(value, keys);

/** Owner loss already retired the shared capability synchronously. Best-effort
 * disposal is bounded; exiting is never evidence of remote physical settlement. */
export function watchOwnershipLoss(whenLost, close, {schedule=(wake,ms)=>setTimeout(wake,ms),
  cancel=timer=>clearTimeout(timer),exit=code=>process.exit(code)}={}) {
  let stopped=false,handling=false,exited=false;
  if(!whenLost)return()=>{};
  Promise.resolve(whenLost).then(()=>{
    if(stopped||handling)return;handling=true;
    let timer;
    const finish=()=>{if(exited)return;exited=true;cancel(timer);exit(1);};
    timer=schedule(finish,15000);
    Promise.resolve().then(close).then(finish,finish);
  }).catch(()=>{/* The owner-loss promise is locally constructed and never rejects. */});
  // Ordinary SIGTERM uses the existing unbounded drain, with no owner-loss exit timer.
  return()=>{if(!handling)stopped=true;};
}

function rateWindow(value, duration, maxRequests, maxTokens) {
  return exactRecord(value, ['windowMs', 'maxRequests', 'maxTokens']) && value.windowMs === duration &&
    isCostInteger(value.maxRequests) && value.maxRequests > 0 && value.maxRequests <= maxRequests &&
    isCostInteger(value.maxTokens) && value.maxTokens >= 10240 && value.maxTokens <= maxTokens;
}

function openAiTestAppConfiguration(env) {
  const mode = env.ENMORI_OPENAI_TEST_APP;
  if (mode === undefined || mode === 'false') return undefined;
  if (env.WEBSITE_HOSTNAME !== azureHost) throw Error('OPENAI_TEST_APP_HOST_UNAPPROVED');
  if (mode !== 'true') return null;

  const raw = env.ENMORI_OPENAI_TEST_APP_CONFIG, apiKey = env.ENMORI_OPENAI_API_KEY;
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 16384 ||
      typeof apiKey !== 'string' || !/^sk-[A-Za-z0-9_-]{20,508}$/.test(apiKey)) return null;
  let input;
  try { input = JSON.parse(raw); } catch { return null; }
  const hasClaim=Object.hasOwn(input??{},'claim'),hasOwnership=Object.hasOwn(input??{},'ownership');
  if(hasClaim===hasOwnership)return null;
  if (!exactRecord(input, [hasClaim?'claim':'ownership', 'firebaseUid', 'grant', 'rateScope', 'ratePolicy', ...(Object.hasOwn(input ?? {}, 'firstFlow') ? ['firstFlow'] : [])])) return null;
  const firstFlow=input.firstFlow;
  if(firstFlow!==undefined && (!exactRecord(firstFlow,['audience','worker','push']) || firstFlow.audience!=='registered_accounts' ||
      !exactRecord(firstFlow.worker,['mode','intervalMs']) || firstFlow.worker.mode!=='service' || firstFlow.worker.intervalMs!==60000 ||
      !exactRecord(firstFlow.push,['leaseDurationMs']) || firstFlow.push.leaseDurationMs!==2592000000)) return null;
  const {claim, firebaseUid, rateScope, ratePolicy} = input;
  const ownership=hasOwnership?parseServiceOwnership(input.ownership):undefined;
  if(hasOwnership&&!ownership)return null;
  if(hasClaim){
    if (!exactRecord(claim, ['expectedFence', 'expiresAtMs']) || !isCostInteger(claim.expiresAtMs) || claim.expiresAtMs === 0) return null;
    const {expectedFence} = claim;
    if (!exactRecord(expectedFence, ['processEpoch', 'generation', 'cleanupGeneration']) || !isCostUuid(expectedFence.processEpoch) ||
      !isCostInteger(expectedFence.generation) || expectedFence.generation < 1 || expectedFence.generation >= Number.MAX_SAFE_INTEGER ||
      !isCostInteger(expectedFence.cleanupGeneration)) return null;
  }
  if (typeof firebaseUid !== 'string' || firebaseUid.trim().length === 0 || firebaseUid.length > 128 || !firebaseUid.isWellFormed() ||
      typeof rateScope !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(rateScope) ||
      !exactRecord(ratePolicy, ['minute', 'day', 'tokensPerRequest']) || ratePolicy.tokensPerRequest !== 10240 ||
      !rateWindow(ratePolicy.minute, 60000, 60, 614400) || !rateWindow(ratePolicy.day, 86400000, 1000, 10240000) ||
      ratePolicy.day.maxRequests < ratePolicy.minute.maxRequests || ratePolicy.day.maxTokens < ratePolicy.minute.maxTokens) return null;
  const grant = decodeOpenAiDeploymentCostGrant(input.grant);
  return grant ? {...(ownership?{ownership}:{claim}), firebaseUid, grant, rateScope, ratePolicy, apiKey, ...(firstFlow?{firstFlow}:{})} : null;
}

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
    port, musicInterestTagId: env.ENMORI_MUSIC_TAG_ID, cloudTestApp: openAiTestAppConfiguration(env),
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
  const config = azureConfiguration(env);
  // Allowlisted, non-secret deployment diagnostics. Never log the full environment.
  console.log(JSON.stringify({phase: 'configuration', nodeVersion: process.versions.node,
    selectedHost: true, identityEndpointPath: '/msi/token',
    cloudTestApp: config.cloudTestApp === undefined ? 'disarmed' : config.cloudTestApp === null ? 'invalid' : 'armed',
  }));
  const directory = mkdtempSync(join(tmpdir(), 'enmori-azure-'));
  const credentialPath = join(directory, 'federation.json');
  // The platform identity header is sensitive; this file never enters the bundle.
  writeFileSync(credentialPath, JSON.stringify(config.credential), {mode: 0o600});
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
  let runtime;
  let composing;
  let cancelOwnershipWatch=()=>{};
  let closing;
  const close=()=>{
    if(closing)return closing;
    cancelOwnershipWatch();
    closing=(async()=>{
      try{
        if(!runtime&&composing)try{runtime=await composing;}catch{}
        if(runtime){const {closeControlledRuntime}=await import('../backend/dist/src/bootstrap/retained-core-runtime.js');await closeControlledRuntime(runtime);}
      }
      catch{throw Error('AZURE_BACKEND_SHUTDOWN_FAILURE');}
      finally{delete process.env.GOOGLE_APPLICATION_CREDENTIALS;rmSync(directory,{recursive:true,force:true});}
    })();return closing;
  };
  let phase = 'composition';
  try {
    const {createRemoteGroupRuntime, closeControlledRuntime} = await import('../backend/dist/src/bootstrap/retained-core-runtime.js');
    const {retainedCoreEvents} = await import('./retained_core_events.mjs');
    const {getFirestore} = await import('firebase-admin/firestore');
    const {getAuth} = await import('firebase-admin/auth');
    const eventCredentialPath = join(directory, 'event-credential.json');
    writeFileSync(eventCredentialPath, JSON.stringify({apiKey: env.ENMORI_TICKETMASTER_KEY, termsAccepted: true}), {mode: 0o600});
    writeFileSync(join(directory, 'event-source.json'), JSON.stringify({credentialFile: eventCredentialPath, musicInterestTagId: config.musicInterestTagId}), {mode: 0o600});
    const events = retainedCoreEvents(directory, true, () => runtime?.eventBrowseControl?.observation().enabled === true, 180000);
    assert.equal(events.configuration, 'configured');
    const backendEnvironment = Object.fromEntries(Object.keys(env).filter(name => !openAiSettings.has(name)).map(name => [name, env[name]]));
    let reportOwnershipLost;
    const ownershipLost=new Promise(resolve=>{reportOwnershipLost=resolve;});
    cancelOwnershipWatch=watchOwnershipLoss(ownershipLost,close);
    composing = createRemoteGroupRuntime({
      ...backendEnvironment, ENMORI_REMOTE_GROUP: 'true', ENMORI_ENVIRONMENT: 'controlled-demo',
      ENMORI_FIREBASE_PROJECT_ID: 'enmori-rmvp-controlled',
    }, events.input, undefined, undefined, config.cloudTestApp,reportOwnershipLost);
    runtime=await composing;
    if(runtime.cloudOwnershipLost?.())throw Error('OPENAI_SERVICE_OWNER_LOST');
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
    // Only public onePA acquisition; ordinary routes do not wait for warmup.
    runtime.eventBrowseControl.startWarmup();
    const aiConfigured = config.cloudTestApp !== undefined;
    console.log(JSON.stringify({phase: 'listening', firebaseRead: true, aiConfigured,
      ...(aiConfigured ? {aiAvailable: config.cloudTestApp !== null && runtime.aiStatus().available === true} : {})}));
    // Keep repeat manual-close behavior while sharing one in-flight disposal.
    let closeReturned=false;return async()=>{if(closeReturned)return;closeReturned=true;await close();};
  } catch (error) {
    console.error(JSON.stringify({phase, category: 'dependency-failure',
      code: Number.isInteger(error?.code) ? error.code :
        typeof error?.code === 'string' && /^(auth\/[a-z-]+|ERR_[A-Z_]+|E[A-Z]+)$/.test(error.code) ? error.code : 'unclassified',
    }));
    if (runtime) {
      await close().catch(() => {});
    }
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    rmSync(directory, {recursive: true, force: true});
    throw Error('AZURE_BACKEND_DEPENDENCY_FAILURE');
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
