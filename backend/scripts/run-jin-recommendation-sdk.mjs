import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildControlledEmulatorTestEnvironment } from '../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const run=(args,env,cwd=root)=>{
  const r=spawnSync(process.execPath,args,{env,cwd,stdio:'inherit',windowsHide:true});
  if(r.error)throw r.error;return r.status??1;
};
if(process.argv[2]==='worker'){
  const profile=process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
  if(!profile)throw Error('Isolated profile required');
  const env=buildControlledEmulatorTestEnvironment(process.env,profile);
  process.exitCode=run(['--test','--test-concurrency=1','backend/dist/emulator-test/jin-recommendation-v2.integration.test.js'],env);
}else{
  for(const port of [18080,19099,14400,14500,19150])await new Promise((done,reject)=>{
    const server=createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(done));
  });
  const build=join(root,'build');mkdirSync(build,{recursive:true});
  const profile=mkdtempSync(join(build,'jin-recommendation-sdk-'));
  const logs=mkdtempSync(join(build,'jin-recommendation-sdk-logs-'));
  try{
    const env=buildControlledEmulatorTestEnvironment({...process.env,GCLOUD_PROJECT:'demo-enmori-rmvp01a-r10',
      GOOGLE_CLOUD_PROJECT:'demo-enmori-rmvp01a-r10',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:19099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:18080'},profile);
    const config=join(profile,'firebase.json'),rules=join(profile,'firestore.rules');
    writeFileSync(rules,"rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }");
    writeFileSync(config,JSON.stringify({firestore:{rules,indexes:join(root,'firestore.indexes.json')},emulators:{
      auth:{host:'127.0.0.1',port:19099},firestore:{host:'127.0.0.1',port:18080,websocketPort:19150},
      hub:{host:'127.0.0.1',port:14400},logging:{host:'127.0.0.1',port:14500},ui:{enabled:false},singleProjectMode:true}}));
    const cli=join(dirname(createRequire(import.meta.url).resolve('firebase-tools/package.json')),'lib/bin/firebase.js');
    process.exitCode=run([cli,'emulators:exec','--project','demo-enmori-rmvp01a-r10','--only','auth,firestore','--config',config,'--non-interactive','--debug',
      `"${process.execPath}" "${fileURLToPath(import.meta.url)}" worker`],
      {...env,CI:'true',FIREBASE_CLI_DISABLE_USAGE:'true',JAVA_HOME:process.env.JAVA_HOME??'',FIREBASE_EMULATORS_PATH:process.env.FIREBASE_EMULATORS_PATH??''},logs);
    console.log('SDK logs retained:',logs);
  }finally{
    if(dirname(resolve(profile))!==build||!basename(profile).startsWith('jin-recommendation-sdk-'))throw Error('Unsafe profile cleanup');
    for(const entry of readdirSync(profile,{withFileTypes:true}))
      if(entry.isFile()&&entry.name.endsWith('.log'))copyFileSync(join(profile,entry.name),join(logs,entry.name));
    rmSync(profile,{recursive:true,force:true});
    if(existsSync(profile))throw Error('Profile cleanup incomplete');
    console.log('Owned SDK profile removed');
  }
  for(const port of [18080,19099,14400,14500,19150])await new Promise((done,reject)=>{
    const server=createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(done));
  });
  console.log('Five isolated ports free');
}
