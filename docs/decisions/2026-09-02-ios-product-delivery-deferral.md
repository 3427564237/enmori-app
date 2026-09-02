# iOS product delivery deferral — 2026-09-02

- **Status:** Approved by PM
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-IOS01
- **Scope:** Week 9 product-platform implementation, product UAT and Release-acceptance timing
- **Builds on and partially supersedes:** S-PM-0901-MVP, S-PM-0901-SCOPE, UAT-B-0902-R1 and S-PM-0902-BR01 only as stated below
- **Does not supersede:** Sponsor/Supervisor or assessment authority; the project-wide Android/iOS target; platform-independent architecture rules; ENABLER-A01 architecture-evidence requirements; historical COMP3851A delivery or evidence

## Decision

The complete iOS product implementation is deferred until after Week 9. Week 9 product implementation, product-level device evidence and product UAT are Android-only.

This timing decision covers iOS product features, iOS-specific product integration and presentation work, product-level iOS build/device verification, and iOS execution of the Release UAT case set. None of those outcomes may be inferred from Android evidence or described as completed at Week 9.

ENMORI remains an Android/iOS Flutter product target. iOS is deferred, not cancelled. Final dual-platform Release acceptance remains unavailable until the deferred iOS product implementation and applicable iOS build, device, integration, accessibility/platform and UAT evidence pass under a later approved plan.

Week 9 may be described only as the Android product Release MVP or Android Week 9 Release baseline within the approved feature scope. It must not be described as a completed dual-platform Release.

## Rule-by-rule supersession

| Earlier source/rule | Superseded scope | Current rule | Unchanged boundary |
|---|---|---|---|
| S-PM-0901-MVP — Weeks 10–12 do not replace platform evidence inside Sprints 1–4 | iOS **product** implementation/evidence timing only | iOS product implementation and product evidence may occur after Week 9 | Android testing/review/evidence remains inside the applicable development Sprint; Weeks 10–12 are not an automatic buffer for unfinished Android Must scope |
| S-PM-0901-SCOPE — Week 9 Must PBIs carry Android and iOS evidence | Week 9 product platform evidence only | Week 9 Must PBIs require Android product evidence; their iOS product implementation/evidence is deferred | Must feature set, integration, tests, review, traceability, GitHub Done and PM Release-scope acceptance rules remain |
| UAT-B-0902-R1 — user-visible Week 9 cases run independently on Android and iOS | Week 9 execution platform only | Week 9 product UAT is Android-only; iOS product UAT is deferred | Case semantics, controlled-host/shared evidence, fixtures, result vocabulary, privacy, stop conditions and every `Not Run` status remain |
| S-PM-0902-BR01 — production PBI platform commitments | Week 9 production platform timing only | Production PBI refinement uses Android product implementation/evidence for Week 9 and records iOS as deferred | Production `Ready` remains empty; all non-platform Ready gates remain active; no Sprint/external write is authorized |

This decision does not silently rewrite UAT-B-0902-R1's accepted historical platform wording. A UAT-B-0902-R2 platform amendment must preserve R1, identify Android as the Week 9 mandatory product platform, retain iOS cases as deferred `Not Run`, and define the later dual-platform acceptance relationship before Week 9 UAT execution is claimed against the revised contract.

That required amendment was subsequently approved on 2026-09-03 as [UAT-B-0902-R2](../quality/2026-09-02-comp3851b-uat-baseline-r2.md) under [S-PM-0903-UAT02](2026-09-03-uat-r2-platform-amendment.md). This later approval satisfies the mapping requirement without changing this decision's timing boundary.

## ENABLER-A01 boundary

ENABLER-A01 is an architecture-only validation slice, not iOS product implementation. Its approved cross-platform architecture evidence and explicit current macOS/Xcode/iOS execution-capability Ready gate under S-PM-0901 and S-PM-0902-BR01 remain unchanged by this decision.

Therefore ENABLER-A01 remains `Not Ready` until that architecture-evidence capability is explicitly confirmed or a qualified validator is assigned. Removing or deferring the ENABLER-A01 iOS architecture gate would require a separate explicit PM decision and re-estimation; it is not inferred from the product deferral.

## Current readiness and acceptance result

- Production `Ready`: none.
- RMVP-01A and later Week 9 production PBIs: Android product platform gate applies; all other unresolved Ready gates remain.
- ENABLER-A01: unchanged and `Not Ready` on its explicit iOS architecture-capability gate.
- UAT-B-0902-R1: accepted semantic/case baseline whose Week 9 platform execution rule is superseded; approved R2 now controls the revised Week 9 mapping.
- iOS product implementation/UAT: deferred until after Week 9; exact later Sprint/date, estimates and assignments are not approved here.
- GitHub Projects/Notion execution status: no change authorized.

No applicable higher-tier Sponsor/Supervisor or assessment record requiring Week 9 iOS delivery was found in the current repository. If such authority is later supplied, report the conflict and stop only the affected platform/release work until it is resolved.

This is a prospective PM delivery-priority correction. It does not alter historical COMP3851A requirements/evidence, prove Android or iOS implementation, or record any UAT Pass or Release acceptance.
