export interface CheckInProjection {
  readonly checkInId: string;
  readonly mood?: string;
  readonly activity?: string;
  readonly revision?: number;
  readonly note: string;
  readonly createdAt: string;
  readonly checkInVisibility?: "private" | "friends_only" | "public";
}
