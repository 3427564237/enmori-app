import type { FullPrecisionInstant } from "./real-effect-expiry.js";

/**
 * Unwired N02 section 3.2 resolver selected by S-PM-1013-LI-REMAINING-AI-A.
 *
 * Input is a COMPLETE, authoritative, consistent metadata inventory from ONE
 * transaction/read view, never an ordinary history page. Identity projections
 * below come from canonical owned paths; they are not extra persisted fields.
 * createTime is immutable service metadata, not a document field, updateTime,
 * Date, client timestamp, request time or ACK. appendBefore is the selected
 * immutable integer map. No content, token, source or effects payload is needed.
 *
 * The selected writer is the only creator: its original reserved_new first U
 * creates parent + sequence 1 atomically; no individual message deletion, ID
 * reuse/restoration or appendBefore mutation is permitted. The function checks
 * the resulting complete lineage, not the original ticket or SDK provenance.
 * It cannot establish read-time consistency, metadata precision, non-reuse,
 * clock trust/history, database ordering, a durable expiry fence or deletion.
 * All parent/latest, page, accepted-pair and effects consumers need this SAME
 * whole-Conversation result plus their separate authority/integrity checks.
 *
 * now must come from the trusted clock mapping, never a client. A millisecond
 * value denotes the LOWER bound of that millisecond, including negative times.
 * Its upper bound is not evidence of current time. A pure function cannot know
 * that an earlier invocation observed a later clock: callers must retain the
 * non-revival/deleting fence and establish a non-regressing clock mapping.
 * Existing Clock/fake Ports remain unchanged; no runtime wiring is added here.
 */

export interface RealRetentionParentMetadata {
  readonly ownerAccountId: string;
  readonly conversationId: string;
  readonly state: "live" | "deleting";
  readonly lifecycleVersion: number;
  readonly nextSequence: number;
  readonly latestMessageId: string;
}

export interface RealRetentionMessageMetadata {
  readonly ownerAccountId: string;
  readonly conversationId: string;
  readonly messageId: string;
  readonly role: "user" | "assistant";
  readonly sequence: number;
  readonly createTime: unknown;
  readonly appendBefore?: unknown;
}

export interface RealRetentionInventory {
  readonly parent: RealRetentionParentMetadata;
  readonly messages: readonly RealRetentionMessageMetadata[];
}

export interface RealRetentionResolverInput {
  /** Trusted expected identity, independently established by the caller. */
  readonly ownerAccountId: string;
  readonly conversationId: string;
  readonly inventory: unknown;
  readonly now: {
    readonly precision: "nanosecond" | "millisecond";
    readonly instant: unknown;
  };
}

export type RealRetentionResolution =
  | {
      readonly state: "unavailable";
      readonly canAdvanceAnchor: false;
      readonly cleanupDue: false;
    }
  | {
      /** live is ONLY the retention gate, not permission to use model/content. */
      readonly state: "live" | "expired" | "deleting";
      readonly canAdvanceAnchor: boolean;
      readonly expiresAt: FullPrecisionInstant;
      readonly cleanupAt: FullPrecisionInstant;
      /** Original deadline reached; neither a deletion grant nor completion. */
      readonly cleanupDue: boolean;
    };

const RETENTION_SECONDS = 90 * 24 * 60 * 60;
const CLEANUP_SECONDS = 24 * 60 * 60;

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  return value as Record<string, unknown>;
}

function instant(value: unknown): FullPrecisionInstant | undefined {
  const fields = record(value);
  if (fields === undefined || Reflect.ownKeys(fields).length !== 2) return undefined;
  // Reject inherited/accessor fields too: the inner projection is plain data.
  const seconds = Object.getOwnPropertyDescriptor(fields, "seconds")?.value as unknown;
  const nanoseconds = Object.getOwnPropertyDescriptor(fields, "nanoseconds")?.value as unknown;
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

function sameMillisecond(left: FullPrecisionInstant, right: FullPrecisionInstant): boolean {
  return left.seconds === right.seconds &&
    Math.floor(left.nanoseconds / 1_000_000) === Math.floor(right.nanoseconds / 1_000_000);
}

function identity(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function unavailable(): RealRetentionResolution {
  // Unknown metadata/clock is not proof of permanent expiry or cleanup rights.
  return { state: "unavailable", canAdvanceAnchor: false, cleanupDue: false };
}

/**
 * Resolves the complete inventory without changing it or persisting an anchor.
 * Sequence continuity follows the selected no-individual-message-delete rule;
 * tombstones retain their message metadata and appendBefore. Partial deletion
 * inventories fail closed too. A well-formed deleting parent never becomes live.
 */
export function resolveRealRetention(input: RealRetentionResolverInput): RealRetentionResolution {
  try {
    return resolve(input);
  } catch {
    // Malformed adapter projections must not become permission or raw failures.
    return unavailable();
  }
}

function resolve(input: RealRetentionResolverInput): RealRetentionResolution {
  if (!identity(input.ownerAccountId) || !identity(input.conversationId)) return unavailable();
  const now = instant(input.now.instant);
  const precision = input.now.precision;
  if (now === undefined || (precision !== "nanosecond" && precision !== "millisecond") ||
      (precision === "millisecond" && now.nanoseconds % 1_000_000 !== 0)) return unavailable();
  const inventory = record(input.inventory);
  const parent = record(inventory?.["parent"]);
  const messages = inventory?.["messages"];
  if (parent === undefined || !Array.isArray(messages) || messages.length === 0 ||
      parent["ownerAccountId"] !== input.ownerAccountId ||
      parent["conversationId"] !== input.conversationId ||
      (parent["state"] !== "live" && parent["state"] !== "deleting") ||
      !positiveSafeInteger(parent["lifecycleVersion"]) ||
      !positiveSafeInteger(parent["nextSequence"]) ||
      parent["nextSequence"] !== messages.length + 1 ||
      !identity(parent["latestMessageId"])) return unavailable();

  const ordered: { fields: Record<string, unknown>; sequence: number }[] = [];
  const ids = new Set<string>();
  for (const raw of messages as unknown[]) {
    const fields = record(raw);
    if (fields === undefined || fields["ownerAccountId"] !== input.ownerAccountId ||
        fields["conversationId"] !== input.conversationId ||
        !identity(fields["messageId"]) || ids.has(fields["messageId"]) ||
        (fields["role"] !== "user" && fields["role"] !== "assistant") ||
        !positiveSafeInteger(fields["sequence"])) return unavailable();
    ids.add(fields["messageId"]);
    ordered.push({ fields, sequence: fields["sequence"] });
  }
  ordered.sort((a, b) => a.sequence - b.sequence);

  let previousCreation: FullPrecisionInstant | undefined;
  let cutoff: FullPrecisionInstant | undefined;
  let lateCopy = false;
  for (let index = 0; index < ordered.length; index++) {
    const row = ordered[index];
    if (row === undefined || row.sequence !== index + 1) return unavailable();
    const creation = instant(row.fields["createTime"]);
    // A coarse clock cannot establish that a later sub-ms creation is past.
    if (creation === undefined || compare(creation, now) > 0 ||
        (previousCreation !== undefined && compare(creation, previousCreation) < 0)) return unavailable();
    const hasAppendBefore = Object.hasOwn(row.fields, "appendBefore");
    if (index === 0) {
      if (row.fields["role"] !== "user" || hasAppendBefore) return unavailable();
      cutoff = plusSeconds(creation, RETENTION_SECONDS);
    } else {
      const appendBefore = instant(row.fields["appendBefore"]);
      if (!hasAppendBefore || appendBefore === undefined || cutoff === undefined ||
          compare(appendBefore, cutoff) !== 0) return unavailable();
      if (compare(creation, appendBefore) >= 0) lateCopy = true;
      // Once a late physical copy exists, only the old cutoff remains valid.
      // A forged/self-progressed later cutoff fails the equality check above.
      if (!lateCopy) cutoff = plusSeconds(creation, RETENTION_SECONDS);
    }
    if (cutoff === undefined) return unavailable();
    previousCreation = creation;
  }
  const latest = ordered[ordered.length - 1];
  if (latest === undefined || latest.fields["messageId"] !== parent["latestMessageId"] ||
      cutoff === undefined) return unavailable();
  const cleanupAt = plusSeconds(cutoff, CLEANUP_SECONDS);
  if (cleanupAt === undefined) return unavailable();

  // In an ambiguous expiry millisecond neither access nor permanent expiry is
  // established. Do not use the bucket's upper bound as current server time.
  if (!lateCopy && precision === "millisecond" && compare(now, cutoff) < 0 &&
      sameMillisecond(now, cutoff)) return unavailable();
  const state = parent["state"] === "deleting" ? "deleting" :
    lateCopy || compare(now, cutoff) >= 0 ? "expired" : "live";
  return {
    state,
    canAdvanceAnchor: state === "live",
    expiresAt: cutoff,
    cleanupAt,
    cleanupDue: compare(now, cleanupAt) >= 0,
  };
}
