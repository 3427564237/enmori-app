# v65 teacher candidate — funding verification and restart evidence

Status: v65 deployed and installed; same-package restart, renewal, retained financial history and live source-browser checks verified on 11 November. This is not two-month uptime, Release/UAT, cross-country device acceptance or Android freeze.

Authority is [LI's implementation/test/install approval](../decisions/2026-11-11-li-teacher-stability-implementation.md) and the later [current-balance verification](../decisions/2026-11-11-li-openai-balance-reverification.md). [v65 is installed with retained login/data](2026-11-11-v65-android-candidate.md). The two authorized real synthetic generations were completed [before this migration](2026-11-11-v64-install-and-scheduled-openai.md); this operator procedure issues no paid generation or FCM dispatch.

## Fixed candidate and review

| Artifact | Identity |
| --- | --- |
| Deployed source | `2741c8c2085e6df9d1fa56341a05926cfcd0c95d` |
| v65 Backend ZIP | `2026111112460865.zip`, 68,066,487 bytes, 8,561 entries |
| ZIP SHA-256 | `ce9d88b3b2bf70de0da451881a9e8bcb43b56b44f60441f40ede6610649bb3fb` |
| Retained v64 rollback ZIP | `2026111111272164.zip` |
| Rollback ZIP SHA-256 | `2bc82cfbffc951dff0e1c663f55437a9be1ab79bb70af7070438d31e862bd237` |
| Mounted v65 manifest SHA-256 | `6b94e58e77c70b1ccc64343309eec2087950e2f174000f7ecda10fe24017b153` |
| Android artifact | `ENMORI-teacher-v65-release.apk`; hash/signature and phone evidence in the linked Android record |

The strict root build passed. Its complete `backend/` and `tool/` tree matched the independently reviewed tree with **1,934 Backend**, **9 Azure**, **16 owner**, **6 owner SDK** checks passing. The credit implementation additionally passed **12 cost/quota SDK** cases. These are source/isolated checks, not physical delivery evidence. Independent review found no remaining P1/P2 in the runtime/credit changes.

The private operator was independently reviewed and passed 10 offline checks. Two findings were corrected before execution: untracked/ignored compiled inputs are rejected, and quota verification checks the exact existing recovery transformation rather than policy alone. The separate gift freshness helper passed 28 offline checks and independent review; late unknown-result reconciliation uses original historical evidence and never reopens expired admission. All mutation intents are exclusive and retained; unknown results have read-only reconciliation paths. No secrets, whole settings maps, account content, raw financial attempts or credentials are committed here.

## Same-cycle verification, then owner migration

The operator rechecked selected Sol access using the existing live credential with a model GET returning 200. Current [official pricing](https://developers.openai.com/api/docs/pricing), the [Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [cache lifetime documentation](https://developers.openai.com/api/docs/guides/prompt-caching) confirmed the unchanged retained Sol/Luna rates and the default 30-minute cache scope. No generation was made for that verification. LI supplied current provider balance/expiry evidence; it covers the complete existing USD3.40 cap. External application spending was not declared absent.

After one stop, the first immediate drain observation was not yet conclusive. A read-only follow-up confirmed ARM Stopped, public stopped response, disabled/inactive local service, and termination of every observed app container. No stop was repeated. The prior secondary Indonesia app returned 404 in a separate read-only metadata check; it was not changed. The candidate ZIP was verified entry by entry and selected while stopped.

Before creating the owner, the single-attempt freshness transaction changed exactly the five allowed balance/price verification fields. Full before/after readback preserved the grant identity, creation balance, original credit, cap, price values, runtime fence, all attempts, both quota documents and absent owner. The matching private config was then synchronized and its full settings hash read back. The new verification deadline is **18 November 2026, 00:00 SGT** (17 November 16:00 UTC), bounded by both seven-day windows and the unchanged earlier gift expiry. The provider's reported 19 November date did not rewrite that immutable expiry. No paid successor was installed and no recharge occurred.

The operator next captured the updated exact state and created only the approved vacant `ai_runtime_fence/service_owner` record, conditioned on owner absence and the full captured snapshot/fence. Service identity is `enmori-japan-east-primary`; initial lease version was 0. Private configuration replaced the consumed manual claim with the approved renewable ownership tuple, preserving all other settings, grant and first-flow configuration. No second service, worker, scale-out, plan, secret or payment configuration was added.

## First live start

Start was requested at **12:58:55.711719 UTC**; actual listening with `aiAvailable: true` appeared at **13:05:10.0796962 UTC**, about **374.368 seconds** later. The platform startup probe independently reported 317.071 seconds. These are different intervals; ARM Running was not treated as application readiness.

Fresh owner observation confirmed fence/owner generation **84**, followed by lease version **8 → 12** in the same epoch. Cost recovery preserved every monetary field except the approved runtime epoch/observation metadata; all 107 attempt records were unchanged. Sol quota recovery matched its existing exact conservative expiry-shift/cooldown rule, Luna was unchanged, and renewal preserved both complete quota documents.

Authenticated ordinary/Profile/onboarding and Admin reads passed. Admin access was permitted, ordinary users received 403 for protected Admin routes, and an unauthenticated request received 401. The existing Admin profile and 16-tag catalogue hashes were unchanged. Backend/Firebase/AI reported ready. Event sources were truthfully `unknown/not_observed` before their first retrieval; that status was not presented as successful source coverage.

At **13:09:05.548 UTC**, a read-only app-container observation matched the mounted manifest to the exact candidate source/hash. Initial shell observations during cold startup were unavailable; a later connected read needed explicit terminal framing. The corrected observer printed only allowlisted manifest metadata and performed no product/data write.

## Final same-package restart

Before the controlled second stop, the operator captured the current owner and complete settings hash. Positive drain was confirmed, then a stopped snapshot retained generation 84 and lease version 14, with identical amounts, attempts and both quota records. Restart was requested at **13:11:47.934983 UTC**, without changing the package, configuration, grant, fence or owner record and without issuing a fresh manual claim.

Actual listening with `aiAvailable: true` appeared at **13:18:31.5873203 UTC**, **403.652 seconds** after the restart request (about 6 minutes 44 seconds). The platform startup probe reported 340.204 seconds. Platform logs arrived later than their embedded event timestamps; those timestamps, rather than the operator's polling time, define the measured interval.

Fresh observation confirmed owner/fence generation **85**, then lease version **24 → 27** in that same epoch. Exact amount/attempt preservation and quota recovery/renewal checks passed again. No configuration refresh, owner seed/re-arm, manual claim, model generation or notification dispatch occurred during this restart. This is measured recovery on the existing single host; continuous occupied-owner startup, transient unknown acquisition and a real crash during a pending model/FCM request are not claimed as separate live rehearsals. Those refusal/unknown paths retain source and isolated SDK evidence.

The actual mounted manifest was re-read at **13:21:19.514 UTC** and matched the same source/hash. Ordinary and Admin reads passed again; the Admin profile/catalogue hashes stayed unchanged, and ordinary/unauthenticated Admin access remained 403/401. Proactive settings, intents and notification-registration reads returned 200 without changing the account's settings or registration.

Live event browsing after the restart returned both providers available. The first page took **149.607 seconds** and contained 25 items, including 6 onePA items. The second page took **2.181 seconds** and contained 28 items, including 8 onePA items. The two pages shared one snapshot time and had **53 unique items, including 14 onePA items**. Further pagination remained; this is a bounded two-page observation, not a complete source inventory. At **13:27:20 UTC**, Admin operations status reported Backend, Firebase, AI, Ticketmaster and onePA all ready. This is point-in-time availability, not a promise that third-party sources never fail.

## Operational boundaries

The original cap remains USD3.40. The observed ledger has confirmed spend **USD0.1039927**, outstanding worst-case holds **USD0.004096**, **107 attempts** and **105 reconciled attempts**. All old unknown holds and occurrence states remain; no timeout, exit, renewal, restart or code rollback is treated as proof of physical remote settlement.

The approved fallback is the retained v64 ZIP in ordinary-only mode after fresh stop/drain, preserving all database state and disabling cloud admission explicitly. Reusing the old consumed claim or deleting/resetting the owner is not rollback. Returning to leased mode follows the separate exact-owner/fence, expired-lease re-arm procedure.

Two-month operation still depends on actual manual purchased credit and its reviewed successor installation before the gift boundary, then manual verification within the approved review windows. Notification registration remains at most 30 days and uses explicit renewal. The audit's data-recovery limitation, unknown teacher devices/networks and separate physical push acceptance remain visible in the [operating plan](../planning/2026-11-11-teacher-delivery-operating-plan.md). These conditions are not replaced by source tests or one restart rehearsal. No iOS work or Android freeze occurred.
