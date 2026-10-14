/**
 * Unwired, content-free policy for S-PM-1013-LI-DELEGATED-F01-BCD (20ff6cfc).
 * Local development is recorded in S-USER-1013-ZHOU-LOCAL.
 *
 * This does not issue I/O, prove rollback, dispose another component's content,
 * or replace the existing synchronous fake effect(commit) Port. The caller must
 * bind the original Application/session/deadline guard and matching durable
 * barrier; the real identity/epoch/transaction mapping remains the N02 contract.
 */

export type DurableCloseObservation = "closed" | "unresolved";

export class RealWriteControl {
  #terminal = false;
  #barrier: DurableCloseObservation = "unresolved";

  constructor(
    private readonly originalApplicationSessionAndDeadlineCurrent: () => boolean,
  ) {}

  get terminal(): boolean { return this.#terminal; }
  get barrier(): DurableCloseObservation { return this.#barrier; }

  /** Local closure is synchronous; it neither waits for nor cancels SDK I/O. */
  terminate(): void { this.#terminal = true; }

  /** Necessary local guard only, not proof of Auth/Firestore/content authority. */
  allowsOriginalContinuation(): boolean {
    if (this.#terminal) return false;
    try {
      if (this.originalApplicationSessionAndDeadlineCurrent() === true) return true;
    } catch { /* Missing/failed original authority cannot keep this request live. */ }
    this.terminate();
    return false;
  }

  /**
   * Call afresh before EACH content transaction, within the original budgets.
   * No prompt, candidate or submission callback is retained during this await.
   * A true result is an observation, never a reusable write permit: the caller
   * must synchronously recheck allowsOriginalContinuation() immediately before
   * handing I/O to the SDK, with no intervening await. Firestore authority checks
   * still belong inside the content transaction. External Auth can change after
   * this checkpoint; this policy does not promise atomic Auth-at-commit.
   */
  async checkBeforeContentTransaction(
    freshRevokedAndDisabledCheck: () => Promise<boolean>,
  ): Promise<boolean> {
    if (!this.allowsOriginalContinuation()) return false;
    let current: boolean;
    try { current = await freshRevokedAndDisabledCheck(); }
    catch { this.terminate(); return false; }
    if (current !== true) { this.terminate(); return false; }
    return this.allowsOriginalContinuation();
  }

  /**
   * Start local closure before asking for the matching durable close barrier.
   * Failure/uncertainty remains unresolved. Only an authoritative closed result
   * establishes closed; late unresolved observations cannot downgrade it.
   * Closed says nothing about no_effect/user_saved or valid content: those need
   * separate authoritative readback over every pending write on the same U.
   * Callers must not await this method before disposing Application content.
   */
  async closeDurably(
    closeMatchingBarrier: () => Promise<DurableCloseObservation>,
  ): Promise<DurableCloseObservation> {
    this.terminate();
    if (this.#barrier === "closed") return "closed";
    try {
      if (await closeMatchingBarrier() === "closed") this.#barrier = "closed";
    } catch { /* Unknown close outcome is not proof of rollback or closure. */ }
    return this.#barrier;
  }
}
