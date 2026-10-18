import { RecommendEvents } from "../event-recommendations/application/recommend-events.js";
import { GetEventDetail } from "../event-detail/application/get-event-detail.js";
import type { EventReadGateway } from "../event-recommendations/infrastructure/event-read-gateway.js";
import { createAuthBindingDocumentId, parseAccountProjection, parseAuthBinding } from "../shared/infrastructure/firebase/firestore-records.js";
import { parseEventInstant, parseMatchingInterest, parseSelectedInterests } from "../event-recommendations/infrastructure/event-records.js";
import type { EventRecommendationRepository } from "../event-recommendations/ports/event-recommendation-repository.js";
import type { BrowseSource } from "../event-browse/ports/event-browse.js";
import type { Clock } from "../shared/ports/clock.js";
import { createHash } from "node:crypto";
import { decodeBrowseId } from "../event-browse/domain/browse-values.js";
import { ok, err } from "../shared/domain/result.js";

/** Stable across refresh/process restarts, using exact occurrence identity only. */
export function sourceEventId(browseId: string): string {
  const occurrence = decodeBrowseId(browseId);
  if (!occurrence) throw new Error("CONTROLLED_EVENT_ID_INVALID");
  return `tm_event_${createHash("sha256").update(occurrence, "utf8").digest("hex")}`;
}

/** Guarded composition only. Supplied source MUST be the same process capability
 * as browse (including its disable gate and bounded atomic projection). */
export function createControlledEventRecommendations(options: {
  readonly gateway: EventReadGateway;
  readonly source: BrowseSource;
  readonly clock: Clock;
}) {
  async function owner(uid: string): Promise<string | undefined> {
    const bindingId = createAuthBindingDocumentId(uid);
    if (!bindingId) return undefined;
    const binding = await options.gateway.get(`auth_bindings/${bindingId}`);
    const id = binding && parseAuthBinding(binding);
    const account = id && await options.gateway.get(`accounts/${id}`);
    return id && account && parseAccountProjection(account) ? id : undefined;
  }
  const repository: EventRecommendationRepository = {
    async readForRequester({ firebaseUid, asOf }) {
      try {
        const id = await owner(firebaseUid);
        if (!id) return { kind: "onboarding_required" };
        const data = await options.gateway.get(`account_interests/${id}`);
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
        const rows = await options.source.firstBatch(asOf, new AbortController().signal);
        return { kind: "ready", sources: { selectedInterestTagIds: selected, interestTags,
          events: rows.map(row => ({ scoring: {
            eventId: sourceEventId(row.browseId), active: true, published: true,
            startInstant: parseEventInstant(row.startAt)!, interestTagIds: row.musicSegment === true ? ["interest_music"] : [],
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
        const rows = await options.source.firstBatch(now.value.toISOString(), new AbortController().signal);
        const row = rows.find(value => sourceEventId(value.browseId) === eventId);
        if (!row) return err("event_unavailable");
        const { title, startAt, externalSourceUrl, endAt, locationLabel, categoryLabel } = row;
        return ok({ eventId, title, startAt, externalSourceUrl,
          ...(endAt === undefined ? {} : { endAt }), ...(locationLabel === undefined ? {} : { locationLabel }),
          ...(categoryLabel === undefined ? {} : { categoryLabel }) });
      } catch { return err("dependency_unavailable"); }
    },
  });
  return { recommendEvents: new RecommendEvents(repository, options.clock), eventDetail };
}
