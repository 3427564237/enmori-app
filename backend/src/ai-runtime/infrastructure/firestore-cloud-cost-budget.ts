import type { RuntimeEpoch } from '../../ai-conversation/ports/real-conversation-store.js';
import type { FirestoreGateway, StoredDocument } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { cloudConfirmedCostNanoUsd, cloudCostGrantCurrent, cloudCostGrantExpiresAt, cloudReservationNanoUsd,
  costRecord, decodeCloudConfirmedUsage, decodeCloudCostAttempt, decodeCloudCostGrant, exactCostFields,
  isCostInteger, isCostUuid } from '../domain/cloud-cost.js';
import type { CloudConfirmedUsage, CloudCostAttemptInput, CloudCostBudgetAuthority, CloudCostBudgetSnapshot, CloudCostGrant,
  CloudCostReconcileResult, CloudCostRecoveryResult, CloudCostReservation, CloudCostReserveResult } from '../ports/cloud-cost-budget.js';
import type { RuntimeClock } from '../ports/runtime-clock.js';

export const cloudCostBudgetPath = 'ai_cloud_cost_budget/current';
const attemptPath = (id: string) => `${cloudCostBudgetPath}/attempts/${id}`;
interface Ledger extends RuntimeEpoch {
  readonly schemaVersion: 'openai_cost_budget_v1';
  readonly grant: CloudCostGrant;
  readonly lastObservedAtMs: number;
  readonly reservedNanoUsd: number;
  readonly spentNanoUsd: number;
  readonly attemptCount: number;
  readonly reconciledCount: number;
}
interface Attempt extends CloudCostAttemptInput, RuntimeEpoch {
  readonly schemaVersion: 'openai_cost_attempt_v1';
  readonly grantId: string;
  readonly createdAtMs: number;
  readonly reservedNanoUsd: number;
  readonly state: 'reserved' | 'reconciled';
  readonly reconciledAtMs?: number;
  readonly chargedNanoUsd?: number;
  readonly usage?: CloudConfirmedUsage;
}
interface LocalReservation {
  readonly input: CloudCostAttemptInput;
  readonly lease: object;
  readonly amount: number;
  readonly live: () => boolean;
  state: 'reserved' | 'dispatched' | 'reconciled';
  usageKey?: string;
}
const validEpoch = (value: RuntimeEpoch): boolean => isCostUuid(value.processEpoch) && isCostInteger(value.generation) && value.generation > 0;
const snapshot = (ledger: Ledger): CloudCostBudgetSnapshot => Object.freeze({ grantId: ledger.grant.grantId, capNanoUsd: ledger.grant.capNanoUsd,
  reservedNanoUsd: ledger.reservedNanoUsd, spentNanoUsd: ledger.spentNanoUsd,
  availableNanoUsd: Number(BigInt(ledger.grant.capNanoUsd) - BigInt(ledger.reservedNanoUsd) - BigInt(ledger.spentNanoUsd)),
  expiresAtMs: cloudCostGrantExpiresAt(ledger.grant), attemptCount: ledger.attemptCount, reconciledCount: ledger.reconciledCount });

/** Pure, separately invoked seed builder for synthetic/offline review. It does
 * no I/O, never changes a fence and is never called by recover(). A real grant
 * installation/migration still needs its separately verified operator path. */
export function createOfflineCloudCostBudgetSeed(grantInput: CloudCostGrant, epoch: RuntimeEpoch, observedAtMs: number):
  { readonly path: typeof cloudCostBudgetPath; readonly data: StoredDocument } {
  const grant = decodeCloudCostGrant(grantInput);
  if (!grant || !validEpoch(epoch) || !cloudCostGrantCurrent(grant, observedAtMs)) throw Error('CLOUD_COST_SEED_INVALID');
  return Object.freeze({ path: cloudCostBudgetPath, data: Object.freeze({ schemaVersion: 'openai_cost_budget_v1', grant,
    processEpoch: epoch.processEpoch, generation: epoch.generation, lastObservedAtMs: observedAtMs,
    reservedNanoUsd: 0, spentNanoUsd: 0, attemptCount: 0, reconciledCount: 0 }) });
}

/** No initialization, remote calls, content, credentials, logging or automatic
 * transactions retries. maxAttempts:1 preserves ambiguous outcomes. Runtime
 * fence reads participate in every mutation's transaction. Unknown reservations
 * have no TTL and are not released by new epochs, timeouts or process restart. */
export class FirestoreCloudCostBudget implements CloudCostBudgetAuthority {
  private readonly grant: CloudCostGrant;
  private readonly grantKey: string;
  private readonly epoch: RuntimeEpoch;
  private readonly reservations = new WeakMap<CloudCostReservation, LocalReservation>();
  private lease: object | undefined;
  private active = false;
  private recoveryUsed = false;
  private pending = false;
  private lastUtc = 0;
  private anchor: { readonly utc: number; readonly monotonic: number } | undefined;
  constructor(private readonly gateway: FirestoreGateway, epoch: RuntimeEpoch, grantInput: CloudCostGrant,
    private readonly clock: RuntimeClock, private readonly utcMilliseconds: () => number, private readonly ownsHost: () => boolean) {
    const grant = decodeCloudCostGrant(grantInput);
    if (!grant || !validEpoch(epoch) || typeof gateway?.runTransaction !== 'function' || typeof clock?.now !== 'function' ||
      typeof utcMilliseconds !== 'function' || typeof ownsHost !== 'function') throw Error('CLOUD_COST_CONFIGURATION_INVALID');
    this.grant = grant; this.grantKey = JSON.stringify(grant); this.epoch = Object.freeze({ ...epoch });
  }
  private host(): boolean { try { return this.ownsHost() === true; } catch { return false; } }
  private live(check: () => boolean): boolean { try { return check() === true; } catch { return false; } }
  private now(): number {
    const utc = this.utcMilliseconds(), monotonic = this.clock.now();
    if (!isCostInteger(utc) || utc < this.lastUtc || !Number.isFinite(monotonic) || monotonic < 0) throw Error();
    this.anchor ??= { utc, monotonic };
    if (monotonic < this.anchor.monotonic || Math.abs(utc - this.anchor.utc - (monotonic - this.anchor.monotonic)) > 1000) throw Error();
    this.lastUtc = utc;
    // Positive wall drift cannot extend credit validity; negative/backward
    // observations cannot move this process or a recovered ledger backwards.
    const now = Math.max(utc, Math.ceil(this.anchor.utc + monotonic - this.anchor.monotonic));
    if (!isCostInteger(now)) throw Error();
    return now;
  }
  current(lease: object): boolean {
    try {
      if (this.active && lease === this.lease && this.host()) return cloudCostGrantCurrent(this.grant, this.now());
    } catch { /* unknown authority or clock closes this owner */ }
    this.active = false; return false;
  }
  private settlementCurrent(lease: object): boolean {
    try {
      if (this.active && lease === this.lease && this.host()) { this.now(); return true; }
    } catch { /* expired admission cannot weaken host/clock/unknown-write fences */ }
    this.active = false; return false;
  }
  private verifyFence(raw: StoredDocument | undefined): void {
    if (!raw || !exactCostFields(raw, ['processEpoch', 'generation', 'cleanupGeneration']) ||
      raw.processEpoch !== this.epoch.processEpoch || raw.generation !== this.epoch.generation ||
      !isCostInteger(raw.cleanupGeneration) || !this.host()) throw Error();
  }
  private decodeLedger(raw: StoredDocument | undefined, now: number, requireAdmission = true): Ledger {
    if (!raw || !exactCostFields(raw, ['schemaVersion', 'grant', 'processEpoch', 'generation', 'lastObservedAtMs', 'reservedNanoUsd',
      'spentNanoUsd', 'attemptCount', 'reconciledCount']) || raw.schemaVersion !== 'openai_cost_budget_v1' || !isCostUuid(raw.processEpoch) ||
      !isCostInteger(raw.generation) || raw.generation < 1 || raw.generation > this.epoch.generation ||
      (raw.generation === this.epoch.generation && raw.processEpoch !== this.epoch.processEpoch) ||
      !isCostInteger(raw.lastObservedAtMs) || raw.lastObservedAtMs > now || (requireAdmission && !cloudCostGrantCurrent(this.grant, now)) ||
      !isCostInteger(raw.reservedNanoUsd) || !isCostInteger(raw.spentNanoUsd) || !isCostInteger(raw.attemptCount) ||
      !isCostInteger(raw.reconciledCount) || raw.reconciledCount > raw.attemptCount ||
      BigInt(raw.reservedNanoUsd) + BigInt(raw.spentNanoUsd) > BigInt(this.grant.capNanoUsd) ||
      (raw.attemptCount === 0 && (raw.reservedNanoUsd !== 0 || raw.spentNanoUsd !== 0)) ||
      (raw.reconciledCount === raw.attemptCount && raw.reservedNanoUsd !== 0) ||
      (raw.reconciledCount < raw.attemptCount && raw.reservedNanoUsd === 0)) throw Error();
    const grant = decodeCloudCostGrant(raw.grant);
    if (!grant || JSON.stringify(grant) !== this.grantKey) throw Error();
    return { schemaVersion: 'openai_cost_budget_v1', grant, processEpoch: raw.processEpoch, generation: raw.generation,
      lastObservedAtMs: raw.lastObservedAtMs, reservedNanoUsd: raw.reservedNanoUsd, spentNanoUsd: raw.spentNanoUsd,
      attemptCount: raw.attemptCount, reconciledCount: raw.reconciledCount };
  }
  private requireCurrentLedger(ledger: Ledger): void {
    if (ledger.processEpoch !== this.epoch.processEpoch || ledger.generation !== this.epoch.generation) throw Error();
  }
  async recover(): Promise<CloudCostRecoveryResult> {
    if (this.recoveryUsed || this.pending || !this.host()) return { kind: 'unavailable' };
    this.recoveryUsed = true; this.pending = true;
    try {
      const ledger = await this.gateway.runTransaction(async tx => {
        this.verifyFence(await tx.get('ai_runtime_fence/current'));
        const raw = await tx.get(cloudCostBudgetPath), now = this.now(), old = this.decodeLedger(raw, now);
        const next = { ...old, ...this.epoch, lastObservedAtMs: now };
        if (!this.host() || !cloudCostGrantCurrent(this.grant, this.now())) throw Error();
        tx.set(cloudCostBudgetPath, next); return next;
      }, { maxAttempts: 1 });
      if (!this.host() || !cloudCostGrantCurrent(this.grant, this.now())) throw Error();
      this.lease = Object.freeze({}); this.active = true;
      return { kind: 'confirmed', lease: this.lease, snapshot: snapshot(ledger) };
    } catch { this.active = false; return { kind: 'unknown' }; }
    finally { this.pending = false; }
  }
  async reserve(lease: object, inputValue: CloudCostAttemptInput, live: () => boolean): Promise<CloudCostReserveResult> {
    if (this.pending || !this.current(lease) || !this.live(live)) return { kind: 'rejected', reason: 'unavailable' };
    const input = decodeCloudCostAttempt(inputValue), amount = input && cloudReservationNanoUsd(this.grant, input);
    if (!input || !isCostInteger(amount) || amount === 0) return { kind: 'rejected', reason: 'invalid' };
    this.pending = true;
    try {
      const result = await this.gateway.runTransaction(async tx => {
        this.verifyFence(await tx.get('ai_runtime_fence/current'));
        const raw = await tx.get(cloudCostBudgetPath), existing = await tx.get(attemptPath(input.attemptId));
        const now = this.now(), old = this.decodeLedger(raw, now); this.requireCurrentLedger(old);
        if (!this.current(lease) || !this.live(live)) return { kind: 'rejected', reason: 'unavailable' } as const;
        if (existing !== undefined) return { kind: 'rejected', reason: 'duplicate' } as const;
        if (BigInt(old.reservedNanoUsd) + BigInt(old.spentNanoUsd) + BigInt(amount) > BigInt(this.grant.capNanoUsd))
          return { kind: 'rejected', reason: 'exhausted' } as const;
        if (old.attemptCount === Number.MAX_SAFE_INTEGER) throw Error();
        const attempt: Attempt = { schemaVersion: 'openai_cost_attempt_v1', grantId: this.grant.grantId, ...input,
          ...this.epoch, createdAtMs: now, reservedNanoUsd: amount, state: 'reserved' };
        if (!this.current(lease) || !this.live(live)) return { kind: 'rejected', reason: 'unavailable' } as const;
        tx.create(attemptPath(input.attemptId), { ...attempt });
        tx.set(cloudCostBudgetPath, { ...old, lastObservedAtMs: now, reservedNanoUsd: old.reservedNanoUsd + amount, attemptCount: old.attemptCount + 1 });
        return { kind: 'confirmed' } as const;
      }, { maxAttempts: 1 });
      if (result.kind !== 'confirmed') return result;
      if (!this.current(lease)) return { kind: 'unknown' };
      const reservation: CloudCostReservation = Object.freeze({});
      this.reservations.set(reservation, { input, amount, lease, live, state: 'reserved' });
      return { kind: 'confirmed', reservation, reservedNanoUsd: amount };
    } catch { this.active = false; return { kind: 'unknown' }; }
    finally { this.pending = false; }
  }
  beginDispatch(reservation: CloudCostReservation): boolean {
    const state = this.reservations.get(reservation);
    if (!state || state.state !== 'reserved' || !this.current(state.lease) || !this.live(state.live)) return false;
    state.state = 'dispatched'; return true;
  }
  dispatchAllowed(reservation: CloudCostReservation): boolean {
    const state = this.reservations.get(reservation);
    return !!state && state.state === 'dispatched' && this.current(state.lease) && this.live(state.live);
  }
  private decodeAttempt(raw: StoredDocument | undefined, state: LocalReservation, now: number): Attempt {
    if (!raw || !exactCostFields(raw, ['schemaVersion', 'grantId', 'attemptId', 'consumer', 'model', 'maxInputTokens', 'maxOutputTokens',
      'processEpoch', 'generation', 'createdAtMs', 'reservedNanoUsd', 'state',
      ...(raw.state === 'reconciled' ? ['reconciledAtMs', 'chargedNanoUsd', 'usage'] : [])]) ||
      raw.schemaVersion !== 'openai_cost_attempt_v1' || raw.grantId !== this.grant.grantId ||
      raw.processEpoch !== this.epoch.processEpoch || raw.generation !== this.epoch.generation ||
      !isCostInteger(raw.createdAtMs) || raw.createdAtMs > now || raw.reservedNanoUsd !== state.amount ||
      (raw.state !== 'reserved' && raw.state !== 'reconciled')) throw Error();
    const input = decodeCloudCostAttempt({ attemptId: raw.attemptId, consumer: raw.consumer, model: raw.model,
      maxInputTokens: raw.maxInputTokens, maxOutputTokens: raw.maxOutputTokens });
    if (!input || JSON.stringify(input) !== JSON.stringify(state.input)) throw Error();
    const base: Attempt = { schemaVersion: 'openai_cost_attempt_v1', grantId: this.grant.grantId, ...input, ...this.epoch,
      createdAtMs: raw.createdAtMs, reservedNanoUsd: state.amount, state: raw.state };
    if (raw.state === 'reserved') return base;
    const usage = decodeCloudConfirmedUsage(raw.usage);
    if (!usage || usage.model !== input.model || usage.inputTokens > input.maxInputTokens || usage.outputTokens > input.maxOutputTokens ||
      !isCostInteger(raw.reconciledAtMs) || raw.reconciledAtMs < raw.createdAtMs || raw.reconciledAtMs > now ||
      !isCostInteger(raw.chargedNanoUsd) || raw.chargedNanoUsd > state.amount || raw.chargedNanoUsd !== cloudConfirmedCostNanoUsd(this.grant, usage)) throw Error();
    return { ...base, reconciledAtMs: raw.reconciledAtMs, chargedNanoUsd: raw.chargedNanoUsd, usage };
  }
  async reconcile(reservation: CloudCostReservation, usageValue: CloudConfirmedUsage): Promise<CloudCostReconcileResult> {
    const state = this.reservations.get(reservation), usage = decodeCloudConfirmedUsage(usageValue);
    if (!state || !usage || state.state === 'reserved' || !this.settlementCurrent(state.lease)) return 'rejected';
    const usageKey = JSON.stringify(usage);
    if (state.state === 'reconciled') return state.usageKey === usageKey ? 'already_reconciled' : 'rejected';
    const cost = cloudConfirmedCostNanoUsd(this.grant, usage);
    if (usage.model !== state.input.model || usage.inputTokens > state.input.maxInputTokens || usage.outputTokens > state.input.maxOutputTokens ||
      !isCostInteger(cost) || cost > state.amount) { this.active = false; return 'rejected'; }
    if (this.pending) return 'rejected';
    this.pending = true;
    try {
      const result = await this.gateway.runTransaction(async tx => {
        this.verifyFence(await tx.get('ai_runtime_fence/current'));
        const raw = await tx.get(cloudCostBudgetPath), attemptRaw = await tx.get(attemptPath(state.input.attemptId));
        const now = this.now(), old = this.decodeLedger(raw, now, false); this.requireCurrentLedger(old);
        const attempt = this.decodeAttempt(attemptRaw, state, now);
        if (!this.settlementCurrent(state.lease)) throw Error();
        if (attempt.state === 'reconciled') {
          if (JSON.stringify(attempt.usage) !== usageKey) throw Error();
          return 'already_reconciled' as const;
        }
        if (old.reservedNanoUsd < state.amount || old.reconciledCount >= old.attemptCount ||
          BigInt(old.spentNanoUsd) + BigInt(cost) > BigInt(this.grant.capNanoUsd)) throw Error();
        const nextAttempt: Attempt = { ...attempt, state: 'reconciled', reconciledAtMs: now, chargedNanoUsd: cost, usage };
        if (!this.settlementCurrent(state.lease)) throw Error();
        tx.set(attemptPath(state.input.attemptId), { ...nextAttempt });
        tx.set(cloudCostBudgetPath, { ...old, lastObservedAtMs: now, reservedNanoUsd: old.reservedNanoUsd - state.amount,
          spentNanoUsd: old.spentNanoUsd + cost, reconciledCount: old.reconciledCount + 1 });
        return 'confirmed' as const;
      }, { maxAttempts: 1 });
      if (!this.settlementCurrent(state.lease)) return 'unknown';
      state.state = 'reconciled'; state.usageKey = usageKey; return result;
    } catch { this.active = false; return 'unknown'; }
    finally { this.pending = false; }
  }
}
