# Route, session and long-wait investigation

Date: 17 November 2026, Asia/Singapore. Baseline: v79 source
`c6f138b90522f5d5131a55f190dffa8965cd3bda`, implementation `2925a7fc`.
Authority: [stable candidate review](../../decisions/2026-11-17-li-stable-candidate-review.md).
The observations below are source inspection and synthetic Flutter widget tests.
Physical-device observations belong to the main acceptance record.

## R-01 — An unchanged application composition rebuild discarded navigation

Priority: **本轮应修**. Status: minimal client fix and focused regression passed;
final candidate/device acceptance is recorded separately.

- Page: any active child route; regression uses the existing interest editor.
- Reproduction: establish the connected composition with an authenticated
  synthetic account, push `/interests`, select Art, enter `Art` in search, then
  rebuild `ControlledDemoApp` with the same URI, AuthRepository, HTTP client and
  feature configuration. No sign-out or authentication replacement occurs.
- Expected: preserve the same router, active editor, search and unsaved
  selection. An ordinary rebuild does not change the authenticated connection.
- Actual in v79: the router instance changes. Its new initial route is
  `/startup`, which the existing authenticated gate redirects to Home; the
  previous editor is disposed.
- User impact: an unexpected root rebuild can abandon navigation and local
  input, including the visible state of a pending save. This is a functional
  reliability defect, not a visual preference. Its occurrence during normal
  release-app use has not been established by this synthetic reproduction.
- Root cause: `ControlledDemoApp.build` constructed fresh `overrideWithValue`
  repository and route-builder instances on every build. Watched composition
  identities invalidate `appRouterProvider` and feature controllers.
- Minimal fix: retain that override list for the current connection. Recreate it
  when the endpoint, auth adapter, HTTP client or actual feature/processor/
  messaging configuration changes. Keep `onClose` current through the ordinary
  child rebuild. No redirect, session-identity, persistence, API, dependency or
  backend rule changed.
- Retest: unchanged composition now retains the router, editor selection and
  search. A pending interest save retains the disabled Save control, sends one
  PUT and accepts its one confirmed response after rebuilding. Existing actual
  connection replacement, same-subject session replacement, logout and stale
  callback tests remain passing.

Source: `lib/app/controlled_demo_app.dart` (connection lifecycle and overrides),
`lib/app/router/app_router.dart` (watched builders/session and startup gate).
Regression: `test/app/stable_route_lifecycle_test.dart`.

## The historical v79 return to Home remains unproven

The [v79 physical record](../2026-11-17-activity-plan-flow/physical-acceptance.md)
reported two pauses during automatic tool approval timeouts, followed by a Home
screen instead of the earlier interest editor. That record did not capture an
app-process change, actual authentication event or root-widget rebuild at the
transition. R-01 supplies a concrete route-reset mechanism but does **not** prove
it caused those particular phone observations.

Inspected boundaries:

- Firebase auth observes `authStateChanges`, not token/profile changes. Existing
  tests preserve an in-flight request over token/profile refresh and invalidate
  it on a genuinely new same-subject auth session.
- The app's content-access lifecycle boundary invalidates authorized content on
  background/foreground without directly navigating to Home.
- The router intentionally retires account-owned stacks on identity/session
  replacement. Startup and unavailable-state recovery lead to Home. Those
  fail-closed/session rules were retained.
- No app-owned idle timer that sends the interest editor to Home was found in
  the inspected route, auth, composition or interest editor code.
- The new widget test advances ten minutes in the foreground and ten minutes
  paused, then resumes through the normal lifecycle sequence. The interest
  route, unsaved selection and search survive, with one auth observation, one
  onboarding read and no mutation. This is fake elapsed time, not a physical
  twenty-minute durability observation.
- Process termination and activity recreation are separate from pause/resume.
  The inspected app does not persist arbitrary editor drafts or restore a
  complete route stack after process loss. Such persistence must not be added
  as an inferred requirement; the approved in-session draft and original-save
  recovery rules remain applicable.

Required remaining evidence for historical closure: reproduce a spontaneous
reset on the final candidate and correlate private device activity/process
events with app state, or retain the finding as unresolved after bounded
non-reproduction. A single successful retry/return cannot close it.

## Verification receipt

- FVM Flutter 3.47.2; existing locked dependencies, no dependency changes.
- **51 focused tests passed**, including three new route/lifecycle/save tests.
- Files run: `stable_route_lifecycle_test.dart`, `controlled_demo_app_test.dart`,
  `firebase_auth_session_test.dart`, `activity_shared_router_test.dart`,
  `startup_auth_retry_test.dart`, `app_router_test.dart`,
  `ai_conversation_shared_router_test.dart`, and
  `check_in_history_shared_router_test.dart`.
- Final command used `fvm flutter test --no-pub`, concurrency 2, expanded output.
- Analysis of the changed production file and new regression file: no issues.
- `git diff --check` passed at this checkpoint.

Local logs are under `/home/miku/.local/state/enmori-stable-audit-20261117/`:

| Log | SHA-256 | Meaning |
| --- | --- | --- |
| `route-lifecycle-before.log` | `1042b76fb82d100536bdd314d1429efe1b02395ee768321c6d238e63ef447c5a` | Initial harness used `routeInformationProvider` for an imperative push; that URL need not represent the top pushed route. This assertion was corrected before judging lifecycle behavior. |
| `route-lifecycle-before-corrected.log` | `27137a4585668e3e2a5fcce68a98cfbbf915b4f8c1039bca7b54710ec81d4c23` | Correct route-state assertion: long foreground/background test passes; unchanged composition rebuild fails before the fix. |
| `route-focused-final.log` | `e51365a4be20bd9dd6032a7b46ac69d4feb30097143e41be04399b29c71d105e` | Final 51 tests pass, including request-count, receipt and actual replacement regressions. |

No ADB operation, real account mutation, backend deployment or private capture
was performed by this source-investigation subtask. No real-user feedback,
emulator acceptance or physical pass rate is inferred from these tests.

## Independent review of the social presentation follow-up

Scope: LI's same-task social UI clarification in the review decision. Reviewed
`identity_avatar.dart`, `discovery_card_page.dart`,
`friend_discovery_panel.dart` and `friend_activity_panel.dart`, independently
of their implementation, using the repository Flutter code-review workflow.

No actionable new state, navigation or data-access defect was found in this
bounded production diff:

- The avatar change constrains the inner image/fallback to its requested square
  size while allowing the parent to occupy list width. It leaves the injected
  authenticated builder, current-route/foreground checks, authorized avatar
  reads and image disposal unchanged. Shared usages include friend lists,
  requests, participants, profiles and discovery settings.
- Discovery cards retain the minimal discovery-card endpoint, exact username
  check, private-profile disclosure, current-session View profile action and
  existing friend-request path. No field, read purpose or private projection
  was added.
- The extracted suggestion card invokes the same captured-session opening
  callback and existing version/epoch-bound Ignore/Undo callbacks. Ordering,
  group boundaries, preference locks, pending-count handling and lifecycle
  clearing remain unchanged. The additional labelled entry opens the same
  existing discovery-card action.
- Activity changes are confined to presentation and identity keys. Existing
  route, foreground, epoch and session checks, fresh purpose-bound event
  revalidation, source IDs, visible content fields and actions remain intact.
  The new key uses username/type/source-record identity; the existing adapter
  rejects duplicate type/source-record rows. Mood remains labelled as the
  Check-in's mood, not a present-state inference.

The implementing agent's 49-test social/identity regression log and changed-file
analysis were inspected and passed. The additional layout matrix initially
encountered a test finder error for a lazy offscreen action in English/Chinese
landscape; this was reported to the author before completion. Consult the
author's final UI evidence for capture details. The corrected matrix's final
log was subsequently inspected: **26 tests passed**. No physical social
acceptance is inferred; LI subsequently deferred phone acceptance.

Reviewed production-file SHA-256 values (identifies this review checkpoint):

| File | SHA-256 |
| --- | --- |
| `lib/core/presentation/identity_avatar.dart` | `7cb9d7443261dfaf86bd3a0af3b5c86eb6bc4cc7dfae59c9c36c5fdcff7a1df7` |
| `lib/features/friends/presentation/discovery_card_page.dart` | `6c31e598b945c9690385ca0cc979ccdf931ec1913cdff827ed332dfb7dd68d33` |
| `lib/features/friends/presentation/friend_discovery_panel.dart` | `4956dc2f97344b44876db7a19bd5052f4b099ddb65faab53cb616c8a2ca06cf2` |
| `lib/features/friends/presentation/friend_activity_panel.dart` | `924e72995c45f395cec1f044fde75a4faaf7f6dbde927d42da44c1f706ee80c0` |

## Recommendation Undo and interrupted-save scrutiny

Read-only review found no additional rooted issue in the inspected paths.
**74 tests passed** across `activity_plan_flow_test.dart`,
`participation_repository_test.dart`, `participation_feedback_test.dart`,
`check_in_pending_recovery_test.dart`, `check_in_from_record_flow_test.dart`,
`check_in_edit_flow_test.dart` and `located_check_in_flow_test.dart`.

- Recommendation Undo owns the page messenger and captured session/revision,
  so removal of the initiating card does not destroy the action. Confirmed Undo
  clears only ignored and keeps the confirmed participation status. Stale
  sessions/revisions cannot dispatch; an unknown result locks mutations until
  explicit readback and is not automatically resent.
- The real connected composer selects `LocatedCheckInController`. Its busy
  guard prevents duplicate dispatch; uncertain recovery retains the exact
  original key/payload and cannot silently turn edited text into another save.
  Existing tests also cover leaving a pending route, ignoring late results,
  copied-record drafts and revision-protected editing.
- Participation updates use the approved expected revision, not a fabricated
  idempotency header. Duplicate pending writes are blocked and conflict or
  unknown outcome requires a read before another mutation.

Command: `fvm flutter test --no-pub` with the seven files above, concurrency 2.
Local log: `undo-save-review-tests.log`; SHA-256
`7f032e12460811d803a69f78333d74ca07e64f5315f74e57129efc3a58133460`.
These fake Repository/HTTP/widget results do not establish real-network
interrupted-write behavior or phone acceptance of recommendation-list Undo.

Subsequent v80 physical interruption exposed an edit-page unknown-outcome Back
defect outside those assertions. See [the bounded repair and regression](edit-unknown-exit-review.md);
the earlier pass is retained as coverage evidence, not closure of that branch.

## Historical evidence follow-up: retained logs cannot establish the cause

This later read-only investigation preserves the preceding unresolved finding.
It inspected existing files only: no ADB action, new telemetry, production edit
or test rerun was performed. The source is the earlier
[physical acceptance receipt](../2026-11-17-activity-plan-flow/physical-acceptance.json)
and the current audit's retained `logcat-initial.txt`, not a new phone trial.

The receipt points to `/tmp/enmori-v79-acceptance-20261117` for its private raw
captures. That directory no longer exists. A bounded filename search under
`/tmp` and `/home/miku/.local/state` found no retained copies of the named
`26-offline-interest-read`, `27-online-interest-retry` or `31-current` captures.
The committed receipt retains timestamps and hashes, but those cannot replace
the absent raw activity/process observations.

The two relevant long capture gaps in the receipt are:

| Captures | Recorded times (SGT) | Interval |
| --- | --- | --- |
| 26 → 27 | 15:04:35.413 → 15:11:49.710 | 7 minutes 14.297 seconds |
| 30 → 31 | 15:12:46.208 → 15:20:02.529 | 7 minutes 16.321 seconds |

The accompanying earlier narrative reports Home after two automatic-review
timeouts. The time gaps identify observation intervals, not the instant or
mechanism of either route transition.

The retained `logcat-initial.txt` has these limits:

- Its `system` section spans 14:49:12.669–18:03:29.769; its `main` section starts
  only at 18:03:30.139. Main/Flutter output for the historical 15:04–15:20
  observation intervals is therefore unavailable in this file.
- The only seven ENMORI entries in that retained system section are ImeTracker
  records for PID 29835, at 14:49, 14:52, 15:00, 15:07:52, 15:28 and twice at
  15:29. These sparse observations are compatible with the same process
  surviving across the intervals; they do not prove continuous survival or
  exclude PID reuse, activity recreation or a route/session reset.
- No ActivityManager/ActivityTaskManager, process-death/kill, crash or Flutter
  lifecycle entry was available in the relevant interval to correlate with
  the transition. The absence in this incomplete retained evidence is not a
  no-crash or no-recreation finding.

Private log SHA-256:
`bc81bc29360f3c67eea1fe2cb5593083d643cd342a8dada3fd83c0d0592fceaf`.
No unrelated application content or private record identifiers are reproduced.

Conclusion remains **historical cause undetermined**. The rooted R-01
composition defect and its successful regression are separate evidence. Neither
this sparse log nor a later successful retry attributes the earlier Home
observations to that defect. Further investigation stopped at the available
evidence boundary; final-candidate non-reproduction must be reported with its
actual duration and conditions, without retroactively assigning a cause.

## v83 explicit exit and new Activity startup recovery

This later observation is separate from the historical v79 cause gap and the
v83 eight-minute lock-screen pass.

- At20:30:45, the observed profile was still loading current access. The
  operator then pressed Back twice; the second left ENMORI. The next input guard
  stopped at the foreground mismatch. This was an explicit exit, not an observed
  automatic long-wait route reset.
- The20:30:45 metadata records ActivityRecord122247964/task14813. After the
 20:30:50 normal launch,20:30:53 and20:31:40 metadata record
  ActivityRecord168238817/task14816. PID17953 remained the same. The Activity/task
  changed even though the process did not. By contrast, the long-lock trial
  retained ActivityRecord122247964/task14813 before and after.
- At20:30:53 the root page showed Service unavailable and Retry. The20:31:18
  retry capture still showed the error, and20:31:40 showed Home. The retained
  logs have a20:30:50.225 ActivityTaskManager Displayed record but no PID17953
  application log lines. They cannot identify the failing auth/account request,
  its transport outcome or a backend failure stage.

Source interpretation, not a captured Dart-engine lifecycle trace:

1. [MainActivity.kt](../../../android/app/src/main/kotlin/com/enmori/app/MainActivity.kt)
   uses ordinary FlutterActivity, calls the superclass destruction hook and
   does not provide/cache an engine or override its lifetime. The locally used
   Flutter3.47.2 embedding's FlutterActivity.shouldDestroyEngineWithHost defaults
   to destroying its own engine with the host; its delegate destroys that engine
   on detach. A fresh Activity can therefore create a fresh Dart/provider root
   without changing the Android process ID. No custom persistent restoration
   behavior is established by the same PID.
2. [The router](../../../lib/app/router/app_router.dart) initializes at startup
   (line275). [routerGateProvider](../../../lib/app/providers.dart) maps auth
   observation errors and onboarding result failures to unavailable (lines46–85).
   The real [account repository](../../../lib/features/account/data/backend_account_repository.dart)
   reads GET /v1/me/onboarding. The visible generic error does not distinguish
   transport, token, account response or parsing failures.
3. Retry at router lines1052–1066 invalidates the failing auth observation, or
   the current subject's onboarding read. Successful authenticated routing from
   unavailable intentionally goes to Home (lines1091–1117). The observed Retry
   recovery matches this source path; the failing input remains undetermined.
4. [AI conversation state](../../../lib/features/ai_conversation/ai_conversation_providers.dart)
   keeps current-topic identity and draft in session-owned RAM (lines42–48,
   1712–1734), with no disk restoration. Seeing the default new-topic surface
   after a new root is not evidence that server-saved messages were deleted.
   Their actual History readback is recorded independently.

SC-15 is an observed, recoverable **new-startup read availability issue requiring
diagnosis**, not an established Activity-retention bug. The profile access read
was not yet settled when the operator left. No causal attribution to SC-01 or
v79 is supported; no lifecycle/persistence change is proposed from this sample.

Private capture/state hashes are in
[the physical record](physical-acceptance.md#new-activity-after-explicit-exit-startup-error-and-retry-recovery).
Additional private log hashes:
- `v83-social-resumed-logcat.txt`:
  `881ba3860755c56191e912ed57753b054f13667101fd28abb4fbb059c82ad330`.
- `v83-social-retry-settled-logcat.txt`:
  `341f544288f2cee506ce01bdb57c617eceb5644f404600e442e1bf060048ec6d`.

Raw system/app captures remain private. This was read-only source/evidence
inspection; no new device operation, production edit or test rerun was made.
