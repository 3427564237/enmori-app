# Supplemental query degradation and resumed release

Authority: [LI's explicit follow-up decision](../../../decisions/2026-11-17-li-supplemental-query-degradation.md), superseding the supplemental all-success rule and v76 Backend deferral. [The original handoff](../README.md) preserves the earlier 403, timeout, UI-only candidate and tests; those are not acceptance evidence for this follow-up.

## Behavior

The default onePA list is still required and atomic. Each of the fourteen fixed supplemental queries is independently admitted only after complete response and official-link validation. Failed queries contribute no rows and are not retried. All groups must settle within the unchanged 180-second budget, with at most four pages and 190 raw records. External cancellation, global expiry, generation loss and conflicting admitted identities still fail the whole provider.

Available partial results carry immutable incomplete-coverage metadata through the five-minute cache, combined source, complete recommendation snapshot and personalization. Unknown coverage never means complete. Changes or disappearance of known coverage within a listing fail closed. Source availability remains separate.

The recommendation API uses optional top-level `sourceCoverage`; Browse adds optional `coverageComplete` only inside the available onePA status row. This preserves the respective v76 reader shapes. New clients validate both forms and show a bilingual incomplete-range notice in recommendations and Browse, including nonempty results. Refresh to complete coverage clears it. No ranking, eligibility, privacy, configuration, storage, dependency or infrastructure changes are included.

## Verification and rollout

Follow-up regression, cloud, APK and deployment receipts belong in this directory. Source verification must use normal public access, preserve failed-query evidence and verify real Food/Dance results through the actual adapter/application/transport on the same admitted source snapshot. A successful synthetic test alone is not live acceptance.

The existing package update and exact-v71 reverse path remain the release mechanism. The new Android candidate uses version code 77 so it can update the already delivered v76 and display incomplete coverage. Backend activation, signed packaging and physical-phone acceptance are separate results; each must be recorded rather than inferred from another.

## Required-list scheduling follow-up

The first degraded-policy candidate settled all fifteen groups in 138.778 seconds, but its required default group read only four pages before the fifth response wait timed out. The first four response/DOM cycles completed at approximately 31.5, 47.7, 65.5 and 78.2 seconds while supplemental queries ran concurrently; some supplemental requests also received 403. The earlier standalone first-page diagnostic completed normally in about twelve seconds. Those observations motivate a **default-first scheduling hypothesis**, not proof of a provider root cause.

The internal scheduler now gives the required default worker its complete bounded traversal before starting the same three supplemental workers. It retains one browser, at most four active pages, the exact fifteen groups and 190 raw-record cap, and the original 180-second budget including the queue. A failed default group prevents supplemental dispatch. No query is retried within the acquisition, no keyword/access method changes, and no incomplete default group is admitted. This is a scheduling refinement within the approved required/optional group contract; release still depends on actual source and application validation.

## Accepted candidate results

- Final Backend regression after scheduling: **1,996 passed**; Flutter: **1,900 passed**; six Emulator suites: **28 passed**; static analysis: no issues. The read-only independent review's cache-publication finding was fixed and independently reproduced as closed before runtime verification. [Verification receipt](verification.json).
- [The latest normal Azure source probe](cloud-source-probe.json) passed in **147.020 seconds**. Required default: all 50 records. All fifteen groups settled: thirteen complete, Community timed out, Music navigation returned 403. There was no retry or replacement. 161 admitted raw records deduplicated to 157, with 71 future public projected activities. The snapshot is explicitly available with incomplete onePA coverage; that status survives the real application/transport path. Previous failures remain as separate hashed evidence.
- With that same real public snapshot and controlled single-interest in-memory requesters, actual SocialAuthority, FirestorePersonalizedEvents, RecommendEvents and Fastify serialization produced **Food 1 / Home 1; Dance 3 / Home 2; Music 2 / Home 2**. Every injected HTTP response was 200 and preserved coverage and Home ordering. This is real-source application evidence using synthetic requesters, not a real user's eligibility or physical-phone acceptance. No actual account was read or changed for this probe, and no additional public source or model calls occurred. Other tags can still have no currently eligible activity within the bounded vocabulary and sample.
- [Signed v77 APK](android-v77-candidate.json): package `com.enmori.app.group`, version `1.0.0-discovery20261117` / 77, existing signing certificate, non-debuggable, unchanged dependencies. Path: `/home/miku/Downloads/ENMORI-discovery-v77-release.apk`. The separate Backend rollout receipt must establish live activation and HTTP behavior.
