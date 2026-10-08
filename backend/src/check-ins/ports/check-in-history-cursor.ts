import type { HistoryCursor } from "./check-in-history-repository.js";

export interface CheckInHistoryCursorCodec {
  decode(token: string, now: Date): HistoryCursor | undefined;
  encode(cursor: HistoryCursor): string;
}
