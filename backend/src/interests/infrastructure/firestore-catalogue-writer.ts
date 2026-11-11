import type { FirestoreOperationRecords } from '../../admin/infrastructure/firestore-operation-records.js';
import { createHash, randomUUID } from 'node:crypto';
import type { FirestoreGateway, StoredDocument } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { isSafeDocumentId } from '../../shared/infrastructure/firebase/firestore-records.js';
import type { InterestCatalogueWriter, InterestCatalogueManagement, ManagedInterestTag, InterestCatalogueChange } from '../ports/interest-admin.js';
import type { VerifiedInterestReferenceInventory } from './firestore-interest-reference-inventory.js';
import { catalogueName } from '../domain/catalogue-name.js';

const namePath = (key: string) => `interest_tag_names/${createHash('sha256').update(key).digest('hex')}`;
function storedTag(id: string, data: StoredDocument | undefined): ManagedInterestTag | undefined {
  if (!data || !isSafeDocumentId(id) || Object.keys(data).length !== 3 ||
      Object.keys(data).some(key => !['displayName', 'lifecycleState', 'revision'].includes(key))) return undefined;
  const name = catalogueName(data.displayName);
  if (!name || name.displayName !== data.displayName || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1 ||
      (data.lifecycleState !== 'active' && data.lifecycleState !== 'inactive')) return undefined;
  return { interestTagId: id, displayName: name.displayName, lifecycleState: data.lifecycleState, revision: Number(data.revision) };
}
const validRevision = (revision: number) => Number.isSafeInteger(revision) && revision >= 1;
function reservationMatches(row: StoredDocument, comparisonKey: string, id: string): boolean {
  return Object.keys(row).length === 2 && row.comparisonKey === comparisonKey && row.interestTagId === id;
}
export class FirestoreCatalogueWriter implements InterestCatalogueWriter, InterestCatalogueManagement {
  constructor(private readonly firestore: FirestoreGateway, private readonly verifiedReferences?: VerifiedInterestReferenceInventory, private readonly audit?: FirestoreOperationRecords) {}
  async create(displayName: string, comparisonKey: string, actorAdminUid?: string): ReturnType<InterestCatalogueWriter['create']> {
    try {
      const audit = this.audit?.begin(actorAdminUid), interestTagId = randomUUID();
      return await this.firestore.runTransaction(async tx => {
        // Existing catalogue is small; inspect all Active AND Inactive entries.
        // The list is inside the transaction, so a legacy unreserved name cannot
        // be duplicated and no migration rewrites any existing tag/reference.
        const tags = await tx.list('interest_tags');
        const keys = new Set<string>();
        for (const tag of tags) {
          const name = catalogueName(tag.data.displayName);
          if (!name || keys.has(name.comparisonKey)) return { kind: 'unavailable' };
          keys.add(name.comparisonKey);
        }
        if (keys.has(comparisonKey)) return { kind: 'conflict' };
        const reservation = `interest_tag_names/${createHash('sha256').update(comparisonKey).digest('hex')}`;
        if (await tx.get(reservation)) return { kind: 'conflict' };
        const interestTag = { interestTagId, displayName, lifecycleState: 'active' as const, revision: 1 as const };
        tx.create(reservation, { comparisonKey, interestTagId });
        tx.create(`interest_tags/${interestTagId}`, { displayName, lifecycleState: 'active', revision: 1 });
        if (audit) this.audit!.append(tx, audit, {targetType: 'interest_tag', targetId: interestTagId, operation: 'create', afterRevision: 1});
        return { kind: 'created', interestTag };
      });
    } catch { return { kind: 'unavailable' }; }
  }

  async list(): ReturnType<InterestCatalogueManagement['list']> {
    try {
      return await this.firestore.runTransaction(async tx => {
        const interestTags: ManagedInterestTag[] = [], keys = new Set<string>();
        for (const row of await tx.list('interest_tags')) {
          const tag = storedTag(row.id, row.data), name = tag && catalogueName(tag.displayName);
          if (!tag || !name || keys.has(name.comparisonKey)) return { kind: 'unavailable' };
          keys.add(name.comparisonKey); interestTags.push(tag);
        }
        interestTags.sort((a, b) => a.interestTagId < b.interestTagId ? -1 : a.interestTagId > b.interestTagId ? 1 : 0);
        return { kind: 'read', interestTags };
      });
    } catch { return { kind: 'unavailable' }; }
  }

  async change(id: string, expectedRevision: number, change: InterestCatalogueChange, actorAdminUid?: string): ReturnType<InterestCatalogueManagement['change']> {
    if (!isSafeDocumentId(id)) return { kind: 'not_found' };
    if (!validRevision(expectedRevision)) return { kind: 'unavailable' };
    try {
      const audit = this.audit?.begin(actorAdminUid);
      return await this.firestore.runTransaction(async tx => {
        const path = `interest_tags/${id}`, data = await tx.get(path);
        if (!data) return { kind: 'not_found' };
        const current = storedTag(id, data);
        if (!current) return { kind: 'unavailable' };
        if (current.revision !== expectedRevision) return { kind: 'revision_precondition_failed' };
        let displayName = current.displayName, lifecycleState = current.lifecycleState;
        let oldReservation: StoredDocument | undefined, newReservation: StoredDocument | undefined;
        const oldKey = catalogueName(displayName)!.comparisonKey;
        let newKey = oldKey;
        if ('displayName' in change) {
          const name = catalogueName(change.displayName);
          if (!name || name.displayName !== change.displayName || name.comparisonKey !== change.comparisonKey) return { kind: 'unavailable' };
          displayName = name.displayName; newKey = name.comparisonKey;
          const keys = new Set<string>();
          for (const row of await tx.list('interest_tags')) {
            const tag = storedTag(row.id, row.data), otherName = tag && catalogueName(tag.displayName);
            if (!tag || !otherName || keys.has(otherName.comparisonKey)) return { kind: 'unavailable' };
            keys.add(otherName.comparisonKey);
            if (row.id !== id && otherName.comparisonKey === newKey) return { kind: 'name_conflict' };
          }
          oldReservation = await tx.get(namePath(oldKey));
          if (oldReservation && !reservationMatches(oldReservation, oldKey, id)) return { kind: 'unavailable' };
          newReservation = newKey === oldKey ? oldReservation : await tx.get(namePath(newKey));
          if (newReservation && !reservationMatches(newReservation, newKey, id)) return { kind: 'name_conflict' };
        } else {
          if (change.lifecycleState !== 'active' && change.lifecycleState !== 'inactive') return { kind: 'unavailable' };
          lifecycleState = change.lifecycleState;
        }
        if (displayName === current.displayName && lifecycleState === current.lifecycleState) return { kind: 'saved', interestTag: current };
        if (current.revision >= Number.MAX_SAFE_INTEGER || (newKey !== oldKey && oldReservation && !tx.delete)) return { kind: 'unavailable' };
        const interestTag: ManagedInterestTag = { interestTagId: id, displayName, lifecycleState, revision: current.revision + 1 };
        if ('displayName' in change) {
          if (newKey !== oldKey && oldReservation) tx.delete!(namePath(oldKey));
          if (!newReservation) tx.create(namePath(newKey), { comparisonKey: newKey, interestTagId: id });
        }
        tx.set(path, { displayName, lifecycleState, revision: interestTag.revision });
        if (audit) this.audit!.append(tx, audit, {targetType: 'interest_tag', targetId: id, operation: 'displayName' in change ? 'rename' : lifecycleState === 'active' ? 'restore' : 'deactivate', beforeRevision: current.revision, afterRevision: interestTag.revision});
        return { kind: 'saved', interestTag };
      });
    } catch { return { kind: 'unavailable' }; }
  }

  async delete(id: string, expectedRevision: number): ReturnType<InterestCatalogueManagement['delete']> {
    if (!isSafeDocumentId(id)) return { kind: 'not_found' };
    // Source inventory alone cannot establish an arbitrary deployed database's
    // complete reference producers. Connected composition leaves this closed.
    if (!this.verifiedReferences || !validRevision(expectedRevision)) return { kind: 'unavailable' };
    try {
      return await this.firestore.runTransaction(async tx => {
        const path = `interest_tags/${id}`, data = await tx.get(path);
        if (!data) return { kind: 'not_found' };
        const current = storedTag(id, data);
        if (!current || !tx.delete) return { kind: 'unavailable' };
        if (current.revision !== expectedRevision) return { kind: 'revision_precondition_failed' };
        if (current.lifecycleState !== 'inactive') return { kind: 'state_conflict' };
        const comparisonKey = catalogueName(current.displayName)!.comparisonKey;
        const reservation = await tx.get(namePath(comparisonKey));
        if (reservation && !reservationMatches(reservation, comparisonKey, id)) return { kind: 'unavailable' };
        const references = await this.verifiedReferences!.inspect(tx, id);
        if (references !== 'clear') return { kind: references };
        tx.delete(path); if (reservation) tx.delete(namePath(comparisonKey));
        return { kind: 'deleted' };
      });
    } catch { return { kind: 'unavailable' }; }
  }
}
