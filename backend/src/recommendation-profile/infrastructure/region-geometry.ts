import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
// Works from both source and compiled dist trees; the asset ships with runtime.
const root = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(root, "../../../../assets/regions/sg-planning-areas-2025.json"),
  resolve(root, "../../../../../assets/regions/sg-planning-areas-2025.json"),
];
let rows:
  | readonly {
      code: string;
      geometry: { type: string; coordinates: unknown };
    }[]
  | undefined;
function inside(x: number, y: number, ring: number[][]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (
      a[1]! > y !== b[1]! > y &&
      x < ((b[0]! - a[0]!) * (y - a[1]!)) / (b[1]! - a[1]!) + a[0]!
    )
      hit = !hit;
  }
  return hit;
}
export function locateArea(
  latitude: number,
  longitude: number,
): string | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
    return undefined;
  if (!rows) {
    for (const path of candidates) {
      try {
        rows = JSON.parse(readFileSync(path, "utf8")).areas;
        break;
      } catch {}
    }
    if (!rows) throw Error("Region catalogue unavailable");
  }
  const matches = [];
  for (const row of rows) {
    const polygons = (
      row.geometry.type === "Polygon"
        ? [row.geometry.coordinates]
        : row.geometry.coordinates
    ) as number[][][][];
    if (
      polygons.some(
        (rings) =>
          rings.length &&
          inside(longitude, latitude, rings[0]!) &&
          !rings.slice(1).some((r) => inside(longitude, latitude, r)),
      )
    )
      matches.push(row.code);
  }
  return matches.length === 1 ? matches[0] : undefined;
}
