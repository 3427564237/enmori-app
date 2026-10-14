import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { buildControlledEmulatorTestEnvironment } from './src/shared/infrastructure/firebase/controlled-emulator-environment.js';
const profile = mkdtempSync(join(tmpdir(),'enmori-zhou-reader-worker-'));
try {
  const child = spawnSync(process.execPath,['--test','--test-concurrency=1','backend/dist/emulator-test/ai-context-reader.integration.test.js'],
    {cwd:process.cwd(),env:buildControlledEmulatorTestEnvironment(process.env,profile),windowsHide:true,stdio:'inherit'});
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
} finally {
  const target = resolve(profile);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('enmori-zhou-reader-worker-')) throw new Error('worker_cleanup_refused');
  rmSync(target,{recursive:true,force:true});
}
