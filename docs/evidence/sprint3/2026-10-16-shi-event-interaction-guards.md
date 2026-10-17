# SHI Event interaction guards — 16 October 2026

Owner implementation/execution: SHI. Parent: [Sprint3#44](https://github.com/3427564237/enmori-app/issues/44). Reviewer: ZHOU. JIN retains unified candidate composition; LI cross-verifies Event/device behavior. This is a module-local repair, not a replacement page or another integration branch.

## Authority and exact input

- [Confirmed low-blocking kickoff](https://github.com/3427564237/enmori-app/blob/dd1994af69d861253356571d59317c549c879914/docs/decisions/2026-10-16-li-low-blocking-kickoff.md) and [actual SHI kickoff reply](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6217370295). Existing [EB01–EB06](../../decisions/2026-10-15-li-real-event-contract-selection.md), [external-open selection](../../decisions/2026-10-15-li-event-external-open-selection.md) and transient lifetime/disclosure rules control. No participation, registration result or people/count behavior is added.
- Reviewed candidate baseline: #130 exact9cf30134a522009f410485c6352df757ed0ab23d, already DU-reviewed. Its provider whole-second query encoding and original precise filtering are reused unchanged; #128/#130 reviews are not repeated.
- New branch: codex/shi-event-interaction-guards-20261016. Approved main tooling #131/d59cb128 was synchronized by merge8259073ab3ba78518f59f4abcf2e16437ca8ee4a; no main branch mutation, personal Skill install or additional tooling change. Those inherited32 files are already distributed main content, not new SHI product work or requested re-review.
- New source-only commit: **6ac1018929c200e2e684b25bef7ded4ddbf3a798**, tree **a1fdd77f6cbd4323462ae93ff614be3eb35a46ff**. Its parent8259073→product delta is exactly two Event presentation files and their existing feature test file. This one commit is the source-only integration unit for JIN; the main-tooling merge need not be replayed as product implementation.

## Demonstrated failures and minimal repair

1. **Rapid Reload:** after initial read, two taps before repaint invoked load twice and dispatched two refreshes. Original regression expected2 total repository reads but actually saw3, exit1. Hiding the button on the next frame did not serialize commands. load now returns while its current state is loading; no timer/generation restart or extra source request occurs for that duplicate action.
2. **Stale list selection:** background clearing immediately revoked the displayed list, but its queued ListTile callback still forwarded the old locator before repaint. Original regression expected no selection but received the synthetic locator, exit1. The callback now checks the exact displayed AsyncValue snapshot against current controller lifetime/auth/expiry before forwarding. It also rejects old snapshots after refresh even if the source locator is unchanged, failure, expiry and disposal.

No UI copy, theme, layout, routes, API, source projection/URL policy, provider request parameters or participation state changed. Existing guarded source open/copy and background/return explicit Reload remain intact. In-flight network cancellation is not claimed: clear invalidates old results, permits an explicit fresh request, and the late old result cannot replace it. Duplicate admission protection applies to the same live loading state, not a global lock on an invalidated old call.

## Actual verification on this source

Existing Flutter3.47.2 / Dart3.13.2, locked packages, no installation or upgrades.

| Check | Actual result | Boundary |
| --- | --- | --- |
| Initial rapid-Reload regression | Fail: expected2 reads, actual3 | Unchanged source, before repair |
| Initial cleared-list queued callback | Fail: expected none, actual synthetic selection | Unchanged source, before repair |
| Event feature file | 16/16 Pass | Six new cases included, not added again |
| Feature + shared Activity router + external opener | **33/33 Pass, exit0** | Repeated on final formatted/committed source; Auth/HTTP/platform fixtures |
| Full Flutter | **664 Pass /1 Fail, exit1** |665 cases; unchanged symlink-negative fixture cannot create link under Windows OS1314 before consumer invocation |
| Fatal-info analysis | Pass, no issues | lib/test/integration_test |
| Three changed Dart files format | Pass,0changes | Non-writing final check |
| Whitespace/protected paths | Pass | Two implementation files + test only versus synchronized parent; Backend/API/bootstrap/router/Android/operator/locks unchanged versus#130 |

The full suite was run before and after the test-file formatting adjustment; both yielded664/1. They are repeated executions, not extra distinct cases. The symlink test was neither skipped nor weakened, and the full suite is not called green. LI's earlier #127 Linux659/symlink1 success remains cleared at that source but does not certify this new665-case source; a capable-environment current-head run is still needed. The early non-writing format check reported one unformatted test file; formatting was applied and final checks rerun. Both original product failures remain preserved above.

Commands (pinned FVM SDK; this Windows execution used its existing Dart executable and Flutter snapshot directly):

```text
fvm flutter test --no-pub --reporter expanded test/features/event_browse_test.dart test/app/activity_shared_router_test.dart test/app/external_activity_opener_test.dart
fvm flutter test --no-pub --reporter expanded
dart analyze --fatal-infos lib test integration_test
dart format --output=none --set-exit-if-changed lib/features/event_browse/presentation/activity_controller.dart lib/features/event_browse/presentation/activity_page.dart test/features/event_browse_test.dart
git diff --check 8259073ab3ba78518f59f4abcf2e16437ca8ee4a 6ac1018929c200e2e684b25bef7ded4ddbf3a798
```

Coverage includes successful list→Detail→Back separation from recommendations; explicit open/failure/copy fallback without registration state; pending/background/return, same-subject replacement and logout; first-batch empty versus dependency error/Retry; 320px/large-text disclosures; original5-minute expiry; and the six new interaction/late-result cases. No new provider calls are made by the tests.

## Handoff and remaining localized gates

- ZHOU: independent review of the new source-only commit and necessary evidence; accepted #130/#131 components do not need another review. This source is not self-approved.
- JIN: consume the focused source commit into the identified unified candidate and execute its applicable changed-source gate. Shared Home/router/bootstrap/runtime were not edited here. JIN new-code reviews remain separately assigned to SHI when new heads are delivered.
- LI: Event device/browser/return and applicable source-disable/client-clear/owned-copy cross-verification on a later authorized fixed candidate. Current disposable runtime/private handoff has expired; demonstration preparation is paused. This delivery does not restore it, request another key, start competing Emulators or operate any phone/model/provider.
- Current-head full-suite symlink capability check, Android/native/browser/clipboard/real-provider and APK checks are **Not Run or incomplete as specified**, not transferred from older evidence. Human accessibility/TalkBack and any iOS gate are not replaced by widget tests.

This source/tests/evidence packet is delivered independently of phone availability and old Draft merges. Keep Draft/Open. No main merge, Issue/Project transition, runtime activation, Event participation scope expansion or whole-app/S3/UAT/Release/Done claim. The22:50SGT first-packet estimate is a local work forecast, not a new project deadline.
