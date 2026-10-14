import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { RuntimeEpoch } from "./real-conversation-store.js";

/** Content-free Application/Transport coordination, never supplied by HTTP JSON. */
export interface ConversationQuiescence {
  /**
   * Synchronously revoke all target tickets/commands, prevent new target dispatch,
   * and await ALL initialization/content I/O settlement before invoking work.
   * Keep admission closed throughout work and dispose target handles afterward.
   * A cancelled promise, absent row, model abort or timeout is not settlement.
   * If any old writer cannot be fenced/settled, do NOT invoke work.
   */
  withTargetClosed<T>(ownerAccountId: string, conversationId: string, work: () => Promise<T>):
    Promise<{ readonly kind: "settled"; readonly value: T } | { readonly kind: "unresolved" }>;
}
export type ConversationCleanupResult = { readonly kind: "deleted" } | { readonly kind: "live" }
  | { readonly kind: "denied" | "unavailable" | "unresolved" };
export interface ConversationCleanup {
  deleteOwned(principal: AuthPrincipal, ownerAccountId: string, conversationId: string, epoch: RuntimeEpoch): Promise<ConversationCleanupResult>;
  /** Trusted service work from canonical parent discovery, never a public authorization bypass. */
  expireKnown(ownerAccountId: string, conversationId: string, epoch: RuntimeEpoch): Promise<ConversationCleanupResult>;
}
