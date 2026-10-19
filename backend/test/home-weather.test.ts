import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { HomeWeather } from "../src/weather/application/home-weather.js";
import { FirestoreWeatherPurposeAuthority } from "../src/weather/infrastructure/firestore-weather-purpose-authority.js";
import { registerHomeWeather } from "../src/weather/transport/home-weather-route.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { myFriendsSeed,clock,instant } from "./support/my-friends-fixture.js";
const snapshot={projectionVersion:"weather_projection_v1",source:"open_meteo",observedAt:instant,temperatureCelsius:20.1,condition:"clear"} as const;
test("Home purpose is transient and revalidates current settings after provider response",async()=>{
  const store=new InMemoryFirestoreGateway(myFriendsSeed(0)),authority=new FirestoreWeatherPurposeAuthority(store);let calls=0;
  const useCase=new HomeWeather(authority,{current:async point=>{calls++;assert.deepEqual(point,{latitude:1.4,longitude:103.8});return snapshot;}},clock);
  const before=store.entries(),result=await useCase.current({firebaseUid:"owner"},{position:{latitude:1.4,longitude:103.8},expectedSettingsRevision:0});
  assert.deepEqual(result,{ok:true,value:{weather:snapshot}});assert.equal(calls,1);assert.deepEqual(store.entries(),before);
  const race=new HomeWeather(authority,{current:async()=>{
    await store.runTransaction(async tx=>tx.set("accounts/owner",{...store.read("accounts/owner"),settingsRevision:1}));return snapshot;
  }},clock);
  const outcome=await race.current({firebaseUid:"owner"},{position:{latitude:1.4,longitude:103.8},expectedSettingsRevision:0});
  assert.equal(!outcome.ok&&outcome.failure.code,"SETTINGS_REVISION_PRECONDITION_FAILED");
});
test("Home rejects precise coordinates and stale settings before any optional provider call",async()=>{
  const store=new InMemoryFirestoreGateway(myFriendsSeed(0));let calls=0;
  const useCase=new HomeWeather(new FirestoreWeatherPurposeAuthority(store),{current:async()=>{calls++;return snapshot;}},clock);
  for(const input of [{position:{latitude:1.3521,longitude:103.8198},expectedSettingsRevision:0},
    {position:{latitude:1.4,longitude:103.8},expectedSettingsRevision:3}])assert.equal((await useCase.current({firebaseUid:"owner"},input)).ok,false);
  assert.equal(calls,0);
});
test("Home HTTP requires identity and purpose body; no coordinate in response or reusable cache",async t=>{
  const store=new InMemoryFirestoreGateway(myFriendsSeed(0)),app=Fastify({ajv:{customOptions:{removeAdditional:false}}});
  await registerHomeWeather(app,{verifyIdToken:async()=>({kind:"verified",principal:{firebaseUid:"owner"}})},
    new HomeWeather(new FirestoreWeatherPurposeAuthority(store),{current:async()=>snapshot},clock));t.after(()=>app.close());
  const payload={position:{latitude:1.4,longitude:103.8},expectedSettingsRevision:0};
  assert.equal((await app.inject({method:"POST",url:"/v1/me/home-weather",payload})).statusCode,401);
  const response=await app.inject({method:"POST",url:"/v1/me/home-weather",headers:{authorization:"Bearer fixture"},payload});
  assert.equal(response.statusCode,200);assert.equal(response.headers["cache-control"],"no-store");assert.deepEqual(response.json(),{weather:snapshot});
});
