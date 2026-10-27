import { RecommendEvents } from "../event-recommendations/application/recommend-events.js";
import { GetEventDetail } from "../event-detail/application/get-event-detail.js";
import type { EventReadGateway } from "../event-recommendations/infrastructure/event-read-gateway.js";
import { createAuthBindingDocumentId, parseAccountProjection, parseAuthBinding } from "../shared/infrastructure/firebase/firestore-records.js";
import { parseEventInstant, parseMatchingInterest, parseSelectedInterests } from "../event-recommendations/infrastructure/event-records.js";
import type { EventRecommendationRepository } from "../event-recommendations/ports/event-recommendation-repository.js";
import type { BrowseSource } from "../event-browse/ports/event-browse.js";
import type { Clock } from "../shared/ports/clock.js";
import { sourceEventId } from '../event-browse/domain/source-event-id.js';
export { sourceEventId } from '../event-browse/domain/source-event-id.js';
import { ok, err } from "../shared/domain/result.js";

/** Stable across refresh/process restarts, using exact occurrence identity only. */

/** Guarded composition only. Supplied source MUST be the same process capability
 * as browse (including its disable gate and bounded atomic projection). */
export function createControlledEventRecommendations(options: {
  readonly gateway: EventReadGateway;
  readonly personalized?: {read(uid:string,asOf:string,snapshot:import("../event-browse/ports/event-browse.js").RecommendationSnapshot):Promise<import("../event-recommendations/ports/event-recommendation-repository.js").EventRecommendationReadResult>};
  readonly source: BrowseSource;
  readonly clock: Clock;
  /** Explicit identity binding for the approved Music concept; never inferred from labels. */
  readonly musicInterestTagId?: string;
  /** New core decision; legacy compositions retain their earlier contract. */
  readonly requireRecommendationConsent?: true;
  /** Explicit Event participation composition; omission preserves old behavior. */
  readonly ignoredEventIds?: (uid: string, ids: readonly string[]) => Promise<readonly string[]>;
}) {
  async function owner(uid: string): Promise<{ id: string; consent: string } | undefined> {
    const bindingId = createAuthBindingDocumentId(uid);
    if (!bindingId) return undefined;
    const binding = await options.gateway.get(`auth_bindings/${bindingId}`);
    const id = binding && parseAuthBinding(binding);
    const account = id && await options.gateway.get(`accounts/${id}`);
    const parsed = account && parseAccountProjection(account);
    return id && parsed ? { id, consent: parsed.optionalProcessingConsent } : undefined;
  }
  const repository: EventRecommendationRepository = {
    async readForRequester({ firebaseUid, asOf }) {
      try {
        const account = await owner(firebaseUid);
        if (!account) return { kind: "onboarding_required" };
        const mayPersonalize = !options.requireRecommendationConsent || account.consent === "accepted";
        const data = mayPersonalize ? await options.gateway.get(`account_interests/${account.id}`) : undefined;
        const selected = data === undefined ? [] : parseSelectedInterests(data);
        if (!selected) return { kind: "dependency_unavailable" };
        const interestTags = [];
        for (const selectedId of selected) {
          const row = await options.gateway.get(`interest_tags/${selectedId}`);
          const tag = row && parseMatchingInterest(selectedId, row);
          if (tag) interestTags.push(tag);
        }
        // Always establish current source health, even with no selected tags.
        // Source failure must not masquerade as an empty recommendation batch.
        const signal=new AbortController().signal;
        const snapshot=options.source.recommendationSnapshot ? await options.source.recommendationSnapshot(asOf,signal)
          : {items:await options.source.firstBatch(asOf,signal),current:()=>true};
        if(options.personalized)return options.personalized.read(firebaseUid,asOf,snapshot);
        const rows=snapshot.items;
        const ignored = new Set(options.ignoredEventIds && mayPersonalize ? await options.ignoredEventIds(firebaseUid,rows.map(row=>sourceEventId(row.browseId))) : []);
        if (options.requireRecommendationConsent) {
          const current = await owner(firebaseUid);
          if (!current || current.id !== account.id) return { kind: "onboarding_required" };
          if (current.consent !== "accepted") return { kind: "ready", sources: { selectedInterestTagIds: [], interestTags: [], events: [] } };
        }
        if(!snapshot.current())return {kind:"dependency_unavailable"};
        // Legacy compositions still recheck selection after provider/filter awaits.
        const latest=mayPersonalize?await options.gateway.get(`account_interests/${account.id}`):undefined;
        if(!snapshot.current()||JSON.stringify(latest)!==JSON.stringify(data))return {kind:"dependency_unavailable"};
        return { kind: "ready", sources: { selectedInterestTagIds: selected, interestTags,
          events: rows.filter(row=>!ignored.has(sourceEventId(row.browseId))).map(row => ({ scoring: {
            eventId: sourceEventId(row.browseId), active: true, published: true,
            startInstant: parseEventInstant(row.startAt)!, interestTagIds: row.musicSegment === true ? [options.musicInterestTagId ?? "interest_music"] : [],
          }, presentation: { title: row.title, startAt: row.startAt, ...(row.endAt === undefined ? {} : { endAt: row.endAt }) } })) } };
      } catch { return { kind: "dependency_unavailable" }; }
    },
  };
  const eventDetail = new GetEventDetail({
    async read(uid, eventId) {
      try {
        if (!(await owner(uid))) return err("onboarding_required");
        const now = options.clock.now();
        if (!now.ok) return err("dependency_unavailable");
        let row = await options.source.event?.(eventId,now.value.toISOString(),new AbortController().signal);
        if(!row){const rows = await options.source.firstBatch(now.value.toISOString(), new AbortController().signal);
          row = rows.find(value => sourceEventId(value.browseId) === eventId);}
        if (!row) return err("event_unavailable");
        const { title, startAt, externalSourceUrl, endAt, locationLabel, categoryLabel, shortDescription, coverImageUrl } = row;
        return ok({ eventId, title, startAt, externalSourceUrl,
          ...(endAt === undefined ? {} : { endAt }), ...(locationLabel === undefined ? {} : { locationLabel }),
          ...(categoryLabel === undefined ? {} : { categoryLabel }),
          ...(shortDescription === undefined ? {} : { shortDescription }),
          ...(coverImageUrl === undefined ? {} : { coverImageUrl }) });
      } catch { return err("dependency_unavailable"); }
    },
  });
  return { recommendEvents: new RecommendEvents(repository, options.clock), eventDetail };
}
