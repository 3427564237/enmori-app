import type { ContactRecord, OccurrenceState } from "./policy.js";

export type OccurrenceAction = "reserve" | "prepare" | "begin_dispatch" | "provider_accept" |
  "outcome_unknown" | "cancel" | "expire" | "generation_failed" | "recover" | "reconcile_accepted";

export type Transition =
  | { readonly kind: "changed"; readonly record: ContactRecord }
  | { readonly kind: "unchanged"; readonly record: ContactRecord };

/** A pure transition proposal. The host must atomically compare the old state,
 * current source/consent versions and owner frequency budget before persisting.
 * Restoring a dispatching occurrence always requires reconciliation, never retry.
 * This does not persist a record, send a push or prove real restart safety. */
export function advanceOccurrence(record: ContactRecord, action: OccurrenceAction, nowMs: number): Transition {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs > 8.64e15 || !record.occurrenceId.trim()) return { kind: "unchanged", record };
  let state: OccurrenceState | undefined;
  switch (action) {
    case "reserve": if (record.state === "queued") state = "reserved"; break;
    case "prepare": if (record.state === "reserved") state = "prepared"; break;
    case "begin_dispatch": if (record.state === "prepared") state = "dispatching"; break;
    case "provider_accept": if (record.state === "dispatching") state = "accepted"; break;
    case "outcome_unknown": if (record.state === "dispatching") state = "unknown"; break;
    case "generation_failed": if (record.state === "reserved") state = "failed"; break;
    case "reconcile_accepted": if (record.state === "unknown") state = "accepted"; break;
    case "recover":
      // Unpublished model output is transient, not a separately retained copy.
      // After interruption do not regenerate it. External send may already exist.
      if (record.state === "dispatching") state = "unknown";
      else if (record.state === "reserved" || record.state === "prepared") state = "failed";
      break;
    case "cancel":
    case "expire":
      if (["queued", "reserved", "prepared"].includes(record.state)) state = action === "cancel" ? "cancelled" : "expired";
      else if (record.state === "dispatching") state = "unknown";
      break;
  }
  if (state === undefined || state === record.state) return { kind: "unchanged", record };
  const next: ContactRecord = action === "begin_dispatch" ? { ...record, state, attemptedAtMs: nowMs } : { ...record, state };
  return { kind: "changed", record: next };
}
