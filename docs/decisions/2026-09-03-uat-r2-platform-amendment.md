# PM Decision — UAT-B-0902-R2 platform amendment approval

- **Source ID:** S-PM-0903-UAT02
- **Status:** Approved by LI HOURUI
- **Decision date:** 2026-09-03
- **Scope:** COMP3851B Week 9 product UAT platform projection and aggregation only
- **Approved baseline:** [UAT-B-0902-R2](../quality/2026-09-02-comp3851b-uat-baseline-r2.md)
- **Semantic/case base:** [UAT-B-0902-R1](../quality/2026-09-02-comp3851b-uat-baseline.md)
- **Platform-timing authority:** [S-PM-0902-IOS01](2026-09-02-ios-product-delivery-deferral.md)

## Decision

The exact UAT-B-0902-R2 platform mapping and aggregation contract is approved:

- 30 mandatory Android-instance base cases;
- 13 mandatory Shared-plus-Android-surface base cases;
- 2 mandatory Shared base cases;
- `X-05` deferred until an approved later dual-platform comparison;
- `CORE-16` and `FRIEND-01–05` retain their existing authority/Release-scope gates; and
- every iOS product instance remains `Not Run — Deferred until after Week 9`.

All 45 mandatory Week 9 base cases must satisfy their exact R2 Pass rule before the Week 9 Android UAT gate can pass. Android evidence cannot substitute for iOS device evidence, and Week 9 Android acceptance cannot be represented as final dual-platform Release acceptance.

## Preserved boundaries

R2 changes only R1's platform/timing projection. R1 remains authoritative for case semantics, authorities, fixtures, controlled-host evidence, result vocabulary, privacy boundaries, stop conditions, Q18 Release gating, CORE-16 authority gating, and the readiness disclaimer.

Approval records a verification contract only. Every case and platform instance remains `Not Run`. No case is marked Pass, no PBI becomes Ready, no Sprint assignment or later iOS schedule is approved, no historical COMP3851A evidence question is closed, and no GitHub Projects or Notion write is authorized.

## Resolution trail

This decision resolves Q-32. It implements the product-platform timing already approved by S-PM-0902-IOS01 and does not broaden that decision. UAT-B-0902-R1 remains retained as the accepted semantic/case baseline and supersession trail.
