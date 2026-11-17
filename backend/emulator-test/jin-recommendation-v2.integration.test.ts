import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { requireControlledEmulatorEnvironment } from '../src/shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FirebaseAdminFirestoreGateway } from '../src/shared/infrastructure/firebase/firestore-gateway.js';
import { FirebaseIdentityVerifier } from '../src/shared/infrastructure/firebase/firebase-identity-verifier.js';
import { FirestorePersonalizedEvents } from '../src/event-recommendations/infrastructure/firestore-personalized-events.js';
import { FirestoreFriendRecommendations } from '../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js';
import { firestoreSocialAuthority } from '../src/friends/infrastructure/social-authority.js';
import { myFriendsSeed,clock } from '../test/support/my-friends-fixture.js';
import { browseId } from '../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../src/event-browse/domain/source-event-id.js';
import { friendPairKey } from '../src/friends/infrastructure/firestore-friend-repository.js';
import { socialEventSource } from '../src/bootstrap/social-event-source.js';
import { sha256 } from '../src/shared/infrastructure/firebase/firestore-records.js';
import { emptyRecommendationProfile } from '../src/recommendation-profile/domain/recommendation-profile.js';

const env=requireControlledEmulatorEnvironment(process.env);
assert.equal(env.projectId,'demo-enmori-rmvp01a-r10');
const app=initializeApp({projectId:env.projectId},'jin-recommendation-v2-isolated');
const db=getFirestore(app),auth=getAuth(app),gateway=new FirebaseAdminFirestoreGateway(db);
async function reset(){
  requireControlledEmulatorEnvironment(process.env);
  for(const url of [`http://${env.authHost}/emulator/v1/projects/${env.projectId}/accounts`,
    `http://${env.firestoreHost}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`])
    assert.ok((await fetch(url,{method:'DELETE'})).ok);
}
before(reset);after(async()=>{await reset();await deleteApp(app);});
test('SDK current identity, real transaction readback, permission/ignore and reconstructed reader',async()=>{
  const seed=myFriendsSeed(1);
  for(const id of ['owner','target_1']){
    seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:'accepted',profileVisibility:'public',
      fieldPrivacy:{interests:'public',location:'public',participation:'friends_only',mapSharedWithFriends:false},
      profileDetails:{bio:null,region:'Singapore',affiliationType:'school',affiliationName:'Synthetic School'}};
    seed[`account_interests/${id}`]={interestTagIds:['dance'],revision:1};
  }
  seed['interest_tags/dance']={displayName:'Dance',lifecycleState:'active',revision:1};
  const row={browseId:browseId('synthetic_event')!,title:'Synthetic Dance',startAt:'2026-11-10T00:00:00Z',
    externalSourceUrl:'https://ticketmaster.sg/event/synthetic',interestConcepts:['Dance'],regionNames:['Singapore']};
  const eventId=sourceEventId(row.browseId);
  const participation=`event_participations/${sha256(JSON.stringify(['target_1',eventId]))}`;
  seed[participation]={accountId:'target_1',eventId,ignored:false,status:'going',revision:1,updatedAt:'2026-10-06T00:00:00.000Z',selectedAt:'2026-10-06T00:00:00.000Z'};
  const batch=db.batch();for(const [path,data] of Object.entries(seed))batch.create(db.doc(path),data);await batch.commit();
  await auth.createUser({uid:'owner',email:'jin_v2_owner@example.invalid',password:'Synthetic!Password2026'});
  const tokenResponse=await fetch(`http://${env.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'jin_v2_owner@example.invalid',password:'Synthetic!Password2026',returnSecureToken:true})});
  assert.ok(tokenResponse.ok);
  const token=await tokenResponse.json() as {idToken:string};
  const identity=await new FirebaseIdentityVerifier(auth).verifyIdToken(token.idToken);
  assert.equal(identity.kind,'verified');
  const events=socialEventSource(id=>id===eventId?row:undefined,()=>true).recommendations;
  const make=()=>new FirestorePersonalizedEvents(gateway,firestoreSocialAuthority,events,'music');
  const snapshot={items:[row],current:()=>true};
  const read=()=>make().read('owner','2026-10-07T00:00:00.000Z',snapshot);
  const initial=await read();assert.equal(initial.kind,'ready');
  if(initial.kind==='ready'){assert.equal(initial.sources.events[0]?.scoring.visibleFriendCount,1);assert.deepEqual(initial.sources.events[0]?.scoring.interestTagIds,['dance']);}
  await db.doc('accounts/target_1').update({'fieldPrivacy.participation':'private'});
  await db.doc('account_interests/owner').set({interestTagIds:[],revision:2});
  const revoked=await read();assert.equal(revoked.kind,'ready');
  if(revoked.kind==='ready'){assert.equal(revoked.sources.events[0]?.scoring.visibleFriendCount,0);assert.deepEqual(revoked.sources.events[0]?.scoring.interestTagIds,[]);}
  const ownPreference=`event_participations/${sha256(JSON.stringify(['owner',eventId]))}`;
  await db.doc(ownPreference).set({accountId:'owner',eventId,ignored:true,status:'none',revision:1,updatedAt:'2026-10-07T00:00:00.000Z'});
  const ignored=await read();assert.ok(ignored.kind==='ready'&&ignored.sources.events.length===0);
  await db.doc('accounts/owner').update({optionalProcessingConsent:'rejected'});
  const denied=await read();assert.ok(denied.kind==='ready'&&denied.sources.events.length===0);
  // Separate Friend v2 read uses the real SDK's discoverable account query.
  await db.doc('accounts/owner').update({optionalProcessingConsent:'accepted'});
  await db.doc(`friend_pairs/${friendPairKey('owner','target_1')}`).set({accountIds:['owner','target_1'],friendship:false,blockedByAccountIds:[],pending:null});
  const friendReader=new FirestoreFriendRecommendations(gateway,clock,firestoreSocialAuthority,events,true);
  const defaultOff=await friendReader.recommend('owner','all');
  assert.ok(defaultOff.ok&&defaultOff.value.ownState==='disabled'&&defaultOff.value.suggestions.length===0);
  // The 28 October discovery contract requires both explicit discovery and the
  // specific matching grant; legacy public profiles cannot imply either grant.
  for(const id of ['owner','target_1'])await db.doc(`accounts/${id}`).update({
    recommendationProfile:{...emptyRecommendationProfile,discoverable:true,matchAffiliation:true,revision:1},
  });
  const friends=await friendReader.recommend('owner','all');
  assert.ok(friends.ok&&friends.value.suggestions[0]?.reason.includes('Same shared school'));
  await db.doc('accounts/target_1').update({'recommendationProfile.matchAffiliation':false,'recommendationProfile.revision':2});
  const withdrawn=await friendReader.recommend('owner','all');
  assert.ok(withdrawn.ok&&withdrawn.value.suggestions.length===0);
});
