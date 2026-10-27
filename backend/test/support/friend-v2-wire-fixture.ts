import Fastify from 'fastify';
import { FirestoreFriendRecommendations } from '../../src/friend-recommendations/infrastructure/firestore-friend-recommendations.js';
import { registerFriendRecommendations } from '../../src/friend-recommendations/transport/friend-recommendation-route.js';
import { firestoreSocialAuthority } from '../../src/friends/infrastructure/social-authority.js';
import { friendPairKey } from '../../src/friends/infrastructure/firestore-friend-repository.js';
import { InMemoryFirestoreGateway } from './in-memory-firestore-gateway.js';
import { myFriendsSeed,clock } from './my-friends-fixture.js';

export const friendWireCases=['region','affiliation','both','interest','mixed'] as const;
export async function friendWireResponse(kind:typeof friendWireCases[number],view:'home'|'all'){
  const seed=myFriendsSeed(2);
  for(const id of ['owner','target_1','target_2']){
    const self=id==='owner',candidate=id==='target_1';
    const region=self||(candidate&&['region','both','mixed'].includes(kind));
    const affiliation=self||(candidate&&['affiliation','both'].includes(kind));
    const interest=self||(candidate?kind==='interest':kind==='mixed');
    seed['accounts/'+id]={...seed['accounts/'+id],optionalProcessingConsent:'accepted',
      profileVisibility:'public',fieldPrivacy:{interests:'public',location:'public',participation:'private',mapSharedWithFriends:false},
      profileDetails:{bio:null,region:region?'Singapore':null,affiliationType:affiliation?'school':null,affiliationName:affiliation?'Synthetic School':null}};
    seed['account_interests/'+id]={interestTagIds:interest?['music']:[],revision:1};
    if(!self)delete seed['friend_pairs/'+friendPairKey('owner',id)];
  }
  seed['interest_tags/music']={displayName:'Music',lifecycleState:'active',revision:1};
  const repository=new FirestoreFriendRecommendations(new InMemoryFirestoreGateway(seed),clock,firestoreSocialAuthority,undefined,true);
  const app=Fastify({logger:false,ajv:{customOptions:{removeAdditional:false}}});
  await registerFriendRecommendations(app,{verifyIdToken:async token=>token==='synthetic-owner'?
    {kind:'verified',principal:{firebaseUid:'owner'}}:{kind:'invalid'}},repository);
  try{
    const response=await app.inject({url:'/v1/recommendations/friends?view='+view,headers:{authorization:'Bearer synthetic-owner'}});
    return {status:response.statusCode,cacheControl:response.headers['cache-control'],body:response.json() as unknown};
  }finally{await app.close();}
}
