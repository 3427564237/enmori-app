# Cloud consent and provenance extension

Authority: [LI decision, 28 October 2026](../docs/decisions/2026-10-28-li-cloud-consent-provenance.md)
and [bounded OpenAI trial decision, 2 November 2026](../docs/decisions/2026-11-02-li-cloud-ai-backend-resume.md).
The retained Groq proposal and independent-generation amendment remain applicable;
the November decision adds a separate OpenAI recipient without migrating old grants.
This document extends the selected-reply local-only discriminator solely in an
explicit cloud composition; existing local defaults and local receipts stay valid.

Settings GET/PUT may contain `cloudAiConsent` with exactly `state` (`accepted` or
`declined`) and one recognized `disclosureVersion`. The only valid provider pairs are:

| Backend-pinned provider | Disclosure version |
| --- | --- |
| `groq` | `groq_cloud_v1` |
| `openai` | `openai_cloud_v1` |

The client cannot choose an arbitrary recipient. A Groq acceptance never authorizes
OpenAI, nor the reverse. A provider change requires a new explicit acceptance.
Missing means no cloud grant;
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
the matching provider/disclosure pair above, both counters and the existing
source/version/deletion checks. Empty sources are allowed for cloud plain chat.
Local `source_use_v2` remains unchanged. Available cloud assistant DTOs carry all
three processing/provider/disclosure fields together; unavailable/user rows may
not carry them. Unknown/corrupt or older-than-receipt cloud authority is
unavailable, not proof authorizing destructive source cleanup.
Old Groq `source_use_v3` receipts retain their provider and disclosure; they are
neither relabelled nor rewritten as OpenAI. Receipt readback checks the receipt's
original provider grant, while new dispatch and persistence also require the
service's configured recipient. Unknown and cross-provider tuples fail closed.

The OpenAI disclosure identifies OpenAI as the external processor and Azure as
the ENMORI Backend host. It identifies the same minimized current message,
selected conversation/Check-in text and applicable Persona expression, and offers
decline and later withdrawal without disabling ordinary features. No unselected
records, account/source IDs, location, weather or credentials enter model input.
The trial uses Responses `store:false`; this does not promise zero retention.
OpenAI's [data controls](https://developers.openai.com/api/docs/guides/your-data)
(checked 2 November 2026) describe abuse-monitoring retention of up to 30 days,
with legal exceptions. Backend hosting region does not establish OpenAI processing
region; no Singapore model-processing or account ZDR claim is made.

Every Settings writer in an enabled cloud service must use the shared in-process
fence and the same-transaction runtime epoch check. An unknown Settings write
blocks cloud leases until a confirmed revision strictly beyond its expected
revision proves a barrier. A delayed acknowledgment of an earlier revision cannot
clear it. Replacement processes must confirm a new durable runtime epoch before
opening admission. Ordinary Profile operations and Settings reads do not depend
on the AI epoch. An uncoordinated writer or host is outside this guarantee.

## Rollout boundary

The current source provides Conversation consent/provenance for both recognized
recipients and a separately configured mobile choice/disclosure. Existing cloud
helpers default to Groq; local composition and ordinary service defaults stay
unchanged. An OpenAI composition must pin the same recipient on the consent
authority, selected-source readers, application, Conversation store and dispatch
bridge. The client uses one exhaustive `AiClientProcessing` configuration:
`local` remains the default, while `groqCloud` and `openaiCloud` bind the cloud
request discriminator and the matching Settings disclosure. Only the isolated
network harness accepts this explicit selection; shipped Bootstrap and Azure
composition are unchanged. The client cannot send an arbitrary provider or
disclosure in the request. No setting silently switches service or request mode.
Older installed clients reject unknown response fields; optional fields do
not make that version compatible. Cloud enablement needs a verified client upgrade
boundary, shared Persona/F0 owner integration, accepted model/token bounds,
exclusive host cutover, cloud identity/HTTPS and physical off-host verification.
Persona and F0 consumers remain on their existing local contracts. Old local or
Groq Persona/F0 grants never authorize OpenAI. Cloud admission for either consumer
must stay closed until its specific grant migration, provider binding and
withdrawal checks are implemented and verified. No live Account or provenance
migration occurs in this source slice.
