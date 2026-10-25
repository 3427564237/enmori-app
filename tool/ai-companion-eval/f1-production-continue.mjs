/** One explicitly authorized continuation of the recorded zero-generation
 * harness failure. Preserves the original job and counts; never re-preloads. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
const root=resolve(process.cwd()),base='/home/miku/.local/state/enmori-ai-companion-20261025';
const original=join(base,'context-f1-production-6bab960-once'),continuation=join(original,'continuation-1');
const reservation=join(base,'f1-production-6bab960-20261025.execute-reservation.json');
const continuationReservation=join(base,'f1-production-6bab960-20261025.continuation-reservation.json');
const mode=process.argv[2];assert(['prepare','run'].includes(mode));
const sha=v=>createHash('sha256').update(v).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
const get=async name=>readFile(join(original,name),'utf8');
const manifestText=await get('manifest.json'),manifest=JSON.parse(manifestText),priorText=await get('result.json'),prior=JSON.parse(priorText);
assert.equal(sha(priorText),'38b8fb5b899af28b296523bf8f4051dd11a674791e6279a0c5b1dd7d7345a859');
assert.equal(sha(manifestText),'ac82b3f8504b5f8bd63dc177d669a568a112c1938b0c95d4d080e00d0a1b869a');
assert.deepEqual(prior.counts,{generationReservations:0,generationPosts:0,emptyPreloadReservations:1,emptyPreloadPosts:1,preparePosts:0,executePosts:0});
assert.equal(prior.physicalSettlement,'settled');assert.equal(prior.cleanup.status,'owned_fixture_removed');assert.equal(prior.laneState.pending,false);assert.equal(prior.laneState.outcomeUnknown,false);
const reservedText=await readFile(reservation,'utf8'),reserved=JSON.parse(reservedText);assert.equal(reserved.manifestSha256,sha(manifestText));assert.equal(reserved.directory,original);assert.equal(reserved.generationLimit,1);assert.equal(reserved.retryLimit,0);
const frozen=await get('runner.frozen.mjs');assert.equal(sha(frozen),'bf21a490cdf4e3590cefe3bbff3360cfe58a3d4825d900646cfa74a20900a015');
const corrected=await readFile(join(root,'tool/ai-companion-eval/f1-production-once.mjs'),'utf8');
assert.equal(corrected,frozen.replace('app.listeningOrigin=origin;',''),'Only the authorized getter assignment removal is permitted in the flow source');
const sourceBindingText=await get('source-binding.json'),sourceBinding=JSON.parse(sourceBindingText);assert.equal(sha(sourceBindingText),manifest.sourceBindingSha256);
const currentHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('git',['merge-base','--is-ancestor',manifest.baseHead,currentHead]);
execFileSync('git',['diff','--exit-code',manifest.baseHead,'--','backend/src','api'],{stdio:'pipe'});
for(const item of sourceBinding.files){assert.equal(sha(await readFile(join(root,item.source))),item.sha256);assert.equal(sha(await readFile(join(root,item.compiled))),item.compiledSha256);}
assert.equal(process.version,sourceBinding.node);
const businessPatch='--- frozen runner\n+++ corrected flow\n@@\n- app.listeningOrigin=origin;\n+ (removed; http() reads Fastify built-in getter)\n';
const markers={counts:'counts={generationReservations:0,generationPosts:0,emptyPreloadReservations:0,emptyPreloadPosts:0,preparePosts:0,executePosts:0}',
  warm:"if(!result.preflight.resident){phase='empty-preload';const warm=transport.prepareModel();await bounded(warm,125000);}",
  reference:"startedAt:new Date().toISOString(),counts,logical:{status:'not_completed'}"};
let body=corrected.slice(corrected.indexOf('const require=createRequire'));
for(const text of Object.values(markers))assert.equal(body.split(text).length,2,'Expected exact continuation-control seam');
const reference={originalResultSha256:sha(priorText),originalManifestSha256:sha(manifestText),originalReservationSha256:sha(reservedText),currentRepositoryHead:currentHead,limits:{totalGenerationPosts:1,totalExecutePosts:1,totalEmptyPreloadPosts:1,newEmptyPreloadPosts:0}};
body=body.replace(markers.counts,`counts=${JSON.stringify(prior.counts)}`)
  .replace(markers.warm,"assert(result.preflight.resident,'Original preload budget spent; continuation stops unless the model is already resident');")
  .replace(markers.reference,`continuationReference:${JSON.stringify(reference)},${markers.reference}`);
const imports=corrected.slice(corrected.indexOf("import assert"),corrected.indexOf('const repository='));
const prelude=`\nconst repository=${JSON.stringify(root)},directory=${JSON.stringify(continuation)},head=${JSON.stringify(manifest.baseHead)};\nconst manifestText=${JSON.stringify(manifestText)},manifest=JSON.parse(manifestText),fixed=manifest.fixed;\nconst sha=v=>createHash('sha256').update(v).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\\n';\nconst save=(name,value)=>writeFile(join(directory,name),typeof value==='string'||Buffer.isBuffer(value)?value:json(value),{flag:'wx',mode:0o600});\nconst delay=ms=>new Promise(done=>setTimeout(done,ms));\n`;
const generated=imports+prelude+body;
const control={schemaVersion:'f1_production_continuation_v1',authorization:'Integration 25 October: one minimal-harness-fix continuation after verified zero generations, original total budget unchanged',
  ...reference,originalDirectory:original,continuationDirectory:continuation,productionSourceBindingSha256:manifest.sourceBindingSha256,originalRunnerSha256:sha(frozen),correctedFlowSha256:sha(corrected),
  businessPatchSha256:sha(businessPatch),executionControlChanges:['Seed cumulative counts from immutable original result','Reject nonresident model instead of preloading','Attach original result/reservation reference'],executionRunnerSha256:sha(generated),controllerSha256:sha(await readFile(new URL(import.meta.url))),fixedInput:manifest.fixed};
if(mode==='prepare'){
  await mkdir(continuation,{recursive:false,mode:0o700});
  for(const [name,data]of [['continuation-manifest.json',json(control)],['minimal-fix.patch',businessPatch],['execution-runner.frozen.mjs',generated]])await writeFile(join(continuation,name),data,{flag:'wx',mode:0o600});
  process.stdout.write(json({phase:'continuation_prepared',directory:continuation,manifestSha256:sha(json(control)),remainingGenerations:1,remainingPreloads:0,priorFailurePreserved:true}));process.exit(0);
}
assert.equal(await readFile(join(continuation,'continuation-manifest.json'),'utf8'),json(control));assert.equal(await readFile(join(continuation,'execution-runner.frozen.mjs'),'utf8'),generated);
assert.equal(process.env.GCLOUD_PROJECT,manifest.projectId);assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,manifest.authHost);assert.equal(process.env.FIRESTORE_EMULATOR_HOST,manifest.firestoreHost);
await writeFile(continuationReservation,json({continuationManifestSha256:sha(json(control)),originalResultSha256:sha(priorText),originalReservationSha256:sha(reservedText),reservedAt:new Date().toISOString(),remainingGenerationPosts:1,remainingPreloadPosts:0}),{flag:'wx',mode:0o600});
await writeFile(join(continuation,'continuation-reserved.json'),await readFile(continuationReservation),{flag:'wx',mode:0o600});
const {open}=await import('node:fs/promises'),log=await open(join(continuation,'execution.log'),'wx',0o600);
const child=spawn(process.execPath,[join(continuation,'execution-runner.frozen.mjs')],{cwd:root,env:process.env,stdio:['ignore',log.fd,log.fd]});
const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});await log.close();
const finalResult=JSON.parse(await readFile(join(continuation,'result.json'),'utf8'));
assert(finalResult.counts.generationPosts<=1&&finalResult.counts.executePosts<=1&&finalResult.counts.emptyPreloadPosts===1&&finalResult.counts.emptyPreloadReservations===1,'Cumulative budget exceeded');
const files=[];for(const name of (await readdir(continuation)).sort()){const data=await readFile(join(continuation,name));files.push({name,bytes:data.length,sha256:sha(data)});}
await writeFile(join(continuation,'post-exit-sha256.json'),json({files,originalResultSha256:sha(priorText),originalReservationSha256:sha(reservedText)}),{flag:'wx',mode:0o600});
process.stdout.write(json({phase:'continuation_finished',code,directory:continuation,counts:finalResult.counts,logical:finalResult.logical,physicalSettlement:finalResult.physicalSettlement,cleanup:finalResult.cleanup,resultSha256:sha(await readFile(join(continuation,'result.json')))}));process.exitCode=code??1;
