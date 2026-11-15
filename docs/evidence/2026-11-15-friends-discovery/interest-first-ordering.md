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
- The unchanged Flutter recommendation adapter/page/navigation regressions passed **24 tests**, including interest-save invalidation and preserved backend order. `git diff --check` passed.

## Runtime boundary

The source result does not establish a deployed order or the contents of LI's current live recommendations. Deployment and live checks, if completed, are recorded separately. The v68 APK receipt continues to identify its original client source commit; this follow-up changes Backend sorting only.
