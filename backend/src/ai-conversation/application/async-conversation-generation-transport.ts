import type { GenerationTransport, RequestBudget } from "../../ai-runtime/ports/generation-transport.js";
import type { AsyncConversationModelInput } from "../ports/async-conversation.js";
import type { ConversationInput } from "../ports/conversation-lifecycle.js";

/** Mandatory dispatch adapter: the backend-local handle never enters Qwen JSON. */
export class AuthorizedAsyncConversationGenerationTransport implements GenerationTransport<AsyncConversationModelInput> {
  private readonly consumed = new WeakSet<AsyncConversationModelInput>();
  constructor(private readonly model: GenerationTransport<ConversationInput>) {}

  generate(handle: AsyncConversationModelInput, budget: RequestBudget): Promise<Uint8Array> {
    if (!handle || this.consumed.has(handle) || !this.live(budget)) return Promise.reject(new Error("unavailable"));
    this.consumed.add(handle);
    // The closure retains only a revocable, content-free handle during authority I/O.
    return handle.authorize().then(authorized => {
      if (!authorized || !this.live(budget)) throw new Error("unavailable");
      const input = handle.projection();
      if (!input || !this.live(budget)) throw new Error("unavailable");
      // No await between the final borrow/guard and actual adapter dispatch. The
      // model Port settles only once underlying generation has really stopped.
      // Cancel cannot settle this wrapper early or release quarantine prematurely.
      return this.model.generate(input, budget);
    });
  }
  private live(budget: RequestBudget): boolean {
    try { return !budget.signal.aborted && budget.remainingMs() > 0; }
    catch { return false; }
  }
}
