import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { ContextDependencies } from "../ports/real-context-reader.js";
import { compareInstant, parseReadAuthority, parseReadInstant, parseReadNote, validGeneration } from "./real-context-records.js";

/** Construction evidence for this exact gateway/database. Never a DTO or a
 * substitute for the producer inventory. Ordinary construction omits it. */
export interface TransactionalNotePrerequisites {
  readonly gateway: FirestoreGateway;
  readonly sourceReferences: readonly string[];
  readonly completeCanonicalUtcInventory: true;
  readonly immutableOwnerNoteAndTime: true;
  readonly permanentDeletion: true;
  readonly noRestoreOrIdReuse: true;
}
export type SourcePair = { readonly sourceType: "check_in"; readonly sourceId: string };
export interface ParsedProvenance {
  readonly sources: readonly SourcePair[];
  readonly purposeRevocationGeneration?: number;
}
const exact = (value: StoredDocument, fields: readonly string[]): boolean =>
  Object.keys(value).length === fields.length && fields.every(k => Object.hasOwn(value, k));

export function parseProvenance(value: StoredDocument | undefined): ParsedProvenance | undefined {
  if (!value || !Array.isArray(value.sources) || value.sources.length > 5) return undefined;
  if (value.sources.length === 0) return exact(value, ["sources"]) ? { sources: [] } : undefined;
  if (!exact(value, ["sources", "purposeRevocationGeneration"]) || !validGeneration(value.purposeRevocationGeneration)) return undefined;
  const sources: SourcePair[] = [], seen = new Set<string>();
  for (const item of value.sources) {
    if (typeof item !== "object" || item === null || Array.isArray(item) || !exact(item, ["sourceType", "sourceId"]) ||
        item.sourceType !== "check_in" || typeof item.sourceId !== "string" || !isSafeDocumentId(item.sourceId) || seen.has(item.sourceId)) return undefined;
    seen.add(item.sourceId); sources.push({ sourceType: "check_in", sourceId: item.sourceId });
  }
  return { sources, purposeRevocationGeneration: value.purposeRevocationGeneration };
}

export function validDependencies(value: ContextDependencies): boolean {
  return Array.isArray(value.sources) && value.sources.length <= 5 &&
    value.sources.every(s => typeof s === "object" && s !== null && !Array.isArray(s) &&
      s.sourceType === "check_in" && typeof s.sourceId === "string" && isSafeDocumentId(s.sourceId) && parseReadInstant(s.observedVersion) !== undefined) &&
    new Set(value.sources.map(s => s.sourceId)).size === value.sources.length;
}

/** Reads participate in the caller's SAME content/read/cleanup transaction.
 * No cached permit, content fingerprint, stored version or latest-view rewrite. */
export async function inspectNoteSources(tx: FirestoreTransactionGateway, gateway: FirestoreGateway,
  prerequisites: TransactionalNotePrerequisites | undefined, owner: string, sources: readonly SourcePair[],
  dependencies?: ContextDependencies, originalCurrent?: () => void): Promise<"valid" | "invalid" | "unavailable"> {
  if (sources.length === 0) return "valid";
  if (prerequisites?.gateway !== gateway || prerequisites.completeCanonicalUtcInventory !== true ||
      prerequisites.immutableOwnerNoteAndTime !== true || prerequisites.permanentDeletion !== true || prerequisites.noRestoreOrIdReuse !== true ||
      !Array.isArray(prerequisites.sourceReferences) || prerequisites.sourceReferences.length === 0 ||
      !prerequisites.sourceReferences.every(v => typeof v === "string" && v.length > 0 && v.isWellFormed()) || !tx.getSnapshot) return "unavailable";
  for (const source of sources) {
    originalCurrent?.();
    const row = await tx.getSnapshot(`check_ins/${source.sourceId}`);
    originalCurrent?.();
    // One confirmed permanently lost required source invalidates the entire
    // assistant, including its other still-valid/unknown provenance partners.
    if (!row) return "invalid";
    const note = parseReadNote(row.data, source.sourceId, row.updateTime, owner);
    if (!note) return "unavailable";
    const previous = dependencies?.sources.find(s => s.sourceId === source.sourceId)?.observedVersion;
    // Higher updateTime may be visibility only; immutable producer facts govern
    // Note/owner/time identity. A regression is not proof of permanent deletion.
    if (dependencies && (!previous || compareInstant(note.observedVersion, previous) < 0)) return "unavailable";
  }
  return "valid";
}

export async function inspectProvenance(tx: FirestoreTransactionGateway, gateway: FirestoreGateway,
  prerequisites: TransactionalNotePrerequisites | undefined, owner: string, value: ParsedProvenance): Promise<"valid" | "invalid" | "unavailable"> {
  if (value.sources.length === 0) return "valid";
  const account = parseReadAuthority(await tx.get(`accounts/${owner}`), owner);
  const stamp = value.purposeRevocationGeneration;
  if (!account || stamp === undefined || account.purposeRevocationGeneration < stamp) return "unavailable";
  if (account.purposeRevocationGeneration > stamp) return "invalid";
  if (account.consent !== "accepted") return "unavailable"; // Equal-generation rejection violates producer authority; no permanent erasure.
  return inspectNoteSources(tx, gateway, prerequisites, owner, value.sources);
}
