# Event content access and B2 performance proposal

Prepared 15 November 2026. **Proposal; no hosting change has been executed.**

## Concrete selection

Scale the existing Linux App Service plan in **Japan East from B1 to B2, one instance**, retaining the existing app, hostname, deployment, managed identity, Firebase project and account data. B2 doubles the published CPU/RAM allocation from 1 core / 1.75 GB to 2 cores / 3.5 GB. The current plan's selectable-SKU response includes B2. This is a performance trial, not an attempt to rotate provider identity or evade Ticketmaster's refusal. Do not promise that scaling resolves 403.

At the live Azure Retail Prices observation, Japan East Linux B1 is USD0.019/hour, B2 USD0.037/hour and B3 USD0.073/hour. Use **62 days / 1,488 hours** to cover the remaining part of 15 November and the existing 16 November–16 January operating period conservatively:

| Option | Compute estimate, 62 days | Remaining from current USD92.23 estimate |
| --- | ---: | ---: |
| Retain Japan East B1 | USD28.27 | USD63.96 |
| Japan East B2, one instance | USD55.06 | USD37.17 |
| Japan East B3, one instance | USD108.62 | Exceeds current funds by USD16.39 |

The credit read at 09:24:34 UTC reports USD98.67 current balance, USD6.44 pending eligible charges and **USD92.23 estimated available balance**. The student spending limit remains On; credit-lot expiry is 28 October 2027. The remaining USD37.17 is a reserve, not proof of zero bandwidth, tax, currency or other Azure charges. These are Azure compute figures, not funding for OpenAI or Firebase. Recheck balance and rates immediately before the change.

Southeast Asia Linux B2 is USD0.036/hour (USD53.57 / 62 days), only USD1.49 less. Firestore's existing database metadata places it in Singapore, but no new-region performance or current student-region eligibility has been established. A separate app/identity/region migration is not selected by this proposal.

## Why test this

- A bounded probe in the actual B1 container measured ordinary Chromium launch at **9,937 ms**, close to the current Ticketmaster launch limit of 10 seconds. This is one sample, not p95.
- Four hours of five-minute Azure samples averaged 39.55% CPU and 72.6% memory. The largest five-minute averages were 82.6% CPU and 80.2% memory; they are not instantaneous maxima.
- An existing public Firestore catalogue read took 3,203 ms including first credential/client setup. Two warm sixteen-document samples using groups of five individual reads took 1,102/626 ms; a single sixteen-reference SDK batch took 145/105 ms. This is a small diagnostic against public tags with read-only transactions, not a measurement of complete personalized ranking. No private recommendation caching or gateway change is proposed from this comparison alone.
- The official Ticketmaster API's sampled list and detail requests took 1,674/970 ms. They returned 200, but no descriptions. Faster compute cannot create absent provider fields.

## Execution and rollback

After the concrete B2 selection is approved:

1. Re-read exact active package/hash, plan SKU/capacity, account-field hashes, AI owner/lease and financial-attempt baseline using the existing private controlled operator. Preserve the existing USD3.40 cap and all monetary values. No paid generation or notification probe.
2. Use the existing stop/drain/reconciliation sequence. Require positive shutdown/drain evidence before changing the plan; do not scale out to a second owner. Retain the exact B1 and deployment receipts for rollback.
3. Change only the existing plan to B2, capacity one. Use the existing single-owner recovery/start sequence and verify the mounted code, readiness, owner fence and lease renewal. If a bounded reader patch is included, bind its exact built package/hash separately from the SKU change.
4. Repeat the same bounded launch, dependency and complete event-read measurements. Verify ordinary profile access and the installed v69 client. Keep a provider refusal separate from latency; do not rotate regions/IPs, retry challenges, or claim successful content acquisition from source-list health.
5. Retain B2 only if measurements support a useful improvement and the two-month estimate remains covered. If startup, owner or functionality checks fail, or there is no useful measured improvement, stop/drain and return the plan to the recorded B1 configuration using the same guarded owner recovery. Do not discard account data, monetary attempts or old receipts. Trial extra compute for one hour is approximately USD0.018 above B1; recovery must finish before ending the trial.

A scale operation/restart temporarily interrupts service; prior B1 starts took about 5–7 minutes. B2 startup time is unmeasured. No new app, persistent content cache, background worker, provider bypass or subscription upgrade is part of this proposal.

## Content restoration remains separate

The official list API is usable. The live first-page sample contains 20 future events: eight with genuine images, twelve with fallback category images, and zero `info`, `description` or `additionalInfo` values. A sampled no-cover event's detail endpoint likewise supplies only fallback images and no description. Do not substitute those fallback images as genuine event covers.

The ordinary cloud-rendered Ticketmaster homepage and linked PGL detail return 403; the homepage identifies the browsing-activity pause. The same compiled reader previously completed on the operator host with the exact occurrence link, a 590-character description and an official cover. The provider's hidden rule is not observable, so shared-cloud egress/IP reputation, frequency or policy changes remain hypotheses. Historic 28 October evidence already recorded Ticketmaster 403; onePA had a successful description then. There is no verified continuous interval of successful cloud Ticketmaster rich-content access to identify a precise regression date.

If 403 remains, restoring missing rich content requires the provider to permit the intended server access or supply it through the authorized API. Prepare a support request with the blocked public URLs, timestamps, error category and integration use; do not send it or disclose credentials without LI's instruction. No proxy or moved reader is proposed as a way around that denial.

Sources: [Azure pricing API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices), [Linux App Service specifications](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/), [selectable plan SKUs](https://learn.microsoft.com/en-us/rest/api/appservice/app-service-plans/get-server-farm-skus), [Ticketmaster error guidance](https://help.ticketmaster.com/hc/en-us/articles/9760115676433-Why-did-I-receive-an-error-message), [Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery/v2/).
