import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {browseId,projectOccurrence,coverImageUrl} from '../src/event-browse/domain/browse-values.js';
import {TicketmasterBrowseSource} from '../src/event-browse/infrastructure/ticketmaster-browse-source.js';
import {EventBrowse} from '../src/event-browse/application/event-browse.js';
import {registerEventBrowseRoutes} from '../src/event-browse/transport/register-routes.js';
import {ok} from '../src/shared/domain/result.js';

const now='2026-10-25T00:00:00Z', locator=browseId('synthetic-core-detail')!;
const cover='https://s1.ticketm.net/dam/a/synthetic-cover.jpg';
const row=(extra:Record<string,unknown>={})=>({
  id:'synthetic-core-detail',name:'Synthetic event',url:'https://ticketmaster.sg/event/synthetic',
  dates:{start:{dateTime:'2026-11-01T10:00:00Z'},status:{code:'onsale'}},
  _embedded:{venues:[{name:'Synthetic venue',address:{line1:'1 Example Road'},country:{countryCode:'SG'}}]},
  ...extra,
});

test('description is the bounded occurrence info, with safe description fallback and no invented prose',()=>{
  assert.equal(projectOccurrence(row({info:'  A live\n music\tshow. ',description:'Other.'}),now)?.shortDescription,'A live music show.');
  assert.equal(projectOccurrence(row({info:'<p>unsafe</p>',description:'Actual plain description.'}),now)?.shortDescription,'Actual plain description.');
  for(const text of ['', '  ', '<script>unsafe</script>', '\ud800', 'unsafe\u202etext', '```code```', 'unsafe\u0000text']){
    const result=projectOccurrence(row({info:text}),now)!;
    assert.equal(Object.hasOwn(result,'shortDescription'),false);
    assert.equal(result.title,'Synthetic event');
  }
  assert.equal([...projectOccurrence(row({info:'🎵'.repeat(1001)}),now)!.shortDescription!].length,1000);
});

test('cover is only a real, bounded, non-fallback image from this occurrence',()=>{
  const image={url:cover,width:1024,height:576,fallback:false};
  assert.equal(projectOccurrence(row({images:[image]}),now)?.coverImageUrl,cover);
  for(const url of ['http://s1.ticketm.net/a.jpg','https://s1.ticketm.net.evil/a.jpg','https://user@s1.ticketm.net/a.jpg','https://s1.ticketm.net:444/a.jpg','https://s1.ticketm.net/a.jpg?token=x','https://s1.ticketm.net/a.jpg?','https://s1.ticketm.net/a.jpg#','https://s1.ticketm.net/']){
    assert.equal(coverImageUrl(url),false,url);
    assert.equal(projectOccurrence(row({images:[{...image,url}]}),now)?.coverImageUrl,undefined);
  }
  for(const images of [undefined,[{...image,fallback:true}],[{...image,width:10000}],[{...image,height:0}],{url:cover}]){
    assert.equal(projectOccurrence(row({images}),now)?.coverImageUrl,undefined);
  }
});

test('readable venue/address stays within its existing bound; no coordinates become labels',()=>{
  assert.equal(projectOccurrence(row(),now)?.locationLabel,'Synthetic venue, 1 Example Road');
  assert.equal(projectOccurrence(row({_embedded:{venues:[{name:'Actual venue',address:{line1:'x'.repeat(200)},country:{countryCode:'SG'}}]}}),now)?.locationLabel,'Actual venue');
  const value=projectOccurrence(row({_embedded:{venues:[{location:{latitude:'1',longitude:'103'},country:{countryCode:'SG'}}]}}),now)!;
  assert.equal(value.locationLabel,undefined);
});

test('actual source projection crosses detail HTTP serialization, while list strips detail-only content',async()=>{
  let reads=0;
  const source=new TicketmasterBrowseSource({enabled:()=>true,key:()=>'synthetic-only'},async input=>{
    reads++;
    const detail=new URL(String(input)).pathname.includes('/events/');
    const event=row({info:'Actual synthetic information.',images:[{url:cover,width:1024,height:576}]});
    return Response.json(detail?event:{page:{number:0,totalElements:1},_embedded:{events:[event]}});
  });
  const app=new EventBrowse({verify:async()=>ok(undefined)},source,()=>new Date(now),true);
  const server=Fastify({logger:false});
  const identity={verifyIdToken:async()=>({kind:'verified' as const,principal:{firebaseUid:'synthetic-owner'}})};
  await registerEventBrowseRoutes(server,identity,app);
  try{
    const headers={authorization:'Bearer synthetic'};
    const detail=await server.inject({method:'GET',url:`/v1/event-browse/${locator}`,headers});
    assert.equal(detail.statusCode,200);
    assert.equal(detail.headers['cache-control'],'no-store');
    assert.equal(detail.json().coverImageUrl,cover);
    assert.equal(detail.json().shortDescription,'Actual synthetic information.');
    assert.equal(detail.json().locationLabel,'Synthetic venue, 1 Example Road');
    assert.equal(detail.json().externalSourceUrl,'https://ticketmaster.sg/event/synthetic');
    const batch=await server.inject({method:'GET',url:'/v1/event-browse',headers});
    assert.equal(batch.statusCode,200);
    assert.equal(Object.hasOwn(batch.json().items[0],'coverImageUrl'),false);
    assert.equal(Object.hasOwn(batch.json().items[0],'shortDescription'),false);
    assert.equal(reads,2);
  }finally{await server.close();}
});
