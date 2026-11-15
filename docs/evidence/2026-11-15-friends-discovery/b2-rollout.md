# Japan East B2 deployment and bounded performance result

15 November 2026. LI approved [B2 with rollback if no useful improvement](../../decisions/2026-11-15-li-event-content-performance.md), following the [cost/rollback proposal](../../planning/2026-11-15-event-content-b2-proposal.md). **B2 is retained**: the measured Chromium startup improvement and successful complete source read support retaining it within the two-month funding estimate. This is not full release/UAT or a guarantee of continuing provider access.

## Actual delivery

The existing Japan East Linux plan changed from B1 to **B2, capacity one**, using the existing Azure CLI's current-plan update and long-running-operation completion. The same app, hostname, managed identity, Firebase project, account data, settings and monetary cap remain. No new region, proxy, extra app or scale-out worker was created. The phone APK remains **v69**; this is backend deployment **v70**.

- Source: `bb89730efe1c7a40a072cdddc5491e8d98ef3d64`.
- Active ZIP: `2026111509412170.zip`, 68,067,606 bytes / 8,561 verified entries.
- ZIP SHA-256: `4f71db853d599820796d6ed7b51e34dfeaada7617876932ca81743d078b0443b`.
- Mounted manifest verified at 09:57:46.921 UTC: SHA-256 `28b3b3c2b4e3dd3e439a7be820afd12347cb90cb159cec42e27280f06ccaae5d`.
- Mounted reader SHA-256 `ab4be670bc06b85ef1dfdc4ce6e8dde789c124bc551ff83376165b64c4bb787f`; ranking SHA-256 remains `71c9142cb87a4d0c2a76f886711da459462a62ee1630656a6df94c9c54514d40`.
- Synthetic scoring on the deployed module still orders Gaming score 4 before nonmatching Music score 13. This is synthetic deployed-module evidence, not a live mixed-candidate account result.

A positive stop/drain proof preceded activation and scaling. An independent operator review identified missing current ZIP-hash verification and asynchronous-completion evidence before scale submission; both were corrected. The scale operator rereads selector before/after hashing, compares name/SHA/length to the candidate, rechecks the stopped/drained service and settings, and records an exclusive intent. It submits one CLI command, then requires successful CLI long-running-operation completion and independent live readback. This is not a claim that the SDK emits exactly one HTTP packet: its retry policy is retained. No uncertain write was blindly resubmitted.

Stop submitted 09:46:50.201 UTC; observed container termination 09:47:32.899 UTC. Scale operation completed 09:50:22.545 UTC; independent B2 confirmation at 09:51:24.167 UTC. Start submitted 09:52:01.699 UTC; application listening with Firebase/AI available at **09:56:29.534 UTC**, **267.835 seconds** after start. The service interruption therefore lasted about 9 minutes 39 seconds from the stop request to listening, including guarded activation/scaling.

Owner generation advanced **88 → 89**, with renewal observed at lease versions 3661, 3663 and 3671. All 107 financial attempts, 105 reconciled attempts, `spentNanoUsd=103992700` and `reservedNanoUsd=4096000` remained unchanged. The operator issued no paid model call or notification. Profile, interests and recommendation-profile hashes matched the pre-upgrade baseline; authenticated reads returned 200 and an unauthenticated profile read returned 401. An early probe timed out before recording a route result; a later retry succeeded after readiness. The early failure and one pre-readiness SSH failure remain in private diagnostics.

## Performance evidence and its limits

| Measurement | B1 | B2 |
| --- | ---: | ---: |
| Ordinary Chromium launch, three sequential samples | 7,830 / 2,014 / 1,545 ms | 4,246 / 1,026 / 810 ms |
| First complete recommendation source read for the same diagnostic account | 190,069 ms; onePA unavailable | 35,143 ms; both sources ready |
| Subsequent Home read for that account | 1,199 ms | 1,032 ms |
| Most recent start-to-listen observation | 327.179 s (v69) | 267.835 s (v70) |

The three browser samples were taken after source work/package preparation finished, without simultaneous root browser probes. They support a substantial startup improvement, but are not p95. The B1 full source read overlapped part of package preparation, and onePA failed then but succeeded on B2; **the full 190→35-second difference cannot be attributed to hardware alone**. Before the B2 source read, operational status reported both sources `unknown/not_observed`, establishing a cold source acquisition for that observed process. The diagnostic account had zero recommendation results in both runs, so this latency probe is not live Gaming ranking acceptance. [Physical-phone acceptance](phone-b2-acceptance.md) separately confirmed Gaming-only selection, a first PGL/Gaming match, and observed upper bounds of 26.0 s for For you, 8.7 s for PGL detail, 34.0 s for Browse and 5.4 s for the onePA detail. Cache hits were not established; these are single observations, not percentile or isolated backend timings.

No personal-data caching, database schema, SDK batch change, source-page reduction, timeout extension or new dependency was introduced. The bounded reader patch ends explicit 403/429 refusals before an extra selector wait while retaining ordinary 401 bootstrap and all provider-content/identity checks.

## Content availability

The upgraded live reader was tested at **10:00:19.132 UTC**. Ticketmaster's homepage still returned **403**, and the deployed reader ended after **4,471 ms** with `EVENT_READER_HOME_ACCESS_DENIED_UNAVAILABLE`. Website-only descriptions and covers therefore remain unavailable from this cloud host. Scaling did not remove the provider restriction. The earlier operator-host check still obtained the exact PGL description/cover, establishing that the accessible-page parser works, not that cloud access is restored.

The official Ticketmaster API retains the genuine covers it supplies. Its sampled first page had genuine covers for eight of twenty events, category fallback images for twelve, and no descriptions. The onePA catalogue completed successfully on B2. The subsequent physical-phone check displayed a 1,685-character description for the selected Punggol 21 CC event, with an honest no-cover-provided message. PGL retained its API cover and the explicit unavailable-website-details state. See [content investigation](content-performance-investigation.md) and the [unsent provider inquiry](provider-access-support-draft.md). A final authorized images-endpoint probe at 10:10:43 UTC matched the same missing-cover football event by ID; the dedicated endpoint also returned ten fallback images and zero genuine event images. No provider denial was bypassed, source content fabricated or public website content copied into persistent application storage.

## Funding and verification

The fresh credit read at 10:01:32 UTC still reports **USD92.23 estimated available**, after USD6.44 pending eligible charges, with spending limit On and credit expiry 28 October 2027. Japan East Linux B2 is USD0.037/hour: **62 days = USD55.056**, leaving approximately **USD37.174** for other Azure costs. This is an Azure compute estimate, not a guarantee about every third-party service or future tariff.

Strict compilation and all **1,950 backend tests** passed. Focused reader/enrichment tests passed 19/19; the Sol reviewer independently reran nine relevant tests. Counts overlap and must not be added. Flutter was unchanged; the prior v69 Flutter/APK verification remains applicable to its source, without being relabelled as new phone acceptance.

[Minimized machine-readable receipts and measurements](b2-delivery-metrics.json) bind the values above. Private operator receipts contain the full resource references, exclusive intents and verification evidence; no credentials, complete settings or private account records are committed.
