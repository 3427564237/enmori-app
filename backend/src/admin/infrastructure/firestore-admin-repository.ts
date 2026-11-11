import { createHash, randomUUID } from 'node:crypto';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { isSafeDocumentId } from '../../shared/infrastructure/firebase/firestore-records.js';
import { catalogueName } from '../../interests/domain/catalogue-name.js';
import type { AdminRepository, AdminResult, EventCategory, EventClassification, ManagedCategory } from '../ports/admin-repository.js';
import { FirestoreOperationRecords } from './firestore-operation-records.js';

const categoryId = (s: string) => /^cat_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s);
const namePath = (s: string) => `event_category_names/${createHash('sha256').update(s).digest('hex')}`;
function parseCategory(id: string, d: StoredDocument): EventCategory {
  const name = catalogueName(d.displayName);
  if (!categoryId(id) || Object.keys(d).length !== 3 || !name || name.displayName !== d.displayName ||
    !Number.isSafeInteger(d.revision) || Number(d.revision) < 1 || !['active','inactive'].includes(String(d.lifecycleState))) throw Error('Invalid category');
  return {eventCategoryId: id, displayName: name.displayName, lifecycleState: d.lifecycleState as 'active' | 'inactive', revision: Number(d.revision)};
}
function assignment(d: StoredDocument | undefined): {revision: number; eventCategoryId?: string} {
  if (!d) return {revision: 0};
  if (Object.keys(d).some(k => !['revision','eventCategoryId'].includes(k)) || !Number.isSafeInteger(d.revision) || Number(d.revision) < 1 ||
    (Object.hasOwn(d, 'eventCategoryId') && (typeof d.eventCategoryId !== 'string' || !categoryId(d.eventCategoryId)))) throw Error('Invalid assignment');
  return {revision: Number(d.revision), ...(typeof d.eventCategoryId === 'string' ? {eventCategoryId: d.eventCategoryId} : {})};
}
const reservationMatches = (d: StoredDocument, key: string, id: string) => Object.keys(d).length === 2 && d.comparisonKey === key && d.eventCategoryId === id;
export class FirestoreAdminRepository implements AdminRepository {
  constructor(private readonly store: FirestoreGateway, private readonly audit: FirestoreOperationRecords) {}
  private async safe<T>(work: () => Promise<AdminResult<T>>): Promise<AdminResult<T>> {
    try { return await work(); } catch { return {kind: 'unavailable'}; }
  }
  private async catalogue(tx: FirestoreTransactionGateway) {
    const keys = new Set<string>();
    const values = (await tx.list('event_categories')).map(row => parseCategory(row.id, row.data));
    for (const value of values) {
      const key = catalogueName(value.displayName)!.comparisonKey;
      if (keys.has(key)) throw Error('Duplicate catalogue key');
      keys.add(key);
    }
    return values.sort((a,b) => a.eventCategoryId < b.eventCategoryId ? -1 : a.eventCategoryId > b.eventCategoryId ? 1 : 0);
  }
  categories(): ReturnType<AdminRepository['categories']> {
    return this.safe(() => this.store.runTransaction(async tx => ({kind: 'success', value: await this.catalogue(tx)})));
  }
  create(actor: string, displayName: string, comparisonKey: string): ReturnType<AdminRepository['create']> {
    return this.safe(async () => {
      const name = catalogueName(displayName);
      if (!name || name.displayName !== displayName || name.comparisonKey !== comparisonKey) return {kind: 'unavailable'};
      const eventCategoryId = `cat_${randomUUID()}`, audit = this.audit.begin(actor);
      return this.store.runTransaction(async tx => {
        const all = await this.catalogue(tx), reserved = await tx.get(namePath(comparisonKey));
        if (reserved || all.some(v => catalogueName(v.displayName)!.comparisonKey === comparisonKey)) return {kind: 'name_conflict'};
        const value: EventCategory = {eventCategoryId, displayName, lifecycleState: 'active', revision: 1};
        tx.create(`event_categories/${eventCategoryId}`, {displayName, lifecycleState: 'active', revision: 1});
        tx.create(namePath(comparisonKey), {comparisonKey, eventCategoryId});
        this.audit.append(tx, audit, {targetType: 'event_category', targetId: eventCategoryId, operation: 'create', afterRevision: 1});
        return {kind: 'success', value};
      });
    });
  }
  change(actor: string, id: string, expectedRevision: number, change: {displayName: string; comparisonKey: string} | {lifecycleState: 'active' | 'inactive'}): ReturnType<AdminRepository['change']> {
    return this.safe(async () => {
      if (!categoryId(id)) return {kind: 'not_found'};
      const audit = this.audit.begin(actor);
      return this.store.runTransaction(async tx => {
        const path = `event_categories/${id}`, d = await tx.get(path);
        if (!d) return {kind: 'not_found'};
        const current = parseCategory(id, d);
        if (current.revision !== expectedRevision) return {kind: 'revision_precondition_failed'};
        let displayName = current.displayName, lifecycleState = current.lifecycleState;
        const oldKey = catalogueName(displayName)!.comparisonKey;
        let key = oldKey, oldReservation: StoredDocument | undefined, newReservation: StoredDocument | undefined;
        if ('displayName' in change) {
          const name = catalogueName(change.displayName);
          if (!name || name.displayName !== change.displayName || name.comparisonKey !== change.comparisonKey) throw Error('Invalid name');
          displayName = name.displayName; key = name.comparisonKey;
          const all = await this.catalogue(tx);
          if (all.some(v => v.eventCategoryId !== id && catalogueName(v.displayName)!.comparisonKey === key)) return {kind: 'name_conflict'};
          oldReservation = await tx.get(namePath(oldKey));
          newReservation = key === oldKey ? oldReservation : await tx.get(namePath(key));
          if (oldReservation && !reservationMatches(oldReservation, oldKey, id)) throw Error('Invalid reservation');
          if (newReservation && !reservationMatches(newReservation, key, id)) return {kind: 'name_conflict'};
        } else {
          if (!['active','inactive'].includes(change.lifecycleState)) throw Error('Invalid state');
          lifecycleState = change.lifecycleState;
        }
        if (displayName === current.displayName && lifecycleState === current.lifecycleState) return {kind: 'success', value: current};
        if (current.revision >= Number.MAX_SAFE_INTEGER) throw Error('Revision exhausted');
        if ('displayName' in change) {
          if (oldKey !== key && oldReservation) { if (!tx.delete) throw Error('Delete unavailable'); tx.delete(namePath(oldKey)); }
          if (!newReservation) tx.create(namePath(key), {comparisonKey: key, eventCategoryId: id});
        }
        const value = {eventCategoryId: id, displayName, lifecycleState, revision: current.revision + 1};
        tx.set(path, {displayName, lifecycleState, revision: value.revision});
        this.audit.append(tx, audit, {targetType: 'event_category', targetId: id, operation: 'displayName' in change ? 'rename' : lifecycleState === 'active' ? 'restore' : 'deactivate', beforeRevision: current.revision, afterRevision: value.revision});
        return {kind: 'success', value};
      });
    });
  }
  private async readAssignment(tx: FirestoreTransactionGateway, eventId: string): Promise<EventClassification> {
    if (!isSafeDocumentId(eventId)) throw Error('Invalid Event identity');
    const state = assignment(await tx.get(`event_category_assignments/${eventId}`));
    if (!state.eventCategoryId) return {eventId, revision: state.revision};
    const data = await tx.get(`event_categories/${state.eventCategoryId}`);
    if (!data) throw Error('Missing category');
    const value = parseCategory(state.eventCategoryId, data);
    return {eventId, revision: state.revision, eventCategoryId: value.eventCategoryId, displayName: value.displayName, lifecycleState: value.lifecycleState};
  }
  classification(eventId: string): ReturnType<AdminRepository['classification']> {
    return this.safe(() => this.store.runTransaction(async tx => ({kind: 'success', value: await this.readAssignment(tx, eventId)})));
  }
  assign(actor: string, eventId: string, expectedRevision: number, id?: string): ReturnType<AdminRepository['assign']> {
    return this.safe(async () => {
      if (!isSafeDocumentId(eventId) || (id !== undefined && !categoryId(id))) return {kind: 'not_found'};
      const audit = this.audit.begin(actor);
      return this.store.runTransaction(async tx => {
        const current = await this.readAssignment(tx, eventId);
        if (current.revision !== expectedRevision) return {kind: 'revision_precondition_failed'};
        if (current.eventCategoryId === id) return {kind: 'success', value: current};
        let category: EventCategory | undefined;
        if (id !== undefined) {
          const data = await tx.get(`event_categories/${id}`);
          if (!data) return {kind: 'not_found'};
          category = parseCategory(id, data);
          if (category.lifecycleState !== 'active') return {kind: 'state_conflict'};
        }
        if (current.revision >= Number.MAX_SAFE_INTEGER) throw Error('Revision exhausted');
        const revision = current.revision + 1;
        tx.set(`event_category_assignments/${eventId}`, {revision, ...(id ? {eventCategoryId: id} : {})});
        this.audit.append(tx, audit, {targetType: 'event_category_assignment', targetId: eventId, operation: id ? 'assign' : 'clear', beforeRevision: current.revision, afterRevision: revision});
        return {kind: 'success', value: {eventId, revision, ...(category ? {eventCategoryId: category.eventCategoryId, displayName: category.displayName, lifecycleState: category.lifecycleState} : {})}};
      });
    });
  }
  async readMany(ids: readonly string[]): Promise<ReadonlyMap<string, ManagedCategory>> {
    if (ids.length > 40 || ids.some(id => !isSafeDocumentId(id))) throw Error('Invalid Event projection');
    if (ids.length === 0) return new Map();
    return this.store.runTransaction(async tx => {
      const results = await Promise.all([...new Set(ids)].map(id => this.readAssignment(tx, id)));
      return new Map(results.flatMap(value => value.eventCategoryId && value.displayName && value.lifecycleState
        ? [[value.eventId, {eventCategoryId: value.eventCategoryId, displayName: value.displayName, lifecycleState: value.lifecycleState}] as const] : []));
    });
  }
  records(cursor?: string): ReturnType<AdminRepository['records']> {
    return this.safe(async () => ({kind: 'success', value: await this.audit.read(cursor)}));
  }
}
