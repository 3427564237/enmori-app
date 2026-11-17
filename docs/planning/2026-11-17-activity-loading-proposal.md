# Always-available teacher evaluation: activity loading proposal

Prepared 17 November 2026. **Initially recommendation-only. LI subsequently explicitly approved implementation, validation and release in [the scoped decision](../decisions/2026-11-17-li-activity-loading-performance.md).** The original recommendation below remains retained.

LI clarified that the backend must remain available because teachers may evaluate on any day during the next two months, and asked for the most suitable recommendation. Retain the existing [two-month delivery decision](../decisions/2026-11-11-li-two-month-teacher-delivery.md) and [B2 selection](../decisions/2026-11-15-li-event-content-performance.md).

## Recommended selection

Keep the existing single-instance Japan East B2 application running continuously with its existing Always On setting. Add one process-owned public onePA catalogue warmup after the application becomes ready, followed by **at most one acquisition start per five minutes**, counting both foreground demand and scheduled work. Do not create a service, queue, datastore, dependency, paid model operation, extra instance, or region migration. Ticketmaster and personal recommendation/Firestore evaluation remain demand-driven.

Use the unchanged fifteen-group / 190-raw-record acquisition and query-level failure policy. Do not retry a failed query within a cycle. Concurrent callers share the current acquisition; periodic work never overlaps it or exceeds the start-frequency cap. Failed cycles do not trigger an immediate retry. Source disable, runtime ownership loss and shutdown prevent new starts, abort work and await its cleanup.

Keep a still-valid existing public catalogue available while the replacement is being acquired. Admit a replacement only after its existing required-default, settlement, identity and publication checks pass; replace rows, coverage and expiry together. A failure never extends the previous catalogue's expiry or makes unavailable data look complete. Expired data is not served. This narrowly changes the prior demand-only rule and allows replacement acquisition alongside a valid public cache; it does not add stale fallback or cache personalized results.

Bind acquisition completion and expiry immutably to provider batches and cap complete-source projection lifetime by that expiry. Re-projecting cached rows must not restart their provider lifetime. Otherwise a naive five-minute timer would incorrectly re-age old provider data and block current users by resetting the shared recommendation generation. Preserve explicit foreground refresh, access/session/owner fences, private-signal rereads, ranking, Home Top 2 and client expiry behavior.

## Experience and validation

Ordinary opens with a prepared valid source should approach the existing observed warm endpoint timings (Home 1.331 s; Browse 2.756 s), subject to actual measurements. These are targets informed by single observations, not an SLA. Startup, upstream failure, or variable 147–180 s acquisition time can leave a cold/expiry gap even with a five-minute schedule. Show honest waiting, stop/reload and existing navigation; never fabricate a progress percentage or silently show expired activities.

Validate nonblocking reads during refresh, immutable expiry, no re-aging, coalescing, cycle-frequency limits, no overlap/retry, source disable/shutdown/owner-loss drain, failure/recovery, query coverage and per-user transaction isolation. Verify a controlled cold warmup and later foreground/cache behavior on the existing host before release. Production source/API evidence, signed APK and phone acceptance remain separate.

At the fixed onePA manifest maximum, each cycle may issue nineteen public search responses (five default pages plus fourteen first-page searches), plus document navigation. Five-minute starts cap this at 288 cycles / 5,472 search responses per day. This is a maximum derived from the approved manifest, not observed traffic or a provider quota guarantee. Do not prewarm all Ticketmaster pages automatically or escalate concurrency/frequency after refusals.

## Current hosting and funding

[Fresh read-only Azure evidence](../evidence/2026-11-17-activity-loading/hosting-readiness.json) confirms the app Running, B2 capacity one, and Always On already true. Azure estimated available credit is USD90.87, spending limit On, credit-lot expiry 28 October 2027. The current Japan East Linux B2 retail rate is USD0.037/hour. A conservative 62-day compute estimate is USD55.056, leaving USD35.814 for other Azure costs; it covers the requested next two months through at least 17 January 2027 at this tariff. Bandwidth, Firebase and OpenAI costs are separate. No subscription conversion, new charge, grant increase, automatic top-up or credit reset is selected.

The last four hours of five-minute averages were about 12.20% CPU and 52.91% memory, with largest five-minute averages 36% / 64.6%. This is not a scheduled-warmup load test. Validate the proposed recurring browser workload on the current plan before treating its capacity as established.

Microsoft documents [Always On](https://learn.microsoft.com/en-us/azure/app-service/configure-common) as preventing idle unloading. It keeps the application available; it does not itself refresh ENMORI's onePA catalogue. Existing configuration already provides the hosting behavior, so no hosting mutation is needed for this recommendation.
