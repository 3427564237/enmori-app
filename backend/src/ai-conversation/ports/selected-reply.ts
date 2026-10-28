import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { OwnedSourceCard } from "./owned-sources.js";
import type { AcceptedContextRead, ReadAuthority, ReadPersonaSet, HistoryPairIdentity } from "./real-context-reader.js";
import type { ConversationOrdinaryContext } from "./application-conversation-operations.js";
import type { ConversationResult } from "./conversation-operations.js";

/** The mutable local reply branch; never the old immutable Note
 * reader or a category-wide permission. No contents or IDs enter model keys. */
export type SelectReplyContext = {
  readonly processing:"local" | "cloud";
  readonly sources:readonly {readonly kind:"check_in";readonly checkInId:string}[];
} | {
  readonly processing:"local" | "cloud";
  readonly today:{readonly timeZone:string};
};
/** Request-only UI metadata. Never model input or a persisted category grant. */
export interface TodayReplySelection {
  readonly date:string;
  readonly timeZone:string;
  readonly limit:5;
  readonly hasMore:boolean;
}
export interface ExecuteReplySelection {
  readonly selectionRevision:string;
  readonly includedKeys:readonly string[];
  readonly excludedKeys:readonly string[];
  readonly excludedHistoryKeys?:readonly string[];
}
export interface SelectedSourceIdentity {
  readonly kind:"check_in";
  readonly checkInId:string;
  readonly version:string;
  readonly sourceOccurredAt:string;
  readonly observedAt:string;
}
export interface SelectedReplySnapshot {
  readonly processing?: "local" | "cloud";
  readonly cloudAiConsentGeneration?: number;
  readonly purposeRevocationGeneration:number;
  readonly sources:readonly SelectedSourceIdentity[];
  readonly historyPairs:readonly HistoryPairIdentity[];
  readonly today?:TodayReplySelection;
}
export interface PreparedReplySelection {
  readonly selectionRevision:string;
  readonly expiresAt:string;
  readonly sourceCards:readonly (OwnedSourceCard & {readonly selectionKey:string;readonly checkInId?:string})[];
  readonly historyPairs:readonly (HistoryPairIdentity & {readonly historyKey:string})[];
  readonly today?:TodayReplySelection;
}
export interface SelectedReplyGrant extends ExecuteReplySelection {
  readonly processing?: "local" | "cloud";
  readonly cloudAiConsentGeneration?: number;
  readonly purposeRevocationGeneration:number;
  readonly sources:readonly (SelectedSourceIdentity & {readonly selectionKey:string})[];
  readonly historyPairs:readonly (HistoryPairIdentity & {readonly historyKey:string})[];
  readonly today?:TodayReplySelection;
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
  prepare(context:ConversationOrdinaryContext,input:SelectReplyContext,conversationId?:string):Promise<ConversationResult<SelectedReplySnapshot>>;
  /** Current mutable reads with actual per-source observation times. Does not
   * claim a fixed readTime=acceptance snapshot. Each effect rereads separately. */
  read(context:AcceptedContextRead,grant:SelectedReplyGrant):Promise<SelectedReplyReadResult>;
}
export interface SelectedReplyDependencies {
  readonly cloudAiConsentGeneration?: number;
  readonly historySnapshot?:readonly HistoryPairIdentity[];
  readonly excludedHistoryPairs?:readonly HistoryPairIdentity[];
  readonly processing:"local" | "cloud";
  readonly asOf:FullPrecisionInstant;
  readonly permittedCheckInIds:readonly string[];
  readonly excludedCheckInIds:readonly string[];
  readonly sources:readonly {readonly kind:"check_in"|"conversation_message";readonly id:string;readonly version:string}[];
}
