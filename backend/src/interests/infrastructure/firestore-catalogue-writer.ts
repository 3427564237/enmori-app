import { createHash, randomUUID } from 'node:crypto';
import type { FirestoreGateway } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import type { InterestCatalogueWriter } from '../ports/interest-admin.js';
import { catalogueName } from '../domain/catalogue-name.js';

export class FirestoreCatalogueWriter implements InterestCatalogueWriter {
  constructor(private readonly firestore: FirestoreGateway) {}
  async create(displayName: string, comparisonKey: string): ReturnType<InterestCatalogueWriter['create']> {
    try {
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
        const interestTagId = randomUUID();
        const interestTag = { interestTagId, displayName, lifecycleState: 'active' as const, revision: 1 as const };
        tx.create(reservation, { comparisonKey, interestTagId });
        tx.create(`interest_tags/${interestTagId}`, { displayName, lifecycleState: 'active', revision: 1 });
        return { kind: 'created', interestTag };
      });
    } catch { return { kind: 'unavailable' }; }
  }
}
