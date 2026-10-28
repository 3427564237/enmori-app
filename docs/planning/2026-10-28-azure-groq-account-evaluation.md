# Azure and cloud AI: account verification and migration assessment

Checked 28 October 2026. This updates the earlier cloud proposal with actual
account readbacks. It is not a production deployment or an assurance of free
operation indefinitely.

## Account configuration completed

Azure for Students is active and the signed-in user has Owner access. Education
Hub shows US$100 of US$100 available, expiring 2027-10-28. The free-service table
includes 750 hours/month each for B1s and B2ats v2 Linux, P6 storage and an older
public-IP meter. The separate Sponsorships portal reports no active Sponsorship;
the Education Hub balance is the applicable observation. No paid upgrade was
performed. Resource group `enmori-student-cloud` was created in Southeast Asia
and its success notification was read back. It contains no application data.

After LI's specific approval, `Microsoft.Compute` and `Microsoft.Network` were
registered. Cloud Shell read back **Registered** for both. No other provider was
registered by this task. East Asia quota readback after Compute registration is
0/6 total regional vCPUs and 0/10 `standardBasv2Family` vCPUs. These quota values
do not guarantee capacity, SKU admission or successful VM creation. Cloud Shell
used an ephemeral session without a persistent storage account.

The subscription GET API (`2022-12-01`) additionally returned `state: Enabled`
and `subscriptionPolicies.spendingLimit: On`. No spending-limit removal was
performed. This confirms the current subscription setting, not that every
resource meter is free or that a running application can continue after credit
expiry/exhaustion. [Subscription API](https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/get?view=rest-resources-2022-12-01).

Groq is signed in on **Free / Current Plan**. GPT-OSS 120B account limits read
back as 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day. LI
created a seven-day evaluation key, expiring 2026-11-04; it is held only in an
owner-only local file, not in Git, Flutter, a browser URL or a report. No payment
method or Developer upgrade was added. The key is for synthetic evaluation, not
a lasting production credential.

## Free-first provider choice

| Candidate | Current evidence | Migration implications |
| --- | --- | --- |
| GroqCloud | Verified Free Plan; strict JSON Schema supported by the selected GPT-OSS model; account quotas above | Preferred evaluation candidate. Native HTTPS fetch needs no new SDK. Parse the OpenAI-compatible envelope and preserve refusals, truncation, timeout and unknown-result semantics. Rate limits mean a free account is not unlimited capacity. |
| Ollama Cloud | Current pricing page offers pay-as-you-go with no monthly subscription fee, but inference tokens are charged; cloud structured outputs are currently unsupported | Similar `/api/chat` envelope helps, but current local model availability, JSON schema, localhost preload and lifecycle cannot simply be copied. Less suitable for the present US$0 requirement. |

Sources: [Groq structured outputs](https://console.groq.com/docs/structured-outputs),
[Groq rate limits](https://console.groq.com/docs/rate-limits),
[Groq billing](https://console.groq.com/docs/billing-faqs),
[Ollama pricing](https://ollama.com/pricing),
[Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).
Account readbacks take precedence over generic advertised limits.

## Azure host cost and availability

The VM creation wizard, with Ubuntu 24.04 x64 Gen2 and no inbound ports,
initially marked both **B1s and B2ats v2 unavailable for this subscription in
Southeast Asia**, before the Compute provider was registered. After both
providers registered, `az vm list-skus --location southeastasia --size
Standard_B2ats_v2 --all --resource-type virtualMachines` still returned
`NotAvailableForSubscription` for the location and zones 1–3. The same query in
**East Asia** returned `restrictions: []`, with the quota above. East Asia is
therefore the next candidate region; neither response guarantees live capacity.
The default D2s v3 shown at approximately US$91.25/month was
not selected or created. A free-service entitlement does not guarantee regional
capacity or SKU admission.

The bounded VM candidate is B2ats v2 (2 vCPU, 1 GiB) with one 64 GiB Premium_LRS
P6 OS disk and a Standard public IPv4 if required. At the observed Southeast
Asia retail rates and 730 hours/month, before any student benefits: compute
US$8.61, P6 disk US$10.21, Standard IPv4 US$3.65; approximately US$22.47/month,
excluding egress and optional services. B2ats compute is listed in this account's
free allowance. Microsoft's free-services page explicitly lists two P6 managed
disks, but the account's older Page Blob meter name is not itself proof of an
exact managed-disk discount. The older 1,500-hour IP allowance is likewise not
proof that Standard static IPv4 is covered. Do not promise zero credit use.

For the viable **East Asia** candidate, a fresh Retail Prices API readback
returned Linux regular B2ats v2 at US$0.0131/hour, Premium SSD Managed Disks P6
LRS Disk at US$11.2272/month, and IP Addresses / Standard IPv4 Static Public IP
at US$0.005/hour. At 730 hours this is US$9.563 + US$11.2272 + US$3.65 =
**US$24.44/month before allowances**, excluding egress and optional services.
The compute query also returned Windows/Spot/Low Priority meters; those were
excluded. The disk-mount/shared-disk meter and public-IP-prefix meter were also
excluded. Actual eligible free allowances may reduce this substantially; this
is a retail comparison, not a bill or a guarantee of indefinite free hosting.

Sources: [Azure free services](https://azure.microsoft.com/en-gb/pricing/free-services/),
[Bsv2 family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/basv2-series),
[retail prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices),
[public IP types](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses/),
[track student credit](https://learn.microsoft.com/en-us/azure/education-hub/navigate-costs).

## Work required before the personal host can be switched off

This is a moderate backend integration and deployment change, not an endpoint
URL replacement. The existing service preloads localhost Ollama, shares its
physical lane across chat/Persona/first-flow, requires local certificates and
an owned runtime directory, and listens on loopback. Its existing Firebase ADC
does not automatically exist on Azure. Flutter also has an explicit host
allowlist and several user disclosures promise local AI processing.

1. Establish a model/profile that satisfies the unchanged semantic cases. The
   Groq baseline passed 14/24; `goal-v2` passed 15/24, improving seven original
   failures but retaining three and introducing six regressions from the
   original local baseline. Both are rejected for adoption. The authorized
   48 Groq synthetic calls are complete; no further calls are implied by this
   report. See the [goal-v2 assessment](../evidence/2026-10-28-li-ai-repair/groq-goal-v2-assessment.md).
2. Implement the production cloud transport and composition while preserving
   admission, cancellation, unknown outcomes, authorization and consent fences.
   The added synthetic adapter deliberately cannot be used as a product adapter.
3. Configure the Azure host, HTTPS entry and Firebase identity. Prefer a
   narrowly scoped workload identity over copying a long-lived private key;
   any Azure/GCP permission expansion must be explicit and verified.
4. Introduce accurate cloud-processor disclosure/consent and a specific client
   endpoint; existing local-only consent is not silently reused for private data.
5. Verify persistence, unavailable/rate-limited AI, authentication, recovery,
   phone cross-network access and operation with the personal host off before
   publishing a replacement APK or claiming independent cloud service.

The existing backend's observed service memory (~193 MiB, excluding OS, proxy,
local Ollama and load peaks) makes a 1 GiB host a candidate, not a capacity
guarantee. No database migration is needed merely to move this backend.
