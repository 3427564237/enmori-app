import { eventSummaryPresentation } from "../../event-detail/domain/event-content.js";
import type { EventPresentation } from "../../event-detail/domain/event-content.js";
import { readAuthoritativeInstant } from "../../shared/application/authoritative-values.js";
import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { ok, err, type Result } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { EVENT_FORMULA_VERSION, rankEvents } from "../domain/rank-events.js";
import type { EventRecommendationRepository } from "../ports/event-recommendation-repository.js";

/** Internal result only. Transport mapping remains a separate contract gate. */
export interface EventRecommendations {
  readonly asOf: string;
  readonly formulaVersion: typeof EVENT_FORMULA_VERSION | "event_recommendation_v2" | "event_recommendation_v3";
  readonly items: readonly (EventPresentation & {
    readonly reasons?: import("../domain/rank-events.js").RankedEvent["reasons"];
    readonly eventId: string;
    readonly title: string;
    readonly startAt: string;
    readonly endAt?: string;
    readonly matchedInterests: readonly {
      readonly interestTagId: string;
      readonly displayName: string;
    }[];
  })[];
}

export class RecommendEvents {
  public constructor(
    private readonly repository: EventRecommendationRepository,
    private readonly clock: Clock,
  ) {}

  /** Principal is constructed by the existing authenticated Transport boundary. */
  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly view: "home" | "all";
    readonly activityAreaCode?: string;
  }): Promise<Result<EventRecommendations, AppFailure>> {
    const instant = readAuthoritativeInstant(this.clock);
    if (!instant.ok) return instant;
    const read = await this.repository.readForRequester({
      firebaseUid: input.principal.firebaseUid,
      asOf: instant.value,
      ...(input.activityAreaCode?{activityAreaCode:input.activityAreaCode}:{}),
    });
    switch (read.kind) {
      case "onboarding_required": return err(appFailure("ONBOARDING_REQUIRED"));
      case "forbidden": return err(appFailure("AUTH_FORBIDDEN"));
      case "dependency_unavailable": return err(appFailure("SERVICE_UNAVAILABLE"));
      case "ready": break;
    }

    const sources = read.sources;
    const activeTags = new Map(sources.interestTags
      .filter((tag) => tag.lifecycleState === "active")
      .map((tag) => [tag.interestTagId, tag]));
    const ranked = rankEvents({
      ...(sources.formulaVersion?{formulaVersion:sources.formulaVersion}:{}),
      asOf: BigInt(new Date(instant.value).getTime()) * 1_000_000n,
      activeSelectedInterestTagIds: sources.selectedInterestTagIds
        .filter((id) => activeTags.has(id)),
      events: sources.events.map((event) => event.scoring),
    });
    const presentation = new Map(sources.events
      .map((event) => [event.scoring.eventId, event.presentation]));
    const selected = input.view === "home" ? ranked.slice(0, 2) : ranked;
    return ok({
      asOf: instant.value,
      formulaVersion: sources.formulaVersion??EVENT_FORMULA_VERSION,
      items: selected.map((event) => {
        const display = presentation.get(event.eventId)!;
        return {
          ...(event.reasons?{reasons:event.reasons}:{}),
          eventId: event.eventId,
          ...eventSummaryPresentation(display),
          title: display.title,
          startAt: display.startAt,
          ...(display.endAt === undefined ? {} : { endAt: display.endAt }),
          matchedInterests: event.matchedInterestTagIds.map((id) => ({
            interestTagId: id,
            displayName: activeTags.get(id)!.displayName,
          })),
        };
      }),
    });
  }
}
