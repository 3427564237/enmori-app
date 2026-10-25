import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { OwnedSourceCard } from "./owned-sources.js";
import type { AcceptedContextRead, ReadAuthority, ReadPersonaSet } from "./real-context-reader.js";
import type { ConversationOrdinaryContext } from "./application-conversation-operations.js";
import type { ConversationResult } from "./conversation-operations.js";

/** The explicitly selected mutable F1a branch; never the old immutable Note
 * reader or a category-wide permission. No contents or IDs enter model keys. */
export interface SelectReplyContext {
  readonly processing:"local";
  readonly sources:readonly {readonly kind:"check_in";readonly checkInId:string}[];
}
export interface ExecuteReplySelection {
  readonly selectionRevision:string;
  readonly includedKeys:readonly string[];
  readonly excludedKeys:readonly string[];
}
export interface SelectedSourceIdentity {
  readonly kind:"check_in";
  readonly checkInId:string;
  readonly version:string;
  readonly sourceOccurredAt:string;
  readonly observedAt:string;
}
export interface SelectedReplySnapshot {
  readonly purposeRevocationGeneration:number;
  readonly sources:readonly SelectedSourceIdentity[];
}
export interface PreparedReplySelection {
  readonly selectionRevision:string;
  readonly expiresAt:string;
  readonly sourceCards:readonly (OwnedSourceCard & {readonly selectionKey:string})[];
}
export interface SelectedReplyGrant extends ExecuteReplySelection {
  readonly purposeRevocationGeneration:number;
  readonly sources:readonly (SelectedSourceIdentity & {readonly selectionKey:string})[];
}
export type SelectedReplyFailure="changed"|"source_unavailable"|"selection_conflict"|"denied"|"unavailable"|"terminated";
export interface SelectedReplyObservation {
  readonly authority:ReadAuthority;
  readonly personas:ReadPersonaSet;
  readonly sources:readonly (SelectedSourceIdentity & {readonly noteText:string;readonly moodLabel?:string;readonly activityLabel?:string;readonly observedVersion:FullPrecisionInstant})[];
}
export type SelectedReplyReadResult={readonly kind:"read";readonly value:SelectedReplyObservation}|{readonly kind:SelectedReplyFailure};
export interface SelectedReplyReadPort {
  /** The ordinary Application authenticates before/after this transaction. */
  prepare(context:ConversationOrdinaryContext,input:SelectReplyContext):Promise<ConversationResult<SelectedReplySnapshot>>;
  /** Current mutable reads with actual per-source observation times. Does not
   * claim a fixed readTime=acceptance snapshot. Each effect rereads separately. */
  read(context:AcceptedContextRead,grant:SelectedReplyGrant):Promise<SelectedReplyReadResult>;
}
export interface SelectedReplyDependencies {
  readonly processing:"local";
  readonly asOf:FullPrecisionInstant;
  readonly permittedCheckInIds:readonly string[];
  readonly excludedCheckInIds:readonly string[];
  readonly sources:readonly {readonly kind:"check_in"|"conversation_message";readonly id:string;readonly version:string}[];
}
