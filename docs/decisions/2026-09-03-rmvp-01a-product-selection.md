# PM Decision — RMVP-01A product-path selection

- **Source ID:** S-PM-0903-RMVP01A-SEL
- **Status:** Approved by LI HOURUI
- **Decision date:** 2026-09-03
- **Scope:** RMVP-01A account-entry, initial-choice coverage, and first Check-in fixture selection only
- **Builds on:** S-PM-0902-BR01, S-PM-0902-IOS01, S-PM-0903-UAT02

## Decision

RMVP-01A uses the following product path:

1. **Account entry:** new ordinary-member registration using Firebase Authentication email/password, with the canonical immutable Username collected during onboarding as already required by Q18-B.
2. **Initial choices:** both approved branches are covered: `Accept → Public` and `Reject → Private`; either branch permits continued entry. Rejected optional processing is not performed and unrelated core behavior remains available.
3. **First Check-in fixture:** Note-only. Mood, Weather, Activity, Approx Location, AI assistance, deletion propagation, Calendar, and Footprint are outside this slice.

The Username onboarding requirement does not promote Add Friend/Friend Request into the Week 9 mandatory Release scope. Q18 implementation remains separately Release-scope gated under S-PM-0902-BR01.

## Preserved boundaries

RMVP-01A remains an online Android Week 9 product slice. Authentication uses Firebase email/password; product data crosses the trusted Backend; protected operations fail closed; and Check-in success requires server-authoritative persistence plus a later owner-authorized read.

This decision does not approve endpoint names, DTO fields, AccountId-to-Firebase-UID binding, Firestore collections/documents/indexes, Username reservation implementation, Note normalization or length, error identifiers/copy, exact UI state specifications, dependencies, estimates, task hours, assignments, Sprint selection, implementation, GitHub Projects, or Notion writes.

## Next refinement gate

The proposed physical and test contract is recorded separately in [`docs/superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-preview.md`](../superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-preview.md). It requires explicit PM approval before becoming reusable requirement authority or Ready evidence.

S-PM-0903-RMVP01A-R2DIR subsequently approves bounded amendments for producing [RMVP-01A-CONTRACT-PREVIEW-0903-R2](../superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-r2-preview.md). R1 was not approved as the final contract, and Q-33 remained Open at that review point pending exact R2 approval.

[S-PM-0903-RMVP01A-CONTRACT](2026-09-03-rmvp-01a-contract-approval.md) subsequently approves that R2 exactly and resolves Q-33. Q04, dependencies, estimates/assignments, controlled prerequisites, Android commitment, Ready, Sprint, implementation and external writes remain separate.
