# Backend and external-source reliability review

Date: 17 November 2026, Asia/Singapore. This is read-only cloud/API and source/test evidence. It is not physical-phone acceptance or an uptime/SLA result. No backend implementation, deployment, configuration, account/product data, monetary ledger, notification or model-call mutation was made by this review. This scope applies only to this backend-review agent and the probes/checkpoints in this report: every `modelCalls: 0` counter excludes the separate physical-phone acceptance. The root operator recorded one ordinary synthetic AI send on each of v81, v82 and v83; those sends and their Saved/recovery observations belong to the phone evidence and are not represented as zero model usage.

## Authority and version identity

Read `AGENTS.md`, the repository Skill routing rules, the backend architecture decision/design, and the applicable decisions:

- [Return and freshness](../../decisions/2026-10-26-li-reference-and-event-usability.md): fresh authorized reads after route/foreground return; retain search/filter intent; unavailable is distinct from empty; no automatic participation resend.
- [Measured Event wait budgets](../../decisions/2026-11-11-li-measured-onepa-wait-budget.md): source 180 seconds, aggregate recommendation 210 seconds, selected client reads 225 seconds; no performance-target acceptance implied.
- [Supplemental-query degradation](../../decisions/2026-11-17-li-supplemental-query-degradation.md): the required default group must complete; each supplemental group is independently atomic; failed groups contribute no rows; total timeout/cancellation invalidates the acquisition; incomplete coverage must be explicit.
- [Background warming](../../decisions/2026-11-17-li-activity-loading-performance.md): one shared acquisition start per five minutes, no overlap/immediate retry, five-minute freshness, no stale fallback; background/public data only, personal ranking remains request time.
- [AI evidence refresh](../../decisions/2026-11-11-li-openai-balance-reverification.md) and [teacher continuity](../../decisions/2026-11-11-li-teacher-stability-implementation.md): immutable earlier credit expiry and original cap remain; a funded successor requires the actual funding/evidence and concrete approved packet.

Current identity was independently checked at approximately 18:19 SGT through Azure management, the active ZIP bytes and the actual mounted application manifest:

| Component | Observed identity |
| --- | --- |
| App Service | `enmori-backend-20261029`, Running, B2, one instance, Always On |
| Active package | `2026111704554378.zip`, 68,085,970 bytes |
| ZIP SHA-256 | `6005380c4e663bfaebfee898dc1fae56c66c0910b9b4485f0da7ea000070d230` |
| Runtime version/source | v78, `9b305490ea199585852f369bc9d0b712e854de8a` |
| Mounted manifest SHA-256 | `0890c5a5aeda4e21b4313aa3a4040b231c877135073eba86cfff67f97ccfb1a3` |
| Backend tree in v79/current audit base | `82de307a0f57d4ba04ee572f93203c194f7ed71e`, identical to runtime source |
| API tree | `905ea276705413d36dfd5032f0d66ada28189ac2`, identical to runtime source |

The v79 increment was client-only. A frontend-only candidate can therefore retain this matched backend. [The machine-readable receipt](backend-verification.json) binds these observations and the bounded API results.

## Repeated connected-service observations

The existing retained test account was used only for authenticated GET requests; its empty personalized recommendations do not establish interest matching. API calls were sequential. Rounds 2–4 were coordinated with the root operator's screen-off phone interval to avoid knowingly replacing a source generation during phone interaction. Other concurrent service users were not excluded.

| Round, SGT start | Recommendation All / Home | Browse | Ticketmaster Browse / stable-ID detail | onePA Browse / stable-ID detail |
| --- | --- | --- | --- | --- |
| 18:19:36 | 200, 0.917s / 0.921s | 200, 2.545s | 200, 5.134s / 5.324s | 200, 1.125s / 0.718s |
| 18:22:40 | 200, 0.818s / 0.821s | 200, 2.344s | 200, 5.033s / 7.777s | 200, 1.127s / 0.817s |
| 18:24:22 | 200, **52.142s** / 0.830s | 200, 1.710s | 200, 5.223s / 3.786s | **503, 13.519s / 503, 13.228s** |
| 18:26:56 | 200, 3.713s / 0.921s | 200, 2.151s | 200, 6.042s / 7.986s | **503, 14.538s** / 200, 1.024s |

Each round's profile read remained 200 in 0.766–0.891s. Both providers were marked available in every returned list, and onePA coverage was explicitly incomplete. Browse returned 25 items. Availability of a valid catalogue is not a promise that every separate detail fetch will succeed.

The third round's Admin status reported onePA `dependency_unavailable` after the two 503s, while backend/Firebase remained ready. The fourth round again failed onePA Browse detail before the stable-ID detail succeeded. At 18:27:53, an explicit GET retry of the **exact same Browse ID** as round 4 returned 200 in 1.018s. Public-identity hashes correlate that retry. This is recurring failure followed by a bounded recovery observation; it does not close the issue or establish a success rate.

An initial progress message incorrectly associated the third round's wait with the profile request because the incremental receipt had not yet recorded the next in-flight call. The completed receipt identifies the 52.142-second recommendation call; the profile request took 0.891 seconds.

## Failure-path diagnosis and limits

At 18:30 SGT, one explicitly bounded isolated process called the **mounted** `OnePaPublicReader` against the exact round-4 public detail URL. Stage-only instrumentation observed an HTTP **403** from the static public HTTP request after 153ms. The probe aborted at the access refusal; it did not attempt rendering, retry, alternate URLs, authentication or an access-control workaround. Its watchdog observed five owned processes and **zero remaining running processes**, with no timeout or stderr. No source page body or URL is included in repository evidence.

This establishes a current upstream refusal at that static detail path. It does **not** establish which stage caused the earlier 13–14-second complete-reader failures: the deployed reader normally has a bounded rendering path, and this diagnostic deliberately stopped before it. No claim is made that a 403 bypass or changed provider-acquisition policy is required or approved.

Read-only platform/application log summaries after the failure showed the latest application listening event at 13:02:53 SGT, with no newer listening/restart event in those inspected logs. An 18:27:46 process snapshot found one Node `MainThread` at approximately 269MiB RSS and no active Chromium process. Cgroup metrics were unavailable; the host load average is not application CPU utilization. There is no event-loop trace, and these snapshots cannot establish the cause of every transient request failure.

Two mechanisms are visible in current source and covered by synthetic tests:

1. A valid onePA catalogue is readable during replacement. Once no valid catalogue remains, a foreground read can join the admitted acquisition and wait; a failed cycle does not extend expiry or immediately retry. The 52-second request and subsequent quick response are consistent with this mechanism, but there is no per-request stage trace proving that specific request's entire delay.
2. `ControlledSourceProjection` uses a shared process generation. A fresh Browse page zero replaces its epoch; pending recommendation/detail reads from the prior generation fail closed. This protects freshness but can expose retryable errors under overlapping reads. This review did not isolate that mechanism as the cause of the v79 phone incidents.

The phone's long-wait return to Home is not explained by these backend observations. Source availability and route/session ownership remain separate investigations.

## Open findings and required decisions

| ID / priority | Expected and observed behavior | User impact / smallest next step | Retest disposition |
| --- | --- | --- | --- |
| B-01 — 阻断发布 | Continued AI availability cannot be asserted beyond the live grant. Read-only live ledger and Azure-config structural comparison confirmed the current v1 grant expires **18 November 2026, 00:00 SGT**, including credit, balance and price evidence deadlines. It was valid at the 18:25 read, with a matching current renewable owner. | AI admission will fail closed at expiry. Before a continuing-AI stable release, provide the actual approved successor funding/evidence/cap packet and execute the existing reviewed transition; preserve all charges and unresolved reservations. No extension, purchase, cap change or transition was made. | Open. Today's `AI ready` status or one successful UI message cannot prove post-expiry operation. Provider billing balance was not independently checked in this audit. |
| B-02 — 本轮应修／恢复验收未闭环 | Current list data can load while onePA detail returns a safe retryable `SERVICE_UNAVAILABLE`. Three real onePA detail failures recurred across two rounds; one exact-ID retry later succeeded. A separate static request was refused with 403. | User can see an activity but temporarily cannot inspect it or complete the detail-led task. Preserve saved participation and explicit unavailable/Retry paths. Do not label the issue fixed. Verify the final APK's failure/retry/return path; any backend diagnostic or acquisition-policy change needs a concrete decision before implementation. | API failure and same-ID recovery observed. Final v83 recommendation error/partial-range recovery, return navigation and participation recovery were observed; its event-detail read and refresh both failed, so successful final-APK detail recovery is still missing. Exact complete-reader failure stage remains unresolved. |
| B-03 — 可延期，保留明确限制 | The approved warming contract permits waiting during an uncached/in-flight cycle. One recommendation read took 52.142s despite faster prepared reads before/after. | Waiting controls and navigation must stay usable. The existing Stop waiting/reload scope remains appropriate; do not invent a progress estimate, silently serve expired rows or promise every open is fast. | Source mechanism verified synthetically. Actual final-APK long-wait controls and interruption acceptance are separate. |

Incomplete onePA interest coverage itself is **approved degradation**, not evidence of a newly discovered implementation defect. Empty results must not claim an interest has no activities when coverage is incomplete. Source review confirms the separate optional recommendation coverage projection and Browse row field, immutable per-snapshot metadata, and bilingual UI notice wiring. Final physical notice removal after a genuinely complete recovery was not observed; every real returned snapshot here remained incomplete.

## Source validation

Pinned Node **24.19.0** and already-installed dependencies matching every declared pinned version were used. TypeScript build passed. **80 focused backend tests passed, zero failed/skipped**, covering required-default atomicity, isolated supplemental failures, total-budget/cancel fences, page/record limits, coverage compatibility, immutable expiry, shared foreground/background admission, failure and later-cycle recovery, shutdown and unknown/partial source status.

The command selected these compiled suites: `onepa-public-catalogue`, `onepa-warm-cache`, `warm-schedule`, `source-freshness`, `dual-source`, `source-deadline`, recommendation `source-coverage`/`source-status`, `event-warm-shutdown`, and `controlled-event-browse`. This was not a rerun of the complete backend or Emulator suite. The earlier v78 broad Emulator failures remain documented in [v78 evidence](../2026-11-17-activity-loading/README.md); they are not converted into passes by this focused check.

Private credentials, account content, full settings, financial ledger values, raw captures and the public URL used for the diagnostic remain outside Git under `/home/miku/.local/state/enmori-stable-audit-20261117/`. The report and receipt contain only selected operational evidence. The first config comparison used inconsistent Python/JavaScript key sorting; parsed structural equality corrected the comparator and confirmed the actual grants match. No configuration mismatch was found.

## Final v81 candidate runtime identity checkpoint

On **17 November 2026, 19:17:09–19:17:20 SGT** (11:17:09–11:17:20 UTC), while preparing final v81 phone acceptance, a bounded read-only recheck found the Azure SCM selector unchanged before and after the mounted-manifest read: `2026111704554378.zip`. The actual application-container manifest still identifies **v78**, source `9b305490ea199585852f369bc9d0b712e854de8a`, SHA-256 `0890c5a5aeda4e21b4313aa3a4040b231c877135073eba86cfff67f97ccfb1a3`; all three match the earlier audit. The `finalRuntimeIdentity` record in [the receipt](backend-verification.json) preserves exact timestamps and comparisons.

This checkpoint read only the selector and mounted manifest, with no Event-source requests, AI calls, private-log reads, service/configuration changes or product/ledger writes. The ZIP bytes were not downloaded or rehashed again; their earlier verified hash remains the archive evidence. This is a point-in-time runtime match for the final candidate, not proof of continuous identity throughout later phone interaction or closure of the existing reliability findings.

## Post-installation v83 runtime identity checkpoint

On **2026-11-17 20:12:21–20:12:32 SGT**, after the root operator reported v83 installation at 20:09 SGT, the selector remained `2026111704554378.zip` before and after the actual application-container manifest read. The mounted backend remains **v78**, source `9b305490ea199585852f369bc9d0b712e854de8a`, manifest SHA-256 `0890c5a5aeda4e21b4313aa3a4040b231c877135073eba86cfff67f97ccfb1a3`, matching the earlier audit. The new `additionalRuntimeIdentityCheckpoints` entry in [the receipt](backend-verification.json) preserves this observation separately; the 19:17 v81 `finalRuntimeIdentity` record remains unchanged.

Only the selector and mounted manifest were read. No Event-source request, AI/model call, private-log read, device/ADB action or remote mutation was performed; the archive was not downloaded or rehashed. This checkpoint establishes identity at the recorded time, not uninterrupted service health or identity throughout all later phone interaction. The original expiry and reliability findings remain open.

## Final v83 acceptance identity and AI authorization checkpoint

On **2026-11-17 20:35:28–20:35:40 SGT**, a further bounded checkpoint was appended as `finalAcceptanceCheckpoints` in [the receipt](backend-verification.json), preserving all earlier observations. The selector remained `2026111704554378.zip`; the actual mounted manifest still matches **v78 / `9b305490ea199585852f369bc9d0b712e854de8a`** and SHA-256 `0890c5a5aeda4e21b4313aa3a4040b231c877135073eba86cfff67f97ccfb1a3`. The read-only live ledger checkpoint at `2026-11-17T12:35:40.326Z` found grant current `true`, configuration/ledger equality `true` and current matching owner lease `true`. Credit, balance, price and effective evidence deadlines remain **18 November 2026, 00:00 SGT** (`2026-11-17T16:00:00.000Z`). No successor funding or post-expiry operation is established.

The root operator separately observed root-entry **Service unavailable at 20:30:53 SGT**, then recovery after Retry by **20:31:40 SGT**. The optional log check was restricted to today’s two relevant Docker-log metadata entries and at most 64 KiB per recent tail, retaining only time-window operational metadata. The application-log metadata was last updated at **19:57:48 SGT** and platform-log metadata at **13:02:54 SGT**, both before the observed incident. No log tail/body was therefore read. These metadata provide no matching-window error evidence; they neither prove absence of a restart/HTTP failure nor identify the failing request. The transient remains an observed failure followed by recovery, not a resolved root cause. No Event-source probe, model call, device action, service/configuration/product/ledger change was performed by this checkpoint, and no raw log content, grant identifiers or balances were retained in repository evidence.
