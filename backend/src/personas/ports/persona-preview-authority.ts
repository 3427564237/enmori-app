import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { ConversationFailureCode, ConversationResult } from "../../ai-conversation/ports/conversation-operations.js";

export interface PersonaPreviewPermission {
  readonly ownerId: string;
  readonly purposeRevocationGeneration: number;
}

/** Read-only identity-to-account + consent. No saved Persona, history, Notes or candidates. */
export interface PersonaPreviewAuthority {
  read(principal: AuthPrincipal): Promise<ConversationResult<PersonaPreviewPermission>>;
}
export type PersonaPreviewFailure = Extract<ConversationFailureCode,
  "REQUEST_INVALID" | "AUTH_REQUIRED" | "AUTH_FORBIDDEN" | "ONBOARDING_REQUIRED" | "AI_CONTEXT_NOT_PERMITTED" |
  "AI_AUTHORITY_CHANGED" | "AI_INPUT_INVALID" | "AI_BUSY" | "AI_UNAVAILABLE" | "AI_REPLY_REJECTED">;
