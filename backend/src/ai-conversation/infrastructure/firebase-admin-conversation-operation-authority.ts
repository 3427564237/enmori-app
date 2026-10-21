import type { Firestore } from "firebase-admin/firestore";
import type { ConversationOperationAuthority, ConversationOrdinaryContext } from "../ports/application-conversation-operations.js";
import type { ConversationCaller, ConversationResult } from "../ports/conversation-operations.js";
import { createAuthBindingDocumentId, parseAccountProjection, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import { requireFeatureContextFirestore } from "./isolated-context-firestore.js";

type Control = Pick<ConversationOrdinaryContext, "signal" | "deadline" | "current">;
type Resolution = ConversationResult<{ readonly ownerId: string }>;

/** Minimal ordinary N01 owner/purpose read. No context, ticket, write permit or
 * retained credential; the still-current original execute gets its own authority.
 */
export class FirebaseAdminConversationOperationAuthority implements ConversationOperationAuthority {
  constructor(private readonly firestore: Firestore,
    environment: Readonly<Record<string, string | undefined>>,
    private readonly monotonicNow: () => number) {
    requireFeatureContextFirestore(firestore, environment);
  }

  private live(control: Control): boolean {
    try { return !control.signal.aborted && Number.isFinite(control.deadline) &&
      this.monotonicNow() < control.deadline && control.current() === true; }
    catch { return false; }
  }

  async resolve(caller: ConversationCaller, requirePurpose: boolean, control: Control): Promise<Resolution> {
    if (!this.live(control)) return { kind: "terminated" };
    try {
      const verified = await caller.verifyCurrentAuth();
      if (!this.live(control)) return { kind: "terminated" };
      if (verified.kind === "invalid") return { kind: "failure", code: "AUTH_REQUIRED" };
      if (verified.kind === "forbidden" || (verified.kind === "verified" &&
          verified.principal.firebaseUid !== caller.principal.firebaseUid)) return { kind: "failure", code: "AUTH_FORBIDDEN" };
      if (verified.kind !== "verified") return { kind: "failure", code: "AI_UNAVAILABLE" };
      const bindingId = createAuthBindingDocumentId(verified.principal.firebaseUid);
      if (!bindingId) return { kind: "failure", code: "AUTH_FORBIDDEN" };
      // No intervening await between the last original guard and actual SDK I/O.
      if (!this.live(control)) return { kind: "terminated" };
      const result = await this.firestore.runTransaction<Resolution>(async tx => {
        if (!this.live(control)) return { kind: "terminated" };
        const binding = await tx.get(this.firestore.doc(`auth_bindings/${bindingId}`));
        if (!this.live(control)) return { kind: "terminated" };
        if (!binding.exists) return { kind: "failure", code: "ONBOARDING_REQUIRED" };
        const data = binding.data(), ownerId = data && parseAuthBinding(data);
        if (!ownerId) return { kind: "failure", code: "AI_UNAVAILABLE" };
        const account = await tx.get(this.firestore.doc(`accounts/${ownerId}`));
        if (!this.live(control)) return { kind: "terminated" };
        const projection = parseAccountProjection(account.data() ?? {});
        if (!projection) return { kind: "failure", code: "AI_UNAVAILABLE" };
        if (requirePurpose && projection.optionalProcessingConsent !== "accepted") {
          return { kind: "failure", code: "AI_CONTEXT_NOT_PERMITTED" };
        }
        return { kind: "success", value: Object.freeze({ ownerId }) };
      }, { readOnly: true });
      return this.live(control) ? result : { kind: "terminated" };
    } catch {
      return this.live(control) ? { kind: "failure", code: "AI_UNAVAILABLE" } : { kind: "terminated" };
    }
  }
}
