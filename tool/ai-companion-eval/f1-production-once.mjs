/** Explicitly authorized synthetic F1 proof, never a product entry or CI test.
 * prepare writes a fixed manifest; run consumes one atomic job-wide reservation.
 * No retries, prompt/parameter edits, FCM or real account data. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const repository=resolve(process.cwd()),privateBase='/home/miku/.local/state/enmori-ai-companion-20261025';
const expectedHead='6bab96062e357b34fc2a7326678ee4b6bce515f2';
const jobReservation=join(privateBase,'f1-production-6bab960-20261025.execute-reservation.json');
const [mode,dirArg]=process.argv.slice(2),directory=resolve(dirArg??'');
assert(['prepare','run'].includes(mode)&&dirArg&&directory.startsWith(`${privateBase}/context-f1-production-6bab960-`),'Explicit private run directory required');
const sha=value=>createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const save=(name,value)=>writeFile(join(directory,name),typeof value==='string'||Buffer.isBuffer(value)?value:json(value),{flag:'wx',mode:0o600});
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function bounded(promise,milliseconds){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bounded empty preload did not settle')),milliseconds);})]);}finally{clearTimeout(timer);}}
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim();
assert.equal(head,expectedHead,'Source must be the assigned exact head');
execFileSync('git',['diff','--exit-code','HEAD','--','backend/src','api'],{cwd:repository,stdio:'pipe'});
const sourceFiles=execFileSync('git',['ls-tree','-r','--name-only','HEAD','backend/src'],{cwd:repository,encoding:'utf8'}).trim().split('\n').filter(path=>path.endsWith('.ts'));
const binding={head,runnerSha256:sha(await readFile(new URL(import.meta.url))),node:process.version,files:[]};
for(const source of sourceFiles){
  const compiled=source.replace('backend/src/','backend/dist/src/').replace(/\.ts$/,'.js');
  binding.files.push({source,sha256:sha(await readFile(join(repository,source))),compiled,compiledSha256:sha(await readFile(join(repository,compiled)))});
}
const fixed={model:'qwen3.5:9b',occurredAt:'2026-10-23T06:00:00.000Z',note:'2026年10月23日下午，我完成了20分钟散步，记下心情放松。',mood:'放松',activity:'散步',
  currentMessage:'请用中文复述我这次附加的那条签到当时记录了什么，分别提到记录时间、原话、Mood 和 Activity。时间请沿用记录给出的 UTC 时间。只说当时的记录，不要假定我今天仍是那个心情或又做了相同活动，不补充记录以外的信息。'};
if(mode==='prepare'){
  await mkdir(directory,{recursive:false,mode:0o700});
  const manifest={schemaVersion:'f1_production_once_v1',job:'context-f1-production-6bab960-20261025',purpose:'one synthetic explicitly selected historical Check-in through production HTTP/serializer/local lane/canonical store',
    createdAt:new Date().toISOString(),baseHead:head,sourceBindingSha256:sha(json(binding)),runnerSha256:binding.runnerSha256,projectId:'demo-enmori-companion-20261025',authHost:'127.0.0.1:19099',firestoreHost:'127.0.0.1:18180',
    ownerAccountId:randomUUID(),firebaseUid:`f1-live-${randomUUID()}`,checkInId:`f1-live-${randomUUID()}`,fixed,
    limits:{applicationExecuteAttempts:1,generationPosts:1,emptyPreloadPostsIfNotResident:1,retries:0,fcm:0,realData:0,promptOrParameterChanges:0},
    productionParameters:{think:false,num_ctx:8192,num_predict:512,stream:false,keep_alive:'30m'},
    semanticCriteria:['Chinese response answers the latest user request','Correct original UTC occurredAt','Faithful Note quotation and stored Mood/Activity','Clearly historical, no assumption about today','No extra facts/actions/IDs/location/weather'],
    semanticReview:'independent QA required, not inferred from HTTP or schema success'};
  await save('source-binding.json',binding);await save('manifest.json',manifest);
  process.stdout.write(json({phase:'prepared',directory,manifestSha256:sha(json(manifest)),sourceBindingSha256:manifest.sourceBindingSha256}));
  process.exit(0);
}
const manifestText=await readFile(join(directory,'manifest.json'),'utf8'),manifest=JSON.parse(manifestText),frozenBinding=JSON.parse(await readFile(join(directory,'source-binding.json'),'utf8'));
assert.equal(manifest.baseHead,head);assert.deepEqual(manifest.fixed,fixed);assert.equal(sha(json(binding)),manifest.sourceBindingSha256);assert.deepEqual(binding,frozenBinding);
assert.equal(process.env.GCLOUD_PROJECT,manifest.projectId);assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,manifest.authHost);assert.equal(process.env.FIRESTORE_EMULATOR_HOST,manifest.firestoreHost);
await writeFile(jobReservation,json({job:manifest.job,manifestSha256:sha(manifestText),directory,reservedAt:new Date().toISOString(),generationLimit:1,retryLimit:0}),{flag:'wx',mode:0o600});
await save('attempt-reserved.json',{manifestSha256:sha(manifestText),reservedAt:new Date().toISOString(),pid:process.pid});

const require=createRequire(join(repository,'package.json'));
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getAuth}=require('firebase-admin/auth');
const load=path=>import(pathToFileURL(join(repository,'backend/dist/src',path)).href);
const {requireControlledEmulatorEnvironment}=await load('shared/infrastructure/firebase/controlled-emulator-environment.js');
const {createAuthBindingDocumentId}=await load('shared/infrastructure/firebase/firestore-records.js');
const {FirebaseIdentityVerifier}=await load('shared/infrastructure/firebase/firebase-identity-verifier.js');
const {createIsolatedConversationComposition}=await load('bootstrap/isolated-conversation-composition.js');
const {buildApp}=await load('bootstrap/build-app.js');
const {LocalModelLane}=await load('ai-runtime/infrastructure/local-model-lane.js');
const {LocalChatTransport,simpleChatGates}=await load('ai-runtime/infrastructure/local-chat-transport.js');
const {err}=await load('shared/domain/result.js'),{appFailure}=await load('shared/application/app-failure.js');
const env=requireControlledEmulatorEnvironment(process.env);assert.equal(env.projectId,manifest.projectId);
const nativeFetch=globalThis.fetch,captures=[],counts={generationReservations:0,generationPosts:0,emptyPreloadReservations:0,emptyPreloadPosts:0,preparePosts:0,executePosts:0};
const reports=[],retirements=[],createdPaths=[];
let firebase,firestore,auth,composition,app,token,authCreated=false,prepared,phase='preflight',lane;
let beforeMetadata=[],afterStartupMetadata=[];
const result={schemaVersion:'f1_production_once_result_v1',manifestSha256:sha(manifestText),sourceBindingSha256:manifest.sourceBindingSha256,baseHead:head,
  startedAt:new Date().toISOString(),counts,logical:{status:'not_completed'},semantic:{status:'pending_independent_qa'},physicalSettlement:'not_started',cleanup:{status:'not_started'}};
const scrub=value=>{
  if(Array.isArray(value))return value.map(scrub);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,['operationKey','idToken','refreshToken','password','authorization'].includes(k)?'[redacted]':scrub(v)]));
  return value;
};
const plain=value=>value&&typeof value==='object'&&typeof value.seconds==='number'&&typeof value.nanoseconds==='number'?{seconds:value.seconds,nanoseconds:value.nanoseconds}:
  Array.isArray(value)?value.map(plain):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,plain(v)])):value;
async function captureResponse(response,name){
  const reader=response.clone().body?.getReader();if(!reader)return;const parts=[];let size=0;
  for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>1024*1024)throw Error('Evidence response exceeded the unchanged production byte limit');parts.push(Buffer.from(next.value));}
  const raw=Buffer.concat(parts);await save(`${name}-response.raw.json`,raw);await save(`${name}-response-meta.json`,{status:response.status,bytes:raw.length,sha256:sha(raw),receivedAt:new Date().toISOString()});
}
async function observedModelFetch(url,init){
  const path=new URL(String(url));assert.equal(path.origin,'http://127.0.0.1:11434');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');
  const value=JSON.parse(init.body);assert.equal(value.model,fixed.model);let name;
  if(path.pathname==='/api/generate'){
    assert.equal(result.preflight?.resident,false);assert.equal(++counts.emptyPreloadReservations,1);assert.deepEqual(value,{model:fixed.model,prompt:'',stream:false,keep_alive:'30m',options:{num_ctx:8192}});name='empty-preload';
  }else{
    assert.equal(path.pathname,'/api/chat');assert.equal(++counts.generationReservations,1);await save('generation-1-serializer-observed.raw.json',init.body);assert.equal(value.messages.length,2);assert.equal(value.messages[1].role,'user');assert.equal(value.messages[1].content,fixed.currentMessage);
    assert.equal(value.think,false);assert.deepEqual(value.options,{num_ctx:8192,num_predict:512});assert.equal(value.stream,false);assert.equal(value.keep_alive,'30m');
    assert(!init.body.includes(manifest.ownerAccountId));assert(!init.body.includes(manifest.firebaseUid));assert(!init.body.includes(manifest.checkInId));name='generation-1';
  }
  await save(`${name}-request.raw.json`,init.body);await save(`${name}-dispatch.json`,{at:new Date().toISOString(),requestSha256:sha(init.body),retry:false});
  if(name==='generation-1')counts.generationPosts++;else counts.emptyPreloadPosts++;
  const response=await nativeFetch(url,init);const capture=captureResponse(response,name);captures.push(capture);void capture.catch(()=>{});return response;
}
async function http(method,path,body,operationKey){
  const headers={authorization:`Bearer ${token}`,...(body?{'content-type':'application/json'}:{}),...(operationKey?{'ai-operation-key':operationKey}:{})};
  const response=await nativeFetch(new URL(path,app.listeningOrigin),{method,headers,redirect:'error',signal:AbortSignal.timeout(70000),...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();return {status:response.status,body:JSON.parse(text)};
}
async function metadata(){const values=[];for(const path of ['ai_runtime_fence/current','ai_cleanup_progress/source_sweep']){const row=await firestore.doc(path).get();values.push({path,data:row.data(),hash:sha(json(plain(row.data()??null)))});}return values;}
try{
  const psResponse=await nativeFetch('http://127.0.0.1:11434/api/ps',{redirect:'error',signal:AbortSignal.timeout(5000)});assert.equal(psResponse.status,200);const ps=await psResponse.json();assert(Array.isArray(ps.models));
  await save('resident-before.json',ps);result.preflight={resident:ps.models.some(m=>m.name===fixed.model||m.model===fixed.model),observedAt:new Date().toISOString()};
  lane=new LocalModelLane(fixed.model,observedModelFetch);const transport=new LocalChatTransport(lane);
  if(!result.preflight.resident){phase='empty-preload';const warm=transport.prepareModel();await bounded(warm,125000);}
  assert.equal(lane.state.pending,false);
  phase='composition';firebase=initializeApp({projectId:env.projectId},`f1-live-${randomUUID()}`);firestore=getFirestore(firebase);auth=getAuth(firebase);beforeMetadata=await metadata();
  composition=await createIsolatedConversationComposition({firestore,environment:process.env,transport,gates:simpleChatGates,simpleChat:true,selectedReplies:true,conversationStrategy:'open_conversation_v1',report:(p,r)=>reports.push({phase:p,...r}),reportRetirement:confirmed=>retirements.push(confirmed)});
  afterStartupMetadata=await metadata();assert(reports.every(r=>r.complete===true),'Production startup maintenance not complete');
  phase='owned-synthetic-fixture';const password=`Synthetic_${randomUUID()}`,email=`${manifest.firebaseUid}@example.invalid`;await auth.createUser({uid:manifest.firebaseUid,email,password});authCreated=true;
  const signed=await nativeFetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),redirect:'error'});assert.equal(signed.status,200);token=(await signed.json()).idToken;assert.equal(typeof token,'string');
  const ownerBase=`accounts/${manifest.ownerAccountId}`;
  for(const [path,data]of [[`auth_bindings/${createAuthBindingDocumentId(manifest.firebaseUid)}`,{accountId:manifest.ownerAccountId}],[ownerBase,{username:'f1_live_synthetic',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:new Date().toISOString(),purposeRevocationGeneration:0}],[`${ownerBase}/persona_state/current`,{stateRevision:0,livePersonaIds:[]}],[`check_ins/${manifest.checkInId}`,{ownerAccountId:manifest.ownerAccountId,note:fixed.note,mood:fixed.mood,activity:fixed.activity,createdAt:fixed.occurredAt,revision:1,checkInVisibility:'private'}]]){await firestore.doc(path).create(data);createdPaths.push(path);}
  const unused={execute:async()=>err(appFailure('SERVICE_UNAVAILABLE'))};app=await buildApp({identityVerifier:new FirebaseIdentityVerifier(auth),completeOnboarding:unused,getOnboarding:unused,createCheckIn:unused,getCheckIn:unused,getInterestTags:unused,getOwnInterests:unused,replaceOwnInterests:unused,isolatedSlices:{environment:process.env,conversations:composition.operations},ownedSources:composition.ownedSources});
  const origin=await app.listen({host:'127.0.0.1',port:0});assert.equal(new URL(origin).hostname,'127.0.0.1');app.listeningOrigin=origin;
  phase='http-prepare';counts.preparePosts++;const prepareBody={kind:'send',purpose:'checkin_conversation',contextSelection:{processing:'local',sources:[{kind:'check_in',checkInId:manifest.checkInId}]}};
  await save('http-prepare-request.json',prepareBody);const preparation=await http('POST','/v1/me/ai/operations',prepareBody);await save('http-prepare-response.redacted.json',scrub(preparation));assert.equal(preparation.status,201);prepared=preparation.body;
  phase='explicit-source-review';const selected=prepared.contextSelection;assert(selected&&selected.sourceCards.length===1);assert.equal(selected.sourceCards[0].sourceOccurredAt,fixed.occurredAt);assert.deepEqual(selected.historyPairs,[]);assert.equal(selected.sourceCards[0].state,'available');
  const choice={selectionRevision:selected.selectionRevision,includedKeys:[selected.sourceCards[0].selectionKey],excludedKeys:[],excludedHistoryKeys:[]};
  await save('review-confirmation.json',{at:new Date().toISOString(),selectionRevision:choice.selectionRevision,reviewedCard: selected.sourceCards[0],historyPairs:[],explicitSend:true,scope:'one currently selected synthetic source, current prepared revision only'});
  phase='http-execute';counts.executePosts++;assert.equal(counts.executePosts,1);await save('http-execute-request.redacted.json',{operationId:prepared.operationId,operationKey:'[redacted]',body:{text:fixed.currentMessage,contextSelection:choice}});
  const executed=await http('POST',`/v1/me/ai/operations/${prepared.operationId}/execute`,{text:fixed.currentMessage,contextSelection:choice},prepared.operationKey);await save('http-execute-response.json',executed);result.logical.httpStatus=executed.status;result.logical.status=executed.status===200?'http_success':'http_failure';
  phase='canonical-read';await composition.io.settled(manifest.ownerAccountId,prepared.conversationId);const topicPath=`${ownerBase}/conversations/${prepared.conversationId}`,messageRows=await firestore.collection(`${topicPath}/messages`).orderBy('sequence').get(),receiptRows=await firestore.collection(`${topicPath}/message_sources`).get();
  const persisted={topic:{path:topicPath,data:plain((await firestore.doc(topicPath).get()).data()??null)},messages:messageRows.docs.map(d=>({id:d.id,data:plain(d.data()),createTime:plain(d.createTime),updateTime:plain(d.updateTime)})),receipts:receiptRows.docs.map(d=>({id:d.id,data:plain(d.data())}))};await save('canonical-projection.json',persisted);
  if(executed.status===200){assert.equal(messageRows.size,2);assert.equal(messageRows.docs[0].data().text,fixed.currentMessage);assert.equal(messageRows.docs[1].data().role,'assistant');assert.equal(receiptRows.docs[0].data().schemaVersion,'source_use_v2');result.logical.status='http_and_canonical_success';result.logical.canonicalMessageCount=2;result.logical.sourceReceiptVersion='source_use_v2';}
  result.countsAreWithinManifest=counts.generationPosts<=1&&counts.emptyPreloadPosts<=1&&counts.executePosts===1;
}catch(error){result.logical={...result.logical,status:result.logical.status==='not_completed'?'stopped_on_failure':result.logical.status,failurePhase:phase,errorName:error?.name??'Error',errorCode:typeof error?.code==='string'?error.code:undefined};}
finally{
  phase='physical-settlement';const until=Date.now()+130000;
  while(lane?.state.pending&&!lane.state.outcomeUnknown&&Date.now()<until)await delay(250);
  result.laneState=lane?.state??null;result.physicalSettlement=!lane||!lane.state.pending?'settled':lane.state.outcomeUnknown?'unknown_quarantined':'pending_quarantined';
  await Promise.allSettled(captures);
  try{
    await composition?.stopAdmissionAndMaintenance();await app?.close();
    if(firestore){
      if(prepared)await composition.io.settled(manifest.ownerAccountId,prepared.conversationId);
      const ownerBase=`accounts/${manifest.ownerAccountId}`;
      for(const topic of await firestore.collection(`${ownerBase}/conversations`).listDocuments()){for(const c of ['messages','message_sources','effects','read_state'])for(const doc of (await topic.collection(c).get()).docs)await doc.ref.delete();await topic.delete();}
      if(prepared){const ref=firestore.doc(`ai_operation_fences/${prepared.operationId}`),row=await ref.get();if(row.exists){assert.equal(row.data().ownerAccountId,manifest.ownerAccountId);await ref.delete();}}
      for(const path of [...createdPaths].reverse())await firestore.doc(path).delete();
      if(authCreated){await auth.deleteUser(manifest.firebaseUid);authCreated=false;}
      assert.equal((await firestore.doc(ownerBase).get()).exists,false);assert.equal((await firestore.doc(`check_ins/${manifest.checkInId}`).get()).exists,false);
      const current=await metadata();const restored=[];
      for(const before of beforeMetadata){const now=current.find(m=>m.path===before.path),startup=afterStartupMetadata.find(m=>m.path===before.path);const owned=before.path==='ai_runtime_fence/current'?composition&&now.data?.processEpoch===composition.epoch.processEpoch:startup&&now.hash===startup.hash;
        if(owned){if(before.data)await firestore.doc(before.path).set(before.data);else await firestore.doc(before.path).delete();restored.push(before.path);}else if(startup)throw Error('Metadata ownership changed; not restored');}
      result.cleanup={status:'owned_fixture_removed',metadataRestored:restored,serviceStopped:false,projectCleared:false};
    }
  }catch(error){result.cleanup={status:'incomplete',errorName:error?.name??'Error'};}
  token=undefined;if(prepared)prepared.operationKey=undefined;
  if(firestore)await firestore.terminate();if(firebase)await deleteApp(firebase);
  result.reports=reports;result.retirements=retirements;result.finishedAt=new Date().toISOString();await save('result.json',result);
  const index=[];for(const name of (await readdir(directory)).sort()){const data=await readFile(join(directory,name));index.push({name,bytes:data.length,sha256:sha(data)});}await save('artifact-sha256.json',{files:index});
  process.stdout.write(json({phase:'finished',directory,logical:result.logical,physicalSettlement:result.physicalSettlement,cleanup:result.cleanup,counts,resultSha256:sha(json(result))}));
  process.exitCode=result.cleanup.status==='incomplete'?2:result.logical.status==='http_and_canonical_success'?0:1;
}
