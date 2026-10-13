import { normalizeNote } from "../../check-ins/domain/note.js";
import { isPersonaId, isPersonaRevision, isStateRevision } from "../../personas/domain/persona-values.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { PersonaProjection } from "../ports/conversation-lifecycle.js";
import type {
  AcceptedContextRead, ContextDependencies, ContextReadFailure, ContextReadResult,
  FixedStartReadView, FixedViewValue, NoteModelContext, NoteReadCursor,
  ReadAuthority, ReadNotePage, ReadPersonaSet, RealContextReadPort,
} from "../ports/real-context-reader.js";

export type PreparedContextStatus = "idle" | "reading" | "ready" | ContextReadFailure;
interface Holder {
  generation: number;
  usedPersonaId: string | undefined;
  persona: PersonaProjection | undefined;
  notes: { occurredAt: string; noteText: string }[];
  sources: { sourceType: "check_in"; sourceId: string; observedVersion: FullPrecisionInstant }[];
}
const week = 7 * 24 * 60 * 60;
const opaque = (value: unknown): value is string => typeof value === "string" &&
  value.length > 0 && value.isWellFormed() && !value.includes("/");
const uid = (value: unknown): value is string => typeof value === "string" &&
  value.length > 0 && value.isWellFormed() && [...value].length <= 128;
const object = (value: unknown): value is object => typeof value === "object" && value !== null;
const integer = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function instant(value: FullPrecisionInstant): FullPrecisionInstant {
  if (!object(value) || !Number.isSafeInteger(value.seconds) || !integer(value.nanoseconds) || value.nanoseconds >= 1e9) throw new Error("unavailable");
  return Object.freeze({ seconds: value.seconds, nanoseconds: value.nanoseconds });
}
function compare(a: FullPrecisionInstant, b: FullPrecisionInstant): number {
  return a.seconds < b.seconds ? -1 : a.seconds > b.seconds ? 1 :
    a.nanoseconds < b.nanoseconds ? -1 : a.nanoseconds > b.nanoseconds ? 1 : 0;
}
function noteTime(value: string): FullPrecisionInstant {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) throw new Error("unavailable");
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) throw new Error("unavailable");
  const seconds = Math.floor(ms / 1000);
  return { seconds, nanoseconds: (ms - seconds * 1000) * 1e6 };
}
function cursor(value: NoteReadCursor): NoteReadCursor {
  if (!object(value) || !opaque(value.sourceId)) throw new Error("unavailable");
  noteTime(value.occurredAt);
  return Object.freeze({ occurredAt: value.occurredAt, sourceId: value.sourceId });
}
function order(a: NoteReadCursor, b: NoteReadCursor): number {
  return -compare(noteTime(a.occurredAt), noteTime(b.occurredAt)) ||
    (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);
}
function projection(value: PersonaProjection): PersonaProjection {
  if (!object(value) || value.schemaVersion !== "persona_presentation_v1" ||
      !["neutral", "warm", "encouraging"].includes(value.tone) ||
      !["concise", "balanced", "detailed"].includes(value.responseLength) ||
      !["plain", "bulleted"].includes(value.formatStyle)) throw new Error("unavailable");
  return Object.freeze({ schemaVersion: value.schemaVersion, tone: value.tone,
    responseLength: value.responseLength, formatStyle: value.formatStyle });
}

/**
 * Unwired F03 prepared reader. It consumes no user input and issues no effects.
 * prepare/revalidate return non-content status; only the disposable holder owns
 * the copied projection. Callers must release any borrowed projection on their
 * original terminal, and separately authorize actual dispatch/write/delivery.
 */
export class PreparedRealContextReader {
  #status: PreparedContextStatus = "idle";
  #context: AcceptedContextRead | undefined;
  #holder: Holder | undefined;
  #model: NoteModelContext | undefined;
  #dependencies: ContextDependencies | undefined;
  #completion: Promise<PreparedContextStatus> | undefined;
  #resolve: ((status: PreparedContextStatus) => void) | undefined;
  #view: FixedStartReadView | undefined;
  #seenSourceIds = new Set<string>();
  #clock: (() => number) | undefined;
  #guard: (() => boolean) | undefined;
  readonly #abort = () => this.dispose();

  constructor(context: AcceptedContextRead, private readonly port: RealContextReadPort,
    monotonicNow: () => number, originalGuard: () => boolean) {
    this.#clock = monotonicNow; this.#guard = originalGuard;
    try {
      if (!opaque(context.ownerId) || !uid(context.principal.firebaseUid) || !object(context.session) ||
          !object(context.originalRequest) || !Number.isFinite(context.acceptedAt) ||
          !Number.isFinite(context.deadline) || context.deadline !== context.acceptedAt + 60_000) throw new Error("unavailable");
      const asOf = instant(context.asOf);
      if (!Number.isSafeInteger(asOf.seconds - week)) throw new Error("unavailable");
      this.#context = Object.freeze({ principal: Object.freeze({ firebaseUid: context.principal.firebaseUid }),
        ownerId: context.ownerId, session: context.session, originalRequest: context.originalRequest,
        acceptedAt: context.acceptedAt, deadline: context.deadline, asOf, signal: context.signal });
      context.signal.addEventListener("abort", this.#abort, { once: true });
      this.#live();
    } catch { this.#stop("unavailable"); }
  }
  get status(): PreparedContextStatus { this.#live(); return this.#status; }
  dispose(): void { this.#stop("terminated"); }
  /** Borrow only during this original live request; never cache outside it. */
  modelContext(): NoteModelContext | undefined { return this.#live() ? this.#model : undefined; }
  dependencies(): ContextDependencies | undefined { return this.#live() ? this.#dependencies : undefined; }

  prepare(): Promise<PreparedContextStatus> {
    if (!this.#live()) return Promise.resolve(this.#status);
    if (this.#completion) return this.#completion;
    this.#status = "reading";
    this.#completion = new Promise(resolve => { this.#resolve = resolve; });
    void this.#read();
    return this.#completion;
  }
  async revalidate(): Promise<PreparedContextStatus> {
    if (!this.#live() || this.#status !== "ready" || !this.#dependencies) return this.#status;
    try {
      const result = await this.port.readCurrent(this.#context!, this.#dependencies);
      if (!this.#live()) return this.#status;
      const current = this.#result(result);
      if (!current) return this.#status;
      const authority = this.#authority(current.authority, this.#dependencies!.purposeRevocationGeneration);
      if (!authority || !this.#dependencies) return this.#status;
      const expected = this.#dependencies;
      if (authority.purposeRevocationGeneration > expected.purposeRevocationGeneration) return this.#stop("denied");
      if (current.usedPersona !== (expected.usedPersonaId === undefined ? "not-used" : "exists")) {
        return this.#stop(expected.usedPersonaId !== undefined && current.usedPersona === "deleted" ? "denied" : "unavailable");
      }
      if (!Array.isArray(current.sources) || current.sources.length !== expected.sources.length) return this.#stop("unavailable");
      const seen = new Set<string>();
      for (const source of current.sources) {
        if (!source || seen.has(source.sourceId) || !expected.sources.some(s => s.sourceId === source.sourceId)) return this.#stop("unavailable");
        seen.add(source.sourceId);
        if (source.state !== "valid") return this.#stop(source.state === "deleted" ? "denied" : "unavailable");
      }
      return this.#status;
    } catch { return this.#stop("unavailable"); }
  }
  #live(): boolean {
    if (this.#status === "denied" || this.#status === "unavailable" || this.#status === "terminated") return false;
    try {
      const c = this.#context;
      const now = this.#clock?.();
      if (c && !c.signal.aborted && typeof now === "number" && Number.isFinite(now) &&
          now >= c.acceptedAt && now < c.deadline && this.#guard?.() === true) return true;
    } catch { /* A lost original guard is terminal, never a temporary permission. */ }
    this.#stop("terminated");
    return false;
  }
  #stop(failure: ContextReadFailure): PreparedContextStatus {
    if (this.#status !== "denied" && this.#status !== "unavailable" && this.#status !== "terminated") this.#status = failure;
    this.#holder = undefined; this.#model = undefined; this.#dependencies = undefined;
    this.#seenSourceIds.clear();
    const context = this.#context;
    this.#context = undefined; this.#clock = undefined; this.#guard = undefined;
    try { context?.signal.removeEventListener("abort", this.#abort); } catch { /* Invalid signal remains failed closed. */ }
    this.#resolve?.(this.#status); this.#resolve = undefined;
    this.#closeView();
    return this.#status;
  }
  #closeView(): boolean {
    const view = this.#view; this.#view = undefined;
    try { view?.close(); return true; } catch { return false; }
  }
  #result<T>(result: ContextReadResult<T>): T | undefined {
    if (result?.kind === "read" && object(result.value)) return result.value;
    this.#stop(result?.kind === "denied" || result?.kind === "terminated" ? result.kind : "unavailable");
    return undefined;
  }
  #value<T>(result: ContextReadResult<FixedViewValue<T>>, view: FixedStartReadView): T | undefined {
    const envelope = this.#result(result);
    if (!envelope) return undefined;
    if (!object(envelope.value) || envelope.view !== view.identity || compare(instant(envelope.asOf), this.#context!.asOf) !== 0) {
      this.#stop("unavailable"); return undefined;
    }
    return envelope.value;
  }
  #authority(value: ReadAuthority, capturedGeneration?: number): ReadAuthority | undefined {
    if (!value || !opaque(value.ownerId) || typeof value.completed !== "boolean" ||
        value.purpose !== "checkin_conversation" || !["accepted", "rejected"].includes(value.consent) ||
        !integer(value.purposeRevocationGeneration) || !integer(value.settingsRevision)) {
      this.#stop("unavailable"); return undefined;
    }
    if (value.ownerId !== this.#context!.ownerId || !value.completed) {
      this.#stop("denied"); return undefined;
    }
    // A rollback is unavailable even if the current consent says rejected.
    // Corrupt lineage cannot become proof of a legitimate purpose withdrawal.
    if (capturedGeneration !== undefined && value.purposeRevocationGeneration < capturedGeneration) {
      this.#stop("unavailable"); return undefined;
    }
    if (value.consent !== "accepted") {
      this.#stop("denied"); return undefined;
    }
    return value;
  }
  async #read(): Promise<void> {
    try {
      const result = await this.port.openStart(this.#context!);
      // Even late open results must release their I/O handle, without reading content.
      if (result?.kind === "read") this.#view = result.value;
      if (!this.#live()) return;
      const view = this.#result(result);
      if (!view) return;
      if (!object(view.identity) || compare(instant(view.asOf), this.#context!.asOf) !== 0) { this.#stop("unavailable"); return; }
      const authorityResult = await view.readAuthority();
      if (!this.#live()) return;
      const authority = this.#value(authorityResult, view);
      if (!authority) return;
      const valid = this.#authority(authority);
      if (!valid) return;
      this.#holder = { generation: valid.purposeRevocationGeneration, usedPersonaId: undefined,
        persona: undefined, notes: [], sources: [] };
      if (!await this.#personas(view)) return;
      let after: NoteReadCursor | undefined;
      while (this.#live()) {
        const page = await this.#page(view, after);
        if (!page || !this.#live()) return;
        if (page.done) break;
        after = page.next;
      }
      if (!this.#live() || !this.#holder) return;
      if (!this.#closeView()) { this.#stop("unavailable"); return; }
      if (!this.#live() || !this.#holder) return;
      const h = this.#holder;
      this.#model = Object.freeze({ persona: h.persona, checkIns: Object.freeze(h.notes.map(n => Object.freeze(n))) });
      this.#dependencies = Object.freeze({ ownerId: this.#context!.ownerId, purpose: "checkin_conversation",
        purposeRevocationGeneration: h.generation, usedPersonaId: h.usedPersonaId,
        sources: Object.freeze(h.sources.map(s => Object.freeze(s))) });
      this.#holder = undefined;
      this.#seenSourceIds.clear();
      this.#status = "ready";
      this.#resolve?.("ready"); this.#resolve = undefined;
    } catch { this.#stop("unavailable"); }
    finally { if (!this.#closeView()) this.#stop("unavailable"); }
  }
  async #personas(view: FixedStartReadView): Promise<boolean> {
    const result = await view.readPersonas();
    if (!this.#live()) return false;
    const value: ReadPersonaSet | undefined = this.#value(result, view);
    if (!value) return false;
    if (!isStateRevision(value.stateRevision) || !Array.isArray(value.livePersonaIds) || !Array.isArray(value.items) ||
        value.livePersonaIds.length > 5 || value.items.length !== value.livePersonaIds.length) throw new Error("unavailable");
    const ids = value.livePersonaIds;
    if (ids.some((id, i) => !isPersonaId(id) || (i > 0 && ids[i - 1]! >= id)) ||
        (value.activePersonaId !== undefined && !ids.includes(value.activePersonaId))) throw new Error("unavailable");
    const seen = new Set<string>();
    for (const p of value.items) {
      if (!p || !ids.includes(p.personaId) || seen.has(p.personaId) || !isPersonaRevision(p.revision)) throw new Error("unavailable");
      seen.add(p.personaId);
      const copied = projection(p.projection);
      if (p.personaId === value.activePersonaId) {
        this.#holder!.usedPersonaId = p.personaId;
        this.#holder!.persona = copied;
      }
    }
    return true;
  }
  async #page(view: FixedStartReadView, after: NoteReadCursor | undefined): Promise<
    { done: boolean; next: NoteReadCursor | undefined } | undefined> {
    const query = this.#query(after);
    const result = await view.readNotePage(query);
    if (!this.#live()) return undefined;
    const page: ReadNotePage | undefined = this.#value(result, view);
    if (!page) return undefined;
    if (!Array.isArray(page.rows) || page.rows.length > 25) throw new Error("unavailable");
    let previous = after;
    for (const row of page.rows) {
      const tuple = cursor(row);
      if (previous && order(previous, tuple) >= 0) throw new Error("unavailable");
      if (this.#seenSourceIds.has(tuple.sourceId)) throw new Error("unavailable");
      this.#seenSourceIds.add(tuple.sourceId);
      previous = tuple;
      if (row.eligibility === "excluded") continue;
      if (row.eligibility !== "eligible" || row.ownerId !== query.ownerId) throw new Error("unavailable");
      const time = noteTime(row.occurredAt);
      const version = instant(row.observedVersion);
      if (compare(version, query.toInclusive) > 0) throw new Error("unavailable");
      if (typeof row.noteText !== "string" || !row.noteText.isWellFormed()) throw new Error("unavailable");
      const note = normalizeNote(row.noteText);
      if (!note.ok || note.value !== row.noteText) throw new Error("unavailable");
      if (compare(time, query.fromInclusive) < 0 || compare(time, query.toInclusive) > 0) continue;
      const h = this.#holder!;
      if (h.notes.length < 5) {
        h.notes.push({ occurredAt: row.occurredAt, noteText: row.noteText });
        h.sources.push({ sourceType: "check_in", sourceId: row.sourceId, observedVersion: version });
      }
    }
    const next = page.next === undefined ? undefined : cursor(page.next);
    if (next && (page.rows.length === 0 || !previous || order(previous, next) !== 0)) throw new Error("unavailable");
    return { done: this.#holder!.notes.length === 5 || next === undefined, next };
  }
  #query(after: NoteReadCursor | undefined): Parameters<FixedStartReadView["readNotePage"]>[0] {
    const c = this.#context!;
    return Object.freeze({ ownerId: c.ownerId,
      fromInclusive: Object.freeze({ seconds: c.asOf.seconds - week, nanoseconds: c.asOf.nanoseconds }),
      toInclusive: c.asOf, after, limit: 25 });
  }
}
