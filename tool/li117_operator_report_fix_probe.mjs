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
let resolved = false;
const held = Promise.withResolvers(), release = Promise.withResolvers();
let ioRecovered = false;
const timeline = [];
const service = {
  app: {routing() {assert.fail('No request may be routed');}},
  privateHandoff: () => ({projectId: 'demo-enmori-rmvp01a-r10',
    email: 'synthetic@example.invalid', password: 'SyntheticNeverRealCredential1!'}),
  observation: () => ({phase: 'running', accepting: true, modelPending: 1}),
  stopAndClean: async () => {
    stopCalls++;
    timeline.push('original-stop-held');
    return {cleanupConfirmed: !originalPending, operatorHold: originalPending};
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
    timeline.push(report.operatorHold === true ? 'held-report-write-attempt' : 'status-write-attempt');
    if (!ioRecovered) throw new Error('SYNTHETIC_REPORT_IO_FAILURE');
  },
  removeHandoff: () => {handoffRemoved = true; timeline.push('handoff-removed');},
  requested: () => false,
  wait: async () => { held.resolve(); await release.promise; },
};
const running = runPhoneService(config, dependencies).then(code => {resolved = true; return code;});
await held.promise;
assert.equal(resolved, false);
assert.equal(serviceCreated, true);
assert.equal(statusPublishAttempts, 2);
assert.equal(stopCalls, 1);
assert.equal(originalPending, true);
assert.equal(listenerClosed, false);
const heldObservation = {promiseRetained: !resolved, originalPendingUnsettled: originalPending, listenerClosed, stopCalls, statusPublishAttempts};
originalPending = false; ioRecovered = true; release.resolve();
assert.equal(await running, 1);
assert.equal(listenerClosed, true);
assert.equal(stopCalls, 2);
const report = {
 scope: 'operator-seams-only-no-network-firebase-device-model',
 reviewedSourceHead: 'f6036d4efbc4f3d7a33378cd7184b01d4eda31bb',
 operatorSha256: createHash('sha256').update(readFileSync(resolve(root, 'tool/controlled_phone_service.mjs'))).digest('hex'),
 heldObservation, afterOriginalSettlement: {operatorFailureExit: 1, listenerClosed, stopCalls, handoffRemoved},
 actualModelCalls: 0, actualNetworkListeners: 0, actualFirebaseCalls: 0,
 counterexampleProspectivelyResolved: true,
};
writeFileSync(resolve(root, 'build/li117-cleanup-report-fix-result.json'), JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
process.stdout.write(JSON.stringify(report) + '\n');
