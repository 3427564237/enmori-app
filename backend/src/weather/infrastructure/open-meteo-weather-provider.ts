import { coarsePosition, parseCurrentWeather, type Position, type WeatherProjection } from "../domain/weather.js";
import type { WeatherProvider } from "../ports/weather-provider.js";

export class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly attempts: number[] = [];
  private last = -Infinity;
  public constructor(
    private readonly permitted: () => boolean,
    private readonly request: typeof fetch = fetch,
    private readonly monotonic: () => number = () => performance.now(),
  ) {}
  public async current(position: Position, weatherAsOf: number): Promise<WeatherProjection | undefined> {
    try { return await this.lookup(position,weatherAsOf); } catch { return undefined; }
  }
  private async lookup(position: Position, weatherAsOf: number): Promise<WeatherProjection | undefined> {
    const grid = coarsePosition(position), start = this.monotonic();
    if (!grid || !Number.isFinite(weatherAsOf) || !Number.isFinite(start) || start < this.last) return undefined;
    this.last = start;
    // One adapter instance per controlled Backend. No identity/coordinate cache.
    // Conservative rolling limits stay below the Free API published ceilings.
    while (this.attempts.length && this.attempts[0]! <= start - 31*86_400_000) this.attempts.shift();
    if (!this.permitted() || this.attempts.length >= 299999 ||
        this.attempts.filter(t => t > start - 86_400_000).length >= 9999 ||
        this.attempts.filter(t => t > start - 3_600_000).length >= 4999 ||
        this.attempts.filter(t => t > start - 60_000).length >= 599) return undefined;
    this.attempts.push(start);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const remaining = () => {
      const elapsed = this.monotonic() - start;
      return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2000;
    };
    const work = async (): Promise<WeatherProjection | undefined> => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({
          latitude: grid.latitude.toFixed(1), longitude: grid.longitude.toFixed(1),
          current: "temperature_2m,weather_code", temperature_unit: "celsius", timeformat: "unixtime",
        }).toString();
        const response = await this.request(url, {
          signal: controller.signal, redirect: "error", cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok || !response.body || !remaining() || controller.signal.aborted) {
          await response.body?.cancel().catch(() => {});
          return undefined;
        }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const next = await reader.read();
            if (!remaining() || controller.signal.aborted) return undefined;
            if (next.done) break;
            size += next.value.byteLength;
            if (size > 16_384) return undefined;
            chunks.push(next.value);
          }
          const raw = Buffer.concat(chunks).toString("utf8");
          const candidate = parseCurrentWeather(raw, weatherAsOf);
          return remaining() && !controller.signal.aborted ? candidate : undefined;
        } finally {
          // Best effort only; a broken remote cancellation cannot extend budget.
          void reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      } catch { return undefined; }
    };
    try {
      return await Promise.race([work(), new Promise<undefined>(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve(undefined); }, 2000);
      })]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      controller.abort();
    }
  }
}
