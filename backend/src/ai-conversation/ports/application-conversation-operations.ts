import type { AuthPrincipal, IdentityVerificationResult } from "../../shared/ports/identity-verifier.js";
import type { RuntimeClock } from "../../ai-runtime/ports/runtime-clock.js";
import type { AsyncCloseObservation, AsyncConversationIdentity, AsyncEffectContext, AsyncOperation, AsyncSavedUser } from "./async-conversation.js";
import type { ConversationCaller, ConversationReadback, ConversationResult, ConversationSummaryPage } from "./conversation-operations.js";
import type { StoredConversationMessage } from "./real-conversation-store.js";
import type { PresentationMetadata } from "./conversation-lifecycle.js";
import type { AcceptedContextRead, ContextReadResult } from "./real-context-reader.js";

export interface RequestOriginalConversationIdentity {
  current(identity: AsyncConversationIdentity): boolean;
  verify(identity: AsyncConversationIdentity): Promise<IdentityVerificationResult>;
  /** Only the exact approved Application start context, under its original
   * token instance and runtime budget. No reusable identity or write permit. */
  verifyRead(context: AcceptedContextRead): Promise<ContextReadResult<AuthPrincipal>>;
  currentRead?(context:AcceptedContextRead):boolean;
}
/** JIN's guarded projection of the actual settled canonical pair, including its
 * selected presentation. Fresh owner/source/full-precision expiry/all-pending
 * checks are mandatory; no inferred IDs, timestamp or cached body. */
export interface AsyncAcknowledgedConversationPair {
  read(context: AsyncEffectContext): Promise<ConversationResult<{
    readonly user: StoredConversationMessage;
    readonly assistant: StoredConversationMessage;
    readonly presentation: PresentationMetadata;
  }>>;
}

/** Ordinary actions have their own 15s budget; never extend the original AI request. */
export interface ConversationOrdinaryContext {
  readonly principal: AuthPrincipal;
  readonly ownerId: string;
  readonly signal: AbortSignal;
  readonly deadline: number;
  current(): boolean;
}
export interface ConversationOperationAuthority {
  /** Current binding/completed-owner, plus current purpose only when requirePurpose.
   * The caller was freshly verified before this read. No content or commit permit. */
  resolve(caller: ConversationCaller, requirePurpose: boolean,
    control: Pick<ConversationOrdinaryContext, "signal" | "deadline" | "current">): Promise<ConversationResult<{ readonly ownerId: string }>>;
}
export interface ConversationOperationIdentifiers {
  /** Existing trusted canonical UUID-v4 and 32-byte unpadded base64url mechanisms. */
  uuid(): string;
  operationKey(): string;
}
export interface ConversationOperationClock extends RuntimeClock {
  /** Display-only preparation expiry. Monotonic time controls validity. */
  utcMilliseconds(): number;
}
/** Trusted content-free target admission coordination, never a public DTO.
 * This proves ONLY registry dispatch/closure bookkeeping. JIN must ALSO await
 * actual initialized/in-flight SDK I/O before cleanup or an orphan work callback.
 * A cancelled outcome, model abort, or closed registry is not SDK settlement. */
export interface ConversationTargetLease {
  readonly ownerAccountId: string;
  readonly conversationId: string;
  readonly mode: "closed" | "idle";
  current(): boolean;
  /** Idempotent matching release; keep held through the coordinator's work. */
  release(): void;
}
export type ConversationTargetLeaseResult = { readonly kind: "acquired"; readonly lease: ConversationTargetLease }
  | { readonly kind: "unresolved" };
export interface ConversationOperationQuiescence {
  /** Locks admission SYNCHRONOUSLY before its first await. closed disposes all
   * matching tickets; idle waits live commands without cancelling them. Unknown
   * barriers yield no lease and retain only a content-free admission hold until
   * a subsequent explicit acquisition proves resolution. No automatic retry. */
  acquireTargetLease(ownerAccountId: string, conversationId: string,
    mode: "closed" | "idle"): Promise<ConversationTargetLeaseResult>;
}
export interface ExecutedConversation {
  readonly operationId: string;
  readonly conversationId: string;
  readonly userMessage: StoredConversationMessage;
  readonly assistantMessage: StoredConversationMessage;
}
/**
 * The capability must accept the serialized COMPLETE body synchronously when
 * invoked. Returning/queuing a value for a later reply.send is not acceptance.
 * JIN's Transport must observe an already accepted response and never send twice.
 * Without this optional capability the consumer refuses execution before effects.
 */
export interface ConversationExecutionDelivery {
  readonly signal: AbortSignal;
  current(): boolean;
  readonly acceptCompleteBody?: (pair: ExecutedConversation) => boolean;
  /** Synchronous actual runtime-terminal notification, after a successful sink
   * effect or on failure. Disposes outer request holders before outcome resumes;
   * never confers HTTP delivery rights or starts a new asynchronous close. */
  readonly onTerminal?: () => void;
}
export interface ConversationExecution {
  /** Begins the unchanged AsyncConversationApplication once, including preaccept. */
  dispatch(): Promise<ConversationResult<ExecutedConversation>>;
  /** Synchronous original local disposal precedes asynchronous matching closure. */
  cancel(): Promise<AsyncCloseObservation>;
  /** Synchronously clears every request-private holder, token callback and sink.
   * A terminal handle may retain only necessary content-free barrier references. */
  dispose(): void;
}
export interface ConversationOperationExecutor {
  /** Construction does NOT dispatch. Text is borrowed through a revocable supplier.
   * Adapter joins AsyncConversationApplication to JIN's store and actual F02 sink;
   * definite U metadata and retry invariants must come from authoritative storage. */
  create(input: { readonly identity: AsyncConversationIdentity; readonly operation: AsyncOperation;
    readonly text: () => string | undefined; readonly retryUser?: AsyncSavedUser;
    readonly selectedReply?:import("./selected-reply.js").SelectedReplyGrant;readonly replyToMessageId?:string;
    readonly verifyCurrentAuth: ConversationCaller["verifyCurrentAuth"] },
    delivery: ConversationExecutionDelivery): ConversationExecution;
}
/** No default fake persistence. Each supplied method enforces current ownership,
 * live/full-precision expiry, source rules and all same-U pending/canonical pair.
 * Missing methods fail unavailable; no absent-row/no-op deletion success. */
export interface ConversationOperationReaders {
  prepareSelection?(context:ConversationOrdinaryContext,input:import("./selected-reply.js").SelectReplyContext):Promise<ConversationResult<import("./selected-reply.js").SelectedReplySnapshot>>;
  listConversations?(context: ConversationOrdinaryContext, after: string | undefined): Promise<ConversationResult<ConversationSummaryPage>>;
  verifyTarget?(context: ConversationOrdinaryContext, conversationId: string,
    userMessageId?: string): Promise<ConversationResult<void>>;
  retryUser?(context: ConversationOrdinaryContext, operation: AsyncOperation,
    /** Compare the authoritative original U text; refuse accepted/tombstone or ANY pending claim. */
    text: () => string | undefined): Promise<ConversationResult<StoredConversationMessage>>;
  readOutcome?(context: ConversationOrdinaryContext, conversationId: string,
    operationId: string, original?: AsyncOperation): Promise<ConversationResult<ConversationReadback>>;
  listMessages?(context: ConversationOrdinaryContext, conversationId: string,
    before: number | undefined): Promise<ConversationResult<{ readonly messages: readonly StoredConversationMessage[]; readonly nextBefore?: number }>>;
  deleteConversation?(context: ConversationOrdinaryContext, conversationId: string): Promise<ConversationResult<void>>;
}
