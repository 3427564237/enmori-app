import { parseOutput } from "../../ai-runtime/domain/parse-output.js";
import type { FirstFlowClaim, FirstFlowIntent, FirstFlowIntentCommand, FirstFlowModel,
  FirstFlowModelInput, FirstFlowRegistrationCommand, FirstFlowReservation, FirstFlowResult,
  FirstFlowSender, FirstFlowSettingsInput, FirstFlowStore, ProactiveActor } from "../ports/first-flow.js";

export interface FirstFlowApplicationOptions {
  readonly store: FirstFlowStore;
  /** Integration MUST inject the shared host lane used by chat and Persona
   * preview. A new per-feature model adapter is not an admission gate. */
  readonly model: FirstFlowModel;
  readonly sender: FirstFlowSender;
  readonly newMessageId: () => string;
  readonly nowMs?: () => number;
  readonly modelTimeoutMs?: number;
}

const uuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

/** F0 orchestration. Store Ports own every transaction/current source fence;
 * no pure preflight decision is treated as a reservation or write permission. */
export class FirstFlowApplication {
  private readonly now: () => number;
  private running = false;
  private modelPending = false;
  private active: { owner: string; intentId: string; abort: AbortController } | undefined;

  constructor(private readonly options: FirstFlowApplicationOptions) {
    this.now = options.nowMs ?? Date.now;
    if (!Number.isSafeInteger(options.modelTimeoutMs ?? 45000) || (options.modelTimeoutMs ?? 45000) < 1 ||
      (options.modelTimeoutMs ?? 45000) > 45000) throw Error("Invalid F0 capacity");
  }

  get executionState() { return { running: this.running, modelPending: this.modelPending }; }
  private current(actor: ProactiveActor): boolean { try { return actor.current(); } catch { return false; } }
  private async authorized(actor: ProactiveActor): Promise<FirstFlowResult<void>> {
    if (!this.current(actor)) return { kind: "terminated" };
    try {
      const result = await actor.verifyCurrentAuth();
      if (!this.current(actor)) return { kind: "terminated" };
      if (result.kind === "dependency_unavailable") return { kind: "unavailable" };
      return result.kind === "verified" && result.principal.firebaseUid === actor.principal.firebaseUid
        ? { kind: "ok", value: undefined } : { kind: "denied" };
    } catch { return { kind: "unavailable" }; }
  }
  private async call<T>(actor: ProactiveActor, operation: () => Promise<FirstFlowResult<T>>, effect = false): Promise<FirstFlowResult<T>> {
    const allowed = await this.authorized(actor);
    if (allowed.kind !== "ok") return allowed;
    try {
      const result = await operation();
      if (!this.current(actor)) return { kind: "terminated" };
      return result;
    } catch { return { kind: effect ? "unknown" : "unavailable" }; }
  }

  settings(actor: ProactiveActor) { return this.call(actor, () => this.options.store.settings(actor)); }
  async replaceSettings(actor: ProactiveActor, revision: number, input: FirstFlowSettingsInput) {
    const result = await this.call(actor, () => this.options.store.replaceSettings(actor, revision, input), true);
    if (result.kind === "unknown" || result.kind === "ok" && result.value.revision !== revision) this.abortOwner(actor);
    return result;
  }
  createIntent(actor: ProactiveActor, input: FirstFlowIntentCommand) { return this.call(actor, () => this.options.store.createIntent(actor, input), true); }
  intent(actor: ProactiveActor, id: string) { return this.call(actor, () => this.options.store.intent(actor, id)); }
  activeIntents(actor: ProactiveActor) { return this.call(actor, () => this.options.store.activeIntents(actor)); }
  async cancelIntent(actor: ProactiveActor, id: string, revision: number) {
    const result = await this.call(actor, () => this.options.store.cancelIntent(actor, id, revision), true);
    if ((result.kind === "ok" || result.kind === "unknown") && this.active?.intentId === id) this.abortOwner(actor);
    return result;
  }
  registration(actor: ProactiveActor) { return this.call(actor, () => this.options.store.registration(actor)); }
  replaceRegistration(actor: ProactiveActor, input: FirstFlowRegistrationCommand) {
    return this.call(actor, () => this.options.store.replaceRegistration(actor, input), true);
  }
  deleteRegistration(actor: ProactiveActor, installationRef: string, revision: number) {
    return this.call(actor, () => this.options.store.deleteRegistration(actor, installationRef, revision), true);
  }
  readState(actor: ProactiveActor, id: string) { return this.call(actor, () => this.options.store.readState(actor, id)); }
  markRead(actor: ProactiveActor, id: string, revision: number, sequence: number) {
    return this.call(actor, () => this.options.store.markRead(actor, id, revision, sequence), true);
  }
  recover(actor: ProactiveActor) {
    // Never reinterpret an in-process unconfirmed physical generation as a
    // stopped previous run. Its promise still owns the lane until settlement.
    return this.running ? Promise.resolve<FirstFlowResult<readonly FirstFlowIntent[]>>({ kind: "unavailable" })
      : this.call(actor, () => this.options.store.recover(actor), true);
  }
  private abortOwner(actor: ProactiveActor): void {
    if (this.active?.owner === actor.principal.firebaseUid) this.active.abort.abort();
  }

  async runIntent(actor: ProactiveActor, intentId: string, signal: AbortSignal): Promise<FirstFlowResult<FirstFlowIntent>> {
    if (this.running) return { kind: "unavailable" };
    if (!uuid(intentId) || signal.aborted || !this.current(actor)) return { kind: "terminated" };
    this.running = true;
    const abort = new AbortController();
    const combined = AbortSignal.any([signal, abort.signal]);
    this.active = { owner: actor.principal.firebaseUid, intentId, abort };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline = Number.POSITIVE_INFINITY;
    const live = (): boolean => this.current(actor) && !combined.aborted && this.now() < deadline;
    const operationActor: ProactiveActor = { principal: actor.principal,
      verifyCurrentAuth: () => actor.verifyCurrentAuth(), current: live };
    try {
      const read = await this.intent(operationActor, intentId);
      if (read.kind !== "ok") return read;
      const expiry = Date.parse(read.value.expiresAt);
      if (!Number.isFinite(expiry) || this.now() >= expiry) return { kind: "expired" };
      deadline = Math.min(expiry, this.now() + (this.options.modelTimeoutMs ?? 45000));
      timer = setTimeout(() => abort.abort(), Math.max(1, deadline - this.now())); timer.unref();
      if (!live()) return { kind: "terminated" };
      if (read.value.state === "published") return this.dispatch(operationActor, read.value, combined);
      if (read.value.state !== "queued") return { kind: "conflict" };

      const reserved = await this.call(operationActor, () => this.options.store.reserve(operationActor, intentId, read.value.revision), true);
      if (reserved.kind !== "ok") return reserved;
      const reservation = reserved.value;
      const allowed = await this.authorized(operationActor);
      // Terminal metadata cleanup uses a freshly verified original owner, not
      // an expired delivery deadline/signal. It is invoked only before model
      // submission or after its physical promise settles. Publish/dispatch
      // continue to require operationActor and can never borrow this scope.
      if (allowed.kind !== "ok") { await this.fail(actor, reservation); return allowed; }
      if (!live()) {
        const failed = await this.fail(actor, reservation);
        return failed.kind === "unknown" ? failed : { kind: "terminated" };
      }
      const source = reservation.source;
      const modelInput: FirstFlowModelInput = Object.freeze({ inputKind: "proactive_followup",
        quotedRequest: Object.freeze({ occurredAt: source.occurredAt, text: source.text }),
        dueAt: reservation.intent.dueAt, timeZone: reservation.intent.timeZone,
        ...(source.persona ? { persona: structuredClone(source.persona) } : {}) });
      let raw: Uint8Array;
      this.modelPending = true;
      try {
        // generate settles only once physical generation has stopped. Do NOT
        // race this promise against abort/deadline and release the host lane.
        raw = await this.options.model.generate(modelInput, {
          signal: combined, deadline, remainingMs: () => Math.max(0, deadline - this.now()),
        });
      } catch {
        const failed = await this.fail(actor, reservation);
        return failed.kind === "unknown" ? failed : { kind: "unavailable" };
      } finally { this.modelPending = false; }
      if (!live()) {
        const failed = await this.fail(actor, reservation);
        return failed.kind === "unknown" ? failed : { kind: "terminated" };
      }
      // LocalChatTransport already strips the Ollama envelope. This is the
      // existing two-string JSON parser in plain-text MVP mode, no content filter.
      const parsed = parseOutput(raw, "ai_assistant_message_v1", true);
      if (!parsed.ok) {
        const failed = await this.fail(actor, reservation);
        return failed.kind === "unknown" ? failed : { kind: "unavailable" };
      }
      const fresh = await this.authorized(operationActor);
      if (fresh.kind !== "ok") { await this.fail(actor, reservation); return fresh; }
      const messageId = this.options.newMessageId();
      if (!uuid(messageId)) { await this.fail(actor, reservation); return { kind: "unavailable" }; }
      const published = await this.call(operationActor, () => this.options.store.publish(operationActor, {
        reservation, messageId, text: parsed.value.message,
        presentation: source.persona ? { presentationMode: "persona", presentationProjectionVersion: "persona_presentation_v1" }
          : { presentationMode: "default" },
      }), true);
      // An unknown publish ACK is never permission for another model/send.
      if (published.kind !== "ok") {
        if (published.kind !== "unknown") await this.fail(actor, reservation);
        return published;
      }
      if (!live()) return { kind: "terminated" };
      return this.dispatch(operationActor, published.value, combined);
    } catch { return { kind: "unavailable" }; }
    finally {
      if (timer) clearTimeout(timer);
      this.active = undefined;
      this.running = false;
    }
  }

  private fail(actor: ProactiveActor, reservation: FirstFlowReservation) {
    return this.call(actor, () => this.options.store.failGeneration(actor, reservation), true);
  }
  private async dispatch(actor: ProactiveActor, intent: FirstFlowIntent, signal: AbortSignal): Promise<FirstFlowResult<FirstFlowIntent>> {
    if (intent.dispatchState !== "not_started") return { kind: "ok", value: intent };
    let claim: FirstFlowClaim | undefined;
    let claimFailure: FirstFlowResult<never> | undefined;
    const outcome = await this.options.sender.sendOnce({ signal,
      claimAfterCredential: async () => {
        const result = await this.call(actor, () => this.options.store.claimDispatch(actor, intent.intentId, intent.revision), true);
        if (result.kind === "ok") claim = result.value.claim;
        else claimFailure = result;
        return result;
      },
      current: current => this.current(actor) && !signal.aborted && current.intentId === intent.intentId &&
        current.conversationId === intent.conversationId && current.messageId === intent.messageId &&
        current.authorizationScope === intent.authorizationScope && this.now() < Date.parse(current.expiresAt),
    });
    if (!claim) return claimFailure ?? { kind: "unavailable" };
    return this.call(actor, () => this.options.store.recordDispatch(actor, claim!,
      outcome.kind === "not_attempted" ? "rejected" : outcome.kind), true);
  }
}
