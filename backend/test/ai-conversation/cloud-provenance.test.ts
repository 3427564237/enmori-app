import { parseReadAuthority } from "../../src/ai-conversation/infrastructure/real-context-records.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSourceUse, parseSourceUseV2, inspectSourceUseV2 } from '../../src/ai-conversation/infrastructure/source-use-v2.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
const receipt={schemaVersion:'source_use_v3',purpose:'selected_checkin_reply',processing:'cloud',provider:'groq',disclosureVersion:'groq_cloud_v1',cloudAiConsentGeneration:1,sources:[],requiredCategories:[],purposeRevocationGeneration:3};
test('cloud provenance stays distinguishable from local receipts, including no selected context',()=>{
 assert.equal(parseSourceUse(receipt)?.processing,'cloud');assert.equal(parseSourceUseV2(receipt),undefined);
 for(const patch of [{processing:'local'},{provider:'other'},{disclosureVersion:'other'},{schemaVersion:'source_use_v2'},{extra:true},{purpose:'explicit_follow_up'}]) assert.equal(parseSourceUse({...receipt,...patch}),undefined);
 const local={schemaVersion:'source_use_v2',purpose:'selected_checkin_reply',processing:'local',sources:[{kind:'check_in',id:'owned-note',version:'v1',cardRef:'card'}],requiredCategories:['check_ins'],purposeRevocationGeneration:3};
 assert.equal(parseSourceUseV2(local)?.processing,'local');assert.equal(parseSourceUse({...local,schemaVersion:'source_use_v3'}),undefined);
});
test('cloud receipt readback denies absent/revoked grants rather than relabelling local',async()=>{
 const account={username:'member_a',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:'2026-10-05T00:00:00.000Z',purposeRevocationGeneration:3,cloudAiConsentGeneration:1};
 for(const cloudAiConsent of [undefined,{state:'declined',disclosureVersion:'groq_cloud_v1'},{state:'accepted',disclosureVersion:'groq_cloud_v1'}]){
  const gateway=new InMemoryFirestoreGateway({'accounts/owner':{...account,...(cloudAiConsent?{cloudAiConsent}:{})}});
  const result=await gateway.runTransaction(tx=>inspectSourceUseV2({...tx,getSnapshot:async()=>undefined},'owner','conversation',parseSourceUse(receipt)!,()=>1000,()=>{}));
  assert.equal(result.kind,cloudAiConsent?.state==='accepted'?'valid':'invalid');
 }
});

test('unknown cloud disclosure leaves local authority readable and never masquerades as a known cloud revocation',async()=>{
 const account={username:'member_a',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:'2026-10-05T00:00:00.000Z',purposeRevocationGeneration:3,
  cloudAiConsent:{state:'accepted',disclosureVersion:'future_unknown'},cloudAiConsentGeneration:1};
 const authority=parseReadAuthority(account,'owner');assert.equal(authority?.consent,'accepted');assert.equal(authority?.purposeRevocationGeneration,3);assert.equal(authority?.cloudAiConsentUnavailable,true);
 const gateway=new InMemoryFirestoreGateway({'accounts/owner':account});
 const result=await gateway.runTransaction(tx=>inspectSourceUseV2({...tx,getSnapshot:async()=>undefined},'owner','conversation',parseSourceUse(receipt)!,()=>1000,()=>{}));
 assert.equal(result.kind,'unavailable');
});

test('malformed orphan cloud generation is unavailable without invalidating local authority',async()=>{
 for(const cloudAiConsentGeneration of [-1,'broken']){
 const account={username:'member_a',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:'2026-10-05T00:00:00.000Z',purposeRevocationGeneration:3,cloudAiConsentGeneration};
 assert.equal(parseReadAuthority(account,'owner')?.cloudAiConsentUnavailable,true);
 const gateway=new InMemoryFirestoreGateway({'accounts/owner':account});
 const result=await gateway.runTransaction(tx=>inspectSourceUseV2({...tx,getSnapshot:async()=>undefined},'owner','conversation',parseSourceUse(receipt)!,()=>1000,()=>{}));
 assert.equal(result.kind,'unavailable');
 }
});

test('cloud generation older than receipt is unavailable, not evidence of revocation',async()=>{
 const account={username:'member_a',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:'2026-10-05T00:00:00.000Z',purposeRevocationGeneration:3,cloudAiConsentGeneration:0,cloudAiConsent:{state:'accepted',disclosureVersion:'groq_cloud_v1'}};
 const gateway=new InMemoryFirestoreGateway({'accounts/owner':account});
 const result=await gateway.runTransaction(tx=>inspectSourceUseV2({...tx,getSnapshot:async()=>undefined},'owner','conversation',parseSourceUse(receipt)!,()=>1000,()=>{}));
 assert.equal(result.kind,'unavailable');
});


test('v3 preserves each provider tuple and refuses cross-provider authorization',async()=>{
 const account={username:'member_a',optionalProcessingConsent:'accepted',checkInVisibility:'private',onboardingCompletedAt:'2026-10-05T00:00:00.000Z',purposeRevocationGeneration:3,cloudAiConsentGeneration:1};
 for(const [provider,disclosureVersion]of [['groq','groq_cloud_v1'],['openai','openai_cloud_v1']]){
  const original={...receipt,provider,disclosureVersion},parsed=parseSourceUse(original)!;
  assert.equal(parsed?.schemaVersion,'source_use_v3');assert.equal(parsed.processing==='cloud'&&parsed.provider,provider);
  for(const consentVersion of ['groq_cloud_v1','openai_cloud_v1']){
   const gateway=new InMemoryFirestoreGateway({'accounts/owner':{...account,cloudAiConsent:{state:'accepted',disclosureVersion:consentVersion}}});
   const result=await gateway.runTransaction<Awaited<ReturnType<typeof inspectSourceUseV2>>>((tx): ReturnType<typeof inspectSourceUseV2>=>inspectSourceUseV2({...tx,getSnapshot:async():Promise<undefined>=>undefined},'owner','conversation',parsed,()=>1000,()=>{}));
   assert.equal(result.kind,consentVersion===disclosureVersion?'valid':'invalid');assert.deepEqual(parsed,original);
  }
 }
 for(const invalid of [{provider:'openai',disclosureVersion:'groq_cloud_v1'},{provider:'groq',disclosureVersion:'openai_cloud_v1'},{provider:'openai',disclosureVersion:'future_unknown'}])assert.equal(parseSourceUse({...receipt,...invalid}),undefined);
});
