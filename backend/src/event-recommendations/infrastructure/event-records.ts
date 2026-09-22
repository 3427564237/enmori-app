import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import type { EventRecommendationSources, InterestMatchingProjection } from
  "../ports/event-recommendation-repository.js";

/** S-PM-0915-S2EVENT-MAPPING: calendar-exact Z instant, at most nine digits. */
export function parseEventInstant(value: unknown): bigint | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);
  if (match === null) return undefined;
  const whole = new Date(`${match[1]}Z`);
  if (!Number.isFinite(whole.getTime()) || whole.toISOString().slice(0, 19) !== match[1]) {
    return undefined;
  }
  return BigInt(whole.getTime()) * 1_000_000n + BigInt((match[2] ?? "").padEnd(9, "0"));
}

function onlyFields(data: StoredDocument, fields: readonly string[]): boolean {
  return Object.keys(data).every((field) => fields.includes(field));
}

function validIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id: unknown) =>
    typeof id === "string" && isSafeDocumentId(id));
}

export function parseSelectedInterests(data: StoredDocument): readonly string[] | undefined {
  const { interestTagIds, revision } = data;
  if (!onlyFields(data, ["interestTagIds", "revision"]) || !validIds(interestTagIds) ||
      interestTagIds.length > 10 || new Set(interestTagIds).size !== interestTagIds.length ||
      !Number.isSafeInteger(revision) || (revision as number) < 1) return undefined;
  return [...interestTagIds];
}

export function parseMatchingInterest(id: string, data: StoredDocument): InterestMatchingProjection | undefined {
  const { displayName, lifecycleState, revision } = data;
  if (!isSafeDocumentId(id) || !onlyFields(data, ["displayName", "lifecycleState", "revision"]) ||
      typeof displayName !== "string" || !displayName.isWellFormed() ||
      displayName.normalize("NFC") !== displayName || displayName.trim() !== displayName ||
      [...displayName].length < 1 || [...displayName].length > 50 ||
      /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(displayName) ||
      (lifecycleState !== "active" && lifecycleState !== "inactive") ||
      !Number.isSafeInteger(revision) || (revision as number) < 1) return undefined;
  return { interestTagId: id, displayName, lifecycleState };
}

export function parseRecommendationEvent(id: string, data: StoredDocument):
  EventRecommendationSources["events"][number] | undefined {
  const { title, active, published, startAt, endAt, interestTagIds } = data;
  const startInstant = parseEventInstant(startAt);
  const endInstant = parseEventInstant(endAt);
  if (!isSafeDocumentId(id) || !onlyFields(data,
      ["title", "active", "published", "startAt", "endAt", "interestTagIds"]) ||
      typeof title !== "string" || title.length === 0 || !title.isWellFormed() ||
      typeof active !== "boolean" || typeof published !== "boolean" ||
      typeof startAt !== "string" || typeof endAt !== "string" ||
      startInstant === undefined || endInstant === undefined || endInstant <= startInstant ||
      !validIds(interestTagIds)) return undefined;
  return {
    scoring: { eventId: id, active, published, startInstant, interestTagIds: [...interestTagIds] },
    presentation: { title, startAt, endAt },
  };
}
