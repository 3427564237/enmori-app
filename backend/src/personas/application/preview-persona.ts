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
  private pending = false;
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
    const started = this.monotonicNow(), deadline = started + 60_000;
    const live = () => !control.signal.aborted && control.current() && Number.isFinite(this.monotonicNow()) && this.monotonicNow() < deadline;
    if (!live()) return { kind: "terminated" };
    if (this.pending || this.modelBusy()) return { kind: "failure", code: "AI_BUSY" };
    this.pending = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disconnect: (() => void) | undefined;
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
    try {
      const before = await permission();
      if (before.kind !== "success") return before;
      if (!live()) return { kind: "terminated" };
      const input: ConversationInput = Object.freeze({ strategy: "open_conversation_v1", currentMessage: text,
        checkIns: Object.freeze([]), history: Object.freeze([]), persona: personaExpressionProjection(expression) });
      const budget = { signal: controller.signal, deadline, remainingMs: () => Math.max(0, deadline - this.monotonicNow()) };
      const stopped = new Promise<undefined>(resolve => {
        disconnect = () => { controller.abort(); resolve(undefined); };
        control.signal.addEventListener("abort", disconnect, { once: true });
        // Same single-generation capacity as the existing local chat runtime.
        timer = setTimeout(disconnect, Math.min(45_000, budget.remainingMs()));
        timer.unref();
      });
      if (!live()) return { kind: "terminated" };
      const raw = await Promise.race([this.generation.generate(input, budget), stopped]);
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
    finally {
      controller.abort();
      if (timer) clearTimeout(timer);
      if (disconnect) control.signal.removeEventListener("abort", disconnect);
      this.pending = false;
    }
  }
}
