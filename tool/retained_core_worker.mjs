import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createRetainedCoreRuntime, closeControlledRuntime } from '../backend/dist/src/bootstrap/retained-core-runtime.js';
import { FirestoreCatalogueWriter } from '../backend/dist/src/interests/infrastructure/firestore-catalogue-writer.js';
import { FirebaseAdminFirestoreGateway } from '../backend/dist/src/shared/infrastructure/firebase/firestore-gateway.js';
import { catalogueName, coreInterestNames } from '../backend/dist/src/interests/domain/catalogue-name.js';

const directory = process.env.ENMORI_RETAINED_CORE_DIRECTORY;
assert(directory);
// Firebase CLI adds its own config variables. Re-enter with the established
// credential-free environment builder before constructing any SDK or service.
if (process.env.FIREBASE_CONFIG !== undefined) {
  const env = buildControlledEmulatorTestEnvironment(process.env, process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  env.ENMORI_RETAINED_CORE_DIRECTORY = directory;
  env.ENMORI_RETAINED_CORE_VERIFY = process.env.ENMORI_RETAINED_CORE_VERIFY;
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { env, stdio: 'inherit' });
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
  process.exit(code ?? 1);
}
const runtime = await createRetainedCoreRuntime(process.env);
try {
  const auth = getAuth(runtime.firebaseApp), firestore = getFirestore(runtime.firebaseApp);
  const writer = new FirestoreCatalogueWriter(new FirebaseAdminFirestoreGateway(firestore));
  // Explicit approved add-only seed: no Admin claim is assigned to an account.
  for (const label of coreInterestNames) {
    const name = catalogueName(label);
    const result = await writer.create(name.displayName, name.comparisonKey);
    assert(['created', 'conflict'].includes(result.kind), 'Catalogue conflict/corruption requires inspection');
  }
  const mode = process.env.ENMORI_RETAINED_CORE_VERIFY;
  if (mode === '--verify-write' || mode === '--verify-read') {
    const receipt = join(directory, 'private-verification.json');
    let identity;
    if (mode === '--verify-write' && !existsSync(receipt)) {
      identity = { uid: `core-${randomUUID()}`, email: `core-${randomUUID()}@example.invalid`, password: `Test_${randomUUID()}` };
      await auth.createUser(identity);
      writeFileSync(receipt, JSON.stringify(identity), { flag: 'wx', mode: 0o600 });
    } else identity = JSON.parse(readFileSync(receipt, 'utf8'));
    const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: identity.email, password: identity.password, returnSecureToken: true }),
    });
    assert.equal(login.status, 200);
    const { idToken } = await login.json();
    let checkInRestartRead = false;
    const headers = { authorization: `Bearer ${idToken}` };
    const request = (method, url, payload, extra = {}) => runtime.app.inject({ method, url, headers: { ...headers, ...extra }, ...(payload ? { payload } : {}) });
    if (mode === '--verify-write') {
      if ((await request('GET', '/v1/me/onboarding')).json().status === 'required') assert.equal((await request('PUT', '/v1/me/onboarding', { username: `c_${randomUUID().replaceAll('-', '').slice(0,18)}`, initialChoice: 'accept' }, { 'idempotency-key': randomUUID() })).statusCode, 201);
      const result = await request('PUT', '/v1/me/profile', { displayName: 'Retained account', profileVisibility: 'private', expectedRevision: 0,
        details: { bio: 'Persistence verification', affiliationType: 'school', affiliationName: 'Example school', region: 'Singapore' } });
      assert.equal(result.statusCode, 200);
      const settings = await request('PUT', '/v1/me/settings', { checkInVisibility: 'friends_only', optionalProcessingConsent: 'rejected', expectedRevision: 0,
        fieldPrivacy: { interests: 'friends_only', location: 'private', participation: 'private', mapSharedWithFriends: false } });
      assert.equal(settings.statusCode, 200);
    }
    const profile = await request('GET', '/v1/me/profile');
    assert.equal(profile.statusCode, 200);
    assert.equal(profile.json().profile.details.bio, 'Persistence verification');
    const settings = await request('GET', '/v1/me/settings');
    assert.equal(settings.json().settings.optionalProcessingConsent, 'rejected');
    assert.equal(settings.json().settings.fieldPrivacy.mapSharedWithFriends, false);
    if (mode === '--verify-read') {
      const noteReceipt=join(directory,'private-checkin-verification.json');
      if(existsSync(noteReceipt)){
        const previous=JSON.parse(readFileSync(noteReceipt,'utf8'));
        const reread=await request('GET',`/v1/check-ins/${previous.checkInId}`);
        assert.equal(reread.statusCode,200);assert.equal(reread.json().checkIn.note,'Retained Check-in');assert.equal(reread.json().checkIn.mood,'Calm');checkInRestartRead=true;
      }else{
        const saved=await request('POST','/v1/check-ins',{note:'Retained Check-in',mood:'Calm',checkInVisibility:'private'},{'idempotency-key':randomUUID()});
        assert.equal(saved.statusCode,201);writeFileSync(noteReceipt,JSON.stringify({checkInId:saved.json().checkIn.checkInId}),{mode:0o600,flag:'wx'});
      }
      const newRecord=await request('POST','/v1/check-ins',{note:'',mood:'Happy',activity:'Study',checkInVisibility:'private'},{'idempotency-key':randomUUID()});
      assert.equal(newRecord.statusCode,201);const record=newRecord.json().checkIn;
      const month=record.createdAt.slice(0,7),date=record.createdAt.slice(0,10);
      const readCount=async()=>{const response=await request('GET',`/v1/me/check-ins/calendar?month=${month}&timeZone=UTC`);assert.equal(response.statusCode,200);return response.json().days.find(day=>day.date===date).count;};
      const beforeDelete=await readCount();assert(beforeDelete>=2);
      const update={note:'Updated Check-in',mood:'Focused',activity:'Study',checkInVisibility:'friends_only',expectedRevision:1};
      assert.equal((await request('PUT',`/v1/check-ins/${record.checkInId}`,update)).statusCode,200);
      assert.equal((await request('PUT',`/v1/check-ins/${record.checkInId}`,update)).statusCode,412);
      const updated=await request('GET',`/v1/check-ins/${record.checkInId}`);assert.equal(updated.json().checkIn.mood,'Focused');assert.equal(updated.json().checkIn.revision,2);
      assert.equal((await request('DELETE',`/v1/check-ins/${record.checkInId}`,{expectedRevision:2})).statusCode,200);
      assert.equal((await request('GET',`/v1/check-ins/${record.checkInId}`)).statusCode,404);
      assert.equal(await readCount(),beforeDelete-1);
      const label = `Concurrent ${randomUUID().slice(0,8)}`;
      const canonical = catalogueName(label);
      const concurrent = await Promise.all([writer.create(canonical.displayName, canonical.comparisonKey), writer.create(canonical.displayName, canonical.comparisonKey)]);
      assert.deepEqual(concurrent.map(r => r.kind).sort(), ['conflict', 'created']);
      assert.equal((await request('POST', '/v1/admin/interest-tags', { displayName: 'Denied ordinary write' })).statusCode, 403);
      await auth.setCustomUserClaims(identity.uid, { enmoriAdmin: true });
      assert.equal((await request('POST', '/v1/admin/interest-tags', { displayName: `Admin ${randomUUID().slice(0,8)}` })).statusCode, 201);
      await auth.setCustomUserClaims(identity.uid, {});
      assert.equal((await request('POST', '/v1/admin/interest-tags', { displayName: 'Denied revoked write' })).statusCode, 403);
    }
    writeFileSync(join(directory, mode === '--verify-write'  ? 'write-pass.json' : 'restart-pass.json'), JSON.stringify({ passed: true, profile: true, settings: true, authLogin: true, ...(mode==='--verify-read'?{checkInCreateEditReadDelete:true,calendarCountAfterDelete:true,checkInRestartRead}:{}), mode }), { mode: 0o600 });
  } else {
    assert(!mode, 'Unknown verification mode');
    await runtime.app.listen({ host: '127.0.0.1', port: 9380 });
    while (!existsSync(join(directory, 'stop-requested'))) await wait(250);
  }
} finally { await closeControlledRuntime(runtime); }
