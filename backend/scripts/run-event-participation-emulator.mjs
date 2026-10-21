import { spawn } from 'node:child_process';
import { mkdirSync,mkdtempSync,writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment } from '../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

for(const port of [18080,19099,14400,14500,9150])await new Promise((done,reject)=>{
  const server=createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(done));
});
mkdirSync('build',{recursive:true});
const profile=mkdtempSync(resolve('build/shi-ep1-isolated-'));
const environment=buildControlledEmulatorTestEnvironment({PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP,
  GCLOUD_PROJECT:'demo-enmori-rmvp01a-r10',GOOGLE_CLOUD_PROJECT:'demo-enmori-rmvp01a-r10',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:19099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:18080'},profile);
const config=join(profile,'firebase.json');
const rules=join(profile,'firestore.rules');
writeFileSync(rules,"rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }");
writeFileSync(config,JSON.stringify({firestore:{rules,indexes:resolve('firestore.indexes.json')},emulators:{auth:{host:'127.0.0.1',port:19099},firestore:{host:'127.0.0.1',port:18080},hub:{host:'127.0.0.1',port:14400},logging:{host:'127.0.0.1',port:14500},ui:{enabled:false},singleProjectMode:true}}));
// Explicit installed dependencies only. No ambient credential profile inherited.
const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--project','demo-enmori-rmvp01a-r10','--only','auth,firestore','--config',config,
  `${JSON.stringify(process.execPath)} backend/scripts/run-event-participation-sdk.mjs`],{
    env:{...environment,CI:'1',JAVA_HOME:process.env.JAVA_HOME??'',FIREBASE_EMULATORS_PATH:process.env.FIREBASE_EMULATORS_PATH??''},stdio:'inherit',windowsHide:true,
  });
child.once('error',error=>{throw error;});
child.once('exit',code=>{process.exitCode=code??1;});
