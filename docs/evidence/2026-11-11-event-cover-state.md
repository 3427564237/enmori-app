# Event cover state repair — 2026-11-11

## Scope and finding

The user's urgent demo report was that Events displayed `Event cover unavailable`.
This bounded repair distinguishes absent source imagery from an actual image-load
failure in the existing list and detail surfaces. It adds no event data, provider,
dependency, persisted data, endpoint, or deployment change.

An authenticated read of the existing Azure `/v1/event-browse` returned 19 events.
Only six contained `coverImageUrl`; the first five contained no cover URL. A
read-only Discovery query showed that the earliest events supplied only
`fallback: true` images. Ticketmaster's official
[Discovery API documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
defines these as fallback images rather than the event's image. The existing
backend intentionally excludes them. This is not evidence of a universal image
download failure, and treating those category images as real event photos would
misrepresent the source.

## Change

- Missing source cover: themed neutral event icon with `No cover provided by
  source.` / `来源未提供封面。`, shared by cards and details.
- An actual supplied URL that fails to load: `Cover could not be loaded.` /
  `封面加载失败。`.
- The placeholder grows with text size. Existing load, cancellation, expiry,
  authentication, image-size and safe-host constraints remain intact.

## Checks

- Flutter 3.47.2: 14 repository tests passed across
  `event_information_test.dart`, `mobile_event_card_test.dart` and
  `event_cover_loader_test.dart`. Coverage includes absent cover without network
  I/O, failed supplied cover, a 320-pixel phone at 2x text size, existing navigation
  actions, decoding/disposal, and cancellation across lifecycle/auth changes.
- Full `fvm flutter analyze`: no issues.
- All six current cover URL entries returned HTTP 200 with `image/jpeg`, using
  the loader's `Cache-Control: no-store` and `Accept-Encoding: identity` request
  headers. Bodies were 91,449–130,477 bytes, 1024x576 or 1024x683.
- A temporary Flutter engine codec probe decoded all six downloaded JPEGs
  successfully. It passed in the same test invocation (15 total including this
  local-only probe). Provider media and the probe are not included in Git.
- `git diff --check`: passed.

These are operator-host network, Flutter codec/widget and static-analysis checks.
They are not physical-phone or release acceptance. No backend deployment is
required; the frontend change needs the next APK build/install.
