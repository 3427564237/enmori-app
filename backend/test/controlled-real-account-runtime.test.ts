import assert from 'node:assert/strict';
import test from 'node:test';
import { createControlledRuntime } from '../src/bootstrap/controlled-runtime.js';

const clean = { ENMORI_ENVIRONMENT: 'controlled-demo', ENMORI_FIREBASE_PROJECT_ID: 'enmori-rmvp-controlled',
  ENMORI_BACKEND_HOST: '127.0.0.1', ENMORI_BACKEND_PORT: '9381' };

test('real runtime rejects an ambient Auth or Firestore emulator before Firebase creation', async () => {
  for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    const previous = process.env[name];
    process.env[name] = '127.0.0.1:9099';
    try { await assert.rejects(createControlledRuntime(clean), /Emulator configuration is forbidden/); }
    finally { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; }
  }
});
