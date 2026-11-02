import type { CloudConfirmedUsage, CloudCostAttemptInput, CloudCostBudgetAuthority, CloudCostRecoveryResult,
  CloudCostReservation, CloudCostReserveResult } from '../ports/cloud-cost-budget.js';

export interface CloudCostDispatchControls {
  available(): boolean;
  confirmUsage(usage: CloudConfirmedUsage): Promise<'confirmed' | 'unknown'>;
}

/** One shared monetary owner, independently of consent, content and delivery.
 * An unknown remote result retains the full reservation. No automatic retry,
 * cancellation refund, renewal, provider fallback or initialization exists. */
export class CloudCostBudgetOwner {
  private lease: object | undefined;
  constructor(private readonly authority: CloudCostBudgetAuthority) {}
  isCurrent(): boolean {
    try { return !!this.lease && this.authority.current(this.lease); }
    catch { return false; }
  }
  async recover(): Promise<CloudCostRecoveryResult> {
    const result = await this.authority.recover();
    if (result.kind === 'confirmed') this.lease = result.lease;
    return result;
  }
  async reserve(input: CloudCostAttemptInput, live: () => boolean): Promise<CloudCostReserveResult> {
    if (!this.lease || !this.isCurrent()) return { kind: 'rejected', reason: 'unavailable' };
    return this.authority.reserve(this.lease, input, live);
  }
  dispatch<T>(reservation: CloudCostReservation, invoke: (controls: CloudCostDispatchControls) => Promise<T>): Promise<T> | undefined {
    if (!this.authority.beginDispatch(reservation)) return undefined;
    let invoking = true;
    const controls: CloudCostDispatchControls = Object.freeze({
      available: () => invoking && this.authority.dispatchAllowed(reservation),
      confirmUsage: async (usage: CloudConfirmedUsage): Promise<'confirmed' | 'unknown'> => {
        if (!invoking) return 'unknown';
        const result = await this.authority.reconcile(reservation, usage);
        return result === 'confirmed' || result === 'already_reconciled' ? 'confirmed' : 'unknown';
      },
    });
    try { return Promise.resolve(invoke(controls)).finally(() => { invoking = false; }); }
    catch (error) { invoking = false; return Promise.reject(error); }
  }
}
