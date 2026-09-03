import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export type NormalizedNote = string & {
  readonly __normalizedNote: unique symbol;
};

export function normalizeNote(
  input: string,
): Result<NormalizedNote, AppFailure> {
  const note = input.trim();
  const graphemeCount = [...segmenter.segment(note)].length;
  if (graphemeCount < 1 || graphemeCount > 500) {
    return err(appFailure("CHECKIN_INVALID"));
  }
  return ok(note as NormalizedNote);
}
