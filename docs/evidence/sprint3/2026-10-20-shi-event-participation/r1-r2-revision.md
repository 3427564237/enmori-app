# #167 R1/R2 focused correction

Original reviewed head `02197c93abd1ff6bfdc9ece6fc43ab2da2979f32`;
ZHOU review requested two P2 corrections. Product correction `01d46d80ddddd5c61457d4111240ac75209dd427`
(tree `e22c7575e71fae65e5c41d350d0c8d98e311e010`); following changes add only this
record and braces around an unchanged test-only HTTP capture statement.

## Root causes and bounded repairs

R1: rendered callbacks captured old ignored/status but `change` adopted the
controller's newest session/facts/revision. All four write buttons now capture
the authenticated observation and exact fact object displayed, and call
`changeRendered`, which checks both observations, event identity and the same
expected fact object **before** local state change or Repository dispatch.
Rejected stale actions do not reset state, write, or silently upgrade versions.
Normal freshly rendered buttons remain usable. Existing browser-flow session
guards, server CAS and unknown-result read-before-retry remain unchanged.

R2: `batch(page0)` forwarded new provider rows without publishing them into the
shared generation, leaving both Detail paths on an older first-page cache.
An explicit page-zero refresh now invalidates the prior generation, publishes
one cloned/frozen replacement atomically, and exposes the replacement pending
read to concurrent first-batch readers. Old first/next reads cannot overwrite
it; disable/clear fences still apply. Later-page forwarding/identity, source
limits, consent, Music mapping and ranking are unchanged. No new API or field.

## Actually executed (Node24.19.0 / pinned Flutter3.47.2/Dart3.13.2)

- Before R1: **0 Pass /12 Fail** in new `participation_rendered_action_test.dart`.
  Actual `tester.tap` hits still-visible buttons before repaint, not a manually
  invoked discarded closure. Matrix: cross-UID, same-UID replacement, same-session
  new revision, each Interested/Going/Cancel/Ignore. The same tests after fix:
  **12/12 Pass**, including a fresh Cancel positive control preserving ignored=true
  and expectedRevision7 in every case.
- Before R2: new source-generation file **0 Pass /2 Fail**: OLD versus NEW Detail,
  and a stale pending first read incorrectly succeeding. Same assertions after:
  **2/2 Pass**. The source probe uses the actual Ticketmaster adapter with only
  HTTP replaced, not a live-provider claim.
- Strict TypeScript compile Pass. Changed source/generation/browse/disable suites
  **17/17 Pass**, exit0. Command:
  `node --test backend/dist/test/event-source-generation-regression.test.js backend/dist/test/controlled-event-projection.test.js backend/dist/test/event-browse-pagination.test.js backend/dist/test/controlled-event-browse.test.js`.
- Affected Flutter regressions **51/51 Pass**, exit0:
  `flutter test --no-pub --no-test-assets --reporter expanded test/features/participation_rendered_action_test.dart test/features/participation_journey_test.dart test/features/event_participation_components_test.dart test/features/participation_repository_test.dart test/features/external_registration_flow_test.dart`.
  Same documented test-only NoSplash/no-assets limitation; not shader/visual proof.
- Scoped Dart analysis initially found one missing-braces info in the new test;
  corrected without suppression. Final analysis/format and full PR-range whitespace
  are checked at publication. Also removed the reviewer's nonblocking trailing
  blank line at the end of `api/event-participation-contract.md`.

Previous Backend72, Flutter43, actual SDK4 and their failures retain their original
source attribution. Unchanged Emulator/storage/full-app/device suites were **not
rerun** for these two fixes; no new counts are borrowed. No live provider, shared
runtime, phone, deployment or account mutation. ZHOU independently decides current
head/thread disposition; SHI did not resolve or approve his own findings. LI keeps
final composition and device acceptance. Draft/Open, no merge or board change.
