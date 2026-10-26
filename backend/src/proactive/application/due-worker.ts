import type { FirstFlowApplication } from "./first-flow-application.js";
import type { ProactiveActor } from "../ports/first-flow.js";

export interface DueWorkerOptions {
  readonly application: FirstFlowApplication;
  readonly actor: ProactiveActor;
  readonly endsAtMs: number;
  readonly nowMs?: () => number;
  readonly intervalMs?: number;
}

/** Explicitly started, bounded one-owner worker. No global scans, provider retry
 * or automatic bootstrap registration. Integration owns its actual composition. */
export class FirstFlowDueWorker {
  private readonly now: () => number;
  private readonly abort = new AbortController();
  private timer: ReturnType<typeof setInterval> | undefined;
  private endTimer: ReturnType<typeof setTimeout> | undefined;
  private pending: Promise<void> | undefined;
  private recovered = false;

  constructor(private readonly options: DueWorkerOptions) {
    this.now = options.nowMs ?? Date.now;
    if (!Number.isSafeInteger(options.endsAtMs) || options.endsAtMs <= this.now() || options.endsAtMs - this.now() > 30 * 60000 ||
      !Number.isSafeInteger(options.intervalMs ?? 60000) || (options.intervalMs ?? 60000) < 1000) throw Error("Invalid worker window");
  }
  private current(): boolean {
    try { return !this.abort.signal.aborted && this.now() < this.options.endsAtMs && this.options.actor.current(); }
    catch { return false; }
  }
  start(): void {
    if (this.timer || !this.current()) return;
    this.timer = setInterval(() => { void this.tick(); }, this.options.intervalMs ?? 60000);
    this.endTimer = setTimeout(() => {
      this.abort.abort(); if (this.timer) clearInterval(this.timer); this.timer = undefined;
    }, Math.max(1, this.options.endsAtMs - this.now()));
    this.endTimer.unref();
    this.timer.unref(); void this.tick();
  }
  tick(): Promise<void> {
    if (!this.current()) {
      this.abort.abort(); if (this.timer) clearInterval(this.timer); this.timer = undefined;
      if (this.endTimer) clearTimeout(this.endTimer); this.endTimer = undefined;
      return this.pending ?? Promise.resolve();
    }
    if (this.pending) return this.pending;
    this.pending = this.cycle().catch(() => { /* Safe failure; no private detail/log/retry. */ })
      .finally(() => { this.pending = undefined; });
    return this.pending;
  }
  private async cycle(): Promise<void> {
    const original = this.options.actor;
    const actor: ProactiveActor = { principal: original.principal, verifyCurrentAuth: () => original.verifyCurrentAuth(), current: () => this.current() };
    if (!this.recovered) {
      const recovery = await this.options.application.recover(actor);
      if (!this.current() || recovery.kind !== "ok") return;
      this.recovered = true;
    }
    const active = await this.options.application.activeIntents(actor);
    if (!this.current() || active.kind !== "ok" || active.value.length > 3) return;
    for (const intent of active.value) {
      if (!this.current()) return;
      if ((intent.state === "queued" && Date.parse(intent.dueAt) <= this.now()) ||
        (intent.state === "published" && intent.dispatchState === "not_started")) {
        await this.options.application.runIntent(actor, intent.intentId, this.abort.signal);
      }
    }
  }
  /** Stop scheduling immediately; physical model settlement still owns pending. */
  async stop(): Promise<void> {
    this.abort.abort(); if (this.timer) clearInterval(this.timer); this.timer = undefined;
    if (this.endTimer) clearTimeout(this.endTimer); this.endTimer = undefined;
    await this.pending;
  }
}
