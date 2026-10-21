import assert from "node:assert/strict";
import test from "node:test";
import { coarsePosition, decimalTenths, parseCurrentWeather, parseWeatherProjection } from "../src/weather/domain/weather.js";
import { OpenMeteoWeatherProvider } from "../src/weather/infrastructure/open-meteo-weather-provider.js";

const now = Date.parse("2026-10-20T00:00:00.000Z");
const response = (temperature = "22.25", seconds = now / 1000, code = 2) =>
  '{"utc_offset_seconds":0,"current_units":{"time":"unixtime","temperature_2m":"°C","weather_code":"wmo code"},' +
  `"current":{"time":${seconds},"temperature_2m":${temperature},"weather_code":${code}}}`;
test("Q13 decimal rounding uses the provider token including adjacent half values", () => {
  for (const [input, expected] of [
    ["1.05", 1.1], ["-1.05", -1.1], ["1.049999999999999999999", 1],
    ["-1.049999999999999999999", -1], ["2.25e1", 22.5], ["-0.05", -.1], ["0.049", 0],
  ] as const) {
    assert.equal(decimalTenths(input), expected);
    assert.equal(parseCurrentWeather(response(input), now)?.temperatureCelsius, expected);
  }
});
test("Q13 rejects precise/out-of-range coordinates rather than leaking or inferring them", () => {
  for (const input of [
    {latitude:1.3521,longitude:103.8198}, {latitude:91,longitude:1},
    {latitude:1,longitude:181}, {latitude:NaN,longitude:1}, {latitude:1,longitude:1,uid:"private"},
  ]) assert.equal(coarsePosition(input), undefined);
  assert.deepEqual(coarsePosition({latitude:1.3,longitude:103.8}), {latitude:1.3,longitude:103.8});
});
test("Q13 accepts exact freshness bounds and rejects one second beyond", () => {
  assert.ok(parseCurrentWeather(response("22", now/1000-1800), now));
  assert.ok(parseCurrentWeather(response("22", now/1000+900), now));
  assert.equal(parseCurrentWeather(response("22", now/1000-1801), now), undefined);
  assert.equal(parseCurrentWeather(response("22", now/1000+901), now), undefined);
});
test("all approved WMO mappings and no unknown code are accepted", () => {
  const groups = [[0],[1,2],[3],[45,48],[51,53,55,56,57],[61,63,65,66,67],
    [71,73,75,77,85,86],[80,81,82],[95,96,99]];
  const names = ["clear","partly_cloudy","overcast","fog","drizzle","rain","snow","showers","thunderstorm"];
  groups.forEach((codes,i) => codes.forEach(code => assert.equal(parseCurrentWeather(response("0", now/1000, code), now)?.condition,names[i])));
  for (const code of [-1,4,50,94,100,1.5]) assert.equal(parseCurrentWeather(response("0", now/1000, code),now),undefined);
});
test("units, types, range, timestamp, malformed and array responses fail as a whole", () => {
  const valid = response();
  for (const bad of [
    valid.replace("°C","°F"), valid.replace("wmo code","number"), valid.replace("unixtime","iso8601"),
    valid.replace('"utc_offset_seconds":0','"utc_offset_seconds":28800'),
    response("null"), response('"22"'), response("71"), response("-100.1"), response("1e999"),
    response("22",NaN), "{}", "[{}]", "{",
  ]) assert.equal(parseCurrentWeather(bad,now),undefined);
  assert.ok(parseCurrentWeather(response("-100"),now));
  assert.ok(parseCurrentWeather(response("70"),now));
});
test("persisted projection rejects extras and preserves only frozen normalized values", () => {
  const projection = parseCurrentWeather(response(),now)!;
  assert.deepEqual(parseWeatherProjection(projection),projection);
  assert.equal(parseWeatherProjection({...projection,latitude:1.3}),undefined);
  assert.equal(parseWeatherProjection({...projection,temperatureCelsius:22.25}),undefined);
  assert.equal(parseWeatherProjection({...projection,observedAt:"not-a-date"}),undefined);
});
test("provider sends only the coarse grid/minimum parameters, no identity or redirects", async () => {
  let count=0;
  const request: typeof fetch = async (url, options) => {
    count++;
    const u = new URL(String(url));
    assert.equal(u.origin,"https://api.open-meteo.com");
    assert.deepEqual(Object.fromEntries(u.searchParams),{
      latitude:"1.3",longitude:"103.8",current:"temperature_2m,weather_code",
      temperature_unit:"celsius",timeformat:"unixtime",
    });
    assert.equal(options?.redirect,"error");
    assert.deepEqual(options?.headers,{Accept:"application/json"});
    return new Response(response());
  };
  const adapter = new OpenMeteoWeatherProvider(()=>true,request);
  assert.equal((await adapter.current({latitude:1.3,longitude:103.8},now))?.condition,"partly_cloudy");
  assert.equal(count,1);
});
test("disabled, invalid grid and backwards monotonic time cause zero provider attempts",async()=>{
  let count=0, instant=10;
  const request:typeof fetch=async()=>{count++;return new Response(response());};
  const disabled=new OpenMeteoWeatherProvider(()=>false,request);
  assert.equal(await disabled.current({latitude:1.3,longitude:103.8},now),undefined);
  const active=new OpenMeteoWeatherProvider(()=>true,request,()=>instant);
  assert.equal(await active.current({latitude:1.345,longitude:103.8},now),undefined);
  await active.current({latitude:1.3,longitude:103.8},now);
  instant=9;
  assert.equal(await active.current({latitude:1.3,longitude:103.8},now),undefined);
  assert.equal(count,1);
});
test("provider failure, malformed and oversized response never produce a projection or retry",async()=>{
  for(const request of [
    async()=>{throw new Error("private provider detail");},
    async()=>new Response("not-json"),
    async()=>new Response(response(),{status:429}),
    async()=>new Response(" ".repeat(16_385)),
  ] as (typeof fetch)[]) {
    let count=0;
    const adapter=new OpenMeteoWeatherProvider(()=>true,async(...args)=>{count++;return request(...args);});
    assert.equal(await adapter.current({latitude:1.3,longitude:103.8},now),undefined);
    assert.equal(count,1);
  }
});
test("one monotonic budget includes reading/parsing; a late success is discarded",async()=>{
  let instant=0;
  const adapter=new OpenMeteoWeatherProvider(()=>true,async()=>{instant=2000;return new Response(response());},()=>instant);
  assert.equal(await adapter.current({latitude:1.3,longitude:103.8},now),undefined);
});
test("physical two-second deadline returns even when transport ignores cancellation",async()=>{
  let signal:AbortSignal|null|undefined;
  const adapter=new OpenMeteoWeatherProvider(()=>true,async(_url,options)=>{
    signal=options?.signal;
    return new Promise<Response>(()=>{});
  });
  const began=performance.now();
  assert.equal(await adapter.current({latitude:1.3,longitude:103.8},now),undefined);
  assert.equal(signal?.aborted,true);
  assert.ok(performance.now()-began<3000);
});
