# Backlog refinement priority and readiness decision — 2026-09-02

- **Status:** Approved by PM
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-BR01
- **Scope:** BR-PREVIEW-0902-R1 disposition; ENABLER-A01 estimate, staffing and Ready gate; first production vertical refinement boundary; Q18 Week 9 Release priority; Sprint-assignment and external-write boundary
- **Builds on:** S-PM-0901, S-PM-0901-SCOPE, S-PM-0902-Q18, S-PM-0902-GOV and UAT-B-0902-R1

## ENABLER-A01 estimate, staffing and readiness

The Fake-auth Flutter architecture validation slice is approved at `8 SP`. Story Points remain a relative complexity/uncertainty estimate and were not derived or converted from task hours.

The approved 24-hour task split is:

| Responsibility | Assigned member | Hours |
|---|---|---:|
| Approved Result/Auth/Fake/Provider/Router/ViewModel validation loop and Android evidence | LI HOURUI, implementation owner | 14h |
| Different-reviewer architecture, implementation-boundary and dependency review | SHI ZHENGQI | 2h |
| Integration-test and evidence-quality review | JIN ZIHAN | 4h |
| macOS/iOS build and integration validation | DU KUN | 4h |
| **Total** |  | **24h** |

This allocation approves task ownership and estimates only. It is not a Sprint assignment, `In Progress` transition, completion claim, or Release Increment.

ENABLER-A01 may transition to `Ready` only after DU KUN's required macOS/Xcode/iOS execution capability is explicitly confirmed for the work. Confirmation must identify an accessible macOS host, usable Xcode and CocoaPods, the shared FVM Flutter 3.47.2 environment, an available iOS simulator or device, and a feasible execution window. A role description, historical capability statement, Linux result, or planned future access is not confirmation. If DU cannot satisfy this gate, the PM must assign another qualified iOS validator before `Ready`.

At this decision point, the repository contains no such current execution-capability confirmation. ENABLER-A01 therefore remains `Not Ready`, blocked only by that confirmation or qualified-validator reassignment. This finding does not assert that DU lacks the capability; it records that the required evidence is not yet present.

## First production vertical refinement boundary

The first production refinement target combines the dependency-entry path represented by RMVP-01 with only the minimum Check-in outcome required for a runnable Increment. It must not absorb all of RMVP-03.

The narrow target is provisionally identified as `RMVP-01A — Authenticated entry and first persisted Check-in`. Its product outcome is:

- an ordinary community member completes the selected account-entry path;
- the applicable initial privacy and optional-processing consent choice is recorded without preventing entry when the approved path permits continuation;
- the member creates one valid Check-in using one explicitly selected `Note-only` or `Mood-only` fixture variant;
- the Check-in is persisted under authoritative ownership and time; and
- the member receives a user-visible success result, with persistence proved by controlled Backend evidence and a later read rather than by an immediate success message alone.

The exact account-entry path, initial Accept/Reject coverage, selected Note-only/Mood-only variant, physical API/DTO/schema, authorization/error contract, Q04 surface states, tests, estimate, owner, different reviewer and platform commitments remain refinement gates. `RMVP-01A` is therefore `Not Ready` at this decision point.

Real Weather enrichment, Check-in deletion propagation, Calendar and Footprint remain subsequent production slices unless later dependency evidence demonstrates that one is technically inseparable from this narrow outcome. Convenience or architectural preference alone does not expand RMVP-01A.

## Q18 Week 9 Release-priority boundary

Q18 Add Friend/Friend Request remains outside the Week 9 mandatory Release scope and remains `Release-scope gated; non-mandatory`. UAT `FRIEND-01–05` remains an accepted gated verification design, not a mandatory Week 9 Pass set.

This is a prospective COMP3851B Release-priority decision. It does not erase, invalidate, reinterpret as unapproved, or close historical COMP3851A/Sprint 3 Friend Request requirements or verification evidence. Promotion into the mandatory Week 9 Release backlog requires a later explicit durable PM scope decision.

## Sprint and external-system boundary

No production Sprint assignment is approved until at least one production vertical PBI satisfies the complete Ready definition. ENABLER-A01 may be staffed and executed after its own Ready gate passes, but architecture validation alone must not be represented as the Release Increment or sole development Sprint Goal.

This decision authorizes no GitHub Projects or Notion execution-status write. If a later capability confirmation or refinement result changes an item's classification, the changed state requires a refreshed exact external-write preview and fresh PM approval immediately before any external write.

## Reclassification result

- Production `Ready`: none.
- ENABLER-A01: `Not Ready`; approved at `8 SP` and 24h with named roles, blocked only by explicit current iOS execution-capability confirmation or qualified-validator reassignment.
- RMVP-01A: `Not Ready`; approved as the first production refinement target, with its listed behavioral and contract gates still open.
- Q18 Add Friend/Friend Request: `Release-scope gated; non-mandatory` for Week 9.
- GitHub Projects/Notion execution status: no change authorized.

This PM decision operates only within its stated project-planning and Release-priority scope. It is not a Sponsor/Supervisor decision, does not approve implementation, and does not claim that any case has run or any Release criterion has passed.

## Subsequent staffing-policy revision

[S-PM-0903-RMVP01A-STAFF-REV](2026-09-03-rmvp-01a-staffing-revision.md) subsequently adds a prospective legitimate-work balance rule. It preserves this decision's historical A01 `8 SP`/24h allocation in the trail but requires a balanced re-evaluation and fresh exact staffing approval before A01 or residual A01 work is scheduled. The separate current iOS architecture-capability gate remains unchanged.
