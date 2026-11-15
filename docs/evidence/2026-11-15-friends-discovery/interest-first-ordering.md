# Event interest-first ordering — 15 November 2026

Authority: [LI's confirmed ordering amendment](../../decisions/2026-11-15-li-event-interest-first-ordering.md).

## Implementation

The Backend now orders the complete eligible candidate set by presence of a current active selected-interest match, then existing score descending, start instant ascending and stable identity ascending. The same order supplies Home Top 2 and all/next groups. Scores, reasons, eligibility and wire shapes remain unchanged; both v3 and legacy v2 receive the priority. Friend recommendation and Friends Activity ranking are unaffected. The existing v68 Android candidate can consume this response without a rebuild.

## Source verification

- Pinned Node 24.19.0, existing locked TypeScript compiler: build passed.
- `node --test 'backend/dist/test/**/*.test.js'`: **1944 passed, 0 failed, 0 skipped**.
- Five new assertions failed against the old score-only order before the fix. The first post-fix targeted run passed 107 of 108; its remaining fixture incorrectly assumed hashed identity order. Giving the second synthetic Gaming occurrence a later start made the fixture's intended time order explicit. The subsequent full run passed.
- Domain regressions cover Gaming at 4 points ahead of unmatched Music with maximum friend/location/age contributions; stable order within both groups; no selected interests; absent signals; and time/publication eligibility.
- The HTTP test exercises the real classification, personalized source adapter, application and route over isolated in-memory records: five authorized friends favour Music, but both Gaming matches lead Home/all in modern and legacy responses. Changing the stored selection to Music changes the next response. Reasons remain truthful and responses remain `no-store`.
- Earlier selection/source-failure/privacy/age/ignore and OpenAPI tests are included in the full run. No automated test accesses live account records or generates an AI reply.
- Flutter recommendation adapter/page/navigation regressions passed **26 tests**, including two explicit v2/v3 cases accepting interest-first order when a later candidate has a higher score. Interest-save invalidation and preserved backend order remain covered. Targeted static analysis found no issues. `git diff --check` passed.

## Deployment and runtime verification

The existing Azure service now runs package `2026111507205768.zip`, built from sorting source commit `fac7723338ecd0045c214d068d9f41567cc8aac7`. All 8561 package entries were verified before activation. The application-mounted manifest and ranking-module hash were verified over the existing authenticated Azure SSH path. Executing that mounted module with synthetic inputs put Gaming at 4 points before Music at 13 points. This was a pure calculation, with no product records or model request.

Authenticated readback using the existing ordinary demo account returned **63 recommendations**, all with interest matches, and Home equalled the first two of all. The existing administrator account returned a successful empty list; its profile, interests and recommendation preferences matched the pre-update hashes. The live ordinary set did not contain a non-interest group, so cross-group precedence is evidenced by the mounted synthetic calculation and isolated real-route tests, not by a mixed live-account list. No real account preferences were changed.

The old runtime's service-owner lease was already expired and AI status unavailable before this update. The old operator's live-baseline assumption refused before stopping anything. Its pre-stop check was adjusted to admit an expired same-service owner while retaining structural/future-time, identity, financial, positive-drain and exact-snapshot checks; nine isolated gate checks passed. Stop/drain and restart then preserved the complete financial records and all existing settings. Generation advanced from 86 to 87 and lease renewal was observed; runtime AI admission returned ready. No paid reply or notification probe was issued.

The first activation command returned 502. Read-only reconciliation confirmed that it had ended without switching the selector. The already-verified ZIP was then selected with exact hash checks. Azure's application `exec` shell was unavailable; SSH succeeded after adapting its terminal CRLF marker parsing. These earlier attempts are not hidden or claimed as successful checks.

Cold start took about **311 seconds** from start request to listening. The first recommendation read returned 503 with onePA unavailable; an explicit source refresh also returned 503. Once both sources reported ready, warm all/Home reads succeeded (ordinary account about 5.9/5.5 seconds). This proves the observed warm reads, not reliable cold-start availability.

The [sanitized runtime receipt](interest-first-runtime.json) records package hashes, mounted-code proof, source failures, successful reads and remaining limits. The v68 APK receipt continues to identify its original client source commit; no new APK is necessary for this Backend-only ordering change. No phone was connected, and LI's actual account/physical-phone acceptance was not performed.
