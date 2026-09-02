# PM Approval — RMVP-01A staffing-only

- **Source ID:** S-PM-0903-RMVP01A-STAFF
- **Status:** Approved staffing-only; RMVP-01A remains Not Ready
- **Approval date:** 2026-09-03
- **Approval owner:** LI HOURUI, ENMORI PM
- **Approved table:** [BR-PREVIEW-0902-R1 RMVP-01A R1–R16 staffing](../planning/2026-09-02-ready-not-ready-backlog-refinement-preview.md#rmvp-01a-estimation-assignment-and-android-commitment-preview)
- **Review direction:** [S-PM-0903-RMVP01A-STAFF-R2DIR](2026-09-03-rmvp-01a-staffing-review-topology.md)

## Approval

The corrected RMVP-01A staffing preview is approved exactly for:

- `78h` total planned task time;
- LI HOURUI 16h, SHI ZHENGQI 16h, DU KUN 15h, ZHOU YAOYIN 15h and JIN ZIHAN 16h;
- LI HOURUI as PBI owner;
- JIN ZIHAN as overall reviewer;
- R1–R16 task responsibilities, including separate R5A and R5B outputs; and
- the acyclic implementation/test → component independent review → JIN overall gate → LI terminal review topology.

R15 excludes R5B and JIN-authored/executed R12–R14 from JIN's approval scope. R16 is the terminal independent review of JIN's R15 final gate record. No dependency returns from R16 to an earlier task.

## Approval boundary

This staffing approval does not approve:

- the proposed `8 SP` relative estimate;
- A01 staffing, sequencing, residual scope or iOS capability;
- unresolved Q04 visual/state acceptance or evidence;
- Flutter/Firebase/Backend dependency versions;
- controlled Backend/Firebase environment readiness;
- the exact Android device, OS, executor, execution window or evidence location;
- a `Ready` transition, Sprint selection or Sprint execution;
- implementation, UAT Pass, Release acceptance, GitHub Projects write or Notion write.

The approved hours remain planning/reporting and capacity evidence, not observed effort or a coding-speed forecast. Staffing approval alone does not start any task.

## Subsequent relative-estimation approval

[S-PM-0903-RMVP01A-EST](2026-09-03-rmvp-01a-relative-estimate-approval.md) subsequently approves the bounded RMVP-01A at `8 SP` without converting from these task hours. All remaining Ready, Sprint, implementation and external-write gates remain unchanged.
