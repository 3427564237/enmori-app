import type { AsyncConversationStore, AsyncConversationIdentity, AsyncEffectContext, AsyncOperation,
  AsyncSavedUser, AsyncCloseObservation } from "../ports/async-conversation.js";
import type { AsyncAcknowledgedConversationPair } from "../ports/application-conversation-operations.js";
import type { AcceptedAssistant } from "../ports/conversation-lifecycle.js";
import type { RealConversationStore, RuntimeEpoch } from "../ports/real-conversation-store.js";
import { ConversationIoTracker } from "./conversation-io-coordinator.js";

/** Request-local adapter. Every actual bridge call is tracked through settlement;
 * terminal closure revokes later submissions synchronously, before durable await. */
export class TrackedAsyncConversationStore implements AsyncConversationStore, AsyncAcknowledgedConversationPair {
  private terminal = false;
  private retirement: Promise<void> | undefined;
  private closing: Promise<AsyncCloseObservation> | undefined;
  private confirmedClose: AsyncCloseObservation | undefined;
  constructor(private readonly inner: AsyncConversationStore & AsyncAcknowledgedConversationPair,
    private readonly io: ConversationIoTracker, private readonly lower: RealConversationStore,
    private readonly epoch: RuntimeEpoch, private readonly reportRetirement: (confirmed: boolean) => void) {}
  private run<T>(identity: AsyncConversationIdentity, operation: AsyncOperation, work: () => Promise<T>): Promise<T> {
    return this.io.run(identity.ownerId, operation.conversationId, operation.operationId, work);
  }
  readHistory(c: AsyncEffectContext, expected?: readonly import("../ports/real-context-reader.js").HistoryPairIdentity[]): Promise<import("../ports/real-context-reader.js").ContextReadResult<import("../ports/real-context-reader.js").ConversationHistory>> {
    if (this.terminal) return Promise.resolve({kind:"terminated"});
    return this.run(c.identity,c.operation,() => this.inner.readHistory?.(c,expected) ?? Promise.resolve({kind:"unavailable" as const})).catch(() => ({kind:"unavailable"}));
  }
  open(c: AsyncEffectContext): ReturnType<AsyncConversationStore["open"]> {
    if (this.terminal) return Promise.resolve({ kind: "rejected", failure: "stale_authority" });
    return this.run(c.identity,c.operation,()=>this.inner.open(c)).catch(()=>({kind:"unknown"}));
  }
  submitUser(c: AsyncEffectContext, text: () => string | undefined, retry: AsyncSavedUser | undefined): ReturnType<AsyncConversationStore["submitUser"]> {
    if (this.terminal) return Promise.resolve({ kind: "rejected", failure: "stale_authority" });
    return this.run(c.identity,c.operation,()=>this.inner.submitUser(c,text,retry)).catch(()=>({kind:"unknown"}));
  }
  submitAssistant(c: AsyncEffectContext, user: AsyncSavedUser, borrow: () => AcceptedAssistant | undefined): ReturnType<AsyncConversationStore["submitAssistant"]> {
    if (this.terminal) return Promise.resolve({ kind: "rejected", failure: "stale_authority" });
    return this.run(c.identity,c.operation,()=>this.inner.submitAssistant(c,user,borrow)).catch(()=>({kind:"unknown"}));
  }
  confirmAssistant(c: AsyncEffectContext, user: AsyncSavedUser, assistant: string): ReturnType<AsyncConversationStore["confirmAssistant"]> {
    if (this.terminal) return Promise.resolve({ kind: "rejected", failure: "stale_authority" });
    return this.run(c.identity,c.operation,()=>this.inner.confirmAssistant(c,user,assistant)).catch(()=>({kind:"unknown"}));
  }
  read(c: AsyncEffectContext): ReturnType<AsyncAcknowledgedConversationPair["read"]> {
    if (this.terminal) return Promise.resolve({kind:"failure",code:"AI_AUTHORITY_CHANGED"});
    return this.run(c.identity,c.operation,()=>this.inner.read(c)).catch(()=>({kind:"failure",code:"AI_UNAVAILABLE"}));
  }
  reconcile(identity: AsyncConversationIdentity, operation: AsyncOperation): ReturnType<AsyncConversationStore["reconcile"]> {
    return this.run(identity,operation,()=>this.inner.reconcile(identity,operation)).catch(()=>({kind:"unresolved"}));
  }
  async close(identity: AsyncConversationIdentity, operation: AsyncOperation): Promise<AsyncCloseObservation> {
    this.terminal = true;
    if(this.confirmedClose)return this.confirmedClose;
    if(this.closing)return this.closing;
    this.closing=this.run(identity,operation,()=>this.inner.close(identity,operation)).catch(()=>({kind:"unresolved" as const}));
    const result=await this.closing;this.closing=undefined;
    if (result.kind === "closed" && result.operationId === operation.operationId && result.conversationId === operation.conversationId && !this.retirement) {
      this.confirmedClose=result;
      // Do not retain identity/token/session/private context in the continuation.
      const target = { ...operation, ownerAccountId: identity.ownerId };
      this.retirement = (async () => {
        await this.io.settled(target.ownerAccountId,target.conversationId,target.operationId);
        // Retirement is also tracked, so cleanup cannot race it and recreate control.
        const retired = await this.io.run(target.ownerAccountId,target.conversationId,target.operationId,
          ()=>this.lower.retireOperation(target,this.epoch,()=>this.terminal&&this.io.count(target.ownerAccountId,target.conversationId,target.operationId)===1));
        this.reportRetirement(retired.kind === "confirmed");
      })().catch(()=>{ try { this.reportRetirement(false); } catch { /* aggregate only */ } });
    }
    return result;
  }
}
