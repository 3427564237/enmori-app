# LI — immediate demo build and longer slow-request budgets

Date: 11 November 2026 (Asia/Singapore). Authority: LI / PM, current task.

LI requested: “尽快给我一个所有功能可用的版本，我马上要demo，响应时间长就限制时间加长一些”. Deliver and install a compatible retained-data Android update and repair existing service paths for the demo. Do not reset phone data or add product scope to make a completeness claim.

This explicitly supersedes the prior PM-only Event 20-second source / 30-second list-client limits in [5 November](2026-11-05-li-followup-runtime-admin-validation.md) for this demo. Use a bounded 90-second source and 120-second Event list/recommendation client budget, retaining original rows, validation, access restrictions, cancellation and no automatic retries. onePA stage limits may increase within the source budget. Existing AI already waits up to 90 seconds at the client and 60 seconds within execution; keep that bounded behavior. The 15-second performance target is not a blocking demo criterion under this instruction; do not report it as achieved.

The same instruction covers the existing friend recommendation dependency on the complete public Event snapshot. Align its multi-provider aggregate window to 110 seconds (including shared-work waiting and page traversal), allowing the 90-second provider outcome to settle, and its Home/All friends GET client window to 120 seconds. This corrects the older 45-second snapshot / ordinary 15-second friend read mismatch. Other reads, writes, the legacy single-provider 10-second snapshot budget, consent checks, complete-candidate ranking and source-failure semantics remain unchanged. An unavailable source is not a zero common-event score.

After being asked for current OpenAI balance/expiry, LI replied “67.9 11.19”: US$67.90, 19 November 2026. Treat this as current user-reported billing evidence, not an independently observed billing screen. Refresh only balance/pricing freshness within the original grant, original US$3.40 cap and original credit cycle; retain all attempts, charges and unknown holds. Verify current official prices before refresh. A one-use expected-fence arm still requires stopped/drained previous Azure/local writers. Use the existing selected Sol test-app model, same account scope and explicit consent; no automatic spending-cap increase, top-up, new model, account privilege, region or infrastructure.

This request authorizes bringing the previously approved demo service back into operation. It does not make currently unimplemented Persona/proactive OpenAI paths implemented or waive their separate contracts. Report source, service, APK and physical evidence separately and disclose remaining unavailable functionality.

## All authenticated accounts

LI subsequently replied “给所有的开放即可” when asked to identify the single demo account. This explicitly supersedes the single-firebaseUid admission restriction of the Sol test-app composition for this demo. Every verified ordinary account may enter the existing Conversation flow subject to its own onboarding, current OpenAI cloud-processing consent and original account-owned data checks. Shared quota and the original US$3.40 cap remain unchanged. Unauthenticated, invalid, revoked or disabled identities do not gain admission. Retain the configuration field for operator compatibility; it no longer limits ordinary authenticated users.

Build this candidate with the previously approved OpenAI client configuration (OpenAI disclosure, remote Azure edge, native proactive consumers disabled). Earlier v58/v59 local-processing build defines are incompatible with the intended cloud Conversation and are not selected for this APK. This does not claim Persona/proactive OpenAI implementation.

## Persona and administrator demo follow-up

LI asked whether Persona and Admin work, instructed immediate repair if unavailable, and requested administrator credentials for the demo. Create a dedicated clearly labelled demo administrator with the existing `enmoriAdmin` claim, validate existing management paths using only new demo-owned records, and retain the account for LI's demonstration. Store credentials privately outside Git and give LI the private file. This supersedes the prior cleanup-after-validation requirement only for this new demo account. Existing global records, privileges of other users, consent, and reference-aware deletion protections remain intact.

Distinguish Persona CRUD/activation and Persona-in-Conversation from draft-only preview. The former are already composed; the latter has been deliberately local-only. Do not claim the whole Persona feature unavailable merely because cloud draft preview is disabled, and do not silently save a draft or create conversation history as a substitute for a no-write preview.
