import assert from "node:assert/strict";
import test from "node:test";
import { CreateCheckIn } from "../src/check-ins/application/create-check-in.js";
import { GetCheckIn } from "../src/check-ins/application/get-check-in.js";
import { EditCheckIn } from "../src/check-ins/application/edit-check-in.js";
import { FirestoreCheckInRepository } from "../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { FirestoreCheckInMutations } from "../src/check-ins/infrastructure/firestore-check-in-mutations.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { ok } from "../src/shared/domain/result.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import type { WeatherProvider } from "../src/weather/ports/weather-provider.js";
import type { WeatherProjection } from "../src/weather/domain/weather.js";
const instant="2026-10-20T00:00:00.000Z", principal={firebaseUid:"weather-user"};
const weather:WeatherProjection={projectionVersion:"weather_projection_v1",source:"open_meteo",
  observedAt:instant,temperatureCelsius:27.3,condition:"rain"};
const request={principal,note:"A walk",idempotencyKey:"WeatherCheckInKey_012345",
  location:{latitude:1.3521,longitude:103.8198},
  weatherRequest:{position:{latitude:1.4,longitude:103.8},expectedSettingsRevision:0}};
function fixture(provider:WeatherProvider={current:async()=>weather}) {
  const store=new InMemoryFirestoreGateway({
    [`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)}`]:{accountId:"weather-owner"},
    "accounts/weather-owner":{username:"weather_owner",optionalProcessingConsent:"rejected",
      checkInVisibility:"private",onboardingCompletedAt:instant},
  });
  const repo=new FirestoreCheckInRepository(store,provider,{now:()=>ok(new Date(instant))});
  const create=new CreateCheckIn(repo,{now:()=>ok(new Date(instant))},{generate:()=>ok("weather-moment")});
  return {store,create,read:new GetCheckIn(repo),edit:new EditCheckIn(new FirestoreCheckInMutations(store))};
}
test("explicit precise point and coarse weather save atomically and are read back unchanged",async()=>{
  let calls=0;
  const f=fixture({current:async(point)=>{calls++;assert.deepEqual(point,request.weatherRequest.position);return weather;}});
  const result=await f.create.execute(request);
  assert.equal(result.ok,true);
  if(!result.ok)return;
  assert.equal(result.value.notice,undefined);
  assert.deepEqual(result.value.checkIn.location,request.location);
  assert.deepEqual(result.value.checkIn.weather,weather);
  assert.deepEqual(await f.read.execute({principal,checkInId:"weather-moment"}),ok(result.value.checkIn));
  assert.equal(calls,1);
  assert.equal(f.store.entries().filter(([path])=>path.startsWith("idempotency/")).length,1);
  assert.equal(f.store.entries().some(([path])=>path.startsWith("weather_")),false);
});
test("same logical replay calls provider once; changed point with same key conflicts",async()=>{
  let calls=0;const f=fixture({current:async()=>{calls++;return weather;}});
  await f.create.execute(request);
  const replay=await f.create.execute(request);
  assert.equal(replay.ok&&replay.value.disposition,"replayed");
  const conflict=await f.create.execute({...request,location:{latitude:1.36,longitude:103.82}});
  assert.equal(!conflict.ok&&conflict.failure.code,"IDEMPOTENCY_CONFLICT");
  assert.equal(calls,1);
});
test("provider failure saves normally with transient notice; later reads contain no placeholder",async()=>{
  const f=fixture({current:async()=>{throw new Error("private dependency detail");}});
  const saved=await f.create.execute(request);
  assert.equal(saved.ok&&saved.value.notice,"Check-in saved without weather.");
  const reread=await f.read.execute({principal,checkInId:"weather-moment"});
  assert.equal(reread.ok,true);
  if(reread.ok)assert.equal(reread.value.weather,undefined);
  assert.equal(JSON.stringify(f.store.entries()).includes("private dependency detail"),false);
});
test("no Weather purpose means zero provider call and no fallback notice",async()=>{
  let calls=0;const f=fixture({current:async()=>{calls++;return weather;}});
  const {weatherRequest:_removed,...input}=request;
  const saved=await f.create.execute(input);
  assert.equal(saved.ok&&saved.value.notice,undefined);
  assert.equal(calls,0);
});
test("stale purpose/settings revision skips provider while allowing private Check-in",async()=>{
  let calls=0;const f=fixture({current:async()=>{calls++;return weather;}});
  await f.store.runTransaction(async tx=>tx.set("accounts/weather-owner",{...f.store.read("accounts/weather-owner"),settingsRevision:1}));
  const saved=await f.create.execute(request);
  assert.equal(saved.ok&&saved.value.notice,"Check-in saved without weather.");
  assert.equal(calls,0);
});
test("settings withdrawal while provider is in flight discards the candidate",async()=>{
  const f=fixture({current:async()=>{
    await f.store.runTransaction(async tx=>tx.set("accounts/weather-owner",{...f.store.read("accounts/weather-owner"),settingsRevision:1}));
    return weather;
  }});
  const saved=await f.create.execute(request);
  assert.equal(saved.ok&&saved.value.notice,"Check-in saved without weather.");
  assert.equal(f.store.read("check_ins/weather-moment")?.weather,undefined);
});
test("edits retain frozen weather; changing/removing location clears it without a new call",async()=>{
  for(const location of [null,{latitude:1.35,longitude:103.81}]) {
    let calls=0;const f=fixture({current:async()=>{calls++;return weather;}});
    await f.create.execute(request);
    const identity={principal,checkInId:"weather-moment",expectedRevision:1,note:"New note",checkInVisibility:"private"};
    const edit=await f.edit.update(identity);
    assert.equal(edit.ok,true);
    if(edit.ok)assert.deepEqual(edit.value.weather,weather);
    const changed=await f.edit.update({...identity,expectedRevision:2,location});
    assert.equal(changed.ok,true);
    if(changed.ok)assert.equal(changed.value.weather,undefined);
    assert.equal(calls,1);
  }
});
test("explicit weather withdrawal preserves permitted point; deletion removes the snapshot with its record",async()=>{
  const f=fixture();await f.create.execute(request);
  const edit=await f.edit.update({principal,checkInId:"weather-moment",expectedRevision:1,note:"A walk",
    checkInVisibility:"private",removeWeather:true});
  assert.equal(edit.ok,true);
  if(edit.ok){assert.equal(edit.value.weather,undefined);assert.deepEqual(edit.value.location,request.location);}
  assert.equal((await f.edit.remove({principal,checkInId:"weather-moment",expectedRevision:2})).ok,true);
  assert.equal(f.store.read("check_ins/weather-moment"),undefined);
});
test("invalid/precise or unrelated Weather grid skips provider but still saves the valid Check-in",async()=>{
  let calls=0;
  for(const position of [request.location,{latitude:50,longitude:20},{latitude:91,longitude:0}]) {
    const f=fixture({current:async()=>{calls++;return weather;}});
    const outcome=await f.create.execute({...request,weatherRequest:{...request.weatherRequest,position}});
    assert.equal(outcome.ok,true);
    assert.equal(outcome.ok&&outcome.value.notice,"Check-in saved without weather.");
    assert.equal(f.store.read("check_ins/weather-moment")?.weather,undefined);
    assert.deepEqual(f.store.read("check_ins/weather-moment")?.location,request.location);
  }
  assert.equal(calls,0);
});
