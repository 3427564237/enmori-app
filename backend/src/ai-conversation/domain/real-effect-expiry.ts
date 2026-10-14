/**
 * Local, unwired expiry mathematics for S-PM-1013-LI-DELEGATED-F01-BCD
 * (decision source 20ff6cfc) and the retained Q14 90-day / 24-hour rules.
 *
 * This is not a store, a persisted-field contract, or permission to use content.
 * Callers must establish authoritative creation metadata and valid lineage;
 * this function cannot prove pre-expiry SDK submission, fence ordering, caller
 * identity, source validity, or deletion completion. Real wiring still depends
 * on the separate N02/F03 contracts. Existing Clock and strict fake Ports stay
 * unchanged. Nanosecond arithmetic here makes no database precision claim.
 */

export interface FullPrecisionInstant {
  readonly seconds: number;
  readonly nanoseconds: number;
}

export type RealEffectLineage =
  | { readonly kind: "first-message" }
  | { readonly kind: "existing-message"; readonly previousValidCutoff: unknown };

export interface RealEffectExpiryInput {
  readonly creation: unknown;
  readonly now: unknown;
  /** First-message is an explicit, caller-established fact, never a null fallback. */
  readonly lineage: RealEffectLineage;
}

export type RealEffectExpiry =
  | {
      readonly state: "unavailable";
      readonly canAdvanceAnchor: false;
      readonly cleanupDue: false;
    }
  | {
      readonly state: "live" | "expired";
      /** A live effect may establish/advance its anchor, subject to other guards. */
      readonly canAdvanceAnchor: boolean;
      readonly expiresAt: FullPrecisionInstant;
      readonly cleanupAt: FullPrecisionInstant;
      /** The original cleanup deadline has been reached, not proof of deletion. */
      readonly cleanupDue: boolean;
    };

const RETENTION_SECONDS = 90 * 24 * 60 * 60;
const CLEANUP_SECONDS = 24 * 60 * 60;

function instant(value: unknown): FullPrecisionInstant | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const fields = value as Record<string, unknown>;
  const seconds = fields["seconds"];
  const nanoseconds = fields["nanoseconds"];
  if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) ||
      typeof nanoseconds !== "number" || !Number.isInteger(nanoseconds) ||
      nanoseconds < 0 || nanoseconds > 999_999_999) return undefined;
  return { seconds, nanoseconds };
}

function compare(left: FullPrecisionInstant, right: FullPrecisionInstant): -1 | 0 | 1 {
  if (left.seconds !== right.seconds) return left.seconds < right.seconds ? -1 : 1;
  if (left.nanoseconds === right.nanoseconds) return 0;
  return left.nanoseconds < right.nanoseconds ? -1 : 1;
}

function plusSeconds(value: FullPrecisionInstant, duration: number): FullPrecisionInstant | undefined {
  const seconds = value.seconds + duration;
  return Number.isSafeInteger(seconds) ? { seconds, nanoseconds: value.nanoseconds } : undefined;
}

function unavailable(): RealEffectExpiry {
  // Unknown metadata does not establish an expiry or authorize permanent cleanup.
  return { state: "unavailable", canAdvanceAnchor: false, cleanupDue: false };
}

/**
 * Evaluate a known effect without Date/millisecond conversion. For an existing
 * Conversation, previousValidCutoff must come from its already validated prior
 * retention anchor, not an unvalidated pointer or a generic modification time.
 * At/after that cutoff the copy is expired, even if a later ACK finds it; neither
 * that copy nor a later cleanup invocation moves the original expiry/cleanup.
 * "live" describes only this expiry policy, not authorization or deliverability.
 */
export function evaluateRealEffectExpiry(input: RealEffectExpiryInput): RealEffectExpiry {
  const creation = instant(input.creation);
  const now = instant(input.now);
  if (creation === undefined || now === undefined) return unavailable();

  let expiresAt: FullPrecisionInstant | undefined;
  let advancesAnchor = false;
  let lateCopy = false;
  switch (input.lineage.kind) {
    case "first-message":
      expiresAt = plusSeconds(creation, RETENTION_SECONDS);
      advancesAnchor = true;
      break;
    case "existing-message": {
      const previous = instant(input.lineage.previousValidCutoff);
      if (previous === undefined) return unavailable();
      if (compare(creation, previous) >= 0) {
        lateCopy = true;
        expiresAt = previous;
      } else {
        const proposed = plusSeconds(creation, RETENTION_SECONDS);
        if (proposed === undefined) return unavailable();
        advancesAnchor = compare(proposed, previous) > 0;
        // Reading an older valid message cannot move a validated anchor backward.
        expiresAt = advancesAnchor ? proposed : previous;
      }
      break;
    }
    default:
      return unavailable();
  }
  if (expiresAt === undefined) return unavailable();
  const cleanupAt = plusSeconds(expiresAt, CLEANUP_SECONDS);
  if (cleanupAt === undefined) return unavailable();
  const expired = lateCopy || compare(now, expiresAt) >= 0;
  return {
    state: expired ? "expired" : "live",
    canAdvanceAnchor: !expired && advancesAnchor,
    expiresAt,
    cleanupAt,
    cleanupDue: compare(now, cleanupAt) >= 0,
  };
}
