import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { ContextDependencies } from "./real-context-reader.js";
import type { PresentationMetadata } from "./conversation-lifecycle.js";

/** N02/F01 asynchronous boundary. The synchronous fake effect(commit) Port is unchanged. */
export type StoreFailure = "unavailable" | "denied" | "terminated" | "conflict" | "conversation_unavailable";
export type StoreResult<T> = { readonly kind: "confirmed"; readonly value: T }
  | { readonly kind: StoreFailure }
  // A thrown/lost transaction acknowledgment is never proof of no effect.
  | { readonly kind: "unresolved" };

export interface RuntimeEpoch {
  readonly processEpoch: string;
  readonly generation: number;
}
export interface OperationTarget {
  readonly ownerAccountId: string;
  readonly conversationId: string;
  readonly userMessageId: string;
  readonly operationId: string;
  readonly kind: "send" | "retry";
  /** Only the original consumed in-memory ticket may supply reserved_new. */
  readonly targetKind: "reserved_new" | "existing";
}
export interface OpenOperation extends OperationTarget {
  readonly epoch: RuntimeEpoch;
  readonly revision: number;
}
export interface OriginalWriteAuthority {
  readonly principal: AuthPrincipal;
  readonly dependencies: ContextDependencies;
  /** Original Application/session/deadline, rechecked after EVERY await. */
  current(): boolean;
  /** Fresh external Auth check before EACH content transaction; never in its callback. */
  verifyCurrentAuth(): Promise<{ readonly kind: "verified"; readonly principal: AuthPrincipal }
    | { readonly kind: "denied" | "unavailable" }>;
}
export interface StoredConversationMessage {
  readonly messageId: string;
  readonly sequence: number;
  readonly role: "user" | "assistant";
  /** Actual immutable service metadata; convert only at the HTTP projection. */
  readonly persistedAt: FullPrecisionInstant;
  readonly availability: "available" | "unavailable";
  readonly text?: string;
}
export interface StoredUserIdentity {
  readonly messageId: string;
  readonly sequence: number;
  readonly persistedAt: FullPrecisionInstant;
}
export type SavedOperationOutcome =
  | { readonly state: "unresolved" }
  | { readonly state: "user_saved"; readonly user: StoredConversationMessage }
  | { readonly state: "assistant_saved"; readonly user: StoredConversationMessage;
      readonly assistant: StoredConversationMessage };

/**
 * No token/key/content cache, implicit retries, automatic generation, or receipt.
 * IDs come from the trusted original ticket; they are not caller authorization.
 * Confirmed writes mean SDK acknowledgment, not current delivery permission.
 * The caller must revalidate original delivery authority and ordinary read rules.
 */
export interface RealConversationStore {
  startEpoch(processEpoch: string): Promise<StoreResult<RuntimeEpoch>>;
  initializeOperation(target: OperationTarget, epoch: RuntimeEpoch,
    authority: OriginalWriteAuthority): Promise<StoreResult<OpenOperation>>;
  /** Borrow only at guarded SDK submission; the supplier returns undefined after terminal disposal. */
  saveUser(operation: OpenOperation, text: () => string | undefined,
    authority: OriginalWriteAuthority): Promise<StoreResult<void>>;
  claimRetry(operation: OpenOperation, explicitText: () => string | undefined, expectedUser: StoredUserIdentity,
    authority: OriginalWriteAuthority): Promise<StoreResult<void>>;
  saveAssistant(operation: OpenOperation, input: () => {
    readonly messageId: string; readonly text: string; readonly presentation: PresentationMetadata;
  } | undefined, authority: OriginalWriteAuthority, expectedUser?: StoredUserIdentity): Promise<StoreResult<void>>;
  /** Immutable user metadata after a definite own user/claim ACK; no content replay. */
  readPendingUser(operation: OpenOperation, authority: OriginalWriteAuthority): Promise<StoreResult<StoredUserIdentity>>;
  /** Synchronously end the original Application BEFORE invoking this method. */
  closeOperation(target: OperationTarget, epoch: RuntimeEpoch): Promise<StoreResult<void>>;
  /** Only after a definite assistant ACK while the original request is still current. */
  settleAcknowledgedAssistant(operation: OpenOperation,
    authority: OriginalWriteAuthority): Promise<StoreResult<void>>;
  /** Definite ACK metadata projection for the still-current original guarded sink, never a replay cache. */
  readAcknowledgedPair(operation: OpenOperation, authority: OriginalWriteAuthority): Promise<StoreResult<{
    readonly user: StoredConversationMessage; readonly assistant: StoredConversationMessage;
  }>>;
  /** New ordinary owner read. Checks canonical U and ALL pending operations on U. */
  readOutcome(principal: AuthPrincipal, target: OperationTarget): Promise<StoreResult<SavedOperationOutcome>>;
}
