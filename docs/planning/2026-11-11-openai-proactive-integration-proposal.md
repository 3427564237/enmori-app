# OpenAI explicit scheduled follow-up — minimal integration proposal

Status: proposal for LI confirmation; no cloud worker, consent, schedule, notification or paid test is enabled by this document.

## Authority and demonstrated gap

[LI's recovery instruction](../decisions/2026-11-11-li-onepa-proactive-recovery.md) selects restoring existing proactive scheduled replies with the current provider. Preserve the [25 October F0 contract](../decisions/2026-10-25-li-ai-companion-first-flow.md), [29 October service worker](../decisions/2026-10-29-li-continuous-proactive-delivery.md), [ordinary-account scope](../decisions/2026-10-29-li-ordinary-account-companion.md), and [5 November OpenAI enablement conditions](../decisions/2026-11-05-li-sol-test-app-acceptance.md). Their local-only processing boundary needs this specific extension; the existing user request does not choose new wire/storage fields for us.

At source `492ad5975e48ae8a596de839c985201fdad81049`:

- `FirstFlowIntentCommand`, the transport and stored intent parser accept only `processing:"local"`. There is no durable OpenAI consent generation on a scheduled occurrence.
- `FirestoreConversationStore.firstFlowTransaction().append` writes `source_use_v2` with local provenance. Existing `source_use_v3` already supports `explicit_follow_up`, provider/disclosure and cloud consent generation; its read-side revocation checks can be reused.
- `FirstFlowModel` is the local `GenerationTransport` Port: settling promises physical generation stopped. A cloud timeout/unknown cannot truthfully implement that promise.
- `createFirstFlowComposition` requires `LocalModelLane`; bootstrap rejects simultaneous cloud and first-flow configuration. Azure currently passes no first-flow configuration.
- Local due workers, owner checks, per-account schedule/contact records, canonical proactive append, fixed expiry, notification registration, single-POST FCM sender and no-replay recovery already exist.

## Exact requested contract changes

### 1. Explicit per-occurrence processing declaration

Keep `POST /v1/me/proactive-intents`, its Idempotency-Key, IDs, due instant, IANA zone, category and revision precondition. The original local request remains supported only by local composition. Add the following cloud branch using the same values already used by Conversation and Persona preview:

```json
{
  "conversationId": "<owned topic UUID>",
  "sourceMessageId": "<saved real user message UUID>",
  "category": "explicit_follow_up",
  "dueAt": "2026-11-16T07:00:00.000Z",
  "timeZone": "Asia/Singapore",
  "processing": "cloud",
  "provider": "openai",
  "disclosureVersion": "openai_cloud_v1",
  "expectedSettingsRevision": 1
}
```

Cloud requires all three exact fields and current own-account OpenAI acceptance. Malformed/incomplete/mismatched markers use the existing invalid-request response; a well-formed local request cannot create a cloud occurrence. No Groq branch, implicit provider fallback or client-supplied consent generation. Include the processing tuple in same-key conflict comparison, preventing a local idempotency record from being reinterpreted as cloud.

Keep public settings, intent-list/read, registration and cancellation response shapes unchanged. On new confirmation, Flutter displays the selected processor and requires its current disclosure consent. Existing list rows retain neutral schedule wording; their private provider must not be inferred from the current app build.

### 2. Minimal durable provenance, without a new collection

In the existing occurrence record, cloud entries add exactly `provider:"openai"`, `disclosureVersion:"openai_cloud_v1"`, and server-captured `cloudAiConsentGeneration` alongside `processing:"cloud"`. Local entries retain their exact old shape and `processing:"local"`. No backfill or migration upgrades a local occurrence.

Capture the cloud generation from the same current owner/account transaction that accepts the occurrence. Before reserve, model transfer, canonical append and notification dispatch, require that exact original generation, unchanged purpose generation, current OpenAI acceptance, source/version, topic lifetime, settings generation and current runtime epoch. Withdrawal followed by reacceptance cannot revive an old cloud occurrence. Off/cancel/registration deletion must not be blocked by the newly added cloud gate; existing content-read authorization remains in force.

For a cloud result, atomically append the existing genuine proactive assistant message and an existing `source_use_v3` receipt with purpose `explicit_follow_up`, the one original user-message source, the original purpose generation, and the captured cloud tuple/generation. Reuse the existing cloud message-provenance response fields and existing receipt invalidation/read rules. No new business document type, content archive, retention anchor, source category or public response field.

The cloud worker never generates or sends a legacy local occurrence. Such occurrences retain their original records and existing read/cancel/expiry behavior; the owner can explicitly cancel and confirm a new cloud occurrence if desired.

### 3. Shared execution with honest unknown outcomes

Reuse the exact active OpenAI runtime, CloudAdmissionOwner, durable quota owner, monetary owner and consent fence used by Conversation and preview. Use the existing internal monetary consumer `proactive`. Keep the original US$3.40 grant/cycle, all attempts, charges and unknown holds, selected `gpt-6.1-sol` / low reasoning, token limits, complete JSON response and `store:false`. No independent quota, extra runtime, new model or fallback.

Add a small internal cloud execution Port with logical outcomes (completed candidate, unavailable/denied/terminated/unknown). Keep the local physical-settlement `FirstFlowModel` contract unchanged. The cloud path's completion or cancellation never asserts physical provider termination: the shared CloudAdmissionOwner and monetary ledger retain remote unknown reservations. A failed/unknown occurrence is not regenerated by a later tick. This is an internal application/composition seam, not a new public API or scheduler.

The shared OpenAI runtime accepts a trusted proactive input variant and maps it through the existing local F0 message builder, extracted without changing its content. Its historical-request framing remains distinct from an ordinary new user message. This reuses the existing F0 prompt, not a prompt sweep or fabricated user-send. Provider input contains only `inputKind:"proactive_followup"`, the one quoted request's original time/text, confirmed dueAt/timeZone, and currently permitted Persona expression. Never include owner/source/intent IDs, credentials, full history, Check-ins, activity data, location, weather or routing tokens.

Fresh Auth/account checks and the original revocable cloud-consent lease surround input preparation, token-count/inference transfer, candidate acceptance, canonical publish and FCM dispatch. A read-only reservation checkpoint revalidates the exact reserved occurrence and original source/Persona deletion guards before each provider effect. At publication and dispatch, the existing transaction rereads the account generation and current source. The same consent lease remains live through the final single FCM POST check after OAuth acquisition. A recovered published/not-started occurrence acquires a new lease for its original stored generation before dispatch; it never borrows an old HTTP session or cached grant.

Preserve the existing 45-second execution budget, UTC due instant, confirmed IANA zone, due+2h/topic-cutoff expiry, one contact per rolling 24h, 480-minute cooldown, three active intents, quiet hours, pause/off/cancel, generic/hidden push, one installation, 30-day registration lease and TTL=0/no-retry sender. Budget exhaustion closes new model work without disabling ordinary reads or cancellation.

### 4. Explicit existing-host worker arm

Add one optional `firstFlow` property to the existing private `ENMORI_OPENAI_TEST_APP_CONFIG`. Its exact value reuses the already approved ordinary-account configuration:

```json
{
  "audience": "registered_accounts",
  "worker": {"mode": "service", "intervalMs": 60000},
  "push": {"leaseDurationMs": 2592000000}
}
```

Absent means off; invalid means closed. Compose this only after the existing exclusive OpenAI epoch claim succeeds, with the same Firebase project, existing Azure identity/credential interface, due worker and FCM sender. No new environment key, provider, server, region, scheduler service, dependency or automatic account/device enrollment. Configuration selects capability; each account still needs its own switches, due-time confirmation, OpenAI consent, device registration and Android permission. Deployment and live notification checks require the final reviewed candidate and operational confirmation.

## Restart and long-running service boundary

Durable queued occurrences survive a controlled restart and run only if still due, unexpired and authorized with their original generations. Existing recovery keeps interrupted `reserved/prepared` work terminal failed; `dispatching` becomes unknown and is never resent; `published/not_started` may perform only its original fresh dispatch claim. Recovery never regenerates a published message, renews registration, extends due/topic expiry, clears a quota claim or refunds an unknown model cost.

All cloud F0 effects use the current injected runtime epoch and the same shared ownership guard. This is compatible with a later separately approved owner-recovery mechanism. This proposal creates no new lease schema, automatic takeover, grant renewal, credit refresh or two-month availability guarantee. The current one-use startup claim and finite monetary-evidence validity remain operational limits until LI approves the root task's longer-running service plan. No test schedule or extra paid call is authorized here; the earlier single Persona live call has been used.

## Implementation ownership and verification

Backend files: proactive Ports/application/Firestore store and transaction bridge; shared OpenAI runtime input/prompt mapping; first-flow/OpenAI/retained bootstrap; Azure private-config parser; normative intent-request OpenAPI. Flutter owns processing injection, confirmation wording, per-provider gate, withdrawal/release and existing notification lifecycle. No competing edits to root deployment scripts.

Required fake/injection/isolated tests: local compatibility and no cloud conversion; exact marker and idempotency conflicts; onboarding/disabled/deleted/wrong owner; absent, withdrawn and reaccepted cloud grants at creation, count, inference, publish and post-OAuth dispatch; source/Persona deletion; epoch replacement; cancellation/quiet/timezone/expiry/contact limits; shared chat/preview/proactive capacity and accounting; timeout/unknown/late response; publish ACK loss; restart queued/reserved/published/dispatching behavior; receipt read invalidation and non-advancing retention; one-current-device transfer and lease expiry; no body leakage, retry or new user-message write. Live model, actual FCM arrival, phone UI and sustained-service evidence remain separate.

Suggested confirmation: “按此最小合同接入 OpenAI 主动定时回复，沿用共享预算和现有提醒规则；旧本地预约不自动转云端，不代用户启用，不自动重试未知结果。”
