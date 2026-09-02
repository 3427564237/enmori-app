# PM Decision — direction for Q-33 R2 amendment

- **Source ID:** S-PM-0903-RMVP01A-R2DIR
- **Status:** Approved amendment direction; Q-33 was Open at issuance and was subsequently Resolved by S-PM-0903-RMVP01A-CONTRACT
- **Decision date:** 2026-09-03
- **Scope:** Instructions and bounded sub-decisions for producing RMVP-01A-CONTRACT-PREVIEW-0903-R2
- **Amends for review:** [RMVP-01A-CONTRACT-PREVIEW-0903-R1](../superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-preview.md)
- **Current review preview:** [RMVP-01A-CONTRACT-PREVIEW-0903-R2](../superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-r2-preview.md)

## Decision boundary

RMVP-01A-CONTRACT-PREVIEW-0903-R1 is not approved as the final Q-33 contract. The following amendments and bounded choices are approved solely as instructions for producing R2. Q-33 remains Open until the amended R2 receives separate exact PM approval.

## 1. Initial visibility semantics

The Initial Choice persists current Check-in visibility state as `checkInVisibility`, not Profile visibility:

- `accept → optionalProcessingConsent=accepted, checkInVisibility=public`;
- `reject → optionalProcessingConsent=rejected, checkInVisibility=private`.

RMVP-01A does not decide whether later Check-in social visibility is snapshotted at creation or evaluated from the current saved privacy state at read time. Profile-specific visibility outside this bounded requirement is not approved.

## 2. Atomic onboarding idempotency

One successful Firestore onboarding transaction atomically creates the Auth Binding, Username Reservation, Product Account, and committed onboarding idempotency result. No second non-atomic write may be required to recover an already-committed onboarding operation by its exact idempotency key.

Firebase Authentication identity creation and Firestore Product Account creation do not become cross-service atomic. Recoverable incomplete onboarding remains controlling when Firebase registration succeeds but Product Account onboarding does not. Check-in creation retains its atomic Check-in plus committed-idempotency-result contract.

## 3. Username reservation lifecycle

The physical record is a `Global Username uniqueness reservation governed by Q18-B`, not a declaration that no future competent authority can ever change it.

For Week 9, Username remains immutable after onboarding. Disablement, suspension and permanent Account deletion do not release the reservation. Username is not automatically reassigned or reused. Rename, aliases, transfer and historical-name lookup remain outside the current Release. Any future release or reuse requires a separately approved Account-deletion and anti-impersonation contract.

This rule governs Username reservation only. It does not approve Account deletion mechanism, timing, retention, cascading effects, recovery or Firebase identity handling.

## Explicitly approved bounded values and remaining R1 direction

- Note normalization trims leading/trailing Unicode whitespace, preserves internal whitespace and line breaks, and requires 1–500 Unicode grapheme clusters after normalization.
- Idempotency records have a 24-hour retention window for bounded exact retry/deduplication, not permanent duplicate prevention.
- The remaining R1 direction is accepted for inclusion in R2: internal AccountId distinct from Firebase UID; recoverable incomplete onboarding; Backend-only product persistence; owner-authorized Note-only Check-in create/read; opaque Check-in IDs; server-authoritative timestamps; privacy-safe `CHECKIN_UNAVAILABLE`; strict undeclared-field rejection; the stable error catalogue; and the recorded Q04/test/evidence boundary.

## Stop boundary

Do not estimate, assign, transition RMVP-01A to Ready, close Q-33, implement product work, or write GitHub Projects/Notion status before amended R2 receives exact PM approval.

That prerequisite was subsequently satisfied by [S-PM-0903-RMVP01A-CONTRACT](2026-09-03-rmvp-01a-contract-approval.md). The later approval resolves Q-33 and permits an estimation/assignment preview; it does not itself estimate, assign, make Ready, authorize implementation, or authorize external writes.
