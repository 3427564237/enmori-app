# Groq processing consent and provenance — proposed contract

28 October 2026. Status: approved for implementation and offline verification,
including the independent cloud generation amendment below, by the
[recorded LI decision](../decisions/2026-10-28-li-cloud-consent-provenance.md).
The original proposal is retained below to preserve the supersession trail;
its shared-generation paragraph is superseded by that amendment. Real transfers
are not authorized by this document. Builds on the [cloud objective](../decisions/2026-10-28-li-cloud-service-objective.md)
and [recovery/integration decision](../decisions/2026-10-28-li-cloud-independent-request-recovery.md).

## Concrete change requiring PM approval

Extend existing owner Settings GET/PUT, not a new endpoint, with optional
`cloudAiConsent: { state: "accepted" | "declined", disclosureVersion: "groq_cloud_v1" }`.
Persist the same non-content object on the existing Account. Missing means no
cloud grant; malformed values fail closed. PUT omission preserves the stored
value for older clients. Existing revision/unknown-save/readback behavior stays.
Acceptance requires existing optionalProcessingConsent to be accepted too;
revoking either closes cloud dispatch. A change of cloud consent increments
existing purposeRevocationGeneration in the same transaction, conservatively
invalidating in-flight local and cloud purpose work. No bulk opt-in/migration.
A later processor/disclosure version requires a new explicit acceptance.

The user-visible disclosure must identify GroqCloud as an external processor,
Azure as the Backend host, and exactly the current message, selected historical
pairs/Check-in text and applicable Persona expression sent for this request.
No account/source IDs, location/weather, credential, broad history or unselected
records may enter the model payload. The UI offers decline and later revoke;
ordinary non-AI functions remain usable. Existing local consent is insufficient.

Groq's [current data policy](https://console.groq.com/docs/your-data) says inference
content is not retained by default, but reliability/abuse investigations may
retain it for up to 30 days (or legal obligations longer); retained customer data
is stored in the United States. Do not promise zero retention while the account's
ZDR controls remain disabled, or claim Azure region determines Groq processing
location. No batch, fine-tuning, provider storage feature or paid upgrade.

Extend the existing selected-reply processing discriminator from `local` to
`local | cloud` only in a separately enabled cloud composition. Backend configuration
pins provider `groq`; clients cannot choose arbitrary recipients. A selected
request, its grant and final send must agree on mode. The current cloud consent,
source versions and generation are checked at preparation, actual dispatch,
assistant persistence and delivery. Failed/unknown reads deny transfer.

Preserve old `source_use_v2` records and their `processing: local`. New cloud
provenance uses `source_use_v3`, `processing: cloud`, `provider: groq` and
`disclosureVersion: groq_cloud_v1`, with existing source versions/owner/retention
and deletion checks. Do not relabel old records. Extend provenance response
schemas/readers and mobile presentation to explain cloud use accurately.

Persona preview requires the same explicit current cloud grant and retains
no history/draft persistence. F0 cloud intents require a new explicit `processing:
cloud` confirmation and durable grant/version binding on the existing intent;
old local queued intents never silently migrate to Groq. Revocation or mode
mismatch blocks new generation and late publication. Preserve existing F0
source, due, quiet, expiry, cancellation and unknown-operation fences.

Use one quota/runtime owner across all three consumers. No independent per-feature
quota, automatic retries or fallback. Implement source tests and emulator checks
before any production enablement. Approval of this contract is implementation
and offline-test authority only, not permission to transmit existing user data,
change account ZDR/security settings, create credentials or billed resources.

## Verification required

Cover legacy clients/records, absent/corrupt consent, stale revision, unknown
save/readback, revoke during every await and before HTTP, processor/version
mismatch, exact selected context and no private IDs in provider JSON. Verify
cloud provenance round trips and that local provenance never becomes cloud.
Test Persona and F0 against the same owner; old local F0 intents fail closed in
cloud mode, and unknown generation cannot publish late or reset quota.

## Review amendment — separate cloud revocation generation

Status: approved by LI in the linked decision. Source review found that purposeRevocationGeneration
also controls historical local-source invalidation and cleanup, not only in-flight
requests. Incrementing it on cloud-only consent changes would invalidate/delete
old local replies. That conflicts with the approved preservation boundary above.
Do not enable the original generation coupling.

Replace that clause with an independent Backend-only Account field
`cloudAiConsentGeneration` (nonnegative safe integer). Missing is zero only while
cloud consent is absent; an existing cloud grant requires a valid explicit field.
Any cloud consent change increments it atomically with Settings revision. Existing
purposeRevocationGeneration continues to follow its original general-purpose
revocation rule. No cloud-only change invalidates local provenance.

New source_use_v3 receipts and cloud F0 grants bind both the original purpose
revocation generation and cloudAiConsentGeneration. Cloud revoke/reaccept cannot
restore an older cloud receipt or request. Local source_use_v2 is unchanged.
The new field is not client-writable and is never sent to Groq. No real data
migration, transfer or cloud enabling is included in this correction.
