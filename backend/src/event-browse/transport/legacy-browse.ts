import type { BrowseBatch, BrowseDetail, BrowseItem } from '../ports/event-browse.js';

/** Older signed APKs reject unknown fields, onePA IDs and the new scope. */
export function legacyBrowse(value: BrowseBatch | BrowseDetail) {
  const item = ({ browseId, eventId, title, startAt, endAt, locationLabel, categoryLabel }: BrowseItem) => ({
    browseId, title, startAt, ...(eventId ? { eventId } : {}),
    ...(endAt ? { endAt } : {}), ...(locationLabel ? { locationLabel } : {}),
    ...(categoryLabel ? { categoryLabel } : {}),
  });
  if ('items' in value) {
    if (value.sourceStatus?.some(s => s.provider === 'ticketmaster' && !s.available)) return undefined;
    return {
      asOf: value.asOf, scope: 'ticketmaster_sg_first_batch_v1' as const,
      ...(value.nextCursor ? { nextCursor: value.nextCursor } : {}),
      items: value.items.filter(row => row.browseId.startsWith('tm_')).map(item),
    };
  }
  if (!value.browseId.startsWith('tm_')) return undefined;
  return { ...item(value), externalSourceUrl: value.externalSourceUrl,
    ...(value.shortDescription ? { shortDescription: value.shortDescription } : {}),
    ...(value.coverImageUrl ? { coverImageUrl: value.coverImageUrl } : {}),
  };
}
