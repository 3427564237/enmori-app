# Event detail presentation extension — 25 October 2026

Authority: LI's [required Event details, description, cover and readable place](../docs/decisions/2026-10-25-li-core-experience-repair.md).
This is the minimum presentation extension for that confirmed scope, selected
by Integration within delegated implementation detail. Existing source identity,
authorization, visibility, request-only acquisition, five-minute client lifetime
and removal obligations remain. No new endpoint, persistent collection,
provider, dependency, category mapping or recommendation score is selected here.

The existing authenticated BrowseDetail and EventDetail responses gain optional
`shortDescription` (nonempty plain text, at most 1000 Unicode scalars) and
`coverImageUrl` (at most 2048 characters). EventDetail already supports the former;
this change supplies its missing authoritative source projection. Both values
must come from the currently returned Ticketmaster occurrence. Use `info` first
for the description, then a safe plain-text `description`; no webpage scraping,
invented summaries or translation of external content. Bound and normalize
untrusted strings without treating them as HTML or instructions.

Select a cover only from that occurrence's actual `images` array. The initial
allowlist is HTTPS `s1.ticketm.net`, without credentials, custom port, fragments
or query parameters. Unavailable or rejected media remains absent; the detail
page must show an honest fallback and keep its actual title, time, venue and
available description usable. Image failure must not prevent event actions.
Do not use Ticketmaster assets as avatars or unrelated decoration.

Only the visible activity detail loads its image after existing source-use
disclosure, which must explain the direct Ticketmaster image-CDN connection.
Do not forward an ENMORI token, owner, location or private request contents.
No disk cache, import or copied archive. Bound image bytes/dimensions and purge
its own in-memory image at detail exit, background/authority invalidation and
the original expiry; do not extend freshness or evict unrelated app media.

`locationLabel` remains the actual readable venue name, optionally accompanied
by an actual supplied address within the existing field bound; no reverse
geocoding, invented place or raw coordinate fallback is introduced.
The application opens its own useful detail before an external action.
`externalSourceUrl` remains the validated actual provider URL. Label it as
Ticketmaster tickets/booking, with the external destination controlled by the
provider. A second event-information action is optional and is displayed only
if there is a separately verified real detail URL; duplicating the same booking
URL under a misleading label does not satisfy that option.

Official sources inspected on 25 October 2026:
[Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
documents event detail, images, venue and the ticket-purchase website URL;
[API terms](https://developer.ticketmaster.com/support/terms-of-use/) retain
reasonable caching, removal and visitor-data disclosure obligations.
This bounded ENMORI discovery/detail display does not implement Ticketmaster
checkout, seat selection, account activity or a replacement ticketing service.
