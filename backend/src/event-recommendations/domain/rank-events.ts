export const EVENT_FORMULA_VERSION = "event_recommendation_v1";

/** Inner, purpose-filtered inputs; these are neither wire DTOs nor records. */
export interface EventScoringInput {
  readonly eventId: string;
  readonly active: boolean;
  readonly published: boolean;
  readonly startInstant: bigint;
  readonly interestTagIds: readonly string[];
  readonly visibleFriendCount?: number;
  readonly sameRegion?: boolean;
  readonly sameArea?: boolean;
  readonly targetAgeMatch?: boolean;
}

export interface RecommendationReason { readonly code: "shared_interests" | "friends_participating" | "same_region" | "same_area" | "target_age"; readonly count: number; readonly points: number }
export interface RankedEvent {
  readonly reasons?: readonly RecommendationReason[];
  readonly eventId: string;
  readonly startInstant: bigint;
  readonly matchedInterestTagIds: readonly string[];
  readonly score: number;
  readonly factor: {
    readonly factorCode: "interest_match_count";
    readonly matchedCount: number;
    readonly points: number;
    readonly formulaVersion: typeof EVENT_FORMULA_VERSION | "event_recommendation_v2" | "event_recommendation_v3";
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
    left.startInstant === right.startInstant && left.visibleFriendCount === right.visibleFriendCount && left.sameRegion === right.sameRegion && left.sameArea === right.sameArea && left.targetAgeMatch === right.targetAgeMatch &&
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
  readonly formulaVersion?: "event_recommendation_v2" | "event_recommendation_v3";
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
    const v2=input.formulaVersion!==undefined;
    const friends=event.visibleFriendCount??0;
    if(!Number.isSafeInteger(friends)||friends<0||friends>1000)continue;
    const v3=input.formulaVersion==="event_recommendation_v3";
    const region=event.sameRegion===true&&!(v3&&event.sameArea);
    const reasons:RecommendationReason[]=[
      ...(matched.length?[{code:"shared_interests" as const,count:matched.length,points:matched.length*4}]:[]),
      ...(friends?[{code:"friends_participating" as const,count:friends,points:Math.min(friends,5)*2}]:[]),
      ...(v3&&event.sameArea?[{code:"same_area" as const,count:1,points:2}]:[]),
      ...(v3&&event.targetAgeMatch?[{code:"target_age" as const,count:1,points:1}]:[]),
      ...(region?[{code:"same_region" as const,count:1,points:1}]:[])];
    if(v2?reasons.length===0:matched.length===0)continue;
    ranked.push({
      eventId: event.eventId,
      startInstant: event.startInstant,
      matchedInterestTagIds: matched,
      score: v2?reasons.reduce((sum,reason)=>sum+reason.points,0):matched.length,
      ...(v2?{reasons}:{}),
      factor: {
        factorCode: "interest_match_count",
        matchedCount: matched.length,
        points: matched.length * (v2 ? 4 : 1),
        formulaVersion: input.formulaVersion ?? EVENT_FORMULA_VERSION,
      },
    });
  }
  // LI 2026-11-15: interest matches always precede other positive signals.
  // Keep scores/reasons truthful and preserve the existing order within each group.
  return ranked.sort((left, right) =>
    Number(right.matchedInterestTagIds.length > 0) - Number(left.matchedInterestTagIds.length > 0) ||
    right.score - left.score ||
    (left.startInstant < right.startInstant ? -1 :
      left.startInstant > right.startInstant ? 1 : compareId(left.eventId, right.eventId)));
}
