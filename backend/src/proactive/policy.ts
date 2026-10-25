/** Isolated proposal, deliberately absent from the application composition root.
 * All inputs come from trusted server reads, never model output or client claims.
 * These are internal candidate types, not approved API or storage contracts.
 */
export type ProactiveCategory = "explicit_follow_up" | "going_event" | "check_in_follow_up";
export type ProcessingLocation = "local" | "cloud";
export type SourceKind = "message" | "history_pair" | "check_in" | "event" | "participation" | "persona";

export interface SourceRef {
  readonly kind: SourceKind;
  readonly id: string;
  readonly revision: string;
}

export interface ProactiveCandidate {
  readonly occurrenceId: string;
  readonly ownerKey: string;
  readonly sessionKey: string;
  readonly topicId: string;
  readonly category: ProactiveCategory;
  readonly processing: ProcessingLocation;
  readonly dueAtMs: number;
  readonly expiresAtMs: number;
  readonly sources: readonly SourceRef[];
}

export type ContactMode =
  | { readonly kind: "off" }
  | { readonly kind: "on" }
  | { readonly kind: "paused"; readonly untilMs?: number };

export interface ContactSettings {
  readonly mode: ContactMode;
  readonly categories: readonly ProactiveCategory[];
  readonly timeZone: string;
  readonly quiet: { readonly kind: "disabled" } | {
    readonly kind: "daily";
    readonly startMinute: number;
    readonly endMinute: number;
  };
}

export interface CurrentSource {
  readonly kind: SourceKind;
  readonly id: string;
  readonly revision: string;
  readonly state: "available" | "deleted" | "denied" | "unknown";
  readonly observedAtMs: number;
  readonly validUntilMs?: number;
  readonly allowedProcessing: readonly ProcessingLocation[];
}

export type TriggerFacts =
  | { readonly category: "explicit_follow_up"; readonly confirmed: boolean }
  | { readonly category: "going_event"; readonly participation: "none" | "interested" | "going";
      readonly eventState: "active" | "cancelled" | "unavailable"; readonly startsAtMs: number }
  | { readonly category: "check_in_follow_up"; readonly optedIn: boolean; readonly recordedAtMs: number };

export interface CurrentAuthority {
  readonly status: "current";
  readonly occurrenceId: string;
  readonly ownerKey: string;
  readonly sessionKey: string;
  readonly topicId: string;
  /** Changes for current intent, session, settings, purpose/consent or topic authority changes.
   * Source revisions are also checked individually. No generated content here. */
  readonly authorityVersion: string;
  readonly observedAtMs: number;
  readonly accountAllowed: boolean;
  readonly topicAllowed: boolean;
  readonly intentActive: boolean;
  readonly allowedProcessing: readonly ProcessingLocation[];
  readonly settings: ContactSettings;
  readonly sources: readonly CurrentSource[];
  readonly trigger: TriggerFacts;
}

export type AuthorityRead = CurrentAuthority | { readonly status: "unknown" };
export type OccurrenceState = "queued" | "reserved" | "prepared" | "dispatching" |
  "accepted" | "unknown" | "cancelled" | "expired" | "failed";

export interface ContactRecord {
  readonly occurrenceId: string;
  readonly state: OccurrenceState;
  /** Dispatch authorization time, not provider/device ACK or message read time. */
  readonly attemptedAtMs?: number;
}

export type ContactLedger = { readonly status: "unknown" } | {
  readonly status: "current";
  readonly ownerKey: string;
  /** A complete owner-scoped window plus all unfinished occurrences. */
  readonly records: readonly ContactRecord[];
};

export interface GenerationProof {
  readonly occurrenceId: string;
  readonly authorityVersion: string;
  readonly candidate: ProactiveCandidate;
}

export interface ProposedLimits {
  readonly rollingWindowMs: number;
  readonly maximumInWindow: number;
  readonly cooldownMs: number;
  readonly maximumSnapshotAgeMs: number;
}

export type PolicyReason = "invalid_input" | "authority_unknown" | "authority_stale" |
  "binding_mismatch" | "not_authorized" | "cancelled" | "off" | "category_off" |
  "paused" | "processing_not_allowed" | "source_unavailable" | "source_changed" |
  "trigger_invalid" | "not_due" | "expired" | "invalid_time_zone" | "quiet" |
  "ledger_unknown" | "duplicate" | "outcome_unknown" | "in_flight" |
  "not_prepared" | "generation_stale" | "cooldown" | "frequency";

export type PolicyDecision =
  | { readonly kind: "allow"; readonly proof: GenerationProof }
  | { readonly kind: "suppress"; readonly reason: PolicyReason }
  | { readonly kind: "hold"; readonly reason: PolicyReason; readonly recheckAtMs?: number };

/** Proposal for Context -> Proactive revalidation. Implementations must read
 * current sources and purpose grants on BOTH calls. A cached generation proof
 * cannot authorize persistence, dispatch or later content reads. No adapter yet. */
export interface ProposedProactiveRevalidation {
  readCurrent(candidate: ProactiveCandidate, phase: "generation" | "delivery"): Promise<AuthorityRead>;
}

const suppress = (reason: PolicyReason): PolicyDecision => ({ kind: "suppress", reason });
const hold = (reason: PolicyReason, recheckAtMs?: number): PolicyDecision =>
  recheckAtMs === undefined ? { kind: "hold", reason } : { kind: "hold", reason, recheckAtMs };
const timestamp = (n: number): boolean => Number.isSafeInteger(n) && n >= 0 && n <= 8.64e15;
const minute = (n: number): boolean => Number.isInteger(n) && n >= 0 && n < 1440;
const nonempty = (s: string): boolean => s.trim().length > 0;
const sameSource = (a: Pick<SourceRef, "kind" | "id">, b: Pick<SourceRef, "kind" | "id">): boolean =>
  a.kind === b.kind && a.id === b.id;

function sameCandidate(a: ProactiveCandidate, b: ProactiveCandidate): boolean {
  return a.occurrenceId === b.occurrenceId && a.ownerKey === b.ownerKey && a.sessionKey === b.sessionKey &&
    a.topicId === b.topicId && a.category === b.category && a.processing === b.processing &&
    a.dueAtMs === b.dueAtMs && a.expiresAtMs === b.expiresAtMs && a.sources.length === b.sources.length &&
    a.sources.every(source => b.sources.some(other => sameSource(source, other) && source.revision === other.revision));
}

function snapshotCandidate(candidate: ProactiveCandidate): ProactiveCandidate {
  return Object.freeze({ ...candidate, sources: Object.freeze(candidate.sources.map(source => Object.freeze({ ...source }))) });
}

function validCandidate(c: ProactiveCandidate, now: number, l: ProposedLimits): boolean {
  return [c.occurrenceId, c.ownerKey, c.sessionKey, c.topicId].every(nonempty) &&
    timestamp(now) && timestamp(c.dueAtMs) && timestamp(c.expiresAtMs) && c.dueAtMs < c.expiresAtMs &&
    c.sources.length > 0 && c.sources.every(s => nonempty(s.id) && nonempty(s.revision)) &&
    c.sources.every((s, i) => c.sources.findIndex(other => sameSource(s, other)) === i) &&
    Number.isSafeInteger(l.maximumInWindow) && l.maximumInWindow > 0 &&
    [l.rollingWindowMs, l.cooldownMs, l.maximumSnapshotAgeMs].every(n => Number.isSafeInteger(n) && n > 0);
}

/** Evaluate the actual wall time at each instant. This handles a repeated DST
 * hour and a skipped quiet-end time without assuming a day always has 24 hours.
 * At most 48h of minute boundaries; returns a recheck time, not a sending timer. */
function quietUntil(now: number, settings: ContactSettings): number | "invalid" | undefined {
  if (!(settings.timeZone === "UTC" || /^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(settings.timeZone))) return "invalid";
  try {
    const format = new Intl.DateTimeFormat("en-GB", { timeZone: settings.timeZone,
      hourCycle: "h23", hour: "2-digit", minute: "2-digit" });
    if (settings.quiet.kind === "disabled") return undefined;
    const { startMinute: start, endMinute: end } = settings.quiet;
    if (!minute(start) || !minute(end) || start === end) return "invalid";
    const quiet = (at: number): boolean => {
      const parts = format.formatToParts(at);
      const hour = Number(parts.find(p => p.type === "hour")?.value);
      const localMinute = hour * 60 + Number(parts.find(p => p.type === "minute")?.value);
      return start < end ? localMinute >= start && localMinute < end : localMinute >= start || localMinute < end;
    };
    if (!quiet(now)) return undefined;
    for (let at = Math.floor(now / 60000) * 60000 + 60000; at <= now + 48 * 3600000; at += 60000) {
      if (!quiet(at)) return at;
    }
    return "invalid";
  } catch { return "invalid"; }
}

/** Pure preflight only. An allow decision requires a subsequent owner-scoped
 * atomic compare/transition with the same versions and current ledger. It is
 * NOT a lease, a durable schedule or evidence of exactly-once provider delivery.
 * Required values have no production defaults; fixtures select Proposed values.
 */
export function evaluateProactive(input: {
  readonly phase: "generation" | "delivery";
  readonly nowMs: number;
  readonly candidate: ProactiveCandidate;
  readonly authority: AuthorityRead;
  readonly ledger: ContactLedger;
  readonly limits: ProposedLimits;
  readonly generated?: GenerationProof;
}): PolicyDecision {
  const { candidate: c, nowMs: now, authority: a, ledger, limits: l, phase } = input;
  if (!validCandidate(c, now, l)) return suppress("invalid_input");
  if (now >= c.expiresAtMs) return suppress("expired");
  if (a.status === "unknown") return hold("authority_unknown");
  if (!timestamp(a.observedAtMs) || a.observedAtMs > now || now - a.observedAtMs > l.maximumSnapshotAgeMs) return hold("authority_stale");
  if (a.occurrenceId !== c.occurrenceId || a.ownerKey !== c.ownerKey || a.sessionKey !== c.sessionKey || a.topicId !== c.topicId || !nonempty(a.authorityVersion)) return suppress("binding_mismatch");
  if (!a.accountAllowed || !a.topicAllowed) return suppress("not_authorized");
  if (!a.intentActive) return suppress("cancelled");
  if (a.settings.mode.kind === "off") return suppress("off");
  if (!a.settings.categories.includes(c.category)) return suppress("category_off");
  if (a.settings.mode.kind === "paused") {
    const until = a.settings.mode.untilMs;
    if (until !== undefined && !timestamp(until)) return suppress("invalid_input");
    if (until === undefined || now < until) return hold("paused", until);
  }
  if (!a.allowedProcessing.includes(c.processing)) return suppress("processing_not_allowed");
  // A minimized, exact source set is required; no silently appended private context.
  if (a.sources.some((s, i) => !c.sources.some(ref => sameSource(s, ref)) || a.sources.findIndex(other => sameSource(s, other)) !== i)) return suppress("binding_mismatch");
  if (a.sources.length !== c.sources.length) return hold("authority_unknown");
  for (const ref of c.sources) {
    const source = a.sources.find(s => sameSource(s, ref))!;
    if (source.state === "unknown") return hold("authority_unknown");
    if (source.state !== "available") return suppress("source_unavailable");
    if (!timestamp(source.observedAtMs) || source.observedAtMs > now || now - source.observedAtMs > l.maximumSnapshotAgeMs) return hold("authority_stale");
    if (source.validUntilMs !== undefined && (!timestamp(source.validUntilMs) || now >= source.validUntilMs)) return hold("authority_stale");
    if (source.kind === "event" && source.validUntilMs === undefined) return hold("authority_stale");
    if (source.revision !== ref.revision) return suppress("source_changed");
    if (!source.allowedProcessing.includes(c.processing)) return suppress("processing_not_allowed");
  }
  const f = a.trigger;
  if (f.category !== c.category) return suppress("trigger_invalid");
  switch (f.category) {
    case "explicit_follow_up":
      if (!f.confirmed || !c.sources.some(s => s.kind === "message" || s.kind === "history_pair")) return suppress("trigger_invalid");
      break;
    case "going_event":
      if (f.participation !== "going" || f.eventState !== "active" || !timestamp(f.startsAtMs) || now >= f.startsAtMs ||
        !c.sources.some(s => s.kind === "event") || !c.sources.some(s => s.kind === "participation")) return suppress("trigger_invalid");
      break;
    case "check_in_follow_up":
      if (!f.optedIn || !timestamp(f.recordedAtMs) || f.recordedAtMs > now || !c.sources.some(s => s.kind === "check_in")) return suppress("trigger_invalid");
      break;
  }
  if (now < c.dueAtMs) return hold("not_due", c.dueAtMs);
  const quietEnd = quietUntil(now, a.settings);
  if (quietEnd === "invalid") return hold("invalid_time_zone");
  if (quietEnd !== undefined) return quietEnd >= c.expiresAtMs ? suppress("expired") : hold("quiet", quietEnd);
  if (ledger.status === "unknown") return hold("ledger_unknown");
  if (ledger.ownerKey !== c.ownerKey) return suppress("binding_mismatch");
  if (ledger.records.some((r, i) => !nonempty(r.occurrenceId) ||
    ledger.records.findIndex(other => other.occurrenceId === r.occurrenceId) !== i ||
    (r.attemptedAtMs !== undefined && (!timestamp(r.attemptedAtMs) || r.attemptedAtMs > now)) ||
    (["dispatching", "accepted", "unknown"].includes(r.state) && r.attemptedAtMs === undefined))) return hold("ledger_unknown");
  const own = ledger.records.find(r => r.occurrenceId === c.occurrenceId);
  if (own?.state === "dispatching" || own?.state === "unknown") return hold("outcome_unknown");
  if (own && ["accepted", "cancelled", "expired", "failed"].includes(own.state)) return suppress("duplicate");
  if (phase === "generation" && own && own.state !== "queued") return suppress("duplicate");
  if (phase === "delivery" && own?.state !== "prepared") return suppress("not_prepared");
  if (phase === "delivery" && (input.generated?.occurrenceId !== c.occurrenceId ||
    input.generated.authorityVersion !== a.authorityVersion || !sameCandidate(input.generated.candidate, c))) return suppress("generation_stale");
  if (ledger.records.some(r => r.occurrenceId !== c.occurrenceId &&
    ["reserved", "prepared", "dispatching", "unknown"].includes(r.state))) return hold("in_flight");
  // Conservative: every actual dispatch attempt consumes frequency budget,
  // including an eventual cancellation/failure. Reads/open events do not reset it.
  const attempted = ledger.records.flatMap(r => r.attemptedAtMs === undefined ? [] : [r.attemptedAtMs]);
  const latest = attempted.length ? Math.max(...attempted) : undefined;
  if (latest !== undefined && now - latest < l.cooldownMs) return hold("cooldown", latest + l.cooldownMs);
  const recent = attempted.filter(at => now - at < l.rollingWindowMs).sort((x, y) => x - y);
  if (recent.length >= l.maximumInWindow) return hold("frequency", recent[recent.length - l.maximumInWindow]! + l.rollingWindowMs);
  return { kind: "allow", proof: { occurrenceId: c.occurrenceId, authorityVersion: a.authorityVersion, candidate: snapshotCandidate(c) } };
}
