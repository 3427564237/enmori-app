# COMP3851B Ready / Not Ready Backlog Refinement Preview — 2026-09-02

- **Preview ID:** BR-PREVIEW-0902-R1
- **Status:** Approved refinement record; RMVP-01A subsequently made Ready for delivery setup by S-PM-0903-RMVP01A-START
- **Latest Ready re-run:** 2026-09-03 after S-PM-0903-RMVP01A-START
- **Repository evidence:** `08daeb6` (`docs: approve COMP3851B UAT baseline`)
- **Release scope:** [S-PM-0901-SCOPE](../decisions/2026-09-01-comp3851b-mvp-scope-priorities.md)
- **Approved refinement decision:** [S-PM-0902-BR01](../decisions/2026-09-02-backlog-refinement-priority.md)
- **Platform-timing decision:** [S-PM-0902-IOS01](../decisions/2026-09-02-ios-product-delivery-deferral.md)
- **Verification baseline:** [UAT-B-0902-R1](../quality/2026-09-02-comp3851b-uat-baseline.md)
- **Approved Week 9 platform mapping:** [UAT-B-0902-R2](../quality/2026-09-02-comp3851b-uat-baseline-r2.md), approved by [S-PM-0903-UAT02](../decisions/2026-09-03-uat-r2-platform-amendment.md)
- **Approved RMVP-01A product selection:** [S-PM-0903-RMVP01A-SEL](../decisions/2026-09-03-rmvp-01a-product-selection.md)
- **Approved R2 amendment direction:** [S-PM-0903-RMVP01A-R2DIR](../decisions/2026-09-03-rmvp-01a-r2-amendment-direction.md)
- **Approved exact RMVP-01A contract:** [S-PM-0903-RMVP01A-CONTRACT](../decisions/2026-09-03-rmvp-01a-contract-approval.md), approving [R2](../superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-r2-preview.md) and resolving Q-33
- **Approved staffing-rule revision:** [S-PM-0903-RMVP01A-STAFF-REV](../decisions/2026-09-03-rmvp-01a-staffing-revision.md); corrected RMVP-01A staffing later approved by S-PM-0903-RMVP01A-STAFF
- **Staffing review-topology direction:** [S-PM-0903-RMVP01A-STAFF-R2DIR](../decisions/2026-09-03-rmvp-01a-staffing-review-topology.md)
- **Approved RMVP-01A staffing-only:** [S-PM-0903-RMVP01A-STAFF](../decisions/2026-09-03-rmvp-01a-staffing-approval.md); `8 SP`, A01, Ready and Sprint remain outside approval
- **Approved RMVP-01A relative estimate:** [S-PM-0903-RMVP01A-EST](../decisions/2026-09-03-rmvp-01a-relative-estimate-approval.md); Ready, Sprint and implementation remain outside approval
- **Approved bounded RMVP-01A Q04 acceptance:** [S-PM-0903-Q04-RMVP01A-R1](../decisions/2026-09-03-q04-rmvp-01a-entry-core-acceptance.md); evidence and Visual Implementation Ready remain Pending
- **Approved consolidated delivery start:** [S-PM-0903-RMVP01A-START](../decisions/2026-09-03-rmvp-01a-delivery-start.md); RMVP-01A Ready for delivery setup, coding held until team publication
- **Planning policy:** [ENMORI Team Policy](../../.agents/skills/enmori-scrum-planning/references/team-policy.md)

This record refines the approved Week 9 ordinary-community-member Android product Release MVP into vertical work candidates and records the PM-approved estimate, roles and priority amendments. Complete iOS product implementation is deferred until after Week 9 under S-PM-0902-IOS01. S-PM-0903-RMVP01A-START subsequently makes RMVP-01A Ready for delivery setup while holding product coding until the stable baseline and team publication are complete.

## 1. Observed readiness result

### Ready

**RMVP-01A — Authenticated entry and first persisted Check-in.** S-PM-0903-RMVP01A-START applies a bounded Ready exception for this small-team delivery path. The approved contract, `8 SP`, 78h staffing, review topology and scope boundaries remain controlling.

Compatible dependency selection, controlled-emulator setup, bounded Q04 execution evidence and exact Android evidence are now delivery/Done conditions rather than start blockers. A01 is not separately scheduled; necessary architecture validation is absorbed into RMVP-01A. Product coding has not started and waits for stable-baseline push plus GitHub/Notion team publication.

### Historical A01 classification before the consolidated start decision

| Item | Current classification | Evidence already present | Remaining Ready gates |
|---|---|---|---|
| ENABLER-A01 — Fake-auth Flutter architecture validation slice | **Not Ready — current iOS execution capability unconfirmed; staffing reapproval required before scheduling** | Approved Flutter architecture, pinned Flutter 3.47.2, approved Riverpod/go_router boundary, detailed implementation/test plan, historically approved `8 SP`/24h and `14 / 2 / 4 / 4 / 0` roles | Explicit current confirmation of DU's accessible macOS host, Xcode, CocoaPods, FVM Flutter 3.47.2, available iOS simulator/device and feasible execution window; otherwise PM assignment of another qualified validator. S-PM-0903-RMVP01A-STAFF-REV also requires balanced staffing re-evaluation and fresh exact approval before A01/residual work is scheduled. |

ENABLER-A01 is an architecture enabler, not completed production authentication and not a user-value PBI. It may support the first production vertical slice, but a development Sprint must still target a runnable product Increment rather than treating architecture work alone as the Sprint Goal.

S-PM-0903-RMVP01A-START subsequently leaves this table as history only: A01 is not separately scheduled or counted, and necessary validation is absorbed into RMVP-01A's approved work.

#### ENABLER-A01 historical approved task-hour and role allocation

| Work | Assigned member | Hours | Evidence/output |
|---|---|---:|---|
| Implement the approved Result/Auth/Fake/Provider/Router/ViewModel validation loop and Android evidence | LI HOURUI | 14h | Approved plan tasks; analyzer, focused tests, Android build/integration evidence |
| Different-reviewer architecture and dependency review | SHI ZHENGQI | 2h | Review record; no self-review |
| Integration-test and evidence-quality review | JIN ZIHAN | 4h | Integration/evidence gate |
| macOS/iOS build and integration validation | DU KUN | 4h | Required iOS device/simulator evidence |
| **Total** |  | **24h** | Approved `8 SP`; Points remain relative and are not converted from hours |

These assignments and estimates were approved under S-PM-0902-BR01 and remain part of the change trail. S-PM-0903-RMVP01A-STAFF-REV subsequently requires balanced re-evaluation and fresh exact staffing approval before A01 or residual A01 work is scheduled; it does not silently rewrite the historical allocation. The repository also lacks the required explicit current host/tool/device/window confirmation. ENABLER-A01 therefore remains `Not Ready`. This is an evidence finding, not a claim that DU lacks the capability.

### RMVP-01A estimation, assignment and Android commitment preview

S-PM-0903-RMVP01A-STAFF-REV rejects the former proposed `20 / 20 / 16 / 16 / 6` allocation and introduces the prospective approximately balanced-workload rule. S-PM-0903-RMVP01A-STAFF approves the following corrected staffing table exactly. Story Points are a relative complexity/uncertainty estimate and are not derived from task hours. The item remains one vertical PBI; the rows are delivery tasks, not separate horizontal PBIs.

- **Approved relative estimate:** `8 SP` — not derived or converted from the approved 78h task plan
- **Approved PBI owner:** LI HOURUI
- **Approved different overall reviewer:** JIN ZIHAN
- **Approved total task hours:** `78h`
- **Approved member envelope:** LI 16h; SHI 16h; DU 15h; ZHOU 15h; JIN 16h
- **Proposed platform boundary:** Week 9 Android product implementation/evidence only; complete iOS product implementation/UAT remains deferred

| ID | Approved staffing task | Assigned member | Internal predecessors | Review/output relation | Hours | Non-duplicative output/evidence |
|---|---|---|---|---|---:|---|
| R1 | Flutter Firebase-auth client adapter integration; onboarding-status/retry and Check-in Repository/ViewModel/Router behavior; owner-focused unit/integration tests | LI HOURUI | — | Independently reviewed by DU in R8 | 11h | Flutter application/data integration excluding visual-widget ownership |
| R2 | PBI coordination, contract-to-task traceability and integration handoff documentation | LI HOURUI | R1, R4, R6, R9, R10 | Component-reviewed by SHI in R5A; otherwise consumed by R15 | 2h | Traceability/handoff record; no product-scope change |
| R3 | Component review of SHI's approved Backend-contract conformance and DU's UI/Android output | LI HOURUI | R4, R6, R7 | Component-review output consumed by R15; no dependency on R11 or R15 | 2h | Contract/UI/device findings only; no review-of-review work |
| R4 | Backend Application/Domain/Transport implementation for onboarding, Note-only create/later-read, stable errors and OpenAPI; owner-focused tests | SHI ZHENGQI | — | Contract-reviewed by LI in R3 and boundary-reviewed by ZHOU in R11 | 13h | Fastify/Application/OpenAPI work excluding concrete Firebase/Firestore adapters |
| R5A | Component review of R2 plus ZHOU's R9/R10 Infrastructure outputs | SHI ZHENGQI | R2, R9, R10 | Component-review output consumed by R15 | 1h | Contract/Infrastructure findings; no second-order review of non-JIN review records |
| R5B | Independent review of every JIN-authored/executed R12–R14 artifact/result | SHI ZHENGQI | R12, R13, R14 | Terminal independent JIN-artifact review; excluded from JIN's R15 approval scope | 2h | Explicit independent test/evidence review packet |
| R6 | Bounded M02/M06/M07/M08/M19/M20 Flutter widgets/states, accessibility/responsive behavior and widget tests | DU KUN | — | Independently reviewed by LI in R3 | 10h | Q04-bounded Android UI implementation only after affected acceptance gates pass |
| R7 | Named Android device surface execution and sanitized capture package | DU KUN | R1, R4, R6, R9, R10 | Independently reviewed by LI in R3; consumed by R15 | 3h | Device/OS/build/time/result evidence; no iOS product work |
| R8 | Component review of LI's Flutter application/repository/state integration | DU KUN | R1 | Component-review output consumed by R15 | 2h | Flutter review record distinct from DU-authored UI work; no second-order review |
| R9 | Firebase Admin Auth Principal verification adapter, Auth Binding and Firestore repositories/atomic transactions; infrastructure contract tests | ZHOU YAOYIN | — | Independently reviewed by SHI in R5A; boundary-consumed by R11 | 11h | Concrete Infrastructure work under approved Backend ports; no AI/Recommendation work |
| R10 | Controlled Firebase Emulator Suite/Backend environment reproducibility and sanitized configuration evidence | ZHOU YAOYIN | R9 | Independently reviewed by SHI in R5A; consumed by R15 | 2h | Repeatable environment evidence without secrets or production-data use |
| R11 | Component review of SHI's Transport/Application-to-Infrastructure boundary and failure mapping against ZHOU's R9 adapter boundary | ZHOU YAOYIN | R4, R9 | Component-review output consumed by R15; does not review any LI review record | 2h | Cross-boundary findings distinct from ZHOU-authored adapter implementation |
| R12 | Test strategy, controlled fixtures and traceability for both Initial Choice branches, exact retries/conflicts, validation, ownership and failures | JIN ZIHAN | — | Independently reviewed by SHI in R5B; excluded from JIN's R15 approval scope | 4h | Test design and fixtures independently reviewed before use |
| R13 | Cross-boundary automated create-then-later-read, cancellation, identity and privacy-safe negative integration execution | JIN ZIHAN | R1, R4, R9, R10, R12 | Independently reviewed by SHI in R5B; excluded from JIN's R15 approval scope | 6h | Integration execution/results independently reviewed; not a substitute for owner tests |
| R14 | Android UAT/evidence collation and defect/retest ledger for the R2 anchors | JIN ZIHAN | R7, R13 | Independently reviewed by SHI in R5B; excluded from JIN's R15 approval scope | 3h | Every result begins `Not Run`; authored/executed evidence independently reviewed |
| R15 | Overall different-reviewer gate over LI/SHI/DU/ZHOU implementation and applicable component-review outputs | JIN ZIHAN | R1, R2, R3, R4, R5A, R6, R7, R8, R9, R10, R11 | Excludes R5B and JIN-authored/executed R12–R14; its final gate record is terminally reviewed by LI in R16 | 3h | Overall gate without JIN self-approval |
| R16 | Terminal independent review of JIN's R15 final overall-gate record | LI HOURUI | R15 | Terminal review; produces no dependency back to R3, R5, R8, R11 or R15 | 1h | Satisfies no-self-review for the JIN-authored final review record |
| **Total** |  |  |  |  | **78h** | LI 16h; SHI 16h; DU 15h; ZHOU 15h; JIN 16h |

The five totals are within one hour of each other and every row maps to an approved contract, test, evidence or review boundary. ZHOU's hours are Firebase/Auth/Firestore Infrastructure and controlled-environment work under approved Backend ports, not invented AI or Recommendation scope. The review graph is acyclic: implementation/test outputs feed R3/R5A/R5B/R8/R11 component or independent reviews; applicable non-JIN outputs feed R15; R16 then terminally reviews JIN's R15 record. R15 neither approves nor consumes JIN-authored/executed R12–R14 or their R5B independent-review packet.

These are estimates, not observed effort or a Sprint allocation. ENABLER-A01's approved 24h cannot be added to this 78h in the same unchanged-capacity Sprint: the combined 102h exceeds the 100h ceiling. Existing authority does not explicitly classify A01 as a mandatory predecessor to RMVP-01A. A future Sprint preview must therefore classify their sequencing/dependency relationship and then show A01 already completed, schedule the items separately, or obtain an explicit scope/capacity change; carryover is never assumed.

The proposed Android commitment is not yet complete. Before `Ready`, it must name the available physical Android device, Android OS version, app/build identity, responsible executor, feasible execution window, controlled Backend/Firebase environment, evidence location and JIN review point. Android/Linux evidence does not satisfy ENABLER-A01's separate architecture-only iOS gate.

#### Exact RMVP-01A staffing approval record

S-PM-0903-RMVP01A-STAFF approves only the 78h member envelope, LI PBI ownership, JIN overall-review role, R1–R16 task responsibilities including separate R5A/R5B outputs, and the recorded acyclic review topology. It excludes the proposed `8 SP`, A01 staffing, Ready transition, Sprint selection/execution, unresolved Q04/dependency/environment/Android gates, implementation, GitHub Projects and Notion writes.

### ENABLER-A01 balance re-evaluation preview

S-PM-0903-RMVP01A-STAFF-REV does not silently replace A01's approved `14 / 2 / 4 / 4 / 0` allocation. If A01 or residual A01 work is later scheduled, the following `5 / 5 / 5 / 5 / 4` candidate decomposition must receive fresh exact approval:

| Candidate bounded work | Member | Hours | Independent review/evidence boundary |
|---|---|---:|---|
| Result/Auth/Fake/Provider/ViewModel implementation and owner tests | LI HOURUI | 5h | DU reviews Flutter integration |
| Dependency-direction, Router/auth-fold boundary checks and architecture review | SHI ZHENGQI | 5h | LI reviews the recorded findings |
| Integration-test strategy, execution and evidence-quality gate | JIN ZIHAN | 5h | SHI independently reviews every JIN artifact/result |
| Router/UI state widgets plus required macOS/iOS build/integration validation | DU KUN | 5h | JIN reviews execution evidence; SHI reviews any JIN-authored record |
| Lockfile/environment reproducibility, static dependency audit and independent Android rerun | ZHOU YAOYIN | 4h | SHI reviews reproducibility/audit evidence |
| **Total** |  | **24h** | No Backend product, Firebase, AI, Recommendation or iOS product functionality added |

This A01 candidate retains `8 SP`, 24h, Fake-auth-only scope and the existing current macOS/Xcode/iOS capability gate. It is technically accepted only as a preview and is explicitly excluded from S-PM-0903-RMVP01A-STAFF. Fresh A01 staffing approval waits for the A01-versus-RMVP-01A sequencing/residual-scope relationship and current iOS architecture execution capability; it is not an approved replacement allocation or Sprint assignment.

## 2. Production backlog preview

Every candidate below is a vertical outcome rather than a person-owned technical layer. Architecture, API, schema, tests, deployment and evidence work belong inside the eventual PBI task breakdown.

| Candidate PBI | Vertical user outcome and UAT anchor | Approved requirement authority | Concrete Not Ready reason | Required next refinement action |
|---|---|---|---|---|
| RMVP-01A — Authenticated entry and first persisted Check-in | A new ordinary member completes Firebase email/password registration with onboarding Username, follows either `Accept → Public` or `Reject → Private`, creates one Note-only Check-in, receives a visible success result, and the controlled Backend plus a later owner read prove persistence; `CORE-01.A`, `CORE-02.A`, `CORE-05.A`, affected `X-01` | S-BR1/S-BR2/S-BR4/S-BR45; S-PM-0901-BACKEND; S-PM-0902-BR01; S-PM-0902-IOS01; S-PM-0903-UAT02; S-PM-0903-RMVP01A-SEL/R2DIR/CONTRACT/STAFF-REV/STAFF-R2DIR/STAFF/EST; S-PM-0903-Q04-RMVP01A-R1; S-PM-0903-RMVP01A-START | **Ready — delivery setup.** Contract, 78h balanced staffing, `8 SP`, bounded Q04 authority/content and the consolidated start are approved. Dependency/emulator/Q04/Android evidence remains mandatory before Done. | Push the stable baseline, publish GitHub member work packages and the linked Notion kickoff; then LI may release assigned work from Ready to In Progress |
| RMVP-02 — Profile and controlled Interests | A views/updates the approved Profile and controlled Interest selections; `CORE-04`, affected `X-02` | S-BR1/S-BR5; S-PM-0902-Q12 | Profile field purpose/visibility/lifecycle and cardinality remain unresolved outside Q04; physical API/schema and accepted visual states are absent | Resolve the affected Profile contract and Q04 fields; define minimum Profile/Interest API/schema and tests |
| RMVP-03B — Remaining Check-in validation, Weather and delete propagation slices | Subsequent vertical slices complete the alternate valid/invalid Check-in outcomes, real Weather enrichment/fallback and owned Check-in deletion propagation; remaining `CORE-05–09`, `CORE-12`, `X-04` not selected into RMVP-01A | S-BR2/S-BR45; S-PM-0902-Q13/Q14; S-PM-0902-BR01 | Explicitly outside the first slice; requires further split if any candidate exceeds 8 SP; physical Weather/lifecycle contracts, Open-Meteo recheck, Q04 states, fixtures, estimates and assignments are absent | After RMVP-01A contract refinement, split alternate validation, Weather and delete propagation into independently runnable/testable vertical candidates rather than restoring the former whole RMVP-03 |
| RMVP-04 — Calendar and Footprint history | A reviews selected-date summaries and Footprint details/points, including delete propagation; `CORE-10–12` | S-BR2; S-PM-0831 C4/C5 | Physical read projection/API/schema and final Q04 Calendar/Footprint responsive/platform states are absent; no accepted estimates or assignments | Define selected-date projection and deletion consistency contract; complete visual/platform acceptance; estimate and assign |
| RMVP-05 — Event Interested/Going and external registration return | A marks Interested, follows an external registration link, and explicitly confirms or rejects Going; `CORE-13–15` | S-BR45/S-KD5 | Event-state mutation/API/schema, external-return handling and final Q04 states are not accepted; no owner/reviewer/estimate | Define the minimum event interaction contract and return-state tests; complete affected Q04 states |
| RMVP-06 — Deterministic Event Recommendation | A receives authorized deterministic Event results, safe empty state, Top 2 and See All; `REC-01–02`, `REC-07–08`, `X-06` | S-PM-0901-Q03/Q17; S-PM-0902-Q12/Q16/Q31 | Formula/allowlist semantics are approved, but candidate read API/schema, publication/lifecycle binding, final UI states, fixtures and platform plan are not | Draft the Event Recommendation read contract and deterministic fixture suite; complete Q04 module states; estimate and assign |
| RMVP-07 — Deterministic Friend Recommendation | A receives authorized deterministic people recommendations and safe empty state without direct Add Friend action; `REC-03–04`, `REC-07–08`, `X-06` | S-PM-0901-Q03/Q17; S-PM-0902-Q16/Q18 | Candidate API/schema, protected result projection, final UI states and fixture/evidence plan are absent; Q04 direct-request and profile-exposure questions remain gated | Define a read-only recommendation projection that does not authorize Add Friend action; resolve affected Q04 presentation; estimate and assign |
| RMVP-08 — Ranked Friends Activity | A receives the authorized unified Friends Activity ranking, safe empty state, Top 2 and See All; `REC-05–08` | S-PM-0901-Q03/Q17; S-PM-0902-Q16 | Activity event/projection contract, recency data source, API/schema, final Q04 states and test fixtures are absent | Define the minimum activity projection and deterministic fixture contract; complete Q04 states; estimate and assign |
| RMVP-09 — Persona management and activation | A creates/edits/selects/activates/deletes up to five structured Personas; `AI-01–04` | S-PM-0901-Q19 | Business lifecycle is approved, but physical API/schema and final visual interaction remain absent; Q04-DEV-17/18/19 remain retained unapproved candidates | Decide the three affected Q04 candidates; draft the minimum Persona mutation/read contract; estimate and assign |
| RMVP-10 — Bounded Check-in AI assistance | A receives consented, bounded assistance from the approved Qwen digest with safe failure and deletion-race behavior; `AI-05–06`, `AI-08–11`, affected `AI-12`/`X-06` | S-PM-0831 C6; S-PM-0901-Q17/Q19; S-PM-0902-Q14/Q31 | Request/response API, semantic-policy implementation evidence, controlled-host digest/capacity fixture, final UI content/failure states and platform plan are absent | Draft the Check-in-assistance API/projection and controlled Qwen evidence plan; complete affected Q04 states; estimate and assign |
| RMVP-11 — Bounded Recommendation explanation | A receives an optional presentation-only explanation without changing deterministic eligibility/order; `AI-07–11`, `X-06` | S-PM-0901-Q03/Q17/Q19; S-PM-0902-Q14/Q31 | Explanation API/projection binding, deterministic fallback rendering, final UI state and controlled-host evidence plan are absent | Draft the explanation contract tied to already-ranked results; define fallback evidence; complete Q04 states; estimate and assign |

## 3. Explicitly gated or excluded backlog

| Scope | Classification | Boundary |
|---|---|---|
| CORE-16 Interested/Going participant identity, count and Friends/Others disclosure | **Authority-gated; non-mandatory** | Do not refine into a mandatory implementation PBI until the disclosure contract is approved. |
| Q18 Add Friend/Friend Request implementation | **Release-scope gated; non-mandatory** | S-PM-0902-BR01 confirms it remains outside Week 9 mandatory scope. Q18 requirements and `FRIEND-01–05` remain valid; historical COMP3851A/Sprint 3 requirements/evidence are not erased. A later explicit durable PM scope decision is required for promotion. |
| Admin Recommendation Configuration | **Should / Not Ready** | Q-28 blocks only this Admin scope; it does not block RMVP-06–08 deterministic modules. |
| Account Action Request approval/execution | **Excluded / Blocked** | Q-27 remains unresolved; only preparation of a Pending request is approved outside the Week 9 ordinary-user baseline. |
| Historical COMP3851A evidence repair | **Not a production PBI** | Q-C9 and Q-21–Q-26 remain historical verification questions; UAT-B-0902-R1 does not close them. |
| Complete iOS product implementation and product UAT | **Deferred until after Week 9** | S-PM-0902-IOS01 changes timing only. No later Sprint/date, Points, hours or assignment is approved; final dual-platform Release remains pending. |

## 4. Delivery-start sequence

1. Commit and push the approved decision, planning, contract, UAT and Q04 baseline to the confirmed team remote.
2. Publish one RMVP-01A parent item and compact member work packages in GitHub Projects at `Ready`; preserve the approved owner/reviewer topology and one-primary-task WIP rule.
3. Publish one linked Notion kickoff/decision page for the Sprint Goal, scope boundaries, responsibilities and working agreement without duplicating GitHub execution status.
4. LI confirms the team briefing is usable, then releases assigned work to `In Progress`.
5. Complete dependency/emulator/Q04/Android evidence inside delivery before `Done`; keep all excluded functionality outside the slice.

## 5. External-system preview

S-PM-0903-RMVP01A-START authorizes preparation of the delivery publication, but the exact current payload must still be previewed immediately before external writes.

If capability confirmation or contract refinement later changes an item's classification, prepare a refreshed exact external-write preview. Only fresh PM approval of that changed preview may authorize creating or updating the item with its source links, acceptance criteria, Points, task-hour subtasks, owner, different reviewer, dependencies, platform gates and status. Notion should receive only the corresponding planning/decision note where needed; it must not duplicate authoritative execution status.

## 6. Outstanding evidence and refinement gates

1. ENABLER-A01 is not separately scheduled or counted for this path; its historical record remains and necessary validation is absorbed into RMVP-01A.
2. RMVP-01A is Ready for delivery setup with its approved contract, corrected 78h/`16 / 16 / 15 / 15 / 16` staffing, `8 SP` and bounded Q04 authority/content acceptance.
3. Product coding remains held until the stable baseline and team publication are complete; no work is yet `In Progress`.
4. Q18 remains outside the Week 9 mandatory Release scope; no further decision is needed unless promotion is proposed.
5. GitHub Projects/Notion publication awaits the exact current external-write preview and confirmed destinations/accounts.
6. Complete iOS product implementation/UAT is deferred until after Week 9; its later schedule and staffing remain undecided.
