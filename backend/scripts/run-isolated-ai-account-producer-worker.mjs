import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildControlledEmulatorTestEnvironment } from '../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

const profile = mkdtempSync(join(tmpdir(), 'enmori-ai-account-worker-'));
try {
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap',
    fileURLToPath(new URL('../dist/emulator-test/isolated-ai-account-producer.integration.test.js', import.meta.url))], {
    env: buildControlledEmulatorTestEnvironment(process.env, profile), encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  const count = (kind) => Number(result.stdout?.match(new RegExp(`# ${kind} (\\d+)`))?.[1] ?? -1);
  const pass = result.status === 0 && count('tests') === 3 && count('pass') === 3 && count('fail') === 0;
  console.log('AI_ACCOUNT_PRODUCER_REPORT ' + JSON.stringify({probe: 'suite', outcome: pass ? 'pass' : 'fail',
    tests: count('tests'), pass: count('pass'), fail: count('fail'), testExitCode: result.status,
    ownFixtureCleanupAndSdkShutdownPassed: pass}));
  process.exitCode = pass ? 0 : 1;
} finally {
  rmSync(profile, {recursive: true, force: true});
}
