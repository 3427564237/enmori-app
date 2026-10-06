# PM delivery guidance — practical Sprint 3 increments

- **Source ID:** S-PM-0930-S3-PRACTICAL
- **Status:** Confirmed PM delivery guidance; not a product/API/storage approval
- **Decision date/owner:** 2026-09-30, LI HOURUI
- **Scope:** Execution of the existing five Sprint 3 module assignments
- **Sources retained:** [coverage and ownership](2026-09-24-sprint3-figma-coverage-ownership.md), [planning policy](2026-09-24-sprint-planning-estimation-policy.md), and repository `AGENTS.md`

LI instructed: “我们的增量要多阻塞少，不要过于工程化或复杂而要求别的组员一直评审”. Prefer small usable increments using approved existing interfaces and feature patterns. A decision blocks only the behavior that depends on it; other independently approved work proceeds.

Prepare one focused packet of related code, owner tests and evidence for the assigned different reviewer. Avoid repeated requests for individual files, preparatory notes or unchanged rules. A review packet may include related ready changes, but each must retain a clear diff, source and evidence boundary. Do not make one owner's module wait for every other module's complete design or review. Preserve early combined checks and JIN's later combined gate with LI review of JIN-authored gate evidence.

This is review coordination, not a waiver of independent review, source authority, tests, merge or acceptance. Never report a local change or an owner check as DU approval, Done, UAT or Release. New physical contracts and unresolved product decisions still need explicit competent approval and a durable decision record. The historical rules and their supersession trails remain intact.

LI also instructed: do not use computer use; if additional credentials or permissions are required, pause the affected action and let LI verify. Existing authorized API/CLI access may be used. Do not retrieve or expose secrets to bypass this pause.

## Later PM clarification — functional coverage and justified simplification

After supplying the two Profile screenshots, LI clarified: “我们最终成品不一定要按照figma但是要包含里面的大部分功能，不包含的功能应该是被优化掉的”. This confirms the functional-delivery direction: the product may change layout and navigation, combine related surfaces, and use justified simplifications rather than reproduce the prototype literally. A first incremental page is not the final Profile acceptance boundary.

An omitted or replaced function must have an explicit disposition and rationale. Distinguish a still-unimplemented/Pending function from a deliberately merged, replaced or removed one; preserve the corresponding requirement and supersession scope. Prefer a simple functional coverage list over new process or repeated document reviews.

This clarification names no specific feature for cancellation, resolves no pending Profile-field purpose or physical contract, and does not by itself approve the proposed first Profile slice. Existing approved capabilities and the 42-route/state Sprint target remain traceable. Related approved surfaces may be combined while preserving their user-visible capability; a specific scope removal requires the competent decision appropriate to the controlling requirement.

LI subsequently approved the exact minimal own Profile preview separately. That later bounded implementation authorization is retained in [S-PM-0930-OWN-PROFILE-01](2026-09-30-own-profile-first-slice-approval.md); it does not broaden this delivery guidance or cancel the remaining features.
