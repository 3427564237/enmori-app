import type { ConversationOperationAuthority } from "../ai-conversation/ports/application-conversation-operations.js";
import type { ConversationCaller, ConversationResult } from "../ai-conversation/ports/conversation-operations.js";
import type { FirestoreConversationStore } from "../ai-conversation/infrastructure/firestore-conversation-store.js";
import type { StoreResult } from "../ai-conversation/ports/real-conversation-store.js";
import type { OwnedSourceOperations } from "../ai-conversation/transport/register-owned-source-routes.js";
import type { FirstFlowApplication } from "../proactive/application/first-flow-application.js";

/** Authenticated read-only projections. Store transactions recheck binding,
 * purpose, source version, message availability and the original live guard. */
export function createOwnedSourceOperations(authority: ConversationOperationAuthority,
  store: FirestoreConversationStore, accepting: () => boolean): OwnedSourceOperations {
  async function read<T>(caller: ConversationCaller, live: () => boolean,
    work: (owner: string, current: () => boolean) => Promise<StoreResult<T>>): Promise<ConversationResult<T>> {
    const signal = AbortSignal.timeout(15000), deadline = performance.now() + 15000;
    const current = () => { try { return !signal.aborted && performance.now() < deadline && accepting() && live(); } catch { return false; } };
    const denied = async (): Promise<ConversationResult<T> | undefined> => {
      if (!current()) return { kind: "terminated" };
      const verified = await caller.verifyCurrentAuth();
      if (!current()) return { kind: "terminated" };
      if (verified.kind === "invalid") return { kind: "failure", code: "AUTH_REQUIRED" };
      if (verified.kind === "forbidden" || verified.kind === "verified" && verified.principal.firebaseUid !== caller.principal.firebaseUid) return { kind: "failure", code: "AUTH_FORBIDDEN" };
      if (verified.kind !== "verified") return { kind: "failure", code: "AI_UNAVAILABLE" };
      return undefined;
    };
    try {
      const owner = await authority.resolve(caller, true, { signal, deadline, current });
      if (!current()) return { kind: "terminated" };
      if (owner.kind !== "success") return owner;
      const before = await denied(); if (before) return before;
      const result = await work(owner.value.ownerId, current);
      if (!current()) return { kind: "terminated" };
      const after = await denied(); if (after) return after;
      switch (result.kind) {
        case "confirmed": return { kind: "success", value: result.value };
        case "terminated": return { kind: "terminated" };
        case "conflict": return { kind: "failure", code: "AI_AUTHORITY_CHANGED" };
        case "denied": case "conversation_unavailable": return { kind: "failure", code: "AI_SOURCE_UNAVAILABLE" };
        default: return { kind: "failure", code: "AI_UNAVAILABLE" };
      }
    } catch { return current() ? { kind: "failure", code: "AI_UNAVAILABLE" } : { kind: "terminated" }; }
  }
  return {
    resolve: (caller, input, current) => read(caller, current, (owner, live) =>
      store.resolveOwnedSource(caller.principal, owner, input.conversationId, input.messageId, input.cardRef, live)),
    anchor: (caller, conversationId, messageId, current) => read(caller, current, (owner, live) =>
      store.readOwnedMessageAnchor(caller.principal, owner, conversationId, messageId, live)),
  };
}

/** A notification contains only an opaque occurrence reference. Resolving it
 * does not mark it read, rerun an occurrence or trust a stale push payload. */
export function withDeliveryResolution(operations: OwnedSourceOperations,
  application: Pick<FirstFlowApplication, "intent">, accepting: () => boolean): OwnedSourceOperations {
  return { ...operations, deliveryAnchor: async (caller, deliveryRef, current) => {
    const live = () => { try { return accepting() && current(); } catch { return false; } };
    if (!live()) return { kind: "terminated" };
    const intent = await application.intent({ principal: caller.principal, verifyCurrentAuth: () => caller.verifyCurrentAuth(), current: live }, deliveryRef);
    if (!live() || intent.kind === "terminated") return { kind: "terminated" };
    if (intent.kind !== "ok") return { kind: "failure", code: ["unknown", "unavailable"].includes(intent.kind) ? "AI_UNAVAILABLE" : "AI_SOURCE_UNAVAILABLE" };
    if (intent.value.state !== "published" || !intent.value.messageId || !Number.isSafeInteger(intent.value.messageSequence)) return { kind: "failure", code: "AI_SOURCE_UNAVAILABLE" };
    const target = await operations.anchor(caller, intent.value.conversationId, intent.value.messageId, live);
    if (!live()) return { kind: "terminated" };
    if (target.kind === "success" && (target.value.conversationId !== intent.value.conversationId || target.value.messageId !== intent.value.messageId ||
        target.value.sequence !== intent.value.messageSequence)) return { kind: "failure", code: "AI_UNAVAILABLE" };
    return target;
  } };
}
