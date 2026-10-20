# LI scoped acceptance — isolated Persona Backend component

- **Source ID:** S-PM-1009-LI-PERSONA-BACKEND-COMPONENT-ACCEPTANCE
- **Date/authority:** 9 October 2026, Asia/Singapore; LI HOURUI, PM. LI requested completion of the current LI work and publication of owner follow-up after the supplied team updates; this scoped evidence assessment is recorded on LI's behalf.
- **Accepted scope:** P01–P03 and Backend PC14 at [PR #65](https://github.com/3427564237/enmori-app/pull/65), exact head `885dbcc87fe8574265014eb4305c49fc0950daa3`, base `f46a903cb5b339365ac2024004b32b7b96b99e7c`, under [task #63](https://github.com/3427564237/enmori-app/issues/63).
- **Disposition:** Required Backend component implementation and evidence are accepted. This resolves LI's component acceptance dependency; integration, merge and full Persona-route/module acceptance remain separate.
- **Evidence:** [LI current verification and handoff](../evidence/sprint3/2026-10-09-li-persona-acceptance-and-owner-follow-up.md).

## Authority and exact supersession

Retain [S-PM-1008-LI-PERSONA-BACKEND-FIRST](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md), its exact [candidate at 55fa4a7](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md), Q19, Q17, Q14 and the approved Backend architecture. LI confirmed that the candidate Git blob is identical at the approved proposal and submitted implementation heads: `dca96d8de9839aff8e5b57730b7d3ebb6fcf4fb3`. No new contract choice or requirement is selected.

[JIN formal APPROVE 5458913729](https://github.com/3427564237/enmori-app/pull/65#pullrequestreview-5458913729) is bound to this exact implementation head, submitted **8 October 2026 at 23:18:14 SGT**. The GitHub review timestamp controls; the date typo in the owner's #44 progress reply does not change delivery attribution. JIN independently executed Backend 348/348, actual isolated Emulator 64/64 and six additional fake/injection reviewer groups. The six groups are not Emulator cases and were not rerun by LI.

LI independently executed the pinned-head strict TypeScript build, Backend 348/348 and actual isolated Auth/Firestore Emulator 64/64, all passing with zero failed/skipped/cancelled tests. Source and required acceptance-case mapping were inspected. The actual adapter run recorded 208 transaction calls, 214 SDK attempts, six retried calls, a maximum of nine logical gets per attempt and zero collection scans; eight/nine-get paths have separate committed assertions. These are LI's run counts, distinct from ZHOU's and JIN's runs and not runtime/billing bounds.

This record supersedes only the outstanding JIN-review/LI-acceptance observations for #65 in the [8 October LI handoff](../evidence/sprint3/2026-10-08-li-component-review-and-integration-handoff.md) and [prior #65 PM comment](https://github.com/3427564237/enmori-app/pull/65#issuecomment-6061394560). Preserve those dated records as history. [#49 preparation acceptance](2026-10-05-zhou-preparation-acceptance-approval.md) is unchanged.

## Accepted boundary and remaining gates

Accept six authenticated owner operations, strict DTOs/error mapping, coherent revisioned persistence, capacity/activation/permanent-delete semantics, state-conditioned create replay and the approved guarded synthetic Emulator-only composition, with PC01–PC10 and Backend PC14 evidence. All six operations remain absent from ordinary and controlled-demo composition. No request-time provisioning/repair, retained receipt, deleted content, cloud fallback or content-bearing log is authorized.

P08, M23–M25 Flutter/shared-client/Home/router, PC11–PC13, client PC14 and Persona Android remain withheld or Not Run/outside this Backend delivery. P04–P07, Conversation/M26/M27, live model access, real-account provisioning, demonstration/production enablement, migrations/index deployment and full product acceptance remain separately gated. Their absence is not a new Backend acceptance blocker and this acceptance does not remove their target.

The supporting #65 integration packet's suggestion to retain #64's controlled-runtime history registration is expressly excluded from acceptance. The approved isolated-history decision and [LI R1 review](https://github.com/3427564237/enmori-app/pull/64#pullrequestreview-5457554482) control that affected boundary. JIN's formal review makes the same reconciliation. The later combined tree must preserve the approved schema/route union and each actual isolation guard; standalone acceptance approves no conflict resolution or untested tree.

Keep #65 Draft/Open, #63 Open, #44 Open/Backlog and #45–#49 preparation-only Done. No merge or Issue/Project status transition is performed. Original 42-route/38-state target and 11 October boundary remain; Sprint/UAT/Release/Done are not accepted by this record. Material source/scope changes require an updated bounded assessment; unchanged approved choices do not need repeated approval.
