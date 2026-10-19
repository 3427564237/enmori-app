import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { resolve, join } from 'node:path';
import { mkdtempSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import Fastify from 'fastify';
import { runPhoneService, validatePhoneServiceConfiguration, validateEventBrowseCommand } from './controlled_phone_service.mjs';
import { ControlledPhoneDiagnostics } from '../backend/dist/src/bootstrap/controlled-phone-diagnostics.js';

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

test('opt-in diagnostic observes startup compiler, reaches original composition and publishes only health', async () => {
  const records = [], diagnostics = new ControlledPhoneDiagnostics(record => { records.push(record); });
  const f = fixture(), create = f.deps.createService;
  f.deps.diagnostics = diagnostics;
  f.deps.createService = async options => { assert.equal(options.diagnostics, diagnostics); return create(options); };
  assert.equal(await runPhoneService(config(), f.deps), 0);
  assert.deepEqual(records.map(row => [row.dependencyStage, row.dependencyStatus]), [['startup_compile', 'started'], ['startup_compile', 'passed']]);
  assert(f.reports.some(row => row.name === 'status.json' && row.report.diagnosticCaptureHealthy === true));
  assert(!JSON.stringify(records).includes('private-')); assert(!JSON.stringify(records).includes('今天读书'));
});

test('failed startup diagnostic stops before datastore construction without a false-ready handoff', async () => {
  const f = fixture(); f.deps.diagnostics = new ControlledPhoneDiagnostics(() => { throw new Error('private-sink-canary'); });
  f.deps.createService = async () => { assert.fail('Failed startup capture must not construct a service'); };
  assert.equal(await runPhoneService(config(), f.deps), 1);
  assert.equal(f.reports.length, 1); assert.equal(f.reports[0].report.phase, 'failed-before-ready');
  assert.equal(f.state().stops, 0); assert(!JSON.stringify(f.reports).includes('private-sink-canary'));
});

test('unhealthy installed capture refuses startup before preflight, compiler or service construction', async () => {
  const f = fixture();
  f.deps.diagnostics = new ControlledPhoneDiagnostics(() => {}, () => false);
  f.deps.compiler = { compile: async () => assert.fail('No compile before capture readiness') };
  f.deps.createService = async () => assert.fail('No datastore before capture readiness');
  assert.equal(await runPhoneService(config(), f.deps), 1);
  assert.equal(f.state().preflights, 0);
  assert.equal(f.reports.length, 1); assert.equal(f.reports[0].report.phase, 'failed-before-ready');
});

test('later capture failure is visible without replacing or prematurely cleaning the original service', async () => {
  const f = fixture(), wait = f.deps.wait; let failing = false;
  f.deps.diagnostics = new ControlledPhoneDiagnostics(() => { if (failing) throw new Error('private-sink-canary'); });
  f.deps.wait = async () => {
    if (f.state().ticks === 0) {
      failing = true; f.deps.diagnostics.observe({ stage: 'generate_done', status: 'termination_unconfirmed', durationMs: 1 });
    }
    assert.equal(f.state().stops, 0); await wait();
  };
  assert.equal(await runPhoneService(config(), f.deps), 0);
  assert(f.reports.some(row => row.report.diagnosticCaptureHealthy === false));
  assert.equal(f.state().stops, 1);
});

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


test('v2 explicitly selects dual accounts and matched open strategy; private credentials never reach status', async () => {
  const f = fixture(), original = f.deps.createService;
  f.service.privateHandoff = () => ({ projectId: 'demo-enmori-rmvp01a-r10', email: 'synthetic@example.invalid', password: 'private-test-only', secondaryAccount: { email: 'second@example.invalid', password: 'private-second-only' } });
  f.deps.createService = async options => { assert.equal(options.dualAccounts, true); assert.equal(options.conversationStrategy, 'open_conversation_v1'); return original(options); };
  const compile = f.deps.compiler.compile;
  f.deps.compiler.compile = async input => { assert.equal(input.strategy, 'open_conversation_v1'); assert.deepEqual(input.history, []); return compile(input); };
  assert.equal(await runPhoneService({ ...config(), demoFeatures: true, dualAccounts: true }, f.deps), 0);
  assert.equal(f.reports.find(row => row.name === 'handoff.json').report.schemaVersion, 2);
  assert.equal(f.reports.find(row => row.name === 'handoff.json').report.secondaryAccount.password, 'private-second-only');
  assert(!JSON.stringify(f.reports.filter(row => row.name !== 'handoff.json')).includes('private-'));
  for (const bad of [{ dualAccounts: true }, { demoFeatures: true, dualAccounts: false }, { demoFeatures: true, dualAccounts: 'true' }]) assert.throws(() => validatePhoneServiceConfiguration({ ...config(), ...bad }));
});


test('child entrypoints run the guarded CLI from a symlinked writable project without silently exiting', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'enmori-phone-entrypoint-test-'));
  try {
    // Same immutable tool / writable project symlink arrangement as the owned host.
    symlinkSync(realpathSync(new URL('.', import.meta.url)), join(directory, 'tool'), 'dir');
    const alias = join(directory, 'tool', 'controlled_phone_service.mjs');
    const loaded = await import(pathToFileURL(alias).href);
    const { phoneServiceChildEntrypoints } = loaded;
    assert(phoneServiceChildEntrypoints, 'Production child launch must expose its fixed entrypoints');
    assert.equal(phoneServiceChildEntrypoints.main, realpathSync(alias));
    assert.notEqual(phoneServiceChildEntrypoints.main, alias);
    assert.equal(phoneServiceChildEntrypoints.gatewayBinding, pathToFileURL(realpathSync(join(directory, 'tool', 'ai_store_gateway_binding.mjs'))).href);
    const run = main => spawnSync(process.execPath, [main, '--test-invalid-mode'], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    // Prove the regression exists at the actual guard, without entering any live mode.
    const imported = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(pathToFileURL(alias).href)}); console.log('IMPORTED');`], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.ifError(imported.error); assert.equal(imported.status, 0);
    assert.equal(imported.stdout, 'IMPORTED\n'); assert.equal(imported.stderr, '');
    const broken = run(alias);
    assert.ifError(broken.error); assert.equal(broken.status, 0); assert.equal(broken.stdout, '');
    const fixed = run(phoneServiceChildEntrypoints.main);
    assert.ifError(fixed.error); assert.equal(fixed.status, 1);
    assert.equal(fixed.stdout, 'CONTROLLED_PHONE_SERVICE_START_FAILED_NO_PRIVATE_DIAGNOSTICS\n');
    assert.equal(fixed.stderr, '');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});


test('non-AI opt-in is bounded to explicit dual-account demo configuration', () => {
  const selected = { ...config(), demoFeatures: true, dualAccounts: true, nonAiDemo: true };
  assert.equal(validatePhoneServiceConfiguration(selected), selected);
  for (const change of [{ demoFeatures: undefined }, { dualAccounts: undefined }, { nonAiDemo: false }, { nonAiDemo: 'true' }]) {
    assert.throws(() => validatePhoneServiceConfiguration({ ...selected, ...change }));
  }
});

test('non-AI starts and hands off without model/tokenizer/capture access while existing AI503 gate stays closed', async () => {
  const selected = { ...config(), demoFeatures: true, dualAccounts: true, nonAiDemo: true }, f = fixture();
  f.deps.compiler = { compile: async () => assert.fail('No tokenizer/compiler call') };
  f.deps.transport = { preflight: async () => assert.fail('No model preflight'), generate: async () => assert.fail('No physical generation') };
  f.deps.diagnostics = { get healthy() { assert.fail('No installed capture access'); } };
  const create = f.deps.createService;
  f.deps.createService = async options => {
    assert.equal(options.demoFeatures, true); assert.equal(options.dualAccounts, true);
    assert.equal(options.diagnostics.healthy, false); assert.equal(options.transport.state, 'stopped');
    await assert.rejects(options.compiler.compile({}), /AI_UNAVAILABLE/u);
    await assert.rejects(options.transport.generate({}), /AI_UNAVAILABLE/u);
    // Exercise the actual existing Fastify collector gate, not a fixed AI reply.
    const app = Fastify({ logger: false }); options.diagnostics.install(app);
    let aiInvocations = 0;
    app.post('/v1/me/ai/operations', async () => { aiInvocations++; return {}; });
    app.post('/v1/me/ai/operations/:operationId/execute', async () => { aiInvocations++; return {}; });
    app.get('/v1/me/profile', async () => ({ available: true }));
    try {
      for (const url of ['/v1/me/ai/operations', '/v1/me/ai/operations/synthetic/execute']) {
        const response = await app.inject({ method: 'POST', url });
        assert.equal(response.statusCode, 503); assert.equal(response.json().error.code, 'AI_UNAVAILABLE');
        assert.equal(response.headers['cache-control'], 'no-store');
      }
      assert.equal(aiInvocations, 0);
      assert.equal((await app.inject({ method: 'GET', url: '/v1/me/profile' })).statusCode, 200);
    } finally { await app.close(); }
    return create(options);
  };
  assert.equal(await runPhoneService(selected, f.deps), 0);
  assert.equal(f.state().preflights, 0);
  assert.equal(f.reports.filter(row => row.name === 'handoff.json').length, 1);
  const statuses = f.reports.filter(row => row.name === 'status.json' && row.report.phase === 'running');
  assert(statuses.length > 0);
  assert(statuses.every(row => row.report.nonAiDemo === true && row.report.hostPreflightPassed === false &&
    row.report.tokenizerReadinessPassed === false && row.report.adapterState === 'stopped' && row.report.diagnosticCaptureHealthy === false));
});
