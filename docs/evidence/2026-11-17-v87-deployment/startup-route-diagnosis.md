# Startup and long-wait route investigation for the v87 stage

Read-only source/evidence review on source
`7126aefd67905a45d1d6cd52dd68b35bbdc9b9fc`. Authority:
[LI's v87 deployment and unchanged v86 emulator approval](../../decisions/2026-11-17-li-v87-deployment.md).
This reviewer did not operate a device, emulator, remote service, AI or product
write, and did not change production code or diagnostics. The root operator
owns deployment and emulator acceptance; no current-stage pass is inferred here.

**SC-15's initial startup failure and SC-09's historical Home return remain
unattributed.** No new rooted implementation defect was found in this pass.
The earlier composition-lifetime and Retry-waiting fixes remain separate,
proven repairs; their success cannot identify either historical cause.

## Current source and preserved evidence

The startup-related files inspected in the earlier
[startup diagnosis](../2026-11-17-backend-expiry/startup-diagnosis.md) are unchanged
between its `4ad2b4b79db40d58ae3489fab9e24e5f73182867` baseline and this review:
bootstrap, composition overrides, router/gate, auth/token adapter, account
adapter, HTTP client, retained runtime, onboarding repository and framework
error mapping. The three v87 onePA repairs are outside the direct startup
token/onboarding/account-support chain. Shared host or network failure is still
possible; source separation alone does not rule it out.

| Finding | Supported conclusion and limit |
| --- | --- |
| Auth session observation uses `authStateChanges`; ordinary composition overrides are retained for the connection | The known token-refresh/root-rebuild mechanisms remain guarded. There is no new evidence that a replacement auth session or root rebuild caused v79's observations. |
| ContentAccessBoundary changes its foreground/revision receipt on pause/resume | This boundary does not directly navigate Home or invalidate onboarding. Authorised content may need a fresh read, distinct from route loss. |
| `/unavailable` renders the existing waiting page while Retry's auth/account read is loading and rejects repeated Retry callbacks | The v84 repair is still present. It does not add automatic retries or classify the original error stage. |
| Authenticated recovery from startup/unavailable redirects Home | Home after explicit new startup and successful recovery is the existing navigation rule. It must not be counted as a spontaneous same-Activity reset. |
| Remote completed onboarding still awaits `initializeOwner` | The authorised account-support transaction remains a possible dependency-failure stage. Reads precede writes; existing support documents are preserved. No reproducible defect or authority to make this prerequisite best-effort was found. |

The reviewer rechecked the retained raw Android evidence selectively. All three
v83 incident log snapshots contain the20:30:50.225 ActivityTaskManager Displayed
event, but contain **zero PID17953 application-log entries in20:30–20:31**.
The before/after Activity metadata distinguishes the normal explicit Back exit
and new Activity/task from the earlier long-lock trial. The same PID alone
cannot establish the same Activity or Flutter engine. These files offer no
incident-correlated token result, request status/ID, parsing outcome or Dart
gate transition.

The original v79 private capture directory remains absent. Its two recorded
observation gaps were approximately7min14s and7min16s; they are not timestamps
of a route transition. The retained sparse system log still cannot discriminate
process/Activity loss from an internal route/session reset. The
[historical route review](../2026-11-17-stable-candidate/route-review.md#historical-evidence-follow-up-retained-logs-cannot-establish-the-cause)
preserves that evidence boundary.

The v83 physical long-lock receipt records **509.5 seconds** screen-off and the
same process and Activity/task before/after. Its previously checked UI evidence
retained the interest editor, unsaved selection and search. This is a bounded
historical non-reproduction, not a result for the v86/v87 pair. The v84/v85
emulator receipt also remains a bounded pass for two controlled offline/recovery
cycles and ordinary Back exit/reopen; this read-only pass checked its recorded
versions, results and network-restoration receipt without rerunning it.

The retained Azure metadata has no listening/restart event around the initial
20:30 SGT incident. `build-app.ts` still uses `logger: false`; absence of an event
in incomplete operational logs cannot establish healthy dependencies or exclude
a request failure. No new remote log acquisition was performed for this review.

> Subsequent operator results: the proposed v86 checks were completed and independently reviewed in [emulator acceptance](emulator-acceptance.md). The later v88 evidence is separate in [v88 review](v88-emulator-review.md). The proposed steps below are preserved as the earlier review checkpoint, not the final execution status.

## Smallest useful current-pair emulator checks

These are proposed acceptance steps, **not completed results**. Use the exact
v86 APK hash and the deployed v87 receipt specified by the approval. Retain safe
timestamp, PID and ENMORI Activity/task metadata around each transition; keep
raw screenshots/XML/logs private.

1. With the existing dedicated completed account online, launch to authenticated
   Home/New Check-in. Label the launch cold, force-stop/relaunch or ordinary
   re-entry accurately. This establishes the current pair's startup path only.
2. Perform one bounded offline startup/explicit-recovery cycle: disable emulator
   Wi-Fi/data, relaunch and observe Service unavailable with Retry; restore
   networking, tap Retry once, capture Opening with no active Retry action, then
   authenticated Home. If offline Retry is selected first, its terminal failure
   must be reported separately from the subsequent online recovery. Restore
   both network settings in cleanup. The prior pair already has two-cycle
   evidence; extra repetitions here cannot retrospectively attribute SC-15.
3. From Home, exit with normal Back to the launcher and reopen online. Capture
   the Activity/task transition and startup outcome. A new Activity initialising
   at Home is not an editor-retention test or a failure of SC-09's boundary.

If the current pair also needs a meaningful long-wait non-reproduction, add one
separate interest-editor trial: capture its initial saved selection, make a
temporary unsaved selection and search, leave the same Activity screen-off for
at least450 seconds, then return and verify route/search/unsaved selection.
Record actual elapsed time and Activity/task continuity; discard the draft and
reopen to confirm the original saved selection. Do not save or touch AI. A
shorter trial can be reported as a shorter observation but does not cover the
duration of the original gaps. If the OS recreates the Activity, classify that
result separately; arbitrary draft persistence after process/Activity loss is
not an inferred new requirement.

## Missing causal evidence and stopping boundary

For SC-15, a future recurrence needs a safe stage receipt distinguishing auth
observation, token acquisition, HTTP dispatch/body, response validation and
server identity/account/support-transaction completion. Status/category,
duration, request correlation and Activity/task identity suffice; private
content, credentials, UID, full URLs and account paths are unnecessary. A new
production diagnostic sink, policy or deployment is not authorised here.
Existing SDK/system logs may help only if they actually contain such a receipt.

For SC-09, an actual spontaneous route reset must be correlated with Activity,
engine/root and observed-auth-session transitions. The missing historical raw
captures cannot be recreated by later successful tests. Without a recurrence
and that correlation, retain “cause unknown; bounded non-reproduction” rather
than silently assigning the fixed composition defect as its cause.

The prior eight offline startup discrimination cases were not rerun. Their
controlled failures already show that the generic error can arise before HTTP,
from transport, from503 or from malformed data. No additional fake, source
change, automatic retry or new backend behaviour was justified by this pass.

## Rechecked private receipts

Only hashes and the bounded findings above are published. The original evidence
reports retain full provenance and earlier UI receipts.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-long-lock-trial.json` | `b344bd587c38a716633856508a22302e0343cc41fdaaa8b16ba7e5abd89d1a43` |
| `v83-long-lock-before-state.json` | `175ddba08561938520eacd0bc9907c6bd38ead280a74f6f74eadc04786a8040a` |
| `v83-long-lock-after-state.json` | `81cf0733800ea687d97c7f029a18b79335766021feed97a3bd65fd0e0805bb8e` |
| `v83-social-resumed-logcat.txt` | `881ba3860755c56191e912ed57753b054f13667101fd28abb4fbb059c82ad330` |
| `v83-social-retry-logcat.txt` | `d8b3d3b5b5baebd86f3b58eb2010245fd13dc0ae1a04c8b4ec37921815822afe` |
| `v83-social-retry-settled-logcat.txt` | `341f544288f2cee506ce01bdb57c617eceb5644f404600e442e1bf060048ec6d` |
| Backend-expiry `backend-log-summary.json` | `c6a3c4e2aa0f50aad6c886a39358ec9ea9dc1e778662c61b76ba028637dc5b35` |
| v85-stage `emulator-startup-regression.json` | `364719d1a09763c59083fd6d101cc37071cc8c20140c40072c29189d83e20b89` |
