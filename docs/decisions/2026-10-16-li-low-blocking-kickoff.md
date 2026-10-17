# PM decision — parallel module kickoff and Android verification

- Source ID: S-PM-1016-LI-LOW-BLOCKING-KICKOFF.
- Authority: LI HOURUI / ENMORI PM, 16 October 2026, Asia/Singapore.
- Confirmation: LI approved the proposed five-owner allocation and next-work arrangement, then explicitly instructed: “好的那帮我发布分工和开工的催促”.
- Scope: implementation allocation, incremental delivery order, reviewer routing and use of the two available Android devices within existing approved contracts.
- Status: confirmed PM work direction; not owner-confirmed estimates, new product authority or acceptance.

## Sources and supersession

Continue [S-PM-1016-LI-DISTRIBUTED-FEATURE-OWNERSHIP](https://github.com/3427564237/enmori-app/blob/9cf30134a522009f410485c6352df757ed0ab23d/docs/decisions/2026-10-16-li-application-completion-priority.md) and its preserved earlier allocation history. Continue the [existing independent reviewer assignments](https://github.com/3427564237/enmori-app/blob/9cf30134a522009f410485c6352df757ed0ab23d/docs/decisions/2026-10-14-li-ai-acceleration-and-target.md).

The earlier instruction to DU to review #130 is now satisfied: [DU APPROVED 5547948011](https://github.com/3427564237/enmori-app/pull/130#pullrequestreview-5547948011) binds exact head 9cf30134a522009f410485c6352df757ed0ab23d. [SHI APPROVED 5537419714](https://github.com/3427564237/enmori-app/pull/128#pullrequestreview-5537419714) binds #128 correction 6523a98f8a401045914212ab118e490eccfff336 and closes that R1 finding at that source. These replace only the corresponding pending-review observations; original failures, tested sources and bounded scopes remain in history. No repeated unchanged review is requested.

The demonstration postponement to next week remains unchanged; no exact demonstration date or new development deadline has been confirmed. Application improvement takes priority over restoring the expired disposable demonstration service or repeated rehearsals.

## Start independent module increments now

| Owner | Responsibility | First coherent delivery |
| --- | --- | --- |
| JIN @chuxi12483468 | Complex, tightly coupled shared Backend/AI storage, source authority, lifecycle and cleanup; final composition/candidate; retains Friend. | Consume reviewed #128/#130 without rewriting them, deliver the next source-bound unified candidate, and address the smallest demonstrated coupled failure with ZHOU. Continue approved real Friend consumers as capacity and dependencies permit; fixture data is not delivery of real relationships. |
| SHI @GGGGHOST-CN | Remaining approved Event work, source adapters and local defects; independent review of new JIN code. | Deliver an independently usable approved list/detail/external-open/return increment or demonstrated repair, including applicable loading/empty/error/source-loss behavior. Reuse #130's time-encoding correction. Participation, registration and people/count fields remain subject to their own existing authority. |
| ZHOU @YaoyinZhou3922 | AI/Persona clients, session state, cancellation, readback and repeat use. | Deliver the client checks and any demonstrated correction for send → Reload → next send and cancel/leave → return, preserving same-session/request identity and late-callback protections. Share one minimal counterexample with JIN rather than assume a client or model cause. |
| DU @397781783dk-prog | Check-in/Footprint approved unfinished consumers and actual module regressions; LI code review. | #130 review is complete. Reconcile the current candidate against approved scope, then deliver only a confirmed gap or regression in date switching/paging/save/readback or another existing approved path. Do not rebuild delivered #94/#97 date → Footprint → saved-return. If no functional gap is found, state that and assist existing UI/accessibility verification rather than invent a new Calendar feature. |
| LI @3427564237 | Account/Profile/Settings/onboarding, Home presentation and bounded repairs; PM and independent acceptance. | Complete one independently usable approved account/profile/settings/onboarding flow or demonstrated repair, supplying feature widgets/builders to JIN; review new DU/ZHOU work and JIN-authored gate evidence. |

A module-local approved backend change does not transfer to JIN merely because it is in backend/. JIN owns shared and coupled mechanisms. JIN retains the unified candidate's router/bootstrap/runtime composition; LI retains independent Home presentation. Feature authors provide existing builders/callbacks and focused deltas without competing shared composition branches.

Keep one primary In Progress item per owner. A coherent packet in review does not block the owner's next independent approved increment. A tightly coupled transaction/lifecycle repair stays with one implementation owner; any further reassignment remains a named LI decision rather than an automatic transfer of other modules.

## Delivery and review

The next sequence is: (1) make existing main flows repeatably usable; (2) add the next approved useful consumer/feature increment; (3) consolidate cross-feature/platform quality on an identified candidate. UX checks apply in every increment, not only the final sequence. This sequence is not a claim that all work is Ready or a new calendar commitment.

Each owner implements and maintains relevant tests. Publish one coherent source/tests/evidence packet per useful increment with exact source, actual results and remaining failures/Not Run/contract gaps. Use existing Issue/PR records and templates, not additional planning reports. Independent implementation proceeds while related review is in progress; no all-module, old-PR-merge or unchanged-component-review wait.

Continue: JIN new code → SHI; SHI Event → ZHOU; ZHOU new client → LI; DU new code → LI; LI new code → DU. LI independently reviews JIN-authored integration/gate evidence. Reviewers cannot approve their own authored delta. New composition is checked for its changed effects; old component approvals do not automatically prove a new combined runtime.

Review relevant code/tests/evidence together in one packet. Run affected checks for local increments and the applicable full gate for a published unified candidate. Preserve exact original failing conditions and outcomes; later differently scoped passes do not erase failures.

## Two Android devices

LI confirmed only LI and SHI currently have Android devices.

- LI primarily cross-verifies SHI Event source actions/browser/return, JIN Friend and the unified candidate, and final user journeys.
- SHI primarily cross-verifies ZHOU AI/Persona, DU Check-in/Footprint and LI Account/Profile/Settings/onboarding, batching applicable steps on one identified candidate.
- Authors without Android continue code, component tests, applicable Emulator checks and review. Supply a concise version-bound procedure/expected result for LI or SHI; fix their own defects after execution feedback.
- Device owners' own-module execution remains author self-test. Required different-reviewer and applicable independent/platform verification remain distinct.
- Do not assume a second backend, new credentials or extra infrastructure. If both devices share one controlled stateful service, serialize conflicting persistence/lifecycle journeys and use the other device for non-conflicting checks.
- Android evidence never replaces any applicable iOS gate.

Use existing authorized runtime/tooling and prerequisites for necessary verification. Do not restore a disposable demonstration fixture solely for rehearsal or bypass absent credentials, original held calls or lifecycle gates.

## Per-increment quality and kickoff response

Within approved behavior, check understandable loading/empty/error states; permitted recovery; consistent Back/cancel/draft handling; no duplicate effects or stale-session overwrites; large text, keyboard/safe area, accessible controls/focus and applicable TalkBack checks. Reuse the accepted theme/components. Do not infer automatic retry, new controls or redesign authority from this quality direction.

Start the independent approved package now. Each owner can code while posting one concise response in the Sprint 3 parent: current package + source/PR or first runnable-packet ETA in SGT + exact blocker/responsible dependency + independent action continuing meanwhile. If already delivered, link the actual artifact instead of repeating old reports. If no credible ETA exists, give the concrete dependency and next checkpoint; do not fabricate a promise.

This direction does not add product behavior, API/schema/dependency/infrastructure, enable ordinary/cloud/provider runtime, authorize merging or closing tasks, change Project state, or establish whole-app/Sprint/UAT/Release/Done acceptance. No teammate is represented as already started, committed to an ETA or completed verification merely because this kickoff is published.
