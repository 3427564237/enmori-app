import type { FirestoreTransactionGateway as Tx, StoredDocument, StoredDocumentSnapshot } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { isSafeDocumentId, parseCheckInProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { parseReadInstant, parseReadAuthority } from "./real-context-records.js";
import type { OwnedSourceCard } from "../ports/owned-sources.js";

export interface SourceUseV2Entry {
  readonly kind: "conversation_message" | "check_in";
  readonly id: string;
  readonly version: string;
  readonly cardRef: string;
}
export interface SourceUseV2 {
  readonly schemaVersion: "source_use_v2";
  readonly purpose: "explicit_follow_up" | "selected_checkin_reply";
  readonly processing: "local";
  readonly sources: readonly SourceUseV2Entry[];
  readonly requiredCategories: readonly ("conversation_history" | "check_ins")[];
  readonly purposeRevocationGeneration: number;
}
const exact = (row: StoredDocument, required: readonly string[]) =>
  Object.keys(row).length === required.length && required.every(k => Object.hasOwn(row, k));
const uint = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const plain = (v: unknown): v is StoredDocument => !!v && typeof v === "object" && !Array.isArray(v);
export function parseSourceUseV2(row: StoredDocument | undefined): SourceUseV2 | undefined {
  if (!row || !exact(row, ["schemaVersion", "purpose", "processing", "sources", "requiredCategories", "purposeRevocationGeneration"]) ||
      row.schemaVersion !== "source_use_v2" || !["explicit_follow_up", "selected_checkin_reply"].includes(String(row.purpose)) ||
      row.processing !== "local" || !uint(row.purposeRevocationGeneration) || !Array.isArray(row.sources) || row.sources.length<1 || row.sources.length > 15 ||
      !Array.isArray(row.requiredCategories) || new Set(row.requiredCategories).size !== row.requiredCategories.length ||
      row.requiredCategories.some(c => c !== "conversation_history" && c !== "check_ins")) return undefined;
  const keys = new Set<string>(), cards = new Set<string>();
  for (const source of row.sources) {
    if (!plain(source) || !exact(source, ["kind", "id", "version", "cardRef"]) ||
        !["conversation_message", "check_in"].includes(String(source.kind)) || typeof source.id !== "string" || !isSafeDocumentId(source.id) ||
        typeof source.version !== "string" || !source.version || source.version.length > 512 || !source.version.isWellFormed() ||
        typeof source.cardRef !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(source.cardRef)) return undefined;
    const key = `${source.kind}:${source.id}`;
    if (keys.has(key) || cards.has(source.cardRef)) return undefined;
    keys.add(key); cards.add(source.cardRef);
    if (!row.requiredCategories.includes(source.kind === "check_in" ? "check_ins" : "conversation_history")) return undefined;
  }
  if(row.purpose==="explicit_follow_up"&&(row.sources.length!==1||row.sources[0]?.kind!=="conversation_message"||
    row.requiredCategories.length!==1||row.requiredCategories[0]!=="conversation_history"))return undefined;
  return row as unknown as SourceUseV2;
}

/** Server metadata tuple, not a content hash. Message text is immutable; its
 * updateTime changes on operation settlement and must not change identity. */
export function messageSourceVersion(row: StoredDocumentSnapshot): string | undefined {
  const created = parseReadInstant(row.createTime);
  return created && uint(row.data.sequence) && row.data.sequence > 0
    ? JSON.stringify(["message_v1", row.data.sequence, created.seconds, created.nanoseconds]) : undefined;
}
/** Explicit mutable F1a path. No old immutable-Note prerequisites/flag. */
export function checkInSourceVersion(row: StoredDocumentSnapshot): string | undefined {
  const created = parseReadInstant(row.createTime), updated = parseReadInstant(row.updateTime);
  const revision = row.data.revision;
  return created && updated && (revision === undefined || (uint(revision) && revision > 0))
    ? JSON.stringify(["checkin_v1", created.seconds, created.nanoseconds, updated.seconds, updated.nanoseconds, revision ?? null]) : undefined;
}

export async function inspectSourceUseV2(tx: Tx, ownerId: string, conversationId: string, receipt: SourceUseV2,
  utcMilliseconds: () => number, check: () => void): Promise<{ readonly kind: "valid"; readonly cards: readonly OwnedSourceCard[] }
    | { readonly kind: "invalid" | "unavailable" }> {
  if (!tx.getSnapshot) return { kind: "unavailable" };
  const started=utcMilliseconds();let last=started;
  const fresh=()=>{const now=utcMilliseconds();if(!Number.isSafeInteger(now)||now<last||now-started>5000)return false;last=now;return true;};
  if(!Number.isSafeInteger(started))return {kind:"unavailable"};
  const cards: OwnedSourceCard[] = [];
  let account: StoredDocument | undefined;
  {
    check(); account = await tx.get(`accounts/${ownerId}`); check();if(!fresh())return {kind:"unavailable"};
    const authority=parseReadAuthority(account,ownerId);
    if (!authority) return { kind: "unavailable" };
    if (authority.purposeRevocationGeneration > receipt.purposeRevocationGeneration) return { kind: "invalid" };
    if (authority.purposeRevocationGeneration < receipt.purposeRevocationGeneration || authority.consent !== "accepted") return { kind: "unavailable" };
  }
  for (const source of receipt.sources) {
    check();if(!fresh())return {kind:"unavailable"};const observedAt=new Date(last).toISOString();
    const row = await tx.getSnapshot(source.kind === "check_in" ? `check_ins/${source.id}` :
      `accounts/${ownerId}/conversations/${conversationId}/messages/${source.id}`);
    check();if(!fresh())return {kind:"unavailable"};
    if (!row) return { kind: "invalid" };
    let occurredAt: string;
    if (source.kind === "check_in") {
      if (row.data.ownerAccountId !== ownerId) return { kind: "invalid" };
      const projection = parseCheckInProjection(row.data, row.id), version = checkInSourceVersion(row);
      if (!projection || !version) return { kind: "unavailable" };
      if (version !== source.version) return { kind: "invalid" };
      occurredAt = projection.createdAt;
    } else {
      if (row.data.role !== "user") return { kind: "invalid" };
      const version = messageSourceVersion(row), instant = parseReadInstant(row.createTime);
      if (!version || !instant) return { kind: "unavailable" };
      if (version !== source.version) return { kind: "invalid" };
      occurredAt = new Date(instant.seconds * 1000 + Math.floor(instant.nanoseconds / 1e6)).toISOString();
    }
    cards.push({ cardRef: source.cardRef, kind: source.kind, version: source.version, sourceOccurredAt: occurredAt,
      observedAt, state: "available", canNavigate: true });
  }
  return { kind: "valid", cards };
}
