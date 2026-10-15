import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import assert from 'node:assert/strict';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
const profile = mkdtempSync(join(tmpdir(), 'enmori-jin-next-worker-'));
try {
  assert.ok(process.argv.slice(2).length===0 || (process.argv.length===3 && ['--coordinator-only','--phone-service-only'].includes(process.argv[2])));
  const selected=process.argv[2]==='--phone-service-only'?'backend/dist/emulator-test/controlled-phone-service.integration.test.js':process.argv[2]==='--coordinator-only'?'backend/dist/emulator-test/real-conversation-maintenance.integration.test.js':'backend/dist/emulator-test/**/*.test.js';
  const child = spawnSync(process.execPath, [
    '--import', pathToFileURL(resolve('tool/ai_store_gateway_binding.mjs')).href,
    '--test', '--test-concurrency=1', selected,
  ], { env: buildControlledEmulatorTestEnvironment(process.env, profile), stdio:'inherit', windowsHide:true });
  if(child.error) throw child.error;
  process.exitCode = child.status ?? 1;
} finally {
  const child = relative(realpathSync(tmpdir()), realpathSync(profile));
  assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
  rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  assert.equal(existsSync(profile),false);
  console.info('JIN_NEXT_EMULATOR_WORKER_PROFILE_REMOVED');
}
