import type { CloudAiProcessing } from '../domain/cloud-ai-consent.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
export type CloudConsentObservation = { readonly kind: 'authorized'; readonly generation: number; readonly purposeGeneration: number; readonly current: () => boolean; readonly release: () => void }
  | { readonly kind: 'denied' | 'unavailable' | 'terminated' };
/** Trusted original identity only; callers reverify Auth before each read. */
export interface CloudAiConsentAuthority {
  /** Absent only on legacy Groq-only test/adapter implementations. */
  readonly processing?: CloudAiProcessing;
  read(principal: AuthPrincipal, ownerId: string, current: () => boolean, signal?: AbortSignal): Promise<CloudConsentObservation>;
}
