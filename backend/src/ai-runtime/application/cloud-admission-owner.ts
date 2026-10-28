import type { RequestBudget } from "../ports/generation-transport.js";
import type { CloudGenerationObservation, CloudGenerationTransport, CloudRecoveryAuthority,
  CloudRecoveredReservation, CloudAdmissionLimits } from "../ports/cloud-generation-transport.js";
import type { RuntimeClock } from "../ports/runtime-clock.js";

interface Reservation { readonly expiresAt: number; readonly tokens: number }
/** Opaque request-local capability; callers cannot mutate the owner's state. */
export type CloudAttempt = object;
interface AttemptState {
  state: "reserved" | "pending" | "unknown" | "stopped" | "not_started";
  readonly signal: AbortSignal;
  readonly overallDeadline: number;
  readonly reservation: Reservation;
}
type Admission = "ready" | "capacity" | "unavailable";
const positive = (value: number): boolean => Number.isSafeInteger(value) && value > 0;

/** One owner for one cloud runtime, shared by every consuming feature. It holds
 * only quota/settlement metadata, never prompts, outputs, credentials or targets. */
export class CloudAdmissionOwner<Input> {
  private phase: "closed" | "recovering" | "ready" | "blocked" = "closed";
  private bound = false;
  private readonly reservations: Reservation[] = [];
  private readonly issued = new WeakMap<CloudAttempt, AttemptState>();
  private reservationPending = false;
  private remotePending = 0;
  private remoteUnknown = 0;
  private previousRemote: "unknown" | "none_confirmed" = "unknown";
  private lease: object | undefined;
  private lastClock = 0;
  private readonly limits: Readonly<CloudAdmissionLimits>;

  constructor(private readonly clock: RuntimeClock, private readonly transport: CloudGenerationTransport<Input>,
    private readonly authority: CloudRecoveryAuthority, limits: CloudAdmissionLimits) {
    if (!limits || !positive(limits.windowMs) || limits.windowMs > Number.MAX_SAFE_INTEGER - 60_000 ||
        !positive(limits.maxRequests) || !positive(limits.maxTokens) ||
        !positive(limits.tokensPerRequest) || limits.tokensPerRequest > limits.maxTokens ||
        typeof transport?.dispatch !== "function" || typeof authority?.recover !== "function" ||
        typeof authority.reserve !== "function" || typeof authority.current !== "function") throw Error("CLOUD_CONFIGURATION_INVALID");
    this.limits = Object.freeze({ ...limits });
  }

  /** Prevent accidentally creating per-feature runtimes with separate user lanes. */
  bindRuntime(clock: RuntimeClock): void {
    if (this.bound) throw Error("CLOUD_OWNER_ALREADY_BOUND");
    if (clock !== this.clock) throw Error("CLOUD_CLOCK_MISMATCH");
    this.bound = true;
  }

  shutdown(): void { this.phase = "blocked"; }

  private now(): number | undefined {
    try {
      const value = this.clock.now();
      if (!Number.isFinite(value) || value < this.lastClock || value > Number.MAX_SAFE_INTEGER) throw Error();
      this.lastClock = value;
      return value;
    } catch { this.phase = "blocked"; return undefined; }
  }
  private current(lease = this.lease): boolean {
    try { if (lease && this.authority.current(lease) === true) return true; } catch { /* fail closed */ }
    this.phase = "blocked";
    return false;
  }
  private prune(now: number): void {
    for (let i = this.reservations.length - 1; i >= 0; i--) {
      if (this.reservations[i]!.expiresAt <= now) this.reservations.splice(i, 1);
    }
  }
  private remaining(): number { return this.reservations.reduce((sum, item) => sum + item.tokens, 0); }

  /** Existing application authority still runs separately at every effect. */
  isCurrent(): boolean { return this.phase === "ready" && this.current(); }

  /** Explicit only. Repeated recovery cannot reset an already-open owner's quota. */
  async recover(): Promise<boolean> {
    if (this.phase !== "closed") return false;
    this.phase = "recovering";
    try {
      const snapshot = await this.authority.recover(this.limits), now = this.now();
      if (this.phase !== "recovering" || now === undefined || snapshot.kind !== "confirmed" ||
          !snapshot.lease || typeof snapshot.lease !== "object" || !this.current(snapshot.lease) ||
          !Array.isArray(snapshot.reservations) || snapshot.reservations.length > this.limits.maxRequests ||
          !["unknown", "none_confirmed"].includes(snapshot.previousRemote)) throw Error();
      let tokens = 0;
      const restored = snapshot.reservations.map((r: CloudRecoveredReservation) => {
        if (!r || !positive(r.tokens) || !Number.isSafeInteger(r.remainingMs) || r.remainingMs <= 0 ||
            r.remainingMs > this.limits.windowMs + 60_000 || now > Number.MAX_SAFE_INTEGER - r.remainingMs) throw Error();
        tokens += r.tokens;
        if (!Number.isSafeInteger(tokens) || tokens > this.limits.maxTokens) throw Error();
        return { tokens: r.tokens, expiresAt: now + r.remainingMs };
      });
      this.reservations.push(...restored);
      this.previousRemote = snapshot.previousRemote;
      this.lease = snapshot.lease;
      this.phase = "ready";
      return true;
    } catch { this.phase = "blocked"; return false; }
  }

  get state() {
    if (this.phase === "ready") this.current();
    const now = this.now();
    if (now !== undefined) this.prune(now);
    return Object.freeze({ ready: this.phase === "ready", recovery: this.phase,
      reservedRequests: this.reservations.length, reservedTokens: this.remaining(),
      remotePending: this.remotePending, remoteUnknown: this.remoteUnknown, previousRemote: this.previousRemote });
  }

  admission(): Admission {
    if (this.phase !== "ready" || this.reservationPending || !this.current()) return "unavailable";
    const now = this.now();
    if (now === undefined) return "unavailable";
    this.prune(now);
    return this.reservations.length >= this.limits.maxRequests ||
      this.remaining() + this.limits.tokensPerRequest > this.limits.maxTokens ? "capacity" : "ready";
  }

  /** Quota authority completes before application preparation and dispatch.
   * Account until the original operation deadline plus a full quota window so
   * asynchronous confirmation cannot expire a reservation before dispatch. */
  async reserve(budget: RequestBudget, live: () => boolean): Promise<CloudAttempt | undefined> {
    if (this.admission() !== "ready") return undefined;
    const signal = budget.signal, overallDeadline = budget.deadline, remaining = budget.remainingMs(), now = this.now();
    if (now === undefined || !signal || signal.aborted || !Number.isFinite(remaining) || remaining <= 0 ||
        !Number.isFinite(overallDeadline) || overallDeadline <= now || overallDeadline > now + 60_000 ||
        overallDeadline > Number.MAX_SAFE_INTEGER - this.limits.windowMs || !live()) return undefined;
    const reservation = { expiresAt: overallDeadline + this.limits.windowMs, tokens: this.limits.tokensPerRequest };
    this.reservations.push(reservation);
    this.reservationPending = true;
    let result: "confirmed" | "rejected" | "unknown" = "unknown";
    try { result = await this.authority.reserve(this.lease!, { tokens: reservation.tokens, conservativeExpiresAt: reservation.expiresAt }, live); }
    catch { /* unknown authority write is never treated as no effect */ }
    this.reservationPending = false;
    if (result === "unknown") { this.phase = "blocked"; return undefined; }
    if (result === "rejected") {
      const index = this.reservations.indexOf(reservation);
      if (index >= 0) this.reservations.splice(index, 1);
      return undefined;
    }
    if (result !== "confirmed") { this.phase = "blocked"; return undefined; }
    // A confirmed reservation is never refunded, even if the original request
    // has since expired; it remains conservative accounting until its window.
    const attempt: CloudAttempt = Object.freeze({});
    this.issued.set(attempt, { state: "reserved", signal, overallDeadline, reservation });
    return attempt;
  }

  dispatch(attempt: CloudAttempt, input: Input, budget: RequestBudget): Promise<CloudGenerationObservation> | undefined {
    const state = this.issued.get(attempt);
    try {
      const remaining = budget.remainingMs();
      if (!state || state.state !== "reserved" || this.phase !== "ready" ||
          !this.current() || budget.signal !== state.signal || state.signal.aborted ||
          !Number.isFinite(budget.deadline) || budget.deadline > state.overallDeadline ||
          !Number.isFinite(remaining) || remaining <= 0) return undefined;
      const now = this.now();
      if (now === undefined || now >= budget.deadline || now >= state.overallDeadline ||
          now >= state.reservation.expiresAt || !this.reservations.includes(state.reservation)) return undefined;
    } catch { return undefined; }
    state.state = "pending";
    this.remotePending++;
    try { return Promise.resolve(this.transport.dispatch(input, budget)); }
    catch { return Promise.resolve({ kind: "unknown", physical: "unknown" }); }
  }

  notStarted(attempt: CloudAttempt): void {
    const state = this.issued.get(attempt);
    if (!state || state.state !== "reserved") return;
    state.state = "not_started";
    this.issued.delete(attempt);
  }

  unknown(attempt: CloudAttempt): void {
    const state = this.issued.get(attempt);
    if (!state || state.state !== "pending") return;
    state.state = "unknown";
    this.remotePending--;
    this.remoteUnknown++;
  }
  stopped(attempt: CloudAttempt): void {
    const state = this.issued.get(attempt);
    if (!state) return;
    if (state.state === "pending") this.remotePending--;
    else if (state.state === "unknown") this.remoteUnknown--;
    else return;
    state.state = "stopped";
    this.issued.delete(attempt);
  }
}
