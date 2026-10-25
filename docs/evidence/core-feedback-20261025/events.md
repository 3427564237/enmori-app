# Event details — 25 October 2026

Delivery owns this bounded source slice. Baseline:
`087281e11ec5a681fd012b9d64431b225ed6f8ea`;
branch `souma/core-feedback-delivery-20261025`.
The previous D1 branch is preserved and its implementation is paused.
The current recorded session configuration is `gpt-6.1-sol`, `effort=max`.

## Authority and cause

[LI's core feedback](../../decisions/2026-10-25-li-core-experience-repair.md)
requires an in-app detail, introduction, cover and readable place. Integration's
[`api/event-detail-presentation-contract.md`](../../../api/event-detail-presentation-contract.md)
records the bounded field/asset extension; retain the earlier
[browse contract](../../decisions/2026-10-15-li-real-event-contract-selection.md),
[external-open selection](../../decisions/2026-10-15-li-event-external-open-selection.md)
and [participation selection](../../decisions/2026-10-20-li-event-participation-selection.md).
This change does not add persistent provider data or a new checkout flow.

The source audit found three connected omissions:

- `projectOccurrence` only projected title/time/venue/category/URL. The provider's
  actual information and images were never read; controlled EventDetail
  composition also discarded any description. This is a source finding, not a
  claim about today's real API response.
- The active participation detail rendered only `EventCard`; the browse detail
  hardcoded "Description unavailable." A route existed but did not provide the
  full information LI requested.
- External actions shared `externalSourceUrl`. Calling the action "View on
  Ticketmaster" implied an information page that the source did not guarantee.
  No card auto-launch was found in the inspected route/action chain.

Public read-only official documentation was inspected on 25 October:
[Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
documents occurrence `info`, `description`, `images` and embedded venue/address,
and describes the event website URL as a ticket-purchase destination.
[API terms](https://developer.ticketmaster.com/support/terms-of-use/)
retain ownership, reasonable caching, visitor disclosure and requested removal
obligations. Documentation establishes field definitions, not the presence or
rights of a specific event. No API key, real provider read or website scrape was
used in this work.

## Source implementation

The projection uses safe plain `info`, then safe plain `description`, normalizes
whitespace and bounds the result to 1000 Unicode scalars. It never renders HTML,
generates an introduction or translates provider content. Invalid optional
content is absent. A readable actual venue/address fits the existing 200-scalar
`locationLabel`; no coordinate or geocoder fallback is created.

`coverImageUrl` comes only from the occurrence's `images` array. Only HTTPS
`s1.ticketm.net` without query, fragment, credentials or custom port is accepted;
fallback imagery and declared dimensions outside 4096 per edge/8 million pixels
are omitted. The list still strips description and image fields; detail carries
them through its strict schema. Firestore schemas are unchanged.

The detail-owned cover request sends no ENMORI token or private data, refuses
redirects, has a ten-second deadline, accepts only JPEG/PNG/WebP and at most
2 MiB, and closes its own client. Decode checks actual dimensions before codec
creation, limits both decoded edges to 1280, and renders a `RawImage` without
using Flutter's global image cache. A generation fence discards late results;
the page owns cancellation and decoded-image disposal. Missing/failed media
keeps text and actions usable. The original parent detail expiry remains the
expiry; image work does not refresh it. Background/sign-out/disposal remove the
owned image without clearing unrelated media.

`EventInformation` displays time, readable place and introduction after source
and direct image-CDN disclosure. It contains no ticket action. App composition
injects it using `detailBuilder` into participation and browse pages; the
ordinary EventDetailPage uses it directly. The actual provider URL is labeled
"Tickets / booking on Ticketmaster". The destination/seat flow belongs to the
provider. No second detail link is fabricated; explicit return confirmation and
unknown participation-write recovery are preserved.

## Validation and integration boundaries

Author Node 24.19.0 / TypeScript 7.0.2 compilation passed using the existing
pinned dependencies and a Delivery-owned output directory. Focused Node fake
and Fastify injection tests: **22/22 passed** (four new presentation projection
cases plus existing browse/pagination cases). They cover unsafe/missing optional
content, Unicode bound, venue/address, exact detail serialization, list
minimization, identity/access, source cancellation and no-store behavior.

Flutter analysis/format and the focused tests are pending the Integration-owned
validation slot. New tests cover both HTTP readers, download bounds/redirects,
no credentials, late cancellation, original expiry, narrow large-text layout
and global-cache isolation. This paragraph will be updated with actual results.

Root owns normative OpenAPI, the generic EventDetail HTTP serializer,
`controlled-event-recommendations.ts` projection and app route injection. Their
integration must be checked at the resulting exact head. Independent QA,
provider/media availability, real CDN behavior, native external-browser landing,
APK/device/UAT/Release are not established by the author fake tests. No service
restart/deployment, account write, model evaluation, real push, Gradle/APK or
device operation was performed here.

Private author logs are under
`/home/miku/.local/state/enmori-core-feedback-20261025/delivery/`;
they contain synthetic fixtures only and are not committed.
