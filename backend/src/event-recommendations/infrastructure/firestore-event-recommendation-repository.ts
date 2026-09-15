import { createAuthBindingDocumentId, parseAccountProjection, parseAuthBinding } from
  "../../shared/infrastructure/firebase/firestore-records.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type { EventRecommendationRepository, EventRecommendationReadResult,
  InterestMatchingProjection } from "../ports/event-recommendation-repository.js";
import type { EventReadGateway } from "./event-read-gateway.js";
import { parseEventInstant, parseMatchingInterest, parseRecommendationEvent,
  parseSelectedInterests } from "./event-records.js";

export class FirestoreEventRecommendationRepository implements EventRecommendationRepository {
  public constructor(private readonly gateway: EventReadGateway) {}

  public async readForRequester(query: Parameters<EventRecommendationRepository["readForRequester"]>[0]):
    Promise<EventRecommendationReadResult> {
    try {
      const bindingId = createAuthBindingDocumentId(query.firebaseUid);
      if (bindingId === undefined) return { kind: "onboarding_required" };
      const binding = await this.gateway.get(`auth_bindings/${bindingId}`);
      const accountId = binding === undefined ? undefined : parseAuthBinding(binding);
      if (accountId === undefined) return { kind: "onboarding_required" };
      const account = await this.gateway.get(`accounts/${accountId}`);
      if (account === undefined || parseAccountProjection(account) === undefined) {
        return { kind: "onboarding_required" };
      }
      const asOf = parseEventInstant(query.asOf);
      if (asOf === undefined) return dependencyUnavailable;
      const selection = await this.gateway.get(`account_interests/${accountId}`);
      const selected = selection === undefined ? [] : parseSelectedInterests(selection);
      if (selected === undefined) return dependencyUnavailable;
      const tags: InterestMatchingProjection[] = [];
      for (const id of selected) {
        const data = await this.gateway.get(`interest_tags/${id}`);
        const tag = data === undefined ? undefined : parseMatchingInterest(id, data);
        if (tag !== undefined) tags.push(tag);
      }
      const activeIds = new Set(tags.filter((tag) => tag.lifecycleState === "active")
        .map((tag) => tag.interestTagId));
      const events = [];
      // Complete bounded synthetic catalogue read, no index/query framework.
      // Account/own-selection authorization always precedes source construction.
      if (activeIds.size > 0) for (const document of await this.gateway.listEvents()) {
        const event = parseRecommendationEvent(document.id, document.data);
        if (event === undefined || !event.scoring.active || !event.scoring.published ||
            event.scoring.startInstant <= asOf ||
            !event.scoring.interestTagIds.some((id) => activeIds.has(id))) continue;
        events.push({ ...event, scoring: { ...event.scoring,
          interestTagIds: event.scoring.interestTagIds.filter((id) => activeIds.has(id)) } });
      }
      return { kind: "ready", sources: { selectedInterestTagIds: selected, interestTags: tags, events } };
    } catch {
      return dependencyUnavailable;
    }
  }
}
