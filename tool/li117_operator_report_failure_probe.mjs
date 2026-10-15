// Operator seams only: no network listener, Firebase, device or model execution.
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runPhoneService} from './controlled_phone_service.mjs';

assert.equal(process.version, 'v24.19.0');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = {
  controlledHostVerified: true,
  existingHostGenerationLeaseSettled: true,
  binding: {endpoint: 'http://127.0.0.1:11434/', reference: 'synthetic-test-only:9b',
    manifestDigest: '3'.repeat(64), tokenizerDigest: '4'.repeat(64),
    ollamaVersion: '0.0.0-test', mode: 'formal-9b'},
  tokenizerFiles: {manifestDigest: '3'.repeat(64), tokenizerSha256: '4'.repeat(64)},
  phone: {certificatePath: resolve(root, 'build/never-read-certificate'),
    keyPath: resolve(root, 'build/never-read-key'), sessionDirectory: resolve(root, 'build/never-created-session')},
};
let serviceCreated = false, handoffRemoved = false, listenerClosed = false;
let stopCalls = 0, statusPublishAttempts = 0, originalPending = true;
let rejected = false, caughtExpectedSyntheticError = false;
const timeline = [];
const service = {
  app: {routing() {assert.fail('No request may be routed');}},
  privateHandoff: () => ({projectId: 'demo-enmori-rmvp01a-r10',
    email: 'synthetic@example.invalid', password: 'SyntheticNeverRealCredential1!'}),
  observation: () => ({phase: 'running', accepting: true, modelPending: 1}),
  stopAndClean: async () => {
    stopCalls++;
    timeline.push('original-stop-held');
    return {cleanupConfirmed: false, operatorHold: true};
  },
};
const dependencies = {
  compiler: {compile: async () => ({includesAllFraming: true, tokens: 10,
    manifestDigest: '3'.repeat(64), tokenizerDigest: '4'.repeat(64)})},
  transport: {state: 'test-only-pending', preflight: async () => {}},
  createService: async () => {serviceCreated = true; timeline.push('service-created'); return service;},
  read: () => Buffer.from('synthetic TLS bytes; never used by an actual server'),
  createHttpsServer: (_tls, routing) => {
    assert.equal(routing, service.app.routing);
    const listener = new EventEmitter();
    listener.listen = (port, host, done) => {
      assert.equal(port, 0); assert.equal(host, '127.0.0.1'); done();
    };
    listener.address = () => ({port: 40000});
    listener.closeAllConnections = () => {listenerClosed = true;};
    listener.close = done => {listenerClosed = true; done();};
    return listener;
  },
  publish: (name, report) => {
    if (name === 'handoff.json') {timeline.push('handoff-published'); return;}
    assert.equal(name, 'status.json');
    statusPublishAttempts++;
    timeline.push(report.operatorHold === true ? 'held-report-write-failed' : 'running-report-write-failed');
    throw new Error('SYNTHETIC_REPORT_IO_FAILURE');
  },
  removeHandoff: () => {handoffRemoved = true; timeline.push('handoff-removed');},
  requested: () => false,
  wait: async () => {assert.fail('The buggy source escapes before its hold wait');},
};
try {await runPhoneService(config, dependencies);}
catch (error) {
  rejected = true;
  caughtExpectedSyntheticError = error?.message === 'SYNTHETIC_REPORT_IO_FAILURE';
}
assert.equal(serviceCreated, true);
assert.equal(handoffRemoved, true);
assert.equal(statusPublishAttempts, 2);
assert.equal(stopCalls, 1);
assert.equal(rejected, true);
assert.equal(caughtExpectedSyntheticError, true);
assert.equal(originalPending, true);
assert.equal(listenerClosed, false);
const report = {
  scope: 'operator-seams-only-no-network-firebase-device-model',
  reviewedSourceHead: 'b7aad4c3653af6979575a2840807b83a7118df5d',
  operatorSha256: createHash('sha256').update(readFileSync(resolve(root, 'tool/controlled_phone_service.mjs'))).digest('hex'),
  serviceCreated, statusPublishAttempts, stopCalls, handoffRemoved,
  runPhoneServiceRejected: rejected,
  originalPendingUnsettled: originalPending,
  listenerClosed,
  timeline,
  reproduced: true,
  actualModelCalls: 0,
  actualNetworkListeners: 0,
  actualFirebaseCalls: 0,
};
writeFileSync(resolve(root, 'build/li117-cleanup-report-failure-result.json'), JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
process.stdout.write(JSON.stringify(report) + '\n');
