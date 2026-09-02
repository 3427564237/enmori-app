# PM Decision — RMVP-01A staffing revision

- **Source ID:** S-PM-0903-RMVP01A-STAFF-REV
- **Status:** Approved staffing-rule revision and decomposition instruction; corrected RMVP-01A staffing subsequently approved by S-PM-0903-RMVP01A-STAFF
- **Decision date:** 2026-09-03
- **Decision owner:** LI HOURUI, ENMORI PM
- **Affected preview:** [BR-PREVIEW-0902-R1](../planning/2026-09-02-ready-not-ready-backlog-refinement-preview.md)
- **Requirement contract:** [S-PM-0903-RMVP01A-CONTRACT](2026-09-03-rmvp-01a-contract-approval.md)

## Objective policy finding and correction

Before this decision, the repository team policy fixed the 20h/member and 100h/team Sprint ceilings but did not state an approximately balanced workload rule. This decision adds that rule prospectively; it must not be represented as a historical requirement that was already recorded.

Where one approved PBI contains legitimate, non-duplicative work that can be decomposed across all five members, planning should keep member workload approximately balanced. Balance does not require artificial equality and never authorizes invented scope, work outside a member's competence, self-review, duplicate evidence, or weakened dependency/platform gates. A material imbalance requires an evidence-based reason and explicit PM acceptance.

## RMVP-01A disposition

The prior proposed `20 / 20 / 16 / 16 / 6` member-hour allocation is rejected and never becomes an approved assignment. The `78h` total and proposed `8 SP` relative estimate are retained for a revised human-reviewable preview; Points are not converted from hours.

The target staffing envelope is:

| Member | Target hours |
|---|---:|
| LI HOURUI | 16h |
| SHI ZHENGQI | 16h |
| DU KUN | 15h |
| ZHOU YAOYIN | 15h |
| JIN ZIHAN | 16h |
| **Total** | **78h** |

The revised decomposition must remain wholly inside the approved RMVP-01A contract. It may redistribute legitimate Flutter, Backend, Firebase/Auth/Firestore Infrastructure, privacy/security, automated testing, integration, Q04/UAT evidence, documentation and review work. It must not add AI, Recommendation, Mood, Weather, Activity, Approx Location, deletion, Calendar, Footprint, Add Friend/Friend Request, iOS product work, or other excluded behavior merely to balance hours.

PBI ownership does not justify materially higher implementation hours for LI HOURUI. JIN ZIHAN may remain the proposed overall reviewer, but every test, fixture, execution record, evidence artifact or review record authored or executed by JIN requires independent review by another named member.

## ENABLER-A01 effect

The approved A01 `14 / 2 / 4 / 4 / 0` allocation remains the historical S-PM-0902-BR01 allocation and is not silently rewritten by this decision. Before A01 or residual A01 work is scheduled, it must be re-evaluated under the new balance rule and receive a fresh exact staffing approval. The reevaluation must remain inside the Fake-auth architecture-validation scope and preserve its separate iOS architecture evidence gate.

## Approval boundary

This decision authorizes production of revised staffing previews only. It does not approve the revised RMVP-01A or A01 allocations, transition either item to `Ready`, select a Sprint, authorize implementation, alter the approved product scope, satisfy Q04/dependency/environment/device gates, or authorize GitHub Projects/Notion writes.

## Subsequent topology review

[S-PM-0903-RMVP01A-STAFF-R2DIR](2026-09-03-rmvp-01a-staffing-review-topology.md) subsequently accepts the balanced envelope and substantive responsibilities in principle but rejects the first revised table's circular/redundant review graph. It directs an acyclic corrected preview and excludes A01 from the pending RMVP-01A staffing approval. Neither staffing allocation is approved by that review direction.

## Subsequent exact staffing approval

[S-PM-0903-RMVP01A-STAFF](2026-09-03-rmvp-01a-staffing-approval.md) subsequently approves the corrected 78h R1–R16 staffing table and acyclic review topology exactly. The proposed `8 SP`, A01 and all Ready/Sprint/implementation/external-write gates remain outside that approval.

[S-PM-0903-RMVP01A-EST](2026-09-03-rmvp-01a-relative-estimate-approval.md) then separately approves the bounded RMVP-01A at `8 SP` without converting from task hours. It leaves A01 and all remaining Ready/Sprint/implementation/external-write gates unchanged.
