# Recommendation-card hide failure feedback

Date: 17 November 2026. Source baseline: v82 `e5cdb7bc`.
Priority: **本轮应修**. Status: bounded client repair, focused regression and
independent source review passed; the SC-13 unconfirmed-operation feedback path
was subsequently observed on the installed v83, as recorded below. Successful
Hide/Undo and a subsequent My plans readback were also observed on that same
package, with separate bounded evidence below.
Authority is the [current stability review](../../decisions/2026-11-17-li-stable-candidate-review.md)
and the [approved activity/plan flow](../../decisions/2026-11-17-li-activity-plan-flow.md).
The latter requires successful Ignore to offer Undo while retaining revision,
unknown-write reread and Hidden recovery rules. No rule is changed here.

## Separate the physical observations from the rooted component defect

The root reviewer initially selected Ignore after a long recommendation
session. The page reloaded without an observed confirmation or Undo. My plans
then showed the original nine records and zero hidden entries. This does not
prove that a hide succeeded, that a write was dispatched, or that success lost
its Undo. The original recommendation read began more than five minutes earlier;
source expiry is a possible explanation, not an established cause.

A fresh v82 trial subsequently confirmed Hide, showed Undo after the card was
removed, accepted Undo and displayed Recommendation restored. My plans again
showed nine records, Interested 1, Going 2, None 6, Hidden 0. This bounded
physical success is retained in the main physical record. It is not a reason
to attribute or silently close the preceding unconfirmed attempt.

Read-only tracing and a complete recommendation-page widget reproduction
isolated a different, concrete feedback defect:

1. `RefreshOnReturn` treats a popup covering/uncovering its page as a return.
   Closing More event options can start a fresh recommendation read.
2. While that read is pending, the recommendation page removes its cards.
   A participation write may still be in flight.
3. `ParticipationController` correctly records a failed write as uncertain.
   Its inline “Change not confirmed” feedback belongs to the removed card.
4. `ParticipationControls.change` previously returned immediately on a failure;
   its captured page messenger was used only by successful Hide/Undo. The
   current page therefore had no indication of the failed/unknown hide while
   the recommendation read remained pending.

The participation save path does **not** use `afterContentMutation`; the earlier
Check-in recovery defect is not this root cause. The prior single-card Undo
tests did not instantiate the full page's menu-return refresh and therefore
did not cover this feedback loss.

## Minimum repair

Only `participation_controls.dart` production behavior changes. A hiding action
whose result is not confirmed now shows the existing bilingual
“Change not confirmed. Check your plans before making another change.” text
through the page messenger captured before the asynchronous call. It checks
the existing messenger-mounted, current-route and identical-session guard.
It does not claim that the event was hidden, cancel the request, replay a write,
or unlock uncertain participation state.

Successful Hide and Undo retain their original code path. Popup-return refresh,
five-minute invalidation, source availability, snapshot contents, ordering,
revision checks, participation data and Backend/API contracts are unchanged.
No unrelated refresh or expiry repair is included.

## Verification

Permanent tests in `activity_plan_flow_test.dart` now use the full
`EventRecommendationsPage` and actual `ConnectedRecommendationCard`, with
separately delayed recommendation reads and participation writes:

- English/Chinese: fresh hide confirmation survives removal of the card,
  offers Undo, and Undo restores ignored=false while preserving Interested.
- English/Chinese: failed/unknown hide sets the controller's uncertain state,
  shows the existing check-plans feedback even while the card is absent, and
  does not resubmit after 20 seconds of simulated time.
- A same-subject replacement session and navigation away both suppress the old
  request's late feedback and perform no additional write.

Before production repair, the corrected bilingual tests had **2 passes and
2 expected failures**: success/Undo already worked; failure feedback was absent
in both languages. After repair, **80 tests passed** across
`activity_plan_flow_test.dart`, `participation_feedback_test.dart`,
`participation_repository_test.dart`, `event_plans_test.dart` and
`activity_shared_router_test.dart`, using `fvm flutter test --no-pub`,
`--concurrency=2 --reporter expanded`.

Intermediate harness errors involved snackbar animation timing, a misplaced
test-only assignment, and constructing a page before the session resolved.
The final fixture resolves authentication first as the real router does, then
holds the recommendation refresh. Both late-feedback tests executed and passed;
their earlier setup timeouts are not reported as application guard failures.
Changed-file static analysis found no issues; `git diff --check` passed.

The independent UI reviewer inspected the production diff and confirmed its
scope: it captures text before awaiting, does not access a removed card's
context after completion, preserves current-route/session checks, and leaves
success/Undo and write contracts unchanged.

| Evidence | SHA-256 |
| --- | --- |
| `card-menu-feedback-before.log` | `b7d58aecd57c770d8b0787dfffdfb198f70bd26699c19251eefa3baaa8d56580` |
| `card-menu-feedback-regression.log` | `b91a4ae26e3918b7cf9e7a6f7c98e076ce8856e5da501d3e92c4f5524eb3abfd` |
| `card-menu-feedback-analyze.log` | `50d783e5e73e35fcd3fb321fb800c97a864ba98764f99d01184e2617c9d0cda2` |
| Reviewed `participation_controls.dart` | `fc840400bc702f808702038d26566d56636471c99c1531140759d1a7029fa20d` |

These tests use fake repositories and are not real-network acceptance. They
do not establish why the first v82 phone attempt made no confirmed change.
Restoring participation state is distinct from immediately reinserting a card
into a concurrently refreshed recommendation snapshot; the latter is not
claimed by this fixture. At this component-test checkpoint a replacement APK
still needed to repeat the confirmed Undo and unconfirmed-operation feedback
paths. The later v83 observation below supplements only its stated scope.
Private captures and raw logs remain outside the repository.


## Final-candidate v83: bounded physical SC-13 feedback recheck

The main operator tested the installed v83 APK (source `abc072adfdae57e4cdd0fd7c9de4b2bbfe21a445`,
SHA-256 `7dd81dfdc2783a58cd6acfbf5d446000b1c35312364f25e5975d4160270fc9b8`)
and reported selecting Ignore on an existing Interested-plan recommendation
while the network was disconnected. The UI reviewer did not operate the phone;
they independently inspected the two private screenshots and capture receipts.
Both receipts identify PID17953.

At20:39:39 SGT, the recommendation card is absent and the page shows Event
recommendations unavailable with Retry. Above the bottom navigation, the
page-level message is fully readable: “Change not confirmed. Check your plans
before making another change.” It is not covered or cut off by the navigation.
At20:39:43 the same recommendation error remains and the snackbar is no longer
visible. These observations are consistent with short-lived feedback; they do
not establish its exact display duration.

**SC-13's specific lost-feedback defect has a bounded physical pass on v83:**
the failed/unknown hide feedback remains visible even after the originating card
has disappeared. This is separate from the original v82 attempt whose dispatch
and outcome were unconfirmed; no causal attribution for that attempt is added.
The disconnected operation is still an **unknown result**, not a confirmed
non-submission or confirmed successful hide. Persisted My plans readback and a
successful Hide/Undo on this same final package are separate checks still being
performed at this checkpoint. This paragraph does not close those checks.

The operator's independent finally restoration receipt records original and
restored Wi-Fi/mobile-data values of1/1 with no restoration errors. This verifies
the recorded setting restoration, not subsequent request connectivity. Images,
raw logs and account data remain private; only filenames, hashes and sanitized
observations are included here.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-card-failure-immediate.png` | `f1c9bc356365300dd3132f7e75ed8030af8b73c4081f94f80027e9bba3dac4bb` |
| `v83-card-failure-immediate-state.json` | `edc6acf279b27da495a4d08ef1051f08ad5e89836a055ef76e75388226536d50` |
| `v83-card-failure-later.png` | `46015b9370f0f8df24f92ec1777c158b149f586af38ab19e20a12c8923bd7068` |
| `v83-card-failure-later-state.json` | `a1fced94f2ae10bf6932a3623b3de810b2d0a76295ba24369d5735b3b5e8d4c2` |
| `v83-card-failure-network.json` | `a52efb86bf9a548ed7b4ecfa3a48195a410ab53346a976af366ba2a053e7e8fd` |


### Subsequent v83 plan verification: preserve unknown-state semantics

At20:40:10, My plans showed nine loaded records and counts Interested1, Going2,
No current participation6, Hidden0. It also explicitly warned that some changes
were unconfirmed and counts used the last confirmed choices. These counts are
**not confirmation that the disconnected hide did not occur**. The20:40:22
Interested row likewise said “Change not confirmed. Open to check your plans.”
The UI reviewer independently viewed both warnings.

The operator then opened that row to check its current participation. At20:40:38,
the independently viewed detail image shows Interested selected and no longer
shows the unconfirmed-change warning; the operator reports the participation
verification completed. Event information itself remains temporarily unavailable,
with an explicit refresh instruction and copy that saved Interested/Going choice
is unchanged. This separates a participation-state verification from a failed
external event-information read. It does not establish final aggregate Hidden
counts, source recovery or a successful Undo; those observations follow
separately. Network setting restoration alone is not evidence of event-service
availability.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-plans-after-failure-loaded.png` | `8bcd7c7a87a8bc21f4911da9b92f9a52054445781448df164da6d03b902be587` |
| `v83-plan-interested-after-failure.png` | `8a565461531d510804c8379ac4258ed67b736f2449f026b10781af8a8aff7458` |
| `v83-plan-check-unknown-loaded.png` | `f757fbae0988fbeb0cd1138ff3669e8f9f8e553d6b2ad151736742765ed4497e` |


## Final v83 successful Hide/Undo and subsequent plan readback

The main operator subsequently repeated a fresh recommendation-card Ignore for
the existing Interested activity A on the same installed v83/PID17953. The
20:43:54 private image independently reviewed here shows the original card is
no longer in that captured position, while a page-level “Hidden from
recommendations” message and Undo action remain fully visible. Other
recommendation content is present, with its own participation check in progress.
The operation's source card being removed therefore did not remove its Undo.

The timing receipt records an Undo tap at20:43:54.633661 SGT after observing
`v83-fresh-card-hidden-4`. The20:44:03 capture shows “Recommendation restored.”
The reviewer independently verified both messages visually. The receipt's
`secondsAfterIgnoreToolReturned` measures time from a tool return, not snackbar
visibility or HTTP duration; it must not be used as the Undo window length.

At20:44:36, a separate My plans loaded image shows nine records, Interested1,
Going2, No current participation6 and Hidden0, with “All available records
loaded” and without the earlier unconfirmed/last-confirmed-values warning.
This is the final observed plan readback after the successful Undo, distinct
from the20:40 snapshot that still had unconfirmed changes. The latter remains
an unknown-state observation and is not retroactively treated as confirmation.

Together these are a bounded final-package pass for confirmed Hide offering
usable immediate Undo despite card removal, the restored confirmation, and the
subsequent plan readback. They do not establish immediate reinsertion of the
original card into the current recommendation snapshot, all providers/error
modes, long-term consistency, or why the first v82 attempt had no confirmed
change. The final Interested count remains1; this aggregate image alone does not
identify an individual record. No private event title, scheduled date, venue
combination or account identifier is reproduced here. Activity A is only a
sanitized test-reference alias.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-fresh-card-hidden-4.png` | `8e18f70a14973712fa957ddecd4c58ce03dfcf481c675e82c7d1a88fd7c76f10` |
| `v83-fresh-card-hidden-4-state.json` | `07ad1df277ad593b944494a17053a7b5b8fb3353b41f795f1ff9a1db12a81110` |
| `v83-fresh-card-undo-timing.json` | `99afc191acd9b4b589eab16d9d17283a10e535beacb8fd2348bda5bc195d7fc8` |
| `v83-fresh-card-undo-result.png` | `d12e5c8cca0517e40b894ac1124f347113b8dcab72a1cbd5dc1a406d8bc8600b` |
| `v83-fresh-card-undo-result-state.json` | `bedb672705513528fa78b864ce73904a5cb13e6526e73b61926749b231ccd790` |
| `v83-plans-final-loaded.png` | `341f2410556459d7dea98c12bb6981010df87704b3ec9d24a0c7a4d61bd5f4e0` |
| `v83-plans-final-loaded-state.json` | `b6744490cdfdc40abe1da579bb7fcf7f4c521737b1dfdb6d7b5f7dbb52d64a86` |
