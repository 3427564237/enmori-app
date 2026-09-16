import { parseOutput, type OutputCandidate, type OutputPurpose } from "../domain/parse-output.js";
import type { GenerationTransport, RequestBudget } from "../ports/generation-transport.js";
import type { RuntimeClock } from "../ports/runtime-clock.js";
import type { Result } from "../../shared/domain/result.js";

export type RuntimeFailure = "queue_expired" | "generation_timed_out" | "timed_out"
  | "abandoned" | "cancelled" | "dependency_unavailable" | "invalid_output"
  | "unsafe_output" | "stale_authority";
export type RuntimeOutcome = Result<OutputCandidate, RuntimeFailure>;
export type Cancellation = "abandoned" | "cancelled";

export interface RuntimeWork<Input> {
  readonly purpose: OutputPurpose;
  /** No client-supplied identity/context. The trusted caller owns projection. */
  prepare(budget: RequestBudget): Promise<Input>;
  /**
   * Injected remaining pipeline checkpoint, under the ORIGINAL deadline.
   * S2-05 does not implement semantic policy/authority validation. This hook
   * must not persist/deliver content and must obey cancellation. Later product
   * integration still needs all Q17/Q19/Q31 gates before persistence/delivery.
   */
  checkCandidate(candidate: OutputCandidate, budget: RequestBudget): Promise<Result<void, "unsafe_output" | "stale_authority">>;
}

export interface RuntimeRequest {
  readonly acceptedAt: number;
  readonly deadline: number;
  readonly outcome: Promise<RuntimeOutcome>;
  cancel(reason: Cancellation): void;
}
export type Admission =
  | { readonly accepted: true; readonly request: RuntimeRequest }
  | { readonly accepted: false; readonly failure: "overload" | "dependency_unavailable" };

interface Entry<Input> {
  readonly user: string;
  readonly acceptedAt: number;
  readonly deadline: number;
  readonly abort: AbortController;
  readonly resolve: (outcome: RuntimeOutcome) => void;
  work: RuntimeWork<Input> | undefined;
  terminal: boolean;
  generating: boolean;
  generationEnd: number | undefined;
  cancelOverall: () => void;
  cancelQueue: () => void;
  cancelGeneration: () => void;
}

/** One instance per controlled host. Internal only; never wired to a route. */
export class BoundedAiRuntime<Input> {
  private readonly users = new Map<string, Entry<Input>>();
  private readonly queue: Entry<Input>[] = [];
  // Reserves the single generation lane during preparation, then holds it until
  // confirmed transport settlement. Application and host slots are distinct.
  private active: Entry<Input> | undefined;
  private stopped = false;

  constructor(private readonly clock: RuntimeClock, private readonly transport: GenerationTransport<Input>) {}

  get state(): { readonly admission: "open" | "busy" | "stopped"; readonly quarantined: boolean; readonly queued: number; readonly nonTerminal: number } {
    return {
      admission: this.stopped ? "stopped" : this.active && this.queue.length >= 2 ? "busy" : "open",
      quarantined: Boolean(this.active?.terminal && this.active.generating),
      queued: this.queue.length,
      nonTerminal: this.users.size,
    };
  }

  /** trustedUser is from the authenticated Application boundary, not a DTO. */
  submit(trustedUser: string, work: RuntimeWork<Input>): Admission {
    if (this.stopped || this.state.quarantined) return { accepted: false, failure: "dependency_unavailable" };
    if (this.users.has(trustedUser) || (this.active && this.queue.length >= 2)) return { accepted: false, failure: "overload" };
    const acceptedAt = this.clock.now();
    let resolve!: (outcome: RuntimeOutcome) => void;
    const outcome = new Promise<RuntimeOutcome>((done) => { resolve = done; });
    const entry: Entry<Input> = {
      user: trustedUser, acceptedAt, deadline: acceptedAt + 60_000,
      abort: new AbortController(), resolve, work, terminal: false,
      generating: false, generationEnd: undefined,
      cancelOverall: () => {}, cancelQueue: () => {}, cancelGeneration: () => {},
    };
    this.users.set(trustedUser, entry);
    entry.cancelOverall = this.clock.at(entry.deadline, () => this.fail(entry, "timed_out"));
    if (!this.active) this.start(entry);
    else {
      this.queue.push(entry);
      entry.cancelQueue = this.clock.at(Math.min(acceptedAt + 5_000, entry.deadline), () => this.fail(entry, "queue_expired"));
    }
    return { accepted: true, request: {
      acceptedAt, deadline: entry.deadline, outcome,
      cancel: (reason) => this.fail(entry, reason),
    } };
  }

  shutdown(): void {
    this.stopped = true;
    for (const entry of [...this.users.values()]) this.fail(entry, "cancelled");
  }

  private budget(entry: Entry<Input>, deadline = entry.deadline): RequestBudget {
    return Object.freeze({ deadline, signal: entry.abort.signal, remainingMs: () => Math.max(0, deadline - this.clock.now()) });
  }

  private start(entry: Entry<Input>): void {
    entry.cancelQueue();
    this.active = entry;
    void this.run(entry);
  }

  private async run(entry: Entry<Input>): Promise<void> {
    try {
      const work = entry.work;
      if (!work || this.expired(entry)) return;
      const input = await work.prepare(this.budget(entry));
      if (this.expired(entry)) return;
      entry.generating = true;
      entry.generationEnd = Math.min(this.clock.now() + 45_000, entry.deadline);
      entry.cancelGeneration = this.clock.at(entry.generationEnd, () => this.fail(entry, "generation_timed_out"));
      let raw: Uint8Array;
      try {
        raw = await this.transport.generate(input, this.budget(entry, entry.generationEnd));
      } finally {
        // A transport MUST NOT settle merely because cancellation was sent.
        entry.generating = false;
        entry.cancelGeneration();
        this.releaseLane(entry);
      }
      if (this.expired(entry)) return;
      if (this.clock.now() >= entry.generationEnd) { this.fail(entry, "generation_timed_out"); return; }
      const parsed = parseOutput(raw, work.purpose);
      if (this.expired(entry)) return;
      if (!parsed.ok) { this.fail(entry, parsed.failure); return; }
      const checked = await work.checkCandidate(parsed.value, this.budget(entry));
      if (this.expired(entry)) return;
      if (!checked.ok) { this.fail(entry, checked.failure); return; }
      this.finish(entry, parsed);
    } catch {
      // Stable non-content failure, no raw dependency/checkpoint error retained.
      this.fail(entry, "dependency_unavailable");
    } finally {
      if (!entry.generating) this.releaseLane(entry);
    }
  }

  private expired(entry: Entry<Input>): boolean {
    if (!entry.terminal && this.clock.now() >= entry.deadline) this.fail(entry, "timed_out");
    return entry.terminal;
  }

  private fail(entry: Entry<Input>, failure: RuntimeFailure): void {
    // Even delayed timer/cancel/dependency callbacks cannot beat the deadline.
    this.finish(entry, { ok: false, failure: this.clock.now() >= entry.deadline ? "timed_out" : failure });
  }

  private finish(entry: Entry<Input>, outcome: RuntimeOutcome): void {
    if (entry.terminal) return;
    entry.terminal = true;
    entry.work = undefined;
    entry.cancelOverall(); entry.cancelQueue(); entry.cancelGeneration();
    this.users.delete(entry.user);
    const queuedIndex = this.queue.indexOf(entry);
    if (queuedIndex !== -1) this.queue.splice(queuedIndex, 1);
    entry.resolve(outcome);
    entry.abort.abort();
    // Preparation is not generation: it can be abandoned without quarantine.
    if (!entry.generating) this.releaseLane(entry);
  }

  private releaseLane(entry: Entry<Input>): void {
    if (this.active !== entry) return;
    this.active = undefined;
    if (this.stopped) return;
    while (this.queue.length > 0) {
      const next = this.queue.shift()!;
      if (next.terminal) continue;
      if (this.clock.now() >= Math.min(next.acceptedAt + 5_000, next.deadline)) {
        this.fail(next, "queue_expired");
        continue;
      }
      this.start(next);
      return;
    }
  }
}
