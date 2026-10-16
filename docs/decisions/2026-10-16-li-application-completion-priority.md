# Application completion priority and bounded JIN integration ownership

- Source ID: S-PM-1016-LI-APPLICATION-COMPLETION.
- Authority: human LI HOURUI / PM, 16 October 2026, Asia/Singapore.
- Confirmed instructions: “演示改到下周了，现在不需要准备完整演示了，继续构建完成完善应用和功能是重点”; then “不需要全部我们推进，大头交给jin即可”.

The next demonstration is postponed to next week; its exact date is not specified. Immediate work prioritizes completing and improving the approved application flows. Restoring the disposable demonstration service, obtaining provider credentials, repeated rehearsals and rebuilding demonstration fixtures are deferred. Existing implementation and failed/partial evidence are retained for reuse.

## Earlier allocation wording — retained, narrowed by the clarification below

JIN remains the primary implementation and integration owner for the remaining approved cross-module application work and the unified candidate. This continues [S-PM-1015-LI-JIN-DEMO-INTEGRATION at fd63434b](https://github.com/3427564237/enmori-app/blob/fd63434b1729adbd045950f24735bf75ad7bf47b/docs/decisions/2026-10-15-li-jin-single-owner-demo-integration.md), replacing its immediate demonstration urgency with application completion priority. LI does not start a competing broad integration branch. LI retains PM decisions, LI-owned bounded work, necessary focused repairs and independent acceptance. Feature owners assist JIN on their existing module boundaries; unchanged approved components do not need repeated review.

The earlier [LI direct runtime repair exception](2026-10-16-li-direct-runtime-fix-authorization.md), [connected presentation scope](2026-10-16-li-sponsor-demo-composition.md) and [repeatability mitigation](2026-10-16-li-sponsor-repeatability-correction.md) remain scoped records. Their completed changes are handed to JIN through PR #130 rather than reimplemented. LI-authored changes still require a different reviewer (DU requested); JIN-authored integration follows its existing reviewer path, with LI retaining final acceptance.

This decision changes work priority and allocation only. It does not add product requirements, expand ordinary runtime activation, authorize new infrastructure or dependencies, waive source/privacy/semantic rules, assign a new Sprint deadline, or declare the candidate accepted. Existing requirements, per-module responsibilities, unresolved failures and source supersession history remain in force. Do not infer whole-app completion, UAT, Release or Done from preparation or bounded test passes.

## Confirmed clarification — distribute independent implementation

- Source ID: S-PM-1016-LI-DISTRIBUTED-FEATURE-OWNERSHIP.
- Human LI clarification: “你不要全交给他呀，重要的复杂的可以交给他，或者是拆给两个人需要会相互阻塞很麻烦的可以交给他”.

This clarification supersedes any interpretation of the earlier same-day allocation as assigning all missing feature implementation to JIN or reducing other feature owners to review/support. It also narrows the corresponding wording in #84 comment6215635668 and #44 comment6215639873. The earlier statements are retained for history. The demonstration postponement and application-completion priority remain unchanged.

| Owner | Active responsibility within existing approved scope | Handoff boundary |
| --- | --- | --- |
| JIN | Complex, tightly coupled shared Backend/AI persistence, source-authority and lifecycle/cleanup work; final shared composition and unified candidate. Retains his existing Friend module ownership. | Keep a coupled transaction/lifecycle change under one implementation owner rather than split its two halves across people. Consume independent module increments; do not rewrite their completed components. |
| SHI | Implement remaining approved Event-module work and fix provider/list/detail/source-state defects locally. Review new JIN composition at its existing independent boundary. | Own Event feature files and approved source adapter boundaries; provide an independently usable increment without waiting for the whole candidate. Unapproved participation/registration contracts remain local gaps, not automatically released work. |
| ZHOU | Implement remaining approved Conversation/Persona client and mobile-state work, including repeat-use, cancel, history/read and session behavior; diagnose client-side contributions to observed failures. | Own AI/Persona feature clients. Shared persistence and lifecycle changes belong to JIN; share one minimal failing case instead of competing implementations. Client-only work does not wait for JIN's full candidate. |
| DU | Review current LI #130 delta now. Continue only genuinely unfinished approved Check-in/Footprint/date consumers and module regressions; assist new candidate integration where an actual defect is found. | Own Check-in/History feature files. Date selection → Footprint → saved-return already delivered at #94/#97 is not to be rebuilt. Do not invent a new Calendar data contract. |
| LI | Continue approved Account/Profile/Settings/onboarding/Home presentation work and bounded fixes, PM decisions, DU/ZHOU contribution review and independent acceptance of JIN's gate. | Independent feature/presentation work proceeds without taking over JIN's shared runtime composition or duplicating his integration branch. LI-authored code retains DU review. |

A feature owner must distinguish already delivered behavior, a demonstrated defect, approved unfinished work and a contract gap. This allocation does not itself prove any new defect or release previously withheld behavior. Do not manufacture tasks by repeating passed unchanged tests or rebuilding accepted pages. Shared Home/router/runtime composition belongs to JIN for the unified candidate; contributors supply existing builders/callbacks and focused deltas. A new genuinely coupled package can remain entirely with JIN while other independent module work proceeds.

The next deliverables are module-local coherent code/affected checks from each active owner, one final composition/gate from JIN, and LI's independent acceptance. New-composition review requires that new source; independent module implementation does not. These are assignments, not owner-confirmed estimates. No new deadline, requirements, runtime enablement, merge or S3 completion is inferred.
