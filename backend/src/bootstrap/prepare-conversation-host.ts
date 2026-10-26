import type { ConversationOperationExecutor } from '../ai-conversation/ports/application-conversation-operations.js';

/** Empty host preload precedes business admission; no input or result is copied.
 * An abandoned preload can finish physically but cannot dispatch its old send. */
export function prepareConversationHost(inner: ConversationOperationExecutor,
  prepareHost: () => Promise<void>): ConversationOperationExecutor {
  return { create(input, delivery) {
    const execution = inner.create(input, delivery);
    let revoked = false;
    return {
      async dispatch() {
        if (revoked || delivery.signal.aborted || !delivery.current()) return { kind: 'terminated' };
        try { await prepareHost(); }
        catch { return { kind: 'failure', code: 'AI_UNAVAILABLE' }; }
        if (revoked || delivery.signal.aborted || !delivery.current()) return { kind: 'terminated' };
        return execution.dispatch();
      },
      cancel() { revoked = true; return execution.cancel(); },
      dispose() { revoked = true; execution.dispose(); },
    };
  } };
}
