import type { AsyncConversationIdentity, AsyncOperation, AsyncSavedUser } from "../ports/async-conversation.js";
import type { ConversationCaller, ConversationFailureCode, ConversationOperations, ConversationReadback,
  ConversationResult, ConversationSummaryPage, PrepareConversation, PreparedConversationOperation } from "../ports/conversation-operations.js";
import type { ConversationExecution, ConversationExecutionDelivery, ConversationOperationAuthority,
  ConversationOperationClock, ConversationOperationExecutor, ConversationOperationIdentifiers,
  ConversationOperationReaders, ConversationOperationQuiescence, ConversationOrdinaryContext,
  ConversationTargetLeaseResult, ExecutedConversation } from "../ports/application-conversation-operations.js";
import type { StoredConversationMessage } from "../ports/real-conversation-store.js";
import type { ExecuteReplySelection, SelectedReplyGrant, SelectedReplySnapshot } from "../ports/selected-reply.js";
import { currentReplyDay, validTodayReplySelection } from "./today-reply-selection.js";

const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(v);
const key = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(v);
const validText = (v: unknown): v is string => typeof v === "string" && v.isWellFormed() && /\S/u.test(v) && [...v].length <= 2400;
const failure = <T = never>(code: ConversationFailureCode): ConversationResult<T> => ({ kind: "failure", code });
const success = <T>(value: T): ConversationResult<T> => ({ kind: "success", value });
interface Ticket {
  selection:(SelectedReplySnapshot & {readonly selectionRevision:string;readonly keys:readonly string[];readonly historyKeys:readonly string[]})|undefined;
  selectedGrant:SelectedReplyGrant|undefined;
  replyToMessageId:string|undefined;
  readonly ownerId: string;
  readonly uid: string;
  readonly operation: AsyncOperation;
  readonly session: object;
  readonly tokenIdentity: object;
  digest: string | undefined;
  key: string | undefined;
  phase: "prepared" | "running" | "terminal";
  deliveryAbandoned: boolean;
  readonly expiresAt: number;
  stopExpiry: () => void;
  processing: { text: string } | undefined;
  caller: ConversationCaller | undefined;
  identity: AsyncConversationIdentity | undefined;
  execution: ConversationExecution | undefined;
  barrier: "closed" | "unresolved";
  closing: Promise<boolean> | undefined;
  closePending: boolean;
  dispatchSettled: Promise<void> | undefined;
}
interface TargetHold { readonly mode: "closed" | "idle"; status: "acquiring" | "leased" | "failed" }
interface PendingPreparation { readonly ownerId: string; readonly conversationId: string; revoked: boolean; release(): void }
function stored(v: StoredConversationMessage): boolean {
  if (!v || !uuid(v.messageId) || !Number.isSafeInteger(v.sequence) || v.sequence < 1 ||
      !v.persistedAt || !Number.isSafeInteger(v.persistedAt.seconds) || !Number.isInteger(v.persistedAt.nanoseconds) ||
      v.persistedAt.nanoseconds < 0 || v.persistedAt.nanoseconds >= 1e9) return false;
  return v.role === "user" ? v.availability === "available" && validText(v.text) :
    v.role === "assistant" && (v.availability === "available" ? validText(v.text) : v.availability === "unavailable" && v.text === undefined);
}
function pair(v: ExecutedConversation, operation: AsyncOperation): boolean {
  return !!v && v.operationId === operation.operationId && v.conversationId === operation.conversationId &&
    stored(v.userMessage) && v.userMessage.role === "user" && v.userMessage.messageId === operation.userMessageId &&
    stored(v.assistantMessage) && v.assistantMessage.role === "assistant" && v.assistantMessage.availability === "available" &&
    v.assistantMessage.messageId !== v.userMessage.messageId && v.assistantMessage.sequence > v.userMessage.sequence;
}
function sameMessage(a: StoredConversationMessage, b: StoredConversationMessage): boolean {
  return a.messageId === b.messageId && a.sequence === b.sequence && a.role === b.role && a.availability === b.availability &&
    a.persistedAt.seconds === b.persistedAt.seconds && a.persistedAt.nanoseconds === b.persistedAt.nanoseconds && a.text === b.text;
}

/** Selected N01 consumer; no vendor imports, durable receipt, replay or default success.
 * JIN supplies the concrete executor/store/HTTP sink and authoritative readers.
 * A token-bound control scope is not a new Firebase login/session protocol. */
export class ApplicationConversationOperations implements ConversationOperations, ConversationOperationQuiescence {
  private readonly tickets = new Map<string, Ticket>();
  private readonly preparedOwners = new Map<string, object>();
  private readonly targetHolds = new Map<string, TargetHold>();
  private readonly pendingPreparations = new Set<PendingPreparation>();
  constructor(private readonly authority: ConversationOperationAuthority,
    private readonly identifiers: ConversationOperationIdentifiers, private readonly clock: ConversationOperationClock,
    private readonly executor: ConversationOperationExecutor, private readonly readers: ConversationOperationReaders = {}) {}

  prepare(caller: ConversationCaller, input: PrepareConversation): Promise<ConversationResult<PreparedConversationOperation>> {
    if (!input || input.purpose !== "checkin_conversation" ||
        !(input.kind === "send" && (input.conversationId === undefined || uuid(input.conversationId)) ||
          input.kind === "retry" && uuid(input.conversationId) && uuid(input.userMessageId))) return Promise.resolve(failure("REQUEST_INVALID"));
    return this.ordinary(caller, true, async context => {
      if (input.conversationId !== undefined && this.targetHeld(context.ownerId, input.conversationId)) return failure("AI_OPERATION_CONFLICT");
      const prior = this.preparedOwners.get(context.ownerId);
      if (prior !== undefined) return failure("AI_OPERATION_CONFLICT");
      const reservation = Object.freeze({}); this.preparedOwners.set(context.ownerId, reservation);
      let pending: PendingPreparation | undefined;
      const release = (): void => {
        if (this.preparedOwners.get(context.ownerId) === reservation) this.preparedOwners.delete(context.ownerId);
        if (pending) this.pendingPreparations.delete(pending);
      };
      if (input.conversationId !== undefined) {
        pending = { ownerId: context.ownerId, conversationId: input.conversationId, revoked: false, release };
        this.pendingPreparations.add(pending);
      }
      context.signal.addEventListener("abort", release, { once: true });
      try {
        if (input.conversationId !== undefined) {
          if (!this.readers.verifyTarget) return failure("AI_UNAVAILABLE");
          const target = await this.readers.verifyTarget(context, input.conversationId, input.kind === "retry" ? input.userMessageId : undefined);
          if (!context.current()) return failure("AI_UNAVAILABLE");
          if (pending?.revoked || this.targetHeld(context.ownerId, input.conversationId)) return failure("AI_OPERATION_CONFLICT");
          if (target.kind !== "success") return target;
        }
        let snapshot:SelectedReplySnapshot|undefined;
        if(input.contextSelection!==undefined){
          if(!this.readers.prepareSelection)return failure("AI_UNAVAILABLE");
          const selected=await this.readers.prepareSelection(context,input.contextSelection,input.conversationId);
          if(!context.current())return failure("AI_UNAVAILABLE");if(selected.kind!=="success")return selected;snapshot=selected.value;
          if(!snapshot||!Number.isSafeInteger(snapshot.purposeRevocationGeneration)||snapshot.purposeRevocationGeneration<0||!Array.isArray(snapshot.sources)||
            snapshot.sources.length>5||new Set(snapshot.sources.map(s=>s.checkInId)).size!==snapshot.sources.length||
            snapshot.sources.some(s=>s.kind!=="check_in"||typeof s.checkInId!=="string"||!s.checkInId||typeof s.version!=="string"||!s.version)||
            !Array.isArray(snapshot.historyPairs)||snapshot.historyPairs.length>2||snapshot.historyPairs.some(p=>!uuid(p.userMessageId)||!uuid(p.assistantMessageId)||
              !Number.isSafeInteger(p.userSequence)||p.userSequence<1||!Number.isSafeInteger(p.assistantSequence)||p.assistantSequence<=p.userSequence))return failure("AI_UNAVAILABLE");
          const selection=input.contextSelection;
          if("today" in selection){
            const now=this.clock.utcMilliseconds(),day=currentReplyDay(selection.today.timeZone,now);
            if(!snapshot.today||snapshot.today.timeZone!==selection.today.timeZone||!validTodayReplySelection(snapshot.today,now)||!day||
              snapshot.today.hasMore&&snapshot.sources.length!==5||snapshot.sources.some(s=>s.sourceOccurredAt<day.startUtc||
                (day.endUtc!==null&&s.sourceOccurredAt>=day.endUtc)||!Number.isFinite(Date.parse(s.sourceOccurredAt))||Date.parse(s.sourceOccurredAt)>now))return failure("AI_UNAVAILABLE");
          }else if(snapshot.today!==undefined||snapshot.sources.length!==selection.sources.length||
            snapshot.sources.some(s=>!selection.sources.some(r=>r.checkInId===s.checkInId)))return failure("AI_UNAVAILABLE");
        }
        const operationId = this.identifiers.uuid(), conversationId = input.conversationId ?? this.identifiers.uuid(),
          userMessageId = input.kind === "retry" ? input.userMessageId : this.identifiers.uuid(), operationKey = this.identifiers.operationKey();
        const now = this.clock.now(), utc = this.clock.utcMilliseconds();
        if (pending?.revoked || this.targetHeld(context.ownerId, conversationId)) return failure("AI_OPERATION_CONFLICT");
        if (!context.current() || !uuid(operationId) || !uuid(conversationId) || !uuid(userMessageId) ||
            operationId === conversationId || operationId === userMessageId || conversationId === userMessageId ||
            !key(operationKey) || this.tickets.has(operationId) || !Number.isFinite(now) || !Number.isSafeInteger(utc) ||
            typeof caller.tokenInstance !== "string" || caller.tokenInstance.length === 0) return failure("AI_UNAVAILABLE");
        const ticket: Ticket = { ownerId: context.ownerId, uid: context.principal.firebaseUid,
          selection:snapshot?{...snapshot,...(snapshot.today?{today:Object.freeze({...snapshot.today})}:{}),selectionRevision:this.identifiers.uuid(),keys:snapshot.sources.map(()=>this.identifiers.uuid()),historyKeys:snapshot.historyPairs.map(()=>this.identifiers.uuid())}:undefined,selectedGrant:undefined,replyToMessageId:undefined,
          operation: Object.freeze({ operationId, conversationId, userMessageId, kind: input.kind,
            targetKind: input.kind === "send" && input.conversationId === undefined ? "reserved_new" : "existing" }),
          session: Object.freeze({}), tokenIdentity: Object.freeze({}), digest: caller.tokenInstance, key: operationKey,
          phase: "prepared", deliveryAbandoned: false, expiresAt: now + 15_000, stopExpiry: () => {}, processing: undefined, caller: undefined,
          identity: undefined, execution: undefined, barrier: "closed", closing: undefined, closePending: false, dispatchSettled: undefined };
        const preparationExpiresAt = new Date(utc + 15_000).toISOString();
        if(ticket.selection&&(!uuid(ticket.selection.selectionRevision)||![...ticket.selection.keys,...ticket.selection.historyKeys].every(uuid)||new Set([...ticket.selection.keys,...ticket.selection.historyKeys]).size!==ticket.selection.keys.length+ticket.selection.historyKeys.length))return failure("AI_UNAVAILABLE");
        this.tickets.set(operationId, ticket); this.preparedOwners.set(context.ownerId, ticket);
        ticket.stopExpiry = this.clock.at(ticket.expiresAt, () => { if (ticket.phase === "prepared") this.forget(ticket); });
        return success(Object.freeze({ operationId, conversationId, operationKey, preparationExpiresAt,
          ...(ticket.selection?{contextSelection:{selectionRevision:ticket.selection.selectionRevision,expiresAt:preparationExpiresAt,
            ...(ticket.selection.today?{today:ticket.selection.today}:{}),
            historyPairs:ticket.selection.historyPairs.map((p,i)=>({...p,historyKey:ticket.selection!.historyKeys[i]!})),
            sourceCards:ticket.selection.sources.map((s,i)=>({cardRef:ticket.selection!.keys[i]!,kind:s.kind,version:s.version,sourceOccurredAt:s.sourceOccurredAt,
              ...(ticket.selection!.today?{checkInId:s.checkInId}:{}),
              observedAt:s.observedAt,state:"available" as const,canNavigate:true as const,selectionKey:ticket.selection!.keys[i]!}))}}:{}) }));
      } catch { return failure("AI_UNAVAILABLE"); }
      finally { context.signal.removeEventListener("abort", release); release(); }
    });
  }

  execute(caller: ConversationCaller, input: { readonly operationId: string; readonly operationKey: string; readonly text: string;
    readonly contextSelection?:ExecuteReplySelection;readonly replyToMessageId?:string },
    delivery: ConversationExecutionDelivery): Promise<ConversationResult<ExecutedConversation>> {
    // Body validation always precedes single consumption, including invalid Unicode.
    if (!input || !uuid(input.operationId) || !key(input.operationKey)) return Promise.resolve(failure("REQUEST_INVALID"));
    if (!validText(input.text)) return Promise.resolve(failure("AI_INPUT_INVALID"));
    const ticket = this.lookup(caller, input.operationId, input.operationKey);
    if (!ticket) return Promise.resolve(failure("AI_OPERATION_UNAVAILABLE"));
    if (this.targetHeld(ticket.ownerId, ticket.operation.conversationId)) return Promise.resolve(failure("AI_OPERATION_CONFLICT"));
    if (ticket.phase !== "prepared") return Promise.resolve(failure("AI_OPERATION_CONFLICT"));
    if (!this.preparedCurrent(ticket)) { this.forget(ticket); return Promise.resolve(failure("AI_OPERATION_UNAVAILABLE")); }
    const choice=input.contextSelection,selection=ticket.selection;
    if((selection!==undefined)!==(choice!==undefined))return Promise.resolve(failure("AI_CONTEXT_SELECTION_CONFLICT"));
    if(selection?.today&&!validTodayReplySelection(selection.today,this.clock.utcMilliseconds()))return Promise.resolve(failure("AI_CONTEXT_SELECTION_CONFLICT"));
    if(selection&&choice){
      if(choice.selectionRevision!==selection.selectionRevision||!Array.isArray(choice.includedKeys)||!Array.isArray(choice.excludedKeys)||
        new Set(choice.includedKeys).size!==choice.includedKeys.length||new Set(choice.excludedKeys).size!==choice.excludedKeys.length||
        [...choice.includedKeys,...choice.excludedKeys].some(k=>!selection.keys.includes(k))||selection.keys.some(k=>!choice.includedKeys.includes(k)&&!choice.excludedKeys.includes(k))||
        (choice.excludedHistoryKeys!==undefined&&(!Array.isArray(choice.excludedHistoryKeys)||choice.excludedHistoryKeys.length>2||new Set(choice.excludedHistoryKeys).size!==choice.excludedHistoryKeys.length||choice.excludedHistoryKeys.some(k=>!selection.historyKeys.includes(k)))))return Promise.resolve(failure("AI_CONTEXT_SELECTION_CONFLICT"));
    }
    if(input.replyToMessageId!==undefined&&(!uuid(input.replyToMessageId)||ticket.operation.targetKind!=="existing"))return Promise.resolve(failure("AI_CONTEXT_SELECTION_CONFLICT"));
    // Old Transport cannot satisfy F02. Preserve the prepared ticket for the real
    // capability to arrive within its original 15s, rather than consume it falsely.
    if (!delivery || typeof delivery.acceptCompleteBody !== "function") return Promise.resolve(failure("AI_UNAVAILABLE"));
    if (!this.deliveryCurrent(delivery)) return Promise.resolve({ kind: "terminated" });
    ticket.selectedGrant=selection&&choice?Object.freeze({...(selection.processing ? {processing:selection.processing,...(selection.processing === "cloud" ? {cloudAiConsentGeneration:selection.cloudAiConsentGeneration!} : {})} : {}),purposeRevocationGeneration:selection.purposeRevocationGeneration,selectionRevision:selection.selectionRevision,
      ...(selection.today?{today:Object.freeze({...selection.today})}:{}),
      sources:Object.freeze(selection.sources.map((s,i)=>Object.freeze({...s,selectionKey:selection.keys[i]!}))),includedKeys:Object.freeze([...choice.includedKeys]),excludedKeys:Object.freeze([...choice.excludedKeys]),
      historyPairs:Object.freeze(selection.historyPairs.map((p,i)=>Object.freeze({...p,historyKey:selection.historyKeys[i]!}))),excludedHistoryKeys:Object.freeze([...(choice.excludedHistoryKeys??[])])}):undefined;
    ticket.replyToMessageId=input.replyToMessageId;
    ticket.phase = "running"; ticket.stopExpiry();
    if (this.preparedOwners.get(ticket.ownerId) === ticket) this.preparedOwners.delete(ticket.ownerId);
    ticket.processing = { text: input.text }; ticket.caller = caller;
    ticket.identity = Object.freeze({ principal: Object.freeze({ firebaseUid: ticket.uid }), ownerId: ticket.ownerId,
      session: ticket.session, tokenInstance: ticket.tokenIdentity, originalRequest: Object.freeze({}) });
    let settled!: () => void;
    ticket.dispatchSettled = new Promise<void>(resolve => { settled = resolve; });
    return this.run(ticket, delivery).finally(settled);
  }
  private async run(ticket: Ticket, delivery: ConversationExecutionDelivery): Promise<ConversationResult<ExecutedConversation>> {
    let acceptedPair: ExecutedConversation | undefined;
    const alive = (): boolean => ticket.phase === "running" && !!ticket.processing && this.targetAllowsDispatch(ticket) && this.deliveryCurrent(delivery);
    const abort = (): void => { this.terminal(ticket); void this.close(ticket); };
    delivery.signal.addEventListener("abort", abort, { once: true });
    try {
      if (!alive()) return { kind: "terminated" };
      const authorization = await this.ordinary(ticket.caller!, true, async context => {
        if (!alive()) return { kind: "terminated" } as const;
        if (context.ownerId !== ticket.ownerId) return failure("AI_AUTHORITY_CHANGED");
        if (ticket.operation.kind !== "retry") return success(undefined);
        if (!this.readers.retryUser) return failure("AI_UNAVAILABLE");
        const observed = await this.readers.retryUser(context, ticket.operation, () => alive() ? ticket.processing?.text : undefined);
        if (!alive()) return { kind: "terminated" } as const;
        if (observed.kind !== "success") return observed;
        const u = observed.value;
        if (!stored(u) || u.role !== "user" || u.messageId !== ticket.operation.userMessageId || u.text !== ticket.processing?.text)
          return failure("AI_OPERATION_CONFLICT");
        if(ticket.replyToMessageId!==undefined&&ticket.replyToMessageId!==u.replyToMessageId)return failure("AI_CONTEXT_SELECTION_CONFLICT");
        ticket.replyToMessageId=u.replyToMessageId;
        const saved: AsyncSavedUser = Object.freeze({ messageId: u.messageId, sequence: u.sequence,
          persistedAt: Object.freeze({ seconds: u.persistedAt.seconds, nanoseconds: u.persistedAt.nanoseconds }) });
        return success(saved);
      });
      if (!alive()) return { kind: "terminated" };
      if (authorization.kind !== "success") return authorization;
      const identity = ticket.identity!;
      const execution = this.executor.create({ identity, operation: ticket.operation,
        ...(ticket.selectedGrant?{selectedReply:ticket.selectedGrant}:{}),...(ticket.replyToMessageId?{replyToMessageId:ticket.replyToMessageId}:{}),
        text: () => alive() ? ticket.processing?.text : undefined,
        ...(authorization.value === undefined ? {} : { retryUser: authorization.value }),
        verifyCurrentAuth: () => ticket.caller && alive() ? ticket.caller.verifyCurrentAuth() : Promise.resolve({ kind: "dependency_unavailable" }) },
      { signal: delivery.signal, current: alive, onTerminal: () => this.terminal(ticket, false), acceptCompleteBody: value => {
        const retry = authorization.value;
        if (!alive() || acceptedPair !== undefined || !pair(value, ticket.operation) || value.userMessage.text !== ticket.processing?.text ||
            (retry && (value.userMessage.sequence !== retry.sequence || value.userMessage.persistedAt.seconds !== retry.persistedAt.seconds ||
              value.userMessage.persistedAt.nanoseconds !== retry.persistedAt.nanoseconds))) return false;
        try {
          if (delivery.acceptCompleteBody!(value) !== true) return false;
          acceptedPair = value; return true;
        } catch { return false; }
      } });
      ticket.execution = execution; ticket.barrier = "unresolved";
      if (!alive()) { this.terminal(ticket); await this.close(ticket); return { kind: "terminated" }; }
      const result = await execution.dispatch();
      // Runtime disposal is synchronous, so phase can already be terminal here.
      // A selected queue/generation failure may still be returned by the executor
      // under its original live delivery right; external abandonment cannot.
      if ((!this.deliveryCurrent(delivery) || ticket.deliveryAbandoned) && acceptedPair === undefined) return { kind: "terminated" };
      if (result.kind !== "success") return result;
      if (!alive() && acceptedPair === undefined) return { kind: "terminated" };
      if (!acceptedPair || !pair(result.value, ticket.operation) || !sameMessage(acceptedPair.userMessage, result.value.userMessage) ||
          !sameMessage(acceptedPair.assistantMessage, result.value.assistantMessage)) return failure("AI_OUTCOME_UNRESOLVED");
      // Request-local completion only. No result/body is written into the registry.
      return result;
    } catch { return failure("AI_OUTCOME_UNRESOLVED"); }
    finally {
      delivery.signal.removeEventListener("abort", abort);
      this.terminal(ticket);
      const close = this.close(ticket);
      if (acceptedPair !== undefined) void close.then(confirmed => { if (confirmed) this.forget(ticket); });
      else if (!ticket.execution) this.forget(ticket);
      acceptedPair = undefined;
    }
  }

  cancel(caller: ConversationCaller, input: { readonly operationId: string; readonly operationKey: string }): Promise<ConversationResult<{ readonly operationId: string; readonly state: "terminal" }>> {
    if (!input || !uuid(input.operationId) || !key(input.operationKey)) return Promise.resolve(failure("REQUEST_INVALID"));
    const ticket = this.lookup(caller, input.operationId, input.operationKey);
    if (!ticket) return Promise.resolve(failure("AI_OPERATION_UNAVAILABLE"));
    if (ticket.phase === "prepared" && !this.preparedCurrent(ticket)) { this.forget(ticket); return Promise.resolve(failure("AI_OPERATION_UNAVAILABLE")); }
    // The trusted exact original token/key control closes local dispatch before
    // any fresh-auth or durable-barrier await. A new request object is not used.
    this.terminal(ticket); const closing = this.close(ticket, true);
    return this.ordinary(caller, false, async context => {
      if (context.ownerId !== ticket.ownerId) return failure("AI_OPERATION_UNAVAILABLE");
      const barrier = await closing;
      if (!context.current()) return failure("AI_OUTCOME_UNRESOLVED");
      return barrier ? success({ operationId: ticket.operation.operationId, state: "terminal" as const }) : failure("AI_OUTCOME_UNRESOLVED");
    }).finally(() => { if (!ticket.execution) this.forget(ticket); });
  }

  readOutcome(caller: ConversationCaller, conversationId: string, operationId: string): Promise<ConversationResult<ConversationReadback>> {
    if (!uuid(conversationId) || !uuid(operationId)) return Promise.resolve(failure("REQUEST_INVALID"));
    return this.ordinary(caller, false, async context => {
      const ticket = this.tickets.get(operationId);
      const original = ticket?.ownerId === context.ownerId && ticket.operation.conversationId === conversationId ? ticket : undefined;
      if (original?.phase === "running") return success({ operationId, state: "active" as const });
      if (!this.readers.readOutcome) return failure("AI_UNAVAILABLE");
      const result = await this.readers.readOutcome(context, conversationId, operationId, original?.operation);
      if (!context.current()) return failure("AI_UNAVAILABLE");
      if (result.kind !== "success") return result;
      const value = result.value;
      if (!value || value.operationId !== operationId) return failure("AI_OUTCOME_UNRESOLVED");
      if (value.state === "no_effect") {
        // Ordinary absence alone, a new process, or a deleted existing target is
        // never proof. The reader must additionally prove authoritative absence.
        if (!original || original.phase !== "terminal" || original.barrier !== "closed" || original.operation.targetKind !== "reserved_new")
          return success({ operationId, state: "unresolved" as const });
      } else if (value.state === "user_saved" || value.state === "assistant_saved") {
        if (!stored(value.userMessage) || value.userMessage.role !== "user" ||
            (original && value.userMessage.messageId !== original.operation.userMessageId)) return failure("AI_OUTCOME_UNRESOLVED");
        if (value.state === "assistant_saved" && (!stored(value.assistantMessage) || value.assistantMessage.role !== "assistant" ||
            value.assistantMessage.messageId === value.userMessage.messageId || value.assistantMessage.sequence <= value.userMessage.sequence))
          return failure("AI_OUTCOME_UNRESOLVED");
        // The actual reader must check durable ALL-pending evidence too. This
        // local guard prevents an older read from releasing a newer in-flight
        // same-U command before its lower-level claim has even been submitted.
        if ([...this.tickets.values()].some(other => other.ownerId === context.ownerId && other.operation.conversationId === conversationId &&
            other.operation.userMessageId === value.userMessage.messageId && other.operation.operationId !== operationId &&
            (other.phase === "running" || (other.phase === "terminal" && other.barrier === "unresolved"))))
          return success({ operationId, state: "unresolved" as const });
      } else if (value.state !== "active" && value.state !== "unresolved") return failure("AI_OUTCOME_UNRESOLVED");
      if (original?.phase === "terminal" && value.state !== "unresolved" && value.state !== "active") this.forget(original);
      return result;
    });
  }
  listConversations(caller: ConversationCaller, after: string | undefined): Promise<ConversationResult<ConversationSummaryPage>> {
    if (after !== undefined && !uuid(after)) return Promise.resolve(failure("REQUEST_INVALID"));
    return this.ordinary(caller, true, async context => {
      if (!this.readers.listConversations) return failure("AI_UNAVAILABLE");
      const result = await this.readers.listConversations(context, after);
      if (!context.current()) return failure("AI_UNAVAILABLE");
      if (result.kind !== "success") return result;
      const page = result.value;
      if (!page || !Array.isArray(page.conversations) || page.conversations.length > 20 ||
          page.conversations.some((row, i) => !row || !uuid(row.conversationId) ||
            (after !== undefined && row.conversationId <= after) ||
            (i > 0 && row.conversationId <= page.conversations[i - 1]!.conversationId) ||
            typeof row.lastMessageAt !== "string" || new Date(row.lastMessageAt).toISOString() !== row.lastMessageAt) ||
          (page.nextCursor !== undefined && (!uuid(page.nextCursor) ||
            (after !== undefined && page.nextCursor <= after) ||
            page.conversations.some(row => row.conversationId > page.nextCursor!)))) return failure("AI_UNAVAILABLE");
      // A history read is not a capability to retain results across revocation.
      // Recheck both actual Auth and purpose after the awaited storage work.
      const verified = await caller.verifyCurrentAuth();
      if (!context.current()) return failure("AI_UNAVAILABLE");
      if (verified.kind !== "verified") return failure(verified.kind === "invalid" ? "AUTH_REQUIRED" :
        verified.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AI_UNAVAILABLE");
      if (verified.principal.firebaseUid !== context.principal.firebaseUid) return failure("AUTH_FORBIDDEN");
      const current = await this.authority.resolve(caller, true, context);
      if (!context.current()) return failure("AI_UNAVAILABLE");
      if (current.kind !== "success") return current;
      return current.value.ownerId === context.ownerId ? result : failure("AUTH_FORBIDDEN");
    });
  }
  listMessages(caller: ConversationCaller, conversationId: string, before: number | undefined): Promise<ConversationResult<{ readonly messages: readonly StoredConversationMessage[]; readonly nextBefore?: number }>> {
    if (!uuid(conversationId) || (before !== undefined && (!Number.isSafeInteger(before) || before < 1))) return Promise.resolve(failure("REQUEST_INVALID"));
    return this.ordinary(caller, false, async context => {
      if (!this.readers.listMessages) return failure("AI_UNAVAILABLE");
      const result = await this.readers.listMessages(context, conversationId, before);
      if (!context.current()) return failure("AI_UNAVAILABLE");
      if (result.kind !== "success") return result;
      const value = result.value;
      if (!value || !Array.isArray(value.messages) || value.messages.length > 20 ||
          new Set(value.messages.map(m => m.messageId)).size !== value.messages.length ||
          value.messages.some((m, i) => !stored(m) || (i > 0 && m.sequence <= value.messages[i - 1]!.sequence) ||
            (before !== undefined && m.sequence >= before)) ||
          (value.nextBefore !== undefined && (!Number.isSafeInteger(value.nextBefore) || value.nextBefore < 1 || value.nextBefore !== value.messages[0]?.sequence)))
        return failure("AI_UNAVAILABLE");
      return result;
    });
  }
  deleteConversation(caller: ConversationCaller, conversationId: string): Promise<ConversationResult<void>> {
    if (!uuid(conversationId)) return Promise.resolve(failure("REQUEST_INVALID"));
    return this.ordinary(caller, false, async context => {
      if (!this.readers.deleteConversation) return failure("AI_UNAVAILABLE");
      for (const ticket of this.tickets.values()) {
        if (ticket.ownerId === context.ownerId && ticket.operation.conversationId === conversationId) { this.terminal(ticket); void this.close(ticket); }
      }
      const result = await this.readers.deleteConversation(context, conversationId);
      if (!context.current()) return failure("AI_OUTCOME_UNRESOLVED");
      if (result.kind === "success") {
        for (const ticket of this.tickets.values()) if (ticket.ownerId === context.ownerId && ticket.operation.conversationId === conversationId) this.forget(ticket);
      }
      return result;
    });
  }

  async acquireTargetLease(ownerAccountId: string, conversationId: string,
    mode: "closed" | "idle"): Promise<ConversationTargetLeaseResult> {
    if (!uuid(ownerAccountId) || !uuid(conversationId) || (mode !== "closed" && mode !== "idle")) return { kind: "unresolved" };
    const target = this.targetKey(ownerAccountId, conversationId), previous = this.targetHolds.get(target);
    if (previous && previous.status !== "failed") return { kind: "unresolved" };
    // No yielding operation occurs before the target admission hold is installed.
    // A later explicit attempt may replace a failed content-free hold; no timer or
    // background retry releases it and no old lease can release this generation.
    const hold: TargetHold = { mode, status: "acquiring" }; this.targetHolds.set(target, hold);
    const matching = [...this.tickets.values()].filter(t => t.ownerId === ownerAccountId && t.operation.conversationId === conversationId);
    const formerlyTerminal = new Set(matching.filter(t => t.phase === "terminal"));
    if (mode === "closed") {
      for (const pending of this.pendingPreparations) {
        if (pending.ownerId === ownerAccountId && pending.conversationId === conversationId) { pending.revoked = true; pending.release(); }
      }
      // Revoke every matching local writer before starting ANY close transaction.
      for (const ticket of matching) this.terminal(ticket);
    }
    try {
      const closing = matching.map(ticket => mode === "closed" || formerlyTerminal.has(ticket) ? this.close(ticket, true) : undefined);
      await Promise.all(matching.map(ticket => ticket.dispatchSettled));
      const barriers = await Promise.all(matching.map((ticket, i) => closing[i] ??
        (ticket.phase === "prepared" ? Promise.resolve(true) : this.close(ticket))));
      if (barriers.some(confirmed => !confirmed) || this.targetHolds.get(target) !== hold) {
        hold.status = "failed"; return { kind: "unresolved" };
      }
      hold.status = "leased";
      return { kind: "acquired", lease: Object.freeze({ ownerAccountId, conversationId, mode,
        current: () => this.targetHolds.get(target) === hold && hold.status === "leased",
        release: () => { if (this.targetHolds.get(target) === hold && hold.status === "leased") this.targetHolds.delete(target); } }) };
    } catch {
      hold.status = "failed"; return { kind: "unresolved" };
    }
  }

  private targetKey(ownerAccountId: string, conversationId: string): string { return `${ownerAccountId}/${conversationId}`; }
  private targetHeld(ownerAccountId: string, conversationId: string): boolean { return this.targetHolds.has(this.targetKey(ownerAccountId, conversationId)); }
  private targetAllowsDispatch(ticket: Ticket): boolean {
    const hold = this.targetHolds.get(this.targetKey(ticket.ownerId, ticket.operation.conversationId));
    // An idle acquisition drains already running commands without revoking them;
    // every new execute is separately refused before its synchronous consumption.
    return hold === undefined || (hold.mode === "idle" && hold.status === "acquiring");
  }

  private lookup(caller: ConversationCaller, operationId: string, operationKey: string): Ticket | undefined {
    const t = this.tickets.get(operationId);
    return t && t.uid === caller.principal.firebaseUid && t.digest === caller.tokenInstance && t.key === operationKey ? t : undefined;
  }
  private preparedCurrent(t: Ticket): boolean { return this.clock.now() < t.expiresAt; }
  private deliveryCurrent(delivery: ConversationExecutionDelivery): boolean {
    try { return !delivery.signal.aborted && delivery.current() === true; } catch { return false; }
  }
  private terminal(t: Ticket, abandoned = true): void {
    if (abandoned) t.deliveryAbandoned = true;
    if (t.phase === "terminal") return;
    t.phase = "terminal"; t.stopExpiry();
    if (this.preparedOwners.get(t.ownerId) === t) this.preparedOwners.delete(t.ownerId);
    if (t.processing) t.processing.text = "";
    t.processing = undefined; t.caller = undefined;t.selection=undefined;t.selectedGrant=undefined;t.replyToMessageId=undefined;
    try { t.execution?.dispose(); } catch { /* Fail closed; no private result is retained. */ }
  }
  private close(t: Ticket, explicit = false): Promise<boolean> {
    if (!t.execution || t.barrier === "closed") { if (t.phase === "terminal") this.revokeControls(t); return Promise.resolve(true); }
    if (t.closing && (t.closePending || !explicit)) return t.closing;
    t.closePending = true;
    let attempt: ReturnType<ConversationExecution["cancel"]>;
    try { attempt = t.execution.cancel(); } catch { attempt = Promise.resolve({ kind: "unresolved" }); }
    t.closing = attempt.then(result => {
      t.closePending = false; this.revokeControls(t);
      if (result.kind === "closed" && result.operationId === t.operation.operationId && result.conversationId === t.operation.conversationId) {
        t.barrier = "closed"; return true;
      }
      return false;
    }, () => { t.closePending = false; this.revokeControls(t); return false; });
    return t.closing;
  }
  private revokeControls(t: Ticket): void { t.digest = undefined; t.key = undefined; }
  private forget(t: Ticket): void {
    this.terminal(t); t.digest = undefined; t.key = undefined; t.identity = undefined; t.execution = undefined;
    if (this.tickets.get(t.operation.operationId) === t) this.tickets.delete(t.operation.operationId);
  }
  private async ordinary<T>(caller: ConversationCaller, requirePurpose: boolean,
    work: (context: ConversationOrdinaryContext) => Promise<ConversationResult<T>>): Promise<ConversationResult<T>> {
    const controller = new AbortController(); const started = this.clock.now(), deadline = started + 15_000;
    let active = true;
    const current = (): boolean => active && !controller.signal.aborted && this.clock.now() >= started && this.clock.now() < deadline;
    const expired = new Promise<ConversationResult<T>>(resolve => { controller.signal.addEventListener("abort", () => resolve(failure("AI_UNAVAILABLE")), { once: true }); });
    const stop = this.clock.at(deadline, () => controller.abort());
    try {
      const result = await Promise.race([expired, (async (): Promise<ConversationResult<T>> => {
        if (!current()) return failure("AI_UNAVAILABLE");
        const verified = await caller.verifyCurrentAuth();
        if (!current()) return failure("AI_UNAVAILABLE");
        if (verified.kind !== "verified") return failure(verified.kind === "invalid" ? "AUTH_REQUIRED" : verified.kind === "forbidden" ? "AUTH_FORBIDDEN" : "AI_UNAVAILABLE");
        if (verified.principal.firebaseUid !== caller.principal.firebaseUid) return failure("AUTH_FORBIDDEN");
        const resolved = await this.authority.resolve(caller, requirePurpose, { signal: controller.signal, deadline, current });
        if (!current()) return failure("AI_UNAVAILABLE");
        if (resolved.kind !== "success") return resolved;
        if (!uuid(resolved.value.ownerId)) return failure("AI_UNAVAILABLE");
        return work({ principal: verified.principal, ownerId: resolved.value.ownerId, signal: controller.signal, deadline, current });
      })()]);
      return current() ? result : failure("AI_UNAVAILABLE");
    } catch { return failure("AI_UNAVAILABLE"); }
    finally { active = false; stop(); controller.abort(); }
  }
}
