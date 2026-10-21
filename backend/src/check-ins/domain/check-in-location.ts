import { coarsePosition, parsePosition, record, type Position } from "../../weather/domain/weather.js";
export interface CheckInLocationInput {
  readonly location?: Position | null;
  readonly weatherRequest?: {
    readonly position: Position;
    readonly expectedSettingsRevision: number;
  };
}
export function validCheckInLocation(input: CheckInLocationInput): boolean {
  if (input.location != null && !parsePosition(input.location)) return false;
  if (input.weatherRequest === undefined) return true;
  const request = record(input.weatherRequest);
  const position=request&&record(request.position);
  if (!request || Object.keys(request).length !== 2 ||
      !Number.isSafeInteger(request.expectedSettingsRevision) ||
      Number(request.expectedSettingsRevision) < 0 || !position || Object.keys(position).length!==2 ||
      typeof position.latitude!=="number"||typeof position.longitude!=="number"||
      !Number.isFinite(position.latitude)||!Number.isFinite(position.longitude)) return false;
  return true;
}
export function permittedWeatherGrid(input:CheckInLocationInput):Position|undefined {
  const grid=coarsePosition(input.weatherRequest?.position);
  if(!grid)return undefined;
  // Both values are explicitly supplied. Never infer Weather from a precise point.
  return input.location == null || (
    Math.abs(input.location.latitude - grid.latitude) <= .0500000001 &&
    Math.abs(input.location.longitude - grid.longitude) <= .0500000001)?grid:undefined;
}
