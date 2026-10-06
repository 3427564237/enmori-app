export interface CheckInProjection {
  readonly checkInId: string;
  readonly note: string;
  readonly createdAt: string;
  readonly checkInVisibility?: "private" | "friends_only" | "public";
}
