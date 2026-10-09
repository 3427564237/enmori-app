# LI approval — isolated Persona P08 client and management flow

- **Source ID:** S-PM-1009-LI-PERSONA-P08-ISOLATED-FLOW
- **Status:** Confirmed PM scope decision. Product implementation release is conditional on the requested independent candidate-consistency review described below; product acceptance is not granted.
- **Date/authority:** 9 October 2026, Asia/Singapore; LI HOURUI, ENMORI PM.
- **Actual confirmation:** LI explicitly selected **A: the existing candidate's complete isolated Persona management flow, M23–M25 / NS31–NS34, including client/pages, LI Home/router integration and actual Android verification; excluding AI/Conversation**, in response to the [prepared choice packet](../planning/2026-10-09-li-persona-p08-decision-preview.md). The prompt also authorized persisting this decision, publishing its implementation task and handoff, while retaining JIN's consistency-review gate. This is an actual choice, not an inference from a progress message.
- **Exact controlling candidate:** [#60 head 55fa4a7ab77b32b08d300d391ebee4293ad6f963](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md), applicable P08 and PC11–PC13 / client PC14 unchanged.
- **Checklist/review input:** [#67](https://github.com/3427564237/enmori-app/pull/67), `15ab5099078a3f411c285a5b0cd6af4d532abc89`, one English planning document. No JIN review was present when LI selected A; none is claimed here.
- **Accepted Backend:** #65 `885dbcc87fe8574265014eb4305c49fc0950daa3` and [LI's bounded acceptance](2026-10-09-li-persona-backend-component-acceptance.md), unchanged. Observed remote main: `f46a903cb5b339365ac2024004b32b7b96b99e7c`.

## Selected scope

Approve the applicable P08 candidate by immutable reference, including its exact surfaces, controls, defaults, copy, recovery rules and verification conditions. The following summaries do not replace the candidate or add behavior.

| Boundary | Confirmed selection |
| --- | --- |
| M23 / ai-customize | Isolated `/personas` owner overview with distinct Loading, Active, No Active and load-failure states; management entry |
| M24 / persona-management | Isolated `/personas/manage`: bounded list, capacity, local selection, explicit activation/deletion confirmations and stale/uncertain-result handling |
| M25 / edit-persona | Isolated `/personas/new` and `/personas/{personaId}/edit`: four-field Create/Edit form, exact validation/defaults, dirty/discard, saving, independent reread, unavailable/conflict/recovery states |
| Shared client | Operation-specific success status/body/error adaptation, JSON-body DELETE and empty success only for its approved 204; Persona-create late completion distinct from the single 15-second caller wait; existing callers retain their one-result behavior |
| Session and shared state | Exact retained-command/recovery/disposition rules, same-session owner/command/attempt validation, page lifetime separation, independent reads and highest-observed stateRevision handling; same-UID new sessions reject old-session results |
| Home/router | LI assembles the feature handoff into isolated `Manage Personas` entry and routes; normal builds register neither. Backend's actual isolation guard remains authoritative |
| Verification | PC11–PC13 and client PC14, including real-client delayed token/header/body checks and actual two-synthetic-owner Android → Backend → persistence flow; exact tested head and execution attribution |

Resolve **Q04-DEV-17–19 only for this M23–M25 implementation**: the four approved structured fields, selection as client intent followed by explicit activation, zero Active, and confirmed permanent deletion of Active without a replacement. Select only the candidate's used SP-01/03/04/05/10/12 behaviors for validation, private unavailability, irreversible confirmation, outcome feedback, explicit selection and dialog focus/accessibility. Use the existing application's widgets. This does not approve detailed visual comparators, global shared styles, unrelated deviations, SP-11 AI presentation or global Q04 acceptance.

## Assignment, release gate and acceptance

**ZHOU** owns the approved client adaptation, Persona Repository/session state/pages and their tests. **LI** owns shared Home/router assembly and enablement using ZHOU's feature/navigation handoff. Publish one related implementation/evidence task with these responsibilities; do not require separate approvals for every file.

**JIN** independently reviews #67's consistency with the exact P08 candidate and selected acceptance boundary before release of this new product implementation. Scope is now selected; that review is the remaining candidate-consistency gate, not another LI choice or a rerun of accepted Backend tests. Record its exact head/conclusion. If it identifies a material conflict, hold only affected behavior and return the precise delta to LI; unchanged approved choices do not require repeated approval. The Issue may be published now with implementation held until this gate passes.

For new implementation, JIN reviews ZHOU-authored client/feature code; **DU** independently reviews LI-authored Home/router changes under the existing LI→DU path. No author approves their own artifact. Retain JIN combined-gate ownership and LI independent review of that gate for any actual combined candidate.

The full selected UI package cannot be accepted without the candidate's real PC13 Android/persistence chain and required PC11/PC12/client PC14 results. Missing/failed UI checks hold that UI acceptance, without relabelling accepted Backend checks as failures. Current new-client checks are Not Run. Proposal approval, a route, fake success or an APK build alone is not page/persistence acceptance. Report actual tools/environment/commands, source head, failed attempts and Pass/Fail/Not Run per case.

Implementation may use accepted #65 as its isolated Backend source without waiting for #65 merge, live Qwen, Conversation, DU history UI or Event provider rights. The separate three-component integration still requires the actual reviewed inputs and a new gate; this decision does not certify that tree.

## Isolation and retained exclusions

Use existing approved Flutter/Riverpod/no-codegen architecture, pinned client/Backend dependencies and guarded Auth/Firestore Emulator tooling. Synthetic completed Accounts and Persona state are fixture-only; normal and controlled-demo Backend compositions remain disabled for Persona. Do not provision real accounts, introduce cloud fallback, new libraries, runtime promotion, Backend DTO/storage changes, migration/index deployment, persistent queues or another service under this approval.

Templates, duplication, role-play/free-text Persona instructions, model previews and Try Your Persona remain outside the exact first candidate. P04–P07, M26 ai-assistant/ai-limited, M27 ai-safety, public AI/Conversation/storage/deletion/retention, context producers and live-model/host scope remain separately pending. Their original target and required authority are retained; this next-increment choice does not cancel or silently defer them.

## Authority and precise supersession

1. Retain Q19, Q17, Q14, Q31, approved client/Backend architecture and higher-authority obligations unchanged. No model use or Backend/data contract is selected here.
2. Retain [the earlier Backend-first approval](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md) and [#63](https://github.com/3427564237/enmori-app/issues/63) as the original Backend-only task. Their P08 Withheld observation is superseded **only for this newly selected M23–M25/client/shared-integration scope**, subject to the release gate. #63 is not broadened retroactively.
3. Retain #49 preparation, #60 candidate and its proposal-review history, #65 implementation/JIN review/LI acceptance, and #67's checklist. #67's pending-selection wording describes its preparation snapshot; this actual choice is the current source. Neither existing review approves absent new client code.
4. Retain the Q04-D/Q04-C audit trail. Only the named slice-scoped deviations and used patterns are selected; the earlier unapproved observations remain historical elsewhere. Global visual acceptance stays pending.
5. Retain the A/B/C preview as proposed-at-issuance history. The new decision records LI's actual A selection; it is not a Sponsor/Supervisor decision.

## Publication and target

LI's A selection authorizes this decision/preview documentation, its commit/push in the existing documentation PR, one bounded assigned implementation Issue linked to #44, and scoped #67/#44/task handoffs citing the durable publication commit. Keep implementation held for the specified JIN consistency gate until its actual result exists.

No merge, existing Issue completion or Project-status change is included. #67 and implementation PRs remain Draft/Open, #63 remains Open, #44 remains Open/Backlog and #45–#49 preparation-only Done. 11 October / 42-route / 38-state target remains. ZHOU reports actual SGT ETA after scope/integration/Android conditions are checked; this approval supplies no overall on-time promise, route-completion numerator or full module/Sprint/UAT/Release/Done acceptance.
