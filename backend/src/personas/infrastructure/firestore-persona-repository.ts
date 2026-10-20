import { createHash } from "node:crypto";
import { err, ok } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAccountProjection, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { PersonaCreate, PersonaCreateResult, PersonaEdit, PersonaPreconditions, PersonaRead, PersonaSet, PersonaView } from "../application/persona-model.js";
import { isPersonaCreateKey, isPersonaId, isPersonaRevision, isStateRevision, normalizePersonaInput, personaExpressionFields, samePersonaInput } from "../domain/persona-values.js";
import type { PersonaRepository, PersonaResult } from "../ports/persona-repository.js";

interface OwnerState {
  readonly livePersonaIds: readonly string[];
  readonly stateRevision: number;
  readonly activePersonaId?: string;
}

interface Snapshot {
  readonly accountId: string;
  readonly state: OwnerState;
  readonly members: ReadonlyMap<string, PersonaView>;
  readonly addressedId?: string;
}

const statePath = (accountId: string): string => `accounts/${accountId}/persona_state/current`;
const personaPath = (accountId: string, personaId: string): string => `accounts/${accountId}/personas/${personaId}`;
const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** This tuple defines the approved command identity; neither the key nor a receipt is stored. */
export function derivePersonaId(accountId: string, expectedStateRevision: number, canonicalKey: string): string {
  return createHash("sha256").update(JSON.stringify([
    "persona_create_v1", accountId, expectedStateRevision, canonicalKey,
  ]), "utf8").digest("hex");
}

function hasExactKeys(data: StoredDocument, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every(key => Object.hasOwn(data, key)) && Object.keys(data).every(key => required.includes(key) || optional.includes(key));
}

function isPersonaInstant(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) && instant.toISOString() === value;
}

function parseState(data: StoredDocument | undefined): OwnerState | undefined {
  if (data === undefined || !hasExactKeys(data, ["livePersonaIds", "stateRevision"], ["activePersonaId"]) ||
    !isStateRevision(data.stateRevision) || !Array.isArray(data.livePersonaIds) || data.livePersonaIds.length > 5 ||
    !data.livePersonaIds.every(isPersonaId)) return undefined;
  const ids = data.livePersonaIds as string[];
  if (ids.some((id, index) => index > 0 && ordinal(ids[index - 1]!, id) >= 0)) return undefined;
  if (Object.hasOwn(data, "activePersonaId") && (!isPersonaId(data.activePersonaId) || !ids.includes(data.activePersonaId))) return undefined;
  return { livePersonaIds: [...ids], stateRevision: data.stateRevision,
    ...(typeof data.activePersonaId === "string" ? { activePersonaId: data.activePersonaId } : {}) };
}

function parsePersona(data: StoredDocument | undefined, personaId: string): PersonaView | undefined {
  if (data === undefined || !hasExactKeys(data, ["displayName", "tone", "responseLength", "formatStyle", "createdAt", "updatedAt", "revision"], personaExpressionFields) ||
    !isPersonaRevision(data.revision) || !isPersonaInstant(data.createdAt) || !isPersonaInstant(data.updatedAt)) return undefined;
  const fields = normalizePersonaInput(data);
  if (fields === undefined || fields.displayName !== data.displayName) return undefined;
  return { personaId, ...fields, createdAt: data.createdAt, updatedAt: data.updatedAt, revision: data.revision };
}

function setView(snapshot: Snapshot, state: OwnerState = snapshot.state): PersonaSet {
  const items = [...snapshot.members.values()].sort((a, b) => ordinal(a.createdAt, b.createdAt) || ordinal(a.personaId, b.personaId));
  return { items, stateRevision: state.stateRevision,
    ...(state.activePersonaId === undefined ? {} : { activePersonaId: state.activePersonaId }) };
}

function storedPersona(view: PersonaView): StoredDocument {
  return { displayName: view.displayName, tone: view.tone, responseLength: view.responseLength, formatStyle: view.formatStyle,
    ...Object.fromEntries(personaExpressionFields.map(field => [field, view[field] ?? ""])),
    createdAt: view.createdAt, updatedAt: view.updatedAt, revision: view.revision };
}

function validPreconditions(input: PersonaPreconditions): boolean {
  return isPersonaId(input.personaId) && isPersonaRevision(input.expectedRevision) && isStateRevision(input.expectedStateRevision);
}

function matches(snapshot: Snapshot, target: PersonaView, input: PersonaPreconditions): boolean {
  return snapshot.state.stateRevision === input.expectedStateRevision && target.revision === input.expectedRevision;
}

export class FirestorePersonaRepository implements PersonaRepository {
  public constructor(private readonly firestore: FirestoreGateway, private readonly clock: Clock) {}

  /** Resolve current identity before any Persona access. No read path initializes or repairs storage. */
  private async snapshot(transaction: FirestoreTransactionGateway, firebaseUid: string,
    address?: (accountId: string) => string): Promise<PersonaResult<Snapshot>> {
    const bindingId = createAuthBindingDocumentId(firebaseUid);
    if (bindingId === undefined) return err("dependency_unavailable");
    const binding = await transaction.get(`auth_bindings/${bindingId}`);
    if (binding === undefined) return err("onboarding_required");
    const accountId = parseAuthBinding(binding);
    if (accountId === undefined) return err("dependency_unavailable");
    const account = await transaction.get(`accounts/${accountId}`);
    if (account === undefined || parseAccountProjection(account) === undefined) return err("dependency_unavailable");
    const state = parseState(await transaction.get(statePath(accountId)));
    if (state === undefined) return err("dependency_unavailable");
    const members = new Map<string, PersonaView>();
    for (const id of state.livePersonaIds) {
      const member = parsePersona(await transaction.get(personaPath(accountId, id)), id);
      if (member === undefined) return err("dependency_unavailable");
      members.set(id, member);
    }
    const addressedId = address?.(accountId);
    // Encountered rows outside the state membership are corruption, including stale/full create attempts.
    if (addressedId !== undefined && !members.has(addressedId) &&
      await transaction.get(personaPath(accountId, addressedId)) !== undefined) return err("dependency_unavailable");
    return ok({ accountId, state, members, ...(addressedId === undefined ? {} : { addressedId }) });
  }

  private async transaction<T>(work: (transaction: FirestoreTransactionGateway) => Promise<PersonaResult<T>>): Promise<PersonaResult<T>> {
    try { return await this.firestore.runTransaction(work); }
    catch { return err("dependency_unavailable"); }
  }

  private now(): string | undefined {
    const result = this.clock.now();
    if (!result.ok || !Number.isFinite(result.value.getTime())) return undefined;
    const instant = result.value.toISOString();
    return isPersonaInstant(instant) ? instant : undefined;
  }

  public list(firebaseUid: string): Promise<PersonaResult<PersonaSet>> {
    return this.transaction(async transaction => {
      const snapshot = await this.snapshot(transaction, firebaseUid);
      return snapshot.ok ? ok(setView(snapshot.value)) : snapshot;
    });
  }

  public get(firebaseUid: string, personaId: string): Promise<PersonaResult<PersonaRead>> {
    return this.transaction(async transaction => {
      if (!isPersonaId(personaId)) return err("dependency_unavailable");
      const result = await this.snapshot(transaction, firebaseUid, () => personaId);
      if (!result.ok) return result;
      const persona = result.value.members.get(personaId);
      return persona === undefined ? err("unavailable") : ok({ persona, stateRevision: result.value.state.stateRevision });
    });
  }

  public create(firebaseUid: string, input: PersonaCreate): Promise<PersonaResult<PersonaCreateResult>> {
    return this.transaction<PersonaCreateResult>(async transaction => {
      const fields = normalizePersonaInput(input);
      if (fields === undefined || !samePersonaInput(input, fields) || !isStateRevision(input.expectedStateRevision) ||
        !isPersonaCreateKey(input.idempotencyKey)) return err("dependency_unavailable");
      const result = await this.snapshot(transaction, firebaseUid,
        accountId => derivePersonaId(accountId, input.expectedStateRevision, input.idempotencyKey));
      if (!result.ok) return result;
      const snapshot = result.value;
      const personaId = snapshot.addressedId!;
      const candidate = snapshot.members.get(personaId);
      const current = snapshot.state.stateRevision;
      const expected = input.expectedStateRevision;
      if (expected < Number.MAX_SAFE_INTEGER && current === expected + 1) {
        if (candidate === undefined) return err("revision_precondition_failed");
        if (candidate.revision !== 1) return err("dependency_unavailable");
        return samePersonaInput(candidate, fields)
          ? ok({ persona: candidate, stateRevision: current, created: false }) : err("command_conflict");
      }
      if (current !== expected) return err("revision_precondition_failed");
      if (current === Number.MAX_SAFE_INTEGER) return err("dependency_unavailable");
      if (snapshot.members.size === 5) return err("limit_reached");
      if (candidate !== undefined) return err("dependency_unavailable");
      const now = this.now();
      if (now === undefined) return err("dependency_unavailable");
      const persona: PersonaView = { personaId, ...fields, createdAt: now, updatedAt: now, revision: 1 };
      const next: OwnerState = { ...snapshot.state, stateRevision: current + 1,
        livePersonaIds: [...snapshot.state.livePersonaIds, personaId].sort(ordinal) };
      transaction.create(personaPath(snapshot.accountId, personaId), storedPersona(persona));
      transaction.set(statePath(snapshot.accountId), { ...next });
      return ok({ persona, stateRevision: next.stateRevision, created: true });
    });
  }

  public edit(firebaseUid: string, input: PersonaEdit): Promise<PersonaResult<PersonaRead>> {
    return this.transaction(async transaction => {
      const fields = normalizePersonaInput(input);
      if (fields === undefined || !samePersonaInput(fields, input) || !validPreconditions(input)) return err("dependency_unavailable");
      const result = await this.snapshot(transaction, firebaseUid, () => input.personaId);
      if (!result.ok) return result;
      const snapshot = result.value;
      const target = snapshot.members.get(input.personaId);
      if (target === undefined) return err("unavailable");
      if (!matches(snapshot, target, input)) return err("revision_precondition_failed");
      if (samePersonaInput(target, fields)) return ok({ persona: target, stateRevision: snapshot.state.stateRevision });
      if (target.revision === Number.MAX_SAFE_INTEGER || snapshot.state.stateRevision === Number.MAX_SAFE_INTEGER) return err("dependency_unavailable");
      const now = this.now();
      if (now === undefined) return err("dependency_unavailable");
      const persona = { ...target, ...fields, updatedAt: now, revision: target.revision + 1 };
      const next = { ...snapshot.state, stateRevision: snapshot.state.stateRevision + 1 };
      transaction.set(personaPath(snapshot.accountId, input.personaId), storedPersona(persona));
      transaction.set(statePath(snapshot.accountId), next);
      return ok({ persona, stateRevision: next.stateRevision });
    });
  }

  public activate(firebaseUid: string, input: PersonaPreconditions): Promise<PersonaResult<PersonaSet>> {
    return this.transaction(async transaction => {
      if (!validPreconditions(input)) return err("dependency_unavailable");
      const result = await this.snapshot(transaction, firebaseUid, () => input.personaId);
      if (!result.ok) return result;
      const snapshot = result.value;
      const target = snapshot.members.get(input.personaId);
      if (target === undefined) return err("unavailable");
      if (!matches(snapshot, target, input)) return err("revision_precondition_failed");
      if (snapshot.state.activePersonaId === input.personaId) return ok(setView(snapshot));
      if (snapshot.state.stateRevision === Number.MAX_SAFE_INTEGER) return err("dependency_unavailable");
      const next = { ...snapshot.state, activePersonaId: input.personaId, stateRevision: snapshot.state.stateRevision + 1 };
      transaction.set(statePath(snapshot.accountId), next);
      return ok(setView(snapshot, next));
    });
  }

  public delete(firebaseUid: string, input: PersonaPreconditions): Promise<PersonaResult<void>> {
    return this.transaction(async transaction => {
      if (!validPreconditions(input)) return err("dependency_unavailable");
      const result = await this.snapshot(transaction, firebaseUid, () => input.personaId);
      if (!result.ok) return result;
      const snapshot = result.value;
      const target = snapshot.members.get(input.personaId);
      if (target === undefined) return ok(undefined);
      if (!matches(snapshot, target, input)) return err("revision_precondition_failed");
      if (snapshot.state.stateRevision === Number.MAX_SAFE_INTEGER || transaction.delete === undefined) return err("dependency_unavailable");
      const next: OwnerState = {
        livePersonaIds: snapshot.state.livePersonaIds.filter(id => id !== input.personaId),
        stateRevision: snapshot.state.stateRevision + 1,
        ...(snapshot.state.activePersonaId === undefined || snapshot.state.activePersonaId === input.personaId
          ? {} : { activePersonaId: snapshot.state.activePersonaId }),
      };
      transaction.delete(personaPath(snapshot.accountId, input.personaId));
      transaction.set(statePath(snapshot.accountId), { ...next });
      return ok(undefined);
    });
  }
}
