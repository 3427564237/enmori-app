import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Fastify from 'fastify';
import { ManageInterestTags } from '../../src/interests/application/manage-interest-tags.js';
import { CreateInterestTag } from '../../src/interests/application/create-interest-tag.js';
import { catalogueName } from '../../src/interests/domain/catalogue-name.js';
import { FirestoreCatalogueWriter } from '../../src/interests/infrastructure/firestore-catalogue-writer.js';
import { FirestoreInterestRepository } from '../../src/interests/infrastructure/firestore-interest-repository.js';
import { VerifiedMvpInterestReferences } from '../../src/interests/infrastructure/firestore-interest-reference-inventory.js';
import { registerInterestAdmin, manageInterestTagsSchema, changeInterestTagSchema, deleteInterestTagSchema } from '../../src/interests/transport/admin-routes.js';
import { createAuthBindingDocumentId } from '../../src/shared/infrastructure/firebase/firestore-records.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import type { StoredDocument } from '../../src/shared/infrastructure/firebase/firestore-gateway.js';

const tag = (displayName = 'Music', lifecycleState = 'active', revision = 1) => ({ displayName, lifecycleState, revision });
const namePath = (value: string) => `interest_tag_names/${createHash('sha256').update(catalogueName(value)!.comparisonKey).digest('hex')}`;
const allowed = { currentAdmin: async () => 'allowed' as const };
const principal = { firebaseUid: 'admin' };
function fixture(seed: Record<string, StoredDocument> = {}) {
  const gateway = new InMemoryFirestoreGateway({ 'interest_tags/music': tag(), ...seed });
  const writer = new FirestoreCatalogueWriter(gateway, new VerifiedMvpInterestReferences());
  const app = new ManageInterestTags(allowed, writer);
  return { gateway, writer, app };
}

test('management reads active and inactive in stable ID order without writes', async () => {
  const f = fixture({ 'interest_tags/art': tag('Art', 'inactive', 4) }), before = f.gateway.entries();
  assert.deepEqual(await f.writer.list(), { kind: 'read', interestTags: [
    { interestTagId: 'art', ...tag('Art', 'inactive', 4) }, { interestTagId: 'music', ...tag() },
  ] });
  assert.deepEqual(f.gateway.entries(), before);
});

test('rename preserves identity/references, updates live label and advances revision once', async () => {
  const f = fixture({
    [`auth_bindings/${createAuthBindingDocumentId('owner')}`]: { accountId: 'owner' },
    'accounts/owner': { username: 'owner', optionalProcessingConsent: 'rejected', checkInVisibility: 'private', onboardingCompletedAt: '2026-11-05T00:00:00.000Z' },
    'account_interests/owner': { interestTagIds: ['music'], revision: 3 },
  });
  const before = f.gateway.read('account_interests/owner');
  const saved = await f.app.change(principal, 'music', { expectedRevision: 1, displayName: '  Sound  ' });
  assert.deepEqual(saved, { ok: true, value: { interestTagId: 'music', ...tag('Sound', 'active', 2) } });
  assert.deepEqual(f.gateway.read('account_interests/owner'), before);
  const current = await new FirestoreInterestRepository(f.gateway).getOwn('owner');
  assert.equal(current.kind, 'found');
  if (current.kind === 'found') assert.equal(current.value.interestTags[0]?.displayName, 'Sound');
  assert.deepEqual(await f.writer.list(), { kind: 'read', interestTags: [saved.ok ? saved.value : null] });
});

test('deactivation preserves existing reference, rejects new assignment, restore revives same ID', async () => {
  const f = fixture({
    [`auth_bindings/${createAuthBindingDocumentId('owner')}`]: { accountId: 'owner' },
    [`auth_bindings/${createAuthBindingDocumentId('new')}`]: { accountId: 'new' },
    'accounts/owner': { username: 'owner', optionalProcessingConsent: 'rejected', checkInVisibility: 'private', onboardingCompletedAt: '2026-11-05T00:00:00.000Z' },
    'accounts/new': { username: 'new', optionalProcessingConsent: 'rejected', checkInVisibility: 'private', onboardingCompletedAt: '2026-11-05T00:00:00.000Z' },
    'account_interests/owner': { interestTagIds: ['music'], revision: 1 },
  });
  const interests = new FirestoreInterestRepository(f.gateway);
  assert.equal((await f.app.change(principal, 'music', { expectedRevision: 1, lifecycleState: 'inactive' })).ok, true);
  assert.deepEqual(await interests.replaceOwn({ firebaseUid: 'new', expectedRevision: 0, interestTagIds: ['music'] }), { kind: 'selection_invalid' });
  assert.equal((await interests.replaceOwn({ firebaseUid: 'owner', expectedRevision: 1, interestTagIds: ['music'] })).kind, 'saved');
  const restored = await f.app.change(principal, 'music', { expectedRevision: 2, lifecycleState: 'active' });
  assert.deepEqual(restored, { ok: true, value: { interestTagId: 'music', ...tag('Music', 'active', 3) } });
  assert.equal((await interests.replaceOwn({ firebaseUid: 'new', expectedRevision: 0, interestTagIds: ['music'] })).kind, 'saved');
});

test('stale revisions are rejected before no-op; current no-op preserves revision', async () => {
  const f = fixture({ 'interest_tags/music': tag('Music', 'inactive', 4) });
  for (const change of [{ lifecycleState: 'inactive' as const }, catalogueName('Music')!]) {
    assert.deepEqual(await f.writer.change('music', 3, change), { kind: 'revision_precondition_failed' });
    assert.deepEqual(await f.writer.change('music', 4, change), { kind: 'saved', interestTag: { interestTagId: 'music', ...tag('Music', 'inactive', 4) } });
  }
});

test('rename enforces inactive/legacy Unicode uniqueness and atomically releases old reservation', async () => {
  const f = fixture({ 'interest_tags/inactive': tag('Straße', 'inactive') });
  assert.deepEqual(await f.writer.change('music', 1, catalogueName('STRASSE')!), { kind: 'name_conflict' });
  const created = await f.writer.create('Books', 'books'); assert.equal(created.kind, 'created');
  if (created.kind !== 'created') return;
  assert.equal((await f.writer.change(created.interestTag.interestTagId, 1, catalogueName('Reading')!)).kind, 'saved');
  assert.equal(f.gateway.read(namePath('Books')), undefined);
  assert.equal(f.gateway.read(namePath('Reading'))?.interestTagId, created.interestTag.interestTagId);
  assert.equal((await f.writer.create('Books', 'books')).kind, 'created');
});

test('corrupt reservations and revision overflow fail closed without mutations', async () => {
  const f = fixture({ [namePath('Music')]: { comparisonKey: 'music', interestTagId: 'other' } }), before = f.gateway.entries();
  assert.deepEqual(await f.writer.change('music', 1, catalogueName('Sound')!), { kind: 'unavailable' });
  assert.deepEqual(f.gateway.entries(), before);
  const overflow = fixture({ 'interest_tags/music': tag('Music', 'active', Number.MAX_SAFE_INTEGER) });
  assert.deepEqual(await overflow.writer.change('music', Number.MAX_SAFE_INTEGER, { lifecycleState: 'inactive' }), { kind: 'unavailable' });
});

test('deletion is unavailable without explicit verified environment inventory', async () => {
  const f = fixture({ 'interest_tags/music': tag('Music', 'inactive') });
  assert.deepEqual(await new FirestoreCatalogueWriter(f.gateway).delete('music', 1), { kind: 'unavailable' });
  assert.ok(f.gateway.read('interest_tags/music'));
});

test('permanent deletion validates expected revision then inactive state', async () => {
  const f = fixture();
  assert.deepEqual(await f.writer.delete('music', 2), { kind: 'revision_precondition_failed' });
  assert.deepEqual(await f.writer.delete('music', 1), { kind: 'state_conflict' });
});
for (const [collection, reference] of [
  ['account_interests/retained-owner', { interestTagIds: ['music'], revision: 2 }],
  ['events/retained-event', { title: 'Past event', active: false, published: false, startAt: '2026-01-01T00:00:00Z', endAt: '2026-01-02T00:00:00Z', interestTagIds: ['music'] }],
] as const) test(`deletion rejects retained ${collection.split('/')[0]} references without details`, async () => {
  const f = fixture({ 'interest_tags/music': tag('Music', 'inactive'), [collection]: reference });
  const before = f.gateway.entries(), result = await f.app.delete(principal, 'music', 1);
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.failure.code, 'CATALOGUE_REFERENCED');
  assert.equal(JSON.stringify(result).includes(collection.split('/')[1]!), false);
  assert.deepEqual(f.gateway.entries(), before);
});

test('unknown reference schema and partial read failure cannot authorize deletion', async () => {
  const f = fixture({ 'interest_tags/music': tag('Music', 'inactive'), 'account_interests/owner': { interestTagIds: [], revision: 1, newReferenceType: 'music' } });
  assert.deepEqual(await f.writer.delete('music', 1), { kind: 'unavailable' });
  assert.ok(f.gateway.read('interest_tags/music'));
  const uncertain = new FirestoreCatalogueWriter(f.gateway, { inspect: async () => { throw Error('private'); } });
  assert.deepEqual(await uncertain.delete('music', 1), { kind: 'unavailable' });
});

test('verified zero-reference delete removes matching reservation and never resurrects ID', async () => {
  const f = fixture(), created = await f.writer.create('Books', 'books');
  if (created.kind !== 'created') assert.fail();
  const id = created.interestTag.interestTagId;
  assert.equal((await f.writer.change(id, 1, { lifecycleState: 'inactive' })).kind, 'saved');
  assert.deepEqual(await f.writer.delete(id, 2), { kind: 'deleted' });
  assert.equal(f.gateway.read(`interest_tags/${id}`), undefined); assert.equal(f.gateway.read(namePath('Books')), undefined);
  assert.deepEqual(await f.writer.delete(id, 2), { kind: 'not_found' });
  assert.equal((await f.writer.list()).kind, 'read');
  const replacement = await f.writer.create('Books', 'books');
  if (replacement.kind !== 'created') assert.fail();
  assert.notEqual(replacement.interestTag.interestTagId, id);
});

test('all management use cases recheck authority before validating or reading', async () => {
  const f = fixture(); let permission: 'allowed' | 'forbidden' | 'unavailable' = 'forbidden';
  const management = new ManageInterestTags({ currentAdmin: async () => permission }, f.writer), before = f.gateway.entries();
  for (const result of [await management.list(principal), await management.change(principal, 'music', {}), await management.delete(principal, 'music', 1)]) {
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.failure.code, 'AUTH_FORBIDDEN');
  }
  permission = 'allowed'; assert.equal((await management.list(principal)).ok, true);
  permission = 'unavailable'; assert.equal((await management.list(principal)).ok, false);
  assert.deepEqual(f.gateway.entries(), before);
});

test('strict management HTTP schema, safe errors, current Admin and independent readback', async t => {
  const f = fixture(), app = Fastify({ ajv: { customOptions: { removeAdditional: false } } }); app.decorateRequest('authPrincipal', null);
  let admin = true; const authority = { currentAdmin: async () => admin ? 'allowed' as const : 'forbidden' as const };
  await registerInterestAdmin(app, { verifyIdToken: async () => ({ kind: 'verified', principal }) },
    new CreateInterestTag(authority, f.writer), undefined, new ManageInterestTags(authority, f.writer));
  t.after(() => app.close()); const headers = { authorization: 'Bearer synthetic' }, path = '/v1/admin/interest-tags';
  const unauthorized = await app.inject({ method: 'PATCH', url: `${path}/music`, payload: {} });
  assert.equal(unauthorized.statusCode, 401); assert.equal(unauthorized.headers['cache-control'], 'no-store');
  for (const payload of [{ expectedRevision: 1 }, { expectedRevision: 1, displayName: 'A', lifecycleState: 'inactive' }, { expectedRevision: 1, displayName: 'A', role: 'admin' }]) {
    const response = await app.inject({ method: 'PATCH', url: `${path}/music`, headers, payload });
    assert.equal(response.statusCode, 400); assert.equal(response.headers['cache-control'], 'no-store');
  }
  assert.equal((await app.inject({ url: `${path}?show=all`, headers })).statusCode, 400);
  assert.equal((await app.inject({ method: 'HEAD', url: path, headers })).statusCode, 404);
  const saved = await app.inject({ method: 'PATCH', url: `${path}/music`, headers, payload: { expectedRevision: 1, displayName: 'Sound' } });
  assert.equal(saved.statusCode, 200); assert.equal(saved.json().interestTag.revision, 2);
  const read = await app.inject({ url: path, headers }); assert.equal(read.statusCode, 200); assert.equal(read.headers['cache-control'], 'no-store');
  assert.deepEqual(read.json().interestTags, [saved.json().interestTag]);
  const stale = await app.inject({ method: 'PATCH', url: `${path}/music`, headers, payload: { expectedRevision: 1, displayName: 'Sound' } });
  assert.equal(stale.statusCode, 412); assert.equal(stale.json().error.code, 'CATALOGUE_REVISION_PRECONDITION_FAILED');
  assert.equal((await app.inject({ method: 'PATCH', url: `${path}/missing`, headers, payload: { expectedRevision: 1, displayName: 'Sound' } })).statusCode, 404);
  admin = false; assert.equal((await app.inject({ url: path, headers })).statusCode, 403);
  assert.equal((await app.inject({ method: 'DELETE', url: `${path}/music`, headers, payload: { expectedRevision: 2 } })).statusCode, 403);
});

test('management OpenAPI exactly matches successful/error/body schemas', async () => {
  const contract = JSON.parse(await readFile('api/openapi.json', 'utf8'));
  const paths = contract.paths, list = paths['/v1/admin/interest-tags'].get, patch = paths['/v1/admin/interest-tags/{interestTagId}'].patch,
    deletion = paths['/v1/admin/interest-tags/{interestTagId}'].delete;
  assert.deepEqual(list.responses['200'].content['application/json'].schema, manageInterestTagsSchema.response[200]);
  assert.deepEqual(patch.requestBody.content['application/json'].schema, changeInterestTagSchema.body);
  assert.deepEqual(patch.responses['200'].content['application/json'].schema, changeInterestTagSchema.response[200]);
  assert.deepEqual(deletion.requestBody.content['application/json'].schema, deleteInterestTagSchema.body);
  assert.equal(deletion.responses['204'].content, undefined);
  for (const operation of [list, patch, deletion]) for (const response of Object.values(operation.responses) as { headers: unknown }[]) {
    assert.deepEqual(response.headers, { 'Cache-Control': { schema: { const: 'no-store' } } });
  }
});
