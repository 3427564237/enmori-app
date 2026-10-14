import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, realpathSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
assert.equal(process.version,'v24.19.0');
assert.ok(process.argv.slice(2).length===0 || (process.argv.length===3 && process.argv[2]==='--coordinator-only'));
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const required = createRequire(import.meta.url);
const adminRequire = createRequire(required.resolve('firebase-admin/app'));
assert.equal(readJson(resolve('node_modules/firebase-admin/package.json')).version,'14.3.0');
assert.equal(readJson(resolve('node_modules/firebase-tools/package.json')).version,'15.29.0');
assert.equal(readJson(adminRequire.resolve('@google-cloud/firestore/package.json')).version,'8.7.1');
const emulatorInfo=readJson(resolve('node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json')).firestore;
assert.equal(emulatorInfo.version,'1.22.0');
assert.equal(createHash('sha256').update(readFileSync(join(process.env.FIREBASE_EMULATORS_PATH,emulatorInfo.downloadPathRelativeToCacheDir))).digest('hex'),emulatorInfo.expectedChecksumSHA256);
const ports=[8080,9099,4400,4500,9150];
async function free(port) { return new Promise((done,reject)=>{const server=createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(done));});}
for(const port of ports) await free(port);
console.info('JIN_NEXT_EMULATOR_PREFLIGHT_LOCKED_STACK_CACHE_PORTS_PASS');
const directory=mkdtempSync(join(tmpdir(),'enmori-jin-next-outer-'));
try {
  const env=buildControlledEmulatorTestEnvironment({...process.env,
    GCLOUD_PROJECT:'demo-enmori-rmvp01a-r10',GOOGLE_CLOUD_PROJECT:'demo-enmori-rmvp01a-r10',
    FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',
  },directory);
  env.CI='true';env.FIREBASE_CLI_DISABLE_USAGE='true';env.FIREBASE_EMULATORS_PATH=process.env.FIREBASE_EMULATORS_PATH;
  const quote=value=>'"'+value.replaceAll('"','\\"')+'"';
  const command=[process.execPath,resolve('tool/ai_store_emulator_worker.mjs'),...process.argv.slice(2)].map(quote).join(' ');
  const code=await new Promise((done,reject)=>{const child=spawn(process.execPath,[
    resolve('node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:exec','--project','demo-enmori-rmvp01a-r10',
    '--only','auth,firestore','--config','firebase.json','--non-interactive',command,
  ],{env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',done);});
  process.exitCode=code??1;
} finally {
  const child=relative(realpathSync(tmpdir()),realpathSync(directory));
  assert.ok(child&&!child.startsWith('..')&&!isAbsolute(child));
  rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  assert.equal(existsSync(directory),false);
  console.info('JIN_NEXT_EMULATOR_OUTER_PROFILE_REMOVED');
  for(const port of ports) await free(port);
  console.info('JIN_NEXT_EMULATOR_REQUIRED_PORTS_FREE');
}
