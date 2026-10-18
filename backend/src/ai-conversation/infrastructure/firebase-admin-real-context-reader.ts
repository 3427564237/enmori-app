import { FieldPath, Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { createAuthBindingDocumentId, isSafeDocumentId, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import { isPersonaId } from "../../personas/domain/persona-values.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { AcceptedContextRead, ContextDependencies, ContextReadResult, CurrentContextAuthority,
  FixedStartReadView, FixedViewValue, ReadAuthority, ReadNotePage, ReadPersonaSet, RealContextReadPort } from "../ports/real-context-reader.js";
import { canonicalNoteInstant, compareInstant, noteQueryInstant, parseReadAuthority, parseReadInstant,
  parseReadNote, parseReadPersona, parseReadPersonaState, validGeneration } from "./real-context-records.js";
import { requireIsolatedContextFirestore } from "./isolated-context-firestore.js";

/** Trusted composition only. This injection is a prerequisite declaration, not proof.
 * The composition owner must verify the references against the exact producer and
 * complete fixture inventory. No current producer supplies these facts, so normal
 * construction omits it. Boolean values/random IDs/absence cannot establish them.
 */
export interface SourceBoundNotePrerequisites {
  readonly firestore: Firestore;
  readonly sourceReferences: readonly string[];
  readonly completeCanonicalUtcInventory: true;
  readonly immutableOwnerNoteAndTime: true;
  readonly permanentDeletion: true;
  readonly noRestoreOrIdReuse: true;
}
export interface OriginalContextAuthority {
  /** Freshly verify the ORIGINAL token instance and session/request, not a new token.
   * No token or credentials are retained by this adapter. This is an observation,
   * never an atomic dispatch/write/sink permit. */
  verify(context: AcceptedContextRead): Promise<ContextReadResult<AuthPrincipal>>;
}
export interface RealContextReaderOptions {
  readonly controlledEnvironment: Readonly<Record<string, string | undefined>>;
  readonly originalAuthority: OriginalContextAuthority;
  readonly monotonicNow: () => number;
  readonly notePrerequisites?: SourceBoundNotePrerequisites;
}
const unavailable = { kind: "unavailable" } as const;
const terminated = { kind: "terminated" } as const;
const denied = { kind: "denied" } as const;
const week = 7 * 24 * 60 * 60;

function live(context: AcceptedContextRead, now: () => number): boolean {
  try { const current = now(); return !context.signal.aborted && Number.isFinite(current) &&
    current >= context.acceptedAt && current < context.deadline; } catch { return false; }
}
function prerequisites(firestore: Firestore, value: SourceBoundNotePrerequisites | undefined): boolean {
  return value?.firestore === firestore && value.completeCanonicalUtcInventory === true &&
    value.immutableOwnerNoteAndTime === true && value.permanentDeletion === true && value.noRestoreOrIdReuse === true &&
    Array.isArray(value.sourceReferences) && value.sourceReferences.length > 0 &&
    value.sourceReferences.every(v => typeof v === "string" && v.length > 0 && v.isWellFormed());
}
function validContext(context: AcceptedContextRead): boolean {
  return !!context && typeof context.principal?.firebaseUid === "string" &&
    createAuthBindingDocumentId(context.principal.firebaseUid) !== undefined &&
    typeof context.ownerId === "string" && isSafeDocumentId(context.ownerId) &&
    typeof context.session === "object" && context.session !== null &&
    typeof context.originalRequest === "object" && context.originalRequest !== null &&
    Number.isFinite(context.acceptedAt) && context.deadline === context.acceptedAt + 60_000 &&
    parseReadInstant(context.asOf) !== undefined;
}
async function guardedGet(firestore: Firestore, transaction: Transaction, path: string,
  context: AcceptedContextRead, now: () => number, fixedAsOf?: FullPrecisionInstant) {
  if (!live(context, now)) throw new Error("terminated");
  const value = await transaction.get(firestore.doc(path));
  if (!live(context, now)) throw new Error("terminated");
  const observedReadTime = parseReadInstant(value.readTime);
  if (fixedAsOf && (!observedReadTime || compareInstant(observedReadTime, fixedAsOf) !== 0)) throw new Error("unavailable");
  return value;
}
async function authority(firestore: Firestore, transaction: Transaction,
  context: AcceptedContextRead, now: () => number, fixedAsOf?: FullPrecisionInstant,
  requireConsent = true): Promise<ContextReadResult<ReadAuthority>> {
  const bindingId = createAuthBindingDocumentId(context.principal.firebaseUid);
  if (!bindingId) return unavailable;
  const binding = await guardedGet(firestore, transaction, `auth_bindings/${bindingId}`, context, now, fixedAsOf);
  if (!binding.exists) return denied;
  const bindingData = binding.data();
  const ownerId = bindingData && parseAuthBinding(bindingData);
  if (!ownerId) return unavailable;
  if (ownerId !== context.ownerId) return denied;
  const account = await guardedGet(firestore, transaction, `accounts/${ownerId}`, context, now, fixedAsOf);
  const value = parseReadAuthority(account.data(), ownerId);
  if (!value) return unavailable;
  return !requireConsent || value.consent === "accepted" ? { kind: "read", value } : denied;
}
async function personas(firestore: Firestore, transaction: Transaction, context: AcceptedContextRead,
  now: () => number, fixedAsOf?: FullPrecisionInstant): Promise<ReadPersonaSet | undefined> {
  const ownerId = context.ownerId;
  const stateSnapshot = await guardedGet(firestore, transaction, `accounts/${ownerId}/persona_state/current`, context, now, fixedAsOf);
  const state = parseReadPersonaState(stateSnapshot.data());
  if (!state) return undefined;
  const items: ReadPersonaSet["items"][number][] = [];
  for (const id of state.livePersonaIds) {
    const item = await guardedGet(firestore, transaction, `accounts/${ownerId}/personas/${id}`, context, now, fixedAsOf);
    const parsed = parseReadPersona(item.data(), id);
    if (!parsed) return undefined;
    items.push(parsed);
  }
  return Object.freeze({ ...state, items: Object.freeze(items) });
}

/** Owns one read-only SDK transaction until close. No completed content cache. */
class FixedFirebaseStartView implements FixedStartReadView {
  readonly identity = Object.freeze({});
  readonly asOf: FullPrecisionInstant;
  #closed = false;
  #authorized = false;
  #failure: "unavailable" | "terminated" | "denied" | undefined;
  #pending: Promise<unknown> = Promise.resolve();
  #release!: () => void;
  readonly released = new Promise<void>(resolve => { this.#release = resolve; });
  #timer: ReturnType<typeof setTimeout> | undefined;
  #context: AcceptedContextRead | undefined;
  #firestore: Firestore | undefined;
  #transaction: Transaction | undefined;
  #options: RealContextReaderOptions | undefined;
  readonly #abort = () => this.stop("terminated");

  constructor(firestore: Firestore, transaction: Transaction, context: AcceptedContextRead, options: RealContextReaderOptions) {
    this.#firestore = firestore; this.#transaction = transaction; this.#context = context; this.#options = options;
    this.asOf = Object.freeze({ ...context.asOf });
    context.signal.addEventListener("abort", this.#abort, { once: true });
    this.#timer = setTimeout(this.#abort, Math.max(0, context.deadline - options.monotonicNow()));
    this.#timer.unref();
  }
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#context?.signal.removeEventListener("abort", this.#abort);
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = undefined; this.#authorized = false;
    this.#context = undefined; this.#firestore = undefined; this.#transaction = undefined; this.#options = undefined;
    this.#release();
  }
  stop(failure: "unavailable" | "terminated" | "denied"): void {
    this.#failure ??= failure; this.close();
  }
  async settled(): Promise<void> { await this.#pending; }
  #read<T>(work: (firestore: Firestore, transaction: Transaction, context: AcceptedContextRead,
    options: RealContextReaderOptions) => Promise<ContextReadResult<T>>): Promise<ContextReadResult<FixedViewValue<T>>> {
    const task = this.#pending.then(async (): Promise<ContextReadResult<FixedViewValue<T>>> => {
      if (this.#closed || !this.#context || !this.#options || !this.#firestore || !this.#transaction)
        return { kind: this.#failure ?? "terminated" };
      if (!live(this.#context, this.#options.monotonicNow)) { this.stop("terminated"); return terminated; }
      try {
        const value = await work(this.#firestore, this.#transaction, this.#context, this.#options);
        if (this.#closed || !this.#context || !this.#options || !live(this.#context, this.#options.monotonicNow)) {
          this.stop("terminated"); return { kind: this.#failure ?? "terminated" };
        }
        if (value.kind !== "read") { this.stop(value.kind); return value; }
        return { kind: "read", value: Object.freeze({ view: this.identity, asOf: this.asOf, value: value.value }) };
      } catch {
        if (!this.#context || !this.#options || !live(this.#context, this.#options.monotonicNow)) {
          this.stop("terminated"); return { kind: this.#failure ?? "terminated" };
        }
        this.stop("unavailable"); return unavailable;
      }
    });
    this.#pending = task.then(() => undefined);
    return task;
  }
  readAuthority(): Promise<ContextReadResult<FixedViewValue<ReadAuthority>>> {
    return this.#read(async (db, tx, context, options) => {
      const result = await authority(db, tx, context, options.monotonicNow, this.asOf);
      this.#authorized = result.kind === "read";
      return result;
    });
  }
  readPersonas(): Promise<ContextReadResult<FixedViewValue<ReadPersonaSet>>> {
    return this.#read(async (db, tx, context, options) => {
      if (!this.#authorized) return unavailable;
      const value = await personas(db, tx, context, options.monotonicNow, this.asOf);
      return value ? { kind: "read", value } : unavailable;
    });
  }
  readNotePage(query: Parameters<FixedStartReadView["readNotePage"]>[0]): Promise<ContextReadResult<FixedViewValue<ReadNotePage>>> {
    return this.#read(async (db, tx, context, options) => {
      if (!this.#authorized || !prerequisites(db, options.notePrerequisites) || query.ownerId !== context.ownerId || query.limit !== 25)
        return unavailable;
      const from = parseReadInstant(query.fromInclusive), to = parseReadInstant(query.toInclusive);
      if (!from || !to || compareInstant(to, context.asOf) !== 0 ||
          from.seconds !== to.seconds - week || from.nanoseconds !== to.nanoseconds) return unavailable;
      const fromUtc = noteQueryInstant(from), toUtc = noteQueryInstant(to);
      if (!fromUtc || !toUtc || (query.after !== undefined &&
          (!canonicalNoteInstant(query.after.occurredAt) || !isSafeDocumentId(query.after.sourceId) ||
            query.after.occurredAt < fromUtc || query.after.occurredAt > toUtc))) return unavailable;
      let sdkQuery = db.collection("check_ins").where("ownerAccountId", "==", context.ownerId)
        .where("createdAt", ">=", fromUtc).where("createdAt", "<=", toUtc)
        .orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "asc").limit(25);
      if (query.after) sdkQuery = sdkQuery.startAfter(query.after.occurredAt, query.after.sourceId);
      const snapshot = await tx.get(sdkQuery);
      const queryReadTime = parseReadInstant(snapshot.readTime);
      if (!queryReadTime || compareInstant(queryReadTime, this.asOf) !== 0 || snapshot.docs.length > 25) return unavailable;
      const rows: ReadNotePage["rows"][number][] = [];
      let previous = query.after;
      for (const doc of snapshot.docs) {
        const row = parseReadNote(doc.data(), doc.id, doc.updateTime, context.ownerId);
        const rowReadTime = parseReadInstant(doc.readTime);
        if (!row || !rowReadTime || compareInstant(rowReadTime, this.asOf) !== 0 || compareInstant(row.observedVersion, this.asOf) > 0 ||
            row.occurredAt < fromUtc || row.occurredAt > toUtc ||
            (previous && (row.occurredAt > previous.occurredAt ||
              (row.occurredAt === previous.occurredAt && row.sourceId <= previous.sourceId)))) return unavailable;
        rows.push(row); previous = row;
      }
      const last = rows.at(-1);
      return { kind: "read", value: Object.freeze({ rows: Object.freeze(rows),
        next: rows.length === 25 && last ? Object.freeze({ occurredAt: last.occurredAt, sourceId: last.sourceId }) : undefined }) };
    });
  }
}

/** Selected F03 Infrastructure component; deliberately absent from Bootstrap. */
export class FirebaseAdminRealContextReader implements RealContextReadPort {
  constructor(private readonly firestore: Firestore, private readonly options: RealContextReaderOptions) {
    requireIsolatedContextFirestore(firestore, options.controlledEnvironment);
  }

  async #original(context: AcceptedContextRead): Promise<ContextReadResult<AuthPrincipal>> {
    if (!validContext(context)) return unavailable;
    if (!live(context, this.options.monotonicNow)) return terminated;
    try {
      const value = await this.options.originalAuthority.verify(context);
      if (!live(context, this.options.monotonicNow)) return terminated;
      if (value.kind !== "read") return value;
      return value.value.firebaseUid === context.principal.firebaseUid ? value : denied;
    } catch { return unavailable; }
  }
  async openStart(context: AcceptedContextRead): Promise<ContextReadResult<FixedStartReadView>> {
    const original = await this.#original(context);
    if (original.kind !== "read") return original;
    let view: FixedFirebaseStartView | undefined;
    let deliver!: (value: ContextReadResult<FixedStartReadView>) => void;
    const opened = new Promise<ContextReadResult<FixedStartReadView>>(resolve => { deliver = resolve; });
    try {
      const asOf = new Timestamp(context.asOf.seconds, context.asOf.nanoseconds);
      void this.firestore.runTransaction(async tx => {
        if (!live(context, this.options.monotonicNow)) { deliver(terminated); return; }
        view = new FixedFirebaseStartView(this.firestore, tx, context, this.options);
        deliver({ kind: "read", value: view });
        await view.released;
        await view.settled();
      }, { readOnly: true, readTime: asOf }).catch(() => { view?.stop("unavailable"); deliver(unavailable); });
    } catch { deliver(unavailable); }
    return opened;
  }
  async readCurrent(context: AcceptedContextRead, dependencies: ContextDependencies): Promise<ContextReadResult<CurrentContextAuthority>> {
    const original = await this.#original(context);
    if (original.kind !== "read") return original;
    if (dependencies.ownerId !== context.ownerId || dependencies.purpose !== "checkin_conversation" ||
        !validGeneration(dependencies.purposeRevocationGeneration) ||
        (dependencies.usedPersonaId !== undefined && !isPersonaId(dependencies.usedPersonaId)) ||
        !Array.isArray(dependencies.sources) || dependencies.sources.length > 15 ||
        new Set(dependencies.sources.map(s => s.sourceId)).size !== dependencies.sources.length ||
        dependencies.sources.some(s => s.sourceType !== "check_in" || !isSafeDocumentId(s.sourceId) || !parseReadInstant(s.observedVersion)) ||
        (dependencies.sources.length > 0 && !prerequisites(this.firestore, this.options.notePrerequisites))) return unavailable;
    try {
      const result = await this.firestore.runTransaction(async (tx: Transaction): Promise<ContextReadResult<CurrentContextAuthority>> => {
        const current = await authority(this.firestore, tx, context, this.options.monotonicNow, undefined, false);
        if (current.kind !== "read") return current;
        if (current.value.purposeRevocationGeneration < dependencies.purposeRevocationGeneration) return unavailable;
        if (current.value.consent !== "accepted") return denied;
        if (current.value.purposeRevocationGeneration > dependencies.purposeRevocationGeneration) return denied;
        let usedPersona: CurrentContextAuthority["usedPersona"] = "not-used";
        if (dependencies.usedPersonaId !== undefined) {
          const set = await personas(this.firestore, tx, context, this.options.monotonicNow);
          if (!set) return unavailable;
          if (set.livePersonaIds.includes(dependencies.usedPersonaId)) usedPersona = "exists";
          else {
            const outside = await guardedGet(this.firestore, tx, `accounts/${context.ownerId}/personas/${dependencies.usedPersonaId}`,
              context, this.options.monotonicNow);
            if (outside.exists) return unavailable;
            usedPersona = "deleted";
          }
        }
        const sources: CurrentContextAuthority["sources"][number][] = [];
        for (const source of dependencies.sources) {
          const snapshot = await guardedGet(this.firestore, tx, `check_ins/${source.sourceId}`, context, this.options.monotonicNow);
          if (!snapshot.exists) { sources.push({ sourceId: source.sourceId, state: "deleted" }); continue; }
          const parsed = parseReadNote(snapshot.data(), source.sourceId, snapshot.updateTime, context.ownerId);
          if (!parsed || compareInstant(parsed.observedVersion, source.observedVersion) < 0) return unavailable;
          sources.push({ sourceId: source.sourceId, state: "valid" });
        }
        return { kind: "read", value: Object.freeze({ authority: current.value, usedPersona,
          sources: Object.freeze(sources.map(s => Object.freeze(s))) }) };
      }, { readOnly: true });
      return live(context, this.options.monotonicNow) ? result : terminated;
    } catch { return live(context, this.options.monotonicNow) ? unavailable : terminated; }
  }
}
