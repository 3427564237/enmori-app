import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { PersonaProjection } from "./conversation-lifecycle.js";

/** S-PM-1013-LI-REMAINING-AI-A, section 4. Inner values, never storage/wire DTOs. */
export interface AcceptedContextRead {
  readonly principal: AuthPrincipal;
  readonly ownerId: string;
  readonly session: object;
  readonly originalRequest: object;
  readonly acceptedAt: number;
  readonly deadline: number;
  readonly asOf: FullPrecisionInstant;
  readonly signal: AbortSignal;
}

export type ContextReadFailure = "denied" | "unavailable" | "terminated";
export type ContextReadResult<T> = { readonly kind: "read"; readonly value: T }
  | { readonly kind: ContextReadFailure };

export interface ReadAuthority {
  readonly ownerId: string;
  readonly completed: boolean;
  readonly purpose: "checkin_conversation";
  readonly consent: "accepted" | "rejected";
  readonly purposeRevocationGeneration: number;
  readonly settingsRevision: number;
}
export interface ReadPersonaSet {
  readonly stateRevision: number;
  readonly livePersonaIds: readonly string[];
  readonly activePersonaId?: string;
  readonly items: readonly {
    readonly personaId: string;
    readonly revision: number;
    readonly projection: PersonaProjection;
  }[];
}
export interface NoteReadCursor {
  readonly occurredAt: string;
  readonly sourceId: string;
}
export type ReadNote = NoteReadCursor & (
  // Known exclusions carry no Note content. Unknown/corrupt authority is a failure.
  | { readonly eligibility: "excluded" }
  | { readonly eligibility: "eligible"; readonly ownerId: string;
      readonly noteText: string; readonly observedVersion: FullPrecisionInstant }
);
export interface ReadNotePage {
  readonly rows: readonly ReadNote[];
  readonly next: NoteReadCursor | undefined;
}
export interface FixedViewValue<T> {
  readonly view: object;
  readonly asOf: FullPrecisionInstant;
  readonly value: T;
}
export interface FixedStartReadView {
  readonly identity: object;
  readonly asOf: FullPrecisionInstant;
  readAuthority(): Promise<ContextReadResult<FixedViewValue<ReadAuthority>>>;
  readPersonas(): Promise<ContextReadResult<FixedViewValue<ReadPersonaSet>>>;
  readNotePage(query: {
    readonly ownerId: string;
    readonly fromInclusive: FullPrecisionInstant;
    readonly toInclusive: FullPrecisionInstant;
    readonly after: NoteReadCursor | undefined;
    readonly limit: 25;
  }): Promise<ContextReadResult<FixedViewValue<ReadNotePage>>>;
  /**
   * Synchronous best-effort release, once even when a read remains pending.
   * No reusable document/content cache may survive it. This is NOT proof of SDK
   * cancellation, I/O settlement or destruction of unobservable supplier bytes.
   */
  close(): void;
}

export interface ContextDependencies {
  readonly ownerId: string;
  readonly purpose: "checkin_conversation";
  readonly purposeRevocationGeneration: number;
  readonly usedPersonaId: string | undefined;
  readonly sources: readonly {
    readonly sourceType: "check_in";
    readonly sourceId: string;
    readonly observedVersion: FullPrecisionInstant;
  }[];
}
export interface CurrentContextAuthority {
  readonly authority: ReadAuthority;
  readonly usedPersona: "exists" | "deleted" | "not-used";
  readonly sources: readonly {
    readonly sourceId: string;
    readonly state: "valid" | "deleted" | "unavailable";
  }[];
}
export interface NoteModelContext {
  readonly persona: PersonaProjection | undefined;
  readonly checkIns: readonly { readonly occurredAt: string; readonly noteText: string }[];
}

/**
 * Prepared boundary delivered in #96. The 14 October accelerated increment
 * supplies a separate isolated SDK reader implementation, still unwired and
 * subject to the producer prerequisites below; the Port semantics are unchanged.
 *
 * The caller has already verified original Auth/session, minimal owner/purpose
 * and admission. acceptedAt/deadline/asOf are captured in ONE acceptance event;
 * the original runtime owns the 60/5/45 timers and aborts signal on terminal.
 * openStart opens one fixed readTime=asOf view, not latest. ALL authority,
 * complete Persona membership/items, Note metadata and pages use that same view.
 * Read authority before content. A view is a content-free I/O handle; it must
 * not cache completed content. Unsupported, future or unavailable readTime fails.
 *
 * Before a real adapter can implement this Port it must establish the complete
 * canonical Note/time inventory, immutable owner/Note/time and no restore/ID
 * reuse guarantees. Noncanonical legacy records must NOT be silently omitted by
 * a string query then filtering its results. DU's current permissive records
 * and absent-document create checks do not establish these prerequisites.
 * Query rows are ordered occurredAt DESC, opaque ID ASC; cursor is the final
 * returned raw tuple, pages <=25, no omission/duplicates. Exclusions are known
 * authorization/existence exclusions, never unknown failures. Projection is
 * Note-only; visibility is not AI permission. Bad required data fails the read.
 *
 * readCurrent performs a NEW current-authority read, never a start-view replay.
 * It checks original identity/session via the trusted request boundary and all
 * supplied required sources. "valid" must establish immutable source identity
 * and allowed content, not mere presence. A visibility-only updateTime change
 * is not revocation. Persona edit/Active switch does not invalidate usedPersona;
 * permanent deletion does. These observations are not future write/dispatch/sink
 * permits; F01/F03 still close their respective actual effect boundaries.
 * No tokens, content fingerprints, registry, storage fields or logging added.
 */
export interface RealContextReadPort {
  openStart(context: AcceptedContextRead): Promise<ContextReadResult<FixedStartReadView>>;
  readCurrent(context: AcceptedContextRead, dependencies: ContextDependencies):
    Promise<ContextReadResult<CurrentContextAuthority>>;
}
