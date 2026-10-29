# LI — cloud consent and provenance implementation

Date: 2026-10-28. Authority: LI / PM.

LI explicitly approved “批准云端授权与来源记录实现” after reviewing the
[concrete proposal](../planning/2026-10-28-cloud-consent-provenance-proposal.md),
reference `call_283654e4c66d4566953a0e54aa396402`. The proposed fields, contracts,
revocation behavior, provenance and offline verification are approved.

This extends existing Settings and local-only processing contracts solely for
an explicitly selected Groq cloud mode. Preserve existing local grants, records,
and queued intents; none grants cloud transfer or is bulk migrated. Existing
owner/auth/source/expiry/unknown-write protections remain authoritative. New
cloud consent defaults absent/declined and requires the specified disclosure.

Scope is implementation and offline/emulator verification. No real-user data
transfer, provider security settings, billed resource, cloud IAM expansion or
failed-model adoption is approved by this decision. Production remains local
until separate quality and deployment acceptance gates are met.

## Independent cloud revocation amendment

LI approved “批准独立云端撤回计数”, reference
`call_00494ba2106b4b2facb9cd40e7cd3bca`, after the review exposed that reusing
purposeRevocationGeneration could invalidate and clean up old local replies.
The proposal's separate cloudAiConsentGeneration amendment supersedes only the
original generation coupling. Preserve its explanation and all older local data.
