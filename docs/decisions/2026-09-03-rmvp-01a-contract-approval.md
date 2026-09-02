# PM Decision — RMVP-01A R2 contract approval

- **Source ID:** S-PM-0903-RMVP01A-CONTRACT
- **Status:** Approved; Q-33 Resolved
- **Decision date:** 2026-09-03
- **Decision owner:** LI HOURUI, ENMORI PM
- **Approved artifact:** [RMVP-01A-CONTRACT-PREVIEW-0903-R2](../superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-r2-preview.md)
- **Prior amendment direction:** [S-PM-0903-RMVP01A-R2DIR](2026-09-03-rmvp-01a-r2-amendment-direction.md)

## Decision

RMVP-01A-CONTRACT-PREVIEW-0903-R2 is approved exactly as presented. It is the controlling Q-33 contract for the bounded new-member onboarding, Note-only Check-in creation, and later owner-authorized read slice.

The approval includes the specified behavior, physical REST/JSON contract, logical Firestore records, stable error catalogue, UI scope projection, and test/evidence boundary. In particular, it approves current `checkInVisibility`, the atomic Firestore onboarding/idempotency transaction, Q18-B-preserving Username reservation behavior, 1–500 Unicode-grapheme Note validation after outer Unicode-whitespace trimming, and the 24-hour idempotency-record window.

R1 remains retained as the unapproved review trail. This decision completes the exact R2 approval required by S-PM-0903-RMVP01A-R2DIR and resolves Q-33; it does not erase either prior record.

## Approval boundary

This approval closes Q-33 at the requirement-contract level only. It does not:

- estimate or assign RMVP-01A;
- transition RMVP-01A to `Ready`;
- select it into a Sprint or authorize implementation;
- approve unresolved Q04 visual/state evidence, dependency versions, controlled-environment readiness, or Android execution availability;
- write or authorize GitHub Projects or Notion execution status;
- record a UAT Pass, Release acceptance, or completed Increment; or
- change the post-Week-9 deferral of complete iOS product implementation and product UAT.

The next permitted step is a human-reviewable Points, task-hour, owner/reviewer, dependency, test, and Android commitment preview followed by a new Ready classification. Any such proposal requires separate PM approval before it becomes an assignment or reusable planning authority.
