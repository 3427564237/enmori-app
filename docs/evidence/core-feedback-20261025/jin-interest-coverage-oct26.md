# JIN interest/source coverage matrix

Source of scope: 2026-10-26-jin-all-interest-event-coverage.md at integration
4d81af2f3dc0f5d68d8346eb248b30ed93097f76. No new provider is enabled.
The existing Ticketmaster SG events adapter supplies classifications and venue
metadata. The [official Discovery API field contract](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
defines segment/genre/subGenre/type/subType identities and names. That schema
does not establish which classifications or upcoming events exist in Singapore
today. LI's prior 85-occurrence observation is attributed to LI, not reproduced.

Each row below has an implemented narrow classifier and an independent synthetic
positive/negative case. A node must carry both a valid provider ID and the exact
listed name; broad categories and title keywords cannot populate a row.
Names below are matching conditions, **not claims that these are verified live
Ticketmaster taxonomy entries**. Live taxonomy/catalogue access is Not Run for
every row; current fixture coverage must not be reported as 14 populated groups.

| Existing interest | Exact matching condition | Current availability boundary |
|---|---|---|
| Books | Literary or Books | Conditional on such a supplied classification; no title/book keyword inference |
| Travel | Travel | No known live SG coverage demonstrated; tourism/location alone is not a match |
| Films | Film | Only supplied film classification, not theatre or a title containing film |
| Fitness | Fitness | Generic Sports does not establish fitness participation |
| Dance | Dance | Generic Music or Arts & Theatre does not establish Dance |
| Food | Food & Drink | Venue food availability is not an activity classification |
| Photography | Photography | An event cover image is not a photography activity |
| Technology | Technology | No known live SG coverage demonstrated; no inference from venue/title |
| Outdoors | Outdoor Recreation | Outdoor venue/location alone is not sufficient |
| Volunteering | Volunteering | Charity, Community or ticket donation does not establish volunteering |
| Art | Fine Art | Arts & Theatre is too broad and is not mapped wholesale |
| Gaming | Gaming or eSports | Generic Sports is not mapped |
| Community | Community/Civic | Miscellaneous alone is not mapped |
| Music | Segment ID KZFzniwnSyZfZ7v7nJ plus the configured active Music interest ID | Existing exact identity binding retained; current live count still Not Run here |

For all fourteen: a healthy complete traversal with no qualifying match yields
no **interest-derived** candidates for that tag. An independently authorized
social/region signal can still qualify an Event and is labelled accordingly.
Provider errors, malformed paging, capacity and disabled/retired sources return
SERVICE_UNAVAILABLE, never fake empty/backup data. Missing classifications
contribute no interest factor but do not invent or rename the source occurrence.
Available candidates beyond page 0 now participate in the same full ranking.

## Exact remaining access and decision boundary

LI has the existing approved provider key/runtime; it was not transferred to or
used by JIN. In one authorized read-only verification, LI should record current
classification IDs/names and complete SG page counts, then check each row above
against that actual catalogue. No key, request URL containing a key, user data or
full private response should enter Git. Publish only per-tag permitted counts,
source IDs/classification facts where allowed, timestamps and failure status.

If a named condition is absent from the actual taxonomy, mark that row
unsupported by this source; if the taxonomy exists but has no eligible upcoming
SG occurrence, mark current empty. These are different from service failure.
This is the precise unresolved external evidence, not a code-review wait.
The minimum first candidate is the already approved Discovery classifications/
events read with the existing key, not an arbitrary additional provider.
Only if that read establishes an unsupported category is a different provider
choice needed; report that exact category and the proposed licensed read/data
contract to LI before adding it. No additional provider, credential, schema or
scraping fallback has been selected or claimed approved in this delivery.

Thus classifier/candidate traversal support is delivered for all named tags;
real population/coverage of all fourteen remains explicitly unverified.
