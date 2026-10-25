import type { BoundedAiRuntime, RuntimeFailure } from "../../ai-runtime/application/bounded-ai-runtime.js";
import type { AuthPrincipal, IdentityVerificationResult } from "../../shared/ports/identity-verifier.js";
import type { ConversationExecution, ConversationExecutionDelivery, ConversationOperationExecutor,
  ExecutedConversation, AsyncAcknowledgedConversationPair, RequestOriginalConversationIdentity } from "../ports/application-conversation-operations.js";
import type { AsyncConversationAuthority, AsyncConversationClock, AsyncConversationIdentity,
  AsyncConversationModelInput, AsyncConversationStore, AsyncDeliveryMessage, AsyncEffectContext,
  AsyncOperation, AsyncSavedUser } from "../ports/async-conversation.js";
import type { ConversationFailureCode, ConversationResult } from "../ports/conversation-operations.js";
import type { ConversationGates } from "../ports/conversation-lifecycle.js";
import type { StoredConversationMessage } from "../ports/real-conversation-store.js";
import type { AcceptedContextRead, ContextReadResult, RealContextReadPort } from "../ports/real-context-reader.js";
import { AsyncConversationApplication } from "./async-conversation-application.js";
import type { SelectedReplyGrant, SelectedReplyFailure } from "../ports/selected-reply.js";

type AcknowledgedConversationPair = Extract<Awaited<ReturnType<AsyncAcknowledgedConversationPair["read"]>>, { kind: "success" }>["value"];
export interface AsyncConversationExecutionPorts {
  readonly selectedReads?:import("../ports/selected-reply.js").SelectedReplyReadPort;
  readonly authority: AsyncConversationAuthority;
  readonly reads: RealContextReadPort;
  readonly store: AsyncConversationStore;
  /** Supplied by JIN's bridge, after definite assistant ACK and settlement. */
  readonly acknowledgedPair?: AsyncAcknowledgedConversationPair;
}
export interface AsyncConversationExecutionProviders {
  readonly runtime: BoundedAiRuntime<AsyncConversationModelInput>;
  readonly strategy?: "open_conversation_v1";
  /** Explicit composition only, no I/O. Bind all three adapters to the SAME
   * request-local original capability; do not introduce a global token registry. */
  readonly ports: (original: RequestOriginalConversationIdentity) => AsyncConversationExecutionPorts;
  readonly gates: ConversationGates;
  readonly clock: AsyncConversationClock;
}
type ExecuteInput = Parameters<ConversationOperationExecutor["create"]>[0];
type Command = ReturnType<AsyncConversationApplication["create"]>;
interface PrivateState {
  selectedReply:SelectedReplyGrant|undefined;
  replyToMessageId:string|undefined;
  text: ExecuteInput["text"] | undefined;
  verify: ExecuteInput["verifyCurrentAuth"] | undefined;
  current: ConversationExecutionDelivery["current"] | undefined;
  accept: ConversationExecutionDelivery["acceptCompleteBody"] | undefined;
  signal: AbortSignal | undefined;
  pair: AcknowledgedConversationPair | undefined;
  response: ((pair: ExecutedConversation) => void) | undefined;
  terminal: ConversationExecutionDelivery["onTerminal"] | undefined;
  read: AcceptedContextRead | undefined;
}
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);
const instant = (value: StoredConversationMessage["persistedAt"]): boolean => !!value &&
  Number.isSafeInteger(value.seconds) && Number.isInteger(value.nanoseconds) && value.nanoseconds >= 0 && value.nanoseconds < 1e9;
function copyMessage(value: StoredConversationMessage, role: StoredConversationMessage["role"]): StoredConversationMessage | undefined {
  if (!value || !uuid(value.messageId) || !Number.isSafeInteger(value.sequence) || value.sequence < 1 ||
      value.role !== role || !instant(value.persistedAt) || value.availability !== "available" ||
      typeof value.text !== "string" || !value.text.isWellFormed() || !/\S/u.test(value.text) || [...value.text].length > 2400) return undefined;
  if(value.replyToMessageId!==undefined&&!uuid(value.replyToMessageId))return undefined;
  const sources=value.sources?.map(s=>Object.freeze({cardRef:s.cardRef,kind:s.kind,version:s.version,sourceOccurredAt:s.sourceOccurredAt,observedAt:s.observedAt,state:s.state,canNavigate:s.canNavigate}));
  if(sources&&(sources.length>15||sources.some(s=>typeof s.cardRef!=="string"||!s.cardRef||!s.version||s.state!=="available"||s.canNavigate!==true||
    !["conversation_message","check_in"].includes(s.kind)||!Number.isFinite(Date.parse(s.sourceOccurredAt))||!Number.isFinite(Date.parse(s.observedAt)))))return undefined;
  return Object.freeze({ messageId: value.messageId, sequence: value.sequence, role,
    persistedAt: Object.freeze({ seconds: value.persistedAt.seconds, nanoseconds: value.persistedAt.nanoseconds }),
    availability: "available", text: value.text,...(sources?{sources:Object.freeze(sources)}:{}),...(value.replyToMessageId?{replyToMessageId:value.replyToMessageId}:{}) });
}
function failure(value: RuntimeFailure | "overload" | "invalid_input"): ConversationFailureCode {
  switch (value) {
    case "overload": return "AI_BUSY";
    case "invalid_input": return "AI_INPUT_INVALID";
    case "unsafe_output": case "invalid_output": return "AI_REPLY_REJECTED";
    case "stale_authority": return "AI_AUTHORITY_CHANGED";
    default: return "AI_UNAVAILABLE";
  }
}

/** Vendor-free N01 consumer of the unchanged reviewed asynchronous Application.
 * Each handle is a single request; there is no persistent or replay pair map. */
export class AsyncConversationOperationExecutor implements ConversationOperationExecutor {
  constructor(private readonly providers: AsyncConversationExecutionProviders) {}
  create(input: ExecuteInput, delivery: ConversationExecutionDelivery): ConversationExecution {
    return new Execution(this.providers, input, delivery);
  }
}
class Execution implements ConversationExecution {
  private selectedCode:ConversationFailureCode|undefined;
  private readonly identity: AsyncConversationIdentity;
  private readonly operation: AsyncOperation;
  private readonly retry: AsyncSavedUser | undefined;
  private readonly private: PrivateState;
  private app: AsyncConversationApplication | undefined;
  private ports: AsyncConversationExecutionPorts | undefined;
  private command: Command | undefined;
  private dispatched = false;
  private terminal = false;
  private budgetSignal: AbortSignal | undefined;
  private readonly aborted = (): void => this.dispose();
  private readonly runtimeTerminal = (): void => this.revoke();
  constructor(private readonly providers: AsyncConversationExecutionProviders, input: ExecuteInput,
    delivery: ConversationExecutionDelivery) {
    this.identity = Object.freeze({ ...input.identity, principal: Object.freeze({ firebaseUid: input.identity.principal.firebaseUid }) });
    this.operation = Object.freeze({ ...input.operation });
    this.retry = input.retryUser && Object.freeze({ ...input.retryUser, persistedAt: Object.freeze({ ...input.retryUser.persistedAt }) });
    this.private = { text: input.text, verify: input.verifyCurrentAuth, current: delivery.current,
      selectedReply:input.selectedReply,replyToMessageId:input.replyToMessageId,
      accept: delivery.acceptCompleteBody, signal: delivery.signal, pair: undefined, response: undefined, terminal: delivery.onTerminal,
      read: undefined };
    delivery.signal.addEventListener("abort", this.aborted, { once: true });
    if (delivery.signal.aborted) this.dispose();
  }
  private sameOriginal(identity: AsyncConversationIdentity): boolean {
    const original = this.identity;
    return identity.ownerId === original.ownerId && identity.principal.firebaseUid === original.principal.firebaseUid &&
      identity.session === original.session && identity.tokenInstance === original.tokenInstance && identity.originalRequest === original.originalRequest;
  }
  private current(): boolean {
    if (this.terminal || !this.private.signal || this.private.signal.aborted) return false;
    try { return this.private.current?.() === true; } catch { return false; }
  }
  private revoke(): void {
    this.terminal = true;
    const terminal = this.private.terminal; this.private.terminal = undefined;
    this.private.signal?.removeEventListener("abort", this.aborted);
    this.budgetSignal?.removeEventListener("abort", this.runtimeTerminal); this.budgetSignal = undefined;
    this.private.text = undefined; this.private.verify = undefined; this.private.current = undefined;
    this.private.selectedReply=undefined;this.private.replyToMessageId=undefined;
    this.private.accept = undefined; this.private.signal = undefined; this.private.pair = undefined; this.private.response = undefined;
    this.private.read = undefined;
    this.ports = undefined;
    try { terminal?.(); } catch { /* A cleanup observer cannot reopen authority. */ }
  }
  dispose(): void {
    if (this.terminal) return;
    this.revoke();
    if (this.app && this.command) void this.app.cancel(this.command, this.identity, "abandoned");
  }
  cancel(): ReturnType<ConversationExecution["cancel"]> {
    this.revoke();
    return this.app && this.command ? this.app.cancel(this.command, this.identity)
      : Promise.resolve({ kind: "closed", operationId: this.operation.operationId, conversationId: this.operation.conversationId });
  }
  async dispatch(): Promise<ConversationResult<ExecutedConversation>> {
    if (this.dispatched) return { kind: "failure", code: "AI_OPERATION_CONFLICT" };
    this.dispatched = true;
    try {
      if (!this.current()) return { kind: "terminated" };
      // Refuse before acceptance, context capture or persistence without actual F02 capabilities.
      if (!this.private.accept) return { kind: "failure", code: "AI_UNAVAILABLE" };
      // The response belongs solely to this dispatch call, never the terminal handle.
      const response = new Promise<ExecutedConversation>(resolve => { this.private.response = resolve; });
      const created = this.createCommand();
      if (created !== "ready") return created === "terminated" ? { kind: "terminated" } : { kind: "failure", code: "AI_UNAVAILABLE" };
      const admission = await this.app!.dispatch(this.command!);
      if (!admission.accepted) return this.current() ? { kind: "failure", code: failure(admission.failure) } : { kind: "terminated" };
      const outcome = await admission.request.outcome;
      if(!outcome.ok&&this.selectedCode)return {kind:"failure",code:this.selectedCode};
      if (!outcome.ok) return outcome.failure === "cancelled" || outcome.failure === "abandoned" ||
        outcome.failure === "timed_out" || outcome.failure === "stale_authority"
        ? { kind: "terminated" } : { kind: "failure", code: failure(outcome.failure) };
      return { kind: "success", value: await response };
    } catch { return this.current() ? { kind: "failure", code: "AI_UNAVAILABLE" } : { kind: "terminated" }; }
    finally { this.revoke(); }
  }
  private createCommand(): "ready" | "terminated" | "unavailable" {
    // Plaintext is transferred synchronously into the reviewed disposable holder;
    // dispatch's suspended frame never owns a separate text local.
    const original: RequestOriginalConversationIdentity = {
      current: identity => this.sameOriginal(identity) && this.current(),
      verify: identity => this.verify(identity),
      verifyRead: context => this.verifyRead(context),
      currentRead:context=>this.readCurrent(context),
    };
    const ports = this.providers.ports(original);
    if (!ports.acknowledgedPair) return "unavailable";
    this.ports = ports;
    const text = this.private.text?.();
    if (text === undefined) return "terminated";
    const readPort = ports.reads;
    const registerRead=(context:AcceptedContextRead):boolean=>{
      if(!this.current()||!this.readIdentity(context))return false;
      if(this.private.read!==undefined)return this.private.read===context&&this.readCurrent(context);
      this.private.read=context;this.budgetSignal=context.signal;context.signal.addEventListener("abort",this.runtimeTerminal,{once:true});return this.readCurrent(context);
    };
    const reads: RealContextReadPort = {
      openStart: context => {
        if (!this.current()) return Promise.resolve({ kind: "terminated" });
        if (this.private.read !== undefined || !this.readIdentity(context)) return Promise.resolve({ kind: "denied" });
        // Register the exact approved Application object before any SDK read or
        // verifier call; a lookalike object cannot adopt its token authority.
        this.private.read = context;
        this.budgetSignal = context.signal;
        context.signal.addEventListener("abort", this.runtimeTerminal, { once: true });
        if (!this.readCurrent(context)) { this.revoke(); return Promise.resolve({ kind: "terminated" }); }
        return readPort.openStart(context);
      },
      readCurrent: (context, dependencies) => readPort.readCurrent(context, dependencies),
    };
    this.app = new AsyncConversationApplication(this.providers.runtime, ports.authority,
      reads, ports.store, this.providers.gates,
      { deliver: (context, revalidate, event) => this.deliver(context, revalidate, event) }, {
        monotonicNow: () => this.providers.clock.monotonicNow(),
        utcNow: () => {
          try {
            const value = this.providers.clock.utcNow();
            if (!instant(value)) throw new Error("unavailable");
            return value;
          } catch { this.revoke(); throw new Error("unavailable"); }
        },
      }, this.providers.strategy,ports.selectedReads?{
        prepare:(context,selection)=>ports.selectedReads!.prepare(context,selection),
        read:(context,grant)=>registerRead(context)?ports.selectedReads!.read(context,grant):Promise.resolve({kind:"terminated"}),
      }:undefined,kind=>this.selectionFailure(kind));
    this.command = this.app.create({ identity: this.identity, operation: this.operation, text,
      ...(this.private.selectedReply?{selectedReply:this.private.selectedReply}:{}),...(this.private.replyToMessageId?{replyToMessageId:this.private.replyToMessageId}:{}),
      ...(this.retry ? { retryUser: this.retry } : {}) });
    this.private.text = undefined;
    return "ready";
  }
  private selectionFailure(kind:SelectedReplyFailure):void{
    if(kind==="terminated")return;
    this.selectedCode=kind==="changed"||kind==="denied"?"AI_AUTHORITY_CHANGED":kind==="source_unavailable"?"AI_SOURCE_UNAVAILABLE":
      kind==="selection_conflict"?"AI_CONTEXT_SELECTION_CONFLICT":"AI_UNAVAILABLE";
  }
  private async verify(identity: AsyncConversationIdentity): Promise<IdentityVerificationResult> {
    if (!this.sameOriginal(identity) || !this.current()) return { kind: "invalid" };
    try {
      const observation = await this.private.verify?.();
      if (!this.current()) return { kind: "invalid" };
      if (!observation) return { kind: "dependency_unavailable" };
      return observation.kind === "verified" && observation.principal.firebaseUid !== this.identity.principal.firebaseUid
        ? { kind: "invalid" } : observation;
    } catch { return { kind: "dependency_unavailable" }; }
  }
  private readIdentity(context: AcceptedContextRead): boolean {
    const original = this.identity;
    return context.principal.firebaseUid === original.principal.firebaseUid && context.ownerId === original.ownerId &&
      context.session === original.session && context.originalRequest === original.originalRequest;
  }
  private readCurrent(context: AcceptedContextRead): boolean {
    try {
      const now = this.providers.clock.monotonicNow();
      return this.current() && this.private.read === context && this.readIdentity(context) &&
        this.budgetSignal === context.signal && !context.signal.aborted &&
        Number.isFinite(context.acceptedAt) && context.deadline === context.acceptedAt + 60_000 &&
        now >= context.acceptedAt && now < context.deadline;
    } catch { return false; }
  }
  private async verifyRead(context: AcceptedContextRead): Promise<ContextReadResult<AuthPrincipal>> {
    const approved = this.private.read;
    if (!approved || !this.readCurrent(approved)) return { kind: "terminated" };
    if (context !== approved || !this.readIdentity(context)) return { kind: "denied" };
    // Context has no token identity. Delegate only to this execution's pinned
    // original verifier; never obtain a token from UID or global session state.
    const observed = await this.verify(this.identity);
    if (!this.readCurrent(context)) return { kind: "terminated" };
    if (observed.kind === "verified") return { kind: "read", value: Object.freeze({ firebaseUid: observed.principal.firebaseUid }) };
    return { kind: observed.kind === "invalid" || observed.kind === "forbidden" ? "denied" : "unavailable" };
  }
  private live(context: AsyncEffectContext): boolean {
    return this.current() && this.sameOriginal(context.identity) && !context.budget.signal.aborted &&
      this.providers.clock.monotonicNow() < context.budget.deadline && context.originalCurrent();
  }
  private deliver(context: AsyncEffectContext, revalidate: () => Promise<boolean>,
    event: (accept: (message: AsyncDeliveryMessage) => void) => void): Promise<"accepted" | "refused"> {
    if (!this.live(context) || !this.ports?.acknowledgedPair) return Promise.resolve("refused");
    // The pending frame owns no pair while a fresh authority check is awaited.
    return this.ports.acknowledgedPair.read(context).then(observation => {
      if (!this.live(context) || observation.kind !== "success") return "refused" as const;
      const user = copyMessage(observation.value.user, "user"), assistant = copyMessage(observation.value.assistant, "assistant");
      const presentation = observation.value.presentation, dependencies = context.dependencies(), persona = dependencies?.usedPersonaId !== undefined;
      if (!user || !assistant || user.messageId === assistant.messageId || assistant.sequence <= user.sequence ||
          !dependencies ||
          (persona ? presentation?.presentationMode !== "persona" || presentation.presentationProjectionVersion !== "persona_presentation_v1"
            : presentation?.presentationMode !== "default")) return "refused" as const;
      this.private.pair = Object.freeze({ user, assistant, presentation: Object.freeze({ ...presentation }) });
      return this.acceptAfterRevalidation(context, revalidate, event);
    }, () => "refused");
  }
  private acceptAfterRevalidation(context: AsyncEffectContext, revalidate: () => Promise<boolean>,
    event: (accept: (message: AsyncDeliveryMessage) => void) => void): Promise<"accepted" | "refused"> {
    return revalidate().then(authorized => {
      if (!authorized || !this.live(context) || !this.private.pair || !this.private.accept) return "refused" as const;
      let accepted = false;
      let acceptedBody: ExecutedConversation | undefined;
      const response = this.private.response;
      event(message => {
        const pair = this.private.pair;
        if (accepted || !pair || !this.live(context) || !this.private.accept ||
            message.operation.operationId !== this.operation.operationId || message.operation.conversationId !== this.operation.conversationId ||
            message.operation.userMessageId !== this.operation.userMessageId || pair.user.messageId !== message.user.messageId ||
            pair.user.sequence !== message.user.sequence || pair.user.persistedAt.seconds !== message.user.persistedAt.seconds ||
            pair.user.persistedAt.nanoseconds !== message.user.persistedAt.nanoseconds || pair.assistant.messageId !== message.assistantMessageId ||
            pair.assistant.text !== message.message) throw new Error("unavailable");
        const body: ExecutedConversation = Object.freeze({ operationId: this.operation.operationId, conversationId: this.operation.conversationId,
          userMessage: pair.user, assistantMessage: pair.assistant });
        if (!this.private.accept(body)) throw new Error("unavailable");
        if (!this.current()) throw new Error("unavailable");
        accepted = true; acceptedBody = body; this.private.pair = undefined;
      });
      this.private.pair = undefined;
      // event returned after the same synchronous complete transition. Terminal
      // scrubbing has already run; transfer only to the active response owner.
      if (acceptedBody && accepted && response) response(acceptedBody);
      return accepted ? "accepted" as const : "refused" as const;
    }, () => "refused");
  }
}
