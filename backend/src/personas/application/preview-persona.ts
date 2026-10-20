import type { ConversationCaller, ConversationResult } from "../../ai-conversation/ports/conversation-operations.js";
import type { ConversationInput } from "../../ai-conversation/ports/conversation-lifecycle.js";
import { copyPersonaExpression, personaExpressionProjection } from "../../ai-conversation/application/persona-expression.js";
import type { GenerationTransport } from "../../ai-runtime/ports/generation-transport.js";
import { parseOutput } from "../../ai-runtime/domain/parse-output.js";
import type { PersonaPreviewAuthority, PersonaPreviewPermission } from "../ports/persona-preview-authority.js";

export interface PersonaPreviewControl {
  readonly signal: AbortSignal;
  current(): boolean;
  /** Synchronous complete-response sink, invoked only during the original live request. */
  accept(message: string): boolean;
}

/** One draft/message only. This use case has no repository or history/write Port. */
export class PreviewPersona {
  private pending: object | undefined;
  constructor(private readonly authority: PersonaPreviewAuthority,
    private readonly generation: GenerationTransport<ConversationInput>,
    private readonly monotonicNow: () => number,
    private readonly modelBusy: () => boolean) {}

  async execute(caller: ConversationCaller, draft: unknown, text: unknown,
    control: PersonaPreviewControl): Promise<ConversationResult<void>> {
    const expression = copyPersonaExpression(draft);
    if (!expression || typeof text !== "string" || !text.isWellFormed() || !text.trim() || [...text].length > 2400) {
      return { kind: "failure", code: "AI_INPUT_INVALID" };
    }
    const controller = new AbortController();
    let active = true;
    const started = this.monotonicNow(), deadline = started + 60_000;
    const live = () => active && !controller.signal.aborted && !control.signal.aborted && control.current() &&
      Number.isFinite(this.monotonicNow()) && this.monotonicNow() >= started && this.monotonicNow() < deadline;
    if (!live()) return { kind: "terminated" };
    if (this.pending || this.modelBusy()) return { kind: "failure", code: "AI_BUSY" };
    const request = Object.freeze({});
    this.pending = request;
    let generationTimer: ReturnType<typeof setTimeout> | undefined;
    let resolveStopped!: (value: ConversationResult<void>) => void;
    const stopped = new Promise<ConversationResult<void>>(resolve => { resolveStopped = resolve; });
    const stop = (value: ConversationResult<void>) => {
      if (!active) return;
      // Revoke the original continuation before a new request can be admitted.
      active = false;
      controller.abort();
      resolveStopped(value);
    };
    const disconnect = () => stop({ kind: "terminated" });
    control.signal.addEventListener("abort", disconnect, { once: true });
    const requestTimer = setTimeout(() => stop({ kind: "failure", code: "AI_UNAVAILABLE" }),
      Math.max(0, deadline - this.monotonicNow()));
    requestTimer.unref();
    const permission = async (): Promise<ConversationResult<PersonaPreviewPermission>> => {
      if (!live()) return { kind: "terminated" };
      const verified = await caller.verifyCurrentAuth();
      if (!live()) return { kind: "terminated" };
      if (verified.kind === "invalid") return { kind: "failure", code: "AUTH_REQUIRED" };
      if (verified.kind === "forbidden" || (verified.kind === "verified" && verified.principal.firebaseUid !== caller.principal.firebaseUid)) {
        return { kind: "failure", code: "AUTH_FORBIDDEN" };
      }
      if (verified.kind !== "verified") return { kind: "failure", code: "AI_UNAVAILABLE" };
      const result = await this.authority.read(verified.principal);
      return live() ? result : { kind: "terminated" };
    };
    const work = async (): Promise<ConversationResult<void>> => {
      try {
        const before = await permission();
        if (before.kind !== "success") return before;
        if (!live()) return { kind: "terminated" };
        const input: ConversationInput = Object.freeze({ strategy: "open_conversation_v1", currentMessage: text,
          checkIns: Object.freeze([]), history: Object.freeze([]), persona: personaExpressionProjection(expression) });
        const budget = { signal: controller.signal, deadline, remainingMs: () => Math.max(0, deadline - this.monotonicNow()) };
        // Generation has its own 45-second limit inside the original request.
        // The transport retains the physical lane if its provider is unresolved.
        generationTimer = setTimeout(() => stop({ kind: "failure", code: "AI_UNAVAILABLE" }),
          Math.min(45_000, budget.remainingMs()));
        generationTimer.unref();
        if (!live()) return { kind: "terminated" };
        const raw = await this.generation.generate(input, budget);
        clearTimeout(generationTimer);
        if (!live()) return { kind: "terminated" };
        if (!raw || controller.signal.aborted) return { kind: "failure", code: "AI_UNAVAILABLE" };
        const output = parseOutput(raw, "ai_assistant_message_v1", true);
        if (!output.ok) return { kind: "failure", code: "AI_REPLY_REJECTED" };
        const after = await permission();
        if (after.kind !== "success") return after;
        if (before.value.ownerId !== after.value.ownerId || before.value.purposeRevocationGeneration !== after.value.purposeRevocationGeneration) {
          return { kind: "failure", code: "AI_AUTHORITY_CHANGED" };
        }
        if (!live() || controller.signal.aborted || !control.accept(output.value.message)) return { kind: "terminated" };
        return { kind: "success", value: undefined };
      } catch { return live() ? { kind: "failure", code: "AI_UNAVAILABLE" } : { kind: "terminated" }; }
    };
    try {
      if (!live()) disconnect();
      // Permission I/O before and after generation shares this same stop race.
      // Detached work is consumed but has no authority to dispatch or deliver.
      return await Promise.race([stopped, work()]);
    }
    finally {
      active = false;
      controller.abort();
      clearTimeout(requestTimer);
      if (generationTimer) clearTimeout(generationTimer);
      control.signal.removeEventListener("abort", disconnect);
      if (this.pending === request) this.pending = undefined;
    }
  }
}
