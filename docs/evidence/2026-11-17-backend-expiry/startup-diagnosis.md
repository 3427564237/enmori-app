# Initial startup failure: source and retained-evidence diagnosis

Date: 17 November 2026, Asia/Singapore. Source baseline:
`4ad2b4b79db40d58ae3489fab9e24e5f73182867`.

**SC-15's initial v83 Service unavailable remains unattributed.** This follow-up
identifies the complete startup request chain, distinguishes several routes
that do not match the observed page, and verifies eight offline cases. It finds
no additional rooted client defect requiring a production change. The v84 Retry
waiting-feedback repair and SC-09's historical Home-return gap remain separate.

Authority: [LI's narrow repair and diagnosis decision](../../decisions/2026-11-17-li-expired-projection-repair.md).
The subtask used systematic-debugging and the repository's Flutter/Backend
boundaries. It performed no physical-phone or emulator action, remote request,
backend/configuration write, production-code change or commit. The root reviewer
owns emulator operations and acquisition of existing remote evidence.

## What the historical evidence establishes

- At20:30:45 the operator explicitly exited ENMORI with Back actions. The
  subsequent20:30:50 launch created a different ActivityRecord/task in the same
  PID17953. The20:30:53 capture showed Service unavailable, and Retry recovered
  Home by20:31:40. This is not the earlier same-Activity lock-screen trial.
- Four retained Android log snapshots covering the incident were rechecked.
  They contain the20:30:50.225 Displayed event, but zero PID17953 application-log
  entries in the20:30–20:31 window. No token result, HTTP status, request ID,
  parsing failure or Dart gate transition is available for correlation.
- Root's21:33 SGT read-only Azure log acquisition extends the earlier metadata
  check. The17 November application file was last updated at21:07 SGT, but its
  recorded listening events are11:09 and13:02. The platform log's last update
  is13:02. Both files contain zero entries for12:30–12:32 UTC (20:30–20:32 SGT).
  No matching-window restart is recorded. This is **absence of a causal record**,
  not proof of uninterrupted requests, healthy dependencies or no restart.
- The composed Fastify app has `logger: false`; the ordinary remote app does
  not install the isolated-only controlled-phone request diagnostics. An
  application log file's recent modification time therefore cannot establish
  per-request visibility.
- Existing operator-host onboarding GETs at21:07:59 and21:08:01 returned200
  in2.111s and1.572s with identical response hashes. They prove later endpoint
  availability from that host; they do not reproduce the phone's earlier token,
  transport, Activity or request state.

Original capture hashes and Activity identities remain in the
[v83 route review](../2026-11-17-stable-candidate/route-review.md#v83-explicit-exit-and-new-activity-startup-recovery).
The previous [Retry repair report](../2026-11-17-stable-followup/startup-review.md)
preserves its separate red/green regression and acceptance boundary.

## Actual startup failure chain

| Boundary | Source behavior and failure consequence |
| --- | --- |
| Client composition | `bootstrap.dart` validates the compiled configuration and initializes Firebase. Invalid configuration or caught initialization failure uses UnavailableAuthRepository, whose typed configuration failure routes to **Setup unavailable**. |
| Session observation | FirebaseAuthRepository observes `authStateChanges()`. Initial/loading waits; signed-out enters registration; an observed authenticated identity permits the account read. A non-configuration stream error routes to generic **Service unavailable**. |
| Client token | BackendApiClient calls FirebaseAuthRepository.getIdToken. Missing user/empty token returns AUTH_REQUIRED; disabled user returns AUTH_FORBIDDEN. Other Firebase/native exceptions can normalize to unavailable. A token-stage failure can occur before any onboarding HTTP request. |
| Client transport | Token acquisition, HTTP headers and body share the existing15-second ordinary budget. Timeout, ClientException and other native exceptions normalize safely to unavailable; a malformed successful response becomes unexpected. Both can reach the generic unavailable gate. |
| Server identity | GET /v1/me/onboarding uses `buildAuthenticate` and FirebaseIdentityVerifier. Token verification includes revocation checking. Invalid identity maps to401; revoked/disabled identity to403; other verification dependency failure to503. |
| Server account lookup | GetOnboarding calls FirestoreOnboardingRepository.getStatus. Its transaction reads the auth binding and account projection. Missing binding means onboarding required; invalid/missing bound account, invalid projection or transaction exception means503. |
| Additional remote initialization | In retained-core-runtime, a completed account result is followed by `await initializeOwner(uid)`. A second transaction validates binding/account and checks five owner-support records, idempotently creating missing ones; it may also initialize the existing purpose-revocation field. An exception here reaches Fastify's safe503 mapping **even after the first account lookup succeeded**. |
| Client projection and gate | BackendAccountRepository parses status plus the approved account fields. Auth/config failures use their dedicated routes; other returned/parse failures use generic Service unavailable. The page therefore cannot identify which preceding stage failed. |

Here `initializeOwner` initializes account-support records; it is unrelated to
the AI service-owner lease used during deployment. This account-support
initialization transaction is an existing startup-interface behavior,
not a proposed new write or a newly discovered production regression. This
subtask neither invokes nor changes it. Read-only operator diagnosis of a GET
should still account for these existing server-side idempotent prerequisites.

Relevant source: [client auth adapter](../../../lib/features/auth/data/firebase_auth_repository.dart),
[transport](../../../lib/core/network/backend_api_client.dart),
[account adapter](../../../lib/features/account/data/backend_account_repository.dart),
[root gate](../../../lib/app/providers.dart),
[server authentication](../../../backend/src/transport/authenticate.ts),
[account transaction](../../../backend/src/onboarding/infrastructure/firestore-onboarding-repository.ts),
[retained composition](../../../backend/src/bootstrap/retained-core-runtime.ts),
[safe framework failures](../../../backend/src/bootstrap/build-app.ts).

## Offline discrimination and stored-response replay

A temporary test used the actual BackendApiClient, BackendAccountRepository and
routerGateProvider, with synthetic auth observation and an in-memory MockClient.
The host was `synthetic.invalid`; no network listener or real request was used.
The final case replayed the already-retained21:07 response directly from its
private file without copying its fields into a fixture or report.

| Injected condition | Observed gate | HTTP sends inside the fake |
| --- | --- | --- |
| Token-channel exception | unavailable | 0 |
| Transport exception | unavailable | 1 |
| Structured SERVICE_UNAVAILABLE503 | unavailable | 1 |
|200 with invalid completed-account projection | unavailable | 1 |
| Valid structured AUTH_REQUIRED401 | signInRequired | 1 |
| Valid structured AUTH_FORBIDDEN403 | forbidden | 1 |
| Missing backend configuration | configurationUnavailable | 0; token calls0 |
| Retained successful onboarding body | authenticated | 1 |

**8/8 passed**. This demonstrates diagnostic ambiguity and the compatibility of
the later successful payload. It is not eight real-service requests or eight
reproductions of the physical incident. The temporary test was removed from
the repository after execution; a private source copy and log are retained for
reproduction. No new permanent test or production edit is left by this subtask.

## What can be separated, and what remains open

| Candidate explanation | Supported conclusion |
| --- | --- |
| Same-Activity lock-screen state loss | Does not describe this observed sequence: explicit exit and Activity/task replacement are evidenced. It says nothing new about SC-09. |
| Missing compiled configuration or caught Firebase initialization failure | The known path renders Setup unavailable, not the recorded Service unavailable. No evidence supports this as the observed branch. |
| Normal signed-out or onboarding-required state | Known routes are registration/onboarding, not generic unavailable. |
| A correctly parsed401/403 authentication failure | Uses sign-in/account-unavailable routes. A malformed error envelope or other auth dependency failure can still be generic; authentication failures as a whole are not excluded. |
| A persistent parser mismatch with the later successful response | Local replay reaches authenticated, so that particular retained response is compatible. A different malformed incident response remains possible. |
| onePA or the expired shared-event projection directly failing onboarding | Neither is called by the traced onboarding/token/account/owner-initialization chain. Shared host/network/resource contention is not excluded by this source separation. |
| AI grant expiry directly gating onboarding | The traced account route does not consult the monetary grant. Shared host shutdown/admission problems would require independent evidence; no renewal or configuration change is justified by the capture. |
| Backend restart at the incident | No matching-window restart is recorded, but available operational logs are not complete request/lifecycle proof. |
|15-second client timeout | The first error capture is only a few seconds after Activity display, so a fresh full-budget timeout is not demonstrated. Without actual operation-start and phase timestamps, no timeout stage can be assigned. |
| Token, transport, server dependency/owner initialization, or invalid response | All remain possible generic-error branches. No incident-correlated status/request ID or phase receipt distinguishes them. |

The v84 Retry presentation fix addresses a reproducible retained-failure/loading
state. It does not establish why the initial v83 request failed, or whether the
later error screenshot was a pending retry or another terminal failure.

## Root-operated emulator: controlled offline counterexample

The root reviewer subsequently installed the exact v84 candidate on the API36
emulator (APK SHA-256
`b544dde5ba9060b5fb20ce822ec19a6f44e6e96c9c268e3664122afed0a581d0`),
signed in with the existing dedicated test account and reached Home. The
connected backend remained the deployed v78, not the new undeployed expiry repair.
With emulator Wi-Fi and mobile data disabled, force-stop/relaunch produced
**Service unavailable / This service is temporarily unavailable. Try again.**
and Retry. This subtask independently checked that exact text in the retained
`emulator-offline.xml` and hashed the screenshot/XML; it did not operate either
the emulator or physical phone.

This is a controlled **offline emulator reproduction of the same generic
surface**, further demonstrating that the text is not unique to a backend503.
It neither proves that the20:30 phone was offline nor distinguishes token
refresh from transport failure in this emulator run.

In this first completed recovery round, the operator restored networking and
selected Retry. The independent visual review of
`emulator-online-retry-immediate.png` shows **Opening your space…** with a spinner
and no Retry/error panel; the corresponding XML confirms that waiting state.
The later `emulator-recovered-home.xml` contains Home and New Check-in, with no
generic startup error. This is a bounded pass for the **v84 release APK's
explicit Retry waiting and connected recovery on API36**.

It is emulator/live-v78 evidence, not a physical-phone recheck, attribution of
the historical SC-15 incident, proof of sustained service health or validation
of the new backend expiry repair. The root reviewer records any second round
and Back/relaunch results separately; they are not presumed complete here.

## Useful next evidence and emulator limits

A signed-out emulator can test native configuration/engine reattachment with
one normal Back exit and new Activity launch, retaining Activity/PID and safe
Firebase error categories. Reaching registration verifies only the unauthenticated
branch. It cannot verify the authenticated onboarding gate or close SC-15.
The root reviewer operates the existing emulator; this subtask did not touch it.

For stage-level reproduction, use an isolated authenticated synthetic harness
with controlled token/HTTP outcomes. Capture only operation phase, elapsed time,
safe failure category, HTTP status/request ID and Activity/task correlation.
This can verify the v84 waiting/retry boundary without real account content.
It still cannot retroactively attribute the20:30 incident.

A future real recurrence needs correlated client token/dispatch/body/parse and
server identity/account/owner-initialization receipts. No token, body, UID,
username, account-document path or complete URL is needed. A new production
diagnostic sink/deployment/retention policy remains outside this authorization;
its specific fields, retention and execution scope require approval first.

## Sanitized evidence receipts

The new private directory is
`/home/miku/.local/state/enmori-backend-expiry-20261117/`; the retained onboarding
body remains in the preceding stable-followup private directory.

| Artifact | SHA-256 |
| --- | --- |
| `startup-offline-diagnosis.log` | `dcfe5541ac073ee1e0a03568ac9063ff728bfca1a9d919764bb2f5e04e1f4599` |
| Private temporary diagnostic source | `e7eea18a170e32760477b0d581dae744e116274086c09dfefff11be9c3cdac81` |
| `backend-log-summary.json` | `c6a3c4e2aa0f50aad6c886a39358ec9ea9dc1e778662c61b76ba028637dc5b35` |
|17 November application Docker log | `1c9cc06a64a0a88cd03735c8ce2cb10a99d39146e43f983e7108e31a3be7d7c5` |
|17 November platform Docker log | `91850dd855c14d108c83ed5ace7ef016c4fb39b9e109c946adc49472335aae28` |
| Retained21:07 onboarding response | `29c82ea89fedb3a0c8d176fccf2757a7044292e4a72adf241aa9f6a3f170b4cb` |
| `emulator-offline.png` | `e884f05e24d712482a8e74d7ff1f43ba50d10ef69f3d8a8d6d9a4cb4e2272859` |
| `emulator-offline.xml` | `d80e9f1c93db71dc59e01946ee935933c73396c1918589a0898dbf058bee3a14` |
| `emulator-online-retry-immediate.png` | `b17ef121c45e1d286c2e116f7ff6a9e76102271f34d544825054fcac960ca730` |
| `emulator-online-retry.xml` | `55119e4f115e085de39469a3aa4aa90d6f84b85d1471b5d0f024e9ae69a15b9c` |
| `emulator-recovered-home.png` | `c65f1b983422f983cdf8b8a68f125524822fb683be4882c20af3cd42fd980058` |
| `emulator-recovered-home.xml` | `3517877ed7a9163370e2b67a9bc7c19cd59fc4bdc56030e12dd6b3ec9d84e17d` |

Private response fields, screenshots and raw logs are not copied into Git.
