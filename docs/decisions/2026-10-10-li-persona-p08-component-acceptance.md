# LI acceptance — full isolated Persona P08 component

- **Source ID:** S-PM-1010-LI-PERSONA-P08-COMPONENT-ACCEPTANCE.
- **Status:** Accepted for the selected isolated A component at the exact source below; final combined gate/merge and overall product acceptance remain separate.
- **Authority/date:** LI HOURUI, ENMORI PM, 10 October 2026, Asia/Singapore.
- **Approved scope:** [full isolated P08 A at 141ebcf](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md), unchanged [candidate P08/PC11–PC13/client PC14 at 55fa4a7](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md), task [#68](https://github.com/3427564237/enmori-app/issues/68).
- **Accepted implementation/final candidate:** [#72](https://github.com/3427564237/enmori-app/pull/72), `0839c46b865bb6092020ad0ae77e17922ea40eb0`; byte-identical executable product `af56e6ea979039102eff1a2fd52d974f484fc8a3`.
- **Independent ZHOU review:** JIN [5470329704](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470329704) at `17aa358`, followed by current-head focused [5470543060](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470543060). Each keeps its actual tested head/results.
- **Unchanged LI Home/router:** #70 `f646e26`, independently approved by DU [5467840467](https://github.com/3427564237/enmori-app/pull/70#pullrequestreview-5467840467); #72 changes no shared Home/router source.
- **LI formal scoped review/acceptance:** [APPROVE 5474994250](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5474994250), exact current head. [LI current verification, failed attempts and synthetic visual evidence](../evidence/sprint3/2026-10-10-li-persona-acceptance-verification.md).

## Accepted behavior

Accept only the existing full isolated A deliverable: `/personas`, `/personas/manage`, `/personas/new`, `/personas/{personaId}/edit`; M23–M25 / NS31–NS34; exact four fields/defaults, distinct loading/empty/no-Active/failure, local selection plus explicit activation, capacity, confirmed deletion of Active without replacement, dirty/in-flight exit confirmation and independent saved-state rereads.

PC11/PC12/client PC14 include operation-specific status/body/error handling, JSON-body DELETE with empty success only for its 204, one non-AI 15-second foreground budget, eligibility before dispatch, separately observed Persona-create late completion, retained exact command/recovery-412/disposition and highest-observed owner revision. Authentication refresh preserves the existing observed session while real signout/re-login, including the same UID, invalidates old-session results. This is the reviewed bounded shared-client/Auth contribution, not a new architecture or product contract.

Accept only slice-scoped Q04-DEV-17–19 and candidate-used SP-01/03/04/05/10/12 visual/interaction/accessibility behavior using existing widgets. Selection's filled border/checkmark/text and focusable selected semantics remain independent of server Active/Inactive. Confirmations/cancellation/focus and labeled fields/controls are supported by current tests, actual Android/injected-keyboard checks, LI visual inspection and attributed human TalkBack results. No global style/Figma comparator or complete accessibility-conformance approval is granted.

## Evidence and exact attribution

LI independently executed at current `0839c46`: Flutter **308/308**, clean fatal-info analysis, Backend build and **366/366**, actual isolated Auth/Firestore Emulator **71/71**, and API 36 Android PC13 **1/1** at system font scale **1.0**, plus direct host owner empty/revision **4** and peer empty/revision **0** rereads. The unchanged second Android invocation passed with exit 0 and cleanup; the first dedicated-package preflight rejection before installation remains a failed attempt with unproved transient cause. No assertion/guard was bypassed or source/harness changed.

Owner physical Android/API 35 PC13 at font scales 1.0 and 2.0, initial full 307/307 and later 22/22, and JIN prior actual Android/full regression/current affected review remain separately attributed to their declared sources. They are not new LI runs or a combined total. LI's six published synthetic software renders are fixture-based visual evidence, not physical Android screenshots.

Human TalkBack items 1,2,3,5,6,7 remain user-reported Pass on `82d8e89`; item 4's [later audible retest Pass](https://github.com/3427564237/enmori-app/pull/72#issuecomment-6081846892) binds corrected `af56e6e` and APK `e2e74ad...`. All seven have passing evidence across two checkpoints. Preserve older Pending/Not Run records as history; no all-seven latest-APK rerun or independently heard LI/JIN audio is inferred. Physical keyboard/iOS/global accessibility remain unverified limits; no new standalone gate is invented.

## Precise supersession and remaining integration

This decision supersedes the earlier **LI component visual/accessibility/Persona acceptance Pending** observations only for the exact selected source and checks above. It retains the original A approval, JIN release gate, Backend acceptance, independent source reviews and historical limitations. The earlier missing-feature handoff is now supplied by the actual four concrete page builders and session/Repository composition in `integration_test/persona_real_backend_test.dart`; no LI navigation-interface change is required.

The current #72 source already contains #69 `00cb606` and #70 `f646e26`; use this real exact head as the final isolated candidate. No invented replacement tree or document-only candidate is needed. **JIN's final combined-gate supplement and LI's independent review of that supplement remain Pending.** LI's own current 366/71/308/Android execution supplies preparation/evidence and cannot self-satisfy that independent gate. The accepted older #69/#71 read/backend combination does not automatically certify this later UI tree.

No remote merge, existing Issue closure or manual Project promotion is authorized/performed by this record. Ordinary builds remain disabled; Backend remains guarded synthetic Emulator-only. P04–P07/M26–M27, AI/Conversation, templates/duplicate/roleplay/model previews, live model/context, real accounts/cloud/provider/real Event rights, history/Footprint/Calendar UI, runtime/index promotion and whole-module/Sprint/UAT/Release/Done remain separate. The original six ZHOU mappings and 42-route/38-state/11 October target remain; this bounded three-surface acceptance supplies no whole-S3 percentage or overall on-time promise.
