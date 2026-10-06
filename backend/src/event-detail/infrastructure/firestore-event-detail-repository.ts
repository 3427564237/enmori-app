import { ok, err } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { FirestoreGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection, isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { EventDetail, EventDetailRepository } from "../ports/event-detail-repository.js";
/** Detail's storage boundary retains the approved calendar-exact nanosecond contract. */
function parseEventInstant(value: unknown): bigint | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);
  if (match === null) return undefined;
  const whole = new Date(`${match[1]}Z`);
  if (!Number.isFinite(whole.getTime()) || whole.toISOString().slice(0, 19) !== match[1]) {
    return undefined;
  }
  return BigInt(whole.getTime()) * 1_000_000n + BigInt((match[2] ?? "").padEnd(9, "0"));
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.isWellFormed() && value.trim().length > 0 && [...value].length <= max;
}
export function parseEventDetail(eventId: string, data: StoredDocument, allowedUrls: readonly string[], now: bigint): EventDetail | undefined {
  const fields = ["title", "startAt", "externalSourceUrl", "endAt", "locationLabel", "categoryLabel", "shortDescription", "available", "validUntil"];
  const start = parseEventInstant(data.startAt), until = parseEventInstant(data.validUntil);
  if (!isSafeDocumentId(eventId) || Object.keys(data).some(key => !fields.includes(key)) || data.available !== true || until === undefined || now >= until ||
    !text(data.title, 200) || start === undefined || typeof data.startAt !== "string" || !text(data.externalSourceUrl,2048) || !allowedUrls.includes(data.externalSourceUrl)) return undefined;
  try { const url = new URL(data.externalSourceUrl); if (url.protocol !== "https:" || url.username || url.password || url.hash) return undefined; } catch { return undefined; }
  const result: { eventId: string; title: string; startAt: string; externalSourceUrl: string; endAt?: string; locationLabel?: string; categoryLabel?: string; shortDescription?: string } = {
    eventId, title: data.title, startAt: data.startAt, externalSourceUrl: data.externalSourceUrl };
  if (Object.hasOwn(data,"endAt")) {
    const end = parseEventInstant(data.endAt);
    if (end === undefined || end <= start || typeof data.endAt !== "string") return undefined;
    result.endAt = data.endAt;
  }
  for (const [field, max] of [["locationLabel",200],["categoryLabel",100],["shortDescription",1000]] as const) {
    if (Object.hasOwn(data,field)) { if (!text(data[field],max)) return undefined; result[field] = data[field]; }
  }
  return result;
}
export class FirestoreEventDetailRepository implements EventDetailRepository {
  public constructor(private readonly firestore: FirestoreGateway, private readonly clock: Clock, private readonly allowedUrls: readonly string[]) {}
  public async read(uid: string, eventId: string): ReturnType<EventDetailRepository["read"]> {
    try { return await this.firestore.runTransaction(async tx => {
      const bindingId = createAuthBindingDocumentId(uid); if (bindingId === undefined) return err("dependency_unavailable");
      const binding = await tx.get(`auth_bindings/${bindingId}`); if (binding === undefined) return err("onboarding_required");
      const owner = parseAuthBinding(binding); if (owner === undefined) return err("dependency_unavailable");
      const account = await tx.get(`accounts/${owner}`); if (account === undefined || parseAccountProjection(account) === undefined) return err("dependency_unavailable");
      if (!isSafeDocumentId(eventId)) return err("event_unavailable");
      const now = this.clock.now(); if (!now.ok || !Number.isFinite(now.value.getTime())) return err("dependency_unavailable");
      const data = await tx.get(`event_details/${eventId}`);
      const result = data === undefined ? undefined : parseEventDetail(eventId,data,this.allowedUrls,BigInt(now.value.getTime()) * 1000000n);
      return result === undefined ? err("event_unavailable") : ok(result);
    }); } catch { return err("dependency_unavailable"); }
  }
}
