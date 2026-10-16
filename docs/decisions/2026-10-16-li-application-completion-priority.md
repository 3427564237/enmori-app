# Application completion priority and continued JIN integration ownership

- Source ID: S-PM-1016-LI-APPLICATION-COMPLETION.
- Authority: human LI HOURUI / PM, 16 October 2026, Asia/Singapore.
- Confirmed instructions: “演示改到下周了，现在不需要准备完整演示了，继续构建完成完善应用和功能是重点”; then “不需要全部我们推进，大头交给jin即可”.

The next demonstration is postponed to next week; its exact date is not specified. Immediate work prioritizes completing and improving the approved application flows. Restoring the disposable demonstration service, obtaining provider credentials, repeated rehearsals and rebuilding demonstration fixtures are deferred. Existing implementation and failed/partial evidence are retained for reuse.

JIN remains the primary implementation and integration owner for the remaining approved cross-module application work and the unified candidate. This continues [S-PM-1015-LI-JIN-DEMO-INTEGRATION at fd63434b](https://github.com/3427564237/enmori-app/blob/fd63434b1729adbd045950f24735bf75ad7bf47b/docs/decisions/2026-10-15-li-jin-single-owner-demo-integration.md), replacing its immediate demonstration urgency with application completion priority. LI does not start a competing broad integration branch. LI retains PM decisions, LI-owned bounded work, necessary focused repairs and independent acceptance. Feature owners assist JIN on their existing module boundaries; unchanged approved components do not need repeated review.

The earlier [LI direct runtime repair exception](2026-10-16-li-direct-runtime-fix-authorization.md), [connected presentation scope](2026-10-16-li-sponsor-demo-composition.md) and [repeatability mitigation](2026-10-16-li-sponsor-repeatability-correction.md) remain scoped records. Their completed changes are handed to JIN through PR #130 rather than reimplemented. LI-authored changes still require a different reviewer (DU requested); JIN-authored integration follows its existing reviewer path, with LI retaining final acceptance.

This decision changes work priority and allocation only. It does not add product requirements, expand ordinary runtime activation, authorize new infrastructure or dependencies, waive source/privacy/semantic rules, assign a new Sprint deadline, or declare the candidate accepted. Existing requirements, per-module responsibilities, unresolved failures and source supersession history remain in force. Do not infer whole-app completion, UAT, Release or Done from preparation or bounded test passes.
