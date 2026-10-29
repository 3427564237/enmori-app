import type { FirstFlowApplication } from "./first-flow-application.js";
import type { ProactiveActor } from "../ports/first-flow.js";

export interface DueWorkerOptions {
  readonly application: FirstFlowApplication;
  readonly actor: ProactiveActor;
  readonly mode?: "service";
  readonly endsAtMs?: number;
  readonly nowMs?: () => number;
  readonly intervalMs?: number;
}

/** Explicitly started one-owner worker. No global scans, provider retry
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
    if ((options.mode === "service" ? options.endsAtMs !== undefined :
        options.mode !== undefined || !Number.isSafeInteger(options.endsAtMs) || options.endsAtMs! <= this.now() || options.endsAtMs! - this.now() > 30 * 60000) ||
      !Number.isSafeInteger(options.intervalMs ?? 60000) || (options.intervalMs ?? 60000) < 1000 ||
      (options.intervalMs ?? 60000) > 2_147_483_647) throw Error("Invalid worker window");
  }
  private expired(): boolean { return this.options.mode !== "service" && this.now() >= this.options.endsAtMs!; }
  private current(): boolean {
    try { return !this.abort.signal.aborted && !this.expired() && this.options.actor.current(); }
    catch { return false; }
  }
  start(): void {
    if (this.timer || this.abort.signal.aborted || this.expired()) return;
    this.timer = setInterval(() => { void this.tick(); }, this.options.intervalMs ?? 60000);
    if (this.options.mode !== "service") this.endTimer = setTimeout(() => {
      this.abort.abort(); if (this.timer) clearInterval(this.timer); this.timer = undefined;
    }, Math.max(1, this.options.endsAtMs! - this.now()));
    this.endTimer?.unref();
    this.timer.unref(); void this.tick();
  }
  get running(): boolean { return this.timer !== undefined && !this.abort.signal.aborted && !this.expired(); }
  tick(): Promise<void> {
    if (this.abort.signal.aborted || this.expired()) {
      this.abort.abort(); if (this.timer) clearInterval(this.timer); this.timer = undefined;
      if (this.endTimer) clearTimeout(this.endTimer); this.endTimer = undefined;
      return this.pending ?? Promise.resolve();
    }
    // A transient dependency-health failure blocks this cycle, not all future
    // appointments. Pending work still rechecks the original actor throughout.
    if (!this.current()) return this.pending ?? Promise.resolve();
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
