# LI: activity recommendation loading performance

Date: 17 November 2026 (Asia/Singapore). Authority: LI / PM, current task.

After the verified v77 rollout, LI requested: **“首次加载157秒太久了，继续优化活动推荐的加载速度和等待体验”**.

This authorizes diagnosis and implementation of compatible acquisition-performance repairs and recommendation waiting-experience improvements. Existing source scope, required/default completeness, supplemental-query degradation, five-minute freshness, privacy and eligibility, ranking, access restrictions and release verification remain controlling. Preserve the [v77 deployment evidence](../evidence/2026-11-17-interest-discovery/query-degradation/deployment-v77.json), including the 157.380-second first recommendation response, 1.331-second warm Home response and 2.756-second warm Browse response.

## Waiting experience within the current flow

Complete the already-approved [recommendation loading/return scope](2026-11-17-li-recommendation-card-polish.md): show honest loading feedback and a longer-wait explanation, allow explicit local stop and reload, and keep existing navigation usable. Follow the established Browse stop behavior: stopping ends local waiting and retires late results; it does not claim cancellation of server/provider work. Stopped, unavailable, empty and expired states remain distinct.

Apply the controls to the current visible operation, including after activity-area changes. An obsolete callback from another page must not stop a newer request. Preserve Home layout/scroll stability, accessible controls, mandatory fresh reads on route/foreground return, five-minute invalidation, and session/account fences. Do not display stale recommendation cards, invented progress percentages or an unsupported completion estimate.

## Performance boundary

Investigate the saved source timings before selecting a repair. The accepted candidate took 147.020 seconds for public source acquisition: its required default task took 23.113 seconds; successful supplemental tasks took roughly 12–19 seconds each; one failed supplemental task consumed 60.101 seconds. This evidence distinguishes acquisition latency from UI rendering and warm endpoint latency.

At the initial investigation stage, no background policy was selected. The subsequent explicit selection below supersedes that pending status only within its stated scope; persistent storage, longer freshness, reduced query scope, changed per-query timeouts, early partial ranking, new endpoints and infrastructure changes remain outside this increment.


## Explicitly confirmed always-available evaluation selection

LI clarified that teachers may evaluate on any day during the next two months and requested the most suitable recommendation. After reviewing the current B2/Always On configuration, live USD90.87 estimated Azure credit and USD55.056 conservative 62-day compute estimate, LI was asked to approve the concrete [background-warming proposal](../planning/2026-11-17-activity-loading-proposal.md). LI selected: **“按推荐方案实施并发布（推荐）”**.

Keep the existing B2 single-instance hosting, Always On and all monetary/configuration/account boundaries. Warm only the slow onePA public catalogue asynchronously after application listening and source enablement. The foreground and scheduled paths share one admission limit: at most one acquisition start every five minutes, no overlapping acquisition, no immediate retry after failure. Foreground callers use a valid catalogue or join the admitted in-flight cycle; if neither exists and the next start is not yet allowed, report the provider unavailable instead of making an empty-success or reading again. The next scheduled cycle may recover normally.

Retain the exact fifteen groups, maximum 190 raw records, required default completeness, supplemental-query degradation, global 180-second acquisition budget and all identity/privacy/access checks. Personal interests/permissions/preferences and ranking remain request-time operations. Ticketmaster is not periodically warmed. Do not add persistent provider content, a service/queue/database, dependencies, scale-out, region migration or paid model calls.

During a background acquisition, a still-valid existing public catalogue remains readable. Publish the new catalogue's records, coverage and immutable completion/expiry together only after complete validation. Failure does not renew the old expiry; expired rows are never returned. Bind derived batches/projections to source expiry so cache hits and re-projection cannot re-age the provider content. Preserve explicit foreground refresh and client expiry behavior. This allows bounded background replacement alongside a valid public catalogue; it does not allow stale fallback or partial ranking snapshots.

Source disable, runtime ownership loss and shutdown prevent new starts, cancel work and await cleanup. Retain no-overlap acquisition fences until actual cleanup settles. Verify fake-clock schedule boundaries, shared foreground/background admission, failure and recovery, snapshot expiry, cancellation, close and provider metadata before live verification.

This narrowly supersedes demand-only/no-background wording in the earlier [recommendation loading polish](2026-11-17-li-recommendation-card-polish.md), [reference/event usability](2026-10-26-li-reference-and-event-usability.md) and source-acquisition implementation boundaries for this public onePA cache only. Preserve those records and all remaining rules. It authorizes the existing reviewed package-only release/rollback and a newly signed Android update after validation; physical-phone acceptance remains separately evidenced.
