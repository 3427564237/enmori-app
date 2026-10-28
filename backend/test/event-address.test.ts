import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { projectVenueAddress } from '../src/event-detail/domain/venue-address.js';
import { projectOccurrence } from '../src/event-browse/domain/browse-values.js';
import { registerIsolatedSlices } from '../src/transport/register-isolated-slices.js';
import { GetEventDetail } from '../src/event-detail/application/get-event-detail.js';
import { ok } from '../src/shared/domain/result.js';
import { sendFailureCode } from '../src/transport/error-response.js';

const venue = {name: 'Synthetic venue', address: {line1: '1 Example Road'}, city: {name: 'Singapore'}, postalCode: '123456', country: {countryCode: 'SG'}};
const address = {street: '1 Example Road', city: 'Singapore', postalCode: '123456', countryCode: 'SG'};
test('complete address requires exactly one source venue with every component, without fallback', () => {
  assert.deepEqual(projectVenueAddress([venue]), address);
  assert.equal(projectVenueAddress([venue, venue]), undefined);
  for (const extra of [{address: {}}, {city: {}}, {postalCode: '12345'}, {postalCode: '123456\n'}, {country: {countryCode: 'MY'}}, {address: {line1:'<tag>'}}, {address:{line1:'\ud800'}}, {address:{line1:'1 Road',line2:''}}, {city:{name:'\u202ebad'}}]) {
    assert.equal(projectVenueAddress([{...venue, ...extra}]), undefined);
  }
  assert.deepEqual(projectVenueAddress([{...venue, address:{...venue.address,line2:'Level 2'}}]), {...address,street2:'Level 2'});
});
test('address is projected from occurrence, missing address does not remove valid Event', () => {
  const raw = {id:'address-test',name:'Synthetic event',url:'https://ticketmaster.sg/event/synthetic',
    dates:{start:{dateTime:'2026-11-01T10:00:00Z'},status:{code:'onsale'}},_embedded:{venues:[venue]}};
  assert.deepEqual(projectOccurrence(raw,'2026-10-27T00:00:00Z')?.venueAddress,address);
  assert.equal(projectOccurrence({...raw,_embedded:{venues:[{...venue,postalCode:null}]}},'2026-10-27T00:00:00Z')?.venueAddress,undefined);
  assert.equal(projectOccurrence({...raw,_embedded:{venues:[{...venue,postalCode:null}]}},'2026-10-27T00:00:00Z')?.title,'Synthetic event');
});
test('combined provider projection preserves address, interest classification and region without leaking metadata', async () => {
  const raw = {id:'combined-projection', name:'Synthetic Dance', url:'https://ticketmaster.sg/event/synthetic',
    classifications:[{genre:{id:'dance',name:'Dance'}}],
    dates:{start:{dateTime:'2026-11-01T10:00:00Z'},status:{code:'onsale'}},_embedded:{venues:[venue]}};
  const projected = projectOccurrence(raw,'2026-10-27T00:00:00Z')!;
  assert.deepEqual(projected.venueAddress,address);
  assert.deepEqual(projected.interestConcepts,['Dance']);
  assert.deepEqual(projected.regionNames,['Singapore']);
  const server=Fastify({logger:false});
  const identity={verifyIdToken:async()=>({kind:'verified' as const,principal:{firebaseUid:'synthetic'}})};
  await registerIsolatedSlices(server,identity,undefined,new GetEventDetail({read:async()=>ok({...projected,eventId:'event'})}));
  try {
    const response=await server.inject({url:'/v1/events/event?includeVenueAddress=true',headers:{authorization:'Bearer synthetic'}});
    assert.equal(response.statusCode,200);
    assert.deepEqual(response.json().event.venueAddress,address);
    for(const field of ['interestConcepts','regionNames','musicSegment','browseId'])assert.equal(Object.hasOwn(response.json().event,field),false);
  } finally {await server.close();}
});
test('detail address is opt-in, legacy is unchanged, duplicate/unknown inputs and anonymous are rejected', async () => {
  const server=Fastify({logger:false,ajv:{customOptions:{removeAdditional:false}}});
  server.setErrorHandler((_, request, reply) => sendFailureCode(request, reply, 'REQUEST_INVALID'));
  const detail={eventId:'event', title:'Synthetic event',startAt:'2026-11-01T10:00:00Z',externalSourceUrl:'https://ticketmaster.sg/event/synthetic',venueAddress:projectVenueAddress([venue])!};
  const identity={verifyIdToken:async()=>({kind:'verified' as const,principal:{firebaseUid:'synthetic'}})};
  await registerIsolatedSlices(server,identity,undefined,new GetEventDetail({read:async()=>ok(detail)}));
  try {
    const headers={authorization:'Bearer synthetic'};
    const legacy=await server.inject({url:'/v1/events/event',headers});
    assert.equal(legacy.statusCode,200);
    assert.equal(Object.hasOwn(legacy.json().event,'venueAddress'),false);
    const extended=await server.inject({url:'/v1/events/event?includeVenueAddress=true',headers});
    assert.equal(extended.statusCode,200);
    assert.deepEqual(extended.json().event.venueAddress,address);
    assert.equal(extended.headers['cache-control'],'no-store');
    const {venueAddress:_,...expected}=detail;
    assert.deepEqual(legacy.json().event,expected);
    for(const query of ['includeVenueAddress=false','includeVenueAddress=true&includeVenueAddress=true','unknown=true']) {
      assert.equal((await server.inject({url:`/v1/events/event?${query}`,headers})).statusCode,400);
    }
    assert.equal((await server.inject({url:'/v1/events/event?includeVenueAddress=true'})).statusCode,401);
  } finally {await server.close();}
});
