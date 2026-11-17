# Startup availability and Retry feedback follow-up

Date: 17 November 2026, Asia/Singapore.

**Result:** one deterministic client Retry-feedback defect is repaired and
locally verified. The original v83 startup-read failure (SC-15) remains
unattributed. The historical v79 Home-return cause (SC-09) remains separate.
There is no new APK or physical acceptance claim in this subtask.

## Authority and baseline

- [LI's follow-up authorization](../../decisions/2026-11-17-li-stable-candidate-followup.md)
  permits rooted minimal client repairs and regression. It does not authorize
  backend, contract, funding or infrastructure changes.
- [The original audit scope](../../decisions/2026-11-17-li-stable-candidate-review.md)
  requires truthful loading/error/recovery feedback and preserves state/session
  rules. [ARCHITECTURE.md](../../../ARCHITECTURE.md) requires application-owned
  auth observation and a waiting surface while resolving; UI cannot establish
  identity or authorization.
- Source investigation began at clean HEAD
  `6cad8527e1df108c1bd7663b1455a1cac8855cb8`. The physical baseline remains v83,
  built from `abc072adfdae57e4cdd0fd7c9de4b2bbfe21a445`, APK SHA-256
  `7dd81dfdc2783a58cd6acfbf5d446000b1c35312364f25e5975d4160270fc9b8`, with the
  matching v78 backend. The production edit described below is not installed.
- Applied repository workflows: systematic-debugging, flutter-add-widget-test
  and dart-flutter-patterns, under the routing and dependency constraints.

## Observed incident and evidence limit

The original [physical record](../2026-11-17-stable-candidate/physical-acceptance.md#new-activity-after-explicit-exit-startup-error-and-retry-recovery)
and [route investigation](../2026-11-17-stable-candidate/route-review.md#v83-explicit-exit-and-new-activity-startup-recovery)
retain the capture/log hashes and exact chronology:

- The operator explicitly exited with two Back actions at about20:30:45 and
  launched MainActivity again. Before/after ActivityRecord and task identities
  differ, while PID17953 stayed the same. This is a new Activity/task, not the
  same-Activity lock-screen case. The separate509.5-second lock trial retained
  its Activity and unsaved interest state.
- At20:30:53 the new root displayed Service unavailable with Retry. A20:31:18
  post-Retry capture still displayed that error; by20:31:40 Home was available.
- Retained logs contain the20:30:50 ActivityTaskManager Displayed event, but
  no PID17953 application log lines. They do not identify the failing token,
  auth observation, account request, HTTP result or response parser. Capture
  intervals include operator actions and cannot be reported as request latency.

The local Android/Flutter source explains why a new Activity may own a fresh
engine/provider root despite the same PID. It does not establish the observed
service error's cause. No device operation or new remote request was made by
this investigation.

## Traced failure and recovery chain

1. `bootstrap.dart` creates FirebaseAuthRepository and the approved HTTP-backed
   composition. `FirebaseAuthRepository.watchSession()` observes
   `authStateChanges`; token/profile refresh alone does not create a new
   authenticated-session object. Vendor token failures are normalized to
   Result failures.
2. The application-owned `authSessionProvider` exposes that one observation.
   `routerGateProvider` maps auth observation error to unavailable, and an
   authenticated subject to `onboardingStatusProvider(subject)`.
3. BackendAccountRepository reads **GET /v1/me/onboarding** through
   BackendApiClient. Token acquisition, dispatch and body read share the
   unchanged ordinary15-second budget. There is no automatic transport retry.
   Timeout/client/other transport failures normalize to unavailable; invalid
   response/account fields normalize to unexpected. The gate maps these
   non-auth/config failures to the same generic unavailable page.
4. The existing Retry callback invalidates the errored auth observation, or
   the current subject's onboarding read. A successful authenticated gate from
   unavailable intentionally reaches Home. None of these failure sources is
   distinguishable from the v83 generic error capture alone.

The client repair does not change this chain's authority, timeout, failure
mapping, endpoint, parsing or navigation destination.

## Rooted client defect: Retry keeps showing the old failure

**Reproduction:** inject an auth-stream error, an account Result failure, or an
account Future error; show the existing unavailable page; select Retry; hold
the replacement observation/read pending.

**Expected:** show the existing waiting feedback while one explicit retry is
in flight. The previous terminal failure must not appear to be the result of
the still-pending retry, and repeated activation must not start another read.

**Actual before repair:** in all three cases, the provider has `isLoading=true`
and the replacement operation has started, but the old error and Retry remain
visible. All three new widget tests fail at the missing waiting surface.

**Cause:** Riverpod refresh retains the prior AsyncData/AsyncError while marking
it loading. The existing gate folds the retained terminal value and remains
unavailable. The original route body does not subscribe to the pending state,
so unchanged gate identity does not update its feedback. This is a deterministic
client presentation mechanism; it is not proof of the initial v83 service
failure's cause, nor proof that the photographed post-Retry frame was pending
rather than a second failed read.

## Minimal repair

Only the unavailable route block in
[app_router.dart](../../../lib/app/router/app_router.dart) changes:

- A local Consumer observes auth and the current subject's onboarding state.
  While either is loading, it renders the existing StartupPage waiting surface.
  The route remains `/unavailable`; the global gate and redirect rules do not
  change, preserving the existing recovery destination.
- The existing Retry callback checks the current loading state before
  invalidation. Two activations before the next frame admit only one new
  observation/read.
- A completed retry failure returns to the existing error/explicit Retry.
  No automatic retry, new copy, persistence, timer, dependency, identity rule,
  backend behavior or write operation is introduced.

## Reproduction and verification

[startup_retry_loading_test.dart](../../../test/app/startup_retry_loading_test.dart)
contains five focused cases covering account Result failure, account Future
error, auth observation error, pending double activation, unchanged route path,
successful recovery, another failed retry without automatic repetition over
30 simulated seconds, and sign-out retiring the old account completion.

- **Baseline:**3/3 tests failed on the expected missing waiting surface, before
  any production edit. No harness/compilation failure is counted as a defect.
- **First repair check:** those same3 tests passed.
- **Final focused regression:**20/20 tests passed across the five files below,
  including existing auth single-observation/retry and route-lifecycle tests.
- **Focused analysis:** no issues in the changed router and new test (5.3s).
  `git diff --check` was clean. Full-suite/build/physical verification belongs
  to the integrated candidate and is not claimed here.
- **Independent review:** the UI/task reviewer read the final production diff,
  five new fixtures and20/20 log, and verified the production/test hashes below.
  No material issue was found in the local waiting display, repeated-activation
  guard, unchanged gate/redirect authority or late-completion sign-out boundary.
  Production and test files are frozen for root integration.

```text
fvm flutter test test/app/startup_retry_loading_test.dart \
  test/app/startup_auth_retry_test.dart test/app/router/app_router_test.dart \
  test/app/stable_route_lifecycle_test.dart \
  test/features/auth/firebase_auth_session_test.dart --reporter expanded
fvm flutter analyze lib/app/router/app_router.dart \
  test/app/startup_retry_loading_test.dart
```

Logs remain in the private existing directory
`/home/miku/.local/state/enmori-stable-audit-20261117/`; only sanitized hashes are
recorded below. No private screenshots, identifiers or raw logs enter Git.

| Artifact | SHA-256 |
| --- | --- |
| `startup-retry-loading-before.log` | `e9b6ae3459e31dcbe84edd45c8dfc69222489efe6f9119c3a24a0eefb0d0c3c2` |
| `startup-retry-loading-first-fix.log` | `765e53103afc98d932adc7c845322dd68c9af8c8d0fd2a8f3073a31606731f20` |
| `startup-retry-loading-regression.log` | `0f96ced09b297dde0996a8cb179be67b8ff51e02e3edec35e2e690e6b71b9b6c` |
| `startup-retry-loading-analyze.log` | `2edfebc0816603f4063f2c53bbe8f955db422ec4cf250b0203e310e86e269118` |
| Reviewed `lib/app/router/app_router.dart` | `76bb26014ea79b5c33cac8dc5b74f23b3f2c65dcf5bba56c1f56a16f82b28596` |
| `test/app/startup_retry_loading_test.dart` | `a99222160ff7947804df7502e509e3c20b6a6799fc92e37cb154ea7f823c8a93` |

## Remaining diagnosis and acceptance

SC-15's first startup failure still needs a bounded per-stage causal receipt:
auth observation versus token acquisition versus account dispatch/body/status
versus response validation, correlated with Activity/task and explicit Retry.
Existing read-only service checks can establish present availability but cannot
attribute the old incident. Any new persistent telemetry/backend instrumentation
requires its own defined fields, privacy/lifetime scope and authorization.

On the next integrated APK, verify one deliberately failed startup read,
explicit Retry with visible waiting, success and another failure, and retention
of the existing account. This local regression is neither that phone acceptance
nor a closure of SC-09/SC-15 service reliability or the independent AI grant
blocker.
