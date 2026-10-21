/** Q13 projections contain no coordinate, provider payload or account identity. */
export const weatherConditions = [
  "clear", "partly_cloudy", "overcast", "fog", "drizzle", "rain",
  "snow", "showers", "thunderstorm",
] as const;
export type WeatherCondition = typeof weatherConditions[number];
export interface Position { readonly latitude: number; readonly longitude: number }
export interface WeatherProjection {
  readonly projectionVersion: "weather_projection_v1";
  readonly source: "open_meteo";
  readonly observedAt: string;
  readonly temperatureCelsius: number;
  readonly condition: WeatherCondition;
}
export function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}
export function parsePosition(value: unknown): Position | undefined {
  const v = record(value);
  if (!v || Object.keys(v).length !== 2 ||
      typeof v.latitude !== "number" || !Number.isFinite(v.latitude) ||
      typeof v.longitude !== "number" || !Number.isFinite(v.longitude) ||
      Math.abs(v.latitude) > 90 || Math.abs(v.longitude) > 180) return undefined;
  return { latitude: v.latitude, longitude: v.longitude };
}
export function coarsePosition(value: unknown): Position | undefined {
  const v = parsePosition(value);
  if (!v || Math.abs(v.latitude * 10 - Math.round(v.latitude * 10)) > 1e-9 ||
      Math.abs(v.longitude * 10 - Math.round(v.longitude * 10)) > 1e-9) return undefined;
  return { latitude: Number(v.latitude.toFixed(1)), longitude: Number(v.longitude.toFixed(1)) };
}
/** Round the JSON decimal lexeme, not its binary floating-point approximation. */
export function decimalTenths(source: string): number | undefined {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(source);
  if (!match || source.length > 128) return undefined;
  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 128) return undefined;
  const digits = BigInt(match[2]! + (match[3] ?? ""));
  const scale = (match[3]?.length ?? 0) - exponent - 1;
  const divisor = 10n ** BigInt(Math.max(0, scale));
  const rounded = scale <= 0 ? digits * 10n ** BigInt(-scale)
    : digits / divisor + (digits % divisor * 2n >= divisor ? 1n : 0n);
  const tenths = Number(rounded) * (match[1] === "-" ? -1 : 1);
  return Number.isSafeInteger(tenths) ? (tenths === 0 ? 0 : tenths / 10) : undefined;
}
const mappings: readonly [readonly number[], WeatherCondition][] = [
  [[0], "clear"], [[1, 2], "partly_cloudy"], [[3], "overcast"], [[45, 48], "fog"],
  [[51, 53, 55, 56, 57], "drizzle"], [[61, 63, 65, 66, 67], "rain"],
  [[71, 73, 75, 77, 85, 86], "snow"], [[80, 81, 82], "showers"],
  [[95, 96, 99], "thunderstorm"],
];
class Decimal { constructor(readonly source: string, readonly value: number) {} }

export function parseCurrentWeather(raw: string, weatherAsOf: number): WeatherProjection | undefined {
  try {
    // Node24 JSON.parse context preserves the original numeric token for exact
    // half-away-from-zero normalization, including values adjacent to a half.
    const parse = JSON.parse as (text: string, reviver: (
      key: string, value: unknown, context: { source?: string },
    ) => unknown) => unknown;
    const data = record(parse(raw, (key, value, context) =>
      key === "temperature_2m" && typeof value === "number"
        ? new Decimal(context.source ?? "", value) : value));
    const current = record(data?.current), units = record(data?.current_units);
    if (!current || !units || units.time !== "unixtime" ||
        units.temperature_2m !== "°C" || units.weather_code !== "wmo code" ||
        data?.utc_offset_seconds !== 0 || !Number.isFinite(weatherAsOf)) return undefined;
    const temperature = current.temperature_2m, time = current.time, code = current.weather_code;
    if (!(temperature instanceof Decimal) || !Number.isFinite(temperature.value) ||
        temperature.value < -100 || temperature.value > 70 ||
        typeof time !== "number" || !Number.isSafeInteger(time) ||
        typeof code !== "number" || !Number.isInteger(code)) return undefined;
    const observed = time * 1000;
    if (observed < weatherAsOf - 30 * 60_000 || observed > weatherAsOf + 15 * 60_000) return undefined;
    const condition = mappings.find(([codes]) => codes.includes(code))?.[1];
    const temperatureCelsius = decimalTenths(temperature.source);
    if (!condition || temperatureCelsius === undefined) return undefined;
    return { projectionVersion: "weather_projection_v1", source: "open_meteo",
      observedAt: new Date(observed).toISOString(), temperatureCelsius, condition };
  } catch { return undefined; }
}
export function parseWeatherProjection(value: unknown): WeatherProjection | undefined {
  const v = record(value);
  if (!v || Object.keys(v).length !== 5 || v.projectionVersion !== "weather_projection_v1" ||
      v.source !== "open_meteo" || typeof v.observedAt !== "string" ||
      !Number.isFinite(Date.parse(v.observedAt)) || new Date(v.observedAt).toISOString() !== v.observedAt ||
      typeof v.temperatureCelsius !== "number" || !Number.isFinite(v.temperatureCelsius) ||
      v.temperatureCelsius < -100 || v.temperatureCelsius > 70 ||
      decimalTenths(String(v.temperatureCelsius)) !== v.temperatureCelsius ||
      !weatherConditions.includes(v.condition as WeatherCondition)) return undefined;
  return { projectionVersion: "weather_projection_v1", source: "open_meteo",
    observedAt: v.observedAt, temperatureCelsius: v.temperatureCelsius,
    condition: v.condition as WeatherCondition };
}
