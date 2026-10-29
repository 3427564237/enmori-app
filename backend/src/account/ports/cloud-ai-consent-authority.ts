import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
export type CloudConsentObservation = { readonly kind: 'authorized'; readonly generation: number; readonly purposeGeneration: number; readonly current: () => boolean; readonly release: () => void }
  | { readonly kind: 'denied' | 'unavailable' | 'terminated' };
/** Trusted original identity only; callers reverify Auth before each read. */
export interface CloudAiConsentAuthority {
  read(principal: AuthPrincipal, ownerId: string, current: () => boolean, signal?: AbortSignal): Promise<CloudConsentObservation>;
}
