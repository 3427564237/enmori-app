import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { CloudPreviewPersona } from '../../src/personas/application/cloud-preview-persona.js';
import { OPENAI_CLOUD_PROCESSING } from '../../src/account/domain/cloud-ai-consent.js';
import type { CloudAiConsentAuthority } from '../../src/account/ports/cloud-ai-consent-authority.js';
import type { PersonaPreviewPermission } from '../../src/personas/ports/persona-preview-authority.js';
import type { AsyncConversationModelInput } from '../../src/ai-conversation/ports/async-conversation.js';
import { BoundedAiRuntime } from '../../src/ai-runtime/application/bounded-ai-runtime.js';
import { registerPersonaPreviewRoute } from '../../src/personas/transport/preview-route.js';
import { FakeClock, deferred, flush } from '../ai-runtime/support.js';

const principal = {firebaseUid: 'synthetic-preview-owner'};
const draft = {displayName: 'Draft', tone: 'warm', responseLength: 'concise', formatStyle: 'plain', description: 'Unsaved expression'};
const encoded = () => new TextEncoder().encode(JSON.stringify({schemaVersion: 'ai_assistant_message_v1', message: 'Preview reply'}));
function fixture(effect: (handle: AsyncConversationModelInput) => Promise<Uint8Array> = async () => encoded()) {
  const clock = new FakeClock();
  let generation = 0, consent = true, current = true, calls = 0, auth = true, releases = 0;
  let permission: PersonaPreviewPermission = {ownerId: 'synthetic-owner', purposeRevocationGeneration: 1};
  const cloud: CloudAiConsentAuthority = {processing: OPENAI_CLOUD_PROCESSING, async read() {
    if (!consent) return {kind: 'denied'};
    let released = false;
    return {kind: 'authorized', generation, purposeGeneration: permission.purposeRevocationGeneration,
      current: () => current && !released, release: () => { if (!released) releases++; released = true; }};
  }};
  const runtime = new BoundedAiRuntime<AsyncConversationModelInput>(clock, {async generate(handle) {
    assert.equal(await handle.authorize(), true); assert.equal(handle.cloudConsentCurrent?.(), true);
    calls++; return effect(handle);
  }}, true);
  const preview = new CloudPreviewPersona({read: async () => ({kind: 'success', value: permission})}, cloud, runtime, () => clock.now());
  const caller = {principal, tokenInstance: 'synthetic-token', verifyCurrentAuth: async () => auth
    ? {kind: 'verified' as const, principal} : {kind: 'invalid' as const}};
  const messages: string[] = [], abort = new AbortController();
  const control = {signal: abort.signal, current: () => true, accept: (message: string) => {messages.push(message); return true;}};
  return {preview, runtime, clock, caller, messages, control, abort,
    get calls() {return calls;}, get releases() {return releases;},
    withdraw() {consent = false; current = false;}, reaccept() {generation++;}, revokeAuth() {auth = false;},
    changeOwner() {permission = {...permission, ownerId: 'another-owner'};},
    changePurpose() {permission = {...permission, purposeRevocationGeneration: 2};},
  };
}

test('cloud preview sends only unsaved draft/message through the shared runtime and releases every consent lease', async () => {
  let seen: AsyncConversationModelInput | undefined;
  const f = fixture(async handle => {
    seen = handle; const projection = handle.projection()!;
    assert.deepEqual(projection.history, []); assert.deepEqual(projection.checkIns, []);
    assert.equal(projection.currentMessage, 'Hello'); assert.equal(projection.persona?.expression?.description, draft.description);
    assert.equal(handle.monetaryConsumer, 'persona'); return encoded();
  });
  assert.deepEqual(await f.preview.execute(f.caller, draft, 'Hello', f.control), {kind: 'success', value: undefined});
  assert.deepEqual(f.messages, ['Preview reply']); assert.equal(f.calls, 1); assert(f.releases >= 4);
  assert.equal(seen!.projection(), undefined); assert.equal(seen!.cloudConsentCurrent?.(), false);
  assert.equal(f.runtime.state.nonTerminal, 0); f.runtime.shutdown();
});

for (const change of ['withdraw', 'reaccept', 'revokeAuth', 'changeOwner', 'changePurpose'] as const) {
  test(`cloud preview rejects ${change} before response delivery`, async () => {
    const f = fixture(async () => {f[change](); return encoded();});
    const result = await f.preview.execute(f.caller, draft, 'Hello', f.control);
    assert.equal(result.kind, 'failure'); assert.deepEqual(f.messages, []); assert.equal(f.calls, 1); f.runtime.shutdown();
  });
}

test('missing consent and invalid input never call generation', async () => {
  const f = fixture(); f.withdraw();
  assert.equal((await f.preview.execute(f.caller, draft, 'Hello', f.control)).kind, 'failure');
  assert.deepEqual(await f.preview.execute(f.caller, {...draft, owner: 'forged'}, 'Hello', f.control), {kind: 'failure', code: 'AI_INPUT_INVALID'});
  assert.equal(f.calls, 0); f.runtime.shutdown();
});

test('preview and chat share per-owner admission; cancel does not deliver or resend a late response', async () => {
  const gate = deferred<Uint8Array>(); let entered!: () => void;
  const ready = new Promise<void>(resolve => {entered = resolve;});
  const f = fixture(async () => {entered(); return gate.promise;});
  const pending = f.preview.execute(f.caller, draft, 'Hello', f.control); await ready;
  assert.deepEqual(f.runtime.submit('synthetic-owner', {purpose: 'ai_assistant_message_v1',
    prepare: async () => {throw Error('must not start');}, checkCandidate: async () => ({ok: true, value: undefined})}),
    {accepted: false, failure: 'overload'});
  f.abort.abort(); assert.deepEqual(await pending, {kind: 'terminated'});
  gate.resolve(encoded()); await flush(); assert.deepEqual(f.messages, []); assert.equal(f.calls, 1); f.runtime.shutdown();
});

test('cloud route refuses unmarked legacy and mismatched processing before invoking preview', async t => {
  const app = Fastify({logger: false}); app.decorateRequest('authPrincipal', null); t.after(() => app.close()); let calls = 0;
  await registerPersonaPreviewRoute(app, {verifyIdToken: async () => ({kind: 'verified', principal})}, {
    processing: OPENAI_CLOUD_PROCESSING,
    execute: async (_caller, _draft, _text, control) => {calls++; control.accept('Preview'); return {kind: 'success', value: undefined};},
  });
  const request = (extra: object) => app.inject({method: 'POST', url: '/v1/me/persona-preview',
    headers: {authorization: 'Bearer synthetic'}, payload: {draft, text: 'Hello', ...extra}});
  assert.equal((await request({})).statusCode, 403);
  for (const bad of [{processing: 'cloud'}, {processing: 'cloud', provider: 'groq', disclosureVersion: 'groq_cloud_v1'},
    {processing: 'local', provider: 'openai', disclosureVersion: 'openai_cloud_v1'}]) assert.equal((await request(bad)).statusCode, 400);
  assert.equal(calls, 0);
  const good = await request({processing: 'cloud', ...OPENAI_CLOUD_PROCESSING});
  assert.equal(good.statusCode, 200); assert.deepEqual(good.json(), {message: 'Preview'}); assert.equal(calls, 1);
});
