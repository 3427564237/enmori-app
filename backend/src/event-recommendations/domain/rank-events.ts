export const EVENT_FORMULA_VERSION = "event_recommendation_v1";

/** Inner, purpose-filtered inputs; these are neither wire DTOs nor records. */
export interface EventScoringInput {
  readonly eventId: string;
  readonly active: boolean;
  readonly published: boolean;
  readonly startInstant: bigint;
  readonly interestTagIds: readonly string[];
}

export interface RankedEvent {
  readonly eventId: string;
  readonly startInstant: bigint;
  readonly matchedInterestTagIds: readonly string[];
  readonly score: number;
  readonly factor: {
    readonly factorCode: "interest_match_count";
    readonly matchedCount: number;
    readonly points: number;
    readonly formulaVersion: typeof EVENT_FORMULA_VERSION;
  };
}

/** No locale, case folding, name matching or client-selected sort weight. */
function compareId(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function distinctIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort(compareId);
}

function sameSource(left: EventScoringInput, right: EventScoringInput): boolean {
  return left.active === right.active && left.published === right.published &&
    left.startInstant === right.startInstant &&
    JSON.stringify(distinctIds(left.interestTagIds)) ===
      JSON.stringify(distinctIds(right.interestTagIds));
}

/**
 * Q03/Q12: complete ordering first, with no retained history or fallback.
 * Instants are epoch nanoseconds so an adapter need not truncate UTC fractions.
 * The caller supplies only current, active, selected Interest identities.
 * Conflicting projections of one identity are invalid inputs, not extra votes.
 */
export function rankEvents(input: {
  readonly asOf: bigint;
  readonly activeSelectedInterestTagIds: readonly string[];
  readonly events: readonly EventScoringInput[];
}): readonly RankedEvent[] {
  const selected = new Set(input.activeSelectedInterestTagIds);
  const sources = new Map<string, EventScoringInput>();
  const ambiguous = new Set<string>();
  for (const event of input.events) {
    const prior = sources.get(event.eventId);
    if (prior !== undefined && !sameSource(prior, event)) ambiguous.add(event.eventId);
    sources.set(event.eventId, event);
  }

  const ranked: RankedEvent[] = [];
  for (const event of sources.values()) {
    if (event.eventId.length === 0 || ambiguous.has(event.eventId) ||
        !event.active || !event.published || event.startInstant <= input.asOf) continue;
    const matched = distinctIds(event.interestTagIds).filter((id) => selected.has(id));
    if (matched.length === 0) continue;
    ranked.push({
      eventId: event.eventId,
      startInstant: event.startInstant,
      matchedInterestTagIds: matched,
      score: matched.length,
      factor: {
        factorCode: "interest_match_count",
        matchedCount: matched.length,
        points: matched.length,
        formulaVersion: EVENT_FORMULA_VERSION,
      },
    });
  }
  return ranked.sort((left, right) => right.score - left.score ||
    (left.startInstant < right.startInstant ? -1 :
      left.startInstant > right.startInstant ? 1 : compareId(left.eventId, right.eventId)));
}
