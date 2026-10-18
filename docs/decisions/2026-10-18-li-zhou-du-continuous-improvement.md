# PM decision — ZHOU / DU continuous module improvement

- Source ID: S-PM-1018-LI-ZHOU-DU-CONTINUOUS-IMPROVEMENT.
- Authority: LI HOURUI / ENMORI PM, 18 October 2026, Asia/Singapore.
- Confirmation: human LI instructed: “另外不要让zhou和du闲着他们完成了就给他们安排新的工作比如说 HCI UI UX优化以及进一步完善功能”.
- Scope: next-work allocation within existing approved modules and contracts; HCI/UI/UX quality and approved functional completeness. This is confirmed work direction, not an owner-confirmed start, ETA or completion.

## Sources and supersession

Continue [16 October kickoff and reviewer routing](https://github.com/3427564237/enmori-app/blob/dd1994af69d861253356571d59317c549c879914/docs/decisions/2026-10-16-li-low-blocking-kickoff.md) and its retained source trail. Continue [application completion priority](https://github.com/3427564237/enmori-app/blob/9cf30134a522009f410485c6352df757ed0ab23d/docs/decisions/2026-10-16-li-application-completion-priority.md). This decision makes the next-work queue explicit; it does not replace module ownership, product contracts, independent review or earlier failures.

Observed before assignment: [ZHOU #140](https://github.com/3427564237/enmori-app/pull/140) head `9150c3c7852d43c31bcb59ce80193b08be5c2850` has [LI approval](https://github.com/3427564237/enmori-app/pull/140#pullrequestreview-5558677923). DU's earlier #130 review is complete and [#134](https://github.com/3427564237/enmori-app/pull/134) head `0ceb12124185fe8c9f436d3d35d9f1c0cee64a7e` has DU approval. These are completed review contributions, not whole-module completion or evidence that either owner is currently idle.

The [latest #142 checkpoint](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6247095722) retains the original real-AI failure and coupled JIN/LI disposition work. That dependency blocks the corresponding real-model exercise only; it does not block independent client or Check-in quality work. The [current reusable-entry decision](https://github.com/3427564237/enmori-app/blob/f348278be0615cde9c5297ce06fa750716480f98/docs/decisions/2026-10-17-li-reusable-test-entry.md) continues; no appointment/window gate is reintroduced.

## Start now and pull the next item after delivery

Keep one primary implementation packet per owner. If a previous packet is delivered or awaiting review, start the next independent item below immediately. Do not wait for old PR merge, the model repair or every module. A blocker pauses only the dependent behavior. Review feedback on the owner's code remains the first correction priority.

| Owner / existing task | Next usable increment | Following queue |
| --- | --- | --- |
| ZHOU @YaoyinZhou3922 / [#83](https://github.com/3427564237/enmori-app/issues/83) | AI/Persona HCI and UI/UX pass on the identified current candidate: check keyboard and large-text reachability of existing input/actions, semantic labels/focus, understandable existing loading/empty/error states, and existing Back/cancel/return behavior. Fix the highest-impact demonstrated client defect within approved behavior and deliver source plus before/after evidence. | Reconcile approved AI/Persona client scope against the current candidate and complete the next confirmed missing consumer or regression in session isolation, cancellation, Reload/readback or repeated use. Reuse #133/#140 evidence for unchanged cases. Share only the minimal coupled counterexample with JIN; JIN retains shared storage/lifecycle/composition. |
| DU @397781783dk-prog / [#82](https://github.com/3427564237/enmori-app/issues/82) | Check-in/Footprint HCI and UI/UX pass: verify the existing save → date/Footprint list → saved detail → return journey, large text/keyboard, existing control labels/focus, date/time-zone clarity and existing loading/empty/error/Retry/Next states. Fix the highest-impact demonstrated defect and deliver source plus before/after evidence. | Reconcile approved Check-in/Footprint scope and complete the next confirmed gap in date switching, paging, save/readback or fresh return/session handling. Reuse accepted #89/#94/#97 paths; do not rebuild Calendar/date navigation already delivered. Continue focused review of new LI contributions as needed without repeating completed #130/#134 reviews. |

These are inspection-and-repair assignments, not assertions that the listed controls are broken. Use the existing theme/components, approved source behavior and current candidate. Include the exact contract/source for a functional change. If no defect is found in a path, record that concise result and continue to the next existing approved gap or independent quality item; do not create cosmetic churn or fabricate a missing feature. A genuinely new function or changed business rule is a specific proposal for LI, while independent approved work continues.

## Delivery, acceptance and coordination

Each usable increment is one coherent code/tests/evidence packet in the existing task, with exact base/head, demonstrated problem or approved missing behavior, changed behavior, affected checks and remaining failures/Blocked/Not Run. Prefer working UI/function improvements over a separate broad audit report. Owners may use existing widget/component harnesses while real device/runtime prerequisites are unavailable; label those results accurately.

ZHOU new code → LI review; DU new code → LI review; LI new code → DU review. SHI continues independent Android verification of ZHOU/DU contributions when the applicable candidate/runtime is usable. Supply a compact device procedure with the packet; device availability does not block independent local work. JIN retains the shared router/bootstrap/runtime composition, and LI retains Home presentation; coordinate a minimal existing builder/callback contribution if needed.

On taking the next item, post the current packet, exact baseline, first runnable artifact or credible SGT ETA, and any local blocker plus the independent action continuing meanwhile. This is a request, not a claim that an owner has acknowledged or agreed to an ETA. No new date commitment is invented. Completion of a packet releases the next independent item in this queue without another kickoff approval for the same approved scope.

Do not introduce new dependencies, architecture, API/schema/index, privacy/retention policy, automatic retry or new product behavior under an optimization label. Preserve original failures and current runtime restrictions. This assignment does not authorize merge, Issue closure, Project transitions or whole-module/Sprint/UAT/Release/Done claims.
