# App round 2 — Home day review

Authority: `docs/decisions/2026-10-23-li-product-round2.md`, verified against the actual human reply in source chat `01a15293-dbcf-75e2-b020-398d61d677cb`. Common baseline: `4d9cbf926d356320bc9b4721031e3c50dddd9fae`. New branch: `souma/product-round2-app-20261023`; Draft PR target: `souma/product-round2-integration-20261023`.

The previous App branch remains at `deb11e4b6ccec640e87771ebc87f32eb8638919b`. The baseline contains that delivery and its integration commit; recovery implementation was compared before branching. The original worktree was clean. No old commits were replayed.

## Audit and selected increment

| State at common baseline | Evidence / decision |
| --- | --- |
| Available | Home Today/New Check-in/weather/recommendations/social sections; saved owner details; Profile history/calendar/Footprint; language selection; draft recovery; My plans. |
| Missing daily loop | Home offers creation but no saved day content from which to revisit a particular moment and continue an existing Journal action. Users must leave Home and find the record through history. |
| New in this increment | Home reads the owner's current civil day and shows up to three actual saved entries. Open an entry, use its existing detail actions or Journal's separately delivered new-draft action, and return to a fresh Home read. |
| Explicitly not counted as new | Language switching, monthly statistics, My plans, preference recovery, existing editing/deletion. |

Keep `2026-10-23-li-product-experience-refinement.md`: Home remains focused on Today, Check-in, weather and Events. The full history and personal tools remain in Profile. Integration narrowed this App increment to the day summary only; no second participation summary or tool-button grid is added.

## Consumer and source contract

- `HomeShellPage.daySection` is optional composition content immediately after New Check-in in both existing presentations. Integration injects `HomeTodaySection` only when the real history slice is available. No default fake source or new readiness claim.
- `HomeTodaySection.onOpenCheckIn(String id)` and `onOpenHistory()` return `Future<void>` completing after navigation returns. Integration supplies source/session-guarded routes, using existing saved-ID detail and history routes. The history action is labelled as opening history, not as a guarantee that its independently selected date is replaced.
- `homeTodayProvider` consumes the existing `checkInRepositoryProvider.readOwnForDate(date, timeZone)` and `historyDevicePortProvider`. It does not import/read the history controller's selected date. It is a bounded read-only view projection, not a second writable repository, preference, record store, or cache.
- Capture IANA zone and current civil date for each read. Query only the first page (the server's existing 20-record page), keep source ordering, display at most three, and format only those three instants through the same captured zone. A cursor or additional loaded entries means more may exist; no total, streak, aggregate or automatic pagination is inferred.
- Backend confirmed the existing endpoint enforces verified UID/auth-binding ownership, civil-day bounds and owner/date/zone-bound cursors. Rejected optional recommendation consent does not prohibit owner reads. No API, data use, sharing or permission expansion is needed.
- After a content mutation receipt, session replacement (including same UID), background transition, explicit refresh or navigation return, old content is not rendered as current facts. Failed rereads display a recoverable failure, not an empty day or stale records. Empty sparse pages with a cursor do not claim there are no saved records.
- A cancellable local-midnight timer only schedules invalidation. The next read recaptures the native zone/date; the timer never supplies query dates. Backgrounding disposes that timer and does no reads. Returning to the foreground recaptures zone/date, including changes made in device settings while away. No periodic backend polling.
- User notes/moods remain original; application copy is English/Chinese. Precise location, weather, visibility, and other optional fields are not projected into this summary.

Journal owns all record operations. Its round-2 old-detail-to-new-draft flow is consumed through the same existing detail ID, without copying record facts in Home. App has no write command, consent change, or source-record mutation.

## Acceptance and evidence

Meaningful acceptance paths:

1. Home reads the captured day/zone, displays up to three entries, and does not fetch later pages. Reading a different History date does not change the Home date.
2. Open an entry, edit it in its existing detail flow, then return; Home rereads instead of retaining a navigation snapshot. Deletion similarly disappears only after source readback.
3. Fail the reread: old content disappears, a clear retry is shown, and retry can recover to actual empty or populated state.
4. Switch session, background or cross local midnight during a slow read: stale completions cannot populate the new view; foreground/day refresh uses current native date/zone.
5. English/Chinese summary remains navigable at 2x text, reduced motion, small portrait and landscape sizes.

App authored 13 tests in `test/app/home_today_test.dart`, using repository/device fakes and real provider/widget behavior. Integration ran all 13 successfully in the serialized Flutter window. This is source/fixture coverage, not real service or device proof. Initial targeted analysis reported only two `curly_braces_in_flow_control_structures` info diagnostics in `home_today_section.dart`; both if bodies were enclosed in braces with no behavior change. Integration will recheck these in assembled analysis; a clean post-fix result is not yet claimed. Executed commands:

```sh
fvm flutter analyze --no-pub lib/app/home_today_provider.dart lib/app/home_today_section.dart lib/app/home_shell_page.dart test/app/home_today_test.dart
fvm flutter test --no-pub test/app/home_today_test.dart
```

Central logs: `/home/miku/.local/state/enmori-product-round2-20261023/app-test.log` and `app-analyze.log`. Local checks: SDK `dart format` and `git diff --check` completed. App did not run Flutter/Gradle, operate shared services, touch real accounts, install to a phone or build/sign/deploy an APK. Integration owns shared roots/router/theme and final assembled validation. The Backend owner separately offered isolated owner read→edit→read compatibility evidence. The large-text/landscape checks are widget layout evidence; no new App screenshot or physical-device visual acceptance is claimed.
