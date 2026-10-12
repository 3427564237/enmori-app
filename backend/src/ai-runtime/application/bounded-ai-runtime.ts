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

/** Internal fake-Port lifecycle only; this is not a public response/replay. */
export type RuntimeApplicationOutcome = Result<void, RuntimeFailure>;
export interface RuntimeApplicationRequest {
  readonly acceptedAt: number;
  readonly deadline: number;
  readonly outcome: Promise<RuntimeApplicationOutcome>;
  cancel(reason: Cancellation): void;
}
export type RuntimeApplicationAdmission =
  | { readonly accepted: true; readonly request: RuntimeApplicationRequest }
  | { readonly accepted: false; readonly failure: "overload" | "dependency_unavailable" };

export interface RuntimeApplicationControl extends RequestBudget {
  readonly acceptedAt: number;
  live(): boolean;
  fail(failure: RuntimeFailure): void;
  /**
   * Called AT the actual synchronous fake effect, not before awaiting it.
   * The callback must check current authority and perform its effect as one
   * non-yielding event. A rejected/thrown effect terminates the operation.
   */
  effect<T>(effect: () => Result<T, RuntimeFailure>): Result<T, RuntimeFailure>;
  /** Guarded sink acceptance AND successful terminal transition, once. */
  complete(effect: () => RuntimeApplicationOutcome): RuntimeApplicationOutcome;
}

export interface RuntimeApplicationWork<Input> {
  readonly purpose: OutputPurpose;
  /** Prepare/check input and confirm the user commit, using revocable holders. */
  prepare(): Promise<void>;
  /** Synchronous current-authority check immediately at model dispatch. */
  dispatchInput(): Result<Input, RuntimeFailure>;
  /** Synchronous transfer into the Application's disposable candidate holder. */
  acceptCandidate(candidate: OutputCandidate): void;
  /** No content-bearing promise; failures call the original control.fail. */
  checkCandidate(): Promise<void>;
  /** Only control.complete may finish successfully, at actual sink acceptance. */
  commitAndDeliver(): Promise<void>;
  /** Clear all request-only input/snapshot/candidate references, exactly once. */
  dispose(): void;
}

type Pipeline<Input> =
  | { readonly kind: "component"; readonly resolve: (outcome: RuntimeOutcome) => void;
    work: RuntimeWork<Input> | undefined; candidate: OutputCandidate | undefined }
  | { readonly kind: "application"; readonly resolve: (outcome: RuntimeApplicationOutcome) => void;
    work: RuntimeApplicationWork<Input> | undefined };

interface Entry<Input> {
  readonly user: string;
  readonly acceptedAt: number;
  readonly deadline: number;
  readonly abort: AbortController;
  readonly pipeline: Pipeline<Input>;
  terminal: boolean;
  failure: RuntimeFailure | undefined;
  phase: "accepted" | "preparing" | "generating" | "checking" | "delivering" | "terminal";
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
    let resolve!: (outcome: RuntimeOutcome) => void;
    const outcome = new Promise<RuntimeOutcome>((done) => { resolve = done; });
    const reserved = this.reserve(trustedUser, { kind: "component", resolve, work, candidate: undefined });
    if (!reserved.accepted) return reserved;
    const entry = reserved.entry;
    if (this.active === entry) this.start(entry);
    return { accepted: true, request: {
      acceptedAt: entry.acceptedAt, deadline: entry.deadline, outcome,
      cancel: (reason) => this.fail(entry, reason),
    } };
  }

  /**
   * The factory captures the immutable start view synchronously, AFTER the
   * shared capacity reservation and BEFORE any preparation or queue wait.
   * It must dispose its own partial holder if it throws before returning work.
   */
  submitApplication(trustedUser: string,
    factory: (control: RuntimeApplicationControl) => RuntimeApplicationWork<Input>): RuntimeApplicationAdmission {
    let resolve!: (outcome: RuntimeApplicationOutcome) => void;
    const outcome = new Promise<RuntimeApplicationOutcome>((done) => { resolve = done; });
    const reserved = this.reserve(trustedUser, { kind: "application", resolve, work: undefined });
    if (!reserved.accepted) return reserved;
    const entry = reserved.entry;
    try {
      const work = factory(this.control(entry));
      if (entry.terminal) this.dispose(work);
      else if (entry.pipeline.kind === "application") entry.pipeline.work = work;
    } catch {
      this.fail(entry, "dependency_unavailable");
    }
    if (!entry.terminal && this.active === entry) this.start(entry);
    return { accepted: true, request: {
      acceptedAt: entry.acceptedAt, deadline: entry.deadline, outcome,
      cancel: (reason) => this.fail(entry, reason),
    } };
  }

  private reserve(trustedUser: string, pipeline: Pipeline<Input>):
    { readonly accepted: true; readonly entry: Entry<Input> }
    | { readonly accepted: false; readonly failure: "overload" | "dependency_unavailable" } {
    if (this.stopped || this.state.quarantined) return { accepted: false, failure: "dependency_unavailable" };
    if (this.users.has(trustedUser) || (this.active && this.queue.length >= 2)) return { accepted: false, failure: "overload" };
    const acceptedAt = this.clock.now();
    const entry: Entry<Input> = {
      user: trustedUser, acceptedAt, deadline: acceptedAt + 60_000,
      abort: new AbortController(), pipeline, terminal: false, failure: undefined, phase: "accepted",
      generating: false, generationEnd: undefined,
      cancelOverall: () => {}, cancelQueue: () => {}, cancelGeneration: () => {},
    };
    this.users.set(trustedUser, entry);
    entry.cancelOverall = this.clock.at(entry.deadline, () => this.fail(entry, "timed_out"));
    if (!this.active) this.active = entry;
    else {
      this.queue.push(entry);
      entry.cancelQueue = this.clock.at(Math.min(acceptedAt + 5_000, entry.deadline), () => this.fail(entry, "queue_expired"));
    }
    return { accepted: true, entry };
  }

  shutdown(): void {
    this.stopped = true;
    for (const entry of [...this.users.values()]) this.fail(entry, "cancelled");
  }

  private budget(entry: Entry<Input>, deadline = entry.deadline): RequestBudget {
    return Object.freeze({ deadline, signal: entry.abort.signal, remainingMs: () => Math.max(0, deadline - this.clock.now()) });
  }

  private control(entry: Entry<Input>): RuntimeApplicationControl {
    return Object.freeze({
      ...this.budget(entry), acceptedAt: entry.acceptedAt,
      live: () => !this.expired(entry),
      fail: (failure: RuntimeFailure) => this.fail(entry, failure),
      effect: <T>(effect: () => Result<T, RuntimeFailure>) => this.effect(entry, effect),
      complete: (effect: () => RuntimeApplicationOutcome) => {
        if (!this.expired(entry) && entry.phase !== "delivering") this.fail(entry, "dependency_unavailable");
        const result = this.effect(entry, effect);
        if (result.ok && !entry.terminal) this.finish(entry, { kind: "application" });
        return result;
      },
    });
  }

  private effect<T>(entry: Entry<Input>, effect: () => Result<T, RuntimeFailure>): Result<T, RuntimeFailure> {
    if (this.expired(entry)) return { ok: false, failure: entry.failure ?? "cancelled" };
    try {
      const result = effect();
      if (!result.ok) this.fail(entry, result.failure);
      if (entry.terminal) return { ok: false, failure: entry.failure ?? "cancelled" };
      return result;
    } catch {
      this.fail(entry, "dependency_unavailable");
      return { ok: false, failure: entry.failure ?? "dependency_unavailable" };
    }
  }

  private start(entry: Entry<Input>): void {
    entry.cancelQueue();
    this.active = entry;
    if (this.expired(entry)) return;
    entry.phase = "preparing";
    try {
      if (entry.pipeline.kind === "component") {
        entry.pipeline.work!.prepare(this.budget(entry)).then(
          (input) => this.dispatch(entry, input), () => this.fail(entry, "dependency_unavailable"));
      } else {
        entry.pipeline.work!.prepare().then(
          () => this.dispatchApplication(entry), () => this.fail(entry, "dependency_unavailable"));
      }
    } catch {
      this.fail(entry, "dependency_unavailable");
    }
  }

  private dispatchApplication(entry: Entry<Input>): void {
    if (this.expired(entry) || entry.pipeline.kind !== "application") return;
    try {
      const input = entry.pipeline.work!.dispatchInput();
      if (!input.ok) { this.fail(entry, input.failure); return; }
      this.dispatch(entry, input.value);
    } catch {
      this.fail(entry, "dependency_unavailable");
    }
  }

  private dispatch(entry: Entry<Input>, input: Input): void {
    if (this.expired(entry)) return;
    entry.phase = "generating";
    entry.generating = true;
    entry.generationEnd = Math.min(this.clock.now() + 45_000, entry.deadline);
    entry.cancelGeneration = this.clock.at(entry.generationEnd, () => this.fail(entry, "generation_timed_out"));
    try {
      this.observeGeneration(entry, this.transport.generate(input, this.budget(entry, entry.generationEnd)));
    } catch {
      // A synchronous throw is also a settled invocation under the Port contract.
      this.generationRejected(entry);
    }
  }

  private observeGeneration(entry: Entry<Input>, completion: Promise<Uint8Array>): void {
    // These callbacks capture only the revocable entry, never input/work/raw
    // locals in a suspended async frame. The runtime retains no transport promise.
    completion.then((raw) => this.generated(entry, raw), () => this.generationRejected(entry));
  }

  private generationRejected(entry: Entry<Input>): void {
    this.settled(entry);
    this.fail(entry, "dependency_unavailable");
  }

  private settled(entry: Entry<Input>): void {
    // A transport MUST NOT settle merely because cancellation was sent.
    entry.generating = false;
    entry.cancelGeneration();
    this.releaseLane(entry);
  }

  private generated(entry: Entry<Input>, raw: Uint8Array): void {
    this.settled(entry);
    if (this.expired(entry)) return;
    if (this.clock.now() >= entry.generationEnd!) { this.fail(entry, "generation_timed_out"); return; }
    try {
      const parsed = parseOutput(raw, entry.pipeline.work!.purpose);
      if (this.expired(entry)) return;
      if (!parsed.ok) { this.fail(entry, parsed.failure); return; }
      entry.phase = "checking";
      if (entry.pipeline.kind === "component") {
        entry.pipeline.candidate = parsed.value;
        this.observeComponentCheck(entry, entry.pipeline.work!.checkCandidate(parsed.value, this.budget(entry)));
      } else {
        entry.pipeline.work!.acceptCandidate(parsed.value);
        if (!this.expired(entry)) this.observeApplicationCheck(entry, entry.pipeline.work!.checkCandidate());
      }
    } catch {
      this.fail(entry, "dependency_unavailable");
    }
  }

  private observeComponentCheck(entry: Entry<Input>, check: Promise<Result<void, "unsafe_output" | "stale_authority">>): void {
    check.then((result) => {
      if (this.expired(entry) || entry.pipeline.kind !== "component") return;
      if (!result.ok) { this.fail(entry, result.failure); return; }
      this.finish(entry, { kind: "candidate", value: entry.pipeline.candidate! });
    }, () => this.fail(entry, "dependency_unavailable"));
  }

  private observeApplicationCheck(entry: Entry<Input>, check: Promise<void>): void {
    check.then(() => this.deliver(entry), () => this.fail(entry, "dependency_unavailable"));
  }

  private deliver(entry: Entry<Input>): void {
    if (this.expired(entry) || entry.pipeline.kind !== "application") return;
    entry.phase = "delivering";
    try {
      this.observeDelivery(entry, entry.pipeline.work!.commitAndDeliver());
    } catch {
      this.fail(entry, "dependency_unavailable");
    }
  }

  private observeDelivery(entry: Entry<Input>, delivery: Promise<void>): void {
    // Successful completion must already have happened at the sink event.
    delivery.then(() => this.fail(entry, "dependency_unavailable"), () => this.fail(entry, "dependency_unavailable"));
  }

  private expired(entry: Entry<Input>): boolean {
    if (!entry.terminal && this.clock.now() >= entry.deadline) this.fail(entry, "timed_out");
    return entry.terminal;
  }

  private fail(entry: Entry<Input>, failure: RuntimeFailure): void {
    // Even delayed timer/cancel/dependency callbacks cannot beat the deadline.
    this.finish(entry, { kind: "failure", failure: this.clock.now() >= entry.deadline ? "timed_out" : failure });
  }

  private finish(entry: Entry<Input>, outcome: { readonly kind: "failure"; readonly failure: RuntimeFailure }
    | { readonly kind: "candidate"; readonly value: OutputCandidate } | { readonly kind: "application" }): void {
    if (entry.terminal) return;
    entry.terminal = true;
    entry.phase = "terminal";
    if (outcome.kind === "failure") entry.failure = outcome.failure;
    if (entry.pipeline.kind === "component") {
      entry.pipeline.work = undefined;
      entry.pipeline.candidate = undefined;
      entry.pipeline.resolve(outcome.kind === "candidate"
        ? { ok: true, value: outcome.value }
        : { ok: false, failure: outcome.kind === "failure" ? outcome.failure : "dependency_unavailable" });
    } else {
      const work = entry.pipeline.work;
      entry.pipeline.work = undefined;
      if (work) this.dispose(work);
      entry.pipeline.resolve(outcome.kind === "application"
        ? { ok: true, value: undefined }
        : { ok: false, failure: outcome.kind === "failure" ? outcome.failure : "dependency_unavailable" });
    }
    entry.cancelOverall(); entry.cancelQueue(); entry.cancelGeneration();
    this.users.delete(entry.user);
    const queuedIndex = this.queue.indexOf(entry);
    if (queuedIndex !== -1) this.queue.splice(queuedIndex, 1);
    entry.abort.abort();
    // Preparation is not generation: it can be abandoned without quarantine.
    if (!entry.generating) this.releaseLane(entry);
  }

  private dispose(work: RuntimeApplicationWork<Input>): void {
    try { work.dispose(); } catch { /* Cleanup cannot reopen a fenced lifecycle or expose raw errors. */ }
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
