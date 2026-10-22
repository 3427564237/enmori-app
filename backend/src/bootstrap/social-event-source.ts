import type { SocialSourceReader, FriendEventProjection } from '../friend-recommendations/ports/friend-event-projection.js';
import type { EventActivitySource, EventActivityMetadata } from '../friend-activity/ports/friend-activity.js';
import type { BrowseOccurrence } from '../event-browse/ports/event-browse.js';
import { participationKey } from '../event-participation/infrastructure/firestore-participation-repository.js';
import { validEventId } from '../event-participation/domain/participation-values.js';
import { isUtcIsoInstant } from '../shared/infrastructure/firebase/firestore-records.js';
import { visible } from '../friends/infrastructure/social-authority.js';
import { readFriendVisibility } from '../friends/infrastructure/firestore-friend-repository.js';
import type { FirestoreTransactionGateway } from '../shared/infrastructure/firebase/firestore-gateway.js';

/** Current transaction permission plus process-only provider projection. No network IO or archived title. */
export function socialEventSource(peek: (id: string, asOf: string) => BrowseOccurrence | undefined, ready: (asOf: string) => boolean) {
  async function permitted(tx: SocialSourceReader, viewer: string, owner: string) {
    const account = await tx.get(`accounts/${owner}`), access = await tx.get(`friend_access/${owner}`);
    if (!account || account.optionalProcessingConsent !== 'accepted' || access?.eligibilityState !== 'eligible') return false;
    const relation = await readFriendVisibility(tx as FirestoreTransactionGateway, viewer, owner);
    const fields = account.fieldPrivacy as Record<string, unknown> | undefined;
    return !relation.isBlocked && visible(fields?.participation, viewer === owner, relation.isFriend);
  }
  async function rows(tx: SocialSourceReader, viewer: string, owner: string) {
    if (!await permitted(tx, viewer, owner)) return [];
    if (!tx.listWherePage) throw new Error('Participation projection unavailable');
    const result: {id: string; data: Readonly<Record<string, unknown>>}[] = [];
    let after: string | undefined;
    for (let page = 0; page < 40; page++) {
      const batch = await tx.listWherePage('event_participations', {accountId: owner}, after, 25);
      for (const row of batch) {
        if (row.data.accountId !== owner || !validEventId(row.data.eventId) || row.id !== participationKey(owner, row.data.eventId) ||
          (after !== undefined && row.id <= after)) throw new Error('Invalid participation projection');
        result.push(row); after = row.id;
      }
      if (batch.length < 25) return result;
    }
    throw new Error('Participation projection capacity');
  }
  const activity: EventActivitySource = {
    async read(tx, viewer, owner, asOf) {
      if (!ready(asOf)) throw new Error('Current event source unavailable');
      const result: EventActivityMetadata[] = [];
      for (const row of await rows(tx, viewer, owner)) {
        const d = row.data;
        if ((d.status === 'interested' || d.status === 'going') && isUtcIsoInstant(d.selectedAt)) {
          const age=Date.parse(asOf)-Date.parse(d.selectedAt);
          // The retained feed window is inclusive seven days. Do not demand
          // source content for an old/noncandidate row or invent its history.
          if(age<0||age>168*60*60*1000)continue;
          if(!peek(String(d.eventId),asOf))throw new Error('Selected event source unavailable');
          result.push({sourceRecordId: row.id, type: d.status === 'going' ? 'event_going' : 'event_interested', occurredAt: d.selectedAt});
        }
      }
      return result;
    },
    async display(tx, viewer, owner, source, asOf) {
      if (!await permitted(tx, viewer, owner)) return undefined;
      if(!ready(asOf))throw new Error('Current event source unavailable');
      const row = await tx.get(`event_participations/${source.sourceRecordId}`);
      if (!row || row.accountId !== owner || !validEventId(row.eventId) || participationKey(owner, row.eventId) !== source.sourceRecordId ||
        row.selectedAt !== source.occurredAt || row.status !== (source.type === 'event_going' ? 'going' : 'interested')) return undefined;
      const event = peek(row.eventId, asOf);
      return event ? {eventId: row.eventId, title: event.title} : undefined;
    },
  };
  const recommendations: FriendEventProjection = {
    async read(tx, viewer, owner) {
      if (!ready(new Date().toISOString())) throw new Error('Current event source unavailable');
      const result = {interestedEventIds: [] as string[], goingEventIds: [] as string[]};
      for (const row of await rows(tx, viewer, owner)) {
        if (!peek(String(row.data.eventId), new Date().toISOString())) continue;
        if (row.data.status === 'interested') result.interestedEventIds.push(String(row.data.eventId));
        if (row.data.status === 'going') result.goingEventIds.push(String(row.data.eventId));
      }
      return result;
    },
  };
  return {activity, recommendations};
}
