import type { RuntimeApplicationControl, RuntimeFailure } from "../../ai-runtime/application/bounded-ai-runtime.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { AcceptedAssistant, ConversationGates, ConversationInput } from "./conversation-lifecycle.js";
import type { AcceptedContextRead, ContextDependencies, ConversationHistory, HistoryPairIdentity, ContextReadResult } from "./real-context-reader.js";

/** Trusted, request-local identities supplied by N01 Transport, never a body UID. */
export interface AsyncConversationIdentity {
  readonly principal: AuthPrincipal;
  readonly ownerId: string;
  readonly session: object;
  readonly tokenInstance: object;
  readonly originalRequest: object;
}
export interface AsyncSavedUser {
  readonly messageId: string;
  readonly sequence: number;
  readonly persistedAt: FullPrecisionInstant;
}
export interface AsyncOperation {
  readonly operationId: string;
  readonly conversationId: string;
  readonly userMessageId: string;
  readonly kind: "send" | "retry";
  readonly targetKind: "reserved_new" | "existing";
}
export type AsyncConversationCommandInput = {
  readonly selectedReply?:import("./selected-reply.js").SelectedReplyGrant;
  readonly replyToMessageId?:string;
  readonly identity: AsyncConversationIdentity;
  readonly operation: AsyncOperation;
  readonly text: string;
  /** Required for retry: immutable metadata of the original U, never a new U. */
  readonly retryUser?: AsyncSavedUser;
};
export type AsyncAuthorityObservation = "authorized" | "denied" | "unavailable";
export interface AsyncConversationAuthority {
  /** Minimal current Auth/binding/completed-owner/purpose read, before acceptance. No content. */
  preaccept(identity: AsyncConversationIdentity, operation: AsyncOperation): Promise<AsyncAuthorityObservation>;
  /** Fresh revoked/disabled/expired check, afresh before each content transaction. */
  freshAuth(identity: AsyncConversationIdentity): Promise<AsyncAuthorityObservation>;
  /** Synchronous original token-instance/session/request check; never a DB permit. */
  current(identity: AsyncConversationIdentity): boolean;
}
export interface AsyncEffectContext {
  readonly identity: AsyncConversationIdentity;
  readonly operation: AsyncOperation;
  readonly read: AcceptedContextRead;
  readonly budget: RuntimeApplicationControl;
  /** Check immediately before issuing SDK I/O and synchronously in its callback. */
  readonly originalCurrent: () => boolean;
  readonly dependencies: () => ContextDependencies | undefined;
}
export interface AsyncEffectIdentity {
  readonly operationId: string;
  readonly conversationId: string;
}
export type AsyncFenceObservation = (AsyncEffectIdentity & { readonly kind: "open" })
  | { readonly kind: "rejected"; readonly failure: RuntimeFailure;readonly selectionFailure?:import("./selected-reply.js").SelectedReplyFailure }
  | { readonly kind: "unknown" };
type AsyncWriteFailure = { readonly kind: "rejected"; readonly failure: RuntimeFailure;readonly selectionFailure?:import("./selected-reply.js").SelectedReplyFailure }
  | { readonly kind: "unknown" };
export type AsyncUserWriteObservation = (AsyncEffectIdentity & {
  readonly kind: "committed";
  readonly user: AsyncSavedUser;
}) | AsyncWriteFailure;
export type AsyncAssistantWriteObservation = (AsyncEffectIdentity & {
  readonly kind: "committed";
  readonly user: AsyncSavedUser;
  readonly assistantMessageId: string;
}) | AsyncWriteFailure;
export type AsyncClaimSettlement = (AsyncEffectIdentity & {
  readonly kind: "settled";
  readonly user: AsyncSavedUser;
  readonly assistantMessageId: string;
}) | AsyncWriteFailure;
export type AsyncCloseObservation = (AsyncEffectIdentity & { readonly kind: "closed" })
  | { readonly kind: "unresolved" };
export type AsyncReadbackObservation = (AsyncEffectIdentity & {
  readonly kind: "resolved";
  readonly user: AsyncSavedUser | undefined;
  readonly assistantMessageId: string | undefined;
}) | { readonly kind: "unresolved" };

/**
 * N02/F01 asynchronous storage contract, distinct from synchronous effect(commit).
 * These observations are request-local; this Port introduces no durable receipt.
 *
 * Infrastructure must perform fresh in-transaction epoch/fence/owner/purpose/
 * source/used-Persona/live/expiry checks, same-U all-pending claim and accepted
 * pair checks. A prior context read is NOT a future commit permit. All reads
 * precede writes, maxAttempts:1, original cutoff/full precision; no automatic retry.
 * User/message/effects/claim/sequence/pointer and assistant/sources/U pair/effects
 * are atomic. Retry checks exact original text and immutable U metadata; it never
 * creates/replaces U or advances its anchor. Tombstones continue to occupy the pair.
 *
 * Getters borrow content only at actual SDK submission. After local terminal they
 * return undefined. Only already-issued I/O may retain necessary bytes until it
 * settles under F01-B; no cache/replay/log/queued generation is permitted.
 * An exception or ACK loss is unknown, never proof of absent effects. close is a
 * matching durable barrier, not rollback/model-stop; it cannot target another op.
 * reconcile must establish every same-U pending right is settled/closed (including
 * current-epoch restart evidence), and enforce current owner/source/expiry. A
 * missing parent/effect is not no-effect proof for a reserved-new in-flight write.
 */
export interface AsyncConversationStore {
  readHistory?(context: AsyncEffectContext, expected?: readonly HistoryPairIdentity[]): Promise<ContextReadResult<ConversationHistory>>;
  open(context: AsyncEffectContext): Promise<AsyncFenceObservation>;
  submitUser(context: AsyncEffectContext, text: () => string | undefined,
    retry: AsyncSavedUser | undefined): Promise<AsyncUserWriteObservation>;
  submitAssistant(context: AsyncEffectContext, user: AsyncSavedUser,
    assistant: () => AcceptedAssistant | undefined): Promise<AsyncAssistantWriteObservation>;
  /** No-content transaction: verify the canonical pair then clear ONLY this op's pending claim. */
  confirmAssistant(context: AsyncEffectContext, user: AsyncSavedUser,
    assistantMessageId: string): Promise<AsyncClaimSettlement>;
  close(identity: AsyncConversationIdentity, operation: AsyncOperation): Promise<AsyncCloseObservation>;
  reconcile(identity: AsyncConversationIdentity, operation: AsyncOperation): Promise<AsyncReadbackObservation>;
}
export interface AsyncDeliveryMessage {
  readonly operation: AsyncOperation;
  readonly user: AsyncSavedUser;
  readonly assistantMessageId: string;
  readonly message: string;
}
export interface AsyncConversationDelivery {
  /**
   * F02: invoke event once AT complete-body sink acceptance, in the same non-
   * yielding event as accept. It may refuse; a queued message is not acceptance.
   * The supplier awaits revalidate immediately before the event; it must not
   * defer acceptance afterward or invoke it after a false result/abort. The event
   * itself rechecks original identity/deadline and calls control.complete.
   */
  deliver(context: AsyncEffectContext, revalidate: () => Promise<boolean>,
    event: (accept: (message: AsyncDeliveryMessage) => void) => void): Promise<"accepted" | "refused">;
}
export interface AsyncConversationClock {
  monotonicNow(): number;
  utcNow(): FullPrecisionInstant;
}
/** Existing injected token/semantic gates; no new model/tokenizer policy. */
export type AsyncConversationGates = ConversationGates;
/** Backend-local dispatch handle, NEVER serialized into a model payload. */
export interface AsyncConversationModelInput {
  readonly processing?: "cloud";
  readonly cloudConsentCurrent?: () => boolean;
  readonly authorize: () => Promise<boolean>;
  /** Borrow only after authorize succeeds, immediately at actual model dispatch. */
  readonly projection: () => ConversationInput | undefined;
}
