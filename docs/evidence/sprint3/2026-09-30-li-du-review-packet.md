# LI → DU: one bounded Profile and navigation review packet

**Status:** Prepared locally; DU has not reviewed it. Owner LI HOURUI, assigned different reviewer DU KUN. Task [#45](https://github.com/3427564237/enmori-app/issues/45).

## Exact review scope

Published [Draft PR #43](https://github.com/3427564237/enmori-app/pull/43), head `27b899fe93066298bd36d4d5dadf0f90a374a50d`, base `479619e8d124f3342458506fc145dc4bfbe3f483`:

- `lib/app/router/app_router.dart`: push See All; on return, stop if Home is disposed or no longer authenticated; otherwise recompute Home.
- `test/app/home_event_navigation_test.dart`: published three regression cases for AppBar Back, system Back and late See All completion.
- `docs/evidence/sprint3/2026-09-25-first-slice.md`: Windows checks and explicitly unexecuted gates.

Local addition on this head: one further case in the same test file, **session expiry during See All keeps the sign-in route**. It uses the actual app shell and the existing provider/repository testing boundary. Product code is unchanged. This addition is not yet in the published PR; reviewer approval of the old PR head must not be claimed to cover it.

That paragraph describes preparation commit `5dbe841`. The later approved Profile implementation is local commit `f56694a6497684d775910bcbfb7fd40830a0d461`; compare `5dbe841..f56694a` for its bounded diff, or `479619e8d124f3342458506fc145dc4bfbe3f483..f56694a` for the combined navigation/Profile code and preparation material. The old published #43 head does not include this increment.

- `lib/features/account/presentation/own_profile_controller.dart` and `own_profile_page.dart`: current owner's existing Username and Interests, safe load/retry and latest-operation/lifetime guards.
- `lib/app/home_shell_page.dart` and `lib/app/router/app_router.dart`: Profile entry, push/pop/editor composition, independent Home refresh, and identity-scoped router lifetime.
- `test/app/own_profile_flow_test.dart`: 11 repository-boundary Profile cases, including successful save followed by Done or Back, cancellation, safe failure, late/overlapping reads, account replacement, auth loss and small-screen enlarged-text scrolling.
- Existing navigation/Event test fixtures now provide a stable subject with their overridden gate and wait for scroll layout before tapping. Their existing behaviors remain tested.
- [PM approval](../../decisions/2026-09-30-own-profile-first-slice-approval.md) and the [approved preview](../../planning/2026-09-30-li-own-profile-first-slice-preview.md) identify the exact authority, scope and unchanged contracts. These are context for this one code review, not requests to approve separate documents or invent missing Profile contracts.

## Focused reviewer questions

1. Do AppBar/system Back preserve Home and make an independent Home computation under Q16, rather than reuse See All output?
2. Do late requests and a lost/disposed authenticated Home stop without stale UI or a new Home request?
3. Do the tests prove observable navigation and safe states without changing Event eligibility, API/schema, dependencies or product rules?
4. Does Profile show the current owner's canonical values and preserve empty/inactive Interest semantics, with a real reread after saving and no mutation on cancellation?
5. Do read ordering, route disposal, identity replacement and auth loss prevent previous-account/old-route updates, while preserving the existing auth subscription and gate behavior?

Use the owner results and environment in [the current checkpoint](2026-09-30-li-start.md), preserving its local-test versus published-head distinction. There is no need to review each preparatory note separately or reapprove unchanged business rules. Recheck the base/diff if #42 merges and #43 is retargeted.

LI explicitly confirmed the first Profile preview, and the implementation plus owner evidence is now included here. The full local Flutter suite passes 113/113 and pinned analysis reports no issues. DU review is still Not Run; this packet has not been published or sent to DU. Do not infer approval from owner checks or a model audit. Real Backend/device execution, cross-feature gates, merge, acceptance and Done remain independently recorded.
