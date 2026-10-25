# LI — approve the first companion flow and bounded synthetic cloud research

Date: 25 October 2026, Asia/Singapore. Source: LI's direct replies in
Integration chat `01a1719f-a6aa-75e0-9ad4-f3724777fa95` to the two explicit
questions accompanying [the reviewable decision packet](../planning/2026-10-25-ai-companion-next-decisions.md).

> 按推荐范围实现（推荐）
>
> 批准此限额合成评测（推荐）

These are independent approvals. The existing [C entry decision](2026-10-25-li-ai-entry-c.md)
remains in force. Approval is for the stated implementation and research scope,
not a production, notification-send or phone-write permission.

## Approved implementation scope

Implement the recommended **F0 + F1a + D1** contracts in the decision packet at
`9b01119` and its single-attempt sender correction at `16fcc69`. Detailed source
contracts are Context `ce0a5ed5ba5ded1365faa816025f747a6729863e` and Delivery
`4a388d9fdb96596482fb7aa30760d0f1dbe203df`, with the sender correction below.
Those documents retain their original Proposed status as historical evidence;
this decision grants only the listed scope, not every alternative they compare.

- **F0:** explicit one-shot later follow-up from one saved real user message in
  a live owned topic. Local model processing, current permitted Persona,
  explicitly confirmed due time/IANA zone, defaults off, only this category.
  Maximum one contact per rolling 24 hours, 480-minute cooldown, at most three
  active intents, default quiet 22:00–08:00 in the confirmed zone, explicit
  pause/off/cancel and generic/hidden lock-screen preview.
- **R-ANCHOR:** genuine assistant proactive messages append without advancing
  the old topic's 90-day retention anchor. No expired-topic revival. Ordinary
  real-user messages and their accepted replies keep existing Q14 behavior.
- **F1a:** explicitly hand-selected own Check-ins for this one local reply,
  maximum five in the inclusive last seven days. Current Note quotation,
  normalized stored Mood/Activity and original occurred time only. Selection
  grants exact source identities for this request, not all records/categories
  or later automatic reuse. Temporary exclusions cover inherited history
  dependencies; preserve the draft and require review on a conflict.
- **Source/read contracts:** minimized owner-visible cards and typed authorized
  resolver, message anchor, genuine proactive origin/reply association, versioned
  source-use receipts and read-state. Backend provenance stays private; no
  model-invented IDs/URLs, legacy backfill or copied source archive. Current
  source/version/permission and the existing Persona lifecycle rules apply.
- **Storage/API:** the described minimal settings, combined intent/effect/outbox,
  fixed one-owner/device registration and topic-read records, owner-only HTTP
  operations, source-reference resolver/anchor and bounded F1 prepare/execute
  additions. Integration owns normative API/schema/composition edits and keeps
  old requests/read models compatible. No cleanup of existing account data.
- **D1 candidate:** current Backend host and Firebase project; exact
  `firebase_messaging: 16.7.0`, `fcm_token`, current Core/Auth/Admin retained,
  and the minimum Android manifest/channel/permission/background/click work.
  Auto-init/registration stay off until explicit routing/push opt-in. Actual
  dependency resolution must not silently upgrade existing packages. No new
  server, managed scheduler, vectors, agents, analytics export or FID migration.

The reviewed Admin `Messaging.send` has automatic retries. Its presence is not
an approved means to weaken the no-replay contract. The candidate sender uses
the existing public credential interface for authorization and a fixed FCM v1
endpoint through one controlled native HTTPS POST, with no redirect, automatic
retry or fallback. Obtain credentials before the final source/consent/expiry/
cancellation check and atomic dispatch claim; recheck at the actual dispatch
boundary. Credential acquisition and message attempts are distinct. An uncertain
message result is not resent. No private SDK patch or new dependency is implied.

Implementation proceeds with isolated tests and independent review, first one
complete F0 path, then F1a. Existing shared Flutter/Gradle/APK coordination stays.
The local model's known semantic failures remain failures; this decision does
not certify quality or authorize unlimited tuning.

## Scoped supersession

Retain the old source, new source and these limits:

- [19 October simplification](2026-10-19-li-ai-mvp-simplification.md): extra
  Check-in context remains off except this explicitly selected F1a request.
  No automatic participation, weather, location or whole-history ingestion.
- [Q19](2026-09-01-persona-conversation-lifecycle.md): add the minimized owned
  card/resolver/source-use extension for new source-bearing messages only;
  internal raw provenance and Persona identity do not become public. Preserve
  source-loss/tombstone and Persona edit-versus-delete distinctions.
- [Q14](2026-09-02-retention-logging-audit-policy.md): only the non-advancing
  proactive append and proposed minimal metadata lifetimes change as stated.
  Reading/marking-read does not extend retention. Whole-topic deletion remains.
- The historical Backend-only selector boundary is extended only by the
  allowlisted typed current-owner F1a selection, never arbitrary database paths
  or client-supplied source contents/authority.

## Approved cloud research, with execution conditions

LI approves one Gemini Developer API **Standard paid** `gemini-3.8-flash`
synthetic-only experiment, fixed 32 cases twice, at most 64 generation attempts
and 64 token-count attempts, maximum 8192 input and 2048 combined output/thinking
tokens per generation, `thinkingLevel:low`, **USD 1 model-token spend cap**.
The reviewed guarded tool source is `24f913d`; binding hashes and same-day price
verification remain required. No retry, unknown-result refund, provider fallback,
tools/grounding/uploads or real personal data. Taxes/payment terms and actual
billing observation remain distinct from the request-level reservation ceiling.

Before execution, confirm an eligible adult operator/region, a specifically
identified billing-linked Standard project, absence of Contributor enrollment,
and the server-side key's authorized project binding. Missing facts remain
unconfirmed; do not set guard booleans to pass. Integration requested these
missing details separately after the approval. No key belongs in chat or Git.
This grants no recharge, new billing account, production model adoption, audience
change, age collection or real-data cloud processing.

### Operator setup follow-up

LI subsequently directly confirmed `已满18` and `新加坡`, and asked
`其他还未配置，帮我配置`. Adult-operator and Singapore-location assertions are
therefore supplied by the operator. Project/billing/key setup assistance is
requested; those actual configurations are not thereby established. First
inspect available signed-in project metadata and prepare the minimal concrete
configuration. No credential copying, automatic account switch, unspecified
prepayment or expanded product-data scope follows from this request.

## Still outside this approval

Actual deployment, real Firestore test writes, SDK registration upload, FCM
sends/dry-runs and phone install/write require the concrete reviewed candidate,
named existing account/device/window and specific authorization. The proposed
USD 0.01 non-model test budget and T1/T2 device procedure were not approved by
these two replies. Source/build artifacts may be prepared now.

F1b activity/participation context, provider-version gaps, location, automatic
Going/Check-in follow-ups, persistent inferred memory, cross-account installation
transfer, wider pilot and iOS delivery remain deferred. No UAT/Release/Done,
main merge, push, PR or external team message is authorized by this decision.
