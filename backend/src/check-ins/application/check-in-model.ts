export interface CheckInProjection {
  readonly location?: import("../../weather/domain/weather.js").Position;
  readonly weather?: import("../../weather/domain/weather.js").WeatherProjection;
  readonly checkInId: string;
  readonly mood?: string;
  readonly locationLabel?: string;
  readonly activity?: string;
  readonly revision?: number;
  readonly note: string;
  readonly createdAt: string;
  readonly checkInVisibility?: "private" | "friends_only" | "public";
}
