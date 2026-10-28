/** Public, minimized source content. No vendor object or private booking data. */
export interface EventContent {
  readonly provider: "ticketmaster" | "onepa";
  readonly sourceId: string;
  readonly fetchedAt: string;
  readonly timeZone: "Asia/Singapore";
  readonly detailUrl: string;
  readonly bookingUrl?: string;
  readonly detailsStatus?: "available" | "unavailable" | "not_provided";
  readonly fullDescription?: string;
  readonly sections?: readonly { heading: string; text: string }[];
  readonly status?:
    | "available"
    | "sold_out"
    | "cancelled"
    | "postponed"
    | "registration_closed"
    | "unknown"
    | "not_on_sale"
    | "rescheduled";
  readonly priceLabel?: string;
  readonly registrationDeadline?: string;
  readonly areaCode?: string;
  readonly minimumAge?: number;
  readonly maximumAge?: number;
  readonly targetMinimumAge?: number;
  readonly targetMaximumAge?: number;
}
export interface EventPresentation {
  readonly locationLabel?: string;
  readonly shortDescription?: string;
  readonly coverImageUrl?: string;
  readonly content?: EventContent;
}
export function eventPresentation(row: EventPresentation): EventPresentation {
  return {
    ...(row.locationLabel ? { locationLabel: row.locationLabel } : {}),
    ...(row.shortDescription ? { shortDescription: row.shortDescription } : {}),
    ...(row.coverImageUrl ? { coverImageUrl: row.coverImageUrl } : {}),
    ...(row.content ? { content: row.content } : {}),
  };
}

/** Cards carry summaries and decision metadata, not full sections per row. */
export function eventSummaryPresentation(
  row: EventPresentation,
): EventPresentation {
  const result = eventPresentation(row);
  if (!result.content) return result;
  const { fullDescription: _, sections: __, ...content } = result.content;
  return { ...result, content };
}
