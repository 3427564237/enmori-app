import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const outerUnicodeWhitespace = /^\p{White_Space}+|\p{White_Space}+$/gu;

export type NormalizedNote = string & {
  readonly __normalizedNote: unique symbol;
};

export function normalizeNote(
  input: string,
): Result<NormalizedNote, AppFailure> {
  const note = input.replace(outerUnicodeWhitespace, "");
  const graphemeCount = [...segmenter.segment(note)].length;
  if (graphemeCount < 1 || graphemeCount > 500) {
    return err(appFailure("CHECKIN_INVALID"));
  }
  return ok(note as NormalizedNote);
}
