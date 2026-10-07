# LI/PM Persona first-delivery decision preview

- Prepared: 8 October 2026, Asia/Singapore.
- Decision owner: LI HOURUI, ENMORI PM.
- Status: **Proposed; awaiting LI's explicit selection. Not implementation authority.**
- Exact candidate: [Draft PR #60](https://github.com/3427564237/enmori-app/pull/60), head `55fa4a7ab77b32b08d300d391ebee4293ad6f963`.
- Controlling candidate text: [268-line Persona contract](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md).
- Independent technical review: [JIN Approve, review 5444262472](https://github.com/3427564237/enmori-app/pull/60#pullrequestreview-5444262472), for the same exact head. No blocking findings; document/source checks only.
- Remote main observed: `f46a903cb5b339365ac2024004b32b7b96b99e7c`. PR remains Open/Draft; no checks are reported. This preview changes no product code or remote surface.

## Reviewable selection

| Option | Exact decision | Consequence |
| --- | --- | --- |
| **A — recommended: Backend-only first** | Approve P01–P03 unchanged at the pinned head, including the Backend activation/isolation conditions. Withhold applicable P08 and all Flutter/shared-client/Home/router implementation. | ZHOU can implement the bounded Backend task after the confirmed decision is persisted and the task is published. UI/Android remains pending. |
| B — isolated end-to-end first | Approve P01–P03, the same isolation conditions, applicable P08, and the candidate's exact shared-client/Home/router scope, unchanged at the pinned head. | ZHOU owns feature implementation/tests; LI owns shared integration. All Backend/client/Android acceptance checks are required; this preview promises no completion date. |
| C — amend or hold | Name the rows or candidate paragraphs to change, or withhold approval. | Only affected work remains held. Unchanged lifecycle authority and previously completed preparation are retained. |

All exact routes, records, limits, ordering, errors and verification conditions are selected by reference to the immutable candidate, not replaced by the summaries below. A material deviation needs a precise new decision delta and applicable independent review. Existing unchanged choices do not need repeated PM approval after confirmation.

## Four PM gates and the proposed A disposition

| Gate | Concrete proposed approval or withholding | Explicit cost/boundary |
| --- | --- | --- |
| P01 | Six owner operations: list, single read, create, edit, explicit activation and permanent delete; four editable fields (`displayName`, `tone`, `responseLength`, `formatStyle`); exact DTOs/status/error mapping, 4096-byte mutation bodies, 1–50 Unicode scalar name rule and canonical create key. Completed-account authority is resolved through current verified UID-to-Account binding. Approve the complete at-most-five set read as a Persona-only exception to the pagination default. No new optional-AI consent gate for management itself. | No cross-owner/Admin bypass; no pagination exception for other collections; no AI-use consent permission follows. DELETE requires the proposed JSON preconditions and returns bodyless 204. |
| P02 | Approve `accounts/{accountId}/persona_state/current` and `accounts/{accountId}/personas/{personaId}` with the exact candidate allowlists. Every operation uses a coherent transaction snapshot; effective mutations advance the owner revision, with target preconditions as specified. Valid live-target no-ops check revisions first; validated absent-target repeat-delete is the stated 204 exception. | Accept owner-level conflicts for a maximum of five live items. Missing/malformed/orphan state fails closed; requests never initialize or repair it. Revision overflow does not wrap/reset. No Account field, migration, index or retained deleted content is introduced. |
| P03 | Approve state-conditioned replay with the full SHA-256 derived ID from the exact account/revision/canonical-key tuple. Creation and state advance commit together. An unchanged latest creation replays before capacity checks; normalized-input conflict returns 409; later effective owner mutations close recovery with 412. | No receipt, stored fingerprint, TTL or cleanup service. Recovery after a subsequent mutation is intentionally unavailable. An old command cannot recreate a deleted Persona; no-op does not close replay. Structurally valid out-of-band rollback is outside the detection guarantee. |
| Applicable P08 | **Withhold for A.** The candidate's M23–M25 forms/copy/states, NS31–NS34, session-command recovery, create late-completion adaptation, shared client, Home and router remain proposed. | Backend completion gives no Flutter/UI/Android acceptance. This withholding does not cancel their target or approve M26/M27, global Q04 visual acceptance or AI/model use. |

Both A and B approve only the existing isolated Auth/Firestore Emulator execution path with synthetic completed owners, explicit initial owner-state fixtures and fresh owner partitions after settled teardown. The actual child environment must be validated before Firebase initialization/listening and shared by adapters/composition. Invalid requested isolation fails before use; no cloud fallback. All six operations are excluded from ordinary and controlled-demo compositions. Real-account provisioning, demo/production enablement, new dependencies and live model access remain separately gated.

## Authority and supersession trail to retain in the confirmed record

1. [Q19 lifecycle](../decisions/2026-09-01-persona-conversation-lifecycle.md): retain owner privacy, five-live limit, inactive creation, explicit sole activation, zero Active, duplicate names, permanent deletion and no replacement/Trash/Restore. Later request snapshots/deletion revalidation are not delivered by this management slice.
2. [Q17 purpose/projection authority](../decisions/2026-09-01-recommendation-ai-field-allowlists.md) as completed by Q19, and [Q14 privacy/retention](../decisions/2026-09-02-retention-logging-audit-policy.md): unchanged. No model call, secondary content copy or content-bearing logging.
3. [Backend architecture](../decisions/2026-09-01-backend-architecture.md): unchanged except the explicitly bounded Persona whole-set collection-read exception selected under P01. Existing Ports and approved stack remain controlling.
4. [Original accepted proposal](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-05-s3-persona-ai-contract-proposal.md) and [#49 preparation acceptance](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/decisions/2026-10-05-zhou-preparation-acceptance-approval.md): retain preparation-only acceptance and the original unresolved physical choices as historical. Confirmed A would resolve only P01–P03 for this exact new candidate and selected isolation scope; P08 and P04–P07 remain unapproved.
5. Retain the new candidate and JIN's exact-head review above. JIN's approval is independent technical review, not a PM choice or product test result. The proposed record must not backdate confirmation or imply JIN reviewed a later changed head.

## Prepared execution package after A confirmation

The following is ready for LI approval as one bounded action package. **Nothing in this section has been published or executed.**

- Persist the confirmed selection under `docs/decisions/2026-10-08-li-persona-backend-first-approval.md`, source ID `S-PM-1008-LI-PERSONA-BACKEND-FIRST`, retaining the exact sources and changed/withheld scope above. Commit/push only the PM documentation on a separate `souma/` branch and publish a documentation PR so the decision is durably addressable. Record LI's actual confirmation and refresh candidate/review/source state before using it.
- Publish the prepared PM comment below on #60 and create one bounded implementation Issue assigned to ZHOU, citing the durable decision commit. Preserve JIN's new implementation review path.
- Keep #60 Draft/Open; no merge is included. Keep #49 Closed/preparation Done and #44 Open/Backlog; no Project or Issue completion transition is included. No implementation or runtime execution is included in this PM action package.

### Prepared #60 comment

> LI PM selects Backend-only first and approves P01–P03 plus Backend isolation conditions unchanged at candidate `55fa4a7ab77b32b08d300d391ebee4293ad6f963`, following JIN's exact-head technical approval 5444262472. The durable decision link will be inserted before publication. Applicable P08, Flutter/shared client/Home/router remain withheld. ZHOU's bounded implementation Issue will cite this decision; JIN independently reviews the new code/evidence. PC01–PC10 and Backend PC14 are required; PC11–PC13 and client PC14 remain Not Run / outside this delivery. Retain #49 preparation acceptance, #60 Draft and the original target. No product test result, merge, real-account/demo/model enablement or full Persona/Sprint/UAT/Release acceptance is asserted.

### Prepared implementation Issue

**Title:** S3 — ZHOU isolated Persona Backend management, approved P01–P03

**Parent:** #44. **Owner:** ZHOU YAOYIN (`YaoyinZhou3922`). **Independent reviewer:** JIN ZIHAN (`chuxi12483468`). **Authority:** the confirmed decision at its publication commit and #60 candidate `55fa4a7ab77b32b08d300d391ebee4293ad6f963`; insert the decision link before publishing. #49 remains completed preparation.

Implement only the selected Backend deliverable: normative OpenAPI, Domain/Application/Ports, exact transport/error mapping, transactional persistence and replay, fixture-only isolated composition. Use existing pinned dependencies and the repository Backend workflow. No Flutter/client/routes/Home changes, provisioning, runtime promotion, migration, new dependency, Conversation or model call.

Acceptance conditions:

- Implement the unchanged exact P01–P03 and isolation conditions; document any material proposed deviation before affected implementation.
- Execute and record PC01–PC10 and Backend PC14: Domain/Application fakes, Port contracts, Fastify injection/OpenAPI agreement, composition exclusion/guard checks, actual isolated Auth/Firestore Emulator transaction/race/replay evidence and applicable Backend/privacy regressions. Document actual per-attempt eight/nine logical-get bound and retries separately.
- Preserve the existing authority/data integrity/error ordering, no-op/repeated-delete exceptions, monotonic revisions, failure-closed behavior, fixture teardown/fresh partitions and no cloud fallback.
- Submit one focused implementation/evidence PR with exact head, environment/toolchain/commands and Pass/Fail/Blocked/Not Run; obtain JIN independent review of that new head. No passing claim for missing checks.
- PC11–PC13 and client PC14 remain Not Run / outside this Backend deliverable. UI/Android, AI and full six-route delivery remain pending. Report actual Backend expected delivery and 11 October feasibility; provide affected unfinished mappings for LI's later explicit scope resolution without inventing estimates or silently removing targets.
- LI accepts only the evidenced approved Backend deliverable after required checks/review. Merge, full module/Sprint acceptance, UAT and Release require their own applicable gates.

## Target disposition and current evidence

Choosing A prioritizes the next Backend increment. It does not amend the 11 October boundary or silently reduce the six ZHOU routes / 42-route / 38-state overall target. Full six-route feasibility remains **not established**. ZHOU must supply the actual implementation/evidence and remaining feasibility report; LI then makes a separate explicit target/scope disposition if necessary.

At this checkpoint, JIN's document/source approval is observed. Candidate checks reported 268 lines, 23 relative links and whitespace pass; those counts are documentary evidence only. All new product/API/Emulator/Flutter/Android/live-model execution remains **Not Run**. No new independent product review is claimed by this PM preview.
