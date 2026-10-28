# Groq cloud consent and provenance extension

Authority: [LI decision, 28 October 2026](../docs/decisions/2026-10-28-li-cloud-consent-provenance.md).
The retained proposal and independent-generation amendment control this extension.
This document extends the selected-reply local-only discriminator solely in an
explicit cloud composition; existing local defaults and local receipts stay valid.

Settings GET/PUT may contain `cloudAiConsent` with exactly `state` (`accepted` or
`declined`) and `disclosureVersion: groq_cloud_v1`. Missing means no cloud grant;
PUT omission preserves the stored choice. Acceptance also requires existing
optional processing consent. Settings revision and unknown-save/readback remain
mandatory. The Backend-only `cloudAiConsentGeneration` is incremented atomically
only when the cloud choice changes; cloud withdrawal cannot increment the old
purpose generation or invalidate local provenance. General-purpose withdrawal
continues to follow the old rule. No implicit opt-in or old-record migration.

The selected-reply `processing` value must match the service's configured mode.
Cloud authorization checks the authenticated owner, disclosure and both counters
before preparation, dispatch, persistence and delivery. Unknown authorization is
unavailable. Local handles cannot pass the cloud transport, and cloud handles
cannot pass the local transport. The provider is pinned by Backend configuration.

Cloud assistant provenance is `source_use_v3`, with `processing: cloud`,
`provider: groq`, `disclosureVersion: groq_cloud_v1`, both counters and the existing
source/version/deletion checks. Empty sources are allowed for cloud plain chat.
Local `source_use_v2` remains unchanged. Available cloud assistant DTOs carry all
three processing/provider/disclosure fields together; unavailable/user rows may
not carry them. Unknown/corrupt or older-than-receipt cloud authority is
unavailable, not proof authorizing destructive source cleanup.

Every Settings writer in an enabled cloud service must use the shared in-process
fence and the same-transaction runtime epoch check. An unknown Settings write
blocks cloud leases until a confirmed revision strictly beyond its expected
revision proves a barrier. A delayed acknowledgment of an earlier revision cannot
clear it. Replacement processes must confirm a new durable runtime epoch before
opening admission. Ordinary Profile operations and Settings reads do not depend
on the AI epoch. An uncoordinated writer or host is outside this guarantee.

## Rollout boundary

The current source provides Conversation consent/provenance and a separate mobile
choice/disclosure. It does not enable a cloud service or switch the mobile request
mode. Older installed clients reject unknown response fields; optional fields do
not make that version compatible. Cloud enablement needs a verified client upgrade
boundary, shared Persona/F0 owner integration, accepted model/token bounds,
exclusive host cutover, cloud identity/HTTPS and physical off-host verification.
F0 grant schema/consumer migration remains unimplemented and its existing contract
stays local. No live Account or provenance migration occurs in this source slice.
