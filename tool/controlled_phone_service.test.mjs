import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { runPhoneService, validatePhoneServiceConfiguration } from './controlled_phone_service.mjs';

const config = () => ({ controlledHostVerified: true, existingHostGenerationLeaseSettled: true,
  binding: { endpoint: 'http://127.0.0.1:11434/', reference: 'test-only:9b', manifestDigest: '3'.repeat(64),
    tokenizerDigest: '4'.repeat(64), ollamaVersion: '0.0.0-test', mode: 'formal-9b' },
  tokenizerFiles: { manifestDigest: '3'.repeat(64), tokenizerSha256: '4'.repeat(64) },
  phone: { certificatePath: resolve('private-certificate'), keyPath: resolve('private-key'), sessionDirectory: resolve('private-session') } });
function fixture({ holdStops = 0, stopAfter = 3, preflightFailure = false, listenFailure = false } = {}) {
  let ticks = 0, stops = 0, closes = 0, disposed = 0, preflights = 0;
  const reports = [], timeline = [];
  const service = { app: { routing() {} }, privateHandoff: () => ({ projectId: 'demo-enmori-rmvp01a-r10', email: 'synthetic@example.invalid', password: 'private-test-only' }),
    observation: () => ({ phase: stops ? 'held' : 'running', accepting: stops === 0, modelPending: stops && stops <= holdStops ? 1 : 0 }),
    stopAndClean: async () => { stops++; timeline.push('stop'); return { cleanupConfirmed: stops > holdStops, operatorHold: stops <= holdStops }; } };
  const deps = { compiler: { compile: async () => ({ includesAllFraming: true, tokens: 10, manifestDigest: "3".repeat(64), tokenizerDigest: "4".repeat(64) }) }, transport: { state: 'ready', preflight: async () => { preflights++; if (preflightFailure) throw new Error('private failure must not escape'); } },
    createService: async () => service, read: () => Buffer.from('existing synthetic certificate'),
    publish: (name, report) => { reports.push({ name, report }); timeline.push(name); },
    removeHandoff: () => { disposed++; timeline.push('remove'); }, requested: () => ticks >= stopAfter,
    wait: async () => { ticks++; assert(ticks < 20, 'Unexpected loop'); },
    createHttpsServer: (_tls, routing) => {
      assert.equal(routing, service.app.routing);
      const server = new EventEmitter();
      server.listen = (port, host, done) => { assert.equal(port, 0); assert.equal(host, '127.0.0.1'); if (listenFailure) server.emit('error', new Error('private TLS diagnostic')); else done(); };
      server.address = () => ({ port: 40000 }); server.closeAllConnections = () => {};
      server.close = done => { closes++; timeline.push('https-close'); done(); }; return server;
    } };
  return { deps, reports, timeline, state: () => ({ ticks, stops, closes, disposed, preflights }) };
}

test('ongoing operator stays alive across idle ticks and requires explicit stop; only private handoff contains credentials', async () => {
  const f = fixture(); assert.equal(await runPhoneService(config(), f.deps), 0);
  assert.deepEqual(f.state(), { ticks: 3, stops: 1, closes: 1, disposed: 1, preflights: 1 });
  const handoff = f.reports.filter(x => x.name === 'handoff.json'); assert.equal(handoff.length, 1);
  assert.equal(handoff[0].report.baseUri, 'https://127.0.0.1:40000/');
  assert(f.timeline.indexOf('remove') < f.timeline.indexOf('stop'));
  assert(!JSON.stringify(f.reports.filter(x => x.name === 'status.json')).includes('private-test-only'));
  assert.equal(f.reports.at(-1).report.cleanupConfirmed, true);
});
test('held stop never closes listener/model lease or exits; retry observes only original settlement', async () => {
  const f = fixture({ holdStops: 2, stopAfter: 0 }); assert.equal(await runPhoneService(config(), f.deps), 0);
  assert.equal(f.state().stops, 3); assert.equal(f.state().closes, 1);
  assert.equal(f.reports.filter(x => x.report.operatorHold === true).length, 2);
  assert(f.timeline.lastIndexOf('stop') < f.timeline.indexOf('https-close'));
});
test('read-only preflight failure never creates a service or readiness/configuration claim', async () => {
  const f = fixture({ preflightFailure: true });
  f.deps.createService = async () => { assert.fail('Must not initialize datastore'); };
  assert.equal(await runPhoneService(config(), f.deps), 1);
  assert.equal(f.state().stops, 0); assert.equal(f.reports.length, 1);
  assert.equal(f.reports[0].report.phase, 'failed-before-ready');
});
test('TLS listener failure cleans owned service and reports failure, never ready', async () => {
  const f = fixture({ listenFailure: true }); assert.equal(await runPhoneService(config(), f.deps), 1);
  assert.equal(f.state().stops, 1); assert.equal(f.reports.some(x => x.name === 'handoff.json'), false);
  assert.equal(f.reports.at(-1).report.phase, 'failed-cleaned');
});
test('config rejects open host, unsettled lease, development model, extra key and relative private paths', () => {
  for (const mutate of [c => { c.binding.endpoint = 'http://8.8.8.8/'; }, c => { c.existingHostGenerationLeaseSettled = false; },
    c => { c.binding.mode = 'manual-development-4b'; }, c => { c.phone.extra = 'no'; }, c => { c.phone.keyPath = 'relative'; },
    c => { c.phone.keyPath = c.phone.certificatePath; }]) {
    const c = config(); mutate(c); assert.throws(() => validatePhoneServiceConfiguration(c));
  }
});
