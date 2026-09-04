# Open Questions and Required Decisions

This register contains only unresolved authority, behavior, verification, or implementation-boundary questions after S-PM-0831. Resolved items are retained in §5 so that the decision trail is not erased. A plausible implementation choice is not a confirmed requirement.

## Register management metadata

`Owner` identifies the person accountable for obtaining the decision or evidence, not necessarily the implementer. `Unassigned` is intentional and must be assigned by the PM before the affected item enters a Sprint. `Review / due` remains `Unscheduled` until the PM selects a date or Sprint. Status values are `Open`, `Blocked`, `Deferred`, or `Resolved`; resolved items move to §5.

| ID | Owner | Status | Review / due | Affected scope |
|---|---|---|---|---|
| Q-04 | Unassigned | Open | Sprint 1 Refinement | Q04-D and bounded RMVP-01A R1 acceptance approved; seven earlier deviation candidates plus unrelated pattern, capture, provenance and evidence gates remain |
| Q-27 | Unassigned | Open | Unscheduled | Account Action Request workflow and authorization |
| Q-28 | Unassigned | Open | Unscheduled | Recommendation factor registry and Admin configuration |
| Q-06 | Unassigned | Open | Unscheduled | Original COMP3851A scope provenance |
| Q-07 | Unassigned | Open | Unscheduled | Project-plan provenance and deferred Admin history |
| Q-08 | Unassigned | Open | Unscheduled | COMP3851A Admin conflict provenance |
| Q-10 | Unassigned | Open | Unscheduled | Supervisor authority provenance |
| Q-11 | Unassigned | Open | Unscheduled | UI approval provenance |
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
| Q-04 | What deviations, shared patterns, responsive/device baselines, accessibility gates, and evidence remain before each affected accepted surface is visually ready? | Q04-A–D are approved. S-PM-0903-Q04-RMVP01A-R1 subsequently approves DEV-15 plus new DEV-23/24, bounded M02/M06/M07/M08-shell/M19-note/M20 acceptance, slice-scoped SP-01/05/06 and the Android acceptance baseline. DEV-20 is not retained; DEV-14, DEV-16–19 and DEV-21–22 remain unapproved. | Complete the approved RMVP-01A provenance/capture, missing-state, responsive/accessibility and traceability evidence. Decide seven remaining candidates and unrelated product/privacy/pattern questions only for their affected scopes. Q-04 remains Open. |
| Q-27 | Who reviews, approves, rejects, and executes an Account Action Request, and what are the allowed state transitions? | S-PM-0831 approves creation of an auditable Pending request only. It explicitly does not approve direct Disable, Suspend, Delete, or Restore. | Any approval/execution UI, authorization role, notification, appeal, session handling, retention, or state mutation would otherwise be invented. |
| Q-28 | Which recommendation factors are in the implemented and approved factor registry? | S-PM-0831 restricts Admin factor creation to this registry; existing sources identify factor categories but not a complete approved registry or configuration constraints. S-PM-0901-SCOPE keeps Admin Recommendation Configuration at Should / Not Ready. | Blocks Admin Recommendation Configuration only. It must not block a separately approved deterministic v1 recommendation implementation. |

## 2. Missing authoritative records

| ID | Evidence requested | Why it matters |
|---|---|---|
| Q-06 | COMP3851A Project Proposal and its approval/version history | Needed to document the original scope without reconstructing it from later summaries. |
| Q-07 | The Project Plan referenced by S-BR5 | Needed to verify the early baseline and deferred Admin UI statement. Gantt exports are not a substitute. |
| Q-08 | The `Sprint 5 edit.pdf` cited by S-AI5/S-TRACE5, or confirmation that the citation is invalid | Needed to complete the historical provenance of the COMP3851A Admin conflict. S-PM-0831 resolves only the prospective COMP3851B requirement. |
| Q-10 | Any explicit Supervisor decision or approval record | The repository and S-FR1 identify supervision but contain no separately attributable Supervisor ruling. |
| Q-11 | Final Figma approval/version evidence, if distinct from the supplied Make link | The Make link is available as the current UI source but does not expose a standard design-node approval trail. No export is required for this context phase. |

## 3. Requirement clarifications

No unresolved requirement clarification is currently recorded in this section. New ambiguity must be added explicitly rather than inferred away.

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
| RMVP-01A account-entry and first-Check-in product selection | Selects new-member Firebase email/password registration with onboarding Username, covers both `Accept → Public` and `Reject → Private`, and selects a Note-only first Check-in. | S-PM-0903-RMVP01A-SEL, 2026-09-03; product-path authority only. Physical contract Q-33 remained open at issuance and was subsequently resolved by S-PM-0903-RMVP01A-CONTRACT; Q04, estimation/assignment, implementation and Ready remain separate. |
| RMVP-01A R2 amendment direction | Replaces Profile visibility with current Check-in visibility, makes the onboarding idempotency result part of the same Firestore transaction, preserves Q18-B Username no-release/no-reuse, and approves the 500-grapheme Note and 24-hour idempotency values for inclusion in R2. | S-PM-0903-RMVP01A-R2DIR, 2026-09-03; amendment direction only. R1 was not finally approved and Q-33 remained Open at issuance; S-PM-0903-RMVP01A-CONTRACT subsequently approved R2 exactly. |
| Q-33 — RMVP-01A exact physical and test contract | Approves RMVP-01A-CONTRACT-PREVIEW-0903-R2 exactly: bounded onboarding, Note-only create/later-read, REST/JSON and logical Firestore records, stable errors, UI scope projection, and test/evidence boundary. | S-PM-0903-RMVP01A-CONTRACT, 2026-09-03; Q-33 Resolved at requirement-contract level. R1 and R2 direction remain in the trail. Q04, dependencies, estimates/assignments, controlled prerequisites, Android commitment, Ready, Sprint, implementation and execution evidence remain separate. |
| RMVP-01A staffing revision, review topology and exact staffing | Rejects the first `20 / 20 / 16 / 16 / 6` proposal, retains 78h for legitimate-work balanced redecomposition, replaces the first revised table's circular review graph with an acyclic implementation/test → component-review → JIN gate → LI terminal-review sequence, and approves the corrected R1–R16 staffing table exactly. | S-PM-0903-RMVP01A-STAFF-REV, S-PM-0903-RMVP01A-STAFF-R2DIR and S-PM-0903-RMVP01A-STAFF, 2026-09-03. The proposed `8 SP`, A01, Ready, Sprint, implementation and external writes remain outside the staffing approval. |
| RMVP-01A relative estimate | Approves the bounded RMVP-01A at `8 SP` as a relative complexity/uncertainty estimate without converting from its approved 78h task plan. Scope or dependency growth above 8 SP requires splitting and re-estimation. | S-PM-0903-RMVP01A-EST, 2026-09-03; estimation authority only. Q04, dependency, controlled-environment, Android-commitment and A01-sequencing gates remain; Ready, Sprint, implementation and external writes remain unapproved. |
| RMVP-01A bounded Q04 entry/core acceptance | Approves DEV-15/23/24, detailed M02/M06/M07/M08-shell/M19-note/M20 states and copy, slice-scoped SP-01/05/06 and the Android responsive/accessibility acceptance baseline. | S-PM-0903-Q04-RMVP01A-R1, 2026-09-03; visual/state authority only. Evidence remains Pending; no row is Visual Implementation Ready, RMVP-01A remains Not Ready and Q-04 remains Open outside this bounded acceptance. |
| RMVP-01A consolidated delivery start | Makes RMVP-01A Ready, removes separately scheduled A01 from this path, absorbs necessary architecture validation into the approved 78h work, and moves dependency/emulator/Q04/Android evidence to Done conditions. | S-PM-0903-RMVP01A-START, 2026-09-03. Delivery setup is authorized; product coding waits for stable-baseline push and team publication. Scope exclusions and deferred iOS product timing remain. |
| Q-32 — Week 9 Android UAT platform mapping | Approves UAT-B-0902-R2's exact 45-case mandatory Android/shared aggregation, defers `X-05` and every iOS product instance, and preserves the existing `CORE-16` and `FRIEND-01–05` gates. | S-PM-0903-UAT02, 2026-09-03; platform mapping and aggregation authority only. Every case remains `Not Run`; no Ready, Sprint, iOS schedule, external status write, or Release acceptance follows. |
| Q-01 / C2 — Admin scope | Restricted Create Interest Tag remains the COMP3851A Sprint 5 baseline. Bounded Flutter Admin UI and catalogue/configuration/request-preparation behavior are new COMP3851B requirements. | S-PM-0831, 2026-08-31; prospective PM decision, not retroactive Sponsor/Supervisor approval. |
| Q-02 / C7 — Product name | ENMORI is the product, Nexus Five is the team, and Campus Connect is obsolete historical wording. | S-PM-0831; old artifacts remain unchanged as history. |
| Q-05 / C4 — Calendar selected-date details | Confirmed: self-owned Check-ins, newest-first summaries, approved fields only, with a same-date link to Footprint. | S-PM-0831; does not prove earlier UAT was fixed. |
| Q-09 / C1 — Final report availability/identity | S-FR1 is the PM-designated COMP3851A final submission but internally labels itself an interim group report; Grade B supporting evidence. | Supplied 2026-08-31; no signatures, tracked approval, or explicit Supervisor ruling. |
| Q-15 / C5 — History terminology | Footprint is canonical; it retains selected-date Check-in details and chronologically connects permitted Approx Location points. | S-PM-0831; Check-in Timeline remains historical terminology only. |
| Q-20 / C8 — Target audience | Community users seeking privacy-aware interest/event/lightweight social connection; not students only and not a health-learning/advice platform. | S-PM-0831. |
| Q-14 — Retention, deletion, logging, and audit | Defines purpose-limited AI/Recommendation retention, 90-day Conversation expiry, 30-day constrained operational logs, Admin Configuration Draft/version/audit lifetimes, and exact Account Action Request expiry/minimization/audit boundaries. | S-PM-0902-Q14, 2026-09-02; Q-14 is Resolved. Q-27 still blocks all Account Action values and approval/execution semantics; Q-28 remains separate, and Q-31 is separately resolved by S-PM-0902-Q31. |
| Q-31 — Qwen runtime, validation, and failure contract | Defines the 9B Release identity/isolation evidence, unique deadline and capacity semantics, layered raw/semantic validation, zero automatic retry, use-case fallback, readiness/admission distinction, and mandatory Release evidence. | S-PM-0902-Q31, 2026-09-02; Q-31 is Resolved at requirement-contract level. Implementation remains Not Ready until mandatory Q31-E evidence and other applicable API/UI/platform gates pass. |
| Q-16 — Recommendation empty-result behavior and copy | Defines successful-empty semantics, Q03-compliant no-broadening, Q14-compliant telemetry, privacy-safe public state, independent refresh/See All behavior, and exact Event/Friend/Friends Activity copy. | S-PM-0902-Q16, 2026-09-02; Q-16 is Resolved at requirement-contract level. DTO, visual layout, implementation, and evidence remain separate gates. |
| Q-12 — Interest Tag and Event Category contract | Defines typed identities, Unicode name uniqueness, Event Interest Tag matching, non-cascading lifecycle/reference behavior, Admin authority, optimistic concurrency, distinct error semantics, and bounded single-entity MVP operations/exclusions. | S-PM-0902-Q12, 2026-09-02; Q-12 is Resolved at requirement-contract level. Profile/Event cardinality, publication rules, physical schema/API/UI, implementation, and evidence remain separate. |
| Q-13 — Production Weather contract | Defines Open-Meteo provider/trust/privacy/attribution, bounded current lookup and validation, frozen Weather projection/lifecycle/AI boundary, deterministic display/fallback, explicit exclusions, and mandatory evidence. | S-PM-0902-Q13, 2026-09-02; Q-13 is Resolved at requirement-contract level. External terms, implementation, API/schema/UI, and evidence remain active Release gates. |
| Q-18 — Add Friend identity, lookup, and Friend Request contract | Defines canonical AccountId/Username/DisplayName vocabulary, frozen exact Username lookup, minimum privacy-safe result projection, global reservation and pair uniqueness, 30-day Pending lifetime, race-safe send/accept/decline/invalidation/expiry behavior, stable privacy-safe errors, abuse protection, and MVP exclusions. | S-PM-0902-Q18, 2026-09-02; Q-18 is Resolved at requirement-contract level. API/schema/UI, operational thresholds, migration, implementation, and Release evidence remain separate gates. |
| Project authority and supersession governance | Makes the Q04/SOURCE_MAP authority model canonical project-wide: applicable Sponsor/Supervisor authority is above PM-controlled decisions within scope; PM governs delegated, implementation-detail, and otherwise-undecided matters; date alone never supersedes; compatible specificity may coexist; same-tier conflicts require explicit competent supersession or a new resolution. | S-PM-0902-GOV, 2026-09-02; explicit PM governance-rule correction, not a Sponsor/Supervisor decision and not a substantive product-conflict resolution. |
| BR-PREVIEW-0902-R1 refinement priority | Approves ENABLER-A01 at 8 SP/24h with a historical named-role allocation but retains an explicit current iOS execution-capability Ready gate; selects narrow RMVP-01A as the first production refinement target; keeps Weather/delete/history subsequent; and confirms Q18 outside Week 9 mandatory scope. | S-PM-0902-BR01, 2026-09-02; planning/Release-priority authority only. S-PM-0903-RMVP01A-STAFF-REV later requires balanced A01 re-evaluation and fresh staffing approval before scheduling. Production Ready remains empty and no external execution-status write is authorized. |
| iOS product delivery timing | Makes Week 9 product implementation/evidence/UAT Android-only and defers the complete iOS product implementation until after Week 9. The dual-platform target and ENABLER-A01 architecture-only iOS gate remain. | S-PM-0902-IOS01, 2026-09-02; explicit rule-by-rule PM supersession for product-platform timing only. S-PM-0903-UAT02 subsequently approves the required R2 execution mapping without changing this timing authority. |
| C3 — Check-in required fields | At least Note or Mood; Weather is linked when available and failure does not block. | S-BR2/S-BR45/S-MM-0711 interpreted and confirmed by S-PM-0831. |
| C6 — Recent Check-in AI context | At most five most recent eligible Check-ins from the preceding seven days, only for consented Check-in conversational assistance. | S-PM-0831; explicitly excluded from recommendation generation/ranking. |
| C10 — Special Care eligibility | Any established friend; no minimum friendship duration. | S-PM-0831; S-FR1's “long-time” wording is illustrative only. |
| Flutter client architecture deferral | Feature-first layered client architecture, Riverpod without code generation, `go_router`, Repository `Result<T>` protocol, application-lifetime Auth Session observation, and a Fake-auth validation slice are approved. | S-PM-0901, 2026-09-01; backend, schema, API, Firebase, UI, and algorithm decisions remain outside this approval. |
| COMP3851B Week 9 delivery interpretation | Week 9 targets a prioritized, demonstrable, testable Release MVP after four development Sprints; it is not a promise to implement every confirmed capability by Week 9. Weeks 10–12 are for concentrated stabilization without replacing Sprint-level testing. | S-PM-0901-MVP, 2026-09-01; this initial schedule boundary left feature selection open, which S-PM-0901-SCOPE later resolves for the recorded Must/Should set. |
| Q-29 — COMP3851B Week 9 priority and completion boundary | Bounded AI Assistant, Event Recommendation, Friend Recommendation, Friends Activity ranking, and Persona management are Week 9 Must capabilities. Admin Recommendation Configuration is Should / Not Ready and does not block a separately approved deterministic v1 recommendation. The Release Goal and Definition of Done boundary are recorded; detailed Sprint 2–4 refinement waits for affected blockers. | S-PM-0901-SCOPE, 2026-09-01; PM scope decision only, not Sponsor/Supervisor approval or a Ready finding. |
| Q-30 — Backend Architecture Baseline | Flutter uses Firebase Auth directly and all product operations use one trusted TypeScript/Node.js modular-monolith Backend through versioned REST/JSON and OpenAPI. Fastify is Transport-only; Application/Domain define Ports and Infrastructure implements them. Backend alone accesses Firestore product data and local Ollama. Week 9 uses a controlled single-host deployment, isolated testing, and fail-closed operational boundaries. | S-PM-0901-BACKEND, 2026-09-01; PM architecture decision only. Endpoint/DTO/schema details, algorithms, field allowlists, Qwen operational contract, retention, exact deployment configuration, and implementation evidence remain outside the resolution. |
| RMVP-01A Backend toolchain | Pins Node.js `24.19.0`, pnpm `11.19.0`, TypeScript `7.0.2`, Fastify `5.12.1`, `@types/node 24.13.3`, `firebase-admin 14.3.0`, `firebase-tools 15.29.0`, built-in `node:test`, static Fastify JSON Schema and hand-maintained OpenAPI 3.1 for R4/R9/R10. | S-PM-0905-RMVP01A-TOOLCHAIN, 2026-09-05; resolves only this slice's exact toolchain blocker. Additional dependencies, API/Firestore/deployment choices, implementation and evidence remain separately controlled. |
| Q-17 — Recommendation and AI field allowlists | S-PM-0901-Q17 initially approved deterministic v1 recommendation, Check-in assistance, and single-result explanation fields. S-PM-0901-Q19 later approves the exact structured `persona_presentation_v1` projection, with no Persona identity, object, or free text, and closes the remaining gate. | S-PM-0901-Q17 and S-PM-0901-Q19, 2026-09-01; Q-17 is Resolved. DTO/schema, retention, fallback, runtime, and UI remain separate gates. |
| Q-03 — Deterministic v1 recommendation formulas | Event Recommendation uses interest-match count and upcoming-Event ordering; Friend Recommendation uses `2 × shared interests + common Events`; Friends Activity uses fixed recency, activity-relevance, and Special Care points. Every module has an approved deterministic total ordering before Top 2. | S-PM-0901-Q03, 2026-09-01; resolves Q-03 only. S-ALG4 remains unapproved, Q-16 still controls zero-result behavior, and Admin Recommendation Configuration remains Should / Not Ready. |
| Q-19 — Persona and AI Conversation lifecycle | Defines five-Persona capacity, confirmed unique activation, permanent Persona/Conversation deletion, immutable minimized usage metadata, Check-in provenance invalidation, structured Persona fields, snapshot-at-request-start, and deletion-race fail-closed behavior. | S-PM-0901-Q19, 2026-09-01; Q-19 is Resolved and closes Q-17's Persona projection gate. Retention duration, account-action effects, UI copy, DTO/schema, and Qwen runtime remain separate. |

## 6. Explicitly deferred—not questions to answer by invention

Until PM approves a later phase, do not finalize:

- feature endpoint/DTO fields, Firestore collections/schema/indexes, migrations, exact Firebase environments, and exact deployment configuration beyond the approved Q-30 architecture boundary;
- dependency additions beyond the approved Architecture Slice, and exact package versions until Flutter 3.47.2 compatibility is verified;
- product-wide testing strategy/documentation beyond the approved Architecture Slice evidence;
- detailed production PBIs and Sprint 2–4 commitments until the applicable S-PM-0901-SCOPE blockers are resolved and the backlog is re-refined;
- Account Action Request approval or execution workflow;
- arbitrary model routing/failover or recommendation factors, algorithms, formulas, or data sources beyond the approved deterministic v1 contract.

The S-PM-0901 Fake-auth Architecture Validation Slice may proceed. Q-30 is resolved at architecture level, but neither decision makes an affected production PBI Ready while its remaining behavior, data, privacy, algorithm, UI, or operational blockers are open.

Any decision that would settle one of these items must cite a new approval or authoritative source and update the conflict/change trail.

S-PM-0905-RMVP01A-TOOLCHAIN is the bounded exception for the exact RMVP-01A Backend R4/R9/R10 toolchain only. It does not resolve other Backend dependency choices or the Flutter dependency deferral above.
