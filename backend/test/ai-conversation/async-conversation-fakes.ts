import { BoundedAiRuntime } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import type { GenerationTransport, RequestBudget } from "../../src/ai-runtime/ports/generation-transport.js";
import { AsyncConversationApplication } from "../../src/ai-conversation/application/async-conversation-application.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../../src/ai-conversation/application/async-conversation-generation-transport.js";
import type { AsyncAssistantWriteObservation, AsyncAuthorityObservation, AsyncClaimSettlement, AsyncCloseObservation,
  AsyncConversationAuthority, AsyncConversationDelivery, AsyncConversationIdentity, AsyncConversationModelInput,
  AsyncConversationStore, AsyncDeliveryMessage, AsyncEffectContext, AsyncFenceObservation, AsyncOperation,
  AsyncReadbackObservation, AsyncSavedUser, AsyncUserWriteObservation } from "../../src/ai-conversation/ports/async-conversation.js";
import type { AcceptedAssistant, ConversationGates, ConversationInput } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import type { AcceptedContextRead, ContextDependencies, ContextReadResult, CurrentContextAuthority,
  FixedStartReadView, FixedViewValue, ReadAuthority, ReadNotePage, ReadPersonaSet,
  RealContextReadPort } from "../../src/ai-conversation/ports/real-context-reader.js";
import { deferred, FakeClock } from "../ai-runtime/support.js";

export { deferred };
export const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const timestamp = { seconds: Date.parse("2026-10-14T00:00:00.000Z") / 1000, nanoseconds: 0 };
export const identity = (ownerId = "synthetic-owner"): AsyncConversationIdentity => ({ ownerId,
  principal: { firebaseUid: `synthetic-${ownerId}` }, session: {}, tokenInstance: {}, originalRequest: {} });
export const operation = (n = 1): AsyncOperation => ({ operationId: id(n), conversationId: id(n + 100),
  userMessageId: id(n + 200), kind: "send", targetKind: "reserved_new" });
const read = <T>(value: T): ContextReadResult<T> => ({ kind: "read", value });

export class FakeAuthority implements AsyncConversationAuthority {
  active = true;
  permit: AsyncAuthorityObservation = "authorized";
  auth: AsyncAuthorityObservation = "authorized";
  preacceptHook: (() => Promise<AsyncAuthorityObservation>) | undefined;
  freshHook: (() => Promise<AsyncAuthorityObservation>) | undefined;
  readonly calls: string[] = [];
  preaccept(_identity: AsyncConversationIdentity, _operation: AsyncOperation) {
    this.calls.push("preaccept"); return this.preacceptHook?.() ?? Promise.resolve(this.permit);
  }
  freshAuth(_identity: AsyncConversationIdentity) { this.calls.push("fresh"); return this.freshHook?.() ?? Promise.resolve(this.auth); }
  current(_identity: AsyncConversationIdentity) { return this.active; }
}
export class FakeReads implements RealContextReadPort {
  readonly opened: AcceptedContextRead[] = [];
  readonly calls: string[] = [];
  currentHook: ((dependencies: ContextDependencies) => Promise<ContextReadResult<CurrentContextAuthority>>) | undefined;
  openHook: ((context: AcceptedContextRead) => Promise<ContextReadResult<FixedStartReadView>>) | undefined;
  authority: ReadAuthority = { ownerId: "synthetic-owner", completed: true, purpose: "checkin_conversation",
    consent: "accepted", purposeRevocationGeneration: 3, settingsRevision: 1 };
  readonly currentDependencies: ContextDependencies[] = [];
  readonly closed: object[] = [];
  openStart(context: AcceptedContextRead) {
    this.opened.push(context); this.calls.push("open");
    if (this.openHook) return this.openHook(context);
    const viewId = {};
    const wrap = <T>(value: T): ContextReadResult<FixedViewValue<T>> => read({ view: viewId, asOf: context.asOf, value });
    return Promise.resolve(read({ identity: viewId, asOf: context.asOf,
      readAuthority: async () => { this.calls.push("authority"); return wrap({ ...this.authority, ownerId: context.ownerId }); },
      readPersonas: async () => { this.calls.push("personas"); return wrap<ReadPersonaSet>({ stateRevision: 1, livePersonaIds: [], items: [] }); },
      readNotePage: async () => { this.calls.push("notes"); return wrap<ReadNotePage>({ rows: [], next: undefined }); },
      close: () => { this.closed.push(viewId); },
    }));
  }
  async readCurrent(_context: AcceptedContextRead, dependencies: ContextDependencies) {
    this.calls.push("current"); this.currentDependencies.push(dependencies);
    return this.currentHook ? this.currentHook(dependencies) : read({ authority: { ...this.authority, ownerId: dependencies.ownerId },
      usedPersona: dependencies.usedPersonaId ? "exists" as const : "not-used" as const,
      sources: dependencies.sources.map(source => ({ sourceId: source.sourceId, state: "valid" as const })) });
  }
}
interface Row { readonly user: AsyncSavedUser; readonly text: string; assistantMessageId: string | undefined }
/** Explicit fake atomic contract, not a Firestore adapter or persistence evidence. */
export class FakeAsyncStore implements AsyncConversationStore {
  readonly calls: string[] = [];
  readonly contexts: AsyncEffectContext[] = [];
  readonly rows = new Map<string, Row>();
  readonly pending = new Map<string, string>();
  readonly fences = new Map<string, "open" | "closed">();
  transactionAuthority = true;
  userHook: ((context: AsyncEffectContext, getter: () => string | undefined, retry: AsyncSavedUser | undefined) => Promise<AsyncUserWriteObservation>) | undefined;
  assistantHook: ((context: AsyncEffectContext, user: AsyncSavedUser, getter: () => AcceptedAssistant | undefined) => Promise<AsyncAssistantWriteObservation>) | undefined;
  settlementHook: ((context: AsyncEffectContext, user: AsyncSavedUser, aid: string) => Promise<AsyncClaimSettlement>) | undefined;
  closeHook: ((operation: AsyncOperation) => Promise<AsyncCloseObservation>) | undefined;
  bound(context: AsyncEffectContext) { return { operationId: context.operation.operationId, conversationId: context.operation.conversationId }; }
  current(context: AsyncEffectContext) { return context.originalCurrent() && this.transactionAuthority && this.fences.get(context.operation.operationId) === "open"; }
  async open(context: AsyncEffectContext): Promise<AsyncFenceObservation> {
    this.calls.push("open"); this.contexts.push(context);
    if (!context.originalCurrent() || this.fences.has(context.operation.operationId)) return { kind: "rejected", failure: "stale_authority" };
    this.fences.set(context.operation.operationId, "open"); return { kind: "open", ...this.bound(context) };
  }
  async submitUser(context: AsyncEffectContext, getter: () => string | undefined, retry: AsyncSavedUser | undefined): Promise<AsyncUserWriteObservation> {
    this.calls.push("user");
    if (this.userHook) return this.userHook(context, getter, retry);
    return this.commitUser(context, getter, retry);
  }
  commitUser(context: AsyncEffectContext, getter: () => string | undefined, retry: AsyncSavedUser | undefined): AsyncUserWriteObservation {
    const text = getter(), op = context.operation;
    if (!this.current(context) || !context.dependencies() || text === undefined) return { kind: "rejected", failure: "stale_authority" };
    if (this.pending.has(op.userMessageId)) return { kind: "rejected", failure: "stale_authority" };
    let row = this.rows.get(op.userMessageId);
    if (op.kind === "retry") {
      if (!row || !retry || row.text !== text || row.assistantMessageId || row.user.sequence !== retry.sequence ||
          row.user.persistedAt.seconds !== retry.persistedAt.seconds || row.user.persistedAt.nanoseconds !== retry.persistedAt.nanoseconds) return { kind: "rejected", failure: "stale_authority" };
    } else {
      if (row) return { kind: "rejected", failure: "stale_authority" };
      row = { user: { messageId: op.userMessageId, sequence: 1, persistedAt: { ...timestamp } }, text, assistantMessageId: undefined };
      this.rows.set(op.userMessageId, row);
    }
    this.pending.set(op.userMessageId, op.operationId);
    return { kind: "committed", ...this.bound(context), user: row.user };
  }
  async submitAssistant(context: AsyncEffectContext, user: AsyncSavedUser, getter: () => AcceptedAssistant | undefined): Promise<AsyncAssistantWriteObservation> {
    this.calls.push("assistant");
    if (this.assistantHook) return this.assistantHook(context, user, getter);
    return this.commitAssistant(context, user, getter);
  }
  commitAssistant(context: AsyncEffectContext, user: AsyncSavedUser, getter: () => AcceptedAssistant | undefined): AsyncAssistantWriteObservation {
    const row = this.rows.get(user.messageId);
    if (!this.current(context) || !getter() || !row || row.assistantMessageId || this.pending.get(user.messageId) !== context.operation.operationId)
      return { kind: "rejected", failure: "stale_authority" };
    row.assistantMessageId = id(Number.parseInt(context.operation.operationId.slice(-4), 16) + 300);
    return { kind: "committed", ...this.bound(context), user: row.user, assistantMessageId: row.assistantMessageId };
  }
  async confirmAssistant(context: AsyncEffectContext, user: AsyncSavedUser, assistantMessageId: string): Promise<AsyncClaimSettlement> {
    this.calls.push("settle");
    if (this.settlementHook) return this.settlementHook(context, user, assistantMessageId);
    return this.settle(context, user, assistantMessageId);
  }
  settle(context: AsyncEffectContext, user: AsyncSavedUser, assistantMessageId: string): AsyncClaimSettlement {
    if (!this.current(context) || this.pending.get(user.messageId) !== context.operation.operationId ||
        this.rows.get(user.messageId)?.assistantMessageId !== assistantMessageId) return { kind: "rejected", failure: "stale_authority" };
    this.pending.delete(user.messageId); return { kind: "settled", ...this.bound(context), user, assistantMessageId };
  }
  async close(_identity: AsyncConversationIdentity, op: AsyncOperation): Promise<AsyncCloseObservation> {
    this.calls.push("close");
    if (this.closeHook) return this.closeHook(op);
    this.fences.set(op.operationId, "closed"); return { kind: "closed", operationId: op.operationId, conversationId: op.conversationId };
  }
  async reconcile(_identity: AsyncConversationIdentity, op: AsyncOperation): Promise<AsyncReadbackObservation> {
    this.calls.push("reconcile");
    if (this.fences.get(op.operationId) !== "closed") return { kind: "unresolved" };
    // Fake known-settled I/O only. Another operation's pending claim cannot be cleared.
    if (this.pending.has(op.userMessageId) && this.pending.get(op.userMessageId) !== op.operationId) return { kind: "unresolved" };
    this.pending.delete(op.userMessageId);
    const row = this.rows.get(op.userMessageId);
    return { kind: "resolved", operationId: op.operationId, conversationId: op.conversationId,
      user: row?.user, assistantMessageId: row?.assistantMessageId };
  }
}
export function fixture(strategy?: "open_conversation_v1") {
  const clock = new FakeClock(), auth = new FakeAuthority(), reads = new FakeReads(), store = new FakeAsyncStore();
  const calls: { input: ConversationInput; budget: RequestBudget; completion: ReturnType<typeof deferred<Uint8Array>> }[] = [];
  const model: GenerationTransport<ConversationInput> = { generate(input, budget) {
    const completion = deferred<Uint8Array>(); calls.push({ input, budget, completion }); return completion.promise;
  } };
  const transport = new AuthorizedAsyncConversationGenerationTransport(model);
  const runtime = new BoundedAiRuntime<AsyncConversationModelInput>(clock, transport);
  const delivered: AsyncDeliveryMessage[] = [];
  const delivery: AsyncConversationDelivery = { async deliver(_context, revalidate, event) {
    if (!await revalidate()) return "refused";
    event(message => delivered.push(message)); return "accepted";
  } };
  const gates: ConversationGates = { beforeGeneration: async () => ({ ok: true as const, value: undefined }),
    candidate: async () => ({ ok: true as const, value: undefined }) };
  let utc = { ...timestamp };
  const app = new AsyncConversationApplication(runtime, auth, reads, store, gates, delivery,
    { monotonicNow: () => clock.now(), utcNow: () => ({ ...utc }) }, strategy);
  const who = identity();
  const create = (op = operation(), text = "Synthetic current input", retryUser?: AsyncSavedUser) => app.create({ identity: who,
    operation: op, text, ...(retryUser ? { retryUser } : {}) });
  return { app, clock, auth, reads, store, model, calls, runtime, delivered, delivery, gates, who, create,
    setUtc: (seconds: number) => { utc = { seconds, nanoseconds: 0 }; } };
}
export async function until(predicate: () => boolean) {
  for (let n = 0; n < 200; n++) { if (predicate()) return; await Promise.resolve(); }
  throw new Error("synthetic checkpoint unavailable");
}
