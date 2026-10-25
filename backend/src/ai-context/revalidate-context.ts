import type { ContextCheckpoint, ContextRevalidation, PreparedContext } from "./context-contract.js";
import { contextInstant, currentContextAuthority, validContextSourceRef } from "./project-context.js";

/** Run afresh before generation, after generation and at the actual delivery
 * boundary. This is an observation, never a reusable dispatch/write permit.
 * Effect owner still closes cancellation, deletion and authority races. */
export function revalidateContext(context: PreparedContext, checkpoint: ContextCheckpoint, now: string): ContextRevalidation {
  if (checkpoint.kind !== "read") return { kind: checkpoint.kind };
  const at = contextInstant(now);
  const preparedAt = contextInstant(context.model.asOf);
  if (at === undefined || preparedAt === undefined || at < preparedAt) return { kind: "unavailable" };
  if (!currentContextAuthority(checkpoint.authority, context.scope, now) ||
      checkpoint.authority.version !== context.authorityVersion ||
      context.categories.some(c => !checkpoint.authority.allowedCategories.includes(c))) return { kind: "denied" };
  if ([...context.model.facts.checkIns, ...context.model.facts.locationSnapshots].some(v =>
    (contextInstant(v.occurredAt) ?? Infinity) < at - 7 * 86_400_000) ||
    context.model.facts.eventIntents.some(v => (contextInstant(v.startAt) ?? -Infinity) <= at)) return { kind: "expired" };
  const seen = new Set<string>();
  let changed = false, expired = false;
  for (const expected of context.dependencies) {
    const id = JSON.stringify([expected.kind, expected.id]);
    if (seen.has(id)) return { kind: "unavailable" };
    seen.add(id);
    const found = checkpoint.sources.filter(s => s.kind === expected.kind && s.id === expected.id);
    if (found.length !== 1) return { kind: "unavailable" };
    const current = found[0]!;
    if (current.observedAt !== now || current.state === "unknown") return { kind: "unavailable" };
    if (current.state === "deleted" || current.state === "denied") return { kind: "denied" };
    if (current.state !== "available" && current.state !== "changed") return { kind: "unavailable" };
    if (!validContextSourceRef(current)) return { kind: "unavailable" };
    // Q19: a started request keeps its Persona snapshot across edits/active
    // switches; permanent deletion still denies above. Other source changes
    // cannot reuse generated text based on the old bytes.
    if ((current.version !== expected.version || current.state === "changed") && expected.kind !== "persona") changed = true;
    const originalExpiry = expected.validUntil === undefined ? undefined : contextInstant(expected.validUntil);
    const currentExpiry = current.validUntil === undefined ? undefined : contextInstant(current.validUntil);
    if ((expected.validUntil !== undefined && originalExpiry === undefined) ||
        (current.validUntil !== undefined && currentExpiry === undefined) ||
        (expected.kind === "event" && currentExpiry === undefined)) return { kind: "unavailable" };
    // Re-reading the same version cannot extend the prepared result's lifetime.
    if ((originalExpiry !== undefined && originalExpiry <= at) || (currentExpiry !== undefined && currentExpiry <= at)) expired = true;
  }
  if (expired) return { kind: "expired" };
  return { kind: changed ? "rebuild" : "valid" };
}
