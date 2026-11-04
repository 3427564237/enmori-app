import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function summarize(rows, targetMs) {
  assert(rows.length > 0 && rows.every(r => Number.isFinite(r.elapsedMs) && r.elapsedMs >= 0));
  const values = rows.map(r => r.elapsedMs).sort((a, b) => a - b);
  const percentile = p => values[Math.ceil(values.length * p) - 1];
  const failures = rows.filter(r => r.status !== 200).length;
  return { samples: rows.length, p50Ms: percentile(.5), p95Ms: percentile(.95),
    failures, timeouts: rows.filter(r => r.timeout).length,
    failureRate: failures / rows.length, targetMs,
    meetsTarget: failures === 0 && percentile(.95) <= targetMs };
}

/** Read-only synthetic-identity probe. No response content, token or user ID is
 * recorded. This measures operator-host HTTP timing, never phone acceptance. */
export async function probe(base, token, http = fetch, now = () => performance.now()) {
  const scenarios = [
    ['profile', '/v1/me/profile', 3000], ['settings', '/v1/me/settings', 3000],
    ['friends', '/v1/me/friends', 3000], ['events', '/v1/event-browse', 12000],
  ];
  const result = { schemaVersion: 'backend_latency_probe_v1', vantage: 'operator-host-not-phone',
    startedAt: new Date().toISOString(), base, scenarios: [] };
  for (const [name, path, targetMs] of scenarios) {
    const rows = [];
    for (let n = 0; n < 30; n++) {
      const started = now(), signal = AbortSignal.timeout(15000);
      let status = 0, timeout = false, sourceStatus;
      try {
        const response = await http(base + path, { method: 'GET', redirect: 'error', signal,
          headers: { Authorization: `Bearer ${token}`, 'X-ENMORI-Contract-Version': '3' } });
        // Include complete body receipt in the measurement; discard all content.
        const body = await response.json(); status = response.status;
        if (name === 'events' && Array.isArray(body.sourceStatus)) {
          sourceStatus = body.sourceStatus.map(s => ({
            provider: ['ticketmaster', 'onepa'].includes(s.provider) ? s.provider : 'other',
            available: s.available === true,
          }));
        }
      } catch { timeout = signal.aborted; }
      rows.push({ attempt: n + 1, status, timeout, elapsedMs: Math.round(now() - started),
        ...(sourceStatus ? { sourceStatus } : {}) });
    }
    result.scenarios.push({ name, rows, summary: summarize(rows, targetMs) });
    console.log(JSON.stringify({ scenario: name, ...summarize(rows, targetMs) }));
  }
  return { ...result, finishedAt: new Date().toISOString() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assert.equal(process.versions.node, '24.19.0');
    const [base, statePath, outputPath] = process.argv.slice(2);
    assert.equal(process.argv.length, 5);
    const url = new URL(base);
    assert(url.protocol === 'https:' && /^enmori-backend-[a-z0-9-]+\.azurewebsites\.net$/.test(url.hostname)
      && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password);
    const root = fileURLToPath(new URL('../', import.meta.url));
    for (const path of [statePath, dirname(outputPath)]) {
      assert(resolve(path) === path && !path.startsWith(root));
      const stat = lstatSync(path);
      assert(!stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0 && realpathSync(path) === path);
    }
    const rows = JSON.parse(readFileSync(statePath, 'utf8'));
    const identity = rows[1];
    assert(/^azure-nov(?:02|04)-[a-f0-9]{12}$/.test(identity?.uid ?? '') && typeof identity.token === 'string');
    const report = await probe(url.origin, identity.token);
    writeFileSync(outputPath, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  } catch { console.error('BACKEND_LATENCY_PROBE_STOPPED'); process.exitCode = 2; }
}
