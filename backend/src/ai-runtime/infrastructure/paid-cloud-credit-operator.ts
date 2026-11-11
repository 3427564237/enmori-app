import type { RuntimeEpoch } from '../../ai-conversation/ports/real-conversation-store.js';
import type { FirestoreGateway, StoredDocument, StoredDocumentEntry } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { cloudConfirmedCostNanoUsd, cloudCostGrantCurrent, cloudReservationNanoUsd, decodeCloudConfirmedUsage,
  decodeCloudCostAttempt, decodeCloudCostGrant, exactCostFields, isCostInteger, isCostUuid } from '../domain/cloud-cost.js';
import type { CloudPaidCostGrant } from '../ports/cloud-cost-budget.js';
import { cloudCostBudgetPath, cloudCostGrantPath, decodeCloudCostLedger, paidCreditPredecessorMatches } from './firestore-cloud-cost-budget.js';

type Fence = RuntimeEpoch & {readonly cleanupGeneration: number};
export interface PaidCreditInstallation {
  readonly grant: CloudPaidCostGrant;
  readonly expectedFence: Fence;
  readonly predecessorLedger: StoredDocument;
  readonly predecessorAttempts: readonly StoredDocumentEntry[];
}
export interface PaidCreditFreshness extends PaidCreditInstallation {
  readonly expectedLedger: StoredDocument;
  readonly expectedAttempts: readonly StoredDocumentEntry[];
  readonly observedSpendableNanoUsd: number;
  /** Confirmed old/new charges not yet demonstrably reflected in this balance. */
  readonly unreflectedConfirmedNanoUsd: number;
  readonly priceEvidenceValidUntilMs: number;
}
type Result = {readonly kind: 'confirmed' | 'unknown' | 'unavailable'};
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
const equal = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sorted = (rows: readonly StoredDocumentEntry[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
const validFence = (f: Fence) => exactCostFields(f as unknown as StoredDocument, ['processEpoch', 'generation', 'cleanupGeneration']) &&
  isCostUuid(f.processEpoch) && isCostInteger(f.generation) && f.generation > 0 && isCostInteger(f.cleanupGeneration);

/** Complete, content-free inventory verification for the explicit operator.
 * No missing usage is inferred and no unknown reservation is released. */
export function cloudCostInventoryMatches(raw: StoredDocument, rows: readonly StoredDocumentEntry[]): boolean {
  const ledger = decodeCloudCostLedger(raw);
  if (!ledger || rows.length !== ledger.attemptCount || new Set(rows.map(r => r.id)).size !== rows.length) return false;
  let spent = 0n, reserved = 0n, reconciled = 0;
  for (const {id, data: row} of rows) {
    if (!exactCostFields(row, ['schemaVersion', 'grantId', 'attemptId', 'consumer', 'model', 'maxInputTokens', 'maxOutputTokens',
      'processEpoch', 'generation', 'createdAtMs', 'reservedNanoUsd', 'state',
      ...(row.state === 'reconciled' ? ['reconciledAtMs', 'chargedNanoUsd', 'usage'] : [])]) ||
      row.schemaVersion !== 'openai_cost_attempt_v1' || row.grantId !== ledger.grant.grantId || row.attemptId !== id ||
      !isCostUuid(row.processEpoch) || !isCostInteger(row.generation) || row.generation < 1 || row.generation > ledger.generation ||
      (row.generation === ledger.generation && row.processEpoch !== ledger.processEpoch) ||
      !isCostInteger(row.createdAtMs) || row.createdAtMs > ledger.lastObservedAtMs ||
      !isCostInteger(row.reservedNanoUsd) || row.reservedNanoUsd === 0) return false;
    const attempt = decodeCloudCostAttempt({attemptId: id, consumer: row.consumer, model: row.model,
      maxInputTokens: row.maxInputTokens, maxOutputTokens: row.maxOutputTokens});
    if (!attempt || cloudReservationNanoUsd(ledger.grant, attempt) !== row.reservedNanoUsd) return false;
    if (row.state === 'reserved') reserved += BigInt(row.reservedNanoUsd);
    else if (row.state === 'reconciled') {
      const usage = decodeCloudConfirmedUsage(row.usage);
      if (!usage || usage.model !== attempt.model || usage.inputTokens > attempt.maxInputTokens || usage.outputTokens > attempt.maxOutputTokens ||
        !isCostInteger(row.chargedNanoUsd) || row.chargedNanoUsd > row.reservedNanoUsd ||
        cloudConfirmedCostNanoUsd(ledger.grant, usage) !== row.chargedNanoUsd || !isCostInteger(row.reconciledAtMs) ||
        row.reconciledAtMs < row.createdAtMs || row.reconciledAtMs > ledger.lastObservedAtMs) return false;
      spent += BigInt(row.chargedNanoUsd); reconciled++;
    } else return false;
  }
  return spent === BigInt(ledger.spentNanoUsd) && reserved === BigInt(ledger.reservedNanoUsd) && reconciled === ledger.reconciledCount;
}

/** Pure reviewable seed. Actual payment, evidence and stop/drain are operator
 * prerequisites, not facts manufactured by this function. */
export function createOfflinePaidCloudCostBudgetSeed(input: PaidCreditInstallation, now: number): {path: string; data: StoredDocument} {
  const grant = decodeCloudCostGrant(input.grant), predecessor = decodeCloudCostLedger(input.predecessorLedger);
  if (!grant || grant.schemaVersion !== 'openai_cost_grant_v2' || !validFence(input.expectedFence) ||
    !cloudCostGrantCurrent(grant, now) || !predecessor || predecessor.lastObservedAtMs > now ||
    !paidCreditPredecessorMatches(input.predecessorLedger, grant, input.expectedFence) ||
    !cloudCostInventoryMatches(input.predecessorLedger, input.predecessorAttempts)) throw Error('PAID_CREDIT_PACKET_INVALID');
  return {path: cloudCostGrantPath(grant), data: {schemaVersion: 'openai_cost_budget_v2', grant,
    processEpoch: input.expectedFence.processEpoch, generation: input.expectedFence.generation, lastObservedAtMs: now,
    reservedNanoUsd: 0, spentNanoUsd: 0, attemptCount: 0, reconciledCount: 0}};
}

/** Explicit operator only; no CLI, credentials, initializer or startup caller.
 * One mutation per instance, including rejected/unknown results. Unknown writes
 * must be inspected against the SAME packet/ID; no replacement ID or retry. */
export class PaidCloudCreditOperator {
  private used = false;
  constructor(private readonly gateway: FirestoreGateway, private readonly now: () => number,
    private readonly stoppedAndDrained: () => boolean) {}
  private check(): number {
    const now = this.now();
    if (!isCostInteger(now) || this.stoppedAndDrained() !== true) throw Error('PAID_CREDIT_OPERATOR_UNAVAILABLE');
    return now;
  }
  async install(input: PaidCreditInstallation): Promise<Result> {
    if (this.used) return {kind: 'unavailable'};
    this.used = true;
    try {
      const packet = structuredClone(input), seed = createOfflinePaidCloudCostBudgetSeed(packet, this.check());
      await this.gateway.runTransaction(async tx => {
        const fence = await tx.get('ai_runtime_fence/current'), old = await tx.get(cloudCostBudgetPath);
        const attempts = await tx.list(`${cloudCostBudgetPath}/attempts`), existing = await tx.get(seed.path);
        if (!equal(fence, packet.expectedFence) || !equal(old, packet.predecessorLedger) ||
          !equal(sorted(attempts), sorted(packet.predecessorAttempts)) || existing !== undefined) throw Error('PAID_CREDIT_INSTALL_CONFLICT');
        createOfflinePaidCloudCostBudgetSeed(packet, this.check());
        tx.create(seed.path, seed.data);
      }, {maxAttempts: 1});
      this.check(); return {kind: 'confirmed'};
    } catch {return {kind: 'unknown'};}
  }
  async refresh(input: PaidCreditFreshness): Promise<Result> {
    if (this.used) return {kind: 'unavailable'};
    this.used = true;
    try {
      const packet = structuredClone(input), now = this.check();
      // This validates the fixed predecessor deductions and every old attempt.
      createOfflinePaidCloudCostBudgetSeed(packet, now);
      const old = decodeCloudCostLedger(packet.expectedLedger), grant = decodeCloudCostGrant(packet.grant);
      if (!old || old.grant.schemaVersion !== 'openai_cost_grant_v2' || !grant || grant.schemaVersion !== 'openai_cost_grant_v2' ||
        old.lastObservedAtMs > now || old.generation > packet.expectedFence.generation ||
        (old.generation === packet.expectedFence.generation && old.processEpoch !== packet.expectedFence.processEpoch) ||
        !cloudCostInventoryMatches(packet.expectedLedger, packet.expectedAttempts) ||
        !isCostInteger(packet.observedSpendableNanoUsd) || !isCostInteger(packet.unreflectedConfirmedNanoUsd) ||
        !isCostInteger(packet.priceEvidenceValidUntilMs) || grant.priceSnapshot.validUntilMs > packet.priceEvidenceValidUntilMs ||
        grant.balanceVerifiedAtMs < old.grant.balanceVerifiedAtMs || grant.priceSnapshot.verifiedAtMs < old.grant.priceSnapshot.verifiedAtMs ||
        !equal({...grant, balanceVerifiedAtMs: old.grant.balanceVerifiedAtMs, balanceValidUntilMs: old.grant.balanceValidUntilMs,
          priceSnapshot: {...grant.priceSnapshot, snapshotId: old.grant.priceSnapshot.snapshotId,
            verifiedAtMs: old.grant.priceSnapshot.verifiedAtMs, validUntilMs: old.grant.priceSnapshot.validUntilMs}}, old.grant) ||
        BigInt(packet.observedSpendableNanoUsd) < BigInt(grant.capNanoUsd) - BigInt(old.spentNanoUsd) +
          BigInt(grant.predecessor.reservedLiabilityNanoUsd) + BigInt(packet.unreflectedConfirmedNanoUsd)) throw Error('PAID_CREDIT_REFRESH_INVALID');
      const path = cloudCostGrantPath(grant);
      await this.gateway.runTransaction(async tx => {
        const fence = await tx.get('ai_runtime_fence/current'), predecessor = await tx.get(cloudCostBudgetPath);
        const priorAttempts = await tx.list(`${cloudCostBudgetPath}/attempts`), ledger = await tx.get(path), attempts = await tx.list(`${path}/attempts`);
        if (!equal(fence, packet.expectedFence) || !equal(predecessor, packet.predecessorLedger) ||
          !equal(sorted(priorAttempts), sorted(packet.predecessorAttempts)) || !equal(ledger, packet.expectedLedger) ||
          !equal(sorted(attempts), sorted(packet.expectedAttempts)) || !cloudCostGrantCurrent(grant, this.check())) throw Error('PAID_CREDIT_REFRESH_CONFLICT');
        // Only the allowed grant freshness fields change. Not even the ledger
        // epoch/observed time is refreshed by this operator step.
        tx.set(path, {...packet.expectedLedger, grant});
      }, {maxAttempts: 1});
      this.check(); return {kind: 'confirmed'};
    } catch {return {kind: 'unknown'};}
  }
  /** Read-only unknown-ACK reconciliation. Caller supplies the original exact
   * target ledger (seed or refresh); no mutation/replacement ID is offered. */
  async inspect(input: PaidCreditInstallation, expectedLedger: StoredDocument, expectedAttempts: readonly StoredDocumentEntry[] = []): Promise<Result> {
    try {
      const packet = structuredClone(input), expected = structuredClone(expectedLedger), expectedRows = structuredClone(expectedAttempts);
      const grant = decodeCloudCostGrant(packet.grant);
      if (!grant || grant.schemaVersion !== 'openai_cost_grant_v2' || !validFence(packet.expectedFence) ||
        !equal(expected.grant, grant) || !cloudCostInventoryMatches(expected, expectedRows) ||
        !paidCreditPredecessorMatches(packet.predecessorLedger, grant, packet.expectedFence) ||
        !cloudCostInventoryMatches(packet.predecessorLedger, packet.predecessorAttempts)) return {kind: 'unavailable'};
      this.check();
      return await this.gateway.runTransaction(async tx => {
        const fence = await tx.get('ai_runtime_fence/current'), predecessor = await tx.get(cloudCostBudgetPath);
        const oldAttempts = await tx.list(`${cloudCostBudgetPath}/attempts`), actual = await tx.get(cloudCostGrantPath(grant));
        const actualAttempts = await tx.list(`${cloudCostGrantPath(grant)}/attempts`);
        this.check();
        return {kind: equal(fence, packet.expectedFence) && equal(predecessor, packet.predecessorLedger) &&
          equal(sorted(oldAttempts), sorted(packet.predecessorAttempts)) && equal(actual, expected) && equal(sorted(actualAttempts), sorted(expectedRows)) ? 'confirmed' : 'unavailable'};
      }, {maxAttempts: 1});
    } catch {return {kind: 'unknown'};}
  }
}
