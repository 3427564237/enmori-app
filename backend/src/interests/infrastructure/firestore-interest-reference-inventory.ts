import type { FirestoreTransactionGateway } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { isSafeDocumentId } from '../../shared/infrastructure/firebase/firestore-records.js';

/** Construct only after the assembled environment's complete reference inventory
 * is verified. Connected composition intentionally does not supply this proof. */
export interface VerifiedInterestReferenceInventory {
  inspect(transaction: FirestoreTransactionGateway, interestTagId: string): Promise<'clear' | 'referenced' | 'unavailable'>;
}

/** Exact approved MVP account/Event inventory. No private reference information
 * leaves this adapter and every row is inspected inside the deletion transaction. */
export class VerifiedMvpInterestReferences implements VerifiedInterestReferenceInventory {
  async inspect(tx: FirestoreTransactionGateway, interestTagId: string): Promise<'clear' | 'referenced' | 'unavailable'> {
    let referenced = false;
    for (const collection of ['account_interests', 'events']) {
      const allowed = collection === 'account_interests' ? ['interestTagIds', 'revision']
        : ['title', 'active', 'published', 'startAt', 'endAt', 'interestTagIds'];
      for (const row of await tx.list(collection)) {
        const ids = row.data.interestTagIds;
        if (!isSafeDocumentId(row.id) || Object.keys(row.data).some(key => !allowed.includes(key)) ||
            !Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !isSafeDocumentId(id)) ||
            new Set(ids).size !== ids.length) return 'unavailable';
        if (collection === 'account_interests' && (ids.length > 10 || !Number.isSafeInteger(row.data.revision) || Number(row.data.revision) < 1)) return 'unavailable';
        if (collection === 'events' && (typeof row.data.title !== 'string' || typeof row.data.active !== 'boolean' ||
            typeof row.data.published !== 'boolean' || typeof row.data.startAt !== 'string' || typeof row.data.endAt !== 'string')) return 'unavailable';
        if (ids.includes(interestTagId)) referenced = true;
      }
    }
    return referenced ? 'referenced' : 'clear';
  }
}
