import { BoundedAiRuntime, type Cancellation, type RuntimeApplicationRequest,
  type RuntimeApplicationControl, type RuntimeApplicationWork, type RuntimeFailure } from "../../ai-runtime/application/bounded-ai-runtime.js";
import type { OutputCandidate } from "../../ai-runtime/domain/parse-output.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { CapturedContext, ConversationDeliverySink, ConversationGates, ConversationInput,
  ConversationMessageStore, ConversationRef, ConversationSources, EffectReadback, SavedUserRef, TrustedCaller } from "../ports/conversation-lifecycle.js";
import { captureContext } from "./capture-context.js";

/** Opaque in-process capability. There is no public ID or durable replay entity. */
export type ConversationCommand = object;
export type ConversationObservation = Pick<RuntimeApplicationRequest, "acceptedAt" | "deadline" | "outcome">;
export type ConversationAdmission = { readonly accepted: true; readonly request: ConversationObservation }
  | { readonly accepted: false; readonly failure: "stale_authority" | "invalid_input" | "overload" | "dependency_unavailable" };
interface Processing {
  input: string;
  context: CapturedContext | undefined;
  candidate: OutputCandidate | undefined;
  unwatch: (() => void) | undefined;
}
interface CommandState {
  readonly caller: TrustedCaller;
  readonly conversation: ConversationRef;
  readonly effect: object;
  previous: ConversationCommand | undefined;
  processing: Processing | undefined;
  admission: ConversationAdmission | undefined;
  control: RuntimeApplicationControl | undefined;
  effects: EffectReadback;
  uncertain: boolean;
  reconciled: boolean;
  terminal: boolean;
  disposeCount: number;
  retryTarget: SavedUserRef | undefined;
}

/** Internal fake-Port Application only; intentionally absent from Bootstrap. */
export class ConversationApplication {
  private readonly commands = new WeakMap<ConversationCommand, CommandState>();
  constructor(private readonly runtime: BoundedAiRuntime<ConversationInput>, private readonly sources: ConversationSources,
    private readonly messages: ConversationMessageStore, private readonly gates: ConversationGates,
    private readonly sink: ConversationDeliverySink) {}

  createSend(caller: TrustedCaller, conversation: ConversationRef, explicitInput: string): ConversationCommand {
    return this.create(caller, conversation, explicitInput, undefined);
  }
  createRetry(caller: TrustedCaller, conversation: ConversationRef, previous: ConversationCommand, explicitInput: string): ConversationCommand {
    return this.create(caller, conversation, explicitInput, previous);
  }
  private create(caller: TrustedCaller, conversation: ConversationRef, input: string, previous: ConversationCommand | undefined): ConversationCommand {
    const command = Object.freeze({});
    this.commands.set(command, { caller: Object.freeze({ owner: caller.owner, session: caller.session }), conversation, previous,
      effect: Object.freeze({}), processing: { input, context: undefined, candidate: undefined, unwatch: undefined },
      admission: undefined, control: undefined, effects: { user: undefined, assistant: false }, uncertain: false,
      reconciled: false, terminal: false, disposeCount: 0, retryTarget: undefined });
    return command;
  }

  dispatch(command: ConversationCommand): ConversationAdmission {
    const state = this.commands.get(command);
    if (!state) return { accepted: false, failure: "stale_authority" };
    if (state.admission) return state.admission;
    try {
      if (!this.sources.authorized(state.caller, state.conversation)
        || !this.messages.live(state.caller, state.conversation, this.sources.utcNow())) return this.reject(state, "stale_authority");
      if (!this.sources.available()) return this.reject(state, "dependency_unavailable");
      if (!state.processing || typeof state.processing.input !== "string" || !state.processing.input.isWellFormed()) return this.reject(state, "invalid_input");
      if (state.previous) {
        const old = this.commands.get(state.previous);
        if (!old || !old.terminal || old.uncertain || old.caller.owner !== state.caller.owner || old.conversation !== state.conversation
          || !old.effects.user || old.effects.assistant) return this.reject(state, "stale_authority");
        state.retryTarget = old.effects.user;
        if (!this.retryEligible(state)) return this.reject(state, "stale_authority");
      }
      const admitted = this.runtime.submitApplication(state.caller.owner, (control) => {
        state.control = control;
        // Same synchronous runtime admission event; never first read inside prepare.
        try {
          const asOf = this.sources.utcNow();
          state.processing!.context = captureContext(this.sources.capture(state.caller, state.conversation, asOf), asOf, state.processing!.input);
          state.processing!.unwatch = this.sources.watch(state.caller, state.conversation, state.processing!.context!, () => control.fail("stale_authority"));
        } catch { control.fail("dependency_unavailable"); }
        return this.work(state);
      });
      const admission: ConversationAdmission = admitted.accepted ? Object.freeze({ accepted: true, request: Object.freeze({
        acceptedAt: admitted.request.acceptedAt, deadline: admitted.request.deadline, outcome: admitted.request.outcome,
      }) }) : admitted;
      state.admission = admission;
      if (!admission.accepted) this.dispose(state);
      return admission;
    } catch { return this.reject(state, "dependency_unavailable"); }
  }

  cancel(command: ConversationCommand, caller: TrustedCaller, reason: Cancellation = "cancelled"): boolean {
    const state = this.commands.get(command);
    if (!state || state.caller.owner !== caller.owner || state.caller.session !== caller.session || !state.admission?.accepted) return false;
    state.control!.fail(reason);
    return true;
  }

  /** Explicit reconciliation only; never launches retry or supplies old content. */
  async reconcile(command: ConversationCommand, caller: TrustedCaller): Promise<"resolved" | "unavailable"> {
    const state = this.commands.get(command);
    if (!state || state.caller.owner !== caller.owner || state.caller.session !== caller.session || !state.terminal) return "unavailable";
    // Terminal fences precede authoritative readback, including unknown acknowledgments.
    state.control?.fail("dependency_unavailable");
    try {
      const result = await this.messages.readback(state.effect, caller, state.conversation);
      if (!result) return "unavailable";
      state.effects = result;
      state.reconciled = true;
      state.uncertain = false;
      return "resolved";
    } catch { return "unavailable"; }
  }

  /** Non-content observation for local evidence; not a history/recovery endpoint. */
  inspect(command: ConversationCommand): Readonly<{ terminal: boolean; userCommitted: boolean; assistantCommitted: boolean;
    uncertain: boolean; processing: boolean; disposeCount: number }> | undefined {
    const s = this.commands.get(command);
    return s && Object.freeze({ terminal: s.terminal, userCommitted: !!s.effects.user, assistantCommitted: s.effects.assistant,
      uncertain: s.uncertain, processing: !!s.processing, disposeCount: s.disposeCount });
  }
  private reject(state: CommandState, failure: "stale_authority" | "invalid_input" | "dependency_unavailable"): ConversationAdmission {
    const admission: ConversationAdmission = { accepted: false, failure };
    state.admission = admission;
    this.dispose(state);
    return admission;
  }
  private retryEligible(s: CommandState): boolean {
    return !!s.retryTarget && !!s.processing && this.messages.retryEligible(s.caller, s.conversation, s.retryTarget,
      s.processing.input, this.sources.utcNow());
  }
  private authority(s: CommandState): boolean {
    return !!s.processing?.context && this.sources.authorized(s.caller, s.conversation)
      && this.messages.live(s.caller, s.conversation, this.sources.utcNow())
      && this.sources.current(s.caller, s.conversation, s.processing.context);
  }
  private guarded<T>(s: CommandState, effect: () => Result<T, RuntimeFailure>): Result<T, RuntimeFailure> {
    return s.control!.effect(() => this.authority(s) ? effect() : err("stale_authority"));
  }
  private dispose(s: CommandState): void {
    if (s.terminal) return;
    s.terminal = true;
    s.disposeCount++;
    const processing = s.processing;
    s.processing = undefined;
    s.retryTarget = undefined;
    s.previous = undefined;
    if (processing) {
      processing.input = ""; processing.context = undefined; processing.candidate = undefined;
      const unwatch = processing.unwatch; processing.unwatch = undefined; unwatch?.();
    }
  }

  private work(s: CommandState): RuntimeApplicationWork<ConversationInput> {
    return {
      purpose: "ai_assistant_message_v1",
      prepare: () => this.prepare(s),
      dispatchInput: () => this.guarded(s, () => {
        if (s.retryTarget && !this.retryEligible(s)) return err("stale_authority");
        if (!s.effects.user || s.uncertain || !s.processing?.context) return err("dependency_unavailable");
        return ok(s.processing.context.input);
      }),
      acceptCandidate: (candidate) => { if (s.processing) s.processing.candidate = candidate; },
      checkCandidate: () => this.check(s),
      commitAndDeliver: () => this.commitAndDeliver(s),
      dispose: () => this.dispose(s),
    };
  }
  private async prepare(s: CommandState): Promise<void> {
    if (!this.guarded(s, () => ok(undefined)).ok) return;
    const decision = await this.gates.beforeGeneration(() => s.processing?.context?.input, s.control!);
    if (!s.control!.live()) return;
    if (!decision.ok) { s.control!.fail(decision.failure); return; }
    if (!this.guarded(s, () => ok(undefined)).ok) return;
    if (s.retryTarget) {
      if (!this.retryEligible(s)) { s.control!.fail("stale_authority"); return; }
      s.effects = { user: s.retryTarget, assistant: false };
      return;
    }
    const acknowledgment = await this.messages.user(s.effect, s.caller, s.conversation, (commit) => {
      this.guarded(s, () => {
        const target = commit(s.processing!.input, this.sources.utcNow());
        s.effects = { user: target, assistant: false };
        return ok(undefined);
      });
    }, s.control!);
    if (acknowledgment === "unknown" && !s.reconciled) s.uncertain = true;
    if (!s.control!.live()) return;
    if (acknowledgment !== "confirmed" || !s.effects.user) s.control!.fail("dependency_unavailable");
  }
  private async check(s: CommandState): Promise<void> {
    if (!this.guarded(s, () => ok(undefined)).ok) return;
    const checked = await this.gates.candidate(() => s.processing?.context?.input, () => s.processing?.candidate, s.control!);
    if (!s.control!.live()) return;
    if (!checked.ok) s.control!.fail(checked.failure);
    else this.guarded(s, () => ok(undefined));
  }
  private async commitAndDeliver(s: CommandState): Promise<void> {
    if (!s.effects.user || !s.processing?.candidate || !this.guarded(s, () => ok(undefined)).ok) return;
    const acknowledgment = await this.messages.assistant(s.effect, s.caller, s.conversation, s.effects.user, (commit) => {
      this.guarded(s, () => {
        const context = s.processing!.context!;
        commit({ message: s.processing!.candidate!.message, provenance: context.provenance,
          presentation: context.input.persona ? { presentationMode: "persona", presentationProjectionVersion: "persona_presentation_v1" }
            : { presentationMode: "default" } }, this.sources.utcNow());
        s.effects = { user: s.effects.user, assistant: true };
        return ok(undefined);
      });
    }, s.control!);
    if (acknowledgment === "unknown" && !s.reconciled) s.uncertain = true;
    if (!s.control!.live()) return;
    if (acknowledgment !== "confirmed" || !s.effects.assistant) { s.control!.fail("dependency_unavailable"); return; }
    const delivered = await this.sink.deliver((accept) => {
      s.control!.complete(() => {
        if (!this.authority(s)) return err("stale_authority");
        accept(s.processing!.candidate!.message);
        return ok(undefined);
      });
    }, s.control!);
    if (s.control!.live()) s.control!.fail(delivered === "refused" ? "abandoned" : "dependency_unavailable");
  }
}
