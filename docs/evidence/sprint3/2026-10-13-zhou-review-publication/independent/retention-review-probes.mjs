// Retained exact JavaScript body from the independent review execution.
// This comment header is the only addition to that executed body.
// Reviewed source blob: 2fc26b0151693dafee570d614026a5f7717e0284.
// Run as STDIN so the unchanged relative import resolves from the repository:
// cwd: <REPO_ROOT>
// PowerShell: Get-Content -LiteralPath '<DRAFTS_ROOT>/2026-10-13-independent-ai-local/retention-review-probes.mjs' -Raw | node --input-type=module
// This is a pure reviewer probe, not a product test, SDK experiment or formal JIN review.
import assert from 'node:assert/strict';
import { resolveRealRetention } from './backend/src/ai-conversation/domain/real-retention-resolver.ts';
const NS=1_000_000_000n, RET=7_776_000n*NS, CLEAN=86_400n*NS;
const time=(n)=>{let s=n/NS,r=n%NS;if(r<0n){s--;r+=NS;}return {seconds:Number(s),nanoseconds:Number(r)};};
const inventory=(instants,cutoffs)=>({parent:{ownerAccountId:'owner',conversationId:'conversation',state:'live',lifecycleVersion:1,nextSequence:instants.length+1,latestMessageId:`m${instants.length}`},messages:instants.map((n,i)=>({ownerAccountId:'owner',conversationId:'conversation',messageId:`m${i+1}`,role:i===1?'assistant':'user',sequence:i+1,createTime:time(n),...(i?{appendBefore:time(cutoffs[i-1])}:{})}))});
const resolve=(inv,now,precision='nanosecond')=>resolveRealRetention({ownerAccountId:'owner',conversationId:'conversation',inventory:inv,now:{precision,instant:time(now)}});
let checks=0;
for(const first of [-RET-1n,0n,999_999_999n,100_123_456_789n,9_000_000_000_000_000n*NS]){
 const prior=first+RET;
 for(const delta of [-1n,0n,1n,CLEAN+1n]){
  const second=prior+delta;
  const late=delta>=0n;
  const expiry=late?prior:second+RET;
  const inv=inventory([first,second],[prior]);
  for(const now of [second,expiry-1n,expiry,expiry+CLEAN-1n,expiry+CLEAN,expiry+CLEAN+1n]){
   const result=resolve(inv,now);
   if(now<second){assert.equal(result.state,'unavailable');assert.equal(result.cleanupDue,false);}
   else {assert.equal(result.state,late||now>=expiry?'expired':'live');assert.deepEqual(result.expiresAt,time(expiry));assert.deepEqual(result.cleanupAt,time(expiry+CLEAN));assert.equal(result.cleanupDue,now>=expiry+CLEAN);}
   checks++;
  }
  const third=second+CLEAN+7n;
  const validThird=inventory([first,second,third],[prior,expiry]);
  const result=resolve(validThird,third);
  assert.equal(result.state,late?'expired':'live');
  assert.deepEqual(result.expiresAt,time(late?prior:third+RET));
  checks++;
  const badThird=inventory([first,second,third],[prior,expiry+1n]);
  assert.equal(resolve(badThird,third+CLEAN+RET).state,'unavailable');checks++;
 }
 const inv=inventory([first],[]);
 const bucket=(prior/1_000_000n)-(prior<0n&&prior%1_000_000n!==0n?1n:0n);
 const coarse=bucket*1_000_000n;
 const atBucket=resolve(inv,coarse,'millisecond');
 assert.equal(atBucket.state,coarse===prior?'expired':'unavailable');
 assert.equal(atBucket.canAdvanceAnchor,false);assert.equal(atBucket.cleanupDue,false);checks++;
 const after=resolve(inv,coarse+1_000_000n,'millisecond');assert.equal(after.state,'expired');checks++;
}
console.log(JSON.stringify({review:'independent-bigint-boundary-probes',checks,outcome:'pass',sdkCalls:0,fileWrites:0}));
