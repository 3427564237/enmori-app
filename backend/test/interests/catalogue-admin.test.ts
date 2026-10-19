import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { catalogueName, coreInterestNames } from '../../src/interests/domain/catalogue-name.js';
import { CreateInterestTag } from '../../src/interests/application/create-interest-tag.js';
import { FirestoreCatalogueWriter } from '../../src/interests/infrastructure/firestore-catalogue-writer.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import { registerInterestAdmin } from '../../src/interests/transport/admin-routes.js';
import { sendFailureCode } from '../../src/transport/error-response.js';

test('Unicode full folding handles sharp s, sigma, compatibility and whitespace', () => {
  for (const [a, b] of [['Straße', 'STRASSE'], ['Σίσυφος', 'ΣΊΣΥΦΟΣ'], ['ＭＵＳＩＣ', 'music'], [' A  B ', 'a b'], ['É', 'E\u0301']]) {
    assert.equal(catalogueName(a)?.comparisonKey, catalogueName(b)?.comparisonKey);
  }
  for (const invalid of ['', 'a\nb', 'a\u202eb', 'x'.repeat(51), '\ud800']) assert.equal(catalogueName(invalid), undefined);
});

test('Admin authority is fresh; ordinary users never reach the writer', async () => {
  let admin = false, writes = 0;
  const use = new CreateInterestTag({ currentAdmin: async () => admin ? 'allowed' : 'forbidden' }, {
    create: async () => { writes++; return { kind: 'unavailable' }; },
  });
  assert.equal((await use.execute({ firebaseUid: 'ordinary' }, 'Books')).ok, false);
  assert.equal(writes, 0);
  admin = true;
  await use.execute({ firebaseUid: 'admin' }, 'Books');
  assert.equal(writes, 1);
  admin = false;
  await use.execute({ firebaseUid: 'admin' }, 'Books');
  assert.equal(writes, 1);
});

test('catalogue expansion preserves IDs/references and inactive names; duplicate creates conflict', async () => {
  const store = new InMemoryFirestoreGateway({
    'interest_tags/original-music': { displayName: 'Music', lifecycleState: 'active', revision: 7 },
    'interest_tags/inactive': { displayName: 'Straße', lifecycleState: 'inactive', revision: 4 },
    'account_interests/owner': { interestTagIds: ['original-music'], revision: 3 },
  });
  const writer = new FirestoreCatalogueWriter(store);
  for (const label of coreInterestNames) {
    const name = catalogueName(label)!;
    const result = await writer.create(name.displayName, name.comparisonKey);
    assert.equal(result.kind, label === 'Music' ? 'conflict' : 'created');
  }
  const repeated = catalogueName('BOOKS')!;
  assert.equal((await writer.create(repeated.displayName, repeated.comparisonKey)).kind, 'conflict');
  const inactive = catalogueName('STRASSE')!;
  assert.equal((await writer.create(inactive.displayName, inactive.comparisonKey)).kind, 'conflict');
  assert.deepEqual(store.read('interest_tags/original-music'), { displayName: 'Music', lifecycleState: 'active', revision: 7 });
  assert.deepEqual(store.read('account_interests/owner'), { interestTagIds: ['original-music'], revision: 3 });
  assert.equal(store.entries().filter(([path]) => path.startsWith('interest_tags/')).length, 13);
});

test('authenticated Admin transport rejects forged roles and returns strict single-tag result', async t => {
  const store = new InMemoryFirestoreGateway();
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.decorateRequest('authPrincipal', null);
  app.setErrorHandler((_error, request, reply) => sendFailureCode(request, reply, 'REQUEST_INVALID'));
  let allowed = false;
  await registerInterestAdmin(app, { verifyIdToken: async () => ({ kind: 'verified', principal: { firebaseUid: 'user' } }) },
    new CreateInterestTag({ currentAdmin: async () => allowed ? 'allowed' : 'forbidden' }, new FirestoreCatalogueWriter(store)));
  t.after(() => app.close());
  const call = (payload: object, authenticated = true) => app.inject({ method: 'POST', url: '/v1/admin/interest-tags', payload,
    headers: authenticated ? { authorization: 'Bearer synthetic' } : {} });
  assert.equal((await call({ displayName: 'Books' }, false)).statusCode, 401);
  assert.equal((await call({ displayName: 'Books' })).statusCode, 403);
  assert.equal((await call({ displayName: 'Books', role: 'admin' })).statusCode, 400);
  allowed = true;
  assert.equal((await call({ displayName: 'Books' })).statusCode, 201);
  assert.equal((await call({ displayName: 'books' })).statusCode, 409);
  assert.equal((await call({ displayName: '\u202eBooks' })).statusCode, 422);
  allowed = false;
  assert.equal((await call({ displayName: 'Music' })).statusCode, 403);
});

test('Admin OpenAPI exactly binds the transport body and success projection', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createInterestTagSchema } = await import('../../src/interests/transport/admin-routes.js');
  const contract = JSON.parse(await readFile('api/openapi.json', 'utf8'));
  const operation = contract.paths['/v1/admin/interest-tags'].post;
  assert.deepEqual(operation.requestBody.content['application/json'].schema, createInterestTagSchema.body);
  assert.deepEqual(operation.responses['201'].content['application/json'].schema, createInterestTagSchema.response[201]);
  assert.deepEqual(Object.keys(operation.responses).sort(), ['201', '400', '401', '403', '409', '422', '503']);
});
