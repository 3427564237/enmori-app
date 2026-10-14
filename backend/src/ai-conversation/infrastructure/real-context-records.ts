import { isPersonaId, isPersonaRevision, isStateRevision, normalizePersonaInput } from "../../personas/domain/persona-values.js";
import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { isSafeDocumentId, parseAccountProjection, parseCheckInProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { ReadAuthority, ReadNote, ReadPersonaSet } from "../ports/real-context-reader.js";

export const validGeneration = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function compareInstant(a: FullPrecisionInstant, b: FullPrecisionInstant): number {
  return a.seconds < b.seconds ? -1 : a.seconds > b.seconds ? 1 :
    a.nanoseconds < b.nanoseconds ? -1 : a.nanoseconds > b.nanoseconds ? 1 : 0;
}

export function parseReadInstant(value: unknown): FullPrecisionInstant | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as FullPrecisionInstant;
  return Number.isSafeInteger(v.seconds) && Number.isInteger(v.nanoseconds) &&
    v.nanoseconds >= 0 && v.nanoseconds < 1e9
    ? Object.freeze({ seconds: v.seconds, nanoseconds: v.nanoseconds }) : undefined;
}

/** Note's approved string ordering requires exact UTC millisecond representation. */
export function canonicalNoteInstant(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? value : undefined;
}

/** Never round a fixed anchor to make a string query appear usable. */
export function noteQueryInstant(value: FullPrecisionInstant): string | undefined {
  const instant = parseReadInstant(value);
  if (!instant || instant.nanoseconds % 1e6 !== 0) return undefined;
  const ms = instant.seconds * 1000 + instant.nanoseconds / 1e6;
  if (!Number.isSafeInteger(ms)) return undefined;
  try { return canonicalNoteInstant(new Date(ms).toISOString()); } catch { return undefined; }
}

export function parseReadAuthority(account: StoredDocument | undefined, ownerId: string): ReadAuthority | undefined {
  if (!account || !isSafeDocumentId(ownerId) || !parseAccountProjection(account)) return undefined;
  const settingsRevision = Object.hasOwn(account, "settingsRevision") ? account.settingsRevision : 0;
  if (!validGeneration(settingsRevision) || (Object.hasOwn(account, "settingsRevision") && settingsRevision < 1) ||
      !validGeneration(account.purposeRevocationGeneration)) return undefined;
  return Object.freeze({ ownerId, completed: true, purpose: "checkin_conversation",
    consent: account.optionalProcessingConsent as "accepted" | "rejected", purposeRevocationGeneration: account.purposeRevocationGeneration,
    settingsRevision });
}

export function parseReadPersonaState(data: StoredDocument | undefined): Omit<ReadPersonaSet, "items"> | undefined {
  if (!data || !Object.keys(data).every(k => ["livePersonaIds", "stateRevision", "activePersonaId"].includes(k)) ||
      !isStateRevision(data.stateRevision) || !Array.isArray(data.livePersonaIds) || data.livePersonaIds.length > 5 ||
      !data.livePersonaIds.every(isPersonaId)) return undefined;
  const ids = data.livePersonaIds as string[];
  if (ids.some((id, i) => i > 0 && ids[i - 1]! >= id) ||
      (Object.hasOwn(data, "activePersonaId") && (!isPersonaId(data.activePersonaId) || !ids.includes(data.activePersonaId)))) return undefined;
  return Object.freeze({ stateRevision: data.stateRevision, livePersonaIds: Object.freeze([...ids]),
    ...(typeof data.activePersonaId === "string" ? { activePersonaId: data.activePersonaId } : {}) });
}

export function parseReadPersona(data: StoredDocument | undefined, personaId: string): ReadPersonaSet["items"][number] | undefined {
  const fields = ["displayName", "tone", "responseLength", "formatStyle", "createdAt", "updatedAt", "revision"];
  if (!data || !isPersonaId(personaId) || !fields.every(k => Object.hasOwn(data, k)) ||
      !Object.keys(data).every(k => fields.includes(k)) || !isPersonaRevision(data.revision) ||
      !canonicalNoteInstant(data.createdAt) || !canonicalNoteInstant(data.updatedAt)) return undefined;
  const input = normalizePersonaInput({ displayName: data.displayName, tone: data.tone,
    responseLength: data.responseLength, formatStyle: data.formatStyle });
  if (!input || input.displayName !== data.displayName) return undefined;
  return Object.freeze({ personaId, revision: data.revision, projection: Object.freeze({
    schemaVersion: "persona_presentation_v1", tone: input.tone, responseLength: input.responseLength,
    formatStyle: input.formatStyle }) });
}

export function parseReadNote(data: StoredDocument | undefined, sourceId: string,
  updateTime: unknown, ownerId: string): Extract<ReadNote, { eligibility: "eligible" }> | undefined {
  const projection = data && parseCheckInProjection(data, sourceId);
  const observedVersion = parseReadInstant(updateTime);
  if (!projection || !observedVersion || data?.ownerAccountId !== ownerId || !canonicalNoteInstant(projection.createdAt)) return undefined;
  return Object.freeze({ eligibility: "eligible", sourceId, occurredAt: projection.createdAt,
    ownerId, noteText: projection.note, observedVersion });
}
