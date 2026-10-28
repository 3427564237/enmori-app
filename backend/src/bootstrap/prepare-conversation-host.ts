import type { ConversationOperationExecutor } from '../ai-conversation/ports/application-conversation-operations.js';

/** Empty host preload precedes business admission; no input or result is copied.
 * An abandoned preload can finish physically but cannot dispatch its old send. */
export function prepareConversationHost(inner: ConversationOperationExecutor,
  prepareHost: () => Promise<void>): ConversationOperationExecutor {
  return { create(input, delivery) {
    const execution = inner.create(input, delivery);
    let revoked = false;
    let releaseWaiter!: () => void;
    const abandoned = new Promise<false>(resolve => { releaseWaiter = () => resolve(false); });
    const revoke = () => { revoked = true; releaseWaiter(); };
    return {
      async dispatch() {
        if (revoked || delivery.signal.aborted || !delivery.current()) return { kind: 'terminated' };
        delivery.signal.addEventListener('abort', revoke, { once: true });
        try {
          // Detach only the business waiter. Observe the physical preload even
          // after cancellation; its model-lane pending/unknown fence stays owned
          // by LocalModelLane until physical settlement is proven.
          const ready = await Promise.race([prepareHost().then(() => true), abandoned]);
          if (!ready) return { kind: 'terminated' };
        }
        catch {
          return revoked || delivery.signal.aborted || !delivery.current()
            ? { kind: 'terminated' } : { kind: 'failure', code: 'AI_UNAVAILABLE' };
        }
        finally { delivery.signal.removeEventListener('abort', revoke); }
        if (revoked || delivery.signal.aborted || !delivery.current()) return { kind: 'terminated' };
        return execution.dispatch();
      },
      cancel() { revoke(); return execution.cancel(); },
      dispose() { revoke(); execution.dispose(); },
    };
  } };
}
