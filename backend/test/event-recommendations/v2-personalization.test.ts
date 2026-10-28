import assert from 'node:assert/strict';
import test from 'node:test';
import { FirestorePersonalizedEvents } from '../../src/event-recommendations/infrastructure/firestore-personalized-events.js';
import { RecommendEvents } from '../../src/event-recommendations/application/recommend-events.js';
import { classifyInterests, INTEREST_CLASSIFICATION_RULES } from '../../src/event-browse/domain/interest-classification.js';
import { ControlledSourceProjection } from '../../src/event-browse/infrastructure/controlled-source-projection.js';
import { browseId } from '../../src/event-browse/domain/browse-values.js';
import { sourceEventId } from '../../src/event-browse/domain/source-event-id.js';
import { firestoreSocialAuthority } from '../../src/friends/infrastructure/social-authority.js';
import { friendPairKey } from '../../src/friends/infrastructure/firestore-friend-repository.js';
import { FirestoreFriendRecommendations } from '../../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js';
import { InMemoryFirestoreGateway } from '../support/in-memory-firestore-gateway.js';
import { myFriendsSeed, clock } from '../support/my-friends-fixture.js';
import { sha256 } from '../../src/shared/infrastructure/firebase/firestore-records.js';
import type { BrowseOccurrence } from '../../src/event-browse/ports/event-browse.js';
import type { FriendEventProjection } from '../../src/friend-recommendations/ports/friend-event-projection.js';
import { rankEvents } from '../../src/event-recommendations/domain/rank-events.js';
import { rankAuthorizedFriendHomeTop2 } from '../../src/friend-recommendations/domain/friend-ranking.js';
const asOf='2026-10-07T00:00:00.000Z';
const item=(n:number,concept='Dance'):BrowseOccurrence=>({browseId:browseId(`candidate_${n}`)!,title:`Candidate ${n}`,
  startAt:'2026-11-10T00:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/a',interestConcepts:[concept],regionNames:['Singapore']});
function fixture(){
  const seed=myFriendsSeed(2);
  for(const id of ['owner','target_1','target_2']){
    seed[`accounts/${id}`]={...seed[`accounts/${id}`],optionalProcessingConsent:'accepted',profileVisibility:'public',
      fieldPrivacy:{interests:'public',location:'public',participation:'friends_only',mapSharedWithFriends:false},
      profileDetails:{bio:null,region:'Singapore',affiliationType:'school',affiliationName:'Example University'}};
    seed[`account_interests/${id}`]={interestTagIds:['dance'],revision:1};
  }
  seed['interest_tags/dance']={displayName:'Dance',lifecycleState:'active',revision:1};
  const store=new InMemoryFirestoreGateway(seed),rows=[item(1),item(2,'Music'),item(3)];
  let live=true,sourceFailed=false;
  const projection:FriendEventProjection={read:async()=>{if(sourceFailed)throw Error('Synthetic outage');return {interestedEventIds:[sourceEventId(rows[1]!.browseId)],goingEventIds:[sourceEventId(rows[1]!.browseId)]};}};
  const reader=new FirestorePersonalizedEvents(store,firestoreSocialAuthority,projection,'music');
  const snapshot={items:rows,current:()=>live};
  const app=new RecommendEvents({readForRequester:({firebaseUid,asOf})=>reader.read(firebaseUid,asOf,snapshot)},clock);
  const read=(view:'home'|'all'='all')=>app.execute({principal:{firebaseUid:'owner'},view});
  const patch=(path:string,changes:Record<string,unknown>)=>store.runTransaction(async tx=>tx.set(path,{...store.read(path),...changes}));
  return {store,rows,reader,snapshot,read,patch,invalidate:()=>{live=false;},failSource:()=>{sourceFailed=true;}};
}
test('Havelock does not invent a Singapore region reason; exact normalized city does',async()=>{
  const f=fixture();
  for(const [region,matches] of [['havelock',false],['  SINGAPORE  ',true]] as const){
    await f.patch('accounts/owner',{profileDetails:{bio:null,region,affiliationType:null,affiliationName:null}});
    const read=await f.read();assert.ok(read.ok);
    assert.ok(read.value.items.length>0);
    assert.ok(read.value.items.every(row=>row.reasons?.some(reason=>reason.code==='same_region')===matches));
  }
});
for(const [concept,rules] of Object.entries(INTEREST_CLASSIFICATION_RULES)){
  test(`classification covers ${concept} only from explicit provider classification`,()=>{
    const classification=concept==='Music'?{segment:{id:'KZFzniwnSyZfZ7v7nJ',name:'Music'}}:{genre:{id:'synthetic_taxonomy_id',name:rules[0]}};
    assert.deepEqual(classifyInterests([classification]),[concept]);
    assert.deepEqual(classifyInterests([{name:concept},{genre:{name:rules[0]}}]),[]);
  });
}
test('broad categories, title words and Music label lookalikes never imply an interest',()=>{
  assert.deepEqual(classifyInterests([{segment:{id:'other',name:'Music'}},{genre:{id:'broad',name:'Sports'}}]),[]);
});
test('v2 weights/reasons and stable Top2/all alignment use the complete current signals',async()=>{
  const f=fixture(),all=await f.read(),home=await f.read('home');assert.ok(all.ok&&home.ok);
  assert.equal(all.value.formulaVersion,'event_recommendation_v2');
  assert.deepEqual(home.value.items,all.value.items.slice(0,2));
  const social=all.value.items.find(row=>row.title==='Candidate 2')!;
  assert.deepEqual(social.reasons,[{code:'friends_participating',count:2,points:4},{code:'same_region',count:1,points:1}]);
  assert.equal(social.matchedInterests.length,0);
  const ordered=await f.read();assert.deepEqual(ordered,all);
});
test('selection update, inactive tag, ignore, source clearing and reread do not reuse prior private scores',async()=>{
  const f=fixture();const before=await f.read();assert.ok(before.ok);
  await f.patch('account_interests/owner',{interestTagIds:[],revision:2});
  const after=await f.read();assert.ok(after.ok);
  assert.equal(after.value.items[0]?.title,'Candidate 2');
  assert.ok(after.value.items.every(row=>row.matchedInterests.length===0));
  const eventId=sourceEventId(f.rows[1]!.browseId);
  await f.patch(`event_participations/${sha256(JSON.stringify(['owner',eventId]))}`,{accountId:'owner',eventId,ignored:true});
  const ignored=await f.read();assert.ok(ignored.ok&&!ignored.value.items.some(row=>row.eventId===eventId));
  f.invalidate();const cleared=await f.read();assert.ok(!cleared.ok&&cleared.failure.code==='SERVICE_UNAVAILABLE');
});
test('relationship removal, private participation and revoked consent remove social reasons; failure is not zero',async()=>{
  const f=fixture();
  await f.store.runTransaction(async tx=>{
    const path=`friend_pairs/${friendPairKey('owner','target_1')}`;
    const {listRefs:_,...rest}=f.store.read(path)!;tx.set(path,{...rest,friendship:false});
  });
  await f.patch('accounts/target_2',{fieldPrivacy:{interests:'public',location:'public',participation:'private',mapSharedWithFriends:false}});
  const value=await f.read();assert.ok(value.ok);
  assert.ok(value.value.items.every(row=>!row.reasons?.some(reason=>reason.code==='friends_participating')));
  await f.patch('accounts/target_2',{fieldPrivacy:{interests:'public',location:'public',participation:'friends_only',mapSharedWithFriends:false}});
  f.failSource();assert.ok(!(await f.read()).ok);
  await f.patch('accounts/owner',{optionalProcessingConsent:'rejected'});
  const denied=await f.read();assert.ok(denied.ok);assert.deepEqual(denied.value.items,[]);
});
test('new repository instance reads changed selection; no process recommendation history is required',async()=>{
  const f=fixture();await f.read();
  await f.patch('interest_tags/dance',{lifecycleState:'inactive',revision:2});
  const fresh=new FirestorePersonalizedEvents(f.store,firestoreSocialAuthority,{read:async()=>({interestedEventIds:[],goingEventIds:[]})},'music');
  const read=await fresh.read('owner',asOf,f.snapshot);assert.equal(read.kind,'ready');
  if(read.kind==='ready')assert.ok(read.sources.events.every(event=>event.scoring.interestTagIds.length===0));
});
test('Friend v2 uses only current public profile fields, with missing age neutral and no private region reason',async()=>{
  const f=fixture();
  for(const id of ['target_1','target_2'])await f.store.runTransaction(async tx=>{
    const path=`friend_pairs/${friendPairKey('owner',id)}`;
    const {listRefs:_,...rest}=f.store.read(path)!;tx.set(path,{...rest,friendship:false});
  });
  const repo=new FirestoreFriendRecommendations(f.store,clock,firestoreSocialAuthority,undefined,true);
  const all=await repo.recommend('owner','all');assert.ok(all.ok);
  assert.ok(all.value.suggestions.every(row=>row.reason.includes('Same shared region')&&row.reason.includes('Same shared school')));
  await f.patch('accounts/target_1',{fieldPrivacy:{interests:'public',location:'private',participation:'private',mapSharedWithFriends:false},
    profileDetails:{bio:null,region:'Singapore',affiliationType:null,affiliationName:null}});
  const reread=await repo.recommend('owner','all');assert.ok(reread.ok);
  const changed=reread.value.suggestions.find(row=>row.username==='member_target_1')!;
  assert.equal(changed.reason,'1 shared interest');
});
test('complete source traversal is atomic, deduplicated and unavailable on later-page failure',async()=>{
  let fail=false;
  const source=new ControlledSourceProjection({firstBatch:async()=>[item(1)],detail:async()=>undefined,
    batch:async(_asOf,page)=>{if(page===1&&fail)throw Error('Later failure');return page===0?{items:[item(1)],nextPage:1}:{items:[item(1),item(2)]};}});
  const snapshot=await source.recommendationSnapshot(asOf,new AbortController().signal);
  assert.equal(snapshot.items.length,2);assert.ok(snapshot.current());
  source.clear();fail=true;
  await assert.rejects(source.recommendationSnapshot(asOf,new AbortController().signal));
  assert.equal(snapshot.current(),false);assert.equal(source.ready(asOf),false);
});

test('explicit later-page replacement retires the complete ranking snapshot before a new recommendation read',async()=>{
  let title='Old title';
  const source=new ControlledSourceProjection({firstBatch:async()=>[item(1)],detail:async()=>undefined,
    batch:async(_asOf,page)=>page===0?{items:[item(1)],nextPage:1}:{items:[{...item(2),title}]}});
  const old=await source.recommendationSnapshot(asOf,new AbortController().signal);
  title='Current title';await source.batch!(asOf,1,new AbortController().signal);
  assert.equal(old.current(),false);
  const fresh=await source.recommendationSnapshot(asOf,new AbortController().signal);
  assert.equal(fresh.items[1]?.title,'Current title');assert.ok(fresh.current());
});

test('source retirement after the transaction callback still refuses its result',async()=>{
  const f=fixture();let checks=0;
  const result=await f.reader.read('owner',asOf,{items:f.rows,current:()=>++checks===1});
  assert.equal(result.kind,'dependency_unavailable');assert.equal(checks,2);
});

test('v2 internal factor receipts and Friend Home keep the selected formula',()=>{
  const ranked=rankEvents({formulaVersion:'event_recommendation_v2',asOf:0n,
    activeSelectedInterestTagIds:['dance'],events:[{eventId:'a',active:true,published:true,
      startInstant:1n,interestTagIds:['dance']}]});
  assert.deepEqual(ranked[0]?.factor,{factorCode:'interest_match_count',matchedCount:1,
    points:4,formulaVersion:'event_recommendation_v2'});
  const own={authorizedInterestTagIds:[],authorizedInterestedEventIds:[],authorizedGoingEventIds:[],authorizedRegion:'region'};
  const home=rankAuthorizedFriendHomeTop2(own,[{...own,candidateAccountId:'candidate'}],'v2');
  assert.equal(home[0]?.formulaVersion,'friend_recommendation_v2');assert.equal(home[0]?.score,1);
});

test('Friend read refuses a completed calculation when its prepared source retired',async()=>{
  const f=fixture();
  const events:FriendEventProjection={prepare:async()=>({current:()=>false}),
    read:async()=>({interestedEventIds:[],goingEventIds:[]})};
  const repo=new FirestoreFriendRecommendations(f.store,clock,firestoreSocialAuthority,events,true);
  const result=await repo.recommend('owner','all');
  assert.ok(!result.ok&&result.failure.code==='SERVICE_UNAVAILABLE');
});
