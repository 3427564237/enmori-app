# ENABLER-A01 sequencing and execution-capability preview — 2026-09-03

- **Preview ID:** A01-SEQ-CAP-PREVIEW-0903-R1
- **Status:** Superseded before approval by S-PM-0903-RMVP01A-START; retained as analysis history only
- **Planning owner:** LI HOURUI, ENMORI PM
- **Affected items:** ENABLER-A01 and RMVP-01A sequencing only
- **Builds on:** S-PM-0901, S-PM-0902-BR01, S-PM-0902-IOS01, S-PM-0903-RMVP01A-STAFF-REV, S-PM-0903-RMVP01A-STAFF and S-PM-0903-RMVP01A-EST

## Observed repository state

The repository currently contains the Flutter bootstrap but not the approved Fake-auth architecture-validation implementation. In particular, `pubspec.yaml` does not yet include `flutter_riverpod`, `go_router` or Flutter SDK `integration_test`, and the planned Result/Auth/Fake/Provider/Router/ViewModel implementation and focused test structure are absent.

ENABLER-A01 therefore cannot be classified as a completed dependency. Its architecture and implementation plan are approved, but its implementation, review and Android/iOS evidence remain unexecuted.

The repository also contains no current confirmation identifying DU KUN's accessible macOS host, usable Xcode and CocoaPods, shared FVM Flutter 3.47.2 environment, available iOS simulator/device and feasible execution window. This is an evidence absence, not a finding that DU lacks the capability.

## Objective sequencing analysis

The approved RMVP-01A Flutter work depends on the same application-lifetime Auth Session, Repository, Result/error, Riverpod composition and Router-state boundaries that A01 was created to validate. Running the first production slice before validating those boundaries would move the unresolved architecture risk into the larger product PBI and would make A01 substantially overlapping or obsolete without an explicit scope and estimate correction.

The unchanged planning estimates also prevent both items from being selected together under current capacity:

| Item | Approved/proposed task hours relevant to sequencing | Current classification |
|---|---:|---|
| ENABLER-A01 | 24h | Not Ready; balanced staffing requires fresh approval and current iOS architecture capability is unconfirmed |
| RMVP-01A | 78h | Not Ready; separate remaining Ready gates apply |
| Combined unchanged plan | 102h | Exceeds the 100h team Sprint ceiling |

Accordingly, the two items cannot be placed into one unchanged-capacity Sprint, and A01 cannot be silently absorbed into RMVP-01A. Deferring complete iOS product implementation until after Week 9 does not remove A01's separately preserved architecture-only iOS compatibility/evidence gate.

## Recommended PM decision

Approve ENABLER-A01 as a separately executed predecessor evidence gate to RMVP-01A under these limits:

1. A01 validates only the approved Fake-auth Flutter architecture loop and its Android/iOS architecture compatibility. It is not production authentication, an RMVP-01A scope addition, a Release Increment or a completed product outcome.
2. A01 must finish its implementation, different review, integration/evidence gate and required Android/iOS architecture evidence before RMVP-01A may begin implementation.
3. A01 is executed in a separately authorized enabling window before the RMVP-01A development Sprint. It must not be represented as the sole product Sprint Goal or consume hours from RMVP-01A's separately approved 78h Sprint allocation.
4. The balanced `5 / 5 / 5 / 5 / 4` A01 task envelope may receive fresh staffing approval only after the current iOS execution capability below is confirmed, or a qualified replacement validator is assigned.
5. If A01 later proves that RMVP-01A tasks materially duplicate completed A01 outputs, RMVP-01A must return to refinement for explicit residual-scope, task-hour and possibly relative-estimate review. No hours are removed prospectively merely because overlap appears plausible.

## Candidate balanced A01 staffing for later exact approval

| Bounded work | Member | Hours | Independent review/evidence boundary |
|---|---|---:|---|
| Result/Auth/Fake/Provider/ViewModel implementation and owner tests | LI HOURUI | 5h | DU reviews Flutter integration |
| Dependency-direction, Router/auth-fold boundary checks and architecture review | SHI ZHENGQI | 5h | LI reviews the recorded findings |
| Integration-test strategy, execution and evidence-quality gate | JIN ZIHAN | 5h | SHI independently reviews every JIN-authored/executed artifact and result |
| Router/UI state widgets plus required macOS/iOS build and integration validation | DU KUN | 5h | JIN reviews execution evidence; SHI independently reviews any JIN-authored record |
| Lockfile/environment reproducibility, static dependency audit and independent Android rerun | ZHOU YAOYIN | 4h | SHI reviews reproducibility and audit evidence |
| **Total** |  | **24h** | `8 SP` remains a relative estimate and is not converted from hours |

This table remains a candidate until exact staffing approval. It does not supersede the historical `14 / 2 / 4 / 4 / 0` record before such approval.

## Required current capability confirmation

The following facts must be supplied as current, observed information. Blank fields, planned future access, role descriptions, historical capability or Linux-only results do not pass the gate.

| Required fact | Current confirmation to record |
|---|---|
| Validator | DU KUN, or the exact PM-assigned qualified replacement |
| Accessible macOS host | Host class/ownership and access basis, without secrets or sensitive identifiers |
| macOS version | Observed version |
| Xcode | Observed `xcodebuild -version` result |
| CocoaPods | Observed `pod --version` result |
| Project Flutter | Observed `fvm flutter --version` proving Flutter 3.47.2 |
| iOS execution target | Available simulator model/runtime or physical device model and iOS version |
| Feasible window | Concrete date/time window and timezone before A01 completion is required |
| Evidence location | Proposed repository path, Issue or PR location for sanitized commands/results/captures |
| Evidence review | JIN review point plus independent review of JIN-authored evidence artifacts |

Capability confirmation establishes availability only. Actual build, integration-test and device/simulator outcomes remain `Not Run` until executed and reviewed.

## Readiness result if the recommendation is approved

- **A01 sequencing:** resolved as a separately executed predecessor to RMVP-01A.
- **A01 staffing:** still Proposed until the exact balanced table receives explicit approval.
- **A01 Ready:** remains Not Ready until current iOS capability is confirmed or a qualified replacement is assigned and staffing is approved.
- **RMVP-01A:** remains Not Ready on its Q04 evidence, dependency, controlled Backend/Firebase environment and exact Android execution commitments; approval of this preview does not close those gates.
- **Sprint/execution status:** unchanged; no implementation, Sprint start, GitHub Projects write or Notion write is authorized.

## Exact review choices

The PM may:

1. approve the recommended predecessor/separate-enabling-window relationship while leaving capability and staffing Pending;
2. provide the complete current capability facts and approve both sequencing and the candidate staffing in a later exact decision; or
3. reject the relationship and direct a new explicit A01/RMVP-01A scope, overlap, estimate and capacity analysis.

Approval of option 1 alone is a sequencing decision only. It does not assert capability, approve staffing, make either item Ready or authorize execution.

## Subsequent disposition

[S-PM-0903-RMVP01A-START](../decisions/2026-09-03-rmvp-01a-delivery-start.md) subsequently selects a simpler delivery path: A01 is not separately scheduled or counted, and its necessary architecture validation is absorbed into RMVP-01A's already approved work. This preview was not approved and has no current scheduling authority.
