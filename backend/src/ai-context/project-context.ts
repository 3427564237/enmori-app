import { copyPersonaProjection } from "../ai-conversation/application/persona-expression.js";
import { validEventId } from "../event-participation/domain/participation-values.js";
import type { ContextAuthority, ContextCategory, ContextModelProjection, ContextPreparation, ContextRead,
  ContextRecord, ContextRequest, ContextScope, PreparedContext, SourceDependency, SourceRef,
  SourceNavigation, TrustedSourceCard } from "./context-contract.js";

const week = 7 * 86_400_000;
/** Prototype resource bounds, not adopted product defaults. Check-in/history
 * retain existing 5-in-7-days / two-pair limits; new source limits are Proposed. */
const limits = { check_in: 5, event_intent: 3, location_snapshot: 1, persona: 1, history_pair: 2 } as const;
const categories = { check_in: "check_ins", event_intent: "event_intents", location_snapshot: "location",
  persona: "persona", history_pair: "conversation_history" } as const;
const key = (value: { readonly kind: string; readonly id: string }) => JSON.stringify([value.kind, value.id]);
const opaque = (value: unknown): value is string => typeof value === "string" && value.length > 0 &&
  value.length <= 256 && value.isWellFormed() && !/[\p{Cc}\p{Cf}]/u.test(value);
const text = (value: unknown): value is string => typeof value === "string" && value.isWellFormed();
/** Trusted adapters normalize absolute instants; ambiguous/noncanonical dates
 * cannot be repaired into a different historical/current time here. */
export function contextInstant(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : undefined;
}
export function sameContextScope(a: ContextScope, b: ContextScope): boolean {
  return a.ownerId === b.ownerId && a.session === b.session && a.conversationId === b.conversationId &&
    a.purpose === b.purpose && a.target === b.target;
}
export function currentContextAuthority(authority: ContextAuthority, scope: ContextScope, now: string): boolean {
  const at = contextInstant(now), until = contextInstant(authority.validUntil);
  return opaque(scope.ownerId) && typeof scope.session === "object" && scope.session !== null && opaque(scope.conversationId) &&
    ["reply", "proactive"].includes(scope.purpose) && ["local", "cloud"].includes(scope.target) &&
    sameContextScope(authority.scope, scope) && authority.consent === "accepted" && opaque(authority.version) &&
    authority.observedAt === now && at !== undefined && until !== undefined && until > at;
}
export function validContextSourceRef(ref: SourceRef): boolean {
  return ["check_in", "participation", "event", "persona", "history_pair"].includes(ref.kind) && opaque(ref.id) && opaque(ref.version) &&
    !ref.id.includes("/") && ![".", ".."].includes(ref.id) && !/^__.*__$/u.test(ref.id) &&
    ((ref.kind !== "event" && ref.kind !== "participation") || validEventId(ref.id));
}
function copyRef(ref: SourceRef): SourceRef { return { kind: ref.kind, id: ref.id, version: ref.version }; }
function freezeProjection<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freezeProjection(item);
    Object.freeze(value);
  }
  return value;
}
function timeOf(record: ContextRecord): number {
  return record.kind === "persona" ? 0 : contextInstant(record.kind === "event_intent" ? record.statusUpdatedAt : record.occurredAt) ?? NaN;
}
function category(record: ContextRecord): ContextCategory { return categories[record.kind]; }

/** Pure, explicit allowlist projection over already-authorized trusted reader
 * output. It cannot prove identity/consent, fetch data, cache content or grant
 * an effect. Never register it in production before the Proposed contracts close. */
export function projectContext(request: ContextRequest, read: ContextRead): ContextPreparation {
  if (read.kind !== "read") return { kind: read.kind };
  const now = contextInstant(request.asOf);
  if (now === undefined || !text(request.currentMessage) || !currentContextAuthority(read.authority, request.scope, request.asOf))
    return { kind: "denied" };
  const excluded = new Set(request.excluded.map(key));
  const attached = new Set(request.attached.map(key));
  const selected = new Map([...request.relevant, ...request.attached].map(s => [key(s), s]));
  const available = new Map<string, ContextRecord>();
  for (const record of read.records) {
    const id = key({ kind: record.kind, id: record.source.id });
    if (available.has(id)) return { kind: "unavailable" };
    available.set(id, record);
  }
  const omitted: PreparedContext["omitted"][number][] = [], records: ContextRecord[] = [];
  for (const [id, selector] of selected) {
    if (excluded.has(id)) { omitted.push({ selector: { ...selector }, reason: "excluded" }); continue; }
    const record = available.get(id);
    if (!record) return { kind: "unavailable" };
    if (record.ownerId !== request.scope.ownerId || !read.authority.allowedCategories.includes(category(record))) return { kind: "denied" };
    if (!validContextSourceRef(record.source) || record.observedAt !== request.asOf) return { kind: "unavailable" };
    const at = timeOf(record);
    if (!Number.isFinite(at) || at > now) return { kind: "unavailable" };
    if (record.kind === "history_pair" && record.conversationId !== request.scope.conversationId) return { kind: "denied" };
    if ((record.kind === "check_in" || record.kind === "location_snapshot") && at < now - week) {
      if (attached.has(id)) return { kind: "invalid_selection" };
      omitted.push({ selector: { ...selector }, reason: "out_of_window" }); continue;
    }
    records.push(record);
  }
  records.sort((a, b) => {
    // Group first so mixing sequence order (history) and timestamp order
    // (business records) cannot make the comparator non-transitive.
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    if (a.kind === "history_pair" && b.kind === "history_pair") return b.assistantSequence - a.assistantSequence;
    return timeOf(b) - timeOf(a) || (a.source.id < b.source.id ? -1 : a.source.id > b.source.id ? 1 : 0);
  });
  const counts = new Map<string, number>();
  const kept: ContextRecord[] = [];
  for (const record of records) {
    const count = counts.get(record.kind) ?? 0;
    if (count >= limits[record.kind]) {
      const selector = { kind: record.kind, id: record.source.id };
      if (attached.has(key(selector))) return { kind: "invalid_selection" };
      omitted.push({ selector, reason: "limit" }); continue;
    }
    counts.set(record.kind, count + 1); kept.push(record);
  }
  const historyRecords = kept.filter(record => record.kind === "history_pair").sort((a, b) => a.assistantSequence - b.assistantSequence);
  if (new Set(historyRecords.flatMap(record => [record.userSequence, record.assistantSequence])).size !== historyRecords.length * 2)
    return { kind: "unavailable" };
  const historyTurns = new Map(historyRecords.map((record, i) => [record.source.id, i + 1]));
  const checkIns: ContextModelProjection["facts"]["checkIns"][number][] = [];
  const eventIntents: ContextModelProjection["facts"]["eventIntents"][number][] = [];
  const locationSnapshots: ContextModelProjection["facts"]["locationSnapshots"][number][] = [];
  const userQuotes: ContextModelProjection["userQuotes"][number][] = [];
  const assistantSuggestions: ContextModelProjection["assistantSuggestions"][number][] = [];
  const dependencies = new Map<string, SourceDependency>(), sources = new Map<string, TrustedSourceCard>();
  const usedCategories = new Set<ContextCategory>();
  let persona: ContextModelProjection["persona"];
  function dependency(ref: SourceRef, observedAt: string, validUntil?: string): boolean {
    const until = validUntil === undefined ? undefined : contextInstant(validUntil);
    if (!validContextSourceRef(ref) || observedAt !== request.asOf || (validUntil !== undefined && (until === undefined || until <= now!))) return false;
    const id = key(ref), previous = dependencies.get(id);
    if (previous && (previous.version !== ref.version || previous.validUntil !== validUntil)) return false;
    dependencies.set(id, { ...copyRef(ref), observedAt, ...(validUntil === undefined ? {} : { validUntil }) });
    return true;
  }
  function card(ref: SourceRef, occurredAt: string, navigation: SourceNavigation): void {
    sources.set(key(ref), { ref: copyRef(ref), occurredAt, observedAt: request.asOf, navigation });
  }
  for (const record of kept) {
    if (!dependency(record.source, record.observedAt, record.kind === "event_intent" ? record.validUntil : undefined)) return { kind: "unavailable" };
    usedCategories.add(category(record));
    if (record.kind === "check_in") {
      if (record.source.kind !== "check_in" || ![record.noteText, record.moodLabel, record.activityLabel].every(v => v === undefined || text(v))) return { kind: "unavailable" };
      checkIns.push({ occurredAt: record.occurredAt, ...(record.moodLabel === undefined ? {} : { moodLabel: record.moodLabel }),
        ...(record.activityLabel === undefined ? {} : { activityLabel: record.activityLabel }) });
      if (record.noteText !== undefined) userQuotes.push({ occurredAt: record.occurredAt, text: record.noteText, origin: "check_in" });
      card(record.source, record.occurredAt, { kind: "check_in", checkInId: record.source.id });
    } else if (record.kind === "event_intent") {
      const event = record.event, start = contextInstant(event.startAt), end = event.endAt === undefined ? undefined : contextInstant(event.endAt);
      if (record.source.kind !== "event" || record.participation.kind !== "participation" || record.participation.id !== record.source.id ||
          !dependency(record.participation, record.observedAt) || !text(event.title) || !event.title.trim() ||
          (event.locationLabel !== undefined && !text(event.locationLabel)) || start === undefined ||
          (event.endAt !== undefined && (end === undefined || end < start))) return { kind: "unavailable" };
      if (record.status === "none" || event.availability === "cancelled") return { kind: "denied" };
      if (event.availability !== "scheduled" || !["interested", "going"].includes(record.status) || start <= now) return { kind: "unavailable" };
      eventIntents.push({ status: record.status, statusUpdatedAt: record.statusUpdatedAt, title: event.title, startAt: event.startAt,
        ...(event.endAt === undefined ? {} : { endAt: event.endAt }), ...(event.locationLabel === undefined ? {} : { locationLabel: event.locationLabel }), observedAt: record.observedAt });
      card(record.source, event.startAt, { kind: "event", eventId: record.source.id });
    } else if (record.kind === "location_snapshot") {
      if (record.source.kind !== "check_in" || !text(record.label) || !record.label.trim()) return { kind: "unavailable" };
      locationSnapshots.push({ occurredAt: record.occurredAt, label: record.label });
      card(record.source, record.occurredAt, { kind: "check_in", checkInId: record.source.id });
    } else if (record.kind === "persona") {
      persona = copyPersonaProjection(record.presentation);
      if (record.source.kind !== "persona" || !persona) return { kind: "unavailable" };
    } else {
      if (record.source.kind !== "history_pair" || !Number.isSafeInteger(record.userSequence) || record.userSequence < 1 ||
          !Number.isSafeInteger(record.assistantSequence) || record.assistantSequence <= record.userSequence ||
          !text(record.userQuote) || !text(record.assistantSuggestion)) return { kind: "unavailable" };
      if (!Array.isArray(record.requiredCategories)) return { kind: "unavailable" };
      for (const required of record.requiredCategories) {
        if (!["check_ins", "event_intents", "location", "persona", "conversation_history"].includes(required)) return { kind: "unavailable" };
        if (!read.authority.allowedCategories.includes(required)) return { kind: "denied" };
        usedCategories.add(required);
      }
      for (const ref of record.requiredSources) {
        const compatible: readonly ContextCategory[] = ref.kind === "check_in" ? ["check_ins", "location"] :
          ref.kind === "event" || ref.kind === "participation" ? ["event_intents"] : ref.kind === "persona" ? ["persona"] : ["conversation_history"];
        if (!compatible.some(c => record.requiredCategories.includes(c))) return { kind: "unavailable" };
        if (!dependency(ref, ref.observedAt, ref.validUntil)) return { kind: "unavailable" };
      }
      const historyTurn = historyTurns.get(record.source.id)!;
      userQuotes.push({ occurredAt: record.occurredAt, text: record.userQuote, origin: "conversation", historyTurn });
      assistantSuggestions.push({ occurredAt: record.occurredAt, text: record.assistantSuggestion, historyTurn });
    }
  }
  userQuotes.sort((a, b) => {
    if (a.origin !== b.origin) return a.origin < b.origin ? -1 : 1;
    return a.origin === "conversation" ? a.historyTurn! - b.historyTurn! : a.occurredAt.localeCompare(b.occurredAt);
  });
  assistantSuggestions.sort((a, b) => a.historyTurn - b.historyTurn);
  return { kind: "prepared", value: Object.freeze({ scope: Object.freeze({ ownerId: request.scope.ownerId, session: request.scope.session,
    conversationId: request.scope.conversationId, purpose: request.scope.purpose, target: request.scope.target }), authorityVersion: read.authority.version,
    categories: freezeProjection([...usedCategories]),
    model: freezeProjection({ asOf: request.asOf, currentMessage: request.currentMessage, facts: { checkIns, eventIntents, locationSnapshots },
      userQuotes, assistantSuggestions, ...(persona === undefined ? {} : { persona }) }),
    dependencies: freezeProjection([...dependencies.values()]), sources: freezeProjection([...sources.values()]), omitted: freezeProjection(omitted) }) };
}

/** Resolve only current trusted cards in this owner/session/topic scope. Matching
 * proves a permitted navigation target, not entailment of an AI sentence. The
 * caller must revalidate before display/tap; no function here grants a read. */
export function trustedSourceNavigation(context: PreparedContext, scope: ContextScope, ref: SourceRef): SourceNavigation | undefined {
  if (!sameContextScope(context.scope, scope)) return undefined;
  const source = context.sources.find(s => s.ref.kind === ref.kind && s.ref.id === ref.id && s.ref.version === ref.version);
  return source ? Object.freeze({ ...source.navigation }) : undefined;
}
