# Connected UI/UX delivery — 21 October 2026

## Source and scope

- Independent branch: `souma/uiux-connected-flows-20261021` in the existing managed worktree.
- Exact starting integration HEAD: `74d886899c528d3cb930b21cc20987c433d2629b` (Draft #165).
- Target: `souma/li-zhou-runtime-20261020`, fetched again at `256763eb91c1f461127caf1cb738233759093264` before delivery. The latter fixes the owned-history field projection; it was not cherry-picked or reimplemented here.
- Authority: `docs/decisions/2026-10-21-li-history-footprint-chat-feedback.md`, the retained 19 October core-feature decision, `ARCHITECTURE.md` and repository skill routing.
- Shared deep-green/Playfair theme, Flutter/Riverpod/Repository structure and five bottom destinations retained. No dependencies, backend/API, credentials, host services or signing changes.
- Exact delivered head is recorded in the Draft PR description and final handoff (not embedded recursively in its own commit).

## Before / after journey checklist

| Journey | Before | Delivered and checked locally |
| --- | --- | --- |
| Home / Profile → records | History was labelled Footprint; map was buried in the social profile | Separate Check-in History and Footprint entries and routes; five bottom destinations; Check-in stays a Home action |
| History → calendar/date → detail → back | Existing date, calendar and pagination existed; normal detail omitted location/weather | Existing calendar/highlight preserved; list flags available saved location/weather; detail renders actual authorized snapshot, Mood, Note, Activity and visibility, with weather attribution |
| Footprint → node → exact record → back | Map selection replaced the social tab; map was not a discoverable own destination | Separate own/friend Footprint routes; points sorted chronologically, labelled Check-in point connections; exact ID read; detail Back reloads map so revoked points do not remain |
| Check-in draft → save → recover / return | Located save did not lock the editor; success left diagnostic readback as the main action | Pending/uncertain editor retains original draft; same idempotency key and payload; explicit retry only; unsaved Back confirmation; success shows snapshot, View saved Check-in, History and Home |
| Saved record → edit / location management | Historical location/weather were absent; location mutations were only reachable immediately after creation | Existing edit/delete kept; existing guarded replace/remove-location/remove-weather actions also available from owned saved detail, with confirmation and independent reread after revision change; the detail-entry test executes remove then replace and verifies both rereads and the resulting location/weather display |
| Chat send → wait → commit | Outgoing message appeared only after backend result; top-of-page feedback could be out of view | Local outgoing immediately after validation, explicitly unconfirmed; animated assistant ellipsis (static with reduced motion) and small status in message list; reconcile using authoritative user/pair identity; no optimistic persisted rows or auto-resend |
| Chat reading / keyboard / recovery | Newest-message following did not cover local pending feedback | Bottom proximity respected, deliberate older reading preserved, viewport changes followed only when already near bottom; consent, same-UID replacement, cancellation, unknown-result check and explicit retry retained |
| Friends search → profile → back | Leaving cleared the query and returned to an unfiltered list | Clears old rows but preserves the search query for a fresh authorized reread; session replacement still resets it |
| Events / AI / Profile consistency | Existing shared theme, event external-action confirmation, empty/error/reload, Persona and settings flows | Source review and existing affected routing/offline component coverage; no invented Event behavior or unrelated visual redesign |

## Contract handoff

No new backend route or schema is required. Reused:

- `GET /v1/people/:username/calendar-map?month=YYYY-MM&timeZone=...` → `days`, `points[{checkInId,createdAt,location}]`.
- `GET /v1/people/:username/check-ins?date=...&timeZone=...` and `GET /v1/people/:username/check-ins/:checkInId` → existing filtered records/detail.
- Existing own history/detail and guarded create/mutation repositories. New create accepts 201, replay 200, unchanged from the starting source.

Integration dependency: `256763e` adds `revision`, `mood`, `activity`, `location`, `weather` to the existing `/v1/me/check-ins` HTTP mapping. Without that integration-side fix, list availability labels cannot reflect stored snapshots even though the detail route works. It is already on the requested PR base, so no duplicate backend issue was created. The integration chat's real Firestore reads/restart observations are external evidence, not tests executed in this worktree.

## Checks and honest boundaries

Flutter 3.47.2; existing locked packages restored with `fvm flutter pub get --offline` (no manifest/lock changes).

One initial affected batch covered:

```
fvm flutter test --no-pub \
  test/features/connected_check_in_journey_test.dart \
  test/features/social_profile_flow_test.dart \
  test/features/located_check_in_flow_test.dart \
  test/features/check_in_calendar_flow_test.dart \
  test/features/check_in_pending_recovery_test.dart \
  test/features/check_in_edit_flow_test.dart \
  test/features/ai_conversation/ai_conversation_page_test.dart \
  test/features/ai_conversation/ai_conversation_controller_test.dart \
  test/features/ai_conversation/ai_conversation_recovery_test.dart \
  test/features/ai_conversation/ai_conversation_review_regression_test.dart \
  test/app/check_in_history_shared_router_test.dart \
  test/app/history_ai_home_router_test.dart \
  test/app/ai_conversation_shared_router_test.dart \
  test/harness/social/offline_social_feedback_test.dart
```

- Initial result: 231 pass, two behavioral/test-expectation failures, one new-test compile failure. Fixed the missing test import/session initialization, superseded History label expectation and demonstrated Friends return-query defect.
- Narrow reruns of the changed journey/router/offline cases: all 32 executed cases passed. One mistyped extra test filename failed to load; the correct `my_friends_test.dart` was then run with preview, 6/6 passed.
- Subsequent owned-record location wiring and keyboard-follow changes triggered only affected reruns. Fixed a test tap before scroll settled and preserved legacy harness recovery-status positioning. Final Check-in journey + AI page run: **65/65** passed. Located Check-in and shared History routing passed in the preceding affected run; no changes to those behaviors since.
- Additional connected Home/Profile navigation case: **1/1** passed, checking both real destinations and exactly five bottom destinations.
- Follow-up animation and detail-mutation verification: **81/81** passed across the Check-in journey, AI page, shared AI routing and offline social feedback files. Covers changing dot opacity, static reduced motion, animation removal, real controller remove/replace revision propagation and detail rereads.
- Final component preview/layout case: **1/1** passed at 375×812, and 812×375 at 2× text. Six PNGs alongside this file were inspected. Large-text landscape is scrollable, not an all-content-at-once layout.
- `fvm flutter analyze --no-pub`: clean. `git diff --check`: clean. Counts overlap and are not a unique-test total.

Preview freezes typing dots using the reduced-motion setting. Preview uses actual production widgets with explicit synthetic Check-in/chat data, local Roboto/Playfair fonts and disabled map tiles. No AI/model request, real-account write, real GPS request, public website, signed APK or phone acceptance was performed here. The map raster demonstrates nodes/lines, not successful OSM delivery. Final same-APK two-account permission/revocation, keyboard/Back on Android, real OSM, persistent readback and AI/model acceptance remain with LI integration.

## Preview regeneration

```
ENMORI_CONNECTED_PREVIEW=/tmp/enmori-connected-preview \
ENMORI_CAPTURE_FONT=/path/to/Roboto-Regular.ttf \
ENMORI_CAPTURE_ICONS=/path/to/MaterialIcons-Regular.otf \
fvm flutter test --no-pub test/features/connected_ui_preview_test.dart
```

The preview test does not download fonts or tiles. Playfair comes from the existing licensed repository asset. Screenshots are review evidence, not golden acceptance or real-data evidence.
