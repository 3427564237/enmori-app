import assert from 'node:assert/strict';
import { beforeEach, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { createAuthBindingDocumentId } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { FirestoreCatalogueWriter } from '../src/interests/infrastructure/firestore-catalogue-writer.js';
import { FirestoreInterestRepository } from '../src/interests/infrastructure/firestore-interest-repository.js';
import { VerifiedMvpInterestReferences } from '../src/interests/infrastructure/firestore-interest-reference-inventory.js';
import { FirebaseInterestAdmin } from '../src/interests/infrastructure/firebase-interest-admin.js';
import { ManageInterestTags } from '../src/interests/application/manage-interest-tags.js';
import { catalogueName } from '../src/interests/domain/catalogue-name.js';

const env = requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId, 'demo-enmori-rmvp01a-r10');
const firebase = initializeApp({ projectId: env.projectId }, 'interest-management-emulator');
const firestore = getFirestore(firebase), auth = getAuth(firebase);
const gateway = new FirebaseAdminFirestoreGateway(firestore);
const writer = new FirestoreCatalogueWriter(gateway, new VerifiedMvpInterestReferences());
const selections = new FirestoreInterestRepository(gateway);
async function reset() {
  requireControlledEmulatorEnvironment(process.env);
  for (const url of [`http://${env.authHost}/emulator/v1/projects/${env.projectId}/accounts`,
    `http://${env.firestoreHost}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`]) {
    assert.equal((await fetch(url, { method: 'DELETE' })).ok, true);
  }
}
beforeEach(async () => {
  await reset();
  await firestore.doc('interest_tags/music').create({ displayName: 'Music', lifecycleState: 'active', revision: 1 });
  await firestore.doc(`auth_bindings/${createAuthBindingDocumentId('owner')}`).create({ accountId: 'owner' });
  await firestore.doc('accounts/owner').create({ username: 'owner', optionalProcessingConsent: 'rejected', checkInVisibility: 'private', onboardingCompletedAt: '2026-11-05T00:00:00.000Z' });
});
after(async () => { await reset(); await deleteApp(firebase); });

test('emulator equal-revision concurrent rename has one winner and fresh independent read', async () => {
  const results = await Promise.all([
    writer.change('music', 1, catalogueName('Sound')!), writer.change('music', 1, catalogueName('Rhythm')!),
  ]);
  assert.equal(results.filter(r => r.kind === 'saved').length, 1);
  assert.equal(results.filter(r => r.kind === 'revision_precondition_failed').length, 1);
  const winner = results.find(r => r.kind === 'saved'); if (!winner || winner.kind !== 'saved') assert.fail();
  assert.deepEqual(await writer.list(), { kind: 'read', interestTags: [winner.interestTag] });
  assert.equal(winner.interestTag.revision, 2);
});

test('emulator concurrent renames cannot claim the same Unicode comparison key twice', async () => {
  await firestore.doc('interest_tags/art').create({ displayName: 'Art', lifecycleState: 'inactive', revision: 1 });
  const results = await Promise.all([
    writer.change('music', 1, catalogueName('Straße')!), writer.change('art', 1, catalogueName('STRASSE')!),
  ]);
  assert.equal(results.filter(r => r.kind === 'saved').length, 1);
  assert.equal(results.filter(r => r.kind === 'name_conflict').length, 1);
  const current = await writer.list(); if (current.kind !== 'read') assert.fail();
  assert.equal(current.interestTags.filter(row => catalogueName(row.displayName)!.comparisonKey === 'strasse').length, 1);
});

test('emulator assignment/deactivation race retains any earlier assignment and rejects later new assignment', async () => {
  const [selected, inactive] = await Promise.all([
    selections.replaceOwn({ firebaseUid: 'owner', expectedRevision: 0, interestTagIds: ['music'] }),
    writer.change('music', 1, { lifecycleState: 'inactive' }),
  ]);
  assert.equal(inactive.kind, 'saved'); assert.ok(selected.kind === 'saved' || selected.kind === 'selection_invalid');
  const selection = (await firestore.doc('account_interests/owner').get()).data();
  if (selected.kind === 'saved') {
    assert.deepEqual(selection?.interestTagIds, ['music']);
    assert.equal((await selections.replaceOwn({ firebaseUid: 'owner', expectedRevision: 1, interestTagIds: ['music'] })).kind, 'saved');
    assert.deepEqual(await writer.delete('music', 2), { kind: 'referenced' });
  } else {
    assert.equal(selection, undefined);
    assert.deepEqual(await selections.replaceOwn({ firebaseUid: 'owner', expectedRevision: 0, interestTagIds: ['music'] }), { kind: 'selection_invalid' });
  }
});

test('emulator restore/delete race cannot leave an active deleted identity or dangling selection', async () => {
  assert.equal((await writer.change('music', 1, { lifecycleState: 'inactive' })).kind, 'saved');
  const [restored, deleted, selected] = await Promise.all([
    writer.change('music', 2, { lifecycleState: 'active' }), writer.delete('music', 2),
    selections.replaceOwn({ firebaseUid: 'owner', expectedRevision: 0, interestTagIds: ['music'] }),
  ]);
  const item = await firestore.doc('interest_tags/music').get(), selection = (await firestore.doc('account_interests/owner').get()).data();
  if (deleted.kind === 'deleted') {
    assert.equal(restored.kind, 'not_found'); assert.equal(item.exists, false);
    assert.equal(selected.kind, 'selection_invalid'); assert.equal(selection, undefined);
  } else {
    assert.equal(restored.kind, 'saved'); assert.equal(deleted.kind, 'revision_precondition_failed');
    assert.equal(item.data()?.lifecycleState, 'active'); assert.equal(item.data()?.revision, 3);
    if (selected.kind === 'saved') assert.deepEqual(selection?.interestTagIds, ['music']);
  }
});

test('emulator referenced retained Event blocks deletion; cleared exact inventory permits independent absence read', async () => {
  await writer.change('music', 1, { lifecycleState: 'inactive' });
  await firestore.doc('events/past').create({ title: 'Synthetic past Event', active: false, published: false,
    startAt: '2026-01-01T00:00:00Z', endAt: '2026-01-02T00:00:00Z', interestTagIds: ['music'] });
  assert.deepEqual(await writer.delete('music', 2), { kind: 'referenced' });
  await firestore.doc('events/past').delete();
  assert.deepEqual(await writer.delete('music', 2), { kind: 'deleted' });
  assert.deepEqual(await writer.list(), { kind: 'read', interestTags: [] });
  assert.deepEqual(await writer.delete('music', 2), { kind: 'not_found' });
});

test('emulator actual Admin claim removal/disabled identity denies subsequent management', async () => {
  await auth.createUser({ uid: 'admin' }); await auth.setCustomUserClaims('admin', { enmoriAdmin: true });
  const management = new ManageInterestTags(new FirebaseInterestAdmin(auth), writer), principal = { firebaseUid: 'admin' };
  assert.equal((await management.list(principal)).ok, true);
  await auth.setCustomUserClaims('admin', {});
  const revoked = await management.change(principal, 'music', { expectedRevision: 1, displayName: 'New' });
  assert.equal(revoked.ok, false); if (!revoked.ok) assert.equal(revoked.failure.code, 'AUTH_FORBIDDEN');
  await auth.setCustomUserClaims('admin', { enmoriAdmin: true }); await auth.updateUser('admin', { disabled: true });
  assert.equal((await management.list(principal)).ok, false);
  assert.equal((await firestore.doc('interest_tags/music').get()).data()?.displayName, 'Music');
});
