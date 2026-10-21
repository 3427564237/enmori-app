import type { Firestore, Transaction } from "firebase-admin/firestore";
import type { IdentityVerificationResult } from "../../shared/ports/identity-verifier.js";
import { createAuthBindingDocumentId, isSafeDocumentId, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { AsyncAuthorityObservation, AsyncConversationAuthority, AsyncConversationIdentity,
  AsyncOperation } from "../ports/async-conversation.js";
import { parseReadAuthority } from "./real-context-records.js";
import { requireFeatureContextFirestore } from "./isolated-context-firestore.js";

export interface FreshOriginalConversationIdentity {
  /** Caller-bound original token-instance/session/request; no token bytes passed inward. */
  verify(identity: AsyncConversationIdentity): Promise<IdentityVerificationResult>;
  current(identity: AsyncConversationIdentity): boolean;
}

/** Minimal current check BEFORE acceptance, separate from fixed start content.
 * Unwired. Fresh observations never grant a future DB write/dispatch/sink permit.
 */
export class FirebaseAdminAsyncConversationAuthority implements AsyncConversationAuthority {
  constructor(private readonly firestore: Firestore, private readonly original: FreshOriginalConversationIdentity,
    controlledEnvironment: Readonly<Record<string, string | undefined>>) {
    requireFeatureContextFirestore(firestore, controlledEnvironment);
  }
  current(identity: AsyncConversationIdentity): boolean {
    try { return this.original.current(identity) === true; } catch { return false; }
  }
  async freshAuth(identity: AsyncConversationIdentity): Promise<AsyncAuthorityObservation> {
    if (!this.current(identity)) return "denied";
    try {
      const result = await this.original.verify(identity);
      if (!this.current(identity)) return "denied";
      if (result.kind === "invalid" || result.kind === "forbidden") return "denied";
      if (result.kind !== "verified") return "unavailable";
      return result.principal.firebaseUid === identity.principal.firebaseUid ? "authorized" : "denied";
    } catch { return "unavailable"; }
  }
  async preaccept(identity: AsyncConversationIdentity, operation: AsyncOperation): Promise<AsyncAuthorityObservation> {
    if (![operation.operationId, operation.conversationId, operation.userMessageId, identity.ownerId].every(isSafeDocumentId) ||
        !["send", "retry"].includes(operation.kind) || !["reserved_new", "existing"].includes(operation.targetKind)) return "unavailable";
    const verified = await this.freshAuth(identity);
    if (verified !== "authorized") return verified;
    const bindingId = createAuthBindingDocumentId(identity.principal.firebaseUid);
    if (!bindingId) return "unavailable";
    try {
      const result = await this.firestore.runTransaction(async (tx: Transaction) => {
        if (!this.current(identity)) return "denied" as const;
        const binding = await tx.get(this.firestore.doc(`auth_bindings/${bindingId}`));
        if (!this.current(identity)) return "denied" as const;
        if (!binding.exists) return "denied" as const;
        const data = binding.data();
        const ownerId = data && parseAuthBinding(data);
        if (!ownerId) return "unavailable" as const;
        if (ownerId !== identity.ownerId) return "denied" as const;
        const snapshot = await tx.get(this.firestore.doc(`accounts/${ownerId}`));
        if (!this.current(identity)) return "denied" as const;
        const value = parseReadAuthority(snapshot.data(), ownerId);
        if (!value) return "unavailable" as const;
        return value.consent === "accepted" ? "authorized" as const : "denied" as const;
      }, { readOnly: true });
      return this.current(identity) ? result : "denied";
    } catch { return this.current(identity) ? "unavailable" : "denied"; }
  }
}
