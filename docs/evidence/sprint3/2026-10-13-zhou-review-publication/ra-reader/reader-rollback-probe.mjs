import assert from 'node:assert/strict';
import { PreparedRealContextReader } from '../../formal/enmori-app/backend/dist/src/ai-conversation/application/real-context-reader.js';

// Synthetic independent reproduction; no datastore, user data or runtime wiring.
const asOf = { seconds: 1791849600, nanoseconds: 0 };
const identity = {};
let generation = 4;
let consent = 'accepted';
const authority = () => ({ ownerId: 'synthetic-owner', completed: true,
  purpose: 'checkin_conversation', consent, purposeRevocationGeneration: generation,
  settingsRevision: 1 });
const wrap = value => ({ kind: 'read', value: { view: identity, asOf, value } });
const view = { identity, asOf,
  readAuthority: async () => wrap(authority()),
  readPersonas: async () => wrap({ stateRevision: 0, livePersonaIds: [], items: [] }),
  readNotePage: async () => wrap({ rows: [], next: undefined }), close() {} };
const port = { openStart: async () => ({ kind: 'read', value: view }),
  readCurrent: async () => ({ kind: 'read', value: {
    authority: authority(), usedPersona: 'not-used', sources: [] } }) };
const reader = new PreparedRealContextReader({ principal: { firebaseUid: 'synthetic-uid' },
  ownerId: 'synthetic-owner', session: {}, originalRequest: {}, acceptedAt: 1000,
  deadline: 61000, asOf, signal: new AbortController().signal }, port, () => 1000, () => true);
assert.equal(await reader.prepare(), 'ready');
generation = 3; consent = 'rejected';
assert.equal(await reader.revalidate(), 'unavailable');
console.log('Synthetic rollback + rejection classification passed.');
