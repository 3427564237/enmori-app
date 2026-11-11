/** Integer USD nanodollars (1 USD = 1,000,000,000); no floating-point money. */
export type NanoUsd = number;
export type CloudCostModel = 'gpt-6-luna' | 'gpt-6.1-sol';
export type CloudCostConsumer = 'evaluation' | 'test_app' | 'conversation' | 'persona' | 'proactive';

export interface CloudModelPrice {
  readonly model: CloudCostModel;
  readonly serviceTier: 'default';
  readonly inputNanoUsdPerMillionTokens: NanoUsd;
  readonly cachedInputNanoUsdPerMillionTokens: NanoUsd;
  /** Explicit verified rate, including any cache-write premium. Missing is unknown. */
  readonly cacheWriteNanoUsdPerMillionTokens: NanoUsd;
  readonly outputNanoUsdPerMillionTokens: NanoUsd;
}

/** Fixed verification snapshot. Replacing a process never renews this grant. */
interface CloudCostGrantBase {
  readonly grantId: string;
  readonly provider: 'openai';
  readonly currency: 'USD';
  readonly creditExpiresAtMs: number;
  readonly verifiedSpendableRemainingNanoUsd: NanoUsd;
  readonly balanceVerifiedAtMs: number;
  readonly balanceValidUntilMs: number;
  readonly capNanoUsd: NanoUsd;
  readonly priceSnapshot: {
    readonly snapshotId: string;
    readonly verifiedAtMs: number;
    readonly validUntilMs: number;
    readonly prices: readonly CloudModelPrice[];
  };
}
export interface CloudGiftCostGrant extends CloudCostGrantBase {
  readonly schemaVersion: 'openai_cost_grant_v1';
  readonly cycleId: string;
  readonly cycleStartedAtMs: number;
  readonly originalGiftCreditNanoUsd: NanoUsd;
}
/** One separately approved purchase, never a renewal of the original gift. */
export interface CloudPaidCostGrant extends CloudCostGrantBase {
  readonly schemaVersion: 'openai_cost_grant_v2';
  readonly fundingKind: 'purchased_credit';
  readonly fundingReference: string;
  readonly creditIssuedAtMs: number;
  readonly creditedPurchasedNanoUsd: NanoUsd;
  readonly approvedCapNanoUsd: NanoUsd;
  readonly predecessor: {
    readonly grantId: string;
    readonly reservedLiabilityNanoUsd: NanoUsd;
    readonly unreflectedSpentNanoUsd: NanoUsd;
  };
}
export type CloudCostGrant = CloudGiftCostGrant | CloudPaidCostGrant;

/** Input includes cached/write subsets; output includes the reasoning subset. */
export interface CloudConfirmedUsage {
  readonly provider: 'openai';
  readonly model: CloudCostModel;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheWriteTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
}
export interface CloudCostAttemptInput {
  /** Original trusted UUID, never an account, prompt, message or credential. */
  readonly attemptId: string;
  readonly consumer: CloudCostConsumer;
  readonly model: CloudCostModel;
  readonly maxInputTokens: number;
  /** Includes all visible and reasoning output tokens. */
  readonly maxOutputTokens: number;
}
export interface CloudCostBudgetSnapshot {
  readonly grantId: string;
  readonly capNanoUsd: NanoUsd;
  readonly reservedNanoUsd: NanoUsd;
  readonly spentNanoUsd: NanoUsd;
  readonly availableNanoUsd: NanoUsd;
  readonly expiresAtMs: number;
  readonly attemptCount: number;
  readonly reconciledCount: number;
}
export type CloudCostReservation = object;
export type CloudCostRecoveryResult =
  | { readonly kind: 'confirmed'; readonly lease: object; readonly snapshot: CloudCostBudgetSnapshot }
  | { readonly kind: 'unknown' | 'unavailable' };
export type CloudCostReserveResult =
  | { readonly kind: 'confirmed'; readonly reservation: CloudCostReservation; readonly reservedNanoUsd: NanoUsd }
  | { readonly kind: 'rejected'; readonly reason: 'unavailable' | 'invalid' | 'duplicate' | 'exhausted' }
  | { readonly kind: 'unknown' };
export type CloudCostReconcileResult = 'confirmed' | 'already_reconciled' | 'rejected' | 'unknown';

/** Shared by every OpenAI evaluation, retry and application consumer. A thrown
 * or ambiguous transaction closes admission; it never authorizes a retry.
 * Missing state is not initialized. All unknown reservations remain charged at
 * their full worst case through restarts, epoch changes and credit expiry. */
export interface CloudCostBudgetAuthority {
  recover(): Promise<CloudCostRecoveryResult>;
  current(lease: object): boolean;
  reserve(lease: object, input: CloudCostAttemptInput, live: () => boolean): Promise<CloudCostReserveResult>;
  /** Consumes the original local permit once, immediately before invocation. */
  beginDispatch(reservation: CloudCostReservation): boolean;
  /** Dynamic guard for that original invocation; not a second dispatch permit. */
  dispatchAllowed(reservation: CloudCostReservation): boolean;
  /** Only provider-confirmed terminal usage; never inference from HTTP status,
   * local cancellation, output validation, timeout or remote silence. */
  reconcile(reservation: CloudCostReservation, usage: CloudConfirmedUsage): Promise<CloudCostReconcileResult>;
}
