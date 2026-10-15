// Disposable verification invocation only; not a product launcher or committed source.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { buildControlledEmulatorTestEnvironment } from './src/shared/infrastructure/firebase/controlled-emulator-environment.js';

const root = process.cwd();
const ports = [8080,9099,4400,4500];
const expected = JSON.parse(readFileSync(join(root,'node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json'),'utf8')).firestore;
const jar = join(process.env.FIREBASE_EMULATORS_PATH ?? join(homedir(),'.cache/firebase/emulators'),expected.downloadPathRelativeToCacheDir);
if (!existsSync(jar) || createHash('sha256').update(readFileSync(jar)).digest('hex') !== expected.expectedChecksumSHA256) throw new Error('cached_emulator_required');
for (const port of ports) {
  const available = await new Promise(done => {
    const server = createServer(); server.once('error',() => done(false));
    server.listen({ host:'127.0.0.1', port, exclusive:true },() => server.close(() => done(true)));
  });
  if (!available) throw new Error('occupied_port_refused');
}
const profile = mkdtempSync(join(tmpdir(),'enmori-zhou-context-validation-'));
try {
  const env = buildControlledEmulatorTestEnvironment({ ...process.env,
    GCLOUD_PROJECT:'demo-enmori-rmvp01a-r10',GOOGLE_CLOUD_PROJECT:'demo-enmori-rmvp01a-r10',
    FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080' },profile);
  console.log('ZHOU_VERIFICATION '+JSON.stringify({cachedJarChecksumVerified:true,initialPortsFree:true,credentialProfileIsolated:true}));
  const child = spawn(process.execPath,[join(root,'node_modules/firebase-tools/lib/bin/firebase.js'),
    'emulators:exec','--project','demo-enmori-rmvp01a-r10','--only','auth,firestore','--config',join(root,'firebase.json'),
    'node backend/scripts/run-emulator-tests.mjs'],{cwd:root,env,windowsHide:true,stdio:'inherit'});
  process.exitCode = await new Promise((done,reject) => { child.once('error',reject); child.once('exit',code => done(code ?? 1)); });
} finally {
  const target = resolve(profile);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('enmori-zhou-context-validation-')) throw new Error('profile_cleanup_refused');
  rmSync(target,{recursive:true,force:true});
  console.log('ZHOU_VERIFICATION '+JSON.stringify({ownProfileRemoved:!existsSync(target)}));
}
