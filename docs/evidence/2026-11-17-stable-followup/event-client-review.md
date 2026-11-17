# Event-detail client follow-up

Date: 17 November 2026, Asia/Singapore. Starting checkout: `6cad8527`
(the v83 audit record; installed v83 source `abc072ad`). Scope: read-only client
chain review, deterministic local reproduction, and an authorized minimal
client repair. No phone, remote service, backend, data, API, dependency or
business-rule changes were made by this subtask. No commit was made.

Authority: [the follow-up decision](../../decisions/2026-11-17-li-stable-candidate-followup.md),
[activity/plan flow](../../decisions/2026-11-17-li-activity-plan-flow.md),
[Event return rules](../../decisions/2026-10-26-li-reference-and-event-usability.md)
and their narrow [same-session five-minute preservation supersession](../../decisions/2026-10-26-li-v31-recovery-and-state-preservation.md).
The earlier [real-Event selection](../../decisions/2026-10-15-li-real-event-contract-selection.md)
and applicable later stable-event contracts remain unchanged. Used repository
`systematic-debugging`, `flutter-dart-code-review` and `flutter-add-widget-test`
within `AGENTS.md` and `ARCHITECTURE.md`.

## Result and historical boundary

A separate client defect was reproduced and repaired: a previous successful
detail snapshot's expiry timer could retire a newer manual refresh, discarding
both its success and failure result. The repair is two statements and one comment
in `ParticipationEventPage._load`: cancel/null the old timer when clearing the
old snapshot and starting the new read. Source/widget checks pass. No replacement
APK or physical-phone validation of this follow-up is claimed here.

This **does not explain or close the v83 event A failures at20:40:38 and20:41:03**.
Those captures show a service-error message after an initially unavailable
read, whereas the reproduced timer defect requires a successful snapshot in the
same page before a refresh near its expiry. No prior successful detail timer
has been demonstrated for the historical phone requests. A later new public
Event ID succeeding is also not proof of event A's cause or recovery.

## Actual client chain and candidate hypotheses

The installed participation-enabled route `/events/:eventId/participation`
constructs `ParticipationEventPage` in `lib/app/router/event_participation_routes.dart`.
It owns `_detail`, `_failure`, `_loading`, `_generation`, session identity and
expiry locally. It calls `eventDetailRepositoryProvider` directly; the separate
`EventDetailController` belongs to the legacy non-participation page and did
not control the captured v83 screen.

`BackendEventDetailRepository.read` sends one explicit
`GET /v1/events/{encodedId}?includeVenueAddress=true`, contract3, with an existing
30-second total token/transport/body budget. It then validates identity and
approved fields. There is no retry or error cache in this repository. The
provider shares the HTTP adapter, not a mutable detail result. Recommendation
and Browse controllers own separate snapshot/generation state; no direct
client invalidation from their refresh to this page's detail state was found.
Backend source/projection lifetime is a separate boundary under main diagnosis.

| Hypothesis and falsifiable check | Evidence and disposition |
| --- | --- |
| Failed details are cached and Reload does not issue another read. Return a failure, activate Reload twice before repaint, then complete the second read successfully. | New widget test passes: exactly two total reads, successful replacement visible, original failure gone. No sticky error or concurrent double-read reproduced. |
| A previous timer retires a newer pending refresh. Load successfully; advance4m59s; explicitly refresh; advance2s; complete new success/failure. | Reproduced on unchanged production: both new outcomes ignored. Fixed narrowly; both outcomes now render. |
| Background/foreground lets a retired result overwrite a new one. Hold first request, background/resume, finish the new request then the old one. | New test passes; only foreground details remain. Existing generation fencing preserved. |
| A same-UID replacement session accepts the old request result. Replace session during pending read, then finish old and new reads. | New test passes; prior session details rejected and explicit new-session read accepted. No identity/authorization relaxation. |
| Current real detail DTO is rejected by the Dart parser. Replay the main reviewer's later public-ID response through actual client/repository code. | One isolated fake-HTTP replay succeeds. This is only that response/ID; it does not establish old event A recovery or broad DTO compatibility. |
| The captured English text proves a local timeout. Compare owning error paths and exact copy. | Not supported: local timeout/transport uses different copy; the captured text matches the backend safe SERVICE_UNAVAILABLE catalogue. This is source-plus-screenshot inference, not an HTTP/request-ID trace. |

### Error translation limits

The detail page calls `localizedFailure`. English preserves `AppFailure.message`;
Chinese maps the typed failure category. For the captured English state,
“This service is temporarily unavailable. Try again.” matches the backend
`SERVICE_UNAVAILABLE` catalogue in `backend/src/shared/application/app-failure.ts`.
The general client's timeout/ClientException fallback is “The service is
unavailable. Try again.”; token retrieval has an authentication-unavailable
message; strict detail validation returns an invalid-event message. Thus the
observed exact copy supports a backend safe failure rather than the local
30-second timeout or DTO rejection. Without the original HTTP envelope/status
and correlation record it cannot identify which backend dependency failed.
No raw backend message, credential or event content is added to diagnostics.

## Rooted issue EC-01 — previous detail expiry discards a new refresh

Priority: **本轮应修**. User impact: a manual refresh close to the old snapshot's
five-minute expiry loses its loading state and then silently ignores a valid
new response or its specific error. The page falls back to generic unavailable
copy; another explicit refresh is needed. This is not a plan write and does not
itself change saved Interested/Going.

Baseline mechanism:

1. A successful read creates `_expiry`, whose callback calls `_expireDetails`.
2. Manual `_load` clears `_detail` and starts a new `_generation` while leaving
   the old timer active.
3. The old timer fires while the new read is pending. `_expireDetails` advances
   generation, clears loading and clears failure.
4. The newer completion fails the generation check and is discarded.

The minimal repair cancels/nulls that obsolete timer at `_load` entry, after
pending/session admission and before the old snapshot is cleared. It does not
retain old source content or extend its lifetime. New success still establishes
its own existing five-minute expiry; failure remains unavailable with Retry.
Old return-coordinator URLs remain gated by `sourceAvailable:false` while details
are absent. Session, background/disposal generation checks, duplicate-read
admission, participant/revision guards, write behavior and contracts are unchanged.

Independent review by the route reviewer found no actionable issue in the three
production lines or the five tests, including preservation of replacement expiry
and the return-action source gate.

## Verification and private evidence

- Baseline new file: **3 passed, 2 expected failures**. First run observed missing
  pending feedback when the old expiry fired. A second baseline completed the
  held responses and confirmed both new success and specific failure were lost.
- After the repair: **5/5 passed**, including both boundary outcomes, the
  replacement's own expiry, ordinary Retry/double activation, background return
  and same-UID replacement. All use synthetic repositories and widget fake time.
- Seven related files: **77/77 passed** using `fvm flutter test --no-pub
  --concurrency=2 --reporter expanded`: `participation_event_refresh_test.dart`,
  `event_official_details_test.dart`, `event_plans_test.dart`,
  `activity_plan_flow_test.dart`, `activity_shared_router_test.dart`,
  `event_actions_test.dart` and `event_detail_read_budget_test.dart`.
  These overlap the five targeted tests and are not summed as a unique total.
- Changed-file `fvm dart analyze` and `git diff --check` passed.
- The main reviewer supplied a later successful public-ID response for an
  offline replay. Actual `BackendApiClient` and `BackendEventDetailRepository`
  decoded it to `Success<EventDetail>` with the expected query/contract header
  and exactly one MockClient call. No network occurred. The temporary fixture
  contained no copied event body and was removed immediately afterward.
  Result: **1/1 passed**, separately from the77-test batch count.

First three log files below are under private
`/home/miku/.local/state/enmori-stable-audit-20261117/`; later logs and replay body
are under private `/home/miku/.local/state/enmori-stable-followup-20261117/`.
Only sanitized observations and hashes are recorded; no screenshots, raw response,
event identity/title/time/venue combination or sensitive log enters Git.

| Evidence | SHA-256 |
| --- | --- |
| `event-detail-refresh-before.log` | `bf32699bf655f17804cfba0a49907dfc22e234edd717448bd061dd37bbfa7565` |
| `event-detail-refresh-before-completion.log` | `0b4beee49e91f14f3cf569b90a08ff0dd006db5859c7d2cd5b47bb56c503060b` |
| `event-detail-refresh-after.log` | `f678c03a3b218c325726c0a27e6e31ef0a9d6bc42bd71780740ecf87a6de7332` |
| `event-client-regression.log` | `0567cd0b54f4a1ab03f4ebe3ec828b14e498bffda627db9931c2fb9ae98ed7bf` |
| `event-client-analyze.log` | `f8fadd8ff40cfaa5ed62227ce84cde0f0423bbfabcbd4b61a03849b8716574c9` |
| `event-detail-replay.log` | `673d142fc50f3e3e722f12ca1aaef2a4b4e5c4ae7fa3baa025296896dc60137e` |
| `fresh-ticketmaster-stable-detail-private.json` | `c9160e95bdb20d51d866d108cbb420f72d26052f321114d854bac48aa1893030` |
| `participation_event_page.dart` | `a25cb06dab5e08d6b4839f0161627837e652219def2eb03f305c7e92d02e3038` |
| `participation_event_refresh_test.dart` | `1f0ab48235d6b77d1b0d89c09d68580e9a12ed2a325e992661f17e6857a2918a` |


## Remaining acceptance

The original v83 detail failure needs its own service-side cause/recovery
assessment; neither this timer repair nor one later response replay closes it.
A replacement candidate must bind the repaired source to its APK and matching
backend, repeat the relevant existing detail/error recovery flows, and record
physical evidence separately. The deterministic four-minute-fifty-nine-second
boundary currently has widget evidence only. No claim of whole-app readiness,
provider reliability, photo/UI acceptance or a stable-release decision is made
by this report.
