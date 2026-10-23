# Journal product round — 23 October 2026

Baseline `7cf12cd398eb1a613eff2e5c867af5a623428cf5`; branch
`souma/product-journal-20261023`. This worktree started clean and detached at the
specified baseline; the existing integration checkout was not modified.
Authorization and supersession: [Journal decision](../../../decisions/2026-10-23-journal-product-round.md).

## Delivered behavior

| User path | This round |
| --- | --- |
| New Check-in → save → saved detail | Retains existing default visibility/GPS/weather, single foreground capture, explicit location cancellation, same-request recovery and onward actions. Create/edit now share one keyboard-aware custom-label sheet. |
| Saved detail → Edit | Note first, shared Mood/Activity/place chips, custom text editing as well as quick labels, clear/reset, existing discard/revision/delete safeguards. Text changes preserve historical date/weather. |
| Profile → Check-in History | New Earlier/Later recorded-day actions use the complete **selected month's** server counts. They query the chosen civil date with the existing captured IANA zone. No all-history search or loaded-page filter claim. |
| History → Load more | Append and stable-ID reconciliation; transient next-page failure retains reading context. Reload/date/session/access changes clear it. Explicit authorization loss clears previously visible rows and hides recorded-day navigation. |
| Calendar → date/record → History | Existing month counts, day records and precise-ID location retained; destination copy corrected, same-date return rereads, highlight respects reduced motion, calendar cells and month heading accommodate large text. |
| Profile/own Footprint → point/nearby chooser → summary → detail | New selected-point card with ordinal, local timestamp, time gap and Previous/Next. Only the chosen record's authorized projection is fetched. Explicit Open Check-in uses its stable ID; return rereads the map. List fallback and attribution remain. |
| English/Chinese | Real UI/confirmation/error/semantics copy uses Integration's locale helper. SDK date delegates localize date labels. Original notes, saved custom labels, IDs, enum values and timestamps are not translated. |

Already existed, and not counted as new features: month statistics/heat markers,
daily records, Calendar-to-exact-ID return, basic History, map point connections,
nearby-point chooser, defaults, location/weather mutation, edit/delete.

## Integration boundary

No Backend/API, location purpose, new service, route, theme, third-party runtime
package or record/preference store was introduced. The shared SDK localization
prerequisites are Integration patches `91d1bd5`, `ab44e22`, `068be07`, cherry-picked
here as `9755eee`, `b9c8f97`, `afce8db`; do not apply them twice during integration.

`SocialProfilePage` changes are confined to record/calendar/map presentation plus
imports and an optional `recordBuilder`. Integration should pass its existing
`CheckInRecordView` through that builder in `ConnectedSocialProfile`, using the
existing approved attribution opener. Nested record routes forward the builder.
The fallback preserves existing standalone callers. Social owns `_profile()` and
relationship copy, including the Profile tab and friend-removal feedback.

App owns the shared WeatherCard translation and Settings locale persistence.
Journal reads the current locale; app restart persistence is outside this module.

## Verification

Isolated Flutter tests only, using synthetic repositories and no network map tiles.
All Flutter commands ran under the round's advisory lock; no APK/Gradle work.

- Initial 10-file batch: 56 passed / 6 failed (62 unique cases).
- Necessary 5-file retest after corrections: 26 passed / 1 failed.
- Final map/review retest: 5/5 passed, resolving the remaining case.
- Thus all 62 unique cases from the original batch passed in their final runs;
  this is not a claim of one uninterrupted 62-pass run.
- Final language/connected-creation/history batch: 18/18 passed (5 language,
  3 connected-creation, 10 history-controller cases). The history cases include
  three additional authorization-state variants beyond the original batch.
- Cumulative result: **73 unique affected cases passed in their final runs**;
  this is not a single uninterrupted 73-case suite run.
- Final scoped `flutter analyze --no-pub`: **No issues found** across changed
  presentation modules and affected test files. `git diff --check` passed.

Original batch: `check_in_history_controller_test`, `check_in_calendar_flow_test`,
`check_in_edit_flow_test`, `located_check_in_flow_test`,
`check_in_pending_recovery_test`, `social_profile_flow_test`,
`friend_discovery_activity_map_test`, `journal_review_flow_test`,
`check_in_history_shared_router_test`, `check_in_content_transport_test`.

The new cases cover monthly-date navigation with zone/cursor checks, retained
pages and duplicate IDs, authorization loss, selected summary revocation and
same-UID session replacement, custom labels save/reopen, exact map record opening,
375×812 and 812×375 calendars at 2× text, and reduced motion.

Reproduced defects and fixes:

- The month header Row had an unconstrained title at 2× text: constrained it with
  Flexible; grid height follows text scale and future dates expose disabled state.
- A next-page authorization failure used the transient-failure retention path:
  auth-required/forbidden/invalid, onboarding-required and Check-in-unavailable
  now remove the old rows.
- At 2× text the OSM attribution control overlapped the southernmost map marker:
  camera-fit bottom padding now accounts for scaled attribution height. The
  marker is reachable before browsing the next record.
- Remaining initial failures were test setup/interaction updates: authenticated
  state must be established before opening the social page; map selection now
  requires explicit Open; scrolling tests wait until controls are hit-testable.

## Fixture visual review

The following 375×812 production-widget captures were visually inspected:

- [English History](history-en-phone.png) and
  [Chinese History](history-zh-phone.png), normal text size.
- [English Calendar](calendar-en-phone-2x.png) and
  [Chinese Calendar](calendar-zh-phone-2x.png), 2× text size; content continues
  in the page's vertical scroll area.

The optional screenshot harness loads local Inter, Source Han Sans CN,
Material Icons and the existing Playfair Display asset. The CJK fallback is
fixture-only; it does not change production fonts or dependencies. Captures
confirm readable translated titles/date labels and preserved synthetic record
text; they do not establish a device's installed-font or accessibility behavior.

## Not run / remaining acceptance

Real Backend/Firebase persistence, cross-account revocation, OS GPS permission,
real weather, keyboard/TalkBack on a phone, restart locale persistence, final
shared recordBuilder wiring, APK signing/install and complete UAT remain with
Integration. No real records, shared service, device, key, deployment or merge
were touched. Fixture screenshots support layout review only.
