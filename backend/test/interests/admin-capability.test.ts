import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import type { Auth } from 'firebase-admin/auth';
import { buildApp } from '../../src/bootstrap/build-app.js';
import { GetInterestAdminCapability } from '../../src/interests/application/get-interest-admin-capability.js';
import { CreateInterestTag } from '../../src/interests/application/create-interest-tag.js';
import { GetInterestTags } from '../../src/interests/application/get-interest-tags.js';
import { GetOwnInterests } from '../../src/interests/application/get-own-interests.js';
import { ReplaceOwnInterests } from '../../src/interests/application/replace-own-interests.js';
import { FirebaseInterestAdmin } from '../../src/interests/infrastructure/firebase-interest-admin.js';
import { FirestoreCatalogueWriter } from '../../src/interests/infrastructure/firestore-catalogue-writer.js';
import { FirestoreInterestRepository } from '../../src/interests/infrastructure/firestore-interest-repository.js';
import type { InterestAdminAuthority } from '../../src/interests/ports/interest-admin.js';
import { interestAdminCapabilitySchema } from '../../src/interests/transport/admin-routes.js';
import { FirebaseIdentityVerifier } from '../../src/shared/infrastructure/firebase/firebase-identity-verifier.js';
import { createAuthBindingDocumentId } from '../../src/shared/infrastructure/firebase/firestore-records.js';
import type { IdentityVerifier } from '../../src/shared/ports/identity-verifier.js';
import { appFailure } from '../../src/shared/application/app-failure.js';
import { err } from '../../src/shared/domain/result.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';

const path='/v1/me/interest-tag-admin-capability';
const headers={authorization:'Bearer ordinary'};
const identity:IdentityVerifier={verifyIdToken:async token=>({kind:'verified',principal:{firebaseUid:token}})};
const unused={execute:async()=>err(appFailure('SERVICE_UNAVAILABLE'))};
async function appFor(authority:InterestAdminAuthority,verifier=identity,capability=true,store=new InMemoryFirestoreGateway()) {
  const interests=new FirestoreInterestRepository(store);
  return buildApp({identityVerifier:verifier,completeOnboarding:unused,getOnboarding:unused,
    createCheckIn:unused,getCheckIn:unused,getInterestTags:new GetInterestTags(interests),
    getOwnInterests:new GetOwnInterests(interests),replaceOwnInterests:new ReplaceOwnInterests(interests),
    createInterestTag:new CreateInterestTag(authority,new FirestoreCatalogueWriter(store)),
    ...(capability?{getInterestAdminCapability:new GetInterestAdminCapability(authority)}:{}),
  });
}

test('current Firebase authority requires exact boolean claim and enabled user, rereads every time',async()=>{
  let disabled=false,claim:unknown=true,calls=0;
  const authority=new FirebaseInterestAdmin({getUser:async(uid:string)=>{assert.equal(uid,'verified');calls++;return {disabled,customClaims:{enmoriAdmin:claim}};}} as unknown as Auth);
  const query=new GetInterestAdminCapability(authority),principal={firebaseUid:'verified'};
  assert.deepEqual(await query.execute(principal),{ok:true,value:{canCreateInterestTags:true}});
  for(const next of [undefined,false,'true',1]){claim=next;assert.deepEqual(await query.execute(principal),{ok:true,value:{canCreateInterestTags:false}});}
  claim=true;disabled=true;
  assert.deepEqual(await query.execute(principal),{ok:true,value:{canCreateInterestTags:false}});
  assert.equal(calls,6);
});

test('authority lookup failure and unexpected Port exception fail safely instead of returning false',async()=>{
  const unavailable=new FirebaseInterestAdmin({getUser:async()=>{throw Error('private provider detail');}} as unknown as Auth);
  for(const authority of [unavailable,{currentAdmin:async()=>{throw Error('private Port detail');}}]){
    const result=await new GetInterestAdminCapability(authority).execute({firebaseUid:'user'});
    assert.equal(result.ok,false);if(!result.ok)assert.equal(result.failure.code,'SERVICE_UNAVAILABLE');
    assert.equal(JSON.stringify(result).includes('private'),false);
  }
});

test('capability hint never authorizes a later create after claim removal; identity comes from bearer only',async t=>{
  let admin=true;const seen:string[]=[];const store=new InMemoryFirestoreGateway();
  const app=await appFor({currentAdmin:async uid=>{seen.push(uid);return admin?'allowed':'forbidden';}},identity,true,store);t.after(()=>app.close());
  const before=store.entries();
  const hint=await app.inject({url:path,headers:{...headers,'x-admin':'true'}});
  assert.equal(hint.statusCode,200);assert.deepEqual(hint.json(),{canCreateInterestTags:true});assert.equal(hint.headers['cache-control'],'no-store');
  assert.deepEqual(store.entries(),before);
  admin=false;
  const create=await app.inject({method:'POST',url:'/v1/admin/interest-tags',headers,payload:{displayName:'Books'}});
  assert.equal(create.statusCode,403);assert.deepEqual(store.entries(),before);
  const ordinary=await app.inject({url:path,headers});assert.deepEqual(ordinary.json(),{canCreateInterestTags:false});
  assert.deepEqual(seen,['ordinary','ordinary','ordinary']);
});

test('capability authenticates before rejecting forged query/body and returns no-store for every failure',async t=>{
  let reads=0;
  const app=await appFor({currentAdmin:async()=>{reads++;return 'allowed';}});t.after(()=>app.close());
  const unauth=await app.inject({url:path+'?role=admin'});assert.equal(unauth.statusCode,401);assert.equal(unauth.headers['cache-control'],'no-store');
  const badQuery=await app.inject({url:path+'?canCreateInterestTags=true',headers});
  assert.equal(badQuery.statusCode,400);assert.equal(badQuery.json().error.code,'REQUEST_INVALID');assert.equal(badQuery.headers['cache-control'],'no-store');
  const badBody=await app.inject({method:'GET',url:path,headers:{...headers,'content-type':'application/json'},payload:{enmoriAdmin:true}});
  assert.equal(badBody.statusCode,400);assert.equal(badBody.headers['cache-control'],'no-store');assert.equal(reads,0);
  assert.equal((await app.inject({method:'HEAD',url:path,headers})).statusCode,404);
});

for(const code of ['auth/user-disabled','auth/id-token-revoked']){
  test(`actual identity adapter rejects ${code} before capability authority`,async t=>{
    let reads=0;
    const verifier=new FirebaseIdentityVerifier({verifyIdToken:async(_token:string,checkRevoked:boolean)=>{assert.equal(checkRevoked,true);throw {code};}} as unknown as Auth);
    const app=await appFor({currentAdmin:async()=>{reads++;return 'allowed';}},verifier);t.after(()=>app.close());
    const response=await app.inject({url:path,headers});assert.equal(response.statusCode,403);
    assert.equal(response.json().error.code,'AUTH_FORBIDDEN');assert.equal(response.headers['cache-control'],'no-store');assert.equal(reads,0);
  });
}

test('capability failure is503 with safe exact envelope, not a false ordinary identity',async t=>{
  const app=await appFor({currentAdmin:async()=> 'unavailable'});t.after(()=>app.close());
  const response=await app.inject({url:path,headers});assert.equal(response.statusCode,503);
  assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.json().error.code,'SERVICE_UNAVAILABLE');
  assert.deepEqual(Object.keys(response.json()),['error']);
});

test('ordinary composition can keep capability unregistered',async t=>{
  const app=await appFor({currentAdmin:async()=> 'allowed'},identity,false);t.after(()=>app.close());
  assert.equal((await app.inject({url:path,headers})).statusCode,404);
});

test('Admin create is independently reread in catalogue then selectable by an ordinary completed owner',async t=>{
  const seed:Record<string,Record<string,unknown>>={};
  for(const uid of ['admin','ordinary']){
    seed[`auth_bindings/${createAuthBindingDocumentId(uid)}`]={accountId:uid};
    seed[`accounts/${uid}`]={username:uid,optionalProcessingConsent:'rejected',checkInVisibility:'private',onboardingCompletedAt:'2026-10-22T00:00:00Z'};
  }
  const store=new InMemoryFirestoreGateway(seed);
  const app=await appFor({currentAdmin:async uid=>uid==='admin'?'allowed':'forbidden'},identity,true,store);t.after(()=>app.close());
  const created=await app.inject({method:'POST',url:'/v1/admin/interest-tags',headers:{authorization:'Bearer admin'},payload:{displayName:'New interest'}});
  assert.equal(created.statusCode,201);const tag=created.json().interestTag;
  const catalogue=await app.inject({url:'/v1/interest-tags',headers});assert.equal(catalogue.statusCode,200);
  assert.deepEqual(catalogue.json().interestTags,[{interestTagId:tag.interestTagId,displayName:'New interest'}]);
  const saved=await app.inject({method:'PUT',url:'/v1/me/interests',headers,payload:{interestTagIds:[tag.interestTagId],expectedRevision:0}});
  assert.equal(saved.statusCode,200);
  const reread=await app.inject({url:'/v1/me/interests',headers});assert.equal(reread.statusCode,200);
  assert.equal(reread.json().interests.interestTags[0].interestTagId,tag.interestTagId);
  assert.equal(reread.json().interests.revision,1);
  assert.equal((await app.inject({url:path,headers})).json().canCreateInterestTags,false);
});

test('normative OpenAPI capability success schema and inventory match Transport',async()=>{
  const contract=JSON.parse(await readFile('api/openapi.json','utf8'));
  const operation=contract.paths[path].get;
  assert.equal(operation.requestBody,undefined);assert.equal(operation.parameters,undefined);
  assert.deepEqual(operation.responses['200'].content['application/json'].schema,interestAdminCapabilitySchema.response[200]);
  assert.deepEqual(Object.keys(operation.responses).sort(),['200','400','401','403','503']);
  for(const response of Object.values(operation.responses) as {headers:Record<string,unknown>}[])assert.deepEqual(response.headers['Cache-Control'],{schema:{const:'no-store'}});
});
