import type { Position, WeatherProjection } from "../domain/weather.js";
/** Input is per-operation purpose-authorized, never inferred from profile/history. */
export interface WeatherProvider {
  current(position: Position, weatherAsOf: number): Promise<WeatherProjection | undefined>;
}
