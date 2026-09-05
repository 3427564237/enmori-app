import type { DependencyUnavailable } from "./dependency-failure.js";

export interface AuthPrincipal {
  readonly firebaseUid: string;
}

export type IdentityVerificationResult =
  | { readonly kind: "verified"; readonly principal: AuthPrincipal }
  | { readonly kind: "invalid" }
  | { readonly kind: "forbidden" }
  | DependencyUnavailable;

export interface IdentityVerifier {
  verifyIdToken(token: string): Promise<IdentityVerificationResult>;
}
