import type { AuthPrincipal, IdentityVerificationResult } from "../../shared/ports/identity-verifier.js";
import type { StoredConversationMessage } from "./real-conversation-store.js";

/** Selected N01 operations. Implemented by ZHOU's asynchronous Application. */
export interface ConversationCaller {
  readonly principal: AuthPrincipal;
  /** Request-only digest of EXACT verified token bytes, not a reusable receipt. */
  readonly tokenInstance: string;
  verifyCurrentAuth(): Promise<IdentityVerificationResult>;
}
export type ConversationFailureCode = "REQUEST_INVALID" | "AUTH_REQUIRED" | "AUTH_FORBIDDEN" | "ONBOARDING_REQUIRED"
  | "AI_CONTEXT_NOT_PERMITTED" | "CONVERSATION_UNAVAILABLE" | "AI_OPERATION_UNAVAILABLE" | "AI_OPERATION_CONFLICT"
  | "REQUEST_TOO_LARGE" | "AI_INPUT_INVALID" | "AI_BUSY" | "AI_UNAVAILABLE" | "AI_REPLY_REJECTED"
  | "AI_AUTHORITY_CHANGED" | "AI_OUTCOME_UNRESOLVED";
export type ConversationResult<T> = { readonly kind: "success"; readonly value: T }
  | { readonly kind: "failure"; readonly code: ConversationFailureCode }
  | { readonly kind: "terminated" };
export type PrepareConversation =
  | { readonly kind: "send"; readonly purpose: "checkin_conversation"; readonly conversationId?: string }
  | { readonly kind: "retry"; readonly purpose: "checkin_conversation"; readonly conversationId: string; readonly userMessageId: string };
export interface PreparedConversationOperation {
  readonly operationId: string; readonly operationKey: string; readonly conversationId: string; readonly preparationExpiresAt: string;
}
export type ConversationReadback =
  | { readonly operationId: string; readonly state: "active" | "no_effect" | "unresolved" }
  | { readonly operationId: string; readonly state: "user_saved"; readonly userMessage: StoredConversationMessage }
  | { readonly operationId: string; readonly state: "assistant_saved"; readonly userMessage: StoredConversationMessage; readonly assistantMessage: StoredConversationMessage };
export interface ExecutedConversationPair {
  readonly operationId:string;readonly conversationId:string;
  readonly userMessage:StoredConversationMessage;readonly assistantMessage:StoredConversationMessage;
}
/** Owner-only history metadata. Message content is read through listMessages. */
export interface ConversationSummary {
  readonly conversationId: string;
  readonly lastMessageAt: string;
}
export interface ConversationSummaryPage {
  readonly conversations: readonly ConversationSummary[];
  /** Last scanned parent ID, including when every scanned row has expired. */
  readonly nextCursor?: string;
}
export interface ConversationOperations {
  /** Optional for older isolated suppliers: absence fails unavailable. */
  listConversations?(caller: ConversationCaller, after: string | undefined): Promise<ConversationResult<ConversationSummaryPage>>;
  prepare(caller: ConversationCaller, input: PrepareConversation): Promise<ConversationResult<PreparedConversationOperation>>;
  execute(caller: ConversationCaller, input: { readonly operationId: string; readonly operationKey: string; readonly text: string },
    delivery: { readonly signal: AbortSignal; current(): boolean;
      /** Complete body acceptance at the original guarded synchronous sink event. */
      readonly acceptCompleteBody?:(pair:ExecutedConversationPair)=>boolean;
    }): Promise<ConversationResult<{
      readonly operationId: string; readonly conversationId: string; readonly userMessage: StoredConversationMessage; readonly assistantMessage: StoredConversationMessage;
    }>>;
  cancel(caller: ConversationCaller, input: { readonly operationId: string; readonly operationKey: string }): Promise<ConversationResult<{ readonly operationId: string; readonly state: "terminal" }>>;
  readOutcome(caller: ConversationCaller, conversationId: string, operationId: string): Promise<ConversationResult<ConversationReadback>>;
  listMessages(caller: ConversationCaller, conversationId: string, before: number | undefined): Promise<ConversationResult<{
    readonly messages: readonly StoredConversationMessage[]; readonly nextBefore?: number;
  }>>;
  deleteConversation(caller: ConversationCaller, conversationId: string): Promise<ConversationResult<void>>;
}
