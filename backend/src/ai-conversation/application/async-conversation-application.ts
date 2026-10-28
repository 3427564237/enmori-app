import type { CloudAiConsentAuthority } from "../../account/ports/cloud-ai-consent-authority.js";
import { BoundedAiRuntime, type Cancellation, type RuntimeApplicationControl,
  type RuntimeApplicationRequest, type RuntimeApplicationWork, type RuntimeFailure } from "../../ai-runtime/application/bounded-ai-runtime.js";
import type { OutputCandidate } from "../../ai-runtime/domain/parse-output.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { AsyncAssistantWriteObservation, AsyncClaimSettlement, AsyncCloseObservation,
  AsyncConversationAuthority, AsyncConversationClock, AsyncConversationCommandInput,
  AsyncConversationDelivery, AsyncConversationGates, AsyncConversationIdentity,
  AsyncConversationModelInput, AsyncConversationStore, AsyncEffectContext, AsyncEffectIdentity,
  AsyncOperation, AsyncSavedUser, AsyncUserWriteObservation } from "../ports/async-conversation.js";
import type { AcceptedAssistant, ConversationInput } from "../ports/conversation-lifecycle.js";
import type { AcceptedContextRead, ContextDependencies, ConversationHistory, RealContextReadPort } from "../ports/real-context-reader.js";
import { PreparedRealContextReader } from "./real-context-reader.js";
import { SelectedReplyReader } from "./selected-reply-reader.js";
import type { SelectedReplyGrant, SelectedReplyReadPort, SelectedReplyFailure } from "../ports/selected-reply.js";

export type AsyncConversationCommand = object;
export type AsyncConversationAdmission = { readonly accepted: true;
  readonly request: Pick<RuntimeApplicationRequest, "acceptedAt" | "deadline" | "outcome"> }
  | { readonly accepted: false; readonly failure: "stale_authority" | "invalid_input" | "overload" | "dependency_unavailable" };
interface Processing { text: string; candidate: OutputCandidate | undefined }
interface State {
  cloudGeneration: number | undefined;
  cloudLease: Extract<Awaited<ReturnType<CloudAiConsentAuthority["read"]>>, {kind:"authorized"}> | undefined;
  selectedReply:SelectedReplyGrant|undefined;
  replyToMessageId:string|undefined;
  readonly identity: AsyncConversationIdentity;
  readonly operation: AsyncOperation;
  readonly retryUser: AsyncSavedUser | undefined;
  processing: Processing | undefined;
  history: ConversationHistory | undefined;
  dispatch: Promise<AsyncConversationAdmission> | undefined;
  control: RuntimeApplicationControl | undefined;
  reader: PreparedRealContextReader | SelectedReplyReader | undefined;
  context: AsyncEffectContext | undefined;
  readerReady: Promise<string> | undefined;
  terminal: boolean;
  disposeCount: number;
  fenceIssued: boolean;
  uncertain: boolean;
  user: AsyncSavedUser | undefined;
  assistantMessageId: string | undefined;
  close: Promise<AsyncCloseObservation> | undefined;
  closePending: boolean;
  barrier: "closed" | "unresolved";
  checkingResult: boolean;
}
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);
const object = (value: unknown): value is object => typeof value === "object" && value !== null;
function instant(value: FullPrecisionInstant): FullPrecisionInstant {
  if (!value || !Number.isSafeInteger(value.seconds) || !Number.isInteger(value.nanoseconds) ||
      value.nanoseconds < 0 || value.nanoseconds >= 1e9) throw new Error("unavailable");
  return Object.freeze({ seconds: value.seconds, nanoseconds: value.nanoseconds });
}
function user(value: AsyncSavedUser): AsyncSavedUser {
  if (!value || !uuid(value.messageId) || !Number.isSafeInteger(value.sequence) || value.sequence < 1) throw new Error("unavailable");
  return Object.freeze({ messageId: value.messageId, sequence: value.sequence, persistedAt: instant(value.persistedAt) });
}
const sameUser = (a: AsyncSavedUser, b: AsyncSavedUser): boolean => a.messageId === b.messageId &&
  a.sequence === b.sequence && a.persistedAt.seconds === b.persistedAt.seconds && a.persistedAt.nanoseconds === b.persistedAt.nanoseconds;

/**
 * S-PM-1014-LI-AI-ACCELERATION: real asynchronous inner orchestration.
 * Unwired until JIN's selected storage/HTTP/Bootstrap adapters are supplied.
 * Never inserts asynchronous SDK work into the strict fake effect(commit) Port.
 */
export class AsyncConversationApplication {
  private readonly states = new WeakMap<AsyncConversationCommand, State>();
  constructor(private readonly runtime: BoundedAiRuntime<AsyncConversationModelInput>,
    private readonly authority: AsyncConversationAuthority, private readonly reads: RealContextReadPort,
    private readonly store: AsyncConversationStore, private readonly gates: AsyncConversationGates,
    private readonly sink: AsyncConversationDelivery, private readonly clock: AsyncConversationClock,
    private readonly strategy?: "open_conversation_v1",private readonly selectedReads?:SelectedReplyReadPort,
    private readonly selectedFailure?:(kind:SelectedReplyFailure)=>void,
    private readonly cloudConsent?: CloudAiConsentAuthority) {
      if (cloudConsent && strategy !== 'open_conversation_v1') throw Error('CLOUD_STRATEGY_REQUIRED');
    }

  /** Input is from a verified, consumed N01 ticket, never an ordinary untrusted DTO. */
  create(input: AsyncConversationCommandInput): AsyncConversationCommand {
    const command = Object.freeze({});
    const identity = Object.freeze({ principal: Object.freeze({ firebaseUid: input.identity.principal.firebaseUid }),
      ownerId: input.identity.ownerId, session: input.identity.session, tokenInstance: input.identity.tokenInstance,
      originalRequest: input.identity.originalRequest });
    const operation = Object.freeze({ operationId: input.operation.operationId, conversationId: input.operation.conversationId,
      userMessageId: input.operation.userMessageId, kind: input.operation.kind, targetKind: input.operation.targetKind });
    const state: State = { cloudGeneration: undefined, cloudLease: undefined, identity, operation, retryUser: input.retryUser === undefined ? undefined : user(input.retryUser),
      selectedReply:input.selectedReply,replyToMessageId:input.replyToMessageId,
      history: undefined, processing: { text: input.text, candidate: undefined }, dispatch: undefined, control: undefined,
      reader: undefined, context: undefined, readerReady: undefined, terminal: false, disposeCount: 0,
      fenceIssued: false, uncertain: false, user: undefined, assistantMessageId: undefined,
      close: undefined, closePending: false, barrier: "unresolved", checkingResult: false };
    this.states.set(command, state);
    return command;
  }

  dispatch(command: AsyncConversationCommand): Promise<AsyncConversationAdmission> {
    const state = this.states.get(command);
    if (!state) return Promise.resolve({ accepted: false, failure: "stale_authority" });
    // One dispatch/purpose check per consumed command, including concurrent callers.
    state.dispatch ??= this.admit(state);
    return state.dispatch;
  }
  private async admit(s: State): Promise<AsyncConversationAdmission> {
    try {
      if (s.terminal || !this.originalCurrent(s)) return this.reject(s, "stale_authority");
      if (!this.validInput(s)) return this.reject(s, "invalid_input");
      if ((s.selectedReply?.processing ?? 'local') !== (this.cloudConsent ? 'cloud' : 'local') && s.selectedReply) return this.reject(s, 'stale_authority');
      const authorized = await this.authority.preaccept(s.identity, s.operation);
      if (s.terminal || !this.originalCurrent(s)) return this.reject(s, "stale_authority");
      if (authorized !== "authorized") return this.reject(s, authorized === "denied" ? "stale_authority" : "dependency_unavailable");
      const admitted = this.runtime.submitApplication(s.identity.ownerId, control => {
        s.control = control;
        try {
          // One synchronous acceptance event fixes both clocks/original identity.
          const read: AcceptedContextRead = Object.freeze({ principal: s.identity.principal,
            ownerId: s.identity.ownerId, session: s.identity.session, originalRequest: s.identity.originalRequest,
            acceptedAt: control.acceptedAt, deadline: control.deadline, asOf: instant(this.clock.utcNow()), signal: control.signal });
          s.reader = s.selectedReply?new SelectedReplyReader(read,s.selectedReply,this.selectedReads,()=>this.clock.monotonicNow(),()=>this.live(s),kind=>this.selectedFailure?.(kind)):
            new PreparedRealContextReader(read, this.reads, () => this.clock.monotonicNow(), () => this.live(s));
          s.context = Object.freeze({ identity: s.identity, operation: s.operation, read, budget: control,
            originalCurrent: () => this.live(s), dependencies: () => this.dependencies(s) });
          // Starts at acceptance, including while queued; never first captures at dequeue.
          s.readerReady = s.reader.prepare();
        } catch { control.fail("dependency_unavailable"); }
        return this.work(s);
      });
      if (!admitted.accepted) { this.dispose(s); return admitted; }
      return Object.freeze({ accepted: true, request: Object.freeze({ acceptedAt: admitted.request.acceptedAt,
        deadline: admitted.request.deadline, outcome: admitted.request.outcome }) });
    } catch { return this.reject(s, "dependency_unavailable"); }
  }

  /**
   * Synchronous local terminal/disposal precedes any asynchronous durable close.
   * caller is the ORIGINAL control capability looked up by Transport AFTER
   * verifying the Cancel request's original token/key, not its new HTTP object.
   */
  cancel(command: AsyncConversationCommand, caller: AsyncConversationIdentity, reason: Cancellation = "cancelled"): Promise<AsyncCloseObservation> {
    const s = this.states.get(command);
    if (!s || !this.sameOriginal(s.identity, caller)) return Promise.resolve({ kind: "unresolved" });
    s.control?.fail(reason);
    this.dispose(s);
    return this.close(s);
  }
  /**
   * One new same-session read per explicit Check result action, no concurrent
   * duplicate/polling/generation. Transport binds the ordinary read's 15s budget
   * and abort to caller's trusted current(originalRequest) guard. HTTP history
   * reads are separate; a later explicit action may check unresolved state again.
   */
  async checkResult(command: AsyncConversationCommand, caller: AsyncConversationIdentity): Promise<"resolved" | "unresolved"> {
    const s = this.states.get(command);
    if (!s || !s.terminal || s.checkingResult || !this.sameOwnerSession(s.identity, caller)) return "unresolved";
    s.checkingResult = true;
    try {
      if (!this.authority.current(caller) || await this.authority.freshAuth(caller) !== "authorized" ||
          !this.authority.current(caller)) return "unresolved";
      if ((await this.close(s, true)).kind !== "closed" || !this.authority.current(caller)) return "unresolved";
      const result = await this.store.reconcile(caller, s.operation);
      if (!this.authority.current(caller) || result.kind !== "resolved" || !this.matches(s, result)) return "unresolved";
      if (result.assistantMessageId !== undefined && (!uuid(result.assistantMessageId) || !result.user)) return "unresolved";
      const observed = result.user === undefined ? undefined : user(result.user);
      if (observed && (observed.messageId !== s.operation.userMessageId || (s.retryUser && !sameUser(observed, s.retryUser)))) return "unresolved";
      // Reconciliation cannot erase a previously confirmed canonical effect/pair.
      if ((s.user && (!observed || !sameUser(s.user, observed))) ||
          (s.assistantMessageId && s.assistantMessageId !== result.assistantMessageId)) return "unresolved";
      s.user = observed; s.assistantMessageId = result.assistantMessageId; s.uncertain = false;
      return "resolved";
    } catch { return "unresolved"; }
    finally { s.checkingResult = false; }
  }
  inspect(command: AsyncConversationCommand): Readonly<{ terminal: boolean; processing: boolean;
    uncertain: boolean; barrier: "closed" | "unresolved"; userCommitted: boolean; assistantCommitted: boolean; disposeCount: number }> | undefined {
    const s = this.states.get(command);
    return s && Object.freeze({ terminal: s.terminal, processing: !!s.processing, uncertain: s.uncertain,
      barrier: s.barrier, userCommitted: !!s.user, assistantCommitted: !!s.assistantMessageId, disposeCount: s.disposeCount });
  }
  /** Trusted deletion/revocation notification is an accelerator, not current-read proof. */
  invalidate(command: AsyncConversationCommand): void {
    const s = this.states.get(command);
    if (s) { this.fail(s, "stale_authority"); this.dispose(s); }
  }
  private validInput(s: State): boolean {
    const p = s.processing, i = s.identity, o = s.operation;
    return !!p && typeof p.text === "string" && p.text.isWellFormed() && [...p.text].length >= 1 &&
      [...p.text].length <= 2400 && /\S/u.test(p.text) && typeof i.ownerId === "string" && i.ownerId.length > 0 &&
      typeof i.principal.firebaseUid === "string" && i.principal.firebaseUid.length > 0 &&
      object(i.session) && object(i.tokenInstance) && object(i.originalRequest) && uuid(o.operationId) && uuid(o.conversationId) &&
      uuid(o.userMessageId) && (o.kind === "send" || o.kind === "retry") &&
      (o.targetKind === "existing" || o.targetKind === "reserved_new") &&
      (o.kind === "retry" ? o.targetKind === "existing" && !!s.retryUser && s.retryUser.messageId === o.userMessageId : !s.retryUser);
  }
  private sameOwnerSession(a: AsyncConversationIdentity, b: AsyncConversationIdentity): boolean {
    return a.ownerId === b.ownerId && a.principal.firebaseUid === b.principal.firebaseUid && a.session === b.session;
  }
  private sameOriginal(a: AsyncConversationIdentity, b: AsyncConversationIdentity): boolean {
    return this.sameOwnerSession(a, b) && a.tokenInstance === b.tokenInstance && a.originalRequest === b.originalRequest;
  }
  private originalCurrent(s: State): boolean {
    try { return this.authority.current(s.identity) === true; } catch { return false; }
  }
  private live(s: State): boolean {
    if (s.terminal || !s.control?.live()) return false;
    if (this.originalCurrent(s) && (!s.cloudLease || s.cloudLease.current())) return true;
    s.control.fail("stale_authority"); return false;
  }
  private fail(s: State, failure: RuntimeFailure): void { s.control?.fail(failure); }
  private reject(s: State, failure: "stale_authority" | "invalid_input" | "dependency_unavailable"): AsyncConversationAdmission {
    this.dispose(s); return { accepted: false, failure };
  }
  private matches(s: State, result: AsyncEffectIdentity): boolean {
    return result.operationId === s.operation.operationId && result.conversationId === s.operation.conversationId;
  }
  private dependencies(s: State): ContextDependencies | undefined {
    if (!this.live(s)) return undefined;
    if (this.cloudConsent && s.cloudGeneration === undefined) return undefined;
    const base = s.reader?.dependencies();
    if (!base) return undefined;
    const dependencies={...base,...(s.replyToMessageId?{replyToMessageId:s.replyToMessageId}:{})};
    if (!this.strategy) return dependencies;
    const sources = new Map(base.sources.map(source => [source.sourceId,source]));
    for (const source of s.history?.sources ?? []) sources.set(source.sourceId,source);
    if (sources.size > 15) return undefined;
    const messages=s.history?.messageSources??[],selected=base.selectedReply;
    const flattened=[...(selected?.sources??[]),...messages].filter((ref,i,all)=>all.findIndex(r=>r.kind===ref.kind&&r.id===ref.id)===i);
    if(flattened.length>15)return undefined;
    return Object.freeze({...dependencies,sources:Object.freeze([...sources.values()]),history:Object.freeze(s.history?.pairs.map(p => p.identity) ?? []),
      ...(selected||messages.length||this.cloudConsent?{selectedReply:{processing:this.cloudConsent ? "cloud" as const : "local" as const,...(this.cloudConsent ? {cloudAiConsentGeneration:s.cloudGeneration!} : {}),asOf:s.context!.read.asOf,permittedCheckInIds:selected?.permittedCheckInIds??[],
        excludedCheckInIds:selected?.excludedCheckInIds??[],sources:Object.freeze(flattened),
        ...(selected?.historySnapshot?{historySnapshot:selected.historySnapshot}:{}),...(selected?.excludedHistoryPairs?{excludedHistoryPairs:selected.excludedHistoryPairs}:{})}}:{})});
  }
  private model(s: State): ConversationInput | undefined {
    if (!this.live(s) || !s.processing) return undefined;
    const projection = s.reader?.modelContext();
    return projection && Object.freeze({ currentMessage: s.processing.text, checkIns: projection.checkIns, persona: projection.persona,
      ...(s.selectedReply?{contextMode:"selected_checkins_v1" as const}:{}),
      ...(s.history?.replyToAssistant?{replyToAssistant:s.history.replyToAssistant}:{}),
      ...(this.strategy ? {strategy:this.strategy,history:Object.freeze(s.history?.pairs.map(p => Object.freeze({user:p.user,assistant:p.assistant})) ?? [])} : {}) });
  }
  private assistant(s: State): AcceptedAssistant | undefined {
    if (!this.live(s) || !s.processing?.candidate) return undefined;
    const dependencies = this.dependencies(s), projection = s.reader?.modelContext();
    return dependencies && projection && { message: s.processing.candidate.message,
      presentation: projection.persona ? { presentationMode: "persona", presentationProjectionVersion: "persona_presentation_v1" }
        : { presentationMode: "default" },
      provenance: dependencies.sources.map(source => ({ sourceType: source.sourceType, sourceId: source.sourceId })) };
  }
  private async checkpoint(s: State): Promise<boolean> {
    if (!this.live(s)) return false;
    try {
      const auth = await this.authority.freshAuth(s.identity);
      if (!this.live(s)) return false;
      if (auth !== "authorized") { this.fail(s, auth === "denied" ? "stale_authority" : "dependency_unavailable"); return false; }
      if (!await this.checkCloudConsent(s)) return false;
      const current = await s.reader!.revalidate();
      if (!this.live(s)) return false;
      if (current !== "ready") { this.fail(s, current === "denied" ? "stale_authority" : "dependency_unavailable"); return false; }
      if (this.strategy && s.history) {
        const history = await this.store.readHistory?.(s.context!,s.history.pairs.map(p => p.identity));
        if (!this.live(s)) return false;
        if (history?.kind !== "read") {
          if(history&&["selection_conflict","changed","source_unavailable"].includes(history.kind))this.selectedFailure?.(history.kind as SelectedReplyFailure);
          this.fail(s,history?.kind === "denied" ? "stale_authority" : "dependency_unavailable"); return false;
        }
        // Source/message identity and bytes are immutable; an adapter cannot
        // swap content after the complete input was budgeted or validated.
        if (JSON.stringify(history.value) !== JSON.stringify(s.history)) {
          this.fail(s,"stale_authority"); return false;
        }
      }
      return true;
    } catch { this.fail(s, "dependency_unavailable"); return false; }
  }
  private async checkCloudConsent(s: State): Promise<boolean> {
    if (!this.cloudConsent) return true;
    if (!this.live(s)) return false;
    const result = await this.cloudConsent.read(s.identity.principal, s.identity.ownerId, () => this.live(s), s.control!.signal);
    if (!this.live(s)) { if (result.kind === 'authorized') result.release(); return false; }
    if (result.kind !== 'authorized' || s.cloudGeneration !== undefined && result.generation !== s.cloudGeneration ||
        result.kind === 'authorized' && result.purposeGeneration !== s.reader?.dependencies()?.purposeRevocationGeneration || result.kind === 'authorized' && !result.current()) {
      if (result.kind === 'authorized') result.release();
      this.fail(s, result.kind === 'unavailable' ? 'dependency_unavailable' : 'stale_authority'); return false;
    }
    s.cloudLease?.release(); s.cloudLease = result;
    s.cloudGeneration = result.generation;
    return true;
  }
  private work(s: State): RuntimeApplicationWork<AsyncConversationModelInput> {
    return { purpose: "ai_assistant_message_v1", prepare: () => this.prepare(s),
      dispatchInput: () => this.live(s) && !!s.user && !s.uncertain && !!this.model(s)
        ? ok(Object.freeze({ ...(this.cloudConsent ? { processing: 'cloud' as const,
            cloudConsentCurrent: () => this.live(s) && s.cloudGeneration !== undefined } : {}), authorize: () => this.checkpoint(s), projection: () => this.model(s) }))
        : err("dependency_unavailable"),
      acceptCandidate: candidate => { if (this.live(s) && s.processing) s.processing.candidate = candidate; },
      checkCandidate: () => this.checkCandidate(s), commitAndDeliver: () => this.commitAndDeliver(s), dispose: () => this.dispose(s) };
  }
  private async prepare(s: State): Promise<void> {
    const ready = await s.readerReady;
    if (!this.live(s)) return;
    if (ready !== "ready") { this.fail(s, ready === "denied" ? "stale_authority" : "dependency_unavailable"); return; }
    if (!await this.checkCloudConsent(s)) return;
    if (this.strategy) {
      const history = await this.store.readHistory?.(s.context!);
      if (!this.live(s)) return;
      if (history?.kind !== "read") {
        if(history&&["selection_conflict","changed","source_unavailable"].includes(history.kind))this.selectedFailure?.(history.kind as SelectedReplyFailure);
        this.fail(s,history?.kind === "denied" ? "stale_authority" : "dependency_unavailable"); return; }
      s.history = history.value;
      if (!this.dependencies(s)) { this.fail(s,"dependency_unavailable"); return; }
    }
    const gate = await this.gates.beforeGeneration(() => this.model(s), s.control!);
    if (!this.live(s)) return;
    if (!gate.ok) { this.fail(s, gate.failure); return; }
    if (!await this.checkpoint(s) || !this.live(s)) return;
    s.fenceIssued = true; s.uncertain = true;
    const opened = await this.store.open(s.context!);
    if (!this.live(s)) return;
    if (opened.kind !== "open" || !this.matches(s, opened)) {
      if(opened.kind==="rejected"&&opened.selectionFailure)this.selectedFailure?.(opened.selectionFailure);
      this.fail(s, opened.kind === "rejected" ? opened.failure : "dependency_unavailable"); return;
    }
    s.uncertain = false;
    // Fresh external Auth afresh before each CONTENT transaction, after open I/O.
    if (!await this.checkpoint(s) || !this.live(s)) return;
    s.uncertain = true;
    const written = await this.store.submitUser(s.context!, () => this.live(s) ? s.processing?.text : undefined, s.retryUser);
    if (!this.live(s)) return;
    if (!this.acceptUser(s, written)) return;
    if (!await this.checkpoint(s)) return;
  }
  private acceptUser(s: State, result: AsyncUserWriteObservation): boolean {
    if (result.kind !== "committed") {if(result.kind==="rejected"&&result.selectionFailure)this.selectedFailure?.(result.selectionFailure); this.fail(s, result.kind === "rejected" ? result.failure : "dependency_unavailable"); return false; }
    try {
      const observed = user(result.user);
      if (!this.matches(s, result) || observed.messageId !== s.operation.userMessageId || "assistantMessageId" in result ||
          (s.retryUser && !sameUser(s.retryUser, observed))) throw new Error("unavailable");
      s.user = observed; s.uncertain = false; return true;
    } catch { this.fail(s, "dependency_unavailable"); return false; }
  }
  private async checkCandidate(s: State): Promise<void> {
    if (!await this.checkpoint(s) || !this.live(s)) return;
    const checked = await this.gates.candidate(() => this.model(s), () => this.live(s) ? s.processing?.candidate : undefined, s.control!);
    if (!this.live(s)) return;
    if (!checked.ok) { this.fail(s, checked.failure); return; }
    await this.checkpoint(s);
  }
  private acceptAssistant(s: State, result: AsyncAssistantWriteObservation | AsyncClaimSettlement): boolean {
    if (result.kind !== "committed" && result.kind !== "settled") {
      if(result.kind==="rejected"&&result.selectionFailure)this.selectedFailure?.(result.selectionFailure);
      this.fail(s, result.kind === "rejected" ? result.failure : "dependency_unavailable"); return false;
    }
    try {
      if (!this.matches(s, result) || !s.user || !sameUser(s.user, user(result.user)) || !uuid(result.assistantMessageId) ||
          result.assistantMessageId === s.user.messageId || (s.assistantMessageId && s.assistantMessageId !== result.assistantMessageId)) throw new Error("unavailable");
      s.assistantMessageId = result.assistantMessageId; return true;
    } catch { this.fail(s, "dependency_unavailable"); return false; }
  }
  private async commitAndDeliver(s: State): Promise<void> {
    if (!await this.checkpoint(s) || !this.live(s) || !s.user || !this.assistant(s)) return;
    s.uncertain = true;
    const written = await this.store.submitAssistant(s.context!, s.user, () => this.assistant(s));
    if (!this.live(s) || !this.acceptAssistant(s, written)) return;
    // A definite ACK still leaves pending until this separate matching settlement.
    const settled = await this.store.confirmAssistant(s.context!, s.user!, s.assistantMessageId!);
    if (!this.live(s) || !this.acceptAssistant(s, settled)) return;
    s.uncertain = false;
    if (!await this.checkpoint(s) || !this.live(s)) return;
    let authorizedForEvent = false;
    const delivered = await this.sink.deliver(s.context!, async () => {
      authorizedForEvent = false;
      if (!await this.checkpoint(s) || !this.live(s)) return false;
      authorizedForEvent = true; return true;
    }, accept => {
      // Only this synchronous actual sink event may complete the shared runtime.
      s.control!.complete((): Result<void, RuntimeFailure> => {
        if (!authorizedForEvent || !this.live(s) || !s.user || !s.assistantMessageId || !s.processing?.candidate) return err("stale_authority");
        authorizedForEvent = false;
        accept({ operation: s.operation, user: s.user, assistantMessageId: s.assistantMessageId, message: s.processing.candidate.message });
        return ok(undefined);
      });
    });
    if (this.live(s)) this.fail(s, delivered === "refused" ? "abandoned" : "dependency_unavailable");
  }
  private dispose(s: State): void {
    s.cloudLease?.release(); s.cloudLease = undefined;
    if (s.terminal) return;
    s.terminal = true; s.disposeCount++;
    const processing = s.processing; s.processing = undefined;
    if (processing) { processing.text = ""; processing.candidate = undefined; }
    s.history = undefined;
    s.selectedReply=undefined;s.replyToMessageId=undefined;
    s.reader?.dispose(); s.reader = undefined; s.readerReady = undefined; s.context = undefined;
    // Do not await or claim remote cancellation. Only content-free matching close
    // observation may arrive after local disposal, never a late content ACK.
    void this.close(s);
  }
  private close(s: State, explicitRecheck = false): Promise<AsyncCloseObservation> {
    if (s.barrier === "closed") return Promise.resolve({ kind: "closed", operationId: s.operation.operationId, conversationId: s.operation.conversationId });
    // One explicit Check result may observe a previously unresolved barrier
    // afresh. It never overlaps pending close or starts an automatic retry loop.
    if (explicitRecheck && !s.closePending) s.close = undefined;
    if (s.close) return s.close;
    if (!s.fenceIssued) { s.barrier = "closed"; return Promise.resolve({ kind: "closed", operationId: s.operation.operationId, conversationId: s.operation.conversationId }); }
    s.closePending = true;
    s.close = Promise.resolve().then(() => this.store.close(s.identity, s.operation)).then(result => {
      s.closePending = false;
      if (result.kind === "closed" && this.matches(s, result)) {
        s.barrier = "closed"; return Object.freeze({ kind: "closed" as const, operationId: result.operationId, conversationId: result.conversationId });
      }
      return { kind: "unresolved" as const };
    }, () => { s.closePending = false; return { kind: "unresolved" as const }; });
    return s.close;
  }
}
