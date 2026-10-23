# Social round 2 — visible plan comparison

Base: `4d9cbf926d356320bc9b4721031e3c50dddd9fae`.
Branch: `souma/product-round2-social-20261023`.
Authority and product distinction:
[bounded selection](../../decisions/2026-10-23-social-round2-plan-comparison.md).

## New user loop

Visible Profile participation → Compare with my plans → compare the person's
current Interested/Going with the owner's real saved choice → open the existing
Event detail → save/check the owner's choice → return to a fresh comparison of
the same public page. Revisiting reads the persisted existing facts. No comparison
command writes data or creates an invitation, notification or participation copy.

Current My plans, activity entry, filtering and localization remain previously
shipped capabilities. The addition is the private two-person comparison and its
read/change/return loop, not a repackaging of those features.

## Integration contract

- `EventPlanComparisonPage` in
  `lib/features/event_participation/presentation/plan_comparison_page.dart`:
  required `String username` and
  `Future<void> Function(String eventId) onOpenEvent`, optional
  `VoidCallback? onBack` for a guarded direct-route return fallback.
- `UserParticipationSection.onComparePlans`: optional `VoidCallback` entry.
  Integration supplies it through `groupParticipationBuilder`, covering both
  top-level and Friends-internal Profile composition.
- Integration owns `/people/:username/plans/compare`, authentication/route guards
  and the awaited existing Event detail destination. Only immutable Username and
  Event ID are passed; the comparison reads current facts itself.

The existing Repository and shared `ParticipationController` are the sources.
Foreign pages are replaced, not accumulated; each has at most 20 source rows.
At most three owner reads run concurrently. Empty filtered pages may still have
Next. Invalid cursor cycles/oversized pages are refused. Owner read failure,
busy and uncertain states are unknown, never `none` or a shared-choice count.
A failed public read clears foreign content and retains only a retry cursor.

Content invalidation, backgrounding, username/session changes retire old foreign
content and callbacks. Before opening an Event, the current public page is read
again and must contain the exact selected Event. Covered comparison content is
cleared; returning re-reads. Known authorization failure during owner reads also
retires the public page and stops subsequent batches.

## Backend compatibility

Backend confirmed the existing APIs suffice. `forUsername` re-resolves viewer,
target, eligibility, block and participation privacy on every request. Its page
is an original-record window, not a timestamp order or a guaranteed 20 visible
items; cursor is bound to viewer and target. Own participation GET does not
require the supplier source. No API, schema, dependency or infrastructure change
is needed. Backend's separate synthetic verification is recorded in its
`2026-10-23-round2-backend-consumers.md`; Social does not claim it as live runtime.

## Bounded verification

Integration ran the requested checks under the round's exclusive Flutter lock.
The verified code/test head is `6c2ec77460324b6815191825c94510d2bfd8c5b3`.
Final result: **13 unique cases have passing results**, with clean scoped
production analysis and clean final test-file analysis. Direct cached Dart
formatting and `git diff --check` also passed.

- Initial attempt stopped at compilation: two lifecycle fixture calls incorrectly
  awaited a void result. Removing those awaits, an unused import and a missing
  if block resolved this; no cases executed in that attempt.
- The next batch passed 11 of 13 cases. The lifecycle fixture had paused Flutter
  before expecting a new rendered frame. It now follows inactive → draw and
  assert both cleared controller state and removed content → paused → resumed,
  with guaranteed resume teardown. Its bounded rerun passed.
- English 360px/2× text still put the target below the lazy viewport cache;
  `ensureVisible` could not find an unbuilt element. The last fixture correction
  uses bounded real scrolling to build the card, retaining hit-testability,
  source-title and no-exception assertions. The single English rerun passed.
  This made no product layout change and did not weaken the assertions.
- Repeated passes are not added to the count. The aggregate is 11 + 1 lifecycle
  + 1 English case, not a claimed final full-suite run. Three bounded correction
  attempts ended here; no further module tests or fixes were run.

Coverage: 20-row/read-concurrency bounds, sparse pages and explicit next/retry,
cursor cycles, malformed oversized pages, authorization loss during owner reads,
content invalidation/late response, duplicate navigation rechecks, missing public
source, same-subject replacement session, owner failure represented as unknown,
public permission error represented as an error, the Profile-entry/detail-save/
return/revisit loop, background/resume reauthorization, and English/Chinese
360px/2× layouts with reduced motion. The existing shared controller remains the
sole mutation source. No screenshot or device acceptance is claimed.

Retained central logs in the local round-two handoff directory:
`social-analyze-retest.log`, `social-test-retest.log`, `social-two-retest.log`,
`social-one-final.log`, `social-test-analyze-final.log` and
`social-test-analyze-last.log`. Initial failures remain in `social-analyze.log`
and `social-test.log`.

Central commands (full file followed by bounded name filters):

```sh
fvm flutter analyze --no-pub lib/features/event_participation/presentation/plan_comparison_controller.dart lib/features/event_participation/presentation/plan_comparison_page.dart lib/features/event_participation/presentation/user_participation_section.dart test/features/plan_comparison_test.dart
fvm flutter test --no-pub test/features/plan_comparison_test.dart
fvm flutter test --no-pub test/features/plan_comparison_test.dart --name 'background clears foreign content|comparison fits 360px at 2x text in en'
fvm flutter test --no-pub test/features/plan_comparison_test.dart --name 'comparison fits 360px at 2x text in en with reduced motion'
fvm flutter analyze --no-pub test/features/plan_comparison_test.dart
```

Fixtures use synthetic repositories and the real existing participation
controller/detail UI. Integration must additionally check shared route
composition and the final application candidate. No real service, account,
phone, deployment, signing or model operation was performed by Social.
