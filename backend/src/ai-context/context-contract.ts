import type { PersonaProjection } from "../ai-conversation/ports/conversation-lifecycle.js";

/** Proposed inner contracts for synthetic preparation only. No HTTP DTO, new
 * storage schema, permission grant, production reader or runtime registration. */
export type ContextTarget = "local" | "cloud";
export type ContextPurpose = "reply" | "proactive";
export type ContextCategory = "check_ins" | "event_intents" | "location" | "persona" | "conversation_history";
export type RecordKind = "check_in" | "event_intent" | "location_snapshot" | "persona" | "history_pair";
export type SourceKind = "check_in" | "participation" | "event" | "persona" | "history_pair";

export interface ContextScope {
  readonly ownerId: string;
  /** Trusted in-process session identity, never a token or client-supplied ID. */
  readonly session: object;
  readonly conversationId: string;
  readonly purpose: ContextPurpose;
  readonly target: ContextTarget;
}
export interface ContextAuthority {
  readonly scope: ContextScope;
  readonly consent: "accepted" | "rejected";
  /** Must change across withdrawal/reacceptance, not just final boolean state. */
  readonly version: string;
  readonly allowedCategories: readonly ContextCategory[];
  readonly observedAt: string;
  readonly validUntil: string;
}
export interface SourceRef {
  readonly kind: SourceKind;
  readonly id: string;
  /** Opaque trusted version; never a content hash or version invented by AI. */
  readonly version: string;
}
export interface SourceDependency extends SourceRef {
  readonly observedAt: string;
  readonly validUntil?: string;
}
interface OwnerRecord {
  readonly ownerId: string;
  readonly observedAt: string;
}
export interface CheckInContextRecord extends OwnerRecord {
  readonly kind: "check_in";
  readonly source: SourceRef & { readonly kind: "check_in" };
  readonly occurredAt: string;
  readonly noteText?: string;
  readonly moodLabel?: string;
  readonly activityLabel?: string;
}
export interface EventIntentContextRecord extends OwnerRecord {
  readonly kind: "event_intent";
  readonly source: SourceRef & { readonly kind: "event" };
  readonly participation: SourceRef & { readonly kind: "participation" };
  readonly status: "none" | "interested" | "going";
  readonly statusUpdatedAt: string;
  readonly validUntil: string;
  readonly event: {
    readonly availability: "scheduled" | "cancelled" | "unavailable";
    readonly title: string;
    readonly startAt: string;
    readonly endAt?: string;
    readonly locationLabel?: string;
  };
}
/** Explicit historical label only. Existing locationLabel is NOT approved AI
 * input; a future scoped decision is required before any real reader supplies
 * this proposal. There are deliberately no coordinates/live-location fields. */
export interface LocationSnapshotContextRecord extends OwnerRecord {
  readonly kind: "location_snapshot";
  readonly source: SourceRef & { readonly kind: "check_in" };
  readonly occurredAt: string;
  readonly label: string;
}
export interface PersonaContextRecord extends OwnerRecord {
  readonly kind: "persona";
  readonly source: SourceRef & { readonly kind: "persona" };
  readonly presentation: PersonaProjection;
}
export interface HistoryPairContextRecord extends OwnerRecord {
  readonly kind: "history_pair";
  readonly source: SourceRef & { readonly kind: "history_pair" };
  readonly conversationId: string;
  readonly userSequence: number;
  readonly assistantSequence: number;
  readonly occurredAt: string;
  readonly userQuote: string;
  readonly assistantSuggestion: string;
  /** Complete flattened source dependencies required by the historical
   * assistant, including sources inherited through previous pairs. The trusted
   * reader must prove this generation-time inventory; not just direct links. */
  readonly requiredSources: readonly SourceDependency[];
  /** Generation-time data-use categories, freshly authorized by the reader.
   * Missing/unknown legacy metadata must be "unknown", never inferred empty.
   * A source ID alone cannot prove which fields of that source were used. */
  readonly requiredCategories: readonly ContextCategory[] | "unknown";
}
export type ContextRecord = CheckInContextRecord | EventIntentContextRecord |
  LocationSnapshotContextRecord | PersonaContextRecord | HistoryPairContextRecord;
export interface SourceSelector { readonly kind: RecordKind; readonly id: string }
export interface ContextRequest {
  readonly scope: ContextScope;
  readonly asOf: string;
  readonly currentMessage: string;
  /** Relevance is provided by trusted orchestration; no semantic inference or
   * broad database scan occurs here. Attachments select, never authorize. */
  readonly relevant: readonly SourceSelector[];
  readonly attached: readonly SourceSelector[];
  readonly excluded: readonly SourceSelector[];
}
export type ContextRead = { readonly kind: "read"; readonly authority: ContextAuthority; readonly records: readonly ContextRecord[] }
  | { readonly kind: "denied" | "unavailable" };
export interface ContextModelProjection {
  readonly asOf: string;
  readonly currentMessage: string;
  readonly facts: {
    readonly checkIns: readonly { readonly occurredAt: string; readonly moodLabel?: string; readonly activityLabel?: string }[];
    readonly eventIntents: readonly { readonly status: "interested" | "going"; readonly statusUpdatedAt: string;
      readonly title: string; readonly startAt: string; readonly endAt?: string; readonly locationLabel?: string; readonly observedAt: string }[];
    readonly locationSnapshots: readonly { readonly occurredAt: string; readonly label: string }[];
  };
  readonly userQuotes: readonly { readonly occurredAt: string; readonly text: string; readonly origin: "check_in" | "conversation"; readonly historyTurn?: number }[];
  /** Request-local ordinal preserves pairing/order even when timestamps tie;
   * it is not a database or business-source identifier. */
  readonly assistantSuggestions: readonly { readonly occurredAt: string; readonly text: string; readonly historyTurn: number }[];
  readonly persona?: PersonaProjection;
}
export type SourceNavigation = { readonly kind: "check_in"; readonly checkInId: string }
  | { readonly kind: "event"; readonly eventId: string };
export interface TrustedSourceCard {
  readonly ref: SourceRef;
  readonly occurredAt: string;
  readonly observedAt: string;
  readonly navigation: SourceNavigation;
}
export interface PreparedContext {
  readonly scope: ContextScope;
  readonly authorityVersion: string;
  readonly categories: readonly ContextCategory[];
  readonly model: ContextModelProjection;
  readonly dependencies: readonly SourceDependency[];
  /** Proposed UI sidecar. Q19 Backend-only provenance is not made public by
   * defining this type; outward projection needs Integration/PM resolution. */
  readonly sources: readonly TrustedSourceCard[];
  readonly omitted: readonly { readonly selector: SourceSelector; readonly reason: "excluded" | "out_of_window" | "limit" }[];
}
export type ContextPreparation = { readonly kind: "prepared"; readonly value: PreparedContext }
  | { readonly kind: "denied" | "unavailable" | "invalid_selection" };

export type SourceObservation = {
  readonly kind: SourceKind;
  readonly id: string;
  readonly observedAt: string;
} & (/** Both states prove that the same immutable source entity still exists
       * and is currently authorized. "changed" additionally reports a change;
       * it is never used for an unknown/deleted/replaced entity. */
  { readonly state: "available" | "changed"; readonly version: string; readonly validUntil?: string }
  | { readonly state: "deleted" | "denied" | "unknown" });
export type ContextCheckpoint = { readonly kind: "read"; readonly authority: ContextAuthority;
  readonly sources: readonly SourceObservation[] } | { readonly kind: "denied" | "unavailable" };
export type ContextRevalidation = { readonly kind: "valid" | "rebuild" | "denied" | "unavailable" | "expired" };
