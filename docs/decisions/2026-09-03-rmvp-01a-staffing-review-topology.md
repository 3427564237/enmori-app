# PM Review — RMVP-01A revised staffing topology

- **Source ID:** S-PM-0903-RMVP01A-STAFF-R2DIR
- **Status:** Approved review-topology amendment direction; corrected staffing subsequently approved by S-PM-0903-RMVP01A-STAFF
- **Review date:** 2026-09-03
- **Review owner:** LI HOURUI, ENMORI PM
- **Affected preview:** [BR-PREVIEW-0902-R1](../planning/2026-09-02-ready-not-ready-backlog-refinement-preview.md)
- **Prior staffing revision:** [S-PM-0903-RMVP01A-STAFF-REV](2026-09-03-rmvp-01a-staffing-revision.md)

## Review disposition

The balanced `78h` staffing envelope and substantive member responsibilities are acceptable in principle. The prior revised task table is not approved exactly as written because its second-order review dependencies form circular or redundant review paths.

The following envelope is preserved for the corrected preview:

| Member | Proposed hours |
|---|---:|
| LI HOURUI | 16h |
| SHI ZHENGQI | 16h |
| DU KUN | 15h |
| ZHOU YAOYIN | 15h |
| JIN ZIHAN | 16h |
| **Total** | **78h** |

The corrected review topology must be acyclic:

`implementation/test artifacts → component independent reviews → JIN overall gate → LI independent review of JIN's final gate record`

Specifically:

1. R3 must not depend on R11 or R15 review records.
2. R11 must not review LI's consolidated review record.
3. R5 and R8 must not add second-order review of non-JIN review records without separate approved authority.
4. R15 occurs after applicable LI/SHI/DU/ZHOU implementation and component-review outputs are complete. It excludes JIN-authored/executed R12–R14 artifacts from JIN's own approval scope.
5. LI performs the terminal independent review of JIN's R15 overall-review record.

Freed second-order-review time remains within the same member totals and is used only for substantive component review or integration activity already inside the approved RMVP-01A contract. No scope may be added to preserve hours.

## A01 and estimation boundaries

The A01 `5 / 5 / 5 / 5 / 4` candidate is technically acceptable as a preview but is excluded from the pending RMVP-01A staffing approval. Fresh A01 staffing approval waits until the A01-versus-RMVP-01A sequencing/residual-scope relationship and current iOS architecture execution capability are resolved.

RMVP-01A remains `8 SP Proposed`; this review is not relative-estimation approval.

No Ready transition, Sprint execution, implementation, GitHub Projects write or Notion write is authorized.

## Subsequent exact staffing approval

[S-PM-0903-RMVP01A-STAFF](2026-09-03-rmvp-01a-staffing-approval.md) subsequently approves the corrected 78h R1–R16 staffing table and acyclic topology exactly. The proposed `8 SP`, A01 and all Ready/Sprint/implementation/external-write gates remain outside that approval.

[S-PM-0903-RMVP01A-EST](2026-09-03-rmvp-01a-relative-estimate-approval.md) then separately approves the bounded RMVP-01A at `8 SP` without converting from task hours. It does not alter the approved review topology or authorize A01, Ready, Sprint, implementation or external writes.
