import type { Auth } from "firebase-admin/auth";

import { dependencyUnavailable } from "../../ports/dependency-failure.js";
import type {
  IdentityVerificationResult,
  IdentityVerifier,
} from "../../ports/identity-verifier.js";

const FORBIDDEN_AUTH_CODES = new Set([
  "auth/id-token-revoked",
  "auth/user-disabled",
]);

const INVALID_AUTH_CODES = new Set([
  "auth/argument-error",
  "auth/invalid-argument",
  "auth/invalid-id-token",
  "auth/id-token-expired",
]);

function firebaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

export class FirebaseIdentityVerifier implements IdentityVerifier {
  public constructor(private readonly auth: Auth) {}

  public async verifyIdToken(token: string): Promise<IdentityVerificationResult> {
    if (token.length === 0) return { kind: "invalid" };

    try {
      const decoded = await this.auth.verifyIdToken(token, true);
      return typeof decoded.uid === "string" && decoded.uid.length > 0
        ? {
            kind: "verified",
            principal: { firebaseUid: decoded.uid },
          }
        : { kind: "invalid" };
    } catch (error: unknown) {
      const code = firebaseErrorCode(error);
      if (code !== undefined && FORBIDDEN_AUTH_CODES.has(code)) {
        return { kind: "forbidden" };
      }
      if (code !== undefined && INVALID_AUTH_CODES.has(code)) {
        return { kind: "invalid" };
      }
      return dependencyUnavailable;
    }
  }
}
