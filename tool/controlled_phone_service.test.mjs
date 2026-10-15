import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { runPhoneService, validatePhoneServiceConfiguration, validateEventBrowseCommand } from './controlled_phone_service.mjs';

const config = () => ({ controlledHostVerified: true, existingHostGenerationLeaseSettled: true,
  binding: { endpoint: 'http://127.0.0.1:11434/', reference: 'test-only:9b', manifestDigest: '3'.repeat(64),
    tokenizerDigest: '4'.repeat(64), ollamaVersion: '0.0.0-test', mode: 'formal-9b' },
  tokenizerFiles: { manifestDigest: '3'.repeat(64), tokenizerSha256: '4'.repeat(64) },
  phone: { certificatePath: resolve('private-certificate'), keyPath: resolve('private-key'), sessionDirectory: resolve('private-session') } });

test('optional private Event configuration cannot contain an enable flag or leak unbounded/invalid key data', () => {
  const c = { ...config(), eventBrowse: { key: 'synthetic-not-a-provider-credential' } };
  assert.equal(validatePhoneServiceConfiguration(c), c);
  for (const eventBrowse of [undefined, {}, { key: '' }, { key: 'a b' }, { key: 'a\n' }, { key: 'x'.repeat(257) }, { key: 'x', enabled: true }]) {
    assert.throws(() => validatePhoneServiceConfiguration({ ...config(), eventBrowse }));
  }
  for (const command of [null, true, { enabled: 1 }, { enabled: true, key: 'not-allowed' }]) assert.throws(() => validateEventBrowseCommand(command));
  assert.equal(validateEventBrowseCommand({ enabled: false }), false);
  assert.equal(validateEventBrowseCommand({ enabled: true }), true);
});
function fixture({ holdStops = 0, stopAfter = 3, preflightFailure = false, listenFailure = false } = {}) {
  let ticks = 0, stops = 0, closes = 0, disposed = 0, preflights = 0;
  const reports = [], timeline = [];
  let eventEnabled = false;
  const service = { app: { routing() {} },
    eventBrowseControl: { enable: () => { eventEnabled = true; }, disable: () => { eventEnabled = false; }, observation: () => ({ enabled: eventEnabled }) },
    privateHandoff: () => ({ projectId: 'demo-enmori-rmvp01a-r10', email: 'synthetic@example.invalid', password: 'private-test-only' }),
    observation: () => ({ phase: stops ? 'held' : 'running', accepting: stops === 0, modelPending: stops && stops <= holdStops ? 1 : 0 }),
    stopAndClean: async () => { stops++; timeline.push('stop'); return { cleanupConfirmed: stops > holdStops, operatorHold: stops <= holdStops }; } };
  const deps = { compiler: { compile: async () => ({ includesAllFraming: true, tokens: 10, manifestDigest: "3".repeat(64), tokenizerDigest: "4".repeat(64) }) }, transport: { state: 'ready', preflight: async () => { preflights++; if (preflightFailure) throw new Error('private failure must not escape'); } },
    createService: async () => service, eventCommand: () => undefined, read: () => Buffer.from('existing synthetic certificate'),
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
  return { deps, service, reports, timeline, state: () => ({ ticks, stops, closes, disposed, preflights }) };
}

test('private source is constructed disabled; explicit enable/disable commands alone control it and never enter handoff/status', async () => {
  const c = { ...config(), eventBrowse: { key: 'synthetic-not-a-provider-credential' } }, f = fixture();
  const states = [], create = f.deps.createService;
  f.deps.createService = async options => {
    assert(options.eventBrowse?.source); assert.equal(f.service.eventBrowseControl.observation().enabled, false);
    // The real source checks disabled before fetching even with a supplied key.
    await assert.rejects(options.eventBrowse.source.firstBatch('2026-10-15T00:00:00Z', new AbortController().signal));
    return create(options);
  };
  f.deps.eventCommand = () => ({ enabled: f.state().ticks === 1 });
  const wait = f.deps.wait;
  f.deps.wait = async () => { states.push(f.service.eventBrowseControl.observation().enabled); await wait(); };
  assert.equal(await runPhoneService(c, f.deps), 0);
  assert.deepEqual(states, [false, true, false]);
  assert(!JSON.stringify(f.reports).includes(c.eventBrowse.key));
});

for (const bad of ['invalid-command', 'private-io']) {
  test(`Event ${bad} fails closed locally while original AI service keeps running`, async () => {
    const f = fixture(), enabled = [], wait = f.deps.wait;
    f.deps.eventCommand = () => {
      if (f.state().ticks === 0) return { enabled: true };
      if (bad === 'private-io') throw new Error('private command I/O failure');
      return { enabled: true, unapproved: true };
    };
    f.deps.wait = async () => { enabled.push(f.service.eventBrowseControl.observation().enabled); assert.equal(f.state().stops, 0); await wait(); };
    assert.equal(await runPhoneService(config(), f.deps), 0);
    assert.deepEqual(enabled, [true, false, false]);
    assert.equal(f.reports.filter(row => row.report.eventControlFailed === true).length, 3);
    assert.equal(f.state().stops, 1); assert.equal(f.state().closes, 1);
    assert(!JSON.stringify(f.reports).includes('private command'));
  });
}

test('explicit stop takes precedence over a queued Event enable command', async () => {
  const f = fixture({ stopAfter: 0 });
  f.deps.eventCommand = () => { assert.fail('No Event control after stop'); };
  assert.equal(await runPhoneService(config(), f.deps), 0);
});

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

for (const scenario of ['status', 'handoff-removal', 'status-and-removal']) {
  test(`report I/O recovery retains the same pending original through ${scenario} failures`, async () => {
    const f = fixture({ stopAfter: scenario === 'handoff-removal' ? 0 : 99 });
    let originalPending = true, ioAvailable = false, ticks = 0, stops = 0, creations = 0, removals = 0, statusAttempts = 0;
    const observed = [], publish = f.deps.publish, create = f.deps.createService;
    f.deps.createService = async (...args) => { creations++; return create(...args); };
    f.service.stopAndClean = async () => { stops++; return { cleanupConfirmed: !originalPending, operatorHold: originalPending }; };
    f.deps.publish = (name, report) => {
      if (name === 'status.json') {
        statusAttempts++;
        if (!ioAvailable && scenario !== 'handoff-removal') throw new Error('Synthetic report I/O unavailable');
      }
      publish(name, report);
    };
    f.deps.removeHandoff = () => {
      removals++;
      if (!ioAvailable && scenario !== 'status') throw new Error('Synthetic handoff removal unavailable');
    };
    f.deps.wait = async () => {
      ticks++;
      observed.push({ originalPending, stops, closes: f.state().closes });
      if (ticks === 2) originalPending = false; // Only this ORIGINAL effect settles.
      if (ticks >= 3) ioAvailable = true; // Reporting/removal may recover later.
    };
    assert.equal(await runPhoneService(config(), f.deps), 1);
    assert.equal(creations, 1);
    assert.equal(ticks, 3);
    assert(observed.slice(0, 2).every(row => row.originalPending && row.stops > 0 && row.closes === 0));
    assert(stops >= 3 && removals >= 3);
    assert(statusAttempts >= 2);
    assert.equal(f.state().closes, 1);
    assert.equal(f.reports.at(-1).report.phase, 'failed-cleaned');
  });
}

test('unknown startup effects remain held through reporting/removal failures without a replacement service', async () => {
  const f = fixture();
  let attempts = 0, ticks = 0;
  const release = Promise.withResolvers(), holdReached = Promise.withResolvers();
  f.deps.createService = async () => { attempts++; throw new Error('CONTROLLED_PHONE_SERVICE_STARTUP_HOLD'); };
  f.deps.removeHandoff = () => { throw new Error('Synthetic removal failure'); };
  f.deps.publish = () => { throw new Error('Synthetic report failure'); };
  f.deps.wait = async () => { ticks++; if (ticks === 3) { holdReached.resolve(); await release.promise; } };
  let settled = false;
  // The unresolved wait represents the retained operator. It owns no real I/O
  // and no event-loop handle; intentionally do not release/reset the original.
  void runPhoneService(config(), f.deps).then(() => { settled = true; }, () => { settled = true; holdReached.resolve(); });
  await holdReached.promise;
  assert.equal(settled, false); assert.equal(attempts, 1); assert.equal(ticks, 3); assert.equal(f.state().closes, 0);
});

test('final report failure retries after confirmed original cleanup without repeating service cleanup or listener close', async () => {
  const f = fixture({ stopAfter: 0 });
  let finalAttempts = 0, removals = 0;
  const publish = f.deps.publish;
  f.deps.publish = (name, report) => {
    if (name === 'status.json' && ['closed', 'failed-cleaned'].includes(report.phase) && ++finalAttempts < 3) {
      throw new Error('Synthetic final receipt I/O failure');
    }
    publish(name, report);
  };
  f.deps.removeHandoff = () => { removals++; };
  assert.equal(await runPhoneService(config(), f.deps), 1);
  assert.equal(finalAttempts, 3); assert.equal(f.state().closes, 1); assert.equal(f.state().stops, 1);
  assert(removals >= 3); assert.equal(f.reports.at(-1).report.phase, 'failed-cleaned');
});


test('demo feature opt-in is explicit, bounded and passed to the existing owned service only', async () => {
  const c = { ...config(), demoFeatures: true }, f = fixture();
  assert.equal(validatePhoneServiceConfiguration(c), c);
  for (const value of [false, 1, "true", null]) assert.throws(() => validatePhoneServiceConfiguration({ ...config(), demoFeatures: value }));
  const create = f.deps.createService;
  f.deps.createService = async options => { assert.equal(options.demoFeatures, true); return create(options); };
  assert.equal(await runPhoneService(c, f.deps), 0);
  assert(!JSON.stringify(f.reports.filter(row => row.name !== 'handoff.json')).includes('private-test-only'));
  assert.equal(f.reports.find(row => row.name === 'handoff.json').report.password, 'private-test-only');
});
