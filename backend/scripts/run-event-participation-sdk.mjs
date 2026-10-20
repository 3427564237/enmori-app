import { spawnSync } from 'node:child_process';
import { buildControlledEmulatorTestEnvironment } from '../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
const directory=process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
if(!directory)throw new Error('Isolated profile missing');
// Firebase CLI injects FIREBASE_CONFIG. Reapply the approved child allowlist,
// never weaken or bypass the SDK's credential-discovery guard.
const environment=buildControlledEmulatorTestEnvironment(process.env,directory);
const result=spawnSync(process.execPath,['--test','--test-concurrency=1','backend/dist/emulator-test/event-participation.integration.test.js'],{env:environment,stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status??1;
