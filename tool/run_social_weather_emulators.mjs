// Reuses the approved isolated demo Auth/Firestore gate; no real account/config.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,realpathSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {buildControlledEmulatorTestEnvironment} from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
assert.equal(process.version,'v24.19.0');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(program,args,env)=>new Promise((done,reject)=>{
  const child=spawn(program,args,{cwd:root,env,stdio:'inherit',windowsHide:true});
  child.on('error',reject);child.on('exit',code=>code===0?done():reject(new Error(`Test child exited ${code}`)));
});
const ports=[8080,9099,4400,4500,9150];
const free=async()=>{for(const port of ports)await new Promise((done,reject)=>{
  const server=createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(done));
});};
if(process.argv[2]==='--child'){
  const env=buildControlledEmulatorTestEnvironment(process.env,process.env.ENMORI_CONTROLLED_PROFILE_DIRECTORY);
  await run(process.execPath,['--test','--test-concurrency=1','--test-timeout=90000','backend/dist/emulator-test/social-weather.integration.test.js'],env);
}else{
  await free();const directory=mkdtempSync(join(tmpdir(),'enmori-social-weather-')),parent=realpathSync(tmpdir());
  try{
    const env=buildControlledEmulatorTestEnvironment({...process.env,
      GCLOUD_PROJECT:'demo-enmori-rmvp01a-r10',GOOGLE_CLOUD_PROJECT:'demo-enmori-rmvp01a-r10',
      FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'},directory);
    env.CI='true';env.FIREBASE_CLI_DISABLE_USAGE='true';
    if(process.env.FIREBASE_EMULATORS_PATH)env.FIREBASE_EMULATORS_PATH=process.env.FIREBASE_EMULATORS_PATH;
    const script=fileURLToPath(import.meta.url);assert.ok(!script.includes('"'));
    const quote=s=>`'${s.replaceAll("'","'\\''")}'`;
    const command=process.platform==='win32'?`"${process.execPath}" "${script}" --child`:`${quote(process.execPath)} ${quote(script)} --child`;
    const cli=createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js');
    await run(process.execPath,[cli,'emulators:exec','--project','demo-enmori-rmvp01a-r10','--only','auth,firestore','--config','firebase.json','--non-interactive',command],env);
  }finally{
    const child=relative(parent,realpathSync(directory));assert.ok(child&&!child.startsWith('..')&&!isAbsolute(child));
    rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});assert.equal(existsSync(directory),false);
    await free();console.log('owned profile removed; five loopback ports free');
  }
}
