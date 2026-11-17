import type { EventSourceCoverage } from "../ports/event-browse.js";

/** Coverage is public acquisition metadata, never an eligibility explanation.
 * A missing/empty projection stays unknown; only an available onePA result may
 * carry known coverage. Copy before publication so callers cannot mutate it. */
export function freezeSourceCoverage(
  value: unknown,
  sourceStatus: readonly {readonly provider: string; readonly available: boolean}[] | undefined,
): readonly EventSourceCoverage[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 1) throw Error('Invalid source coverage');
  if (value.length === 0) return undefined;
  const row = value[0];
  if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== 2 ||
      row.provider !== 'onepa' || typeof row.complete !== 'boolean' ||
      !sourceStatus?.some(status => status.provider === 'onepa' && status.available === true)) {
    throw Error('Invalid source coverage');
  }
  return Object.freeze([Object.freeze({provider: 'onepa' as const, complete: row.complete as boolean})]);
}
