# Social product increment — 23 October 2026

Base: `7cf12cd398eb1a613eff2e5c867af5a623428cf5`.
Branch: `souma/product-social-20261023`.
[Scope and authority](../../decisions/2026-10-23-li-social-product-increment.md).

## User paths and composition

- Events → **My plans** → Interested / Going / Hidden / All records → existing
  stable-ID Event detail → change/check existing participation → return. Pages
  accumulate instead of replacing earlier results; a failed next page preserves
  its cursor. Filters apply only to loaded facts. Cancellation tombstones stay
  available in All records. Hidden is independent of participation.
- Profile reuses `OwnParticipationSection` and the same derived records; committed
  revisions from the existing participation controller override older pages.
  Unknown outcomes remain explicit and cannot issue an automatic retry.
- A Friend Activity event row opens the corresponding Event directly after a
  bounded, fresh, category-specific read matches username/type/source record/ID.
  Revoked, replaced or missing activities cannot reuse an old card to navigate.
  Home uses the same component and callback. Check-in activity remains on its
  existing authorized detail path.
- Friends and Events UI supports the shared English/Chinese locale. User content,
  source categories/titles, interest names, Username and wire enums are preserved.
  Journal supplies the separate record/calendar/map translations.

Navigation contract for Integration:
`EventPlansPage({required ValueChanged<String> onOpenEvent, VoidCallback? onBack})`
in `lib/features/event_participation/presentation/event_plans_page.dart`.
`ParticipationEventsPage.onOpenPlans` is optional; it is visible only when wired.
Integration owns `/event-plans`, the authenticated callback/session/path guards
and the existing `/events/:eventId/participation` destination. This Social branch
improves the already wired Profile section immediately; the new Events entry
requires that Integration route patch. No fallback empty callback or fake save.

Shared Integration commits are prerequisites, not Social inventions:
`91d1bd5` → local `499b37c`; `ab44e223` → local `873f5bd`;
`068be07` → local `4546d9f`. Only the final Social implementation commit needs to
be cherry-picked after those helpers are present. The direct SDK localization
dependency was supplied by Integration; no third-party dependency was added.

## Verification

Validation used Flutter 3.47.2 with the round's exclusive
`flutter-validation.lock`; no shared service or heavy build was started.

- Offline dependency resolution passed. The scoped production/test analysis
  passed, followed by clean analysis of the final changed controller and fixtures.
- The 14-file affected suite initially passed 96 of 98 cases. Three subsequent
  access-loss cases were added. The bounded final rerun of `event_plans_test`,
  `friend_search_test` and `event_recommendations_page_test` passed 33 of 34;
  the remaining search fixture was corrected and then passed all 5 cases.
  Together, all 101 distinct cases have passing results; the entire suite was
  not rerun after the bounded fixes.
- The two initial failures were fixture defects: the authenticated Home route
  omitted its observed auth session and invoked the unavailable adapter's retry;
  the search IconButton exposes its accessible name through `tooltip`, while the
  test incorrectly expected a nonempty `label`. The 48dp assertion itself passed.
  Fixtures now supply their session and assert the exact search tooltip. Product
  retry or accessibility behavior was not weakened.
- Plans coverage includes cumulative/sparse pages, deduplication by revision,
  retry cursor retention, cursor cycles, double clicks, confirmed/unknown writes,
  detail return preserving filter/pages/scroll, unavailable source management,
  same-subject session replacement and background retirement. Explicit
  auth-required/auth-forbidden/onboarding-required responses retire rows and
  cursor, suppress derived old facts and invalidate callbacks from old snapshots.
- Direct activity-entry tests check an exact source among multiple rows, a
  different friend sharing the same event ID, repeated clicks, and revocation
  during the fresh read. Chinese tests preserve user/source strings and wire
  enums, cover relationship feedback and cancel external registration without a
  participation write.

The 14 files are `event_plans_test`, `social_localization_test`,
`friend_activity_event_entry_test`, `friend_activity_display_test`,
`friend_activity_canonical_test`, `event_batches_test`,
`participation_feedback_test`, `event_participation_components_test`,
`participant_preview_test`, `friend_search_test`, `my_friends_test`,
`friend_ignore_flow_test`, `friend_discovery_activity_map_test` and
`event_recommendations_page_test`, all under `test/features/` with `.dart` suffix.

Eight layout cases passed with reduced motion: English 375×740 at 1× and 2×,
Chinese 375×740 at 2×, and English 800×400 at 2×; each ran light and dark color
schemes. PNGs were visually inspected for reading order, title font fallback,
wrapping and readable controls. The 2× captures are deliberately scrolled to the
plan card. Dark uses a seeded test theme, not evidence of a shipped dark-mode
setting. Preview-only local Roboto/CJK/icon fonts correct the test engine's lack
of device font fallback; no production font dependency was added.

Previews are under the task's local `build/social-preview/` directory, named
`plans-{en|zh}-{375|800}-{1|2}x-{light|dark}.png`. Tests use fake Repositories /
synthetic HTTP responses, never real relationships or participation writes.
These PNGs are widget previews, not device screenshots.

## Remaining acceptance

Integration must verify the actual Events route, global persisted locale,
external-browser return, live owner-list readback and two-account permission
revocation on its frozen candidate. Supplier content can remain unavailable
when its current projection expires; saved participation facts remain manageable
without fabricating a title or a booking. No new Backend contract is required.
No shared service restart, real account operation, APK/signing/device action,
merge, deployment or Release claim was performed by Social.
