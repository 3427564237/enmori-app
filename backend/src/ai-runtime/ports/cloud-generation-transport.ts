import type { RequestBudget } from "./generation-transport.js";

/** A cloud observation is deliberately not the local physical-settlement Port.
 * A response or stopped failure requires provider-specific proof of termination;
 * unknown says nothing about whether remote computation continues. */
export type CloudGenerationObservation =
  | { readonly kind: "response"; readonly physical: "stopped"; readonly raw: Uint8Array }
  | { readonly kind: "failure"; readonly physical: "stopped" }
  | { readonly kind: "unknown"; readonly physical: "unknown" };

export interface CloudGenerationTransport<Input> {
  /** One original dispatch. No implicit retry, fallback or delivery authority. */
  dispatch(input: Input, budget: RequestBudget): Promise<CloudGenerationObservation>;
}

export interface CloudRecoveredReservation {
  /** Conservative remaining accounting time in this process's monotonic epoch. */
  readonly remainingMs: number;
  readonly tokens: number;
}

/** One bounded accounting window only. Exact caps and a conservative token
 * reservation come from a future approved composition; this is not a tokenizer
 * or a complete provider minute/day multi-window limit implementation. */
export interface CloudAdmissionLimits {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly maxTokens: number;
  readonly tokensPerRequest: number;
}

/** Trusted authority supplied by a future composition; no default store exists.
 * Recovery must verify all current-window reservations, including unknown
 * dispatched attempts, reject unsafe limit changes, and must not replay old
 * work. Any unknown read or write outcome fails closed. reserve() confirms a
 * durable, conservative claim before returning; the live callback must be
 * checked at the actual authority effect. A real implementation must establish
 * cross-restart clock/window correctness and atomic provider-wide quota. */
export interface CloudRecoveryAuthority {
  recover(limits: Readonly<CloudAdmissionLimits>): Promise<
    | { readonly kind: "confirmed"; readonly reservations: readonly CloudRecoveredReservation[];
        readonly previousRemote: "unknown" | "none_confirmed"; readonly lease: object }
    | { readonly kind: "unavailable" | "unknown" }
  >;
  /** A replacement epoch must revoke earlier leases; it cannot reset quota. */
  current(lease: object): boolean;
  /** Optional dynamic cooldown guard; also enforce at actual HTTP dispatch. */
  dispatchAllowed?(lease: object): boolean;
  /** rejected proves no claim was recorded; unknown never means no effect. */
  reserve(lease: object, input: { readonly tokens: number; readonly conservativeExpiresAt: number },
    live: () => boolean): Promise<"confirmed" | "rejected" | "unknown">;
}
