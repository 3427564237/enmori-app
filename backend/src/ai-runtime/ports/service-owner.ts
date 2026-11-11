import type { RuntimeEpoch } from '../../ai-conversation/ports/real-conversation-store.js';

/** Private, operator-selected same-service ownership. Never a client field. */
export interface ServiceOwnershipConfiguration {
  readonly mode: 'renewable_service_lease';
  readonly serviceKey: string;
  readonly leaseDurationMs: 120000;
  readonly renewEveryMs: 30000;
  readonly safetyMarginMs: 15000;
}
export interface ServiceOwnerLease extends RuntimeEpoch {
  readonly serviceKey: string;
  readonly leaseVersion: number;
  readonly renewedAtMs: number;
  readonly leaseUntilMs: number;
}
export type ServiceOwnerResult =
  | { readonly kind: 'confirmed'; readonly lease: ServiceOwnerLease }
  /** No write was attempted; a bounded fresh observation may follow. */
  | { readonly kind: 'occupied'; readonly remainingMs: number }
  | { readonly kind: 'unavailable' | 'unknown' };
export interface ServiceOwnerAuthority {
  acquire(processEpoch: string, current: () => boolean): Promise<ServiceOwnerResult>;
  renew(original: ServiceOwnerLease, current: () => boolean): Promise<ServiceOwnerResult>;
}
