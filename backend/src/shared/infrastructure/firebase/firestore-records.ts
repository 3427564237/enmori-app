import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import type { CheckInProjection } from "../../../check-ins/application/check-in-model.js";
import { normalizeNote } from "../../../check-ins/domain/note.js";
import type { AccountProjection } from "../../../onboarding/application/onboarding-model.js";
import { canonicalizeUsername } from "../../../onboarding/domain/username.js";

export const FIRESTORE_COLLECTIONS = {
  accounts: "accounts",
  authBindings: "auth_bindings",
  usernameReservations: "username_reservations",
  checkIns: "check_ins",
  idempotency: "idempotency",
} as const;

export type IdempotencyOperation =
  | "complete_onboarding"
  | "create_check_in";

export interface IdempotencyRecord {
  readonly scope: string;
  readonly operation: IdempotencyOperation;
  readonly keyDigest: string;
  readonly requestFingerprint: string;
  readonly committedResponseReference: string;
  readonly expiresAt: string;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createIdempotencyIdentity(input: {
  readonly scope: string;
  readonly operation: IdempotencyOperation;
  readonly rawKey: string;
}): { readonly keyDigest: string; readonly documentId: string } {
  const keyDigest = sha256(input.rawKey);
  return {
    keyDigest,
    documentId: sha256(
      JSON.stringify([input.scope, input.operation, keyDigest]),
    ),
  };
}

export function createRequestFingerprint(
  normalizedInput: readonly string[],
): string {
  return sha256(JSON.stringify(normalizedInput));
}

export function isSafeDocumentId(value: string): boolean {
  return (
    value.length > 0 &&
    value.isWellFormed() &&
    Buffer.byteLength(value, "utf8") <= 1_500 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !/^__.*__$/.test(value)
  );
}

export function isUtcIsoInstant(value: unknown): value is string {
  if (typeof value !== "string" || !value.endsWith("Z")) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export function isUnexpired(
  expiresAt: string,
  currentInstant: string,
): boolean | undefined {
  if (!isUtcIsoInstant(expiresAt) || !isUtcIsoInstant(currentInstant)) {
    return undefined;
  }
  return new Date(expiresAt).getTime() > new Date(currentInstant).getTime();
}

export function parseIdempotencyRecord(
  data: Readonly<Record<string, unknown>>,
): IdempotencyRecord | undefined {
  const { scope, operation, keyDigest, requestFingerprint,
    committedResponseReference, expiresAt } = data;
  if (
    typeof scope !== "string" ||
    (operation !== "complete_onboarding" && operation !== "create_check_in") ||
    typeof keyDigest !== "string" ||
    typeof requestFingerprint !== "string" ||
    typeof committedResponseReference !== "string" ||
    !isUtcIsoInstant(expiresAt)
  ) {
    return undefined;
  }
  return {
    scope,
    operation,
    keyDigest,
    requestFingerprint,
    committedResponseReference,
    expiresAt,
  };
}

export function parseAuthBinding(
  data: Readonly<Record<string, unknown>>,
): string | undefined {
  return typeof data.accountId === "string" && isSafeDocumentId(data.accountId)
    ? data.accountId
    : undefined;
}

export function parseAccountProjection(
  data: Readonly<Record<string, unknown>>,
): AccountProjection | undefined {
  const { username, optionalProcessingConsent, checkInVisibility,
    onboardingCompletedAt } = data;
  const canonicalUsername =
    typeof username === "string" ? canonicalizeUsername(username) : undefined;
  if (
    canonicalUsername === undefined ||
    !canonicalUsername.ok ||
    canonicalUsername.value !== username ||
    (optionalProcessingConsent !== "accepted" &&
      optionalProcessingConsent !== "rejected") ||
    (checkInVisibility !== "public" && checkInVisibility !== "private") ||
    !isUtcIsoInstant(onboardingCompletedAt)
  ) {
    return undefined;
  }
  return {
    username: canonicalUsername.value,
    optionalProcessingConsent,
    checkInVisibility,
    onboardingCompletedAt,
  };
}

export function parseCheckInProjection(
  data: Readonly<Record<string, unknown>>,
): CheckInProjection | undefined {
  const { checkInId, note, createdAt } = data;
  const normalizedNote =
    typeof note === "string" ? normalizeNote(note) : undefined;
  if (
    typeof checkInId !== "string" ||
    !isSafeDocumentId(checkInId) ||
    normalizedNote === undefined ||
    !normalizedNote.ok ||
    normalizedNote.value !== note ||
    !isUtcIsoInstant(createdAt)
  ) {
    return undefined;
  }
  return { checkInId, note: normalizedNote.value, createdAt };
}
