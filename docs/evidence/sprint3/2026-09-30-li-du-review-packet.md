# LI → DU: one bounded navigation review packet

**Status:** Prepared locally; DU has not reviewed it. Owner LI HOURUI, assigned different reviewer DU KUN. Task [#45](https://github.com/3427564237/enmori-app/issues/45).

## Exact review scope

Published [Draft PR #43](https://github.com/3427564237/enmori-app/pull/43), head `27b899fe93066298bd36d4d5dadf0f90a374a50d`, base `479619e8d124f3342458506fc145dc4bfbe3f483`:

- `lib/app/router/app_router.dart`: push See All; on return, stop if Home is disposed or no longer authenticated; otherwise recompute Home.
- `test/app/home_event_navigation_test.dart`: published three regression cases for AppBar Back, system Back and late See All completion.
- `docs/evidence/sprint3/2026-09-25-first-slice.md`: Windows checks and explicitly unexecuted gates.

Local addition on this head: one further case in the same test file, **session expiry during See All keeps the sign-in route**. It uses the actual app shell and the existing provider/repository testing boundary. Product code is unchanged. This addition is not yet in the published PR; reviewer approval of the old PR head must not be claimed to cover it.

## Focused reviewer questions

1. Do AppBar/system Back preserve Home and make an independent Home computation under Q16, rather than reuse See All output?
2. Do late requests and a lost/disposed authenticated Home stop without stale UI or a new Home request?
3. Do the tests prove observable navigation and safe states without changing Event eligibility, API/schema, dependencies or product rules?

Use the owner results and environment in [the current checkpoint](2026-09-30-li-start.md), preserving its local-test versus published-head distinction. There is no need to review each preparatory note separately or reapprove unchanged business rules. Recheck the base/diff if #42 merges and #43 is retargeted.

The first Profile preview is a separate proposed behavior awaiting LI's explicit confirmation. After it is authorized and implemented, put its bounded code and owner evidence into a coherent review packet with DU. Do not infer approval from this packet, historical owner checks or a model audit. Android execution, cross-feature gates, merge, acceptance and Done remain independently recorded.
