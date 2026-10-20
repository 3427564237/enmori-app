import type { PersonaPreviewAuthority, PersonaPreviewPermission } from "../ports/persona-preview-authority.js";
import type { ConversationResult } from "../../ai-conversation/ports/conversation-operations.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAccountProjection, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";

export class FirestorePersonaPreviewAuthority implements PersonaPreviewAuthority {
  constructor(private readonly gateway: FirestoreGateway) {}

  async read(principal: AuthPrincipal): Promise<ConversationResult<PersonaPreviewPermission>> {
    try {
      const bindingId = createAuthBindingDocumentId(principal.firebaseUid);
      if (!bindingId) return { kind: "failure", code: "AUTH_FORBIDDEN" };
      return await this.gateway.runTransaction(async tx => {
        const binding = await tx.get(`auth_bindings/${bindingId}`);
        if (!binding) return { kind: "failure", code: "ONBOARDING_REQUIRED" };
        const ownerId = parseAuthBinding(binding);
        if (!ownerId) return { kind: "failure", code: "AI_UNAVAILABLE" };
        const account = await tx.get(`accounts/${ownerId}`);
        const projection = account && parseAccountProjection(account);
        if (!projection || !Number.isSafeInteger(account?.purposeRevocationGeneration) || (account!.purposeRevocationGeneration as number) < 0) {
          return { kind: "failure", code: "AI_UNAVAILABLE" };
        }
        if (projection.optionalProcessingConsent !== "accepted") return { kind: "failure", code: "AI_CONTEXT_NOT_PERMITTED" };
        return { kind: "success", value: Object.freeze({ ownerId, purposeRevocationGeneration: account!.purposeRevocationGeneration as number }) };
      });
    } catch { return { kind: "failure", code: "AI_UNAVAILABLE" }; }
  }
}
