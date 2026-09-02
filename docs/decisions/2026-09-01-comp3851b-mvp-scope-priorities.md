# COMP3851B MVP scope priorities — 2026-09-01

- **Status:** Approved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0901-SCOPE
- **Scope:** Week 9 COMP3851B Release MVP priority and refinement boundary
- **Builds on:** [S-PM-0901-MVP](2026-09-01-comp3851b-release-mvp.md)

## Release priority decision

The following capabilities are **Must** for the Week 9 COMP3851B Release MVP:

- AI Assistant within the already confirmed bounded AI, privacy, safety, and model-authority rules;
- Event Recommendation;
- Friend Recommendation;
- Friends Activity ranking; and
- Persona create, read, update, delete, selection, and activation.

Admin Recommendation Configuration remains in the confirmed wider COMP3851B scope, but is **Should / Not Ready** for the current Week 9 Release MVP. It is not a Week 9 Must and must not block implementation of a separately approved deterministic v1 recommendation design.

This priority decision adds the listed capabilities to the Week 9 Must set. It does not remove the previously reviewed core demonstration flow covering user entry, profile/interests/privacy, Check-in, event interaction, Calendar, and Footprint. Detailed Sprint 2–4 selection and sequencing must be refined again after the affected blockers are resolved.

## Release Goal

By Week 9, deliver a demonstrable and testable ENMORI Release MVP in which a community user can complete the approved core Check-in, event, and history flow; receive privacy-filtered deterministic Event Recommendations, Friend Recommendations, and ranked Friends Activity; manage and activate a Persona that affects presentation only; and use bounded AI assistance or explanation without allowing AI to decide eligibility, authorization, recommendation candidates, scores, or ordering.

## Readiness boundary

**Must is a Release priority, not a Ready finding.** The affected production PBIs remain Blocked / Not Ready until their applicable decisions and dependencies are approved. In particular, this decision does not approve or infer:

- Backend, Auth, data-model/schema, API, Firebase, or deployment architecture;
- recommendation formulas, numeric weights, normalization, decay, or tie-breakers;
- recommendation and AI purpose-specific field allowlists;
- Persona deletion and historical AI-conversation semantics;
- AI retention, deletion, logging, or audit periods;
- no-candidate, no-interest, error-copy, or deterministic fallback behavior beyond existing confirmed boundaries;
- Qwen runtime, timeout, concurrency, output-schema, validation, or operational fallback details;
- the immutable UI visual-acceptance baseline; or
- the implemented and approved factor registry used by Admin Recommendation Configuration.

No production implementation may start for an affected PBI merely because it is a Must. Each PBI still requires an evidence-backed source, testable acceptance criteria, scope boundary, resolved affected blockers, dependencies, accepted Points and task hours, PM-assigned owner, different reviewer, tests, and applicable platform/device gates.

## Refinement and Sprint boundary

Resolve the affected decisions in this order before re-refining Sprint 2–4:

1. persist this Release priority boundary;
2. approve the production Backend/Auth/Data/API boundary;
3. approve recommendation and AI field-level allowlists;
4. approve deterministic v1 recommendation formulas and tie handling;
5. approve Persona lifecycle and historical-conversation semantics;
6. approve AI retention, deletion, logging, and audit behavior;
7. approve empty-state and deterministic fallback behavior;
8. approve the Qwen runtime and failure contract;
9. freeze the MVP UI acceptance baseline; and
10. create a new COMP3851B UAT baseline and re-refine Sprint 2–4.

The approved Sprint 1 Fake-auth Architecture Validation Slice may proceed under S-PM-0901. It remains architecture evidence rather than production authentication and does not settle any blocked production decision above.

## Later incremental architecture decision

The PM subsequently resolved Q-30 at the Backend/Auth/Data/API, controlled-deployment, testing, operations, and repository-boundary level in [`2026-09-01-backend-architecture.md`](2026-09-01-backend-architecture.md) (S-PM-0901-BACKEND). This removes the architecture-level Q-30 blocker only. The feature endpoint/DTO/schema, field-allowlist, recommendation-formula, Persona-lifecycle, retention, fallback, Qwen-runtime, UI, and delivery-evidence gates recorded above remain separately unresolved until their controlling decisions are approved.

The PM subsequently approved the deterministic v1 recommendation and non-Persona AI semantic field contracts in [`2026-09-01-recommendation-ai-field-allowlists.md`](2026-09-01-recommendation-ai-field-allowlists.md) (S-PM-0901-Q17). At that decision point Q-17 is partially resolved and Persona-to-Qwen remains Blocked pending an exact projection; S-PM-0901-Q19 later closes that remainder, while the other readiness gates remain independent.

The PM subsequently resolved Q-03 through the fixed scoring and total-order contracts in [`2026-09-01-deterministic-v1-recommendation-formulas.md`](2026-09-01-deterministic-v1-recommendation-formulas.md) (S-PM-0901-Q03). This removes the deterministic v1 formula blocker without approving S-ALG4, zero-result behavior, Admin Recommendation Configuration, or the remaining readiness gates.

The PM subsequently resolved Q-19 and closed Q-17's remaining Persona projection gate in [`2026-09-01-persona-conversation-lifecycle.md`](2026-09-01-persona-conversation-lifecycle.md) (S-PM-0901-Q19). This approves the Persona/Conversation lifecycle and structured Persona projection only; retention duration, fallback, Qwen runtime, UI, concrete API/schema, and delivery-evidence gates remain independent.

The PM subsequently resolved Q-14 in [`2026-09-02-retention-logging-audit-policy.md`](2026-09-02-retention-logging-audit-policy.md) (S-PM-0902-Q14) and Q-31 in [`2026-09-02-qwen-runtime-failure-contract.md`](2026-09-02-qwen-runtime-failure-contract.md) (S-PM-0902-Q31). These remove the retention-policy and Qwen-runtime requirement-decision blockers only; mandatory implementation evidence and the other applicable UI/API/schema/delivery gates remain independent.

## Release Definition of Done boundary

The Week 9 Release MVP is not complete merely because all Must capabilities have implementation code. Applicable Must PBIs must be integrated and runnable; pass analyzer and relevant unit, widget, integration, privacy, fallback, and deterministic-ranking tests; carry Android and iOS evidence; receive owner self-test and different-reviewer approval; pass JIN's integration/UAT gate where applicable; contain no unresolved high-priority review issue; update traceability and decision records; be merged and marked Done in GitHub Projects; and receive LI HOURUI's Release-scope acceptance.

New COMP3851B verification does not convert the historical 15/20 COMP3851A UAT snapshot into 20/20 or close Q-C9 without a separate accepted disposition.

## Authority and change control

This is a current PM scope-priority decision. It is not a Sponsor/Supervisor decision, does not retroactively alter COMP3851A scope or delivery evidence, and does not itself prove implementation or verification. Later changes supersede it only rule by rule and must preserve this decision trail.
