import type { ConversationOperationQuiescence } from "../ports/application-conversation-operations.js";
import type { ConversationQuiescence } from "../ports/conversation-cleanup.js";

/** Tracks actual returned adapter promises, not cancellation notifications. Only
 * content-free target/operation identities and void settlement promises remain. */
export class ConversationIoTracker {
  private readonly pending = new Map<string, Map<symbol, { operationId: string; settled: Promise<void> }>>();
  private readonly holds = new Map<string, symbol>();
  private key(owner: string, conversation: string): string { return `${owner}/${conversation}`; }
  run<T>(owner: string, conversation: string, operationId: string, work: () => Promise<T>): Promise<T> {
    const key = this.key(owner, conversation);
    if (this.holds.has(key)) return Promise.reject(new Error("Target I/O admission is held"));
    let complete!: () => void;
    const settled = new Promise<void>(resolve => { complete = resolve; });
    const marker = Symbol(), records = this.pending.get(key) ?? new Map();
    records.set(marker, { operationId, settled }); this.pending.set(key, records);
    // Register BEFORE invoking a supplier which can synchronously start SDK I/O.
    let result: Promise<T>;
    try { result = work(); } catch (error) { result = Promise.reject(error); }
    return Promise.resolve(result).finally(() => {
      records.delete(marker); if (records.size === 0 && this.pending.get(key) === records) this.pending.delete(key);
      complete();
    });
  }
  async settled(owner: string, conversation: string, operationId?: string): Promise<void> {
    const key = this.key(owner, conversation);
    for (;;) {
      const records = [...(this.pending.get(key)?.values() ?? [])].filter(row => operationId === undefined || row.operationId === operationId);
      if (records.length === 0) return;
      await Promise.all(records.map(row => row.settled));
    }
  }
  idle(owner: string, conversation: string, operationId?: string): boolean {
    return ![...(this.pending.get(this.key(owner, conversation))?.values() ?? [])]
      .some(row => operationId === undefined || row.operationId === operationId);
  }
  count(owner: string, conversation: string, operationId: string): number {
    return [...(this.pending.get(this.key(owner,conversation))?.values() ?? [])].filter(row=>row.operationId===operationId).length;
  }
  hold(owner: string, conversation: string): { current(): boolean; release(): void } | undefined {
    const key = this.key(owner, conversation); if (this.holds.has(key)) return undefined;
    const marker = Symbol(); this.holds.set(key, marker);
    return { current: () => this.holds.get(key) === marker,
      release: () => { if (this.holds.get(key) === marker) this.holds.delete(key); } };
  }
}

/** Registry admission is proved by ZHOU's lease; actual SDK settlement is an
 * independent additional condition. No timeout, abort or model state fakes it. */
export class ConversationIoQuiescence implements ConversationQuiescence {
  constructor(private readonly registry: ConversationOperationQuiescence, private readonly io: ConversationIoTracker) {}
  withTargetClosed<T>(owner: string, conversation: string, work: () => Promise<T>) {
    return this.withTarget(owner, conversation, "closed", work);
  }
  withTargetIdle<T>(owner: string, conversation: string, work: () => Promise<T>) {
    return this.withTarget(owner, conversation, "idle", work);
  }
  private async withTarget<T>(owner: string, conversation: string, mode: "closed" | "idle", work: () => Promise<T>):
    Promise<{ kind: "settled"; value: T } | { kind: "unresolved" }> {
    // acquireTargetLease installs the registry hold synchronously, before await.
    const acquired = await this.registry.acquireTargetLease(owner, conversation, mode);
    if (acquired.kind !== "acquired") return { kind: "unresolved" };
    const lease = acquired.lease;
    let ioHold: ReturnType<ConversationIoTracker["hold"]>;
    try {
      if (lease.ownerAccountId !== owner || lease.conversationId !== conversation || lease.mode !== mode || !lease.current()) return { kind: "unresolved" };
      ioHold = this.io.hold(owner, conversation); if (!ioHold) return { kind: "unresolved" };
      await this.io.settled(owner, conversation);
      if (!lease.current() || !ioHold.current() || !this.io.idle(owner, conversation)) return { kind: "unresolved" };
      const value = await work();
      return lease.current() && ioHold.current() && this.io.idle(owner, conversation) ? { kind: "settled", value } : { kind: "unresolved" };
    } catch { return { kind: "unresolved" }; }
    finally { ioHold?.release(); lease.release(); }
  }
}
