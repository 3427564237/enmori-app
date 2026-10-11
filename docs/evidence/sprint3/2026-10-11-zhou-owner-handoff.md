# ZHOU owner mapping and 11 October feasibility — local delivery

Date: 11 October 2026, Asia/Shanghai / SGT (both UTC+08:00). Owner: ZHOU YAOYIN. Status: **completed local owner-report packet; not uploaded, not a new PM decision or product-code delivery**.

This answers the remaining [#68 owner-report condition](https://github.com/3427564237/enmori-app/issues/68) and [LI's latest #44 instruction](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6097828815): preserve the original route/state IDs, identify delivered evidence and remaining mappings, give the next concrete artifact/head and SGT timing, and assess the original 11 October target. The user requested local work only. Remote Issue/PR/Project status has not been changed; the reporting checkbox remains outstanding remotely until an authorized publication is received.

## Current source and authority

- Accepted product candidate: #72 `0839c46b865bb6092020ad0ae77e17922ea40eb0`; executable source `af56e6ea979039102eff1a2fd52d974f484fc8a3`.
- JIN's final combined evidence: #73 `c3e1f84bd305093ffe7f4d6d83b6df3d0289baa5`. LI's [formal final APPROVE](https://github.com/3427564237/enmori-app/pull/73#pullrequestreview-5479046298) covers that exact evidence/candidate.
- Latest controlling [final-candidate acceptance](../../decisions/2026-10-10-li-final-isolated-candidate-acceptance.md) is an unchanged local copy of the decision at `aaf94e1e0518c227ebcefb67b92be3e86b75672d`; provenance and blob identity are in the [machine-readable mapping](2026-10-11-zhou-owner-mapping.json).
- Retain [LI's isolated P08 selection](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md), [applicable P08 contract](../../planning/2026-10-07-zhou-persona-first-contract-delta.md), [component acceptance](https://github.com/3427564237/enmori-app/blob/541981808681fcc8ef6c8ca8463ddb3375cbba29/docs/decisions/2026-10-10-li-persona-p08-component-acceptance.md), and earlier reviews at their exact sources.
- Preserve the [original Q04-C inventory](../ui/figma-make-v5/Q04-C_ROUTE_STATE_MATRIX.md) and approved Q04-D dispositions. Inventory labels and prototype states are supporting evidence, not independent implementation authority. Old Not Run/Pending observations remain historical; they do not reopen the accepted P08 source or final gate.

The local documentation branch is `codex/zhou-local-handoff-20261011`, based on the accepted candidate. It records owner reporting and the existing decision only. It is not a replacement product candidate. The local delivery receipt under `D:/3851 AI/formal/evidence/2026-10-11-zhou-local-handoff-receipt.json` records the actual packet commit, completion time and check results after commit, avoiding a self-referential hash in this document.

## All six original mappings

| Original route ID / inventory number | Matrix / state IDs | Delivered behavior and evidence | Remaining boundary |
| --- | --- | --- | --- |
| `ai-customize` / 29 | M23; NS31 | Accepted isolated `/personas` overview: Loading, Active, No Active, failure and management entry. [Page](../../../lib/features/personas/presentation/persona_overview_page.dart), [page tests](../../../test/features/personas/persona_pages_test.dart), PC13 and current-source acceptance below. | Ordinary/controlled-demo enablement and global visual conformance remain outside the acceptance. |
| `persona-management` / 41 | M24; NS31, NS32, NS33 | Accepted isolated `/personas/manage`: owned list, at-most-five capacity, selection intent, explicit activation/replacement, confirmed inactive/Active deletion, zero Active, reread/recovery. [Page](../../../lib/features/personas/presentation/persona_management_page.dart), [session](../../../lib/features/personas/domain/persona_session.dart), [accessibility tests](../../../test/features/personas/persona_accessibility_test.dart). | No templates, duplication, roleplay, Try Your Persona or model preview is included. |
| `edit-persona` / 42 | M25; NS32, NS34 | Accepted isolated `/personas/new` and `/personas/:personaId/edit` use the four-field [editor](../../../lib/features/personas/presentation/persona_editor_page.dart). Defaults, validation, stale/unavailable outcomes, save and dirty-exit handling are covered by page/session/real-client tests and PC13. | `/personas/new` implements the approved NS32 state; it does not add an invented seventh original mapping. No free-text instructions or model preview. |
| `ai-assistant` / 30 | M26; NS35, NS36, NS37 | Not delivered by P08. Existing [internal runtime](../../../backend/src/ai-runtime/README.md) is a separately bounded component, not a public AI/Conversation operation or UI. | P04–P07, M26-specific P08 choices, public contracts, full request lifecycle and model/host evidence remain unresolved for the affected implementation. |
| `ai-limited` / 32 | M26; consent/authority presentation, with NS35–NS37 operational integration distinct | Not delivered by P08. It denotes limited Conversation authority/consent, not Persona load failure or Q31 timeout. | Explicit consent/purpose/revocation mapping and final M26 presentation/copy are required; no permission is inferred from one existing optional-processing boolean. |
| `ai-safety` / 31 | M27; no invented NS ID | Preserved as prototype/evidence-only under the approved Q04-D disposition. | LI must resolve whether and where a standalone production surface/content belongs before implementing it. This does not remove existing AI safety obligations. |

There are three accepted isolated Persona mappings, two outstanding M26 mappings and one retained M27 disposition. These categories are **not a whole-product percentage**, six finished routes, or cancellation/deferral of the original target.

## State and acceptance evidence

| State / criterion | Concrete source or check | Evidence boundary |
| --- | --- | --- |
| NS31 | Overview/management/session; selection versus Active, explicit confirmation/cancel/Back; four selection × activation combinations in accessibility tests | Human item-4 corrected TalkBack result is separate from native semantics and automated focus evidence. |
| NS32 | Editor defaults/inactive creation/capacity; [real-client session tests](../../../test/features/personas/persona_client_session_test.dart), [adversarial tests](../../../test/features/personas/persona_session_adversarial_test.dart) for uncertain create, recovery 412, late success and explicit disposition | The approved page replaces the prototype create-modal representation; duplicate-effect protection is not a Persona-copy feature. |
| NS33 | Management delete confirmation; actual Active deletion followed by independent owner/peer persistence checks | Deletion clears Active without a replacement; no Trash/Restore. |
| NS34 | Editor and shared page parts; validation, enums, conflict/unavailable state, save and dirty/in-flight exit | Same-UID fresh sessions cannot restore an old draft; no preview implementation is claimed. |
| NS35, NS36, NS37 | Original matrix entries retained in the machine-readable packet | Not implemented by P08; Persona error/recovery tests cannot substitute for AI/Conversation acceptance. |
| PC11 / PC12 | [Repository tests](../../../test/features/personas/backend_persona_repository_test.dart), page/session tests, actual BackendApiClient delayed-token/header/body controls | Operation-specific status/body/error handling, a single non-AI foreground budget, late-result ownership and revision/page lifetime checks. |
| PC13 | [Real Android flow](../../../integration_test/persona_real_backend_test.dart), [guarded runner](../../../tool/run_persona_android_emulators.mjs), [fixture and host readback](../../../tool/persona_android_fixture.mjs) | Actual isolated synthetic Auth → HTTPS Backend → Firestore, two owners and independently checked saved data. |
| Client PC14 / LI handoff | [Typed page composition](../../../lib/app/router/isolated_persona_pages.dart), [router](../../../lib/app/router/app_router.dart), [router tests](../../../test/app/persona_home_router_test.dart), real four builders in PC13 | Home/router are LI's unchanged #70 contribution with DU approval. ZHOU supplies feature/session/Repository builders; ordinary composition omits the feature. |

Source-bound accepted results, not new executions in this reporting task:

- Owner initial `ab69c03`: full Flutter 307/307 and physical Android/API35 PC13 1/1 each at font scales 1.0 and 2.0. Retain the [initial handoff and failed attempts](2026-10-09-zhou-persona-review-handoff.md).
- Corrected executable `af56e6e`: affected page/accessibility 22/22, analysis and native Android tree inspection. User TalkBack 1/2/3/5/6/7 Pass belongs to `82d8e89`; [item 4 audible retest Pass](https://github.com/3427564237/enmori-app/pull/72#issuecomment-6081846892) belongs to `af56e6e`, APK SHA-256 `e2e74ad02669b2db549ef10b515a261fb289bad37b47b8fe36fd18cd270c95b6`.
- JIN's [current-source review](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470543060), LI's [component acceptance](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5474994250), and the [final gate](https://github.com/3427564237/enmori-app/pull/73#pullrequestreview-5479046298) are complete. Final JIN evidence attributes Backend 366/366, real Emulator 71/71, Flutter 308/308, analysis, Persona Android 1/1 and My Friends/Profile Android 1/1 to the final tree. These two Android fixtures are not a fabricated all-feature scenario or history UI proof.
- Physical keyboard, iOS and global visual/accessibility conformance remain unverified limitations, not newly invented standalone gates. The October 9 manual session expired; an installed test APK is not evidence of a currently running fixture. This task neither starts a device session nor repeats accepted product tests.

## Next artifact, SGT timing and 11 October feasibility

| Deliverable | Actual status / head | Timing and feasibility |
| --- | --- | --- |
| Approved isolated P08 implementation and exact final candidate | Accepted #72 `0839c46`; JIN #73 `c3e1f84`; LI decision `aaf94e1` | Completed within the original target date for this bounded scope. No implementation/review wait remains for these exact sources. |
| Remaining #68 owner mapping/report | This document, JSON mapping and source-bound local validation | Produced locally on 11 October; exact completion SGT timestamp and local packet head are in the delivery receipt. Remote submission has no ETA while the user's no-upload instruction remains active. |
| Next concrete decision input | [Remaining AI implementation decisions](../../planning/2026-10-11-zhou-next-ai-decision-inputs.md), in the same local packet | Prepared locally now. It narrows the unresolved decisions using the existing proposal; it does not approve an option or require another P08 review. |
| Next M26 product implementation | No approved next-slice head or task identified at this checkpoint | A credible implementation/acceptance ETA requires a recorded competent decision and bounded assignment. No start/finish time or 11 October all-six-mapping completion promise is supported now. |
| M27 production surface | Prototype/evidence-only disposition retained | Surface placement/content authority is unresolved. No new production page is scheduled by this report. |

The original 11 October / 42-route / 38-state target remains unchanged. For ZHOU's remaining M26/M27 mappings, current authority and evidence are insufficient to promise completion today; this is a reported feasibility gap, not an automatic cancellation, deadline change or claim about other owners' schedules. The specific blockers are the decisions below, not missing P08 code, unchanged Backend approval, another final-gate rerun or PR merge.

## Local validation and handoff boundary

The local checker verifies all six original IDs, M23–M27 and NS31–NS37 coverage, accepted-source file existence, the exact copied decision blob, document links and a docs-only delta from #72. Its actual result and retained log are recorded in the delivery receipt. These are document/source consistency checks, not new Flutter/Backend/Android tests or independent JIN/LI approval.

All work stays under `D:/3851 AI`: formal repository documents in `formal/enmori-app`, final receipt in `formal/evidence`, and scripts/raw readbacks/check logs in `drafts/2026-10-11-zhou-local-handoff`. No push, PR/comment/review request, Issue/Project update, merge, runtime enablement, provider/model access or dependency change is performed.
