# Follow-up: populated data, Admin and Event reading

Scope: LI's request to repair observed failures, add labelled data and test Admin. Authority: [confirmed follow-up decision](../../decisions/2026-11-05-li-followup-runtime-admin-validation.md). This record preserves the earlier v57 failures in [the original verification](verification.md). Operational resumption: 2026-11-11 SGT.

## Source and automatic verification

Source commit `db1185bc74d1455fe34ba2dc4a17f456ac4127a3` retains an explicitly failed first-page provider as unavailable for the rest of that listing. A new page-zero read retries it. This avoids restarting the same failed acquisition on every healthy-provider page. Azure now allows the already-approved 20-second source acquisition; Event list/next-page and recommendation GETs allow 30 seconds. Other reads, writes and the AI target are unchanged.

- Backend strict compile and full tests: 1818 passed, zero failures/skips. Focused provider/projection tests: 28 passed, included in the full count.
- Azure lifecycle tests: 5 passed using the required `--experimental-test-module-mocks` flag. The initial command without that flag failed; its log is retained.
- Scoped Flutter read-budget tests: 3 passed. The two new tests failed before the scoped deadline change and pass afterward; ordinary profile reads/writes retain their shorter configured deadline.
- Flutter analyze: no issues found.
- Full Flutter comparison: baseline `5e5cf3eb` has 1617 passed / 62 failed; candidate has 1619 passed / the same 62 failed. No new failing test names and no removed baseline failures. **The full suite is not passing.** Several failures are stale navigation/text expectations or missing test ProviderScope; this comparison does not establish that every baseline failure is only a fixture issue. The earlier “Flutter 全量 530” label was inaccurate and is corrected to its selected app/features test scope. Exact names and log hashes are in [the comparison](followup-test-comparison.json).

Source tests do not establish provider availability, phone acceptance or UAT/Release.

## Populated private Check-ins (5 November)

Two new records, `QA57_ACCEPTANCE_ALPHA` and `QA57_ACCEPTANCE_BETA`, were each saved once with explicit test-only text, custom test mood, per-record Private visibility, weather off and no GPS/location/activity. Existing records and global privacy were unchanged. The records are retained as requested test data.

Terra/max observed both save confirmations; searching the shared marker returned two records and searching ALPHA returned one. The 7-day chart showed one day/two records, and selecting the day showed both test records. Search was cleared afterward. This covers populated search/chart interaction; it does not imply Friend-data coverage.

## Current operational evidence

The dedicated temporary Firebase identity was created on 5 November under explicit approval, onboarded with processing rejected and given the existing `enmoriAdmin` claim. On 11 November a fresh password login returned 200; Profile, capability and Admin catalogue GETs returned 200, with capability true and the original 14 tags. The original group-app identity was not granted Admin privileges.

The isolated `com.enmori.app.coretest` v57 test app preserves the group app's session. Initial phone login reached a service-unavailable page; one explicit read Retry recovered to Home. The device had validated mobile connectivity and DNS resolution. This transient failure remains recorded and is not represented as a flawless login.

Before deployment, ordinary cloud ZIP SHA-256 was independently rechecked as `4a22062b2478e44875d1900bae7b44017bb65b4ae579e097a046491177ff28ec`, source `6c5531bc`, source deadline 10 seconds, with cloud AI settings absent. A current synthetic-account Event list GET returned 200 in 12.083 seconds with 19 rows, Ticketmaster available and onePA unavailable. Its recommendation GET returned an empty 200 in 1.412 seconds; this rejected-processing test identity does not reproduce the real account's personalized Home path.

The signed v58 candidate is `com.enmori.app.group`, version `1.0.0-events20261111`, non-debuggable, SHA-256 `487f1e96e6e4a3856febceb66960c4887a6bea5e8b10c370602df90e61cbfd39`; signer matches the original group app (`0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`). Build success alone is not an installation claim.

## Admin phone acceptance and privilege revocation (11 November)

Terra/max used the isolated phone app and dedicated identity. All-filter search confirmed no existing QA57 tag before writing. Each of the following writes was submitted once and independently confirmed in the UI: create `QA57 Admin 1111` (revision 1), rename to `QA57 Admin renamed 1111` (revision 2), deactivate (revision 3), restore (revision 4), and final deactivate (revision 5). Inactive and Active filters reflected each transition. The stable ID was unchanged throughout. No unknown write was retried.

Root independently read the management API and compared all original 14 records byte-for-value with the initial catalogue. All 14 were unchanged; only the single new QA57 tag was added, now inactive at revision 5. It remains inactive because real deletion is deliberately fail-closed until the complete reference inventory is proven; no direct database deletion bypassed that gate.

The test app was force-stopped before cleanup. Root removed only this dedicated identity's `enmoriAdmin` claim, independently verified its absence, then used the still-valid old session to GET the Admin catalogue: **403 AUTH_FORBIDDEN**. Refresh tokens were subsequently revoked. This is live current-role rejection evidence, in addition to the original isolated Emulator tests. Account deletion and runtime completion are recorded separately below.


## First v58 runtime result and subsequent personalization repair

The first follow-up deployment (`db1185bc`, ZIP `8e8face8d6e69a7f606d051d49ee92cf8b180d72612ed237d6aae263c3b5d80e`) reached ordinary/disarmed listening on 11 November at 04:05 SGT. An operator-host Event first-page GET returned 200 in 22.119 seconds with Ticketmaster available and onePA unavailable; the next four pages returned 200 in 3.583, 1.024, 1.538 and 0.919 seconds, ending normally. This confirms the removed repeated-source waits, not onePA recovery or a latency distribution.

The phone independently read back v58's expected hash/signature and unchanged first-install time. The one installation command timed out during the standard vivo external-source confirmation; no command was resent, and package readback established the actual successful installation. The original login remained usable. Events displayed partial source availability and one Load more operation exposed additional cards without an error. The 5–11 November search range returned both private QA records; the temporary search was cleared. The temporary coretest package was uninstalled and its absence verified; the group app remained v58.

**The first v58 Home personalized recommendation check still failed.** The synthetic account's empty 200 response was not sufficient acceptance. No account settings were changed to manufacture recommendations. A narrowly scoped read-only diagnostic verified that the phone username matched the previously known account and that its recommendation profile, processing consent, selected interest records, friend index and existing participation records were structurally valid. No private content or identity is included here.

Source inspection found a second waiting path: accepted-processing accounts read one preference document per eligible source event serially inside the transaction (79 browsable rows in this runtime sample). Commit `cb80c43595c22d166c3b87a5dd68359c436e52e9` reads those already-authorized owner preferences in groups of at most five. It retains the same transaction, eligibility/ignored-state checks, source order and final freshness checks; no persistent cache, schema, API or scoring changes. All promises in a group settle before transaction exit, including on failure. No later group starts after a failed group.

Two new regression tests failed before the change and pass after it: bounded concurrency/order and failure draining. Personalization tests: 30/30. Backend strict compilation and full tests: **1820/1820**, no skips. An initial compiler error required an explicit existing InterestMatchingProjection type; it was corrected before testing/deployment. Flutter source did not change after v58, so the previously documented full-suite comparison and its 62 baseline failures still apply.

The dedicated Admin identity was deleted after its final ordinary runtime reads. Readback verified the Auth user absent and all nine identified account-owned paths absent. The single QA interest tag remains inactive under the reference-protection gate. Private source receipts retain the detailed cleanup proof.


## Final runtime and phone result

The final Backend is source `cb80c43595c22d166c3b87a5dd68359c436e52e9`, independently downloaded active ZIP SHA-256 `a1da5a466e3263f5cdd958d68b37222c0396f7836dd7fd9fc10e56a1cdfee165`. Startup/readiness checks confirmed Firebase ready, ordinary/disarmed cloud AI settings and the 20-second source boundary. No additional AI request was made. Local `enmori-group.service` remained enabled/active throughout this follow-up.

At **2026-11-11 04:25:06.111 SGT**, Terra/max clicked the original account's Home recommendation Retry once on v58. The 20.0-second capture still showed loading; the 23.189-second UI observation showed an actual recommendation card and Next group. Root independently inspected the completed screenshot. Thus this observed request completed visibly between **20.0 and 23.2 seconds**, within the approved 30-second client budget. The phone was left on Home, with no additional retry, recommendation selection or AI generation. This is one physical-device sample, not a p95 or reliability claim; the earlier failed result remains above.

Remaining limits: onePA still reports unavailable; its specific Azure failure cause is not established by this evidence. Ticketmaster browsing, subsequent-page loading and the final personalized Home display were observed working. The AI complete-reply 15-second goal remains unmet by the prior three samples, with no new AI measurement in this follow-up. Real permanent interest deletion remains closed. The full Flutter suite still has its documented 62 baseline failures; no overall UAT/Release claim is made.

Structured redacted results and hashes: [followup-runtime-verification.json](followup-runtime-verification.json). Private screenshots and raw receipts remain outside Git. No source was pushed or merged into main.
