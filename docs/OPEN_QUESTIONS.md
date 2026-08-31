# Open Questions and Required Decisions

This register contains only unresolved authority, behavior, verification, or implementation-boundary questions after S-PM-0831. Resolved items are retained in §5 so that the decision trail is not erased. A plausible implementation choice is not a confirmed requirement.

## Register management metadata

`Owner` identifies the person accountable for obtaining the decision or evidence, not necessarily the implementer. `Unassigned` is intentional and must be assigned by the PM before the affected item enters a Sprint. `Review / due` remains `Unscheduled` until the PM selects a date or Sprint. Status values are `Open`, `Blocked`, `Deferred`, or `Resolved`; resolved items move to §5.

| ID | Owner | Status | Review / due | Affected scope |
|---|---|---|---|---|
| Q-03 | Unassigned | Open | Unscheduled | Recommendation ranking and configuration validation |
| Q-04 | Unassigned | Open | Unscheduled | UI baseline and visual acceptance |
| Q-27 | Unassigned | Open | Unscheduled | Account Action Request workflow and authorization |
| Q-28 | Unassigned | Open | Unscheduled | Recommendation factor registry and Admin configuration |
| Q-06 | Unassigned | Open | Unscheduled | Original COMP3851A scope provenance |
| Q-07 | Unassigned | Open | Unscheduled | Project-plan provenance and deferred Admin history |
| Q-08 | Unassigned | Open | Unscheduled | COMP3851A Admin conflict provenance |
| Q-10 | Unassigned | Open | Unscheduled | Supervisor authority provenance |
| Q-11 | Unassigned | Open | Unscheduled | UI approval provenance |
| Q-12 | Unassigned | Open | Unscheduled | Interest Tag and Event Category rules |
| Q-13 | Unassigned | Open | Unscheduled | Production weather behavior |
| Q-14 | Unassigned | Open | Unscheduled | Retention, deletion, logging, and audit policy |
| Q-16 | Unassigned | Open | Unscheduled | Recommendation empty-state behavior and copy |
| Q-17 | Unassigned | Open | Unscheduled | Recommendation and AI field-level data contracts |
| Q-18 | Unassigned | Open | Unscheduled | Add Friend identifier vocabulary and matching |
| Q-19 | Unassigned | Open | Unscheduled | Persona and AI-conversation deletion semantics |
| Q-C9 | Unassigned | Deferred | Unscheduled | Final UAT status and completion claim |
| Q-21 | Unassigned | Open | Unscheduled | Sprint 1 recommendation fallback verification |
| Q-22 | Unassigned | Open | Unscheduled | Sprint 2 sharing and delete propagation verification |
| Q-23 | Unassigned | Open | Unscheduled | Sprint 3 empty and permission-denied verification |
| Q-24 | Unassigned | Open | Unscheduled | Sprint 4 consent and Footprint verification |
| Q-25 | Unassigned | Open | Unscheduled | Sprint 5 Calendar and product-label verification |
| Q-26 | Unassigned | Open | Unscheduled | UAT evidence interpretation and sign-off |

## 1. Blocking PM decisions

| ID | Decision required | Current evidence and boundary | Why it blocks work |
|---|---|---|---|
| Q-03 | Which exact recommendation formulas, weights, normalization, decay, and tie-breakers are approved? | S-ALG4 proposes exact numbers; S-BR45 excludes them from the formal package. S-PM-0831 permits Admin configuration only for implemented, approved factors and does not approve any formula. | Ranking and Recommendation Configuration validation cannot be specified or tested exactly. |
| Q-04 | Which UI artifact/version is the approval baseline, and who approved it? | The PM-supplied Figma Make link is the sole current UI entry point; repository exports differ and carry no approval metadata. | Pixel-accurate UI implementation and visual acceptance need a named immutable baseline/version. |
| Q-27 | Who reviews, approves, rejects, and executes an Account Action Request, and what are the allowed state transitions? | S-PM-0831 approves creation of an auditable Pending request only. It explicitly does not approve direct Disable, Suspend, Delete, or Restore. | Any approval/execution UI, authorization role, notification, appeal, session handling, retention, or state mutation would otherwise be invented. |
| Q-28 | Which recommendation factors are in the implemented and approved factor registry? | S-PM-0831 restricts Admin factor creation to this registry; existing sources identify factor categories but not a complete approved registry or configuration constraints. | Admin factor CRUD and publication cannot safely accept an undefined factor set. |

## 2. Missing authoritative records

| ID | Evidence requested | Why it matters |
|---|---|---|
| Q-06 | COMP3851A Project Proposal and its approval/version history | Needed to document the original scope without reconstructing it from later summaries. |
| Q-07 | The Project Plan referenced by S-BR5 | Needed to verify the early baseline and deferred Admin UI statement. Gantt exports are not a substitute. |
| Q-08 | The `Sprint 5 edit.pdf` cited by S-AI5/S-TRACE5, or confirmation that the citation is invalid | Needed to complete the historical provenance of the COMP3851A Admin conflict. S-PM-0831 resolves only the prospective COMP3851B requirement. |
| Q-10 | Any explicit Supervisor decision or approval record | The repository and S-FR1 identify supervision but contain no separately attributable Supervisor ruling. |
| Q-11 | Final Figma approval/version evidence, if distinct from the supplied Make link | The Make link is available as the current UI source but does not expose a standard design-node approval trail. No export is required for this context phase. |

## 3. Requirement clarifications

| ID | Question | Current confirmed boundary |
|---|---|---|
| Q-12 | What validation, uniqueness/case, dependency, import/export, and error rules apply to Interest Tags and Event Categories? | COMP3851B CRUD is approved; permanent deletion is blocked while referenced. Schema, API shape, and detailed validation remain undecided. |
| Q-13 | What weather provider/source and fallback presentation are approved for production? | Weather is linked when available under Check-in privacy; failure does not block Check-in and Weather is not a required input. |
| Q-14 | What retention period, deletion schedule, logging level, and audit policy apply to AI prompts/responses, explanations, Admin configuration history, and Account Action Requests? | Minimization, no long-term raw AI storage by default, configuration versioning, and auditable Pending account requests are confirmed; durations and deletion policies are not. |
| Q-16 | What no-candidate/no-interest fallback copy and behavior applies to each recommendation module? | Deterministic safe fallback is required, but recorded Sprint 1/3 cases failed or were not exercised and no final interaction/copy is approved. |
| Q-17 | Which exact fields may enter each recommendation type and each AI purpose? | Privacy-first minimization is mandatory. Only consented Check-in conversation assistance has the additional maximum-five/preceding-seven-days limit; this window is prohibited from recommendation ranking. Complete field-level contracts are not approved. |
| Q-18 | Does “account ID/unique username” describe one canonical identifier or multiple searchable identifiers? | Add Friend search by those terms is confirmed, but canonical field vocabulary and matching behavior are not. |
| Q-19 | What does delete mean for Persona records and historical AI conversations? | Persona delete with confirmation is confirmed; hard/soft-delete and historical persistence semantics are not. |

## 4. Verification and sign-off questions

| ID | Verification needed | Evidence gap |
|---|---|---|
| Q-C9 | What is the accepted final UAT status for the five failures in S-FR1's 15/20 snapshot? | No later retest evidence was found. The PM explicitly skipped C9 on 2026-08-31, so the project must not claim 20/20 or final closure. |
| Q-21 | Were the Sprint 1 no-interest/fallback failures fixed and retested? | Test records show unresolved/failing scenarios. |
| Q-22 | Were Sprint 2 Friends-only sharing and Check-in delete propagation exercised end to end? | Recorded browser-session evidence is incomplete. |
| Q-23 | Were Sprint 3 empty-state and permission-denied states exercised and approved? | Corresponding UAT evidence is missing/failed. |
| Q-24 | Was Sprint 4 consent copy updated to cover Weather, Activity, and Approx Location, and were Footprint date issues fixed? | S-PM-0831 settles the desired Footprint behavior but does not provide retest evidence. |
| Q-25 | Were Sprint 5 Calendar selected-date details and residual Campus Connect labels fixed and retested? | S-PM-0831 settles the current requirement/name, while S-MM-0801 explicitly closes only two other defects. |
| Q-26 | What does “Passed” mean where a UAT row also says the Figma prototype was not tested in that browser session? | Pass status and execution note are internally inconsistent. |

## 5. Resolved decisions retained for traceability

| Former question / conflict | Resolution | Authority and supersession note |
|---|---|---|
| Q-01 / C2 — Admin scope | Restricted Create Interest Tag remains the COMP3851A Sprint 5 baseline. Bounded Flutter Admin UI and catalogue/configuration/request-preparation behavior are new COMP3851B requirements. | S-PM-0831, 2026-08-31; prospective PM decision, not retroactive Sponsor/Supervisor approval. |
| Q-02 / C7 — Product name | ENMORI is the product, Nexus Five is the team, and Campus Connect is obsolete historical wording. | S-PM-0831; old artifacts remain unchanged as history. |
| Q-05 / C4 — Calendar selected-date details | Confirmed: self-owned Check-ins, newest-first summaries, approved fields only, with a same-date link to Footprint. | S-PM-0831; does not prove earlier UAT was fixed. |
| Q-09 / C1 — Final report availability/identity | S-FR1 is the PM-designated COMP3851A final submission but internally labels itself an interim group report; Grade B supporting evidence. | Supplied 2026-08-31; no signatures, tracked approval, or explicit Supervisor ruling. |
| Q-15 / C5 — History terminology | Footprint is canonical; it retains selected-date Check-in details and chronologically connects permitted Approx Location points. | S-PM-0831; Check-in Timeline remains historical terminology only. |
| Q-20 / C8 — Target audience | Community users seeking privacy-aware interest/event/lightweight social connection; not students only and not a health-learning/advice platform. | S-PM-0831. |
| C3 — Check-in required fields | At least Note or Mood; Weather is linked when available and failure does not block. | S-BR2/S-BR45/S-MM-0711 interpreted and confirmed by S-PM-0831. |
| C6 — Recent Check-in AI context | At most five most recent eligible Check-ins from the preceding seven days, only for consented Check-in conversational assistance. | S-PM-0831; explicitly excluded from recommendation generation/ranking. |
| C10 — Special Care eligibility | Any established friend; no minimum friendship duration. | S-PM-0831; S-FR1's “long-time” wording is illustrative only. |
| Flutter client architecture deferral | Feature-first layered client architecture, Riverpod without code generation, `go_router`, Repository `Result<T>` protocol, application-lifetime Auth Session observation, and a Fake-auth validation slice are approved. | S-PM-0901, 2026-09-01; backend, schema, API, Firebase, UI, and algorithm decisions remain outside this approval. |

## 6. Explicitly deferred—not questions to answer by invention

Until PM approves a later phase, do not finalize:

- backend topology and architecture outside the approved S-PM-0901 Flutter client scope;
- data model/schema, migrations, or referential implementation;
- API request/response contracts;
- dependency additions beyond the approved Architecture Slice, and exact package versions until Flutter 3.47.2 compatibility is verified;
- Firebase deployment/configuration;
- product-wide testing strategy/documentation beyond the approved Architecture Slice evidence;
- production feature backlog or Walking Skeleton beyond the Fake-auth architecture validation slice;
- Account Action Request approval or execution workflow;
- arbitrary model routing/failover, recommendation factors, algorithms, formulas, or data sources.

Any decision that would settle one of these items must cite a new approval or authoritative source and update the conflict/change trail.
