import assert from 'node:assert/strict';
import { FirebaseAdminFirestoreGateway } from '../backend/dist/src/shared/infrastructure/firebase/firestore-gateway.js';
import { requireControlledEmulatorEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, 'demo-enmori-rmvp01a-r10');
assert.equal(environment.firestoreHost, '127.0.0.1:8080');
assert.equal(environment.authHost, '127.0.0.1:9099');
const original = FirebaseAdminFirestoreGateway.prototype.runTransaction;
let transactions = 0;
let bindingFailure = false;
FirebaseAdminFirestoreGateway.prototype.runTransaction = function (...args) {
  // Execution-only, locked-SDK diagnostic: no settings mutation or extra I/O.
  try {
    const settings = this.firestore._settings;
    assert.equal(settings.projectId, environment.projectId);
    assert.equal(settings.servicePath, '127.0.0.1');
    assert.equal(settings.port, 8080);
    assert.equal(settings.ssl, false);
  } catch (error) { bindingFailure = true; throw error; }
  transactions++;
  return Reflect.apply(original, this, args);
};
process.once('beforeExit', () => {
  // A repository may catch an assertion as a dependency failure; never let
  // that conversion turn a failed audit into an accepted test-process exit.
  assert.equal(bindingFailure, false, 'Actual SDK binding audit must never fail');
  const producerFile = process.argv.some(value => value.endsWith('isolated-ai-account-producer.integration.test.js'));
  if (producerFile) assert.ok(transactions > 0, 'Producer must use actual checked SDK gateway');
  if (transactions > 0) console.info('JIN_ACTUAL_GATEWAY_BINDING ' + JSON.stringify({
    kind: producerFile ? 'isolated-ai-account-producer' : 'other-regression',
    checkedTransactionCalls: transactions, sameValidatedProjectAndLoopbackEndpoint: true, sslFalse: true,
  }));
});
